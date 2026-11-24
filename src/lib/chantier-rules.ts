/**
 * Formulaire « Démarre ton chantier » (campagnes plans complets, décision de Tao, 24 nov. 2026) : la pub mène à ce
 * formulaire de qualification, puis à WhatsApp avec un message pré-rempli qui contient un code (CH-123456). Le webhook
 * retrouve les réponses grâce au code, prend le pays dans l'indicatif du numéro, et crée la fiche CRM au bon endroit.
 * Pas d'email ni de numéro demandés : le numéro arrive avec le message WhatsApp. Règles pures, testées dans
 * tests/chantier-rules.test.ts.
 */
/**
 * Ordre pensé pour des réponses justes (décision de Tao, 24 nov.) : d'abord la maison rêvée (facile, sans enjeu, la
 * personne s'engage), puis les faits vérifiables (terrain, plans), puis le délai, qui se juge mieux une fois le terrain
 * et les plans posés, et le budget en dernier (question la plus sensible, posée quand la personne a déjà tout donné).
 */
export const CHANTIER_QUESTIONS = [
  {
    key: "type",
    label: "Quel type de maison ?",
    options: [
      ["villa", "Villa plain-pied"],
      ["duplex", "Duplex"],
      ["indecis", "Je ne sais pas encore"],
    ],
  },
  {
    key: "chambres",
    label: "Combien de chambres ?",
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
export type ChantierAnswers = { [K in ChantierKey]: Extract<Q, { key: K }>["options"][number][0] };

/** Réponses valides (toutes les questions, valeurs connues) + nom et prénom, ou null. */
export function parseChantier(body: Record<string, unknown>): { answers: ChantierAnswers; name: string } | null {
  const answers: Partial<Record<ChantierKey, string>> = {};
  for (const q of CHANTIER_QUESTIONS) {
    const v = String(body[q.key] ?? "");
    if (!q.options.some(([value]) => value === v)) return null;
    answers[q.key] = v;
  }
  const name = String(body.name ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (name.length < 2) return null;
  return { answers: answers as ChantierAnswers, name };
}

export function answerLabel(key: ChantierKey, value: string) {
  const q = CHANTIER_QUESTIONS.find((x) => x.key === key);
  return (q?.options.find(([v]) => v === value)?.[1] as string | undefined) ?? value;
}

export type ChantierProfile = "pret" | "bientot" | "projet" | "a_ses_plans";

export const PROFILE_LABEL: Record<ChantierProfile, string> = {
  pret: "🔥 Prêt à lancer son chantier",
  bientot: "Chantier dans 1 à 3 ans, terrain en main",
  projet: "Projet en préparation (pas encore de terrain)",
  a_ses_plans: "A déjà ses plans complets",
};

/**
 * Profil et offre conseillée :
 *  - a déjà ses plans complets : pas notre cible ;
 *  - terrain + démarrage sous 6 mois : prêt → plan complet ;
 *  - terrain + démarrage dans 1 à 3 ans : bientôt → Catalogue Premium pour choisir, puis plan complet ;
 *  - pas de terrain : projet → Catalogue Premium.
 */
export function chantierProfile(a: ChantierAnswers): { profile: ChantierProfile; offer: string; stage: "qualification" | "demande" } {
  if (a.plans === "complets") return { profile: "a_ses_plans", offer: "Aucune offre de plans : il a déjà ses plans complets (proposer le Catalogue Premium pour comparer si l'échange s'y prête).", stage: "demande" };
  const planOffer =
    a.type === "villa" ? "plan complet de villa (99 000 FCFA)" : a.type === "duplex" ? "plan complet de duplex (199 000 FCFA)" : "plan complet (99 000 FCFA villa, 199 000 FCFA duplex)";
  if (a.terrain === "oui" && (a.start === "asap" || a.start === "6mois")) {
    const choose = a.plans === "idee" || a.plans === "a_revoir" ? "Lui demander le modèle qu'il a en tête" : "L'aider à choisir son modèle (Catalogue Premium si besoin)";
    return { profile: "pret", offer: `${choose}, puis proposer le ${planOffer}.`, stage: "qualification" };
  }
  if (a.terrain === "oui") return { profile: "bientot", offer: `Catalogue Premium pour choisir son modèle, puis le ${planOffer} quand le chantier approche.`, stage: "qualification" };
  return { profile: "projet", offer: "Catalogue Premium pour préparer son projet (terrain et maison).", stage: "demande" };
}

/** Code « CH- » + 6 chiffres, stable pour une demande (hachage FNV-1a de son identifiant). */
export function chantierCode(id: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `CH-${String(h % 1_000_000).padStart(6, "0")}`;
}

/** Le code trouvé dans un message (« ch-482193 », « CH 482193 »), normalisé en « CH-482193 », ou null. */
export function findChantierCode(text: string | null | undefined) {
  const m = /\bCH[\s-]?(\d{6})\b/i.exec(text || "");
  return m ? `CH-${m[1]}` : null;
}

/** Message pré-rempli dans WhatsApp. */
export function chantierWhatsappText(code: string, name: string) {
  return `Bonjour WooPlans 👋 Je veux démarrer mon chantier (dossier ${code}). Je suis ${name}.`;
}

/** Résumé lisible des réponses (fiche CRM, contexte de l'IA). */
export function chantierSummary(a: ChantierAnswers) {
  return CHANTIER_QUESTIONS.map((q) => `${q.label} ${answerLabel(q.key, a[q.key])}.`).join(" ");
}

/** Premier message conseillé à Tao, selon le profil. */
export function chantierFirstMessage(name: string, a: ChantierAnswers) {
  const first = name.split(" ")[0];
  const house = a.type === "villa" ? "votre villa" : a.type === "duplex" ? "votre duplex" : "votre maison";
  const { profile } = chantierProfile(a);
  if (profile === "pret")
    return `Bonjour ${first} 👋 Merci pour vos réponses. Vous avez votre terrain et vous voulez démarrer vite : parfait. Avez-vous déjà choisi le modèle de ${house} (${a.chambres} chambres) ? Envoyez-moi les dimensions de votre terrain, je vous dis comment nos architectes préparent vos plans complets.`;
  if (profile === "bientot")
    return `Bonjour ${first} 👋 Merci pour vos réponses. Vous avez votre terrain, c'est la meilleure étape pour bien préparer ${house}. Le plus important maintenant : choisir le bon modèle. Je vous montre comment comparer nos maisons avec leur devis ?`;
  if (profile === "projet")
    return `Bonjour ${first} 👋 Merci pour vos réponses. Pour préparer ${house}, le mieux est de choisir le modèle et de connaître son coût avant d'acheter le terrain. Je vous montre nos modèles avec leur devis ?`;
  return `Bonjour ${first} 👋 Merci pour vos réponses. Vous avez déjà vos plans : dites-moi si je peux vous aider pour autre chose.`;
}
