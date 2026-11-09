# Direct checkout: implementation and test setup

Status: local implementation for review. No deployment, Stripe configuration, payment, membership email, or stock import has been performed.

## Confirmed policy

- Keep existing product prices and existing website/native app.
- Standard US shipping: $5 per order.
- Free email/Join the Pack members receive a monthly code for free shipping only.
- Stripe and operator-recorded cash first. No PayPal account/integration is required for this release.
- Snipcart is inactive; it is not a live fallback and no subscription savings are assumed until a paid subscription actually exists.
- Sales tax is unconfirmed. Missing tax configuration blocks checkout; zero is never silently assumed.

### Business-origin jurisdiction verification — November 9, 2026

Arizona's official address lookup returned **PMA — PIMA, business code 017 RETAIL, 6.1%** for the supplied business location, with no Tucson city tax listed. This is the combined state/county rate for retail at that location; the previously discussed 8.7% Tucson city rate is not the lookup result for this address. The exact street address is intentionally excluded from repository documentation.

This confirms the business-origin location rate, not a blanket rate for every shipped order. Arizona in-state retailer sourcing, any destination-city obligations, product taxability and shipping treatment still need to be established before enabling online collection. Event rates remain venue-specific. No live tax setting has been changed. Lookup: https://aztaxes.gov/Home/Address/

## What changed

- Website: custom branded Your Pack cart, product images, quantities, monthly code entry and hosted Stripe Checkout. The existing signup form/Zoho workflow stays unchanged.
- iPhone: adapt the preserved EventRegister screen, expose it to Katie through Register, use the shared catalog, show a server-generated payment QR, confirm cash, persist pending requests in SecureStore, show recent orders/shipping details, adjust stock, reconcile pending payments and record remaining cash refunds.
- Backend: one canonical server catalog, transactional stock/reservations, orders, payment/refund status, stock ledger, authenticated operator APIs and signature-verified Stripe events. New web checkout requests are throttled; request IDs and provider idempotency keys protect retries.
- Bundles: assembled from one bag of each component; availability is derived. No independent bundle stock is deducted. If actual stock is separately prepacked, resolve that physical inventory policy before launch.
- Old Snipcart network adapter and inventory updater are removed. Public inventory now reads the shared database. Retired test payment, webhook and reconciliation routes return HTTP 410; they never contact Snipcart. Historical event tables/identifiers remain readable.
- Terminal SDK/vendor files remain preserved for later work, but the new register uses QR and cash. Tap to Pay and card-reader activation are not part of this release.

## Configure test mode, without sending secrets through chat

1. Review/apply the code on a non-production branch. Point a preview/test environment at a separate database. Never test purchases against real production stock, even with Stripe test keys.
2. Check the real Netlify plan and database provisioning. The additive migration `202611090001_commerce.sql` creates only commerce tables and initializes component counts at zero. Existing Journal/identity/media tables are untouched.
3. In the test environment, set values in `.env.example`. Set `COMMERCE_MODE=test`, use your own Stripe **test** secret key as `STRIPE_SECRET_KEY`, and generate a random `COMMERCE_STATUS_SECRET` at least 32 characters long. Store all secrets directly in Netlify environment variables; do not commit them.
4. Use the exact preview origin as `COMMERCE_SITE_URL`. New browser checkout requires the matching Origin header; return URLs are generated server-side. `COMMERCE_ENABLED` stays false until configuration is ready, then becomes true in the test environment only.
5. Add a Stripe test webhook for `https://YOUR-TEST-HOST/api/commerce/webhook`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, and `charge.refunded`. Put that endpoint's signing secret in `COMMERCE_STRIPE_WEBHOOK_SECRET`. The old `STRIPE_WEBHOOK_SECRET` is not the new endpoint's secret.
6. Keep confirmed shipping values `COMMERCE_SHIPPING_CENTS=500` and `COMMERCE_SHIPPING_COUNTRIES=US`.
7. Confirm tax obligations and rate treatment first. Web tax can use `COMMERCE_WEB_TAX_MODE=stripe` for configured Stripe automatic tax, or `manual` with an explicitly approved fixed `COMMERCE_WEB_TAX_RATE_BPS`. Fixed manual pricing applies tax to merchandise only; it is unsuitable where shipping is taxable, address-specific rates are required, or items have differing tax treatment. POS uses the event-specific `EVENT_TAX_RATE_BPS`. A rate of 0 is an affirmative business configuration, not a default. Set appropriate Stripe product tax classifications/account defaults before automatic-tax testing.
8. Enable `COMMERCE_CASH_APP_PAY=true` only after eligibility is confirmed in your Stripe account and test it with supported customers/devices.
9. The native API host remains the existing production URL by default. Point `native-app/src/api.ts` at the test host for a test build; restore the production host only for the reviewed launch build. Use the existing Apple sign-in setup. Seller tokens additionally require the existing session secret/access-code setup; no replacement authentication scheme was introduced.
10. Add **test stock only** using Register's inventory adjustments. Physical component SKUs: NP-PEZ-LION, NP-PEZ-NILGAI, NP-PEZ-CARP and NP-PEZ-DEVIL (currently inactive). Opening-count adjustments are additive, so enter the actual delta, not the final total repeatedly.

## Monthly free-shipping codes

Set server-only `COMMERCE_SHIPPING_PERKS` to a JSON array, for example:

```json
[{"code":"YOUR-MONTHLY-CODE","startsAt":"2026-11-01T07:00:00Z","expiresAt":"2026-12-01T07:00:00Z"}]
```

These timestamps represent midnight Arizona time for November 1 and December 1. Use the actual chosen month. Codes are case-insensitive; start is inclusive and expiration exclusive. Invalid or expired codes are rejected before stock is reserved. A valid code changes shipping from $5 to $0 without changing merchandise prices or merchandise tax.

This is a shared bearer code, not an identity-verified membership entitlement: anyone who knows it can use it. It has no per-customer use cap. That matches a simple monthly newsletter-code workflow. Code creation/distribution is manual; the implementation does not send email or alter the signup list. Use the existing email platform to distribute approved codes separately.

## Payment and inventory recovery

- Cash is confirmed by an authenticated operator and committed atomically with its stock movements. Tender and change are recorded. Retries use the saved request ID.
- Stripe Checkout reserves physical component stock. A new Session is set to expire one hour after order creation. Stock is released on verified expiry/cancellation, not merely when someone leaves the browser.
- Native pending sales survive app restarts. Retry a saved sale after an uncertain network result; do not charge again with a fresh ID. Browser checkout also keeps its pending request locally.
- Reconcile pending payments queries Stripe's canonical session state. Cancel unpaid checkout asks Stripe to expire the Session first; a payment that already completed is reconciled instead of treated as cancelled.
- A failed provider request may leave an order reserved with no attached Session ID. Retry its saved request promptly with the same payload/ID. Creation is blocked after 29 minutes to avoid stale expiry or idempotency re-creation. If that window passes, inspect Stripe's request logs using the order metadata/idempotency key; confirm whether a Session/payment exists before an operator repairs the database. No automatic stock release guesses that a charge failed.
- Payment success is verified independently of a browser redirect. Different duplicate events cannot decrement stock twice. Late success after a released reservation is put in `review`, requiring operator resolution.
- The checkout switch disables **new sales**; status, refunds, webhook processing, cancellation and reconciliation remain available with valid existing environment credentials. Keep those credentials and the webhook active for pending orders.
- A signed refund is reconciled against canonical Checkout state before updating refund totals, including when its event arrives before payment success.
- Stripe full/partial refunds are initiated in Stripe's dashboard and synchronized by `charge.refunded`. Cash refund APIs support full/partial amounts; the register exposes a remaining-balance refund confirmation. Neither automatically restocks products. Inspect returns and make a separate stock adjustment.
- Payment confirmation is displayed online, and recent orders are available in the register. Configure and test Stripe receipt emails in your own dashboard. A separate branded shipping/fulfillment email system has **not** been implemented; the Zoho signup integration is not an order-email service. Resolve the required customer confirmation/fulfillment-email workflow before launch.

## Validation completed locally

- 45 automated tests passed, including existing Journal/media/social tests and new commerce tests.
- New tests cover price tampering, quantity validation, component bundles, free-shipping codes and dates, missing configuration, wrong origins, operator authentication, forged webhooks, stable provider idempotency and order-status capabilities.
- Embedded Postgres executes the real migration and SQL for opening stock, cash retries, reservation rejection, payment deduplication, bad totals, expiry, late success, partial/full refunds and refund ordering. This exercises real transactions/rollback but uses one embedded connection; it does not prove production multi-connection contention behavior.
- Changed server endpoints and the complete native project pass TypeScript checks.
- The existing sitemap build completed successfully; generated sitemap changes were excluded from delivery.
- Headless Chrome checked desktop/phone cart rendering, quantity totals, code entry, no horizontal overflow, stable retry request IDs and no browser exceptions. Catalog and payment failures were mocked; the supplied preview is not a real paid order.

## Required before real sales

Complete real Stripe sandbox checkout/webhook tests, Netlify migration/transaction tests with competing clients, device QR/cash/restart/refund tests, tax configuration review, email/fulfillment workflow, stock reconciliation and actual hosting usage checks. Branding in the custom cart is implemented; Stripe's hosted payment page still needs its dashboard branding configured and reviewed. No actual Stripe account settings have been changed.

Before launch, use a clean production commerce dataset and a physical stock count; do not carry test sales or test reservations into production. Keep Journal data intact. Configure live secrets and a separate live webhook only after the test gates pass; set `COMMERCE_MODE=live` and `COMMERCE_LIVE_APPROVED=true` in the approved production environment.

No PR has been opened, no GitHub changes have been pushed, and the original OneDrive checkout is unchanged. The delivered patch is against a local snapshot of that checkout and should first be checked against the current repository with `git apply --check`. Review it before applying; do not upload a ZIP containing node_modules, credentials or local database files.

Official implementation references: [Stripe Checkout creation](https://docs.stripe.com/api/checkout/sessions/create), [fulfillment and asynchronous events](https://docs.stripe.com/checkout/fulfillment), [QR generator documentation](https://github.com/soldair/node-qrcode).

## Current source reconciliation

This change is based on main at 1ab7acc. The dedicated Events iPhone app receives the register update; the Creative & Publishing Studio remains unchanged. Calendar and staff tools are preserved. Stripe sandbox checkout has completed successfully using synthetic customer details; preview webhook/database testing is still pending. No production payment setting has been enabled.
