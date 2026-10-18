"use client";

import { useEffect, useRef, useState } from "react";
import { budgetRange, computeEstimate, computeLand, isStanding, STANDING_LABELS, type CostSettings } from "@/lib/plan-pricing";

const fcfa = (v: number) => `${new Intl.NumberFormat("fr-FR").format(v).replace(/[  ]/g, " ")} FCFA`;
const metres = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} m`;

type Inputs = { category: string; surface: number; standing: string; width: number; depth: number };

function readInputs(form: HTMLFormElement): Inputs {
  const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";
  const num = (name: string) => Number(value(name).replace(/[\s  ]/g, "").replace(",", ".")) || 0;
  return { category: value("category"), surface: Math.round(num("surfaceTotal")), standing: value("standing"), width: num("buildingWidth"), depth: num("buildingDepth") };
}

/** Terrain et devis calculés, mis à jour pendant la saisie ; les mêmes formules sont appliquées à l'enregistrement. */
export function DerivedValuesPreview({ cost }: { cost: CostSettings }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inputs, setInputs] = useState<Inputs | null>(null);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const update = () => setInputs(readInputs(form));
    update();
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, []);

  const land = inputs ? computeLand(inputs.width, inputs.depth) : null;
  const standing = inputs && isStanding(inputs.standing) ? inputs.standing : "standard";
  const estimate = inputs ? computeEstimate(inputs.category, inputs.surface, standing, cost) : null;
  const automatic = inputs?.category === "villa" || inputs?.category === "duplex";

  return (
    <div ref={ref} className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm sm:col-span-2 lg:col-span-4">
      <p className="font-semibold text-primary">Calculé automatiquement à l&apos;enregistrement</p>
      <ul className="mt-2 space-y-1">
        <li>
          <span className="text-muted">Terrain nécessaire : </span>
          {land ? (
            <strong>
              {metres(land.landWidth)} × {metres(land.landDepth)} → {land.landArea} m²
            </strong>
          ) : (
            <span>saisissez la largeur et la profondeur du bâtiment (sinon, les champs terrain saisis sont conservés)</span>
          )}
        </li>
        <li>
          <span className="text-muted">Devis : </span>
          {estimate ? (
            <>
              <strong>{fcfa(estimate.total)}</strong>
              <span className="text-muted">
                {" "}
                ({inputs!.surface} m² × {fcfa(cost.ratePerM2[inputs!.category as "villa" | "duplex"])}/m² × {String(cost.standingCoef[standing]).replace(".", ",")}{" "}
                {STANDING_LABELS[standing].toLowerCase()}) · vitrine : {fcfa(budgetRange(estimate.total).budgetMin)} – {fcfa(budgetRange(estimate.total).budgetMax)}
              </span>
            </>
          ) : automatic ? (
            <span>saisissez la surface totale</span>
          ) : (
            <span>manuel pour les immeubles et « autre » (lots et total ci-dessous)</span>
          )}
        </li>
      </ul>
    </div>
  );
}
