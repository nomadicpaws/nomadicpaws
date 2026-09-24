import type { Config } from "@netlify/functions";
import { createSaleRecord, getSale, recordCashPayment } from "./lib/event-db.mjs";
import { errorResponse, json, readJson, requireEventOperator, requireTestMode, validRequestId } from "./lib/event-http.mjs";
import { applyPendingInventory, assertInventoryAvailable } from "./lib/event-inventory-service.mjs";
import { inventoryEffects, priceCart } from "./lib/event-products.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  try {
    requireTestMode();
    await requireEventOperator(request);
    const body = await readJson(request);
    if (!validRequestId(body.requestId)) {
      throw Object.assign(new Error("A new UUID requestId is required for each sale."), { status: 400 });
    }
    const tenderedCents = Math.round(Number(body.cashTendered) * 100);
    if (!Number.isSafeInteger(tenderedCents) || tenderedCents < 0) {
      throw Object.assign(new Error("Enter the cash received as dollars and cents."), { status: 400 });
    }
    const priced = priceCart(body.items, Number(process.env.EVENT_TAX_RATE_BPS));
    if (tenderedCents < priced.totalCents) {
      throw Object.assign(new Error(`Cash received must cover the ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priced.totalCents / 100)} total.`), { status: 400 });
    }
    const existing = await getSale(body.requestId);
    if (existing) {
      if (existing.payment_method !== "cash" || existing.total_cents !== priced.totalCents) {
        throw Object.assign(new Error("That saved sale does not match this cart. Start a new sale."), { status: 409 });
      }
      if (existing.status === "paid") {
        return json({ sale: existing, changeDueCents: existing.change_due_cents, inventory: { duplicate: true } }, 200);
      }
      if (existing.status !== "payment_pending") {
        throw Object.assign(new Error("That cash sale cannot be retried. Start a new sale."), { status: 409 });
      }
      const cash = await recordCashPayment(body.requestId, tenderedCents, inventoryEffects(body.items));
      const inventory = await applyPendingInventory({ limit: 20 });
      return json({ sale: await getSale(body.requestId), changeDueCents: cash.change_due_cents, inventory }, 200);
    }
    await assertInventoryAvailable(body.items);
    await createSaleRecord({ id: body.requestId, ...priced }, priced.normalized, "cash");
    const cash = await recordCashPayment(body.requestId, tenderedCents, inventoryEffects(body.items));
    const inventory = await applyPendingInventory({ limit: 20 });
    return json({ sale: await getSale(body.requestId), changeDueCents: cash.change_due_cents, inventory }, 201);
  } catch (error) {
    return errorResponse(error);
  }
};

export const config: Config = { path: "/api/event/sales/cash" };
