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
  r("/catalogue", "/catalogue-premium"),
  r("/premium", "/catalogue-premium"),
  // Espace membre
  r("/espace-membre", "/espace-premium"),
  r("/login", "/connexion"),
  // Fiches
  r("/plan/:slug", "/plans/:slug"),
  r("/modeles", "/plans"),
  r("/modeles/:slug", "/plans/:slug"),
];
