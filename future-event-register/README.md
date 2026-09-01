# Nomadic Paws Event Register

The event register is intentionally separated from the Studio navigation as of September 2026.

Its working implementation remains preserved in `native-app/App.tsx` (`EventRegister`), the Stripe Terminal vendor source remains under `native-app/vendor/stripe-terminal-react-native`, and the server endpoints remain under `netlify/functions/event-*` and `netlify/functions/stripe-*`.

When the dedicated seller app is created, move that preserved component into its own Expo project with bundle identifier `co.nomadicpaws.register`. Do not restore it to the private Creative & Publishing Studio.

See also `docs/event-register-phase-2.md`.

