"use client";

import { useState } from "react";
import { pixelTrack } from "@/lib/pixel";
import { phCapture } from "@/lib/posthog-browser";

type Question = { key: string; label: string; showIf?: { key: string; in: readonly string[] }; options: { value: string; label: string }[] };

const CITIES = ["Yaoundé", "Douala", "Bafoussam", "Kribi", "Limbé", "Buea", "Bamenda", "Garoua", "Ngaoundéré", "Bertoua", "Ebolowa"];

/**
 * « Démarre ton chantier » : une question par écran (gros boutons), puis le nom et prénom, puis le bouton WhatsApp.
 * Le message WhatsApp contient le code du dossier : le site retrouve les réponses et crée la fiche CRM.
 */
export function ChantierForm({ questions }: { questions: Question[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [project, setProject] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waUrl, setWaUrl] = useState<string | null>(null);
  // Questions posées, selon les réponses déjà données (ex. pas de relief sans terrain, pas de chambres pour un immeuble).
  const visible = questions.filter((q) => !q.showIf || q.showIf.in.includes(answers[q.showIf.key] ?? ""));
  const total = visible.length + 1;

  function choose(key: string, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    setStep(step + 1);
    phCapture("chantier_reponse", { question: key, value, step: step + 1 });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Indiquez votre nom et votre prénom.");
      return;
    }
    const words = project.trim().split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w));
    if (project.trim().length < 20 || words.length < 4) {
      setError("Décrivez votre projet en une phrase (au moins quelques mots).");
      return;
    }
    if (city.trim().length < 2) {
      setError("Indiquez la ville de votre chantier.");
      return;
    }
    setSending(true);
    setError(null);
    const p = new URLSearchParams(window.location.search);
    const utm = { source: p.get("utm_source"), campaign: p.get("utm_campaign"), content: p.get("utm_content") };
    const res = await fetch("/api/chantier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(visible.map((q) => [q.key, answers[q.key]])), name, city, project, utm }) }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { waUrl?: string; profile?: string; eventId?: string; error?: string } | null;
    setSending(false);
    if (!json?.waUrl) {
      setError(json?.error ?? "La connexion a échoué. Réessayez.");
      return;
    }
    setWaUrl(json.waUrl);
    pixelTrack("Lead", { content_name: "Démarre ton chantier", content_category: json.profile }, json.eventId);
    // Campagne « Ventes » : Meta n'y accepte pas Lead, elle s'optimise sur CompleteRegistration (même dossier validé).
    pixelTrack("CompleteRegistration", { content_name: "Démarre ton chantier", status: json.profile }, json.eventId ? `cr-${json.eventId}` : null);
    phCapture("chantier_envoye", { profile: json.profile });
  }

  if (waUrl) {
    return (
      <div className="mt-8 rounded-2xl bg-white p-6 text-center text-primary">
        <p className="text-4xl" aria-hidden>
          ✅
        </p>
        <h2 className="mt-2 text-xl font-bold">Merci ! Votre dossier est prêt.</h2>
        <p className="mt-2 text-foreground/75">Dernière étape : envoyez-nous le message sur WhatsApp. Il est déjà écrit, avec le numéro de votre dossier.</p>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => phCapture("chantier_whatsapp", {})}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-4 text-lg font-bold text-white shadow-lg"
        >
          Envoyer mon dossier sur WhatsApp
        </a>
        <p className="mt-3 text-sm text-foreground/60">Un architecte de WooPlans vous répond sur WhatsApp.</p>
      </div>
    );
  }

  const q = visible[step];
  return (
    <div className="mt-8">
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-highlight" : "bg-white/25"}`} />
        ))}
      </div>
      <p className="mt-4 text-sm text-white/70">
        Question {Math.min(step + 1, total)} sur {total}
      </p>
      {q ? (
        <>
          <h2 className="mt-1 text-xl font-semibold">{q.label}</h2>
          <div className="mt-5 grid gap-3">
            {q.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => choose(q.key, o.value)}
                className={`rounded-xl border-2 px-5 py-4 text-left text-lg font-semibold transition active:scale-[0.99] ${
                  answers[q.key] === o.value ? "border-highlight bg-white text-primary" : "border-white/30 bg-white/10 hover:bg-white/20"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <form onSubmit={submit}>
          <h2 className="mt-1 text-xl font-semibold">Dernière étape</h2>
          <label htmlFor="chantier-project" className="mt-5 block text-sm text-white/80">
            Votre projet en une phrase
          </label>
          <textarea
            id="chantier-project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Ex. Je veux construire un duplex de 4 chambres pour ma famille sur mon terrain à Odza."
            className="mt-1 w-full rounded-xl border-2 border-white/30 bg-white px-4 py-3 text-base text-primary placeholder:text-primary/40"
          />
          <label htmlFor="chantier-name" className="mt-4 block text-sm text-white/80">
            Votre nom et prénom
          </label>
          <input
            id="chantier-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={80}
            placeholder="Ex. Mbarga Paul"
            className="mt-1 w-full rounded-xl border-2 border-white/30 bg-white px-4 py-4 text-lg text-primary placeholder:text-primary/40"
          />
          <label htmlFor="chantier-city" className="mt-4 block text-sm text-white/80">
            Ville du chantier
          </label>
          <input
            id="chantier-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            list="chantier-cities"
            autoComplete="address-level2"
            maxLength={60}
            placeholder="Ex. Yaoundé"
            className="mt-1 w-full rounded-xl border-2 border-white/30 bg-white px-4 py-4 text-lg text-primary placeholder:text-primary/40"
          />
          <datalist id="chantier-cities">
            {CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button type="submit" disabled={sending} className="mt-4 w-full rounded-xl bg-highlight px-4 py-4 text-lg font-bold text-primary disabled:opacity-60">
            {sending ? "Un instant…" : "Valider mon dossier"}
          </button>
        </form>
      )}
      <div className="mt-5 text-sm">
        {step > 0 && !sending ? (
          <button type="button" onClick={() => setStep(step - 1)} className="text-white/80 underline">
            ← Question précédente
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-3 rounded-lg bg-white/15 p-3 text-sm">{error}</p> : null}
    </div>
  );
}
