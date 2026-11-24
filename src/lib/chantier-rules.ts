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

/* ---------------------------------------------------------------------------------------------------------------- */

/**
 * Modèles de messages WhatsApp du protocole « Démarre ton chantier » (décisions de Tao du 25 nov. 2026), affichés sur
 * la fiche CRM avec un bouton qui ouvre WhatsApp, message déjà écrit. Les mots entre crochets [ ] sont à compléter
 * avant l'envoi. Jamais de fausse urgence. Testé dans tests/chantier-messages.test.ts.
 */

export type MessageContext = {
  name: string;
  code?: string | null;
  /** villa, duplex, immeuble, indecis */
  type?: string | null;
  /** Modèle de la pub cliquée (D4-034). */
  model?: string | null;
  city?: string | null;
  /** asap, 6mois, 1-3ans */
  start?: string | null;
};

export type ChantierMessage = { id: string; step: string; title: string; when: string; text: string };

export const ORANGE_MONEY = "656 71 35 03 (Tawokam Romuald)";
export const CATALOGUE = "wooplans.com/catalogue";

function firstName(name: string) {
  const n = name.trim().split(/\s+/)[0] || "";
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";
}

export function chantierMessages(c: MessageContext): ChantierMessage[] {
  const p = firstName(c.name);
  const hi = p ? `Bonjour ${p} 👋` : "Bonjour 👋";
  const dossier = c.code ? ` (dossier ${c.code})` : "";
  const house = c.type === "villa" ? "votre villa" : c.type === "duplex" ? "votre duplex" : c.type === "immeuble" ? "votre immeuble" : "votre maison";
  const price =
    c.type === "villa" ? fcfa(CHANTIER_PRICES.villa) : c.type === "duplex" ? fcfa(CHANTIER_PRICES.duplex) : c.type === "immeuble" ? "[prix convenu] FCFA" : `${fcfa(CHANTIER_PRICES.villa)} (villa) ou ${fcfa(CHANTIER_PRICES.duplex)} (duplex)`;
  const city = c.city || "[ville]";
  const deposit = fcfa(CHANTIER_DEPOSIT);
  const when = c.start === "6mois" ? "dans les 6 mois" : "rapidement";
  const seen = c.model ? ` Vous avez regardé notre modèle ${c.model}.` : "";
  const livrables = "fondation, distributions, 4 façades, 2 coupes, toiture, fosse septique et devis de construction du gros œuvre";

  return [
    // 1. Accueil (prospect chaud)
    {
      id: "accueil",
      step: "1. Accueil",
      title: "Premier message (chaud)",
      when: "Dans les 15 minutes après son message",
      text: `${hi} C'est Tao, de WooPlans. Merci pour vos réponses${dossier}. Vous avez votre terrain et vous voulez démarrer ${when} : parfait.${seen}\n\nPour préparer la proposition de ${house}, envoyez-moi le dossier technique du terrain (une photo suffit).\n\nSi vous ne l'avez pas sous la main : la longueur, la largeur, et le côté où passe la route.`,
    },
    {
      id: "accueil-relance",
      step: "1. Accueil",
      title: "Relance J+1 sans réponse",
      when: "Le lendemain, s'il n'a pas répondu",
      text: `Bonjour ${p}, avez-vous pu retrouver le dossier technique de votre terrain ?\n\nÀ défaut, la longueur et la largeur me suffisent pour commencer, avec le côté où passe la route.`,
    },
    {
      id: "pas-de-dossier",
      step: "1. Accueil",
      title: "Il n'a pas le dossier sur lui",
      when: "« Je suis en voyage », « au village », « plus tard »",
      text: `Pas de souci ${p}. Quand pensez-vous l'avoir ? Je note la date et je reviens vers vous ce jour-là.\n\nEn attendant, si vous connaissez à peu près la longueur et la largeur, envoyez-les : je vérifie déjà quels modèles tiennent sur votre terrain.`,
    },
    // 2. Terrain connu
    {
      id: "terrain-recu",
      step: "2. Terrain connu",
      title: "Dimensions ou dossier reçus",
      when: "Dès qu'il envoie le dossier ou les dimensions",
      text: `Merci ${p} 👍 C'est noté. Je vérifie que ${house} tient bien sur votre terrain et je vous envoie votre proforma aujourd'hui.`,
    },
    {
      id: "visite",
      step: "2. Terrain connu",
      title: "Terrain en pente : visite",
      when: "Si le terrain n'est pas plat",
      text: `${p}, votre terrain est en pente : pour des fondations et des niveaux justes, nous faisons une visite du terrain avant de dessiner les plans.\n\nÀ ${city}, la visite coûte [prix de la visite] FCFA. Je l'ajoute à votre proforma ?`,
    },
    // 3. Proforma
    {
      id: "proforma",
      step: "3. Proforma",
      title: "Envoi de la proforma",
      when: "Avec le PDF de la proforma",
      text: `Voici votre proforma 📄${dossier}.\n\nPlans complets de ${house} : ${price}, livrés en 7 jours ouvrables : ${livrables}.\n\nPour démarrer : une avance de ${deposit}, déduite du prix. Elle vous ouvre tout de suite l'accès au Catalogue Premium, et je crée le groupe WhatsApp de votre projet.\n\nPaiement Orange Money : ${ORANGE_MONEY}.\n\nPour vous inspirer : ${CATALOGUE}`,
    },
    {
      id: "proforma-j1",
      step: "3. Proforma",
      title: "Relance J+1",
      when: "Le lendemain de la proforma",
      text: `Bonjour ${p}, avez-vous pu regarder votre proforma ? Je reste disponible pour toute question sur les plans ou sur le paiement.`,
    },
    {
      id: "proforma-j3",
      step: "3. Proforma",
      title: "Relance J+3",
      when: "3 jours après la proforma",
      text: `${p}, pour lancer vos plans, il suffit de l'avance de ${deposit}, déduite du prix. Dès réception, vous accédez au Catalogue Premium et nous préparons ensemble les détails de ${house}.\n\nOrange Money : ${ORANGE_MONEY}.`,
    },
    {
      id: "proforma-j7",
      step: "3. Proforma",
      title: "Relance J+7 (dernière)",
      when: "7 jours après la proforma",
      text: `Bonjour ${p}, je ne veux pas vous déranger : votre dossier${c.code ? ` ${c.code}` : ""} reste ouvert. Dites-moi simplement si le projet est toujours d'actualité, ou s'il faut le décaler.`,
    },
    // Objections
    {
      id: "obj-cher",
      step: "Objections",
      title: "« C'est cher »",
      when: "Il trouve le prix élevé (remise de 50 000 FCFA au plus)",
      text: `Je comprends ${p}. Ce prix comprend les plans pour construire et le devis du gros œuvre : vous savez exactement quoi acheter et combien, ce qui évite les erreurs coûteuses sur le chantier. Et vous ne versez que ${deposit} pour démarrer.\n\nQuel montant aviez-vous prévu pour les plans ?`,
    },
    {
      id: "obj-estimation",
      step: "Objections",
      title: "« Je veux juste une estimation »",
      when: "Il demande un devis ou une « quotation »",
      text: `Le devis du gros œuvre de ${house} est justement inclus dans les plans complets, calculé sur vos plans.\n\nPour un premier ordre de grandeur, chaque modèle de notre catalogue a déjà son devis : ${CATALOGUE}`,
    },
    {
      id: "obj-ou",
      step: "Objections",
      title: "« Vous êtes où ? »",
      when: "Il demande où vous êtes, ou n'est pas à Yaoundé",
      text: `Nous sommes à Yaoundé, et nous travaillons à distance partout au Cameroun : tout se fait sur WhatsApp et les plans sont livrés en PDF. Pour un terrain en pente, nous nous déplaçons pour la visite.`,
    },
    {
      id: "obj-famille",
      step: "Objections",
      title: "« J'en parle à ma famille »",
      when: "Il doit consulter quelqu'un",
      text: `Bien sûr ${p}. Vous pouvez leur montrer la proforma. Quand pensez-vous en avoir parlé ? Je reviens vers vous ce jour-là.`,
    },
    {
      id: "obj-reflechir",
      step: "Objections",
      title: "« Je vais réfléchir »",
      when: "Il hésite sans dire pourquoi",
      text: `Pas de souci ${p}. Qu'est-ce qui vous fait hésiter : le prix, le modèle, ou le moment de démarrer ? Je peux vous aider sur chacun.`,
    },
    // 4. Engagé
    {
      id: "avance-recue",
      step: "4. Engagé",
      title: "Avance reçue",
      when: "Dès réception des 39 000 FCFA",
      text: `Merci ${p}, avance de ${deposit} bien reçue ✅\n\nPour activer votre accès au Catalogue Premium, envoyez-moi votre adresse e-mail.\n\nJe crée maintenant le groupe WhatsApp de votre projet${c.code ? ` ${c.code}` : ""} : nous y choisirons ensemble le modèle et les adaptations.`,
    },
    {
      id: "groupe",
      step: "4. Engagé",
      title: "Ouverture du groupe WhatsApp",
      when: "Premier message dans le groupe du projet",
      text: `Bienvenue dans le groupe de votre projet${c.code ? ` ${c.code}` : ""} 🏗️\n\nIci, nous préparons vos plans complets de ${house} à ${city}. Prochaines étapes :\n1. Vous choisissez votre modèle dans le Catalogue Premium (ou vous gardez celui qui vous a plu).\n2. Vous nous dites les adaptations voulues.\n3. Après le solde, vos plans sont livrés en 7 jours ouvrables.`,
    },
    // 5. Livraison
    {
      id: "livraison",
      step: "5. Livraison",
      title: "Plans livrés",
      when: "Avec l'envoi des plans",
      text: `Voici vos plans complets ${p} 🎉 Bonne construction !\n\nSi vous êtes satisfait, un petit message ou une courte vidéo sur votre expérience nous aiderait beaucoup.\n\nEt si quelqu'un autour de vous prépare aussi son chantier, envoyez-lui notre numéro. Nous pouvons aussi vous accompagner pour la construction.`,
    },
    // Autres profils et clôture
    {
      id: "tiede",
      step: "Autres profils",
      title: "Tiède (chantier dans 1 à 3 ans)",
      when: "Premier et seul message manuel",
      text: `${hi} Merci pour vos réponses${dossier}. Votre chantier est prévu dans 1 à 3 ans : c'est le bon moment pour choisir votre modèle et connaître son coût.\n\nTous nos modèles avec leur devis : ${CATALOGUE}\n\nJe reviens vers vous dans quelques mois.`,
    },
    {
      id: "froid",
      step: "Autres profils",
      title: "Froid (pas encore de terrain)",
      when: "Premier et seul message manuel",
      text: `${hi} Merci pour vos réponses${dossier}. Pour préparer ${house}, le mieux est de choisir le modèle et de connaître son coût avant d'acheter le terrain : ${CATALOGUE}\n\nQuand vous aurez votre terrain, écrivez-moi avec votre code de dossier.`,
    },
    {
      id: "hors-cible",
      step: "Autres profils",
      title: "Hors cible (a déjà ses plans)",
      when: "Message de clôture",
      text: `${hi} Merci pour vos réponses${dossier}. Vous avez déjà vos plans : très bien. Si vous voulez comparer avec d'autres modèles, ou être accompagné pour la construction, je reste disponible.`,
    },
    {
      id: "perdu",
      step: "Autres profils",
      title: "Clôture après 3 relances",
      when: "Après 3 relances sans réponse",
      text: `Bonjour ${p}, je mets votre dossier${c.code ? ` ${c.code}` : ""} en pause pour l'instant. Le jour où votre projet redémarre, écrivez-moi simplement, je reprends tout de suite.`,
    },
  ];
}
