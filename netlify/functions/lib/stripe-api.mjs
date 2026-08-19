const STRIPE_API = "https://api.stripe.com/v1";

export async function stripeRequest(path, values = {}, fetchImpl = fetch) {
  const key = process.env.STRIPE_SECRET_KEY || "";
  const body = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") body.set(name, String(value));
  }
  const response = await fetchImpl(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Stripe returned ${response.status}.`);
    error.status = 502;
    throw error;
  }
  return payload;
}

export function createTerminalConnectionToken(fetchImpl) {
  return stripeRequest(
    "/terminal/connection_tokens",
    { location: process.env.STRIPE_TERMINAL_LOCATION_ID },
    fetchImpl,
  );
}

export function createTerminalPaymentIntent(sale, fetchImpl) {
  return stripeRequest(
    "/payment_intents",
    {
      amount: sale.totalCents,
      currency: "usd",
      "payment_method_types[0]": "card_present",
      capture_method: "automatic",
      "metadata[event_sale_id]": sale.id,
      "metadata[source]": "nomadic_paws_event_register",
      description: `Nomadic Paws event sale ${sale.id}`,
    },
    fetchImpl,
  );
}
