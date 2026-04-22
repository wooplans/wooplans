"use client";

import { useEffect, useState } from "react";

type Subscriber = {
  id: string;
  email: string;
  isActive: boolean;
  expiresAt: string | null;
  chariowCustomerId: string | null;
  premiumCode: string | null;
};

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSubscribers() {
      try {
        const response = await fetch("/api/admin/subscribers", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as Subscriber[] | { error?: string };

        if (!response.ok || !Array.isArray(data)) {
          throw new Error(Array.isArray(data) ? "load_failed" : (data.error ?? "load_failed"));
        }

        if (isMounted) {
          setSubscribers(data);
          setError("");
        }
      } catch (error) {
        console.error("Failed to load subscribers:", error);
        if (isMounted) {
          setError("Erreur lors du chargement des abonnes");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadSubscribers();

    return () => {
      isMounted = false;
    };
  }, []);

  async function toggleSubscriberStatus(id: string, currentStatus: boolean) {
    setUpdatingId(id);

    try {
      const response = await fetch(`/api/admin/subscribers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      const updated = (await response.json().catch(() => ({}))) as Subscriber & { error?: string };

      if (!response.ok) {
        throw new Error(updated.error || "update_failed");
      }

      setSubscribers((current) =>
        current.map((subscriber) => (subscriber.id === updated.id ? updated : subscriber)),
      );
      setError("");
    } catch (error) {
      console.error("Failed to update subscriber:", error);
      alert("Erreur lors de la mise a jour du statut");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Abonnes Premium</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Gere tous les abonnes et leur statut
          </p>
        </div>
        <div className="text-xs text-foreground/50 text-right max-w-xs">
          Les abonnes sont crees automatiquement depuis les achats premium.
        </div>
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/60">
                    <p className="text-sm">Chargement des abonnes...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-red-700">
                    <p className="text-sm font-semibold">{error}</p>
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/60">
                    <p className="text-sm">Aucun abonne trouve</p>
                    <p className="text-primary text-sm mt-2 inline-block font-bold">
                      Les achats premium ajouteront automatiquement des abonnes ici
                    </p>
                  </td>
                </tr>
              ) : (
                subscribers.map((subscriber, index) => (
                  <tr
                    key={subscriber.id}
                    className={`hover:bg-surface/50 ${index > 0 ? "border-t-2 border-outline" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-foreground">{subscriber.email}</div>
                      <div className="text-xs text-foreground/40 font-mono">
                        {subscriber.chariowCustomerId || "-"}
                      </div>
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
                          disabled={updatingId === subscriber.id}
                          className={`px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                            subscriber.isActive
                              ? "bg-yellow-50 text-yellow-700 border-2 border-yellow-700 hover:bg-yellow-700 hover:text-white"
                              : "bg-green-50 text-green-700 border-2 border-green-700 hover:bg-green-700 hover:text-white"
                          }`}
                        >
                          {updatingId === subscriber.id
                            ? "..."
                            : subscriber.isActive
                              ? "Desactiver"
                              : "Activer"}
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
