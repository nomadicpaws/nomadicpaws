import test from "node:test";
import assert from "node:assert/strict";
import { createSnipcartInventoryClient } from "../netlify/functions/lib/snipcart-inventory.mjs";

test("Snipcart inventory reads and replaces stock without exposing the key", async () => {
  const calls = [];
  const client = createSnipcartInventoryClient({
    secret: "secret-value",
    expectedMode: "Test",
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return options.method === "PUT"
        ? Response.json({ stock: 4, mode: "Test" })
        : Response.json({ stock: 5, mode: "Test" });
    },
  });
  assert.equal((await client.get("product-one")).stock, 5);
  await client.setStock("product-one", 4);
  assert.equal(JSON.parse(calls[1].options.body).stock, 4);
  assert.match(calls[0].options.headers.Authorization, /^Basic /);
  assert.doesNotMatch(calls[0].url, /secret-value/);
});

test("the test register rejects live Snipcart keys and responses", async () => {
  assert.throws(
    () => createSnipcartInventoryClient({ secret: "SL_live-key", expectedMode: "Test" }),
    /live Snipcart key cannot be used/,
  );
  const client = createSnipcartInventoryClient({
    secret: "legacy-key",
    expectedMode: "Test",
    fetchImpl: async () => Response.json({ stock: 5, mode: "Live" }),
  });
  await assert.rejects(() => client.get("product-one"), /expected Test/);
});
