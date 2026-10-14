import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test, after } from "node:test";
import { verifyChariowSignature } from "../src/lib/chariow-signature";
import { parseFinancials } from "../src/lib/crm";
import { classifyFunnelSource } from "../src/lib/funnel";
import { createSessionToken, verifySessionToken } from "../src/lib/auth";
import { POST as webhook } from "../src/app/api/webhooks/chariow/route";
import { POST as telemetry } from '../src/app/api/funnel/event/route';
import { POST as login } from "../src/app/api/auth/login/route";
import { GET as getResource } from "../src/app/api/premium/resources/[id]/route";
import { GET as getUpload } from "../src/app/api/uploads/[key]/route";
import PlanPage from "../src/app/(public)/plans/[slug]/page";
import PlansPage from "../src/app/(public)/plans/page";
import { getPrisma } from "../src/lib/prisma";

process.env.CHARIOW_PULSE_SECRET = "whsec_test_only";
process.env.CHARIOW_PRODUCT_ID = "prd_test";
process.env.AUTH_SECRET = "integration-test-only-secret";
const raw = JSON.stringify({
  event: "successful.sale",
  product: { id: "prd_test", name: "Catalogue" },
  sale: {
    id: "sal_test",
    status: "completed",
    amount: { value: 39000, currency: "XAF" },
  },
  customer: { id: "cus_test", email: "Buyer@Example.com" },
  license: { key: "license-test" },
});
function delivery(body = raw, signature?: string) {
  return new Request("https://wooplans.com/api/webhooks/chariow", {
    method: "POST",
    headers: {
      "x-chariow-signature":
        signature ??
        "sha256=" +
          createHmac("sha256", process.env.CHARIOW_PULSE_SECRET!)
            .update(body)
            .digest("hex"),
      "x-pulse-delivery-id": "delivery_test",
    },
    body,
  });
}

test("Signature covers exact raw bytes and rejects altered or missing signatures", async () => {
  const bytes = new TextEncoder().encode(raw);
  const signature =
    "sha256=" +
    createHmac("sha256", "whsec_test_only").update(bytes).digest("hex");
  assert.equal(
    await verifyChariowSignature(bytes, signature, "whsec_test_only"),
    true,
  );
  assert.equal(
    await verifyChariowSignature(
      new TextEncoder().encode(raw + " "),
      signature,
      "whsec_test_only",
    ),
    false,
  );
  assert.equal(
    await verifyChariowSignature(bytes, null, "whsec_test_only"),
    false,
  );
  assert.equal(
    (await webhook(delivery(raw, "sha256=" + "0".repeat(64)))).status,
    401,
  );
  assert.equal(await getPrisma().subscriber.count(), 0);
});
test("Signed payment activates lifetime access once and keeps credentials stable on retries", async () => {
  assert.equal((await webhook(delivery())).status, 200);
  const first = await getPrisma().subscriber.findUniqueOrThrow({
    where: { email: "buyer@example.com" },
  });
  assert.equal(first.expiresAt, null);
  assert.equal(first.isActive, true);
  assert.equal(first.chariowCustomerId, "cus_test");
  assert.equal((await webhook(delivery())).status, 200);
  const second = await getPrisma().subscriber.findUniqueOrThrow({
    where: { email: first.email },
  });
  assert.equal(second.premiumCode, first.premiumCode);
  assert.equal(await getPrisma().subscriber.count(), 1);
  assert.equal(await getPrisma().funnelSale.count(), 1);
  assert.equal(await getPrisma().webhookReceipt.count(), 2);
});
test("Signed notification for another product cannot activate access", async () => {
  const body = raw
    .replace("prd_test", "prd_other")
    .replace("Buyer@Example.com", "other@example.com");
  assert.equal((await webhook(delivery(body))).status, 200);
  assert.equal(await getPrisma().subscriber.count(), 1);
});
test("Admin email alone does not authenticate", async () => {
  const req = new Request("https://wooplans.com/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ mode: "admin", email: "admin@wooplans.com" }),
  });
  assert.equal((await login(req)).status, 401);
});
test("Forged/malformed session tokens are rejected", async () => {
  assert.equal(await verifySessionToken("abc.%%%"), null);
  const token = await createSessionToken({
    id: "test",
    email: "test@example.com",
    role: "subscriber",
    isActive: true,
  });
  assert.ok(await verifySessionToken(token));
  assert.equal(await verifySessionToken(token + "a"), null);
});
test("Credit and offline receipts cannot exceed the agreed amount", () => {
  assert.deepEqual(
    parseFinancials({
      grossPrice: 200000,
      catalogueCredit: 39000,
      paidAmount: 80000,
    }),
    { grossPrice: 200000, catalogueCredit: 39000, paidAmount: 80000 },
  );
  assert.throws(() =>
    parseFinancials({ grossPrice: 30000, catalogueCredit: 39000 }),
  );
  assert.throws(() =>
    parseFinancials({
      grossPrice: 200000,
      catalogueCredit: 39000,
      paidAmount: 200000,
    }),
  );
  assert.throws(() => parseFinancials({ grossPrice: -1 }));
});
test("Facebook organic links are not counted as paid advertising", () => {
  assert.equal(
    classifyFunnelSource({
      pathname: "/abonnement",
      searchParams: new URLSearchParams(
        "utm_source=facebook&utm_medium=social&fbclid=x",
      ),
    }).source,
    "organic",
  );
  assert.equal(
    classifyFunnelSource({
      pathname: "/abonnement",
      searchParams: new URLSearchParams(
        "utm_source=facebook&utm_medium=paid_social",
      ),
    }).source,
    "facebook_ads",
  );
});
test("Anonymous responses exclude private documents and private downloads reject access", async () => {
  delete process.env.TEST_SESSION_TOKEN;
  await getPrisma().plan.create({
    data: {
      slug: "villa-test",
      name: "Villa test",
      category: "villa",
      description: "Test",
      surface: 100,
      bedrooms: 3,
      bathrooms: 2,
      floors: 1,
      rooms: "[]",
      images: "[]",
      thumbnail: "/public.jpg",
      published: true,
      distributionPlans: '["/api/uploads/private-test.pdf"]',
      distributionPlanUrl: "",
      estimatedCostImage: "/api/uploads/private-cost.pdf",
    },
  });
  const serialize = (element: unknown) =>
    JSON.stringify(element, (key, value) =>
      key === "type" || key === "_owner" ? undefined : value,
    );
  const detail = serialize(await PlanPage({ params: { slug: "villa-test" } }));
  const list = serialize(await PlansPage({ searchParams: {} }));
  assert.equal(detail.includes("private-test.pdf"), false);
  assert.equal(detail.includes("private-cost.pdf"), false);
  assert.equal(list.includes("private-test.pdf"), false);
  assert.equal(
    (
      await getResource(
        new Request("https://wooplans.com/api/premium/resources/catalogue"),
        { params: { id: "catalogue" } },
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await getUpload(
        new Request("https://wooplans.com/api/uploads/private-test.pdf"),
        { params: { key: "private-test.pdf" } },
      )
    ).status,
    403,
  );
});
test("Revoking a member blocks downloads even with a previously valid session", async () => {
  const member = await getPrisma().subscriber.findUniqueOrThrow({
    where: { email: "buyer@example.com" },
  });
  process.env.TEST_SESSION_TOKEN = await createSessionToken({
    id: member.id,
    email: member.email,
    role: "subscriber",
    isActive: true,
  });
  await getPrisma().subscriber.update({
    where: { id: member.id },
    data: { isActive: false },
  });
  assert.equal(
    (
      await getResource(
        new Request("https://wooplans.com/api/premium/resources/catalogue"),
        { params: { id: "catalogue" } },
      )
    ).status,
    401,
  );
  delete process.env.TEST_SESSION_TOKEN;
});
test("Signed replay with a changed unsigned delivery header cannot reactivate a revoked member", async () => {
  const request = delivery();
  request.headers.set("x-pulse-delivery-id", "replayed_header");
  assert.equal((await webhook(request)).status, 200);
  assert.equal(
    (
      await getPrisma().subscriber.findUniqueOrThrow({
        where: { email: "buyer@example.com" },
      })
    ).isActive,
    false,
  );
});
test('Browser telemetry cannot invent payment events', async () => {
 const response = await telemetry(new Request('https://wooplans.com/api/funnel/event', {method:'POST',body:JSON.stringify({session_id:'fake-session',event_type:'checkout_completed'})}));
 assert.equal(response.status,400);
});
after(async () => {
  await getPrisma().$disconnect();
});
