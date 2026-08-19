import type { Config } from "@netlify/functions";
import { attachPaymentIntent, createSaleRecord, markSalePaymentFailed } from "./lib/event-db.mjs";
import { errorResponse, json, readJson, requireSeller, requireTestMode } from "./lib/event-http.mjs";
import { assertInventoryAvailable } from "./lib/event-inventory-service.mjs";
import { priceCart } from "./lib/event-products.mjs";
import { createTerminalPaymentIntent } from "./lib/stripe-api.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  let saleId: string | null = null;
  let saleCreated = false;
  try {
    requireTestMode();
    requireSeller(request);
    const body = await readJson(request);
    const priced = priceCart(body.items, Number(process.env.EVENT_TAX_RATE_BPS));
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId || "")) {
      throw Object.assign(new Error("A new UUID requestId is required for each sale."), { status: 400 });
    }
    await assertInventoryAvailable(body.items);
    saleId = body.requestId;
    const sale = { id: saleId, ...priced };
    await createSaleRecord(sale, priced.normalized);
    saleCreated = true;
    const intent = await createTerminalPaymentIntent(sale);
    await attachPaymentIntent(saleId, intent.id);
    return json({
      saleId,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      subtotalCents: priced.subtotalCents,
      taxCents: priced.taxCents,
      totalCents: priced.totalCents,
      currency: "usd",
      mode: "test",
    }, 201);
  } catch (error) {
    if (saleId && saleCreated) await markSalePaymentFailed(saleId, error?.message || error).catch(console.error);
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/event/sales" };
