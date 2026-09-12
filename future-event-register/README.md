# Nomadic Paws Event Register

The event register is intentionally separated from the Studio navigation as of September 2026.

Its working implementation is preserved in git commit `34ba554` (`native-app/App.tsx`, `EventRegister`), the Stripe Terminal vendor source is preserved under `future-event-register/stripe-terminal-react-native`, and the server endpoints remain under `netlify/functions/event-*` and `netlify/functions/stripe-*`.

The dedicated seller app should use bundle identifier `co.nomadicpaws.register`, its own Apple App ID, its own TestFlight listing, and Katie-only access. Do not restore it to the private Creative & Publishing Studio.

See also `docs/event-register-phase-2.md`.
