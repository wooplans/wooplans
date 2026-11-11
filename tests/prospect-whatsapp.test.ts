import assert from "node:assert/strict";
import { test } from "node:test";
import { ageLabel, HOT_WINDOW_HOURS, needsWhatsapp, whatsappRelanceMessage, type WhatsappCandidate } from "../src/lib/prospect-whatsapp.ts";
import { inChunks } from "../src/lib/sql-chunks.ts";

const now = new Date("2026-11-12T10:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
const base: WhatsappCandidate = { status: "open", phone: "+224620000000", lastEvent: "failed", lastEventAt: hoursAgo(1), whatsappSentAt: null };

test("à envoyer : paiement échoué ou abandonné récent, avec un numéro, pas encore relancé", () => {
  assert.equal(needsWhatsapp(base, now), true);
  assert.equal(needsWhatsapp({ ...base, lastEvent: "abandoned" }, now), true);
});

test("pas à envoyer : cadeau, sans numéro, déjà client, trop ancien", () => {
  assert.equal(needsWhatsapp({ ...base, lastEvent: "gift" }, now), false);
  assert.equal(needsWhatsapp({ ...base, lastEvent: "started" }, now), false);
  assert.equal(needsWhatsapp({ ...base, phone: null }, now), false);
  assert.equal(needsWhatsapp({ ...base, status: "converted" }, now), false);
  assert.equal(needsWhatsapp({ ...base, lastEventAt: hoursAgo(HOT_WINDOW_HOURS + 1) }, now), false);
  assert.equal(needsWhatsapp({ ...base, lastEventAt: hoursAgo(HOT_WINDOW_HOURS - 1) }, now), true);
});

test("une relance envoyée sort de la liste, un nouvel échec l'y remet", () => {
  assert.equal(needsWhatsapp({ ...base, whatsappSentAt: hoursAgo(0.5) }, now), false);
  assert.equal(needsWhatsapp({ ...base, lastEventAt: hoursAgo(0.2), whatsappSentAt: hoursAgo(5) }, now), true);
});

test("message : adapté à l'échec, à l'abandon et à l'offre tentée", () => {
  const tried = { name: "villa V3-017", priceLabel: "39 000 FCFA", resume: "https://wooplans.com/catalogue/villa-v3-017?offre=39k" };
  const failed = whatsappRelanceMessage({ firstName: "Awa", lastEvent: "failed", tried });
  assert.match(failed, /^Bonjour Awa, ici WOOPLANS\./);
  assert.match(failed, /n'a pas abouti/);
  assert.ok(failed.includes(tried.resume));
  const abandoned = whatsappRelanceMessage({ firstName: "Awa", lastEvent: "abandoned", tried });
  assert.match(abandoned, /39 000 FCFA/);
  assert.ok(abandoned.includes(tried.resume));
  assert.match(whatsappRelanceMessage({ firstName: "", lastEvent: "failed" }), /^Bonjour, ici WOOPLANS\./);
  for (const m of [failed, abandoned]) assert.doesNotMatch(m, /expire/i);
});

test("ancienneté lisible", () => {
  assert.equal(ageLabel(hoursAgo(0), now), "à l'instant");
  assert.equal(ageLabel(new Date(now.getTime() - 12 * 60_000), now), "il y a 12 min");
  assert.equal(ageLabel(hoursAgo(3), now), "il y a 3 h");
  assert.equal(ageLabel(hoursAgo(72), now), "il y a 3 j");
});

test("listes longues : traitées par lots de 50 (limite D1 de 100 paramètres)", async () => {
  const sizes: number[] = [];
  const out = await inChunks(Array.from({ length: 300 }, (_, i) => i), async (chunk) => {
    sizes.push(chunk.length);
    return chunk;
  });
  assert.equal(out.length, 300);
  assert.deepEqual(sizes, [50, 50, 50, 50, 50, 50]);
  assert.deepEqual(await inChunks([], async (c) => c), []);
});
