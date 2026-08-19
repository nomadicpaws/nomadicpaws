import test from "node:test";
import assert from "node:assert/strict";
import { inventoryEffects, priceCart, validateCart } from "../netlify/functions/lib/event-products.mjs";

test("event prices are calculated from the server registry", () => {
  const result = priceCart([
    { sku: "NP-PEZ-LION", quantity: 2, unitPriceCents: 1 },
    { sku: "NP-PEZ-CARP", quantity: 1 },
  ], 820);
  assert.equal(result.subtotalCents, 5900);
  assert.equal(result.taxCents, 484);
  assert.equal(result.totalCents, 6384);
});

test("inactive products cannot be sold", () => {
  assert.throws(() => validateCart([{ sku: "NP-PEZ-DEVIL", quantity: 1 }]), /not available/);
});

test("bundle inventory includes its three physical components", () => {
  const effects = inventoryEffects([
    { sku: "NP-PEZ-BUNDLE3", quantity: 2 },
    { sku: "NP-PEZ-LION", quantity: 1 },
  ]);
  assert.deepEqual(
    Object.fromEntries(effects.map((effect) => [effect.sku, effect.quantity])),
    {
      "NP-PEZ-BUNDLE3": 2,
      "NP-PEZ-LION": 3,
      "NP-PEZ-NILGAI": 2,
      "NP-PEZ-CARP": 2,
    },
  );
});
