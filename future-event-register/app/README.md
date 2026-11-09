# Nomadic Paws Events app

Dedicated Events iPhone app. Calendar planning and individual staff access are preserved. The register now uses the shared commerce backend for Stripe payment QR checkout, cash/change, stock adjustments, recent orders, cash refunds and pending-payment recovery. No Snipcart account is needed.

Set EXPO_PUBLIC_API_URL to the isolated Netlify preview URL for a test build. The default remains the production API host. Secrets stay on Netlify; seller sessions and pending requests stay in device secure storage. The current preview is sandbox-only and contains synthetic inventory.

Stripe Terminal vendor source remains preserved for a later reader integration. The active register uses hosted Checkout QR codes and cash. A physical iPhone build and payment/restart/recovery checks remain required before launch. See ../../docs/direct-checkout-setup.md.
