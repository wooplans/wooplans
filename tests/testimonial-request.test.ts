import assert from "node:assert/strict";
import { test } from "node:test";
import { firstName, testimonialBroadcastMessage, testimonialRequestMessage } from "../src/lib/testimonial-request.ts";

test("prénom extrait du nom complet", () => {
  assert.equal(firstName("M. Francis Bilong"), "Francis");
  assert.equal(firstName("  IBRAHIM sako"), "Ibrahim");
  assert.equal(firstName(""), "");
  assert.equal(firstName(null), "");
});

test("message WhatsApp : prénom, 2 minutes, lien, variante de relance", () => {
  const first = testimonialRequestMessage({ name: "Mme Awa Diallo", link: "https://x.test/temoignage" });
  assert.match(first, /^Bonjour Awa/);
  assert.match(first, /2 petites minutes/);
  assert.ok(first.includes("https://x.test/temoignage"));
  const relaunch = testimonialRequestMessage({ name: "", link: "L", relaunch: true });
  assert.match(relaunch, /^Bonjour 👋, petit rappel/);
  assert.ok(testimonialBroadcastMessage("L").includes("L"));
});
