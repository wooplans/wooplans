import assert from "node:assert/strict";
import { test } from "node:test";
import { mediaSrcSet, mediaUrl, parseMediaWidth, responsiveImage } from "../src/lib/media-size.ts";

test("versions réduites : seules les largeurs prévues sont acceptées", () => {
  assert.equal(parseMediaWidth("480"), 480);
  assert.equal(parseMediaWidth("160"), 160);
  assert.equal(parseMediaWidth("500"), null);
  assert.equal(parseMediaWidth("480px"), null);
  assert.equal(parseMediaWidth("-480"), null);
  assert.equal(parseMediaWidth(""), null);
  assert.equal(parseMediaWidth(null), null);
});

test("versions réduites : images /media relatives ou sur le domaine du site", () => {
  assert.equal(mediaUrl("/media/public/v3-017/a.webp", 480), "/media/public/v3-017/a.webp?w=480");
  assert.equal(mediaUrl("https://www.wooplans.com/media/upload-1.webp", 320), "/media/upload-1.webp?w=320");
  assert.equal(mediaUrl("https://exemple.com/a.webp", 480), "https://exemple.com/a.webp");
  assert.equal(mediaUrl("/media/a.webp?x=1", 480), "/media/a.webp?x=1");
});

test("versions réduites : srcset et attributs d'image", () => {
  assert.equal(mediaSrcSet("/media/a.webp", [320, 640]), "/media/a.webp?w=320 320w, /media/a.webp?w=640 640w");
  assert.equal(mediaSrcSet("/images/hero.webp", [320]), undefined);
  assert.deepEqual(responsiveImage("/media/a.webp", [480, 828], "100vw"), {
    src: "/media/a.webp?w=480",
    srcSet: "/media/a.webp?w=480 480w, /media/a.webp?w=828 828w",
    sizes: "100vw",
  });
  assert.deepEqual(responsiveImage("https://exemple.com/a.webp", [480], "100vw"), { src: "https://exemple.com/a.webp" });
});
