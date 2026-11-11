/**
 * Page de vente /catalogue-physique : Catalogue Premium imprimé, vendu au Cameroun, commandé sur WhatsApp.
 * Fragments dynamiques (galerie des modèles) et message WhatsApp de la commande. Module pur (testé sous Node).
 */

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** « 25 – 31 M FCFA » : même règle que la page de vente numérique (src/lib/sales-page.ts). */
export function budgetLabel(min?: number | null, max?: number | null) {
  const m = (v: number) => {
    const x = v / 1_000_000;
    return (x >= 10 ? Math.round(x).toString() : x.toFixed(1).replace(/\.0$/, "")).replace(".", ",");
  };
  if (min && max && max > min) return `${m(min)} – ${m(max)} M FCFA`;
  const one = min || max;
  return one ? `≈ ${m(one)} M FCFA` : null;
}

/** Nombre de modèles montrés en grand (rail « top 20 ») ; les autres en vignettes. */
export const TOP_SIZE = 20;
/** Rendus d'un modèle ouverts dans la visionneuse (le premier est la couverture). */
export const MAX_RENDERS = 6;

export type PhysicalPlan = {
  code: string;
  name: string;
  category: string;
  coverImage: string;
  renders: string[];
  levels: number;
  surfaceTotal: number;
  bedrooms: number;
  bathrooms: number;
  landArea?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
};

const CATEGORY: Record<string, string> = { villa: "Villa", duplex: "Duplex", immeuble: "Immeuble", autre: "Modèle" };

function imageUrl(ref: string) {
  if (/^https:\/\//.test(ref) || ref.startsWith("/")) return ref;
  return `/media/${ref.split("/").map(encodeURIComponent).join("/")}`;
}

/** Version réduite servie par /media (largeurs acceptées : src/lib/media-size.ts). */
function sized(ref: string, w: 160 | 320 | 480 | 640 | 828) {
  const url = imageUrl(ref);
  return url.startsWith("/media/") ? `${url}?w=${w}` : url;
}

export function planFacts(p: PhysicalPlan) {
  return [
    p.levels <= 1 ? "Plain-pied" : p.levels === 2 ? "Duplex R+1" : `R+${p.levels - 1}`,
    p.surfaceTotal ? `${p.surfaceTotal} m²` : null,
    p.bedrooms ? `${p.bedrooms} chambre${p.bedrooms > 1 ? "s" : ""}` : null,
  ].filter((f): f is string => Boolean(f));
}

/** Images de la visionneuse : couverture puis autres rendus, sans doublon. */
function viewerImages(p: PhysicalPlan) {
  return [p.coverImage, ...p.renders.filter((r) => r && r !== p.coverImage)].slice(0, MAX_RENDERS).map((r) => sized(r, 828));
}

/** Données de la visionneuse, posées sur la carte (lues par le script de la page). */
function viewerAttrs(p: PhysicalPlan) {
  const budget = budgetLabel(p.budgetMin, p.budgetMax);
  const info = [
    ...planFacts(p),
    p.bathrooms ? `${p.bathrooms} salle${p.bathrooms > 1 ? "s" : ""} de bain` : null,
    p.landArea ? `terrain conseillé ${p.landArea} m²` : null,
  ].filter(Boolean).join(" · ");
  return `data-name="${escapeHtml(p.name)}" data-info="${escapeHtml(info)}" data-budget="${escapeHtml(budget ?? "")}" data-imgs="${escapeHtml(JSON.stringify(viewerImages(p)))}"`;
}

/** Rail des modèles phares : grand rendu, caractéristiques, budget ; un toucher ouvre tous les rendus. */
export function topModelsHtml(plans: PhysicalPlan[]) {
  return plans
    .filter((p) => p.coverImage)
    .map((p, i) => {
      const budget = budgetLabel(p.budgetMin, p.budgetMax);
      const count = viewerImages(p).length;
      const cover = imageUrl(p.coverImage);
      const srcset = cover.startsWith("/media/") ? ` srcset="${cover}?w=480 480w, ${cover}?w=640 640w" sizes="(min-width: 900px) 320px, 50vw"` : "";
      return `<button type="button" class="model" ${viewerAttrs(p)}><span class="rank">N°${i + 1}</span><img src="${escapeHtml(sized(p.coverImage, 480))}"${srcset} width="600" height="375" loading="lazy" decoding="async" alt="Rendu 3D : ${escapeHtml(p.name)}">${count > 1 ? `<span class="more-img">${count} vues</span>` : ""}<span class="m-body"><span class="type">${escapeHtml(CATEGORY[p.category] ?? p.category)}</span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(planFacts(p).join(" · "))}</small>${budget ? `<span class="budget">Budget indicatif : ${escapeHtml(budget)}</span>` : ""}</span></button>`;
    })
    .join("");
}

/** Vignettes des autres modèles du livre : rendu et référence ; un toucher ouvre la visionneuse. */
export function moreModelsHtml(plans: PhysicalPlan[]) {
  return plans
    .filter((p) => p.coverImage)
    .map((p) => `<button type="button" class="thumb" ${viewerAttrs(p)}><img src="${escapeHtml(sized(p.coverImage, 320))}" width="320" height="200" loading="lazy" decoding="async" alt="Rendu 3D : ${escapeHtml(p.name)}"><span>${escapeHtml(p.code)} · ${escapeHtml(planFacts(p).slice(1).join(" · "))}</span></button>`)
    .join("");
}

/* ─────────────── Commande ─────────────── */

export const CITIES = ["Yaoundé", "Douala"] as const;
export const PROJECTS = { villa: "une villa (plain-pied)", duplex: "un duplex", indecis: "je ne sais pas encore" } as const;
export const TIMINGS = { "6mois": "dans les 6 mois", "1an": "d'ici 1 an", "plus": "dans plus d'1 an", "info": "je me renseigne" } as const;

export type PhysicalOrder = {
  name: string;
  /** Numéro national camerounais, chiffres seuls (9 chiffres) */
  phone: string;
  city: string;
  district: string;
  project: keyof typeof PROJECTS;
  timing: keyof typeof TIMINGS;
  quantity: number;
};

export type OrderBody = Partial<Record<"name" | "phone" | "city" | "otherCity" | "district" | "project" | "timing", unknown>> & { quantity?: unknown };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Numéro camerounais : 9 chiffres commençant par 6 ou 2, indicatif +237 / 00237 retiré. */
export function cameroonPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00237")) d = d.slice(5);
  else if (d.startsWith("237") && d.length === 12) d = d.slice(3);
  return /^[26]\d{8}$/.test(d) ? d : null;
}

/** Contrôle du formulaire de commande : renvoie la commande ou le message à afficher. */
export function parseOrder(body: OrderBody): { order: PhysicalOrder } | { error: string } {
  const name = str(body.name, 120);
  if (name.length < 2) return { error: "Indiquez votre nom." };
  const phone = cameroonPhone(str(body.phone, 40));
  if (!phone) return { error: "Indiquez un numéro WhatsApp camerounais valide (9 chiffres, ex. 6 71 23 45 67)." };
  const choice = str(body.city, 60);
  const city = (CITIES as readonly string[]).includes(choice) ? choice : str(body.otherCity, 60);
  if (city.length < 2) return { error: "Indiquez votre ville de livraison." };
  const district = str(body.district, 120);
  if (district.length < 2) return { error: "Indiquez votre quartier ou votre point de livraison." };
  const project = str(body.project, 20) as keyof typeof PROJECTS;
  if (!(project in PROJECTS)) return { error: "Dites-nous quel type de maison vous préparez." };
  const timing = str(body.timing, 20) as keyof typeof TIMINGS;
  if (!(timing in TIMINGS)) return { error: "Dites-nous quand vous comptez construire." };
  const q = Number(body.quantity ?? 1);
  const quantity = Number.isInteger(q) && q >= 1 && q <= 10 ? q : 1;
  return { order: { name, phone, city, district, project, timing, quantity } };
}

export const isDeliveryCity = (city: string) => (CITIES as readonly string[]).includes(city);

/** Référence courte de la commande, reprise dans le message WhatsApp et le CRM. */
export function orderRef(id: string) {
  return `CP-${id.replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase()}`;
}

const fcfa = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA`;

/** Message WhatsApp prérempli : tout ce qu'il faut pour confirmer la commande sans reposer de question. */
export function orderMessage(order: PhysicalOrder, ref: string, price: number, models: number) {
  const qty = order.quantity > 1 ? `${order.quantity} exemplaires` : "1 exemplaire";
  const delivery = isDeliveryCity(order.city) ? "livraison gratuite, paiement à la livraison" : "expédition gratuite";
  return [
    `Bonjour WOOPLANS 👋`,
    `Je souhaite commander le *Catalogue Premium imprimé* (${models} plans de maisons avec devis) à ${fcfa(price)}.`,
    ``,
    `📦 Commande ${ref} : ${qty}`,
    `👤 Nom : ${order.name}`,
    `📍 ${order.city}, ${order.district} (${delivery})`,
    `🏠 Mon projet : ${PROJECTS[order.project]}, construction ${TIMINGS[order.timing]}`,
    ``,
    `Merci de me confirmer la livraison et le paiement.`,
  ].join("\n");
}

export function whatsappUrl(message: string, number: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Message court du QR code (visiteur sur ordinateur) : QR plus simple à scanner, détails déjà dans le CRM. */
export function shortOrderMessage(order: PhysicalOrder, ref: string, price: number) {
  return `Bonjour WOOPLANS, je confirme ma commande ${ref} du Catalogue Premium imprimé (${fcfa(price * order.quantity)}). ${order.name}, ${order.city}.`;
}
