"use client";

/** Erreur dans un onglet : message clair et bouton pour réessayer, sans quitter l'admin. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-6 text-center">
      <p className="text-lg font-semibold">Cet onglet n&apos;a pas pu se charger</p>
      <p className="mt-1 text-sm text-muted">Réessayez. Si cela recommence, transmettez ce code : {error.digest || error.message}</p>
      <button onClick={reset} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">
        Réessayer
      </button>
    </div>
  );
}
