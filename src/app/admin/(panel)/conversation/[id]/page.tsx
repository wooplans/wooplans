import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PageTitle } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const STAGE: Record<string, string> = { chaud: "🔥 Chaud", tiede: "Tiède", froid: "Froid", perdu: "Perdu" };

/** Conversation WhatsApp d'une fiche (messages reçus, envois de Tao, notes vocales transcrites) et analyse de l'IA. */
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const p = await db.query.prospects.findFirst({ where: eq(schema.prospects.id, id) });
  if (!p) notFound();
  const messages = await db.query.waMessages.findMany({ where: eq(schema.waMessages.prospectId, id), orderBy: asc(schema.waMessages.sentAt) });
  return (
    <div className="max-w-2xl">
      <PageTitle title={p.name || p.email} subtitle={`${p.phone || "—"} · ${p.email}`} />
      <Link href="/admin/relances" className="text-sm text-muted hover:text-primary">
        ← Relances WhatsApp
      </Link>
      {p.aiStage ? (
        <section className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm">
          <p className="font-semibold">
            🤖 {STAGE[p.aiStage] ?? p.aiStage}
            {p.aiScore !== null ? ` · ${p.aiScore}/100` : ""}
            {p.aiUpdatedAt ? <span className="font-normal text-muted"> · analysé le {p.aiUpdatedAt.toISOString().slice(0, 16).replace("T", " ")}</span> : null}
          </p>
          {p.aiSummary ? <p className="mt-1">{p.aiSummary}</p> : null}
          {p.aiNextAction ? <p className="mt-1 font-semibold">➡ {p.aiNextAction}</p> : null}
        </section>
      ) : (
        <p className="mt-3 text-sm text-muted">Pas encore d&apos;analyse : elle arrive dans les 15 minutes après un message reçu.</p>
      )}
      <ol className="mt-4 space-y-2">
        {messages.length === 0 ? <li className="text-sm text-muted">Aucun message enregistré (enregistrement depuis le 23 novembre 2026).</li> : null}
        {messages.map((m) => (
          <li key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.direction === "out" ? "bg-[#DCF8C6]" : "bg-white ring-1 ring-outline"}`}>
              {m.type !== "text" ? <p className="text-xs text-muted">{m.type === "audio" ? "🎤 Note vocale" : `[${m.type}]`}</p> : null}
              {m.transcript ? <p className="italic">« {m.transcript} »</p> : null}
              {m.type === "audio" && !m.transcript ? <p className="text-xs text-muted">{m.mediaStatus === "failed" ? "Transcription impossible" : "Transcription en cours…"}</p> : null}
              {m.body ? <p className="whitespace-pre-line">{m.body}</p> : null}
              <p className="mt-1 text-right text-[10px] text-muted">{m.sentAt.toISOString().slice(0, 16).replace("T", " ")}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
