import type { Config } from "@netlify/functions";
import { getSale } from "./lib/event-db.mjs";
import { errorResponse, json, requireSeller, requireTestMode } from "./lib/event-http.mjs";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, { Allow: "GET" });
  try {
    requireTestMode();
    requireSeller(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw Object.assign(new Error("A sale id is required."), { status: 400 });
    const sale = await getSale(id);
    if (!sale) throw Object.assign(new Error("Sale not found."), { status: 404 });
    return json({ sale });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/event/sales/status" };
