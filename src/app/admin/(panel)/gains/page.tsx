import Link from "next/link";
import { PageTitle } from "@/components/admin/ui";
import { formatFcfa } from "@/lib/plans";
import { COSTS, profitFor, type Period } from "@/lib/profit";
import { removeExpense, saveExpense } from "./actions";

export const dynamic = "force-dynamic";

const PERIODS: { id: Period; label: string }[] = [
  { id: "jour", label: "Aujourd'hui" },
  { id: "7j", label: "7 jours" },
  { id: "mois", label: "Ce mois" },
  { id: "30j", label: "30 jours" },
];

function Line({ label, value, strong = false, minus = false }: { label: string; value: number; strong?: boolean; minus?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? "border-t border-outline pt-2 text-base font-bold" : "text-sm"}`}>
      <span>{label}</span>
      <span className={strong ? (value >= 0 ? "text-emerald-700" : "text-red-700") : ""}>
        {minus && value ? "− " : ""}
        {formatFcfa(value)}
      </span>
    </div>
  );
}

/**
 * Gain réel (décision de Tao, 22 nov. 2026) : ventes − Chariow 10 % − pub Meta (campagnes WooPlans) − abonnements au prorata
 * − dépenses saisies (crédits ElevenLabs, Poyo…). 1 USD = 750 FCFA. La pub est relevée chaque dimanche à 00:00.
 */
export default async function GainsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const requested = (await searchParams).p;
  const period = (PERIODS.find((x) => x.id === requested)?.id ?? "7j") as Period;
  const r = await profitFor(period);
  const today = new Date().toISOString().slice(0, 10);
  const spendLate = r.adSpendUntil && r.adSpendUntil < new Date(r.end.getTime() - 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="max-w-4xl">
      <PageTitle title="Gain réel" subtitle={`Ventes − Chariow ${Math.round(COSTS.chariowRate * 100)} % − pub Meta − abonnements − dépenses · 1 $ = ${COSTS.usdToFcfa} FCFA`} />
      <nav className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link key={p.id} href={`/admin/gains?p=${p.id}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${p.id === period ? "bg-primary text-white" : "bg-white ring-1 ring-outline"}`}>
            {p.label}
          </Link>
        ))}
      </nav>

      {spendLate ? (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm">
          Pub Meta relevée jusqu&apos;au {r.adSpendUntil} (relevé chaque dimanche à minuit) : les jours suivants ne comptent pas encore la pub.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-outline bg-white p-4">
          <h2 className="font-semibold">Résultat</h2>
          <Line label="Ventes" value={r.revenue} />
          <Line label={`Commission Chariow (${Math.round(COSTS.chariowRate * 100)} %)`} value={r.chariow} minus />
          <Line label="Pub Meta" value={r.ads} minus />
          {r.fixed.map((f) => (
            <Line key={f.id} label={f.label} value={f.amount} minus />
          ))}
          <Line label="Dépenses saisies (crédits…)" value={r.expensesTotal} minus />
          <Line label="Gain réel" value={r.profit} strong />
          <p className="mt-2 text-xs text-muted">
            {r.roas !== null ? `Chaque franc de pub a rapporté ${r.roas.toFixed(2).replace(".", ",")} F de ventes. ` : ""}
            Catalogue vendu à des acheteurs de l&apos;extrait ou du guide : {r.catalogueFromLeads}.
          </p>
        </section>

        <section className="rounded-2xl border border-outline bg-white p-4">
          <h2 className="font-semibold">Par produit</h2>
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1">Produit</th>
                <th className="py-1 text-right">Ventes</th>
                <th className="py-1 text-right">Pub</th>
                <th className="py-1 text-right">Marge</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => (
                <tr key={row.product} className="border-t border-outline">
                  <td className="py-1.5">
                    {row.label} <span className="text-xs text-muted">({row.count})</span>
                  </td>
                  <td className="py-1.5 text-right">{formatFcfa(row.revenue)}</td>
                  <td className="py-1.5 text-right">{formatFcfa(row.ads)}</td>
                  <td className={`py-1.5 text-right font-semibold ${row.margin >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatFcfa(row.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">Marge = ventes − Chariow − pub du produit (avant abonnements et dépenses).</p>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-outline bg-white p-4">
        <h2 className="font-semibold">Dépenses saisies</h2>
        <p className="text-xs text-muted">Crédits ElevenLabs, Poyo, ou toute autre dépense ponctuelle. Les abonnements fixes sont comptés automatiquement.</p>
        <form action={saveExpense} className="mt-3 grid gap-2 text-sm sm:grid-cols-[auto_auto_1fr_auto_auto_auto]">
          <input type="date" name="date" defaultValue={today} className="rounded border border-outline px-2 py-1.5" required />
          <select name="category" className="rounded border border-outline px-2 py-1.5">
            <option value="elevenlabs">ElevenLabs</option>
            <option value="poyo">Poyo</option>
            <option value="autre">Autre</option>
          </select>
          <input name="label" placeholder="Détail (ex. recharge 22 nov.)" className="rounded border border-outline px-2 py-1.5" />
          <input name="amount" inputMode="decimal" placeholder="Montant" className="w-28 rounded border border-outline px-2 py-1.5" required />
          <select name="currency" className="rounded border border-outline px-2 py-1.5">
            <option value="USD">$</option>
            <option value="XAF">FCFA</option>
          </select>
          <button className="rounded bg-primary px-3 py-1.5 font-semibold text-white">Ajouter</button>
        </form>
        {r.expenses.length ? (
          <ul className="mt-3 divide-y divide-outline/60 text-sm">
            {r.expenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                <span>
                  {e.date} · {e.label} · {formatFcfa(e.amount)}
                  {e.currency === "USD" ? ` (${e.originalAmount} $)` : ""}
                </span>
                <form action={removeExpense}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-xs text-red-700 hover:underline">Supprimer</button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
