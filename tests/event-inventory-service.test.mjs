import test from "node:test";
import assert from "node:assert/strict";
import { assertInventoryAvailable } from "../netlify/functions/lib/event-inventory-service.mjs";

test("inventory validation checks bundle components before payment", async () => {
  const requested = [];
  const inventoryClient = {
    async get(id) {
      requested.push(id);
      return { stock: id === "pezzy-silver-carp-chips" ? 0 : 10 };
    },
  };
  await assert.rejects(
    () => assertInventoryAvailable([{ sku: "NP-PEZ-BUNDLE3", quantity: 1 }], inventoryClient),
    /NP-PEZ-CARP no longer has enough stock/,
  );
  assert.deepEqual(requested, [
    "pezzy-trail-pack-bundle",
    "pezzy-lionfish-sticks",
    "pezzy-nilgai-antelope-heart",
    "pezzy-silver-carp-chips",
  ]);
});
