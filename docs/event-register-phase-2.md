# Event register — Phase 2 test setup

This backend is deliberately locked to Stripe test mode. It does not alter the existing Snipcart checkout or the public product-card inventory endpoint.

## Netlify configuration

1. Enable Netlify Database for the site. Netlify applies the migration in `netlify/database/migrations` before deployment.
2. Add the variables shown in `.env.example` to the Production deploy context. Keep all secret values in Netlify, never in the phone app or repository.
3. Set `EVENT_REGISTER_ENV` to `test`. The backend rejects any Stripe key that does not begin with `sk_test_`.
4. Set an explicit `EVENT_TAX_RATE_BPS` for the event jurisdiction. For example, `820` means 8.20%. Confirm the correct rate before taking payments.
5. In Stripe test mode, create a Terminal location and put its `tml_...` id in `STRIPE_TERMINAL_LOCATION_ID`.
6. Add a Stripe test webhook endpoint for `https://nomadicpaws.co/api/event/stripe/webhook`, subscribe to `payment_intent.succeeded`, and store its `whsec_...` signing secret in `STRIPE_WEBHOOK_SECRET`.

## Test flow

The future React Native companion signs in by POSTing an operator-entered access code to `/api/event/auth/session`. It keeps the returned short-lived token only on the device and uses it for the remaining endpoints.

1. `GET /api/event/products` reads current Snipcart stock.
2. `POST /api/event/sales` receives a fresh UUID `requestId`, validates stock and prices on the server, records the sale, and creates a Stripe test `card_present` PaymentIntent. Reusing a request id is rejected so a retry cannot silently create a second charge.
3. The React Native Stripe Terminal SDK collects and confirms the payment with a simulated reader during Phase 2.
4. Stripe calls the signed webhook. The webhook records the event exactly once, marks the sale paid, and creates durable inventory adjustments.
5. Snipcart adjustments retry through `POST /api/event/inventory/reconcile` if an update fails.

Bundle sales decrement the bundle SKU and the three physical component SKUs. This keeps event sales visible in both bundle and individual-item availability. Snipcart's inventory API replaces a stock count rather than performing an atomic decrement, so an online order arriving at the same instant as an event sale can still create a race. The database serializes event-register updates and retains failed work for reconciliation, but launch review should include a small low-stock buffer and a final end-of-event count.

No live payment should be attempted until Apple enrollment is approved, a cloud-built iPhone app is installed, simulated-reader tests pass, and the explicit live-mode launch review is complete.
