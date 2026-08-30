import type { Config } from "@netlify/functions";
import { errorResponse, json, requireEventOperator, requireTestMode } from "./lib/event-http.mjs";
import { createTerminalConnectionToken } from "./lib/stripe-api.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  try {
    requireTestMode();
    await requireEventOperator(request);
    const token = await createTerminalConnectionToken();
    return json({ secret: token.secret });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/event/stripe/connection-token" };
