import type { Config } from "@netlify/functions";
import { errorResponse, json, requireSeller, requireTestMode } from "./lib/event-http.mjs";
import { EVENT_PRODUCTS } from "./lib/event-products.mjs";
import { createSnipcartInventoryClient } from "./lib/snipcart-inventory.mjs";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, { Allow: "GET" });
  try {
    requireTestMode();
    requireSeller(request);
    const inventory = createSnipcartInventoryClient();
    const products = await Promise.all(EVENT_PRODUCTS.filter((product) => product.active).map(async (product) => {
      const { stock } = await inventory.get(product.snipcartId);
      return { ...product, stock };
    }));
    return json({ products, simulatedReader: true, mode: "test" });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/event/products" };
