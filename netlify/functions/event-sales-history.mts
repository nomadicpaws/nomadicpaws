import type { Config } from "@netlify/functions";
import { listSales } from "./lib/event-db.mjs";
import { errorResponse, json, requireEventOperator, requireTestMode } from "./lib/event-http.mjs";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, { Allow: "GET" });
  try {
    requireTestMode();
    await requireEventOperator(request);
    const requestedLimit = Number(new URL(request.url).searchParams.get("limit") || 25);
    const sales = await listSales(requestedLimit);
    return json({ sales, mode: "test" });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/event/sales/history" };
