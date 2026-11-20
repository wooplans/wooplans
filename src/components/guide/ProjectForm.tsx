"use client";

import { useState } from "react";

type Question = { key: string; label: string; options: { value: string; label: string }[] };

/** Une question par écran, de gros boutons à toucher ; la dernière réponse envoie le formulaire et ouvre le catalogue. */
export function ProjectForm({ id, questions }: { id: string; questions: Question[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(key: string, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }
    setSending(true);
    setError(null);
    const res = await fetch("/api/mon-projet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...next }) }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { redirect?: string; error?: string } | null;
    if (json?.redirect) {
      window.location.href = json.redirect;
      return;
    }
    setSending(false);
    setError(json?.error ?? "La connexion a échoué. Touchez à nouveau votre réponse.");
  }

  const q = questions[step];
  return (
    <div className="mt-8">
      <div className="flex gap-1.5" aria-hidden>
        {questions.map((item, i) => (
          <span key={item.key} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-highlight" : "bg-white/25"}`} />
        ))}
      </div>
      <p className="mt-4 text-sm text-white/70">
        Question {step + 1} sur {questions.length}
      </p>
      <h2 className="mt-1 text-xl font-semibold">{q.label}</h2>
      <div className="mt-5 grid gap-3">
        {q.options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={sending}
            onClick={() => void choose(q.key, o.value)}
            className={`rounded-xl border-2 px-5 py-4 text-left text-lg font-semibold transition active:scale-[0.99] disabled:opacity-60 ${
              answers[q.key] === o.value ? "border-highlight bg-white text-primary" : "border-white/30 bg-white/10 hover:bg-white/20"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between text-sm">
        {step > 0 && !sending ? (
          <button type="button" onClick={() => setStep(step - 1)} className="text-white/80 underline">
            ← Question précédente
          </button>
        ) : (
          <span />
        )}
        {sending ? <span className="text-white/80">Un instant…</span> : null}
      </div>
      {error ? <p className="mt-3 rounded-lg bg-white/15 p-3 text-sm">{error}</p> : null}
    </div>
  );
}
