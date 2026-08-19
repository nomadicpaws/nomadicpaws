import type { Config } from "@netlify/functions";
import { getSaleItems, recordSuccessfulPayment } from "./lib/event-db.mjs";
import { applyPendingInventory } from "./lib/event-inventory-service.mjs";
import { json, requireTestMode } from "./lib/event-http.mjs";
import { inventoryEffects } from "./lib/event-products.mjs";
import { verifyStripeSignature } from "./lib/stripe-signature.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  try {
    requireTestMode();
    const rawBody = await request.text();
    const valid = verifyStripeSignature(
      rawBody,
      request.headers.get("stripe-signature"),
      process.env.STRIPE_WEBHOOK_SECRET || "",
    );
    if (!valid) return json({ error: "Invalid Stripe signature." }, 400);
    const event = JSON.parse(rawBody);
    if (event.type !== "payment_intent.succeeded") return json({ received: true, ignored: true });
    if (event.data?.object?.livemode) return json({ error: "Live Stripe events are disabled during Phase 2." }, 400);

    const saleId = event.data?.object?.metadata?.event_sale_id;
    const saleItems = await getSaleItems(saleId);
    if (!saleItems.length) throw new Error("Stripe event referenced an unknown sale.");
    const recorded = await recordSuccessfulPayment(event, rawBody, inventoryEffects(saleItems));
    const inventory = await applyPendingInventory({ limit: 20 });
    return json({ received: true, duplicate: recorded.duplicate, inventory });
  } catch (error) {
    console.error("Stripe event processing failed.", error);
    return json({ error: "Stripe event processing failed." }, 500);
  }
};

export const config: Config = { path: "/api/event/stripe/webhook" };
