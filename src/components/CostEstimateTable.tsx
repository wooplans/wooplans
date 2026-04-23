import {
  buildCostEstimate,
  isPlanCategory,
  type CostEstimate,
} from "@/lib/cost-estimate";

type CostEstimateTableProps = {
  planName: string;
  category: string;
  surface: number;
  amountPerSquareMeter: number | null;
};

function formatAmount(value: number) {
  return value.toLocaleString("fr-FR");
}

function getGroupForLine(estimate: CostEstimate, code: string) {
  return estimate.groups.find((group) => group.startCode === code);
}

function getGroupRowSpan(estimate: CostEstimate, startCode: string, endCode: string) {
  const startIndex = estimate.lines.findIndex((line) => line.code === startCode);
  const endIndex = estimate.lines.findIndex((line) => line.code === endCode);
  return startIndex >= 0 && endIndex >= startIndex ? endIndex - startIndex + 1 : 1;
}

export function CostEstimateTable({
  planName,
  category,
  surface,
  amountPerSquareMeter,
}: CostEstimateTableProps) {
  if (!amountPerSquareMeter || !isPlanCategory(category)) {
    return (
      <div className="bg-surface p-6">
        <p className="text-foreground/60">
          Le devis estimatif n&apos;est pas encore configure pour cette categorie.
        </p>
      </div>
    );
  }

  const estimate = buildCostEstimate(category, surface, amountPerSquareMeter);
  const categoryLabel = category === "duplex" ? "Duplex" : "Villa";

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <table className="w-full border-2 border-black bg-white text-sm">
          <thead>
            <tr>
              <th
                colSpan={4}
                className="border-b-2 border-black bg-gray-100 px-4 py-3 text-center text-base font-black text-black"
              >
                Devis {categoryLabel} {planName} ( en Fcfa )
              </th>
            </tr>
          </thead>
          <tbody>
            {estimate.lines.map((line) => {
              const group = getGroupForLine(estimate, line.code);

              return (
                <tr key={line.code} className="border-b border-black last:border-b-0">
                  <td className="w-16 border-r border-black px-2 py-3 text-center font-bold text-black">
                    {line.code}
                  </td>
                  <td className="border-r border-black px-2 py-3 uppercase tracking-wide text-foreground/70">
                    {line.label}
                  </td>
                  <td className="w-32 border-r border-black px-3 py-3 text-right font-bold text-black">
                    {formatAmount(line.amount)}
                  </td>
                  {group && (
                    <td
                      rowSpan={getGroupRowSpan(estimate, group.startCode, group.endCode)}
                      className="w-32 px-3 py-3 text-center align-middle font-bold text-black"
                    >
                      <div>{group.label}</div>
                      <div className="mt-4">{formatAmount(group.amount)}</div>
                    </td>
                  )}
                </tr>
              );
            })}
            <tr className="bg-yellow-50">
              <td colSpan={2} className="border-r-2 border-black px-3 py-4 text-center font-black text-black">
                TOTAL CLE EN MAIN
              </td>
              <td className="border-r-2 border-black px-3 py-4 text-right font-black text-black">
                {formatAmount(estimate.total)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>

        <div className="mt-8 space-y-3 text-xs leading-relaxed text-black">
          <p className="font-bold text-red-600">
            NB : les couts de construction de votre maison dependent de plusieurs facteurs
          </p>
          <p>
            1) Le type de sol sur lequel vous voulez construire peut rendre la fondation plus couteuse.
          </p>
          <p>
            2) La qualite des techniciens employes peut influencer le cout de la main d&apos;oeuvre.
          </p>
          <p>
            3) La qualite des materiaux de finition depend du standing final et de vos moyens.
          </p>
        </div>
      </div>
    </div>
  );
}
