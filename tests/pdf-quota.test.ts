import assert from "node:assert/strict";
import { test } from "node:test";
import { DAY_MS, evaluatePdfQuota, quotaLimits, type PdfDownloadRow } from "../src/lib/pdf-quota-rules.ts";

const now = new Date("2026-10-16T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const limits = { perDay: 3, perMonth: 10, maxPerDay: 15 };
const rows = (slugs: string[], at: (i: number) => Date): PdfDownloadRow[] => slugs.map((planSlug, i) => ({ planSlug, createdAt: at(i) }));

test("quota : nouvelle fiche autorisée tant que les limites ne sont pas atteintes", () => {
  const q = evaluatePdfQuota(rows(["a", "b"], () => ago(3600_000)), "c", limits, now);
  assert.equal(q.allowed, true);
  assert.equal(q.remainingDay, 1);
  assert.equal(q.remainingMonth, 8);
});

test("quota journalier : 4e modèle différent en 24 h refusé, re-téléchargement accepté", () => {
  const history = rows(["a", "b", "c"], (i) => ago((i + 1) * 3600_000));
  const blocked = evaluatePdfQuota(history, "d", limits, now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "day");
  // La plus ancienne des 3 (il y a 3 h) libère une place dans 21 h.
  assert.equal(blocked.retryAt?.getTime(), ago(3 * 3600_000).getTime() + DAY_MS);
  const again = evaluatePdfQuota(history, "b", limits, now);
  assert.equal(again.allowed, true);
  assert.equal(again.alreadyOwned, true);
});

test("quota mensuel : 10 modèles différents sur 30 jours", () => {
  const history = rows([..."abcdefghij"], (i) => ago((i + 2) * DAY_MS));
  const q = evaluatePdfQuota(history, "k", limits, now);
  assert.equal(q.allowed, false);
  assert.equal(q.reason, "month");
  assert.equal(q.remainingMonth, 0);
  // Un téléchargement de plus de 30 jours ne compte plus.
  const old = evaluatePdfQuota(rows([..."abcdefghij"], (i) => ago((i + 25) * DAY_MS)), "k", limits, now);
  assert.equal(old.allowed, true);
});

test("quota : seul le premier téléchargement d'un modèle compte", () => {
  const history = rows(["a", "a", "a", "a", "b"], (i) => ago((i + 1) * 60_000));
  const q = evaluatePdfQuota(history, "c", limits, now);
  assert.equal(q.allowed, true);
  assert.equal(q.remainingDay, 1);
  assert.deepEqual(q.ownedSlugs.sort(), ["a", "b"]);
});

test("garde-fou : trop de téléchargements en 24 h, même déjà obtenus", () => {
  const history = rows(Array(15).fill("a"), (i) => ago((i + 1) * 60_000));
  const q = evaluatePdfQuota(history, "a", limits, now);
  assert.equal(q.allowed, false);
  assert.equal(q.reason, "burst");
});

test("quotaLimits : valeurs d'environnement, défauts si invalides", () => {
  assert.deepEqual(quotaLimits({ PDF_QUOTA_DAY: "5", PDF_QUOTA_MONTH: "x" }), { perDay: 5, perMonth: 10, maxPerDay: 15 });
});
