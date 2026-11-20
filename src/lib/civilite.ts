/**
 * « M. » ou « Mme » devant le nom dans les relances WhatsApp (demande de Tao, 20 nov.).
 * Nous ne connaissons pas le sexe des acheteurs : on le déduit des prénoms courants (Afrique de l'Ouest et du Centre,
 * prénoms français). Prénom inconnu → null : la page des relances propose alors les deux boutons (M. / Mme).
 * Règles pures, testées dans tests/civilite.test.ts.
 */

export type Civilite = "M." | "Mme";

const FEMMES = new Set(
  `adjoua affoue afoue aicha aissata aissatou akissi akossua ama amenan aminata aminatou amoin amy angele angelique anne annick
  antoinette arlette assetou astou awa aya bintou brigitte carine caroline catherine cecile celestine chantal christelle christiane
  christine claire claudine clarisse colette corinne danielle delphine denise diane djeneba edwige eliane elisabeth elise
  emilienne emma esther estelle eugenie euphrasie evelyne fanta fatim fatima fatou fatoumata florence francine francoise gisele
  grace habiba hadja hawa helene henriette hortense ines irene isabelle jacqueline jeanne jeannette josephine judith julie juliette
  justine kadiatou kadidia khadija koumba laetitia larissa laure laurence lea leonie liliane louise lucie madeleine mai
  mamy maimouna marceline mariam mariama mariame marie marthe martine mathilde maty micheline mireille monique murielle nadege
  nadia nafissatou nathalie ndeye nicole oumou oumy pascaline patricia paulette perpetue philomene prisca rachel ramatou
  ramatoulaye rebecca rokia rosalie rose rose-marie salimata sandrine sarah sali safiatou sephora simone solange sonia sophie
  sylvie therese tenin valerie veronique victoire viviane yvette yvonne zeinab zenabou zita`.split(/\s+/),
);

const HOMMES = new Set(
  `abdou abdoulaye abdoul abou aboubacar adama adrien alain alassane albert alexandre alfred alhassane alpha amadou amara amed
  anicet antoine aristide armand arnaud arthur artur athur augustin aziz baba bakary ballo bamba bassirou benjamin bernard
  blaise boubacar boris brice bruno cedric charles cheick cheikh cherif christian christophe clement cyril cyrille daniel david denis
  didier dieudonne djibril donald drissa edi edmond edouard elie emile emmanuel eric etienne fabrice felix fernand francis franck
  francois frederic gabriel gaston georges gerard germain ghislain gilbert gildas guy hamed hamidou harouna henri herve honore
  horus hugues ibrahim ibrahima idrissa innocent ismael issa issouf jacques jean jeremie jerome joel joseph josue jules julien
  junior justin kader kalilou karamoko karim koffi kofi kouadio kouakou kouame kouassi lacina lamine lancine lassana lassina
  laurent leon leonce lionel louis luc lucien mamadou mamoudou marc marcel martial mathieu maurice max michel modibo mohamed mohammed moussa
  moise narcisse nestor noel oliver olivier omar oumar ousmane pacome pascal patrice patrick paul philippe pierre prosper rene
  richard robert rodrigue roger roland romeo rostand saidou salif samuel sekou serge severin seydou sidiki simon souleymane soumaila
  stephane sylvain thierno thierry thomas tidiane vincent wilfried william yacouba yao yaya youssouf yves zakaria`.split(/\s+/),
);

/** Minuscules sans accents ni apostrophes, pour comparer. */
function key(word: string) {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z-]/g, "");
}

function wordCivilite(word: string): Civilite | null {
  const k = key(word);
  if (!k) return null;
  if (FEMMES.has(k)) return "Mme";
  if (HOMMES.has(k)) return "M.";
  // Prénom composé : c'est le premier prénom qui compte (Jean-Marie → M., Marie-Claire → Mme).
  const head = k.split("-")[0];
  if (head !== k) return wordCivilite(head);
  // Fatoumata, Sahadatou, Ramatou… (Amadou, Saidou restent masculins : « -dou », pas « -atou »).
  if (/atou$/.test(k)) return "Mme";
  if (/(ette|elle|ienne)$/.test(k)) return "Mme";
  return null;
}

/** « M. » ou « Mme » d'après le premier prénom reconnu dans le nom (dans n'importe quel ordre), sinon null. */
export function guessCivilite(name: string | null | undefined): Civilite | null {
  for (const word of (name || "").trim().split(/\s+/)) {
    const c = wordCivilite(word);
    if (c) return c;
  }
  return null;
}

/** Nom affiché proprement : « KONE KONE » → « Kone », « n’da vincent » → « N’Da Vincent ». */
export function formalName(name: string | null | undefined) {
  const words: string[] = [];
  for (const raw of (name || "").trim().split(/\s+/)) {
    if (!raw) continue;
    const word = raw.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
    if (words.at(-1)?.toLowerCase() !== word.toLowerCase()) words.push(word);
  }
  return words.join(" ");
}

/** « M. Thomas Meye », « Mme Awa Traoré », ou le nom seul si la civilité n'est pas connue ; "" sans nom. */
export function salutation(name: string | null | undefined, civilite: Civilite | null = guessCivilite(name)) {
  const formal = formalName(name);
  if (!formal) return "";
  return civilite ? `${civilite} ${formal}` : formal;
}
