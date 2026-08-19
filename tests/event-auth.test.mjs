import test from "node:test";
import assert from "node:assert/strict";
import { createSellerToken, secureEqual, verifySellerToken } from "../netlify/functions/lib/event-auth.mjs";

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
