import type { Config } from "@netlify/functions";
import { applyPendingInventory } from "./lib/event-inventory-service.mjs";
import { errorResponse, json, requireSeller, requireTestMode } from "./lib/event-http.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  try {
    requireTestMode();
    requireSeller(request);
    return json({ results: await applyPendingInventory({ limit: 50 }) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/event/inventory/reconcile" };
