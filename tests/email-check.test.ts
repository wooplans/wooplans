import assert from "node:assert/strict";
import { test } from "node:test";
import { domainAcceptsMail, suggestEmail } from "../src/lib/email-check.ts";

test("fautes de frappe courantes : correction proposée", () => {
  assert.equal(suggestEmail("jean@gmial.com"), "jean@gmail.com");
  assert.equal(suggestEmail("jean@gmail.con"), "jean@gmail.com");
  assert.equal(suggestEmail("jean@yaho.fr"), "jean@yahoo.fr");
  assert.equal(suggestEmail("jean@hotmial.com"), "jean@hotmail.com");
  assert.equal(suggestEmail("Jean.Dupont@Gmial.com"), "Jean.Dupont@gmail.com");
});

test("domaine proche d'un domaine courant (une lettre de différence)", () => {
  assert.equal(suggestEmail("a@gmaill.com"), "a@gmail.com");
  assert.equal(suggestEmail("a@outlookk.com"), "a@outlook.com");
});

test("domaines corrects ou inconnus : aucune correction", () => {
  assert.equal(suggestEmail("a@gmail.com"), null);
  assert.equal(suggestEmail("a@yahoo.fr"), null);
  assert.equal(suggestEmail("a@entreprise-btp.ci"), null);
  assert.equal(suggestEmail("a@wooplans.com"), null);
  assert.equal(suggestEmail("pas-un-email"), null);
});

const reply = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

test("MX : domaine inexistant refusé, domaine avec MX accepté, erreur réseau tolérée", async () => {
  assert.equal(await domainAcceptsMail("domaine-inexistant.xyz", reply({ Status: 3 })), false);
  assert.equal(await domainAcceptsMail("gmail.com", reply({ Status: 0, Answer: [{ type: 15, data: "5 gmail-smtp-in.l.google.com." }] })), true);
  assert.equal(await domainAcceptsMail("sans-mail.com", reply({ Status: 0, Answer: [{ type: 15, data: "0 ." }] })), false);
  assert.equal(await domainAcceptsMail("x.com", reply({}, false)), true);
  assert.equal(await domainAcceptsMail("x.com", (async () => { throw new Error("réseau"); }) as unknown as typeof fetch), true);
});
