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
  // Fiches
  r("/plan/:slug", "/plans/:slug"),
  r("/modeles", "/plans"),
  r("/modeles/:slug", "/plans/:slug"),

  // Site Framer (sitemap www.wooplans.com, octobre 2026)
  r("/catalogue", "/plans"),
  r("/catalogue-villa", "/plans?categorie=villa"),
  r("/catalogue-duplex", "/plans?categorie=duplex"),
  r("/catalogue/:slug", "/plans/:slug"),
  r("/premium-wooplans", "/catalogue-premium"),
  r("/cp19k", "/catalogue-premium"),
  r("/cptest", "/catalogue-premium"),
  r("/ap-v3-037", "/plans/villa-v3-037"),
  r("/ap-d4-034", "/plans/duplex-d4-034"),
  r("/contacter-nous", "/contact"),
  // Pages à accents : forme encodée (telle que demandée par les navigateurs) et forme décodée
  r("/conditions-g%C3%A9n%C3%A9rales-de-vente", "/conditions-generales-de-vente"),
  r("/conditions-générales-de-vente", "/conditions-generales-de-vente"),
  r("/mention-l%C3%A9gales", "/mentions-legales"),
  r("/mention-légales", "/mentions-legales"),
  r("/politique-de-confidentialit%C3%A9", "/confidentialite"),
  r("/politique-de-confidentialité", "/confidentialite"),
];
