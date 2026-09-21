import { getSale, getSaleItems, recordSuccessfulPayment } from "./event-db.mjs";
import { applyPendingInventory } from "./event-inventory-service.mjs";
import { inventoryEffects } from "./event-products.mjs";
import { retrieveStripePaymentIntent } from "./stripe-api.mjs";

export async function reconcileSalePayment(sale) {
  if (!sale || sale.status !== "payment_pending" || !sale.stripe_payment_intent_id) return sale;
  const intent = await retrieveStripePaymentIntent(sale.stripe_payment_intent_id);
  if (intent.livemode || intent.metadata?.event_sale_id !== sale.id || intent.status !== "succeeded") return sale;

  const saleItems = await getSaleItems(sale.id);
  if (!saleItems.length) throw new Error("Stripe payment referenced a sale without items.");
  const event = {
    id: `app_confirmation_${intent.id}`,
    type: "payment_intent.succeeded",
    data: { object: intent },
  };
  const rawBody = JSON.stringify(event);
  await recordSuccessfulPayment(event, rawBody, inventoryEffects(saleItems));
  await applyPendingInventory({ limit: 20 });
  return getSale(sale.id);
}
