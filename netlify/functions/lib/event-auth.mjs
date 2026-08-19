import { createHmac, timingSafeEqual } from "node:crypto";

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(encodedPayload, secret) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function secureEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSellerToken(secret, { now = Date.now(), ttlSeconds = 8 * 60 * 60 } = {}) {
  if (!secret || secret.length < 32) throw new Error("EVENT_REGISTER_SESSION_SECRET must be at least 32 characters.");
  const payload = encode(JSON.stringify({ role: "seller", exp: Math.floor(now / 1000) + ttlSeconds }));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySellerToken(token, secret, now = Date.now()) {
  const [payload, signature, extra] = String(token || "").split(".");
  if (!payload || !signature || extra || !secureEqual(signature, sign(payload, secret))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (claims.role !== "seller" || !Number.isInteger(claims.exp) || claims.exp <= Math.floor(now / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function bearerToken(headers) {
  const authorization = headers.get?.("authorization") || headers.authorization || headers.Authorization || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export function authRateLimitKey(request, secret) {
  if (!secret || secret.length < 32) throw new Error("EVENT_REGISTER_SESSION_SECRET must be at least 32 characters.");
  const headers = request.headers;
  const address = headers.get?.("x-nf-client-connection-ip")
    || headers.get?.("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  return createHmac("sha256", secret).update(`event-auth:${address}`).digest("hex");
}
