import assert from "node:assert/strict";
import { test } from "node:test";
import { isCacheablePageRequest, isCacheablePageResponse, pageCacheKey } from "../src/lib/page-cache.ts";

const req = (path: string, headers: Record<string, string> = {}, method = "GET") =>
  isCacheablePageRequest(method, new URL(`https://www.wooplans.com${path}`), new Headers(headers));

test("pages publiques mises en cache, le reste non", () => {
  for (const path of ["/", "/catalogue", "/catalogue?categorie=villa", "/catalogue-villa", "/catalogue-duplex", "/catalogue/villa-v3-037"]) {
    assert.equal(req(path), true, path);
  }
  for (const path of ["/connexion", "/merci", "/plans-personnalises", "/catalogue-premium", "/espace-premium", "/admin", "/api/t", "/catalogue/a/b"]) {
    assert.equal(req(path), false, path);
  }
  assert.equal(req("/", {}, "POST"), false);
});

test("navigation RSC, préchargement et visiteurs connectés : pas de cache", () => {
  assert.equal(req("/catalogue?_rsc=abc"), false);
  assert.equal(req("/catalogue", { rsc: "1" }), false);
  assert.equal(req("/catalogue", { "next-router-prefetch": "1" }), false);
  assert.equal(req("/", { cookie: "wp_vid=x; wp_member=tok" }), false);
  assert.equal(req("/", { cookie: "wp_admin=tok" }), false);
  assert.equal(req("/", { cookie: "wp_vid=x; wp_variant=b" }), true);
});

test("clé sans paramètres de suivi, paramètres triés", () => {
  const key = (path: string) => pageCacheKey(new URL(`https://www.wooplans.com${path}`));
  assert.equal(key("/catalogue/villa-v3-037?fbclid=IwAR1&utm_source=facebook"), "https://www.wooplans.com/catalogue/villa-v3-037");
  assert.equal(key("/catalogue?chambres=4&categorie=villa&utm_campaign=x"), key("/catalogue?categorie=villa&chambres=4"));
  assert.notEqual(key("/catalogue?categorie=villa"), key("/catalogue?categorie=duplex"));
});

test("seules les pages HTML 200 sans cookie sont partagées", () => {
  assert.equal(isCacheablePageResponse(200, new Headers({ "content-type": "text/html; charset=utf-8" })), true);
  assert.equal(isCacheablePageResponse(404, new Headers({ "content-type": "text/html" })), false);
  assert.equal(isCacheablePageResponse(200, new Headers({ "content-type": "text/x-component" })), false);
  assert.equal(isCacheablePageResponse(200, new Headers({ "content-type": "text/html", "set-cookie": "a=b" })), false);
});
