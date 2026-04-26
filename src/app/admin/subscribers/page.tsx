"use client";

import { useEffect, useState, useCallback } from "react";

type Subscriber = {
  id: string;
  email: string;
  isActive: boolean;
  expiresAt: string | null;
  chariowCustomerId: string | null;
  premiumCode: string | null;
  createdAt: string;
};

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addActive, setAddActive] = useState(true);
  const [addExpiresAt, setAddExpiresAt] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadSubscribers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/subscribers", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as Subscriber[] | { error?: string };

      if (!response.ok || !Array.isArray(data)) {
        throw new Error(Array.isArray(data) ? "load_failed" : (data.error ?? "load_failed"));
      }

      setSubscribers(data);
      setError("");
    } catch (err) {
      console.error("Failed to load subscribers:", err);
      setError("Erreur lors du chargement des abonnes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    void loadSubscribers().then(() => { if (!isMounted) return; });
    return () => { isMounted = false; };
  }, [loadSubscribers]);

  async function toggleSubscriberStatus(id: string, currentStatus: boolean) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/subscribers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const updated = (await response.json().catch(() => ({}))) as Subscriber & { error?: string };
      if (!response.ok) throw new Error(updated.error || "update_failed");
      setSubscribers((cur) => cur.map((s) => (s.id === updated.id ? updated : s)));
      setError("");
    } catch (err) {
      console.error("Failed to update subscriber:", err);
      alert("Erreur lors de la mise a jour du statut");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteSubscriber(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/subscribers/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete_failed");
      setSubscribers((cur) => cur.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Failed to delete subscriber:", err);
      alert("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddSubscriber(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");

    try {
      const response = await fetch("/api/admin/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail,
          isActive: addActive,
          expiresAt: addExpiresAt || null,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as Subscriber & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "create_failed");
      }

      setSubscribers((cur) => [data, ...cur]);
      setShowAddModal(false);
      setAddEmail("");
      setAddActive(true);
      setAddExpiresAt("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création";
      setAddError(msg === "create_failed" ? "Erreur lors de la création de l'abonné" : msg);
    } finally {
      setAddLoading(false);
    }
  }

  const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Abonnes Premium</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Gere les abonnes et leur statut
          </p>
        </div>
        <button
          onClick={() => {
            setAddError("");
            setAddEmail("");
            setAddActive(true);
            setAddExpiresAt(defaultExpiry);
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 bg-accent text-white font-bold text-sm hover:bg-accent/90 transition-colors"
        >
          + Ajouter un abonne
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border-2 border-red-700 text-red-700 dark:text-red-300 px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="bg-surface border-2 border-outline overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-foreground/5 dark:bg-foreground/10">
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
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/60">
                    <p className="text-sm">Aucun abonne trouve</p>
                    <p className="text-primary text-sm mt-2 inline-block font-bold">
                      Cliquez sur &quot;Ajouter un abonne&quot; pour en creer un manuellement
                    </p>
                  </td>
                </tr>
              ) : (
                subscribers.map((subscriber, index) => (
                  <tr
                    key={subscriber.id}
                    className={`hover:bg-foreground/5 ${index > 0 ? "border-t border-outline" : ""}`}
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
                            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-2 border-green-700 dark:border-green-500"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-2 border-gray-400 dark:border-gray-500"
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
                              ? "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-2 border-yellow-700 dark:border-yellow-500 hover:bg-yellow-700 hover:text-white"
                              : "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-2 border-green-700 dark:border-green-500 hover:bg-green-700 hover:text-white"
                          }`}
                        >
                          {updatingId === subscriber.id
                            ? "..."
                            : subscriber.isActive
                              ? "Desactiver"
                              : "Activer"}
                        </button>
                        {confirmDeleteId === subscriber.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteSubscriber(subscriber.id)}
                              disabled={deletingId === subscriber.id}
                              className="px-2 py-1.5 text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {deletingId === subscriber.id ? "..." : "Confirmer"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 text-xs font-bold bg-foreground/10 text-foreground border border-foreground/20 hover:bg-foreground/20 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(subscriber.id)}
                            className="px-3 py-1.5 text-xs font-bold bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-2 border-red-700 dark:border-red-500 hover:bg-red-700 hover:text-white transition-colors"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface border-2 border-outline w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-black text-foreground tracking-tight mb-4">
              Ajouter un abonne
            </h2>

            {addError && (
              <div className="bg-red-50 dark:bg-red-950 border-2 border-red-700 text-red-700 dark:text-red-300 px-3 py-2 text-sm font-semibold mb-4">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubscriber} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground/70 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full px-3 py-2 border-2 border-outline bg-surface text-foreground text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground/70 mb-1">
                  Date d&apos;expiration
                </label>
                <input
                  type="date"
                  value={addExpiresAt || defaultExpiry}
                  onChange={(e) => setAddExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-outline bg-surface text-foreground text-sm focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-foreground/40 mt-1">
                  Par defaut : 1 an a partir d&apos;aujourd&apos;hui
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="add-active"
                  checked={addActive}
                  onChange={(e) => setAddActive(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="add-active" className="text-sm font-semibold text-foreground">
                  Activer immediatement
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-2.5 bg-accent text-white font-bold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {addLoading ? "Creation..." : "Creer l'abonne"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-foreground/10 text-foreground font-bold text-sm border-2 border-outline hover:bg-foreground/20 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}