import assert from "node:assert/strict";
import { test } from "node:test";
import { shareImageKey, shareImagePath } from "../src/lib/share-image.ts";

test("vignette de partage : adresse /og/<clé>.jpg pour une couverture /media", () => {
  assert.equal(shareImagePath("/media/public/d5-012/1793-abc.webp"), "/og/public/d5-012/1793-abc.webp.jpg");
  assert.equal(shareImagePath("/media/upload-1777.webp"), "/og/upload-1777.webp.jpg");
  assert.equal(shareImagePath("https://exemple.com/a.webp"), null);
  assert.equal(shareImagePath(null), null);
});

test("vignette de partage : la clé R2 d'origine est retrouvée, même pour un JPEG", () => {
  assert.equal(shareImageKey("public/d4-026/1792-o.jpg.jpg"), "public/d4-026/1792-o.jpg");
  assert.equal(shareImageKey("public/a.webp.jpg"), "public/a.webp");
  assert.equal(shareImageKey("public/a.webp"), null);
});
