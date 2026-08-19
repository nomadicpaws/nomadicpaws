import { createHmac, timingSafeEqual, randomBytes, createHash } from "node:crypto";

const b64 = (value) => Buffer.from(value).toString("base64url");
const unb64 = (value) => Buffer.from(value, "base64url").toString("utf8");

export function signToken(payload, secret) {
  const body = b64(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyToken(token, secret, expectedType) {
  const [body, signature, extra] = String(token || "").split(".");
  if (!body || !signature || extra) throw new Error("invalid_token");
  const expected = createHmac("sha256", secret).update(body).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("invalid_token");
  const payload = JSON.parse(unb64(body));
  if (payload.exp && Date.now() >= payload.exp) throw new Error("expired_token");
  if (expectedType && payload.typ !== expectedType) throw new Error("invalid_token_type");
  return payload;
}

export function secureEqual(left, right) {
  const a = createHash("sha256").update(String(left || "")).digest();
  const b = createHash("sha256").update(String(right || "")).digest();
  return timingSafeEqual(a, b);
}

export const randomId = () => randomBytes(24).toString("base64url");
export const pkceChallenge = (verifier) => createHash("sha256").update(verifier).digest("base64url");

