import type { Config } from "@netlify/functions";
import { createSellerToken, secureEqual } from "./lib/event-auth.mjs";
import { errorResponse, json, readJson, requireTestMode } from "./lib/event-http.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  try {
    requireTestMode();
    const configuredCode = process.env.EVENT_REGISTER_ACCESS_CODE || "";
    if (configuredCode.length < 8) throw Object.assign(new Error("Seller access is not configured."), { status: 503 });
    const { accessCode } = await readJson(request);
    if (!secureEqual(accessCode, configuredCode)) throw Object.assign(new Error("That access code is incorrect."), { status: 401 });
    const token = createSellerToken(process.env.EVENT_REGISTER_SESSION_SECRET || "");
    return json({ token, expiresInSeconds: 8 * 60 * 60, mode: "test" });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/event/auth/session" };
