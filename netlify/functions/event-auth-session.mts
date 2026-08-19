import type { Config } from "@netlify/functions";
import { authRateLimitKey, createSellerToken, secureEqual } from "./lib/event-auth.mjs";
import { clearAuthFailures, getAuthThrottle, recordAuthFailure } from "./lib/event-db.mjs";
import { errorResponse, json, readJson, requireTestMode } from "./lib/event-http.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  try {
    requireTestMode();
    const configuredCode = process.env.EVENT_REGISTER_ACCESS_CODE || "";
    if (configuredCode.length < 8) throw Object.assign(new Error("Seller access is not configured."), { status: 503 });
    const sessionSecret = process.env.EVENT_REGISTER_SESSION_SECRET || "";
    const clientKey = authRateLimitKey(request, sessionSecret);
    const throttle = await getAuthThrottle(clientKey);
    if (Number(throttle.retry_after) > 0) {
      throw Object.assign(new Error("Too many attempts. Try again in about 15 minutes."), {
        status: 429,
        headers: { "Retry-After": String(throttle.retry_after) },
      });
    }
    const { accessCode } = await readJson(request);
    if (!secureEqual(accessCode, configuredCode)) {
      const failed = await recordAuthFailure(clientKey);
      if (Number(failed.retry_after) > 0) {
        throw Object.assign(new Error("Too many attempts. Try again in about 15 minutes."), {
          status: 429,
          headers: { "Retry-After": String(failed.retry_after) },
        });
      }
      throw Object.assign(new Error("That access code is incorrect."), { status: 401 });
    }
    await clearAuthFailures(clientKey);
    const token = createSellerToken(sessionSecret);
    return json({ token, expiresInSeconds: 8 * 60 * 60, mode: "test" });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/event/auth/session" };
