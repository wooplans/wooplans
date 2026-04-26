"use client";

import {
  buildCostEstimate,
  isPlanCategory,
  type CostEstimate,
} from "@/lib/cost-estimate";
import { useState } from "react";

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

function EstimateTableMarkup({
  estimate,
  planName,
}: {
  estimate: CostEstimate;
  planName: string;
}) {
  const categoryLabel = estimate.category === "duplex" ? "Duplex" : "Villa";

  return (
    <div className="w-full bg-white text-black">
      <table className="w-full table-fixed border-2 border-black bg-white text-[7px] leading-tight sm:text-xs md:text-sm">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[44%]" />
          <col className="w-[24%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead>
          <tr>
            <th
              colSpan={4}
              className="border-b-2 border-black bg-gray-100 px-1.5 py-2 text-center text-[9px] font-black text-black sm:px-4 sm:py-3 sm:text-base"
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
                <td className="border-r border-black px-1 py-1.5 text-center font-bold text-black sm:px-2 sm:py-3">
                  {line.code}
                </td>
                <td className="break-words border-r border-black px-1 py-1.5 uppercase tracking-wide text-foreground/70 sm:px-2 sm:py-3">
                  {line.label}
                </td>
                <td className="border-r border-black px-1 py-1.5 text-right font-bold text-black sm:px-3 sm:py-3">
                  {formatAmount(line.amount)}
                </td>
                {group && (
                  <td
                    rowSpan={getGroupRowSpan(estimate, group.startCode, group.endCode)}
                    className="px-1 py-1.5 text-center align-middle font-bold text-black sm:px-3 sm:py-3"
                  >
                    <div>{group.label}</div>
                    <div className="mt-2 sm:mt-4">{formatAmount(group.amount)}</div>
                  </td>
                )}
              </tr>
            );
          })}
          <tr className="bg-primary/5">
            <td colSpan={2} className="border-r-2 border-black px-1.5 py-2 text-center font-black text-black sm:px-3 sm:py-4">
              TOTAL CLE EN MAIN
            </td>
            <td className="border-r-2 border-black px-1 py-2 text-right font-black text-black sm:px-3 sm:py-4">
              {formatAmount(estimate.total)}
            </td>
            <td />
          </tr>
        </tbody>
      </table>

      <div className="mt-4 space-y-1.5 text-[7px] leading-snug text-black sm:mt-8 sm:space-y-3 sm:text-xs sm:leading-relaxed">
        <p className="font-bold text-secondary">
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
  );
}

export function CostEstimateTable({
  planName,
  category,
  surface,
  amountPerSquareMeter,
}: CostEstimateTableProps) {
  const [zoomOpen, setZoomOpen] = useState(false);

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

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Agrandir le devis estimatif"
        className="w-full cursor-zoom-in"
        onClick={() => setZoomOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setZoomOpen(true);
          }
        }}
      >
        <EstimateTableMarkup estimate={estimate} planName={planName} />
      </div>

      {zoomOpen && (
        <div
          className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/95 p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 text-3xl leading-none text-white/80 hover:text-white"
            onClick={() => setZoomOpen(false)}
            aria-label="Fermer"
          >
            &times;
          </button>
          <div
            className="max-h-[90vh] w-[94vw] max-w-5xl cursor-default overflow-auto bg-surface p-3 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <EstimateTableMarkup estimate={estimate} planName={planName} />
          </div>
        </div>
      )}
    </>
  );
}
