"use client";

import { useMemo, useState } from "react";

const PLATFORMS = [
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "whatsapp", label: "WhatsApp (statut, groupe)" },
] as const;

const slug = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** Génère les liens avec paramètres UTM pour reconnaître la provenance des visiteurs dans le tableau de bord. */
export function UtmLinkBuilder({ siteUrl, plans }: { siteUrl: string; plans: { slug: string; name: string }[] }) {
  const [platform, setPlatform] = useState<string>("facebook");
  const [paid, setPaid] = useState(false);
  const [page, setPage] = useState("/catalogue-premium");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    const params = new URLSearchParams({ utm_source: platform, utm_medium: paid ? "paid_social" : "social" });
    if (slug(campaign)) params.set("utm_campaign", slug(campaign));
    if (slug(content)) params.set("utm_content", slug(content));
    return `${siteUrl}${page}?${params}`;
  }, [siteUrl, platform, paid, page, campaign, content]);

  return (
    <div className="card grid gap-4 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="label">Où publiez-vous ?</span>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="input">
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Type de publication</span>
          <select value={paid ? "paid" : "free"} onChange={(e) => setPaid(e.target.value === "paid")} className="input">
            <option value="free">Publication gratuite (organique)</option>
            <option value="paid">Publicité payante</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Page de destination</span>
          <select value={page} onChange={(e) => setPage(e.target.value)} className="input">
            <option value="/catalogue-premium">Page de vente du Catalogue Premium</option>
            <option value="/">Accueil</option>
            <option value="/catalogue">Catalogue des modèles</option>
            <option value="/plans-personnalises">Plans personnalisés</option>
            {plans.map((p) => (
              <option key={p.slug} value={`/catalogue/${p.slug}`}>Fiche : {p.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Nom de la campagne</span>
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="ex. octobre-duplex" className="input" />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="label">Contenu (facultatif) : nom de la vidéo ou du visuel</span>
          <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="ex. video-v3-037" className="input" />
        </label>
      </div>
      <div className="rounded-xl bg-background p-3">
        <p className="break-all font-mono text-sm">{url}</p>
      </div>
      <div>
        <button
          type="button"
          className="btn-primary"
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Lien copié ✓" : "Copier le lien"}
        </button>
      </div>
    </div>
  );
}
