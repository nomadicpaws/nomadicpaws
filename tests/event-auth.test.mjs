import test from "node:test";
import assert from "node:assert/strict";
import { authRateLimitKey, createSellerToken, secureEqual, verifySellerToken } from "../netlify/functions/lib/event-auth.mjs";

const secret = "a-secure-test-secret-that-is-long-enough";

test("seller tokens expire and reject tampering", () => {
  const token = createSellerToken(secret, { now: 1_000_000, ttlSeconds: 60 });
  assert.equal(verifySellerToken(token, secret, 1_030_000)?.role, "seller");
  assert.equal(verifySellerToken(token, secret, 1_061_000), null);
  assert.equal(verifySellerToken(`${token}x`, secret, 1_030_000), null);
});

test("access code comparison handles unequal lengths", () => {
  assert.equal(secureEqual("correct", "correct"), true);
  assert.equal(secureEqual("correct", "wrong"), false);
});

test("rate-limit keys are stable hashes and do not reveal the address", () => {
  const request = { headers: new Headers({ "x-nf-client-connection-ip": "192.0.2.10" }) };
  const key = authRateLimitKey(request, secret);
  assert.equal(key.length, 64);
  assert.equal(key, authRateLimitKey(request, secret));
  assert.doesNotMatch(key, /192\.0\.2\.10/);
});
