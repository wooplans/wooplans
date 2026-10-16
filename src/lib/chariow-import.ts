import { normalizePhone, phoneCountry, type ChariowPhone } from "@/lib/phone";
import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { catalogueProductIds } from "@/lib/chariow";
import { randomAccessCode, randomId } from "@/lib/crypto";
import { accessCodeEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { hashAccessCode, normalizeEmail, rotateAccessCode } from "@/lib/members";
import { codeStatusByMember } from "@/lib/member-mailing";

type ApiSale = {
  id: string;
  status: string;
  amount?: { value?: number; currency?: string } | null;
  product?: { id?: string; name?: string } | null;
  customer?: { id?: string; email?: string; name?: string; phone?: ChariowPhone; country?: string | { code?: string } | null } | null;
  created_at?: string;
  completed_at?: string | null;
};

/**
 * Importe les acheteurs historiques du catalogue depuis l'API Chariow :
 * ventes enregistrées (revenu) + membres créés avec un code inutilisable,
 * à qui l'on envoie ensuite un vrai code par lots (sendLegacyWelcomeBatch).
 */
export async function importChariowBuyers(maxPages = 10) {
  const apiKey = getEnv().CHARIOW_API_KEY;
  if (!apiKey) throw new Error("CHARIOW_API_KEY manquant");
  const products = catalogueProductIds();
  const db = getDb();
  let salesAdded = 0;
  let membersAdded = 0;
  let phonesAdded = 0;
  let scanned = 0;

  for (const status of ["completed", "settled"]) {
    let cursor: string | null = null;
    for (let page = 0; page < maxPages; page++) {
      const url = new URL("https://api.chariow.com/v1/sales");
      url.searchParams.set("status", status);
      url.searchParams.set("per_page", "100");
      if (cursor) url.searchParams.set("cursor", cursor);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`Chariow API ${res.status}`);
      const body = (await res.json()) as { data?: ApiSale[]; pagination?: { next_cursor?: string | null; has_more?: boolean } };
      const sales = (body.data ?? []).filter((s) => s.product?.id && products.has(s.product.id) && s.customer?.email);
      scanned += body.data?.length ?? 0;

      if (sales.length) {
        const emails = [...new Set(sales.map((s) => normalizeEmail(s.customer!.email!)))];
        const existing = await db.query.members.findMany({
          where: inArray(schema.members.email, emails),
          columns: { id: true, email: true, phone: true },
        });
        const byEmail = new Map(existing.map((m) => [m.email, m.id]));
        const newMembers = [];
        const phoneUpdates = [];
        // Membres déjà présents sans numéro : on complète le WhatsApp depuis Chariow (relance de l'import).
        for (const m of existing) {
          if (m.phone) continue;
          const s = sales.find((x) => normalizeEmail(x.customer!.email!) === m.email);
          const phone = normalizePhone(s?.customer?.phone);
          if (phone) phoneUpdates.push(db.update(schema.members).set({ phone }).where(eq(schema.members.id, m.id)));
        }
        for (const email of emails) {
          if (byEmail.has(email)) continue;
          const s = sales.find((x) => normalizeEmail(x.customer!.email!) === email)!;
          const id = randomId();
          byEmail.set(email, id);
          const phone = normalizePhone(s.customer?.phone);
          const country = (typeof s.customer?.country === "string" ? s.customer.country : s.customer?.country?.code) || phoneCountry(s.customer?.phone);
          newMembers.push(
            db.insert(schema.members).values({
              id,
              email,
              name: s.customer?.name ?? "",
              phone: phone ?? null,
              country: country ?? null,
              source: "legacy_import",
              chariowCustomerId: s.customer?.id ?? null,
              // Code aléatoire jamais communiqué : le vrai code est envoyé ensuite.
              codeHash: await hashAccessCode(randomAccessCode() + randomId()),
            }),
          );
        }
        const saleInserts = sales.map((s) =>
          db
            .insert(schema.sales)
            .values({
              id: randomId(),
              chariowSaleId: s.id,
              productId: s.product!.id!,
              productName: s.product?.name ?? "Catalogue Premium",
              status: "completed",
              amount: Math.round(Number(s.amount?.value ?? 0)),
              currency: s.amount?.currency ?? "XAF",
              email: normalizeEmail(s.customer!.email!),
              name: s.customer?.name ?? null,
              memberId: byEmail.get(normalizeEmail(s.customer!.email!)) ?? null,
              source: "chariow_historique",
              occurredAt: new Date(s.completed_at || s.created_at || Date.now()),
            })
            .onConflictDoNothing()
            .returning({ id: schema.sales.id }),
        );
        const statements = [...newMembers, ...saleInserts, ...phoneUpdates];
        const results = await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
        membersAdded += newMembers.length;
        phonesAdded += phoneUpdates.length;
        salesAdded += results
          .slice(newMembers.length, newMembers.length + saleInserts.length)
          .filter((r) => Array.isArray(r) && r.length > 0).length;
      }
      cursor = body.pagination?.next_cursor ?? null;
      if (!cursor || body.pagination?.has_more === false) break;
    }
  }
  return { scanned, salesAdded, membersAdded, phonesAdded };
}

/**
 * Envoie un code d'accès, par lots, aux membres actifs qui n'en ont jamais reçu (aucun envoi RÉUSSI
 * d'un email de code) et ne se sont jamais connectés. Les envois échoués sont donc retentés.
 */
export async function sendLegacyWelcomeBatch(limit = 25) {
  const db = getDb();
  const [members, codes] = await Promise.all([
    db.query.members.findMany({ where: (m, { and, isNull }) => and(eq(m.status, "active"), isNull(m.lastLoginAt)) }),
    codeStatusByMember(),
  ]);
  const waiting = members.filter((m) => codes.get(m.id)?.state !== "sent");
  const pending = waiting.slice(0, limit);
  let sent = 0;
  for (const member of pending) {
    const { code } = await rotateAccessCode(member.id);
    const mail = accessCodeEmail({
      name: member.name,
      email: member.email,
      code,
      kind: member.source === "legacy_import" ? "legacy" : "purchase",
    });
    const result = await sendEmail({ to: member.email, ...mail, template: "legacy_welcome", memberId: member.id });
    if (result.ok) sent++;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return { sent, attempted: pending.length, remaining: waiting.length - sent };
}
