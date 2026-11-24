/**
 * Formulaire « Démarre ton chantier » (campagnes plans complets, décision de Tao, 24 nov. 2026) : la pub mène à ce
 * formulaire de qualification, puis à WhatsApp avec un message pré-rempli qui contient le code du dossier. Le webhook
 * retrouve les réponses grâce au code, prend le pays dans l'indicatif du numéro, et crée la fiche CRM au bon endroit.
 * Pas d'email ni de numéro demandés : le numéro arrive avec le message WhatsApp. Règles pures, testées dans
 * tests/chantier-rules.test.ts.
 *
 * Protocole (décisions de Tao, 25 nov. 2026) : un prospect est chaud s'il a le terrain ET veut démarrer au plus tôt ou
 * dans 6 mois. Il gagne des points avec les dimensions + le côté de la route, puis avec le dossier technique du terrain.
 * Ensuite : proforma (plan complet villa 200 000, duplex 300 000 FCFA, remise de 50 000 au plus ; immeuble à négocier
 * avec Tao), avance de 39 000 FCFA déduite du prix, qui ouvre le Catalogue Premium et le groupe WhatsApp du projet.
 * Les « 1 à 3 ans » et les prospects sans terrain ne sont pas suivis à la main.
 */
/**
 * Ordre pensé pour des réponses justes : d'abord la maison rêvée (facile, sans enjeu), puis les faits vérifiables
 * (terrain, relief, plans), puis le délai, et le budget en dernier (question la plus sensible). Une question avec
 * `showIf` n'est posée que si une réponse précédente le justifie ; sinon elle vaut « na ».
 */
export const CHANTIER_QUESTIONS = [
  {
    key: "type",
    label: "Quel type de construction ?",
    options: [
      ["villa", "Villa plain-pied"],
      ["duplex", "Duplex"],
      ["immeuble", "Immeuble"],
      ["indecis", "Je ne sais pas encore"],
    ],
  },
  {
    key: "chambres",
    label: "Combien de chambres ?",
    showIf: { key: "type", in: ["villa", "duplex", "indecis"] },
    options: [
      ["3", "3 chambres"],
      ["4", "4 chambres"],
      ["5+", "5 chambres et plus"],
    ],
  },
  {
    key: "terrain",
    label: "Avez-vous déjà un terrain ?",
    options: [
      ["oui", "Oui, j'ai un terrain"],
      ["cherche", "Pas encore, je cherche"],
      ["non", "Pas encore"],
    ],
  },
  {
    key: "relief",
    label: "Votre terrain est-il plat ?",
    showIf: { key: "terrain", in: ["oui"] },
    options: [
      ["plat", "Oui, il est plat"],
      ["pente", "Non, il est en pente"],
      ["nsp", "Je ne sais pas"],
    ],
  },
  {
    key: "plans",
    label: "Avez-vous déjà les plans pour lancer le chantier ?",
    options: [
      ["non", "Pas encore"],
      ["idee", "J'ai une idée, un modèle en tête"],
      ["a_revoir", "J'ai des plans, mais à revoir"],
      ["complets", "Oui, j'ai mes plans complets"],
    ],
  },
  {
    key: "start",
    label: "Quand voulez-vous démarrer les travaux ?",
    options: [
      ["asap", "Le plus tôt possible"],
      ["6mois", "Dans 6 mois"],
      ["1-3ans", "Dans 1 à 3 ans"],
    ],
  },
  {
    key: "budget",
    label: "Quel budget prévoyez-vous pour la construction ?",
    options: [
      ["-20", "Moins de 20 millions FCFA"],
      ["20-40", "Entre 20 et 40 millions FCFA"],
      ["40-60", "Entre 40 et 60 millions FCFA"],
      ["60+", "Plus de 60 millions FCFA"],
    ],
  },
] as const;

type Q = (typeof CHANTIER_QUESTIONS)[number];
export type ChantierKey = Q["key"];
export type ChantierAnswers = { [K in ChantierKey]: Extract<Q, { key: K }>["options"][number][0] | "na" };

/** Prix des plans complets du tunnel « Démarre ton chantier » (proforma), en FCFA. */
export const CHANTIER_PRICES = { villa: 200_000, duplex: 300_000 } as const;
export const CHANTIER_MAX_DISCOUNT = 50_000;
export const CHANTIER_DEPOSIT = 39_000;

/** La question est-elle posée, vu les réponses précédentes ? */
export function isAsked(q: Q, answers: Partial<Record<ChantierKey, string>>) {
  if (!("showIf" in q)) return true;
  const cond = q.showIf as { key: ChantierKey; in: readonly string[] };
  return cond.in.includes(answers[cond.key] ?? "");
}

/** Réponses valides (questions posées, valeurs connues ; « na » pour les autres) + nom et ville, ou null. */
export function parseChantier(body: Record<string, unknown>): { answers: ChantierAnswers; name: string; city: string } | null {
  const answers: Partial<Record<ChantierKey, string>> = {};
  for (const q of CHANTIER_QUESTIONS) {
    if (!isAsked(q, answers)) {
      answers[q.key] = "na";
      continue;
    }
    const v = String(body[q.key] ?? "");
    if (!q.options.some(([value]) => value === v)) return null;
    answers[q.key] = v;
  }
  const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const name = clean(body.name, 80);
  const city = clean(body.city, 60);
  if (name.length < 2 || city.length < 2) return null;
  return { answers: answers as ChantierAnswers, name, city };
}

export function answerLabel(key: ChantierKey, value: string) {
  if (value === "na") return "—";
  const q = CHANTIER_QUESTIONS.find((x) => x.key === key);
  return (q?.options.find(([v]) => v === value)?.[1] as string | undefined) ?? value;
}

export type ChantierProfile = "pret" | "bientot" | "projet" | "a_ses_plans";

/** Lettre du niveau d'intérêt dans le code : C chaud, T tiède, F froid, H hors cible. */
export const PROFILE_LETTER: Record<ChantierProfile, "C" | "T" | "F" | "H"> = { pret: "C", bientot: "T", projet: "F", a_ses_plans: "H" };

export const PROFILE_LABEL: Record<ChantierProfile, string> = {
  pret: "🔥 Chaud : terrain + démarrage sous 6 mois",
  bientot: "Tiède : terrain, chantier dans 1 à 3 ans",
  projet: "Froid : pas encore de terrain",
  a_ses_plans: "Hors cible : a déjà ses plans complets",
};

function planPrice(type: string) {
  if (type === "villa") return `plan complet de villa : ${fcfa(CHANTIER_PRICES.villa)}`;
  if (type === "duplex") return `plan complet de duplex : ${fcfa(CHANTIER_PRICES.duplex)}`;
  if (type === "immeuble") return "immeuble : prix à négocier directement avec Tao";
  return `plan complet : ${fcfa(CHANTIER_PRICES.villa)} (villa) ou ${fcfa(CHANTIER_PRICES.duplex)} (duplex)`;
}

export function fcfa(n: number) {
  return `${n.toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;
}

/**
 * Profil, offre conseillée et étape CRM (protocole de Tao) :
 *  - a déjà ses plans complets : hors cible ;
 *  - terrain + démarrage au plus tôt ou sous 6 mois : chaud → dossier technique (ou dimensions + côté de la route),
 *    puis proforma et avance ;
 *  - terrain + 1 à 3 ans : tiède, pas de suivi manuel ;
 *  - pas de terrain : froid, pas de suivi manuel.
 */
export function chantierProfile(a: ChantierAnswers): { profile: ChantierProfile; offer: string; stage: "qualification" | "demande" } {
  if (a.plans === "complets") return { profile: "a_ses_plans", offer: "Hors cible : il a déjà ses plans complets. Un message de clôture, Catalogue Premium seulement s'il veut comparer.", stage: "demande" };
  if (a.terrain === "oui" && (a.start === "asap" || a.start === "6mois")) {
    const visit = a.relief === "pente" ? " Terrain en pente : proposer une visite de terrain (payante, prix fixé par Tao selon le lieu)." : a.relief === "nsp" ? " Relief inconnu : le demander." : "";
    return {
      profile: "pret",
      offer:
        `1) Obtenir le dossier technique du terrain (photo), à défaut longueur × largeur + côté de la route.${visit} ` +
        `2) Proforma : ${planPrice(a.type)}${a.type === "immeuble" ? "" : `, remise de ${fcfa(CHANTIER_MAX_DISCOUNT)} au plus`}. ` +
        `3) Avance de ${fcfa(CHANTIER_DEPOSIT)}, déduite du prix : accès au Catalogue Premium + groupe WhatsApp du projet.`,
      stage: "qualification",
    };
  }
  if (a.terrain === "oui") return { profile: "bientot", offer: "Pas de suivi manuel : lien du catalogue, puis relance automatique tous les 2 mois.", stage: "demande" };
  return { profile: "projet", offer: "Pas de suivi manuel : lien du catalogue pour préparer le projet, relance automatique tous les 2 mois.", stage: "demande" };
}

/** Partie « type + chambres » du code : V4, D5, X3, I (immeuble, sans chambres). */
function typePart(a: ChantierAnswers) {
  const t = a.type === "villa" ? "V" : a.type === "duplex" ? "D" : a.type === "immeuble" ? "I" : "X";
  return t === "I" ? "I" : `${t}${a.chambres === "5+" ? "5" : a.chambres === "na" ? "" : a.chambres}`;
}

/**
 * Code du dossier, lisible sans ouvrir le CRM (décision de Tao, 25 nov.) : niveau-typechambres-délai-numéro.
 * Ex. « C-D4-AP-4821 » = chaud, duplex 4 chambres, au plus tôt, dossier 4821. Délai : AP au plus tôt, 6M dans 6 mois,
 * LT 1 à 3 ans. Le budget n'y figure pas (souvent faux). Le numéro vient d'un hachage FNV-1a de l'identifiant.
 */
export function chantierCode(id: string, a: ChantierAnswers) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const delay = a.start === "asap" ? "AP" : a.start === "6mois" ? "6M" : "LT";
  return `${PROFILE_LETTER[chantierProfile(a).profile]}-${typePart(a)}-${delay}-${String(h % 10_000).padStart(4, "0")}`;
}

/**
 * Le code trouvé dans un message, normalisé en majuscules, ou null : nouveau format (« c-d4-ap-4821 ») ou ancien
 * (« ch-482193 », « CH 482193 »).
 */
export function findChantierCode(text: string | null | undefined) {
  const t = text || "";
  const m = /\b([CTFH])-([VDX][345]?|I)-(AP|6M|LT)-(\d{4})\b/i.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}-${m[4]}`.toUpperCase();
  const old = /\bCH[\s-]?(\d{6})\b/i.exec(t);
  return old ? `CH-${old[1]}` : null;
}

/** Référence du modèle de la pub cliquée (utm_content « D5-012 », « v3-017 »), normalisée, ou null. */
export function adModelCode(utmContent: string | null | undefined) {
  const m = /\b([VD])(\d)-(\d{3})\b/i.exec(utmContent || "");
  return m ? `${m[1].toUpperCase()}${m[2]}-${m[3]}` : null;
}

/** Message pré-rempli dans WhatsApp. */
export function chantierWhatsappText(code: string, name: string) {
  return `Bonjour WooPlans 👋 Je veux démarrer mon chantier (dossier ${code}). Je suis ${name}.`;
}

/** Résumé lisible des réponses (fiche CRM, contexte de l'IA), sans les questions non posées. */
export function chantierSummary(a: ChantierAnswers, city?: string | null) {
  const parts = CHANTIER_QUESTIONS.filter((q) => a[q.key] !== "na").map((q) => `${q.label} ${answerLabel(q.key, a[q.key])}.`);
  if (city) parts.push(`Ville du chantier : ${city}.`);
  return parts.join(" ");
}

/** Premier message conseillé à Tao, selon le profil (et le modèle de la pub cliquée s'il est connu). */
export function chantierFirstMessage(name: string, a: ChantierAnswers, adCode?: string | null) {
  const first = name.split(" ")[0];
  const house = a.type === "villa" ? "votre villa" : a.type === "duplex" ? "votre duplex" : a.type === "immeuble" ? "votre immeuble" : "votre maison";
  const { profile } = chantierProfile(a);
  if (profile === "pret") {
    const seen = adCode ? ` Vous avez regardé notre modèle ${adCode}.` : "";
    return `Bonjour ${first} 👋 Merci pour vos réponses. Vous avez votre terrain et vous voulez démarrer ${a.start === "asap" ? "rapidement" : "dans les 6 mois"} : parfait.${seen} Pour préparer la proposition de ${house}, envoyez-moi le dossier technique du terrain (une photo suffit). Si vous ne l'avez pas sous la main : la longueur, la largeur et le côté où passe la route.`;
  }
  if (profile === "bientot" || profile === "projet")
    return `Bonjour ${first} 👋 Merci pour vos réponses. Pour préparer ${house}, commencez par choisir votre modèle et voir son coût : wooplans.com/catalogue. Je reviens vers vous quand votre chantier approche.`;
  return `Bonjour ${first} 👋 Merci pour vos réponses. Vous avez déjà vos plans : dites-moi si je peux vous aider pour autre chose.`;
}
