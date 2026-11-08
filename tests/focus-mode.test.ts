import assert from "node:assert/strict";
import { test } from "node:test";
import { FOCUS_INLINE_SCRIPT, isFocusCampaign } from "../src/lib/focus-mode.ts";

test("mode sans distraction : seulement les campagnes plan_devis", () => {
  assert.equal(isFocusCampaign("?utm_source=facebook&utm_medium=paid&utm_campaign=plan_devis_14900"), true);
  assert.equal(isFocusCampaign("?utm_campaign=PLAN_DEVIS_test"), true);
  assert.equal(isFocusCampaign("?utm_campaign=ventes_catalogue"), false);
  assert.equal(isFocusCampaign("?utm_campaign=cadeau_d4-034"), false);
  assert.equal(isFocusCampaign(""), false);
});

test("le script en ligne suit la même règle et pose html[data-focus]", () => {
  for (const [search, expected] of [
    ["?utm_campaign=plan_devis_14900", "1"],
    ["?utm_campaign=ventes_catalogue", null],
  ] as const) {
    const store = new Map<string, string>();
    const attrs = new Map<string, string>();
    const sandbox = {
      location: { search },
      URLSearchParams,
      sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
      document: { documentElement: { setAttribute: (k: string, v: string) => void attrs.set(k, v) } },
    };
    new Function(...Object.keys(sandbox), FOCUS_INLINE_SCRIPT)(...Object.values(sandbox));
    assert.equal(attrs.get("data-focus") ?? null, expected);
  }
});
