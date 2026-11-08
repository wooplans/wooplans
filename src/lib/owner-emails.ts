/** Adresses du propriétaire et de l'équipe : leurs essais ne comptent ni dans les statistiques ni dans les relances. */
export const OWNER_EMAILS = ["wooplans237@gmail.com", "info@wooplans.com", "romualdtwk@gmail.com"] as const;

export function isOwnerEmail(email: string | null | undefined) {
  return Boolean(email) && (OWNER_EMAILS as readonly string[]).includes(email!.trim().toLowerCase());
}
