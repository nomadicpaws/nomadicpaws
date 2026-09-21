import type { Config } from "@netlify/functions";
import { listSales } from "./lib/event-db.mjs";
import { reconcileSalePayment } from "./lib/event-payment-service.mjs";
import { errorResponse, json, requireEventOperator, requireTestMode } from "./lib/event-http.mjs";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, { Allow: "GET" });
  try {
    requireTestMode();
    await requireEventOperator(request);
    const requestedLimit = Number(new URL(request.url).searchParams.get("limit") || 25);
    const storedSales = await listSales(requestedLimit);
    const sales = await Promise.all(storedSales.map(async (sale) => {
      if (sale.status !== "payment_pending") return sale;
      try {
        const reconciled = await reconcileSalePayment(sale);
        return reconciled ? { ...sale, ...reconciled, items: sale.items } : sale;
      } catch (error) {
        console.error("Unable to reconcile event sale payment.", error);
        return sale;
      }
    }));
    return json({ sales, mode: "test" });
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/event/sales/history" };
