import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { BADGE_SAMPLE, detectBadge, isBadgePixel } from "../src/lib/render-badge.ts";

// Zones bas-gauche réelles (160 × 44, RGB brut) : V3-037 (propre), V3-009 (grande pastille verte), V4-006 (petite pastille à icône).
const sample = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/${name}.rgb`, import.meta.url)));

test("pastille « Visitez wooplans.com » : les deux styles sont détectés", () => {
  assert.equal(detectBadge(sample("render-badge-green")), true);
  assert.equal(detectBadge(sample("render-badge-teal")), true);
});

test("rendu sans pastille (pelouse au premier plan) : false", () => {
  assert.equal(detectBadge(sample("render-clean")), false);
});

test("couleurs : pastilles oui, herbe et blanc non", () => {
  assert.ok(isBadgePixel(30, 122, 57));
  assert.ok(isBadgePixel(15, 85, 85));
  assert.ok(!isBadgePixel(70, 120, 30));
  assert.ok(!isBadgePixel(240, 240, 240));
});

test("pixels illisibles ou zone ambiguë : null (jamais supposé)", () => {
  assert.equal(detectBadge(new Uint8Array(10)), null);
  const { width, height } = BADGE_SAMPLE;
  const rgb = new Uint8Array(width * height * 3).fill(200);
  // 5 % de pixels « pastille » épars : ni propre ni filigrané avec certitude
  for (let i = 0; i < width * height; i += 20) rgb.set([30, 122, 57], i * 3);
  assert.equal(detectBadge(rgb), null);
});
