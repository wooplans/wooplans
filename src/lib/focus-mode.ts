/**
 * Mode « sans distraction » pour les visiteurs des publicités « plan et devis » (utm_campaign commençant
 * par plan_devis, ex. plan_devis_14900). « Espace Premium » et les liens vers le Catalogue Premium sont masqués
 * (éléments marqués data-focus-hide) pour toute la session de l'onglet.
 * Le menu des modèles (Villas, Duplex…) reste visible (9 nov.) : le 7 nov., 2 ventes sur 5 venaient de visiteurs
 * passés de la fiche de la pub à un autre modèle par le catalogue ; le masquer (8 nov.) coupait ce chemin.
 * Le Catalogue Premium reste masqué : aucun achat du catalogue venant de ces pubs, et il détourne d'une offre
 * à 14 900 FCFA vers une autre à prix différent.
 */
export const FOCUS_STORAGE_KEY = "wp_focus";

/** Campagnes qui déclenchent le mode : utm_campaign commençant par « plan_devis ». */
export function isFocusCampaign(search: string): boolean {
  const campaign = new URLSearchParams(search).get("utm_campaign") ?? "";
  return /^plan_devis/i.test(campaign.trim());
}

/**
 * Script en ligne exécuté avant l'affichage de l'en-tête : pose html[data-focus] sans clignotement.
 * Même règle que isFocusCampaign (gardée en double ici car le script s'exécute avant React).
 */
export const FOCUS_INLINE_SCRIPT = `(function(){try{var k=${JSON.stringify(FOCUS_STORAGE_KEY)};var c=new URLSearchParams(location.search).get("utm_campaign")||"";if(/^plan_devis/i.test(c.trim()))sessionStorage.setItem(k,"1");if(sessionStorage.getItem(k)==="1")document.documentElement.setAttribute("data-focus","1");}catch(e){}})();`;
