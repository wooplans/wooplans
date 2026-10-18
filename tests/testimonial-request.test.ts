import assert from "node:assert/strict";
import { test } from "node:test";
import { firstName, signTestimonialToken, sniffMediaType, testimonialRequestMessage, verifyTestimonialToken } from "../src/lib/testimonial-request.ts";

const SECRET = "un-secret-de-test-suffisamment-long";
const bytes = (...parts: (string | number[])[]) =>
  Uint8Array.from(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

test("lien personnel : signé, vérifié, refusé s'il est modifié", async () => {
  const token = await signTestimonialToken(SECRET, "abc_DEF-123");
  assert.equal(await verifyTestimonialToken(SECRET, token), "abc_DEF-123");
  assert.equal(await verifyTestimonialToken("un-autre-secret-assez-long", token), null);
  const [, sig] = token.split(".");
  assert.equal(await verifyTestimonialToken(SECRET, `autre-membre.${sig}`), null);
  assert.equal(await verifyTestimonialToken(SECRET, `${token}x`), null);
  assert.equal(await verifyTestimonialToken(SECRET, "pas-de-signature"), null);
});

test("prénom extrait du nom complet", () => {
  assert.equal(firstName("M. Francis Bilong"), "Francis");
  assert.equal(firstName("  IBRAHIM sako"), "Ibrahim");
  assert.equal(firstName(""), "");
  assert.equal(firstName(null), "");
});

test("message WhatsApp : prénom, lien, variante de relance", () => {
  const first = testimonialRequestMessage({ name: "Mme Awa Diallo", link: "https://x.test/temoignage#t" });
  assert.match(first, /^Bonjour Awa/);
  assert.ok(first.includes("https://x.test/temoignage#t"));
  const relaunch = testimonialRequestMessage({ name: "", link: "L", relaunch: true });
  assert.match(relaunch, /^Bonjour 👋, petit rappel/);
});

test("type réel des enregistrements", () => {
  assert.deepEqual(sniffMediaType(bytes([0x1a, 0x45, 0xdf, 0xa3]), "video"), { contentType: "video/webm", ext: "webm" });
  assert.deepEqual(sniffMediaType(bytes([0x1a, 0x45, 0xdf, 0xa3]), "audio"), { contentType: "audio/webm", ext: "webm" });
  assert.deepEqual(sniffMediaType(bytes([0, 0, 0, 0x20], "ftypisom"), "video"), { contentType: "video/mp4", ext: "mp4" });
  assert.deepEqual(sniffMediaType(bytes([0, 0, 0, 0x20], "ftypiso5"), "audio"), { contentType: "audio/mp4", ext: "m4a" });
  assert.deepEqual(sniffMediaType(bytes([0, 0, 0, 0x14], "ftypqt  "), "video"), { contentType: "video/quicktime", ext: "mov" });
  assert.deepEqual(sniffMediaType(bytes("OggS"), "audio"), { contentType: "audio/ogg", ext: "ogg" });
  assert.deepEqual(sniffMediaType(bytes("ID3"), "audio"), { contentType: "audio/mpeg", ext: "mp3" });
  assert.equal(sniffMediaType(bytes([0x89, 0x50, 0x4e, 0x47]), "video"), null);
  assert.equal(sniffMediaType(bytes("%PDF-"), "audio"), null);
});
