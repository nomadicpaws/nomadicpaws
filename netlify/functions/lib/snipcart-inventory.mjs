const PRODUCTS_URL = "https://app.snipcart.com/api/products";

function authorization(secret) {
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

export function createSnipcartInventoryClient({ secret = process.env.Snipcart, fetchImpl = fetch } = {}) {
  if (!secret) throw new Error("Snipcart inventory is not configured.");
  const headers = { Accept: "application/json", Authorization: authorization(secret) };

  return {
    async get(productId) {
      const response = await fetchImpl(`${PRODUCTS_URL}/${encodeURIComponent(productId)}`, { headers });
      if (!response.ok) throw new Error(`Snipcart returned ${response.status} while reading ${productId}.`);
      const product = await response.json();
      const stock = Number(product.stock);
      if (!Number.isSafeInteger(stock) || stock < 0) throw new Error(`Snipcart returned invalid stock for ${productId}.`);
      return { product, stock };
    },

    async setStock(productId, stock) {
      if (!Number.isSafeInteger(stock) || stock < 0) throw new Error(`Invalid replacement stock for ${productId}.`);
      const response = await fetchImpl(`${PRODUCTS_URL}/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ stock }),
      });
      if (!response.ok) throw new Error(`Snipcart returned ${response.status} while updating ${productId}.`);
      return response.json();
    },
  };
}
