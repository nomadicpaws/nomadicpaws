import { bearerToken, verifySellerToken } from "./event-auth.mjs";

export function json(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("The request body must be valid JSON.");
  }
}

export function requireSeller(request) {
  const secret = process.env.EVENT_REGISTER_SESSION_SECRET || "";
  const claims = verifySellerToken(bearerToken(request.headers), secret);
  if (!claims) throw Object.assign(new Error("Seller sign-in is required."), { status: 401 });
  return claims;
}

export function requireTestMode() {
  if (process.env.EVENT_REGISTER_ENV !== "test") {
    throw Object.assign(new Error("The event register is locked until EVENT_REGISTER_ENV=test is configured."), { status: 503 });
  }
  if (!String(process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_")) {
    throw Object.assign(new Error("A Stripe test secret key is required during Phase 2."), { status: 503 });
  }
}

export function errorResponse(error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error(error);
  return json({ error: status >= 500 ? "The event register could not complete that request." : error.message }, status);
}
