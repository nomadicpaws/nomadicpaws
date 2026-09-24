import test from "node:test";
import assert from "node:assert/strict";
import { authRateLimitKey, createSellerToken, secureEqual, verifySellerToken } from "../netlify/functions/lib/event-auth.mjs";
import { validRequestId } from "../netlify/functions/lib/event-http.mjs";

const secret = "a-secure-test-secret-that-is-long-enough";

test("seller tokens expire and reject tampering", () => {
  const token = createSellerToken(secret, { now: 1_000_000, ttlSeconds: 60, staffId: 'catnana', name: 'CatNana', permission: 'helper' });
  const claims = verifySellerToken(token, secret, 1_030_000);
  assert.equal(claims?.role, "seller");
  assert.equal(claims?.name, "CatNana");
  assert.equal(claims?.permission, "helper");
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

test("cash and card sales accept the same standard UUID request id", () => {
  assert.equal(validRequestId("f2b7f948-c45b-4c10-a8bb-641953f34cf7"), true);
  assert.equal(validRequestId("f2b7f948-c45b-4c10-a8bb641953f34cf7"), false);
  assert.equal(validRequestId("not-a-sale-id"), false);
});
