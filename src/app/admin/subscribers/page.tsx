import { Metadata } from "next";
import Link from "next/link";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Abonnés — WooPlans",
  description: "Gestion des abonnés Premium",
};

async function getSubscribers() {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/subscribers`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export default async function SubscribersPage() {
  const subscribers = await getSubscribers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Abonnés Premium</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Gérez tous les abonnés et leur statut
          </p>
        </div>
        <Link
          href="/admin/subscribers/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold text-sm border-2 border-primary hover:bg-transparent hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un abonné
        </Link>
      </div>

      <div className="bg-white border-2 border-outline overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-black text-foreground/60 uppercase tracking-widest">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-foreground/60 uppercase tracking-widest">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-foreground/60 uppercase tracking-widest">
                  Expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-foreground/60 uppercase tracking-widest">
                  Code Premium
                </th>
                <th className="px-6 py-3 text-right text-xs font-black text-foreground/60 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/60">
                    <p className="text-sm">Aucun abonné trouvé</p>
                    <Link
                      href="/admin/subscribers/new"
                      className="text-primary hover:underline text-sm mt-2 inline-block font-bold"
                    >
                      Créer le premier abonné
                    </Link>
                  </td>
                </tr>
              ) : (
                subscribers.map((subscriber: {id: string, email: string, isActive: boolean, expiresAt: string | null, chariowCustomerId: string | null, premiumCode: string | null}, index: number) => (
                  <tr key={subscriber.id} className={`hover:bg-surface/50 ${index > 0 ? 'border-t-2 border-outline' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-foreground">{subscriber.email}</div>
                      <div className="text-xs text-foreground/40 font-mono">{subscriber.chariowCustomerId || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wide ${
                          subscriber.isActive
                            ? "bg-green-50 text-green-700 border-2 border-green-700"
                            : "bg-gray-50 text-gray-600 border-2 border-gray-400"
                        }`}
                      >
                        {subscriber.isActive ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground/70">
                      {subscriber.expiresAt
                        ? new Date(subscriber.expiresAt).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono font-bold text-foreground/70">
                        {subscriber.premiumCode || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleSubscriberStatus(subscriber.id, subscriber.isActive)}
                          className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                            subscriber.isActive
                              ? "bg-yellow-50 text-yellow-700 border-2 border-yellow-700 hover:bg-yellow-700 hover:text-white"
                              : "bg-green-50 text-green-700 border-2 border-green-700 hover:bg-green-700 hover:text-white"
                          }`}
                        >
                          {subscriber.isActive ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

async function toggleSubscriberStatus(id: string, currentStatus: boolean) {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/subscribers/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      isActive: !currentStatus,
    }),
  });

  if (!response.ok) {
    alert("Erreur lors de la mise à jour du statut");
  }

  window.location.reload();
}
