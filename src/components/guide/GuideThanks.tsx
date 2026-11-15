"use client";

import { useEffect, useState } from "react";
import { BUDGET_OPTIONS, START_OPTIONS, TERRAIN_OPTIONS } from "@/lib/guide-rules";
import { pixelPurchase } from "@/lib/pixel";

type Status = { status: "unknown" | "started" | "paid" | "failed" | "abandoned" | "gift"; download?: string | null; answered?: boolean };

/**
 * Page de remerciement du guide : téléchargement dès le paiement confirmé, 3 questions de qualification,
 * puis la présentation du Catalogue Premium (prix plein, aucune réduction).
 */
export function GuideThanks(props: {
  intentId?: string;
  pixelId?: string;
  guidePrice: number;
  cataloguePrice: string;
  catalogueUrl: string;
  whatsappUrl: string;
  video: string;
  videoPoster: string;
  announcedModels: number;
}) {
  const { intentId, pixelId } = props;
  const [data, setData] = useState<Status | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [answers, setAnswers] = useState<{ terrain?: string; start?: string; budget?: string }>({});
  const [sent, setSent] = useState<null | { hot: boolean }>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async (n: number) => {
      const qs = intentId ? `?i=${encodeURIComponent(intentId)}` : "";
      const res = await fetch(`/api/guide/statut${qs}`, { cache: "no-store" }).catch(() => null);
      const json = (await res?.json().catch(() => null)) as Status | null;
      if (cancelled) return;
      if (json) setData(json);
      setAttempts(n);
      if (json?.status === "paid") {
        if (json.answered) setSent({ hot: false });
        const key = `wp_purchase_${intentId ?? "x"}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          pixelPurchase(pixelId, key, { value: props.guidePrice, currency: "XAF", content_name: "Guide WooPlans des maisons", content_ids: ["guide-maisons"], content_type: "product" });
        }
        return;
      }
      if (n < 40) timer = setTimeout(() => poll(n + 1), n < 10 ? 2000 : 5000);
    };
    void poll(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentId, pixelId]);

  async function sendAnswers() {
    if (!intentId || !answers.terrain || !answers.start || !answers.budget) {
      setError("Merci de répondre aux 3 questions.");
      return;
    }
    setSending(true);
    setError(null);
    const res = await fetch("/api/guide/qualification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ i: intentId, ...answers }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { ok?: boolean; hot?: boolean; error?: string } | null;
    setSending(false);
    if (!res?.ok || !json?.ok) {
      setError(json?.error || "Réessayez dans un instant.");
      return;
    }
    setSent({ hot: Boolean(json.hot) });
  }

  const paid = data?.status === "paid";
  const waiting = !paid && attempts < 40 && data?.status !== "failed";

  const choice = (name: "terrain" | "start" | "budget", options: readonly { id: string; label: string }[], legend: string) => (
    <fieldset className="mt-5">
      <legend className="font-semibold">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setAnswers((a) => ({ ...a, [name]: o.id }))}
            className={`rounded-full border px-4 py-2 text-sm ${answers[name] === o.id ? "border-primary bg-primary text-white" : "border-outline bg-white hover:border-primary"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="space-y-10">
      {/* 1. Le guide */}
      <section className="card p-6 md:p-8">
        {paid ? (
          <>
            <p className="eyebrow">Paiement confirmé</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Votre Guide WooPlans des maisons est prêt</h1>
            <p className="mt-3 text-foreground/75">Il vous est aussi envoyé par email et sur WhatsApp. Gardez ce message : il vous permet de le retélécharger.</p>
            {data?.download && (
              <a href={data.download} data-cta="guide_telecharger" className="btn btn-cta mt-5 inline-flex px-6 py-4 text-base">
                Télécharger mon guide (PDF)
              </a>
            )}
          </>
        ) : waiting ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Confirmation de votre paiement…</h1>
            <p className="mt-3 text-foreground/75">Cela prend en général quelques secondes. Ne fermez pas cette page.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Nous n&apos;avons pas encore reçu la confirmation du paiement</h1>
            <p className="mt-3 text-foreground/75">
              Si vous avez payé, le guide arrivera par email dans quelques minutes. Sinon, écrivez-nous sur WhatsApp : nous vous aidons.
            </p>
            <a href={props.whatsappUrl} className="btn btn-primary mt-5 inline-flex">
              Écrire sur WhatsApp
            </a>
          </>
        )}
      </section>

      {/* 2. Qualification */}
      {paid && (
        <section className="card p-6 md:p-8">
          {sent ? (
            sent.hot ? (
              <>
                <h2 className="text-xl font-bold">Merci ! Je vous écris sur WhatsApp</h2>
                <p className="mt-2 text-foreground/75">
                  Votre projet démarre bientôt : je vous contacte personnellement sur WhatsApp. Vous pouvez aussi m&apos;écrire tout de suite.
                </p>
                <a href={props.whatsappUrl} className="btn btn-primary mt-4 inline-flex">
                  Écrire à Tao sur WhatsApp
                </a>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">Merci pour vos réponses</h2>
                <p className="mt-2 text-foreground/75">Bonne lecture ! Je vous envoie quelques conseils par email dans les prochains jours.</p>
              </>
            )
          ) : (
            <>
              <p className="eyebrow">3 questions, 20 secondes</p>
              <h2 className="mt-2 text-xl font-bold">Parlez-moi de votre projet</h2>
              <p className="mt-2 text-sm text-foreground/70">Si vous avez un terrain et que votre projet démarre bientôt, je vous écris personnellement sur WhatsApp.</p>
              {choice("terrain", TERRAIN_OPTIONS, "Avez-vous déjà un terrain ?")}
              {choice("start", START_OPTIONS, "Quand voulez-vous commencer à construire ?")}
              {choice("budget", BUDGET_OPTIONS, "Quel budget de construction prévoyez-vous (FCFA) ?")}
              {error && <p className="mt-4 text-sm text-secondary">{error}</p>}
              <button type="button" onClick={sendAnswers} disabled={sending} className="btn btn-primary mt-6 disabled:opacity-60">
                {sending ? "Envoi…" : "Envoyer mes réponses"}
              </button>
            </>
          )}
        </section>
      )}

      {/* 3. Le Catalogue Premium : ce que le guide ne montre pas (prix plein, aucune réduction ni compte à rebours). */}
      <section className="overflow-hidden rounded-2xl bg-primary text-white">
        <div className="p-6 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-highlight">L&apos;étape suivante</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">Votre guide montre l&apos;extérieur. Le Catalogue Premium montre l&apos;intérieur.</h2>
          <p className="mt-3 max-w-2xl text-white/85">
            Pour choisir votre maison en toute confiance, il vous faut voir la place de chaque pièce et le coût de chaque étape du chantier.
          </p>
          {props.video ? (
            <video className="mt-6 aspect-video w-full max-w-3xl rounded-xl bg-black" controls playsInline preload="none" poster={props.videoPoster || undefined}>
              <source src={props.video} type="video/mp4" />
            </video>
          ) : (
            <figure className="relative mt-6 max-w-3xl overflow-hidden rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/guide/premium-apercu.jpg" alt="Aperçu flouté d'un plan coté et d'un devis" loading="lazy" className="w-full" />
              <figcaption className="absolute inset-0 grid place-items-center">
                <span className="rounded-full bg-foreground/90 px-4 py-2 text-sm font-semibold text-white">Plans cotés et devis : dans le Catalogue Premium</span>
              </figcaption>
            </figure>
          )}
        </div>
        <div className="grid gap-px bg-white/15 md:grid-cols-2">
          <div className="bg-primary p-6 md:px-10">
            <p className="font-semibold text-white/80">Dans votre guide</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {["Le rendu de chaque maison", "Chambres, niveaux, surface", "Le terrain conseillé", "Le budget global estimé"].map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden>✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-primary-dark p-6 md:px-10">
            <p className="font-semibold text-highlight">En plus dans le Catalogue Premium</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                "Le plan de distribution coté de chaque niveau",
                "La surface de chaque pièce",
                "Le devis poste par poste : fondation, élévations, toiture… jusqu'au carrelage",
                "La fiche PDF de chaque modèle, à montrer à votre maçon",
                "Le comparateur : 3 modèles côte à côte",
                `Les ${props.announcedModels} modèles, nouveaux modèles inclus`,
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-highlight" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="p-6 md:px-10 md:pb-10">
          <div className="flex flex-wrap items-center gap-4">
            <a href={props.catalogueUrl} data-cta="guide_merci_catalogue" className="btn btn-cta px-6 py-4 text-base">
              Voir le Catalogue Premium
            </a>
            <p className="text-white/85">
              <strong className="text-white">{props.cataloguePrice}</strong> · paiement unique · version numérique (espace en ligne + fiches PDF)
            </p>
          </div>
          <p className="mt-4 text-sm text-white/75">
            Une question avant de vous décider ?{" "}
            <a href={props.whatsappUrl} data-cta="guide_merci_whatsapp" className="font-semibold text-white underline">
              Écrivez-moi sur WhatsApp
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
