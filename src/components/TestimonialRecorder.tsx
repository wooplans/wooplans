"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Testimonial } from "@/lib/testimonials";

type Kind = "video" | "audio";
type Info = { personal: boolean; name: string; first_name: string; already_sent: boolean; reward: string };
type Recording = { blob: Blob; url: string; kind: Kind; duration: number | null };
type Step = "intro" | "record" | "review" | "done";

type Props = { examples: Testimonial[]; questions: string[]; maxSeconds: number; maxBytes: number; whatsappNumber: string };

const VIDEO_TYPES = ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm"];
const AUDIO_TYPES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
/** Secondes passées sur chaque question du prompteur pendant l'enregistrement. */
const SECONDS_PER_QUESTION = 15;

const pickType = (types: string[]) => types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) ?? "";
const canRecord = () => typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function TestimonialRecorder({ examples, questions, maxSeconds, maxBytes, whatsappNumber }: Props) {
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<Info | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("intro");
  const [kind, setKind] = useState<Kind>("video");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Enregistrement en cours
  const [live, setLive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Formulaire d'envoi
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [quote, setQuote] = useState("");
  const [consent, setConsent] = useState(false);
  const [firstOnly, setFirstOnly] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const t = window.location.hash.slice(1);
    setToken(t);
    fetch("/api/temoignage", { headers: t ? { authorization: `Bearer ${t}` } : {}, cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as Info & { error?: string };
        if (!res.ok) throw new Error(data.error || "Lien invalide");
        setInfo(data);
        setName(data.name || "");
      })
      .catch((e: Error) => setLinkError(e.message));
  }, []);

  const stopStream = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => stopStream, [stopStream]);

  function keepRecording(next: Recording) {
    setRecording((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return next;
    });
    setStep("review");
    window.scrollTo({ top: 0 });
  }

  async function openRecorder(mode: Kind) {
    setError(null);
    setKind(mode);
    if (!canRecord()) {
      setError("Votre téléphone ne permet pas d'enregistrer depuis cette page. Choisissez une vidéo déjà filmée ou envoyez un vocal WhatsApp.");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: mode === "video" ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setStep("record");
      window.scrollTo({ top: 0 });
    } catch {
      setError(
        mode === "video"
          ? "Nous n'avons pas pu ouvrir la caméra. Autorisez l'accès à la caméra et au micro (ou ouvrez ce lien dans Chrome / Safari), puis réessayez."
          : "Nous n'avons pas pu ouvrir le micro. Autorisez l'accès au micro (ou ouvrez ce lien dans Chrome / Safari), puis réessayez.",
      );
    }
  }

  // Branche le flux de la caméra sur l'aperçu dès que l'écran d'enregistrement est affiché.
  useEffect(() => {
    if (step === "record" && preview.current && stream.current) preview.current.srcObject = stream.current;
  }, [step]);

  function startRecording() {
    if (!stream.current) return;
    setCountdown(3);
    let n = 3;
    const tick = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n > 0) return;
      clearInterval(tick);
      const mimeType = pickType(kind === "video" ? VIDEO_TYPES : AUDIO_TYPES);
      const options: MediaRecorderOptions = { audioBitsPerSecond: 96_000, ...(kind === "video" ? { videoBitsPerSecond: 1_500_000 } : {}) };
      const rec = new MediaRecorder(stream.current!, mimeType ? { ...options, mimeType } : options);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const duration = Math.round((Date.now() - startedAt.current) / 1000);
        const blob = new Blob(chunks, { type: rec.mimeType || mimeType || (kind === "video" ? "video/webm" : "audio/webm") });
        stopStream();
        setLive(false);
        keepRecording({ blob, url: URL.createObjectURL(blob), kind, duration });
      };
      recorder.current = rec;
      rec.start(1000);
      startedAt.current = Date.now();
      setElapsed(0);
      setLive(true);
      timer.current = setInterval(() => {
        const s = (Date.now() - startedAt.current) / 1000;
        setElapsed(s);
        if (s >= maxSeconds && rec.state === "recording") rec.stop();
      }, 250);
    }, 1000);
  }

  function stopRecording() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function cancelRecording() {
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    stopStream();
    setLive(false);
    setStep(recording ? "review" : "intro");
  }

  function pickFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`Cette vidéo est trop lourde (${Math.round(file.size / 1048576)} Mo, maximum ${Math.round(maxBytes / 1048576)} Mo). Filmez-vous directement depuis cette page : la vidéo sera bien plus légère.`);
      return;
    }
    const fileKind: Kind = file.type.startsWith("audio/") ? "audio" : "video";
    setKind(fileKind);
    keepRecording({ blob: file, url: URL.createObjectURL(file), kind: fileKind, duration: null });
  }

  function send() {
    if (!recording) return;
    setError(null);
    if (!name.trim()) return setError("Indiquez votre nom.");
    if (!consent) return setError("Cochez l'autorisation de diffusion pour envoyer votre témoignage.");
    const params = new URLSearchParams({
      kind: recording.kind,
      name: name.trim(),
      location: location.trim(),
      quote: quote.trim(),
      consent: "1",
      ...(firstOnly ? { first_only: "1" } : {}),
      ...(recording.duration ? { duration: String(recording.duration) } : {}),
    });
    // XMLHttpRequest plutôt que fetch : la barre de progression rassure sur les connexions lentes.
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/temoignage?${params}`);
    if (token) xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("content-type", recording.blob.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let data: { error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) {
        setStep("done");
        window.scrollTo({ top: 0 });
      } else setError(data.error || "L'envoi a échoué. Réessayez.");
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("Connexion interrompue. Vérifiez votre connexion internet et appuyez de nouveau sur « Envoyer ».");
    };
    setProgress(0);
    xhr.send(recording.blob);
  }

  const whatsappVoice = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Bonjour WOOPLANS 👋 Voici mon témoignage sur le Catalogue Premium (je vous l'envoie en vocal juste après) :")}`
    : null;

  if (linkError) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-bold">Lien invalide</h1>
        <p className="mt-2 text-foreground/80">{linkError}</p>
        {whatsappVoice ? <a href={whatsappVoice} className="btn-primary mt-4">Écrire à WOOPLANS sur WhatsApp</a> : null}
      </div>
    );
  }
  if (!info) return <p className="py-10 text-center text-muted">Chargement…</p>;

  /* ───────────── Écran d'enregistrement ───────────── */
  if (step === "record") {
    const current = Math.min(Math.floor(elapsed / SECONDS_PER_QUESTION), questions.length - 1);
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
        <div className="relative flex-1 overflow-hidden">
          {kind === "video" ? (
            <video ref={preview} autoPlay muted playsInline className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className={`flex h-32 w-32 items-center justify-center rounded-full bg-white/10 text-6xl ${live ? "animate-pulse" : ""}`}>🎙️</span>
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
            <button type="button" onClick={cancelRecording} className="text-sm text-white/80">✕ Annuler</button>
            {live ? (
              <span className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-bold">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> {clock(elapsed)} / {clock(maxSeconds)}
              </span>
            ) : null}
          </div>
          {countdown > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-8xl font-extrabold">{countdown}</div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">{live ? "Parlez de…" : "Vous pourrez parler de…"}</p>
            <ol className="space-y-1.5 text-[15px] leading-snug">
              {questions.map((q, i) => (
                <li key={q} className={live && i === current ? "font-semibold text-white" : "text-white/55"}>
                  {i + 1}. {q}
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="flex items-center justify-center bg-black px-4 pb-8 pt-4">
          {live ? (
            <button type="button" onClick={stopRecording} className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white" aria-label="Arrêter l'enregistrement">
              <span className="h-8 w-8 rounded-md bg-red-600" />
            </button>
          ) : (
            <button type="button" onClick={startRecording} disabled={countdown > 0} className="flex flex-col items-center gap-2" aria-label="Commencer l'enregistrement">
              <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white">
                <span className="h-14 w-14 rounded-full bg-red-600" />
              </span>
              <span className="text-sm text-white/80">Appuyez pour commencer</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ───────────── Merci ───────────── */
  if (step === "done") {
    const share = `https://wa.me/?text=${encodeURIComponent(
      "Je te recommande WOOPLANS si tu as un projet de maison 🏡 : des dizaines de plans de villas et duplex avec rendus 3D et devis détaillé. https://www.wooplans.com",
    )}`;
    return (
      <div className="space-y-5 text-center">
        <p className="text-6xl">🙏</p>
        <h1 className="text-2xl font-extrabold">Merci {info.first_name || name.split(" ")[0]} !</h1>
        <p className="text-foreground/80">
          Votre témoignage est bien arrivé. Nous le regardons et vous recontactons sur WhatsApp. Grâce à vous, d&apos;autres familles pourront se lancer en confiance.
        </p>
        {info.reward ? (
          <div className="rounded-2xl border-2 border-accent bg-accent/10 p-4">
            <p className="font-bold">🎁 Votre cadeau de remerciement</p>
            <p className="mt-1">{info.reward}</p>
            <p className="mt-1 text-sm text-muted">Nous vous le confirmons sur WhatsApp.</p>
          </div>
        ) : null}
        <div className="card p-5">
          <p className="font-semibold">Un proche a un projet de maison ?</p>
          <p className="mt-1 text-sm text-muted">Envoyez-lui WOOPLANS en un clic.</p>
          <a href={share} target="_blank" rel="noopener noreferrer" className="btn mt-3 bg-[#25D366] text-white">Partager sur WhatsApp</a>
        </div>
      </div>
    );
  }

  /* ───────────── Relecture et envoi ───────────── */
  if (step === "review" && recording) {
    const sending = progress !== null;
    return (
      <div className="space-y-5">
        <div>
          <p className="eyebrow">Dernière étape</p>
          <h1 className="mt-1 text-2xl font-extrabold">Bravo, c&apos;est enregistré ! 🎉</h1>
          <p className="mt-1 text-foreground/80">Revoyez-le si vous voulez, puis appuyez sur « Envoyer ».</p>
        </div>
        {recording.kind === "video" ? (
          <video src={recording.url} controls playsInline className="max-h-[60vh] w-full rounded-2xl bg-black" />
        ) : (
          <audio src={recording.url} controls className="w-full" />
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" disabled={sending} onClick={() => (canRecord() ? openRecorder(recording.kind) : setStep("intro"))}>
            ↺ Recommencer
          </button>
        </div>

        <div className="card space-y-4 p-5">
          <label className="block">
            <span className="label">Votre nom</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
          </label>
          <label className="block">
            <span className="label">Votre ville et pays</span>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Ex. Douala, Cameroun" />
          </label>
          <label className="block">
            <span className="label">Votre avis en une phrase <span className="font-normal text-muted">(facultatif)</span></span>
            <textarea className="input min-h-20" value={quote} onChange={(e) => setQuote(e.target.value)} maxLength={500} placeholder="Ex. J'ai enfin trouvé le plan de ma maison et je connais son vrai coût." />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#0F5B59]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>J&apos;autorise WOOPLANS à diffuser mon témoignage sur son site et ses réseaux sociaux.</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#0F5B59]" checked={firstOnly} onChange={(e) => setFirstOnly(e.target.checked)} />
            <span>Afficher seulement mon prénom (pas mon nom de famille).</span>
          </label>
        </div>

        {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {sending ? (
          <div>
            <div className="h-3 overflow-hidden rounded-full bg-outline">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-center text-sm text-muted">Envoi en cours… {progress} % — gardez cette page ouverte.</p>
          </div>
        ) : (
          <button type="button" className="btn-cta w-full py-4 text-base" onClick={send}>
            Envoyer mon témoignage
          </button>
        )}
      </div>
    );
  }

  /* ───────────── Accueil ───────────── */
  const hello = info.first_name ? `${info.first_name}, racontez-nous votre expérience en 30 secondes` : "Racontez-nous votre expérience en 30 secondes";
  return (
    <div className="space-y-7">
      {info.already_sent ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ Nous avons bien reçu votre témoignage, merci ! Vous pouvez en envoyer un autre si vous le souhaitez.
        </p>
      ) : null}

      <section>
        <p className="eyebrow">Votre avis compte</p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-tight">{hello}</h1>
        <p className="mt-3 text-foreground/80">
          Chaque jour, des familles hésitent à se lancer dans la construction de leur maison. Votre expérience, même en quelques mots,
          peut les aider à franchir le pas, comme d&apos;autres clients l&apos;ont fait avant vous.
        </p>
        {info.reward ? (
          <p className="mt-4 rounded-2xl border-2 border-accent bg-accent/10 px-4 py-3 font-semibold">🎁 Pour vous remercier : {info.reward}</p>
        ) : null}
      </section>

      <ul className="grid grid-cols-2 gap-2 text-sm">
        {[
          ["⏱️", "30 à 60 secondes suffisent"],
          ["📱", "Depuis votre téléphone, rien à installer"],
          ["😊", "Parlez simplement, comme à un ami"],
          ["🎙️", "Timide ? Un audio suffit"],
        ].map(([icon, text]) => (
          <li key={text} className="card flex items-center gap-2 p-3">
            <span className="text-xl">{icon}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <section className="space-y-3">
        <button type="button" onClick={() => openRecorder("video")} className="btn-cta w-full py-4 text-base">
          🎥 Me filmer maintenant
        </button>
        <p className="-mt-1 text-center text-xs text-muted">Recommandé : c&apos;est ce qui rassure le plus les futurs clients.</p>
        <button type="button" onClick={() => openRecorder("audio")} className="btn-ghost w-full py-4 text-base">
          🎙️ Enregistrer seulement ma voix
        </button>
        {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-col items-center gap-2 pt-1 text-sm">
          <label className="cursor-pointer font-semibold text-primary underline underline-offset-4">
            J&apos;ai déjà une vidéo dans mon téléphone
            <input type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {whatsappVoice ? (
            <a href={whatsappVoice} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">
              Je préfère envoyer un vocal sur WhatsApp
            </a>
          ) : null}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-bold">Vous pouvez parler de…</h2>
        <ol className="mt-2 space-y-1.5 text-sm text-foreground/80">
          {questions.map((q, i) => (
            <li key={q}>{i + 1}. {q}</li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">Les questions s&apos;affichent à l&apos;écran pendant l&apos;enregistrement. Vous pouvez recommencer autant de fois que vous voulez avant d&apos;envoyer.</p>
      </section>

      {examples.length ? (
        <section>
          <h2 className="text-base font-bold">Ils l&apos;ont fait avant vous</h2>
          <p className="mt-1 text-sm text-muted">Pas besoin d&apos;être parfait : un simple selfie suffit.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {examples.map((t) => (
              <figure key={t.id}>
                <video src={`${t.video}#t=1`} controls playsInline preload="metadata" className="aspect-[9/16] w-full rounded-xl bg-black object-cover" />
                <figcaption className="mt-1 text-xs leading-tight">
                  <span className="font-semibold">{t.name.replace(/^M\.\s*/, "")}</span>
                  <span className="block text-muted">{t.location}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-center text-xs text-muted">Votre témoignage n&apos;est diffusé qu&apos;avec votre accord, que vous donnez juste avant l&apos;envoi.</p>
    </div>
  );
}
