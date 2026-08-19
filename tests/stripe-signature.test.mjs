import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "../netlify/functions/lib/stripe-signature.mjs";

test("Stripe signatures require a matching payload and recent timestamp", () => {
  const body = JSON.stringify({ id: "evt_test" });
  const secret = "whsec_test";
  const timestamp = 1000;
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const header = `t=${timestamp},v1=${signature}`;
  assert.equal(verifyStripeSignature(body, header, secret, { nowSeconds: 1100 }), true);
  assert.equal(verifyStripeSignature(`${body} `, header, secret, { nowSeconds: 1100 }), false);
  assert.equal(verifyStripeSignature(body, header, secret, { nowSeconds: 1400 }), false);
});
