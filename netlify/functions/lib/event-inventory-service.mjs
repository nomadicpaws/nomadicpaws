import { applyAdjustmentWithLock, pendingAdjustments } from "./event-db.mjs";
import { createSnipcartInventoryClient } from "./snipcart-inventory.mjs";
import { inventoryEffects } from "./event-products.mjs";

export async function assertInventoryAvailable(items, inventoryClient) {
  const api = inventoryClient || createSnipcartInventoryClient();
  const states = [];
  for (const effect of inventoryEffects(items)) {
    const { stock } = await api.get(effect.snipcartId);
    if (stock < effect.quantity) {
      const error = new Error(`${effect.sku} no longer has enough stock for this sale.`);
      error.status = 409;
      throw error;
    }
    states.push({ ...effect, stock });
  }
  return states;
}

export async function applyPendingInventory({ limit = 20, inventoryClient } = {}) {
  const api = inventoryClient || createSnipcartInventoryClient();
  const adjustments = await pendingAdjustments(limit);
  const results = [];

  for (const adjustment of adjustments) {
    try {
      const result = await applyAdjustmentWithLock(adjustment, async (claimed) => {
        const { stock } = await api.get(claimed.snipcart_product_id);
        const stockAfter = stock + Number(claimed.quantity_delta);
        if (stockAfter < 0) throw new Error(`Insufficient Snipcart stock for ${claimed.snipcart_product_id}.`);
        await api.setStock(claimed.snipcart_product_id, stockAfter);
        return { stockBefore: stock, stockAfter };
      });
      results.push({ id: adjustment.id, status: result.skipped ? "skipped" : "applied" });
    } catch (error) {
      results.push({ id: adjustment.id, status: "failed", error: String(error?.message || error) });
    }
  }
  return results;
}
