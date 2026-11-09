# Direct checkout: implementation and test setup

Status: draft PR #2 deployed to an isolated Netlify sandbox preview. Stripe Checkout, webhook confirmation, shared stock and cash retry/concurrency tests passed. Live checkout remains disabled.

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
- iPhone: update the Register in the dedicated Events app, preserve calendar/staff tools, use the shared catalog, show a server-generated payment QR, confirm cash, persist pending requests in SecureStore, show recent orders/shipping details, adjust stock, reconcile pending payments and record remaining cash refunds.
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
9. The native API host remains the existing production URL by default. Set `EXPO_PUBLIC_API_URL` to the test host for an Events test build; omit it for the reviewed production build. Use the existing Events seller sign-in. Seller tokens additionally require the existing session secret/access-code setup; no replacement authentication scheme was introduced.
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

- 58 automated tests passed, including existing Journal/media/social tests and new commerce tests.
- New tests cover price tampering, quantity validation, component bundles, free-shipping codes and dates, missing configuration, wrong origins, operator authentication, forged webhooks, stable provider idempotency and order-status capabilities.
- Embedded Postgres executes the real migration and SQL for opening stock, cash retries, reservation rejection, payment deduplication, bad totals, expiry, late success, partial/full refunds and refund ordering. This exercises real transactions/rollback but uses one embedded connection; it does not prove production multi-connection contention behavior.
- Changed server endpoints and the complete native project pass TypeScript checks.
- The existing sitemap build completed successfully; generated sitemap changes were excluded from delivery.
- Headless Chrome checked desktop/phone cart rendering, quantity totals, code entry, no horizontal overflow, stable retry request IDs and no browser exceptions. Catalog and payment failures were mocked; the supplied preview is not a real paid order.

## Required before real sales

Complete device QR/cash/restart/refund tests, tax configuration review, email/fulfillment workflow, stock reconciliation and actual hosting usage checks. Branding in the custom cart is implemented; Stripe's hosted payment page still needs its dashboard branding configured and reviewed. Only the approved sandbox webhook was created; live payment settings remain unchanged.

Before launch, use a clean production commerce dataset and a physical stock count; do not carry test sales or test reservations into production. Keep Journal data intact. Configure live secrets and a separate live webhook only after the test gates pass; set `COMMERCE_MODE=live` and `COMMERCE_LIVE_APPROVED=true` in the approved production environment.

Draft PR #2 is open on codex/direct-checkout-test, based on current main 1ab7acc. The original OneDrive checkout and Creative Studio source are unchanged. The supplied patch is against current main. No credentials are included.

Official implementation references: [Stripe Checkout creation](https://docs.stripe.com/api/checkout/sessions/create), [fulfillment and asynchronous events](https://docs.stripe.com/checkout/fulfillment), [QR generator documentation](https://github.com/soldair/node-qrcode).

## Current source reconciliation

This change is based on main at 1ab7acc. The dedicated Events iPhone app receives the register update; the Creative & Publishing Studio remains unchanged. Calendar and staff tools are preserved. Stripe sandbox checkout and deployed preview webhook/database testing completed successfully using synthetic customer details. No production payment setting has been enabled.

## Sandbox deployment

Draft PR: https://github.com/nomadicpaws/nomadicpaws/pull/2

Preview: https://deploy-preview-2--nomadicpaws.netlify.app/cheetos-store/

Netlify applies the additive commerce migration to the separate `codex/direct-checkout-test` database branch. Commerce configuration and verification secrets are scoped to that branch. The 610 basis-point tax is only a sandbox fixture, not approved live sourcing/tax treatment. The webhook receives only the five supported Stripe sandbox payment/refund events with API version 2024-06-20. No production checkout has been enabled.

Set the explicit COMMERCE_SITE_URL through Netlify environment settings with Functions scope. Build-only netlify.toml environment entries do not configure the deployed function runtime.

## Deployed integration evidence

A storefront order completed through hosted Stripe sandbox Checkout and returned to the preview with payment confirmed. The signed webhook marked the order paid at $27.28 ($21 merchandise, $1.28 sandbox tax fixture, $5 shipping), captured synthetic shipping details and reduced lionfish stock from 10 to 9. No operator reconciliation was used to mark this order paid. An identical cash retry produced one order/stock decrement; two concurrent last-item cash requests yielded one paid sale and one out-of-stock rejection. The isolated database migration succeeded. Netlify transiently returned HTTP 500 during a later deployment; retry succeeded.

## Automatic tax follow-up

The sandbox preview now uses COMMERCE_WEB_TAX_MODE=stripe instead of the old manual fixture. Existing sandbox head-office settings match the business location; an Arizona sandbox registration was recorded. This does not obtain a new government license or change live collection. Current treat products explicitly use Stripe Pet Food tax code txcd_36010004. Actual Stripe Tax calculations returned 6.1% on merchandise and zero tax on the separately stated $5 shipping for the tested Tucson and Phoenix addresses; the California fixture returned not_collecting because no California registration is configured. Checkout calculates after collecting shipping information. Stripe applies Arizona origin sourcing using the configured head office where applicable, rather than blindly using a destination-city rate. All 59 repository tests pass. Live activation, billing terms/fees, registration settings and real-device validation remain separate launch steps.

## Requested production activation

The owner explicitly authorized production launch and waived the pre-launch iPhone test. Devil Fish is now available for direct sale at its existing price. Initial physical stock supplied by the owner is Lionfish 10, Nilgai 10, Silver Carp 25 and Devil Fish 25; seed these only into production, using idempotent stock adjustments. Bundles continue sharing the first three component counts. Seller sign-in and owner-only staff management use the approved commerce environment instead of the retired Terminal test-only guard. Terminal connection endpoints remain test-only. Live credentials, independent production verification secrets, Stripe Tax activation/registration, receipt settings and the production webhook must be configured before enabling new sales.

Production launch preparation: the opening inventory migration seeds only an unused, zero-stock commerce dataset and records four ledger entries; it never resets an environment already in use. Shipping rates in automatic-tax sessions explicitly use Stripe’s Shipping classification so an old account-wide Never-tax-shipping default cannot silently control the new checkout. All 60 repository tests pass. The owner approved Tax Basic pricing and the live connection. Arizona live tax registration was added and live credentials were saved directly in Netlify; no local plaintext live credential copy was created. The live webhook is staged in Stripe for owner execution because Stripe’s live Workbench shell is read-only. Production checkout remains disabled until the webhook and remaining production settings are verified.
