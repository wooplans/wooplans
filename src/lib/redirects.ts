/**
 * Redirections permanentes (301/308) des anciennes URL vers les pages actuelles.
 * À compléter avec la liste des URL du site Framer (sitemap) avant la bascule DNS.
 */
type Redirect = { source: string; destination: string; permanent: true };

const r = (source: string, destination: string): Redirect => ({ source, destination, permanent: true });

export const legacyRedirects: Redirect[] = [
  // Anciennes pages de vente
  r("/abonnement", "/catalogue-premium"),
  r("/abonnement-facebook", "/catalogue-premium"),
  r("/abonnement-facebook-froid", "/catalogue-premium"),
  r("/abonnement-facebook-froid/checkout", "/catalogue-premium"),
  r("/digital", "/catalogue-premium"),
  r("/index-digital", "/catalogue-premium"),
  r("/premium", "/catalogue-premium"),
  // Espace membre
  r("/espace-membre", "/espace-premium"),
  r("/login", "/connexion"),
  // Page de retour après paiement des anciens produits Chariow (prd_kufwer, prd_icqox6 : « redirect_url »)
  r("/achat-cp", "/merci"),
  // Fiches
  r("/plan/:slug", "/catalogue/:slug"),
  r("/modeles", "/catalogue"),
  r("/modeles/:slug", "/catalogue/:slug"),

  // Premières URL de la nouvelle plateforme (avant le retour aux URL Framer /catalogue)
  r("/plans", "/catalogue"),
  r("/plans/:slug", "/catalogue/:slug"),

  // Site Framer (sitemap www.wooplans.com, octobre 2026). /catalogue, /catalogue-villa,
  // /catalogue-duplex et /catalogue/<modèle> sont conservées telles quelles (aucune redirection).
  r("/premium-wooplans", "/catalogue-premium"),
  r("/cp19k", "/catalogue-premium"),
  r("/cptest", "/catalogue-premium"),
  r("/ap-v3-037", "/catalogue/villa-v3-037"),
  r("/ap-d4-034", "/catalogue/duplex-d4-034"),
  r("/contacter-nous", "/contact"),
  // Modèles archivés (doublons) → le modèle publié identique
  r("/catalogue/duplex-d4-037", "/catalogue/duplex-d4-036"),
  r("/catalogue/villa-v3-042", "/catalogue/villa-v4-042"),
  r("/arnaques-foncieres", "https://wooplans.mychariow.shop/prd_bri6ow"),
  // Pages à accents : forme encodée (telle que demandée par les navigateurs) et forme décodée
  r("/conditions-g%C3%A9n%C3%A9rales-de-vente", "/conditions-generales-de-vente"),
  r("/conditions-générales-de-vente", "/conditions-generales-de-vente"),
  r("/mention-l%C3%A9gales", "/mentions-legales"),
  r("/mention-légales", "/mentions-legales"),
  r("/politique-de-confidentialit%C3%A9", "/confidentialite"),
  r("/politique-de-confidentialité", "/confidentialite"),
];
