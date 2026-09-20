# Nomadic Paws Events app

Dedicated Katie-only companion for event planning and mobile sales.

## Current first slice

- Uses the existing protected seller access session.
- Remembers the session in iOS/Android secure storage for its eight-hour lifetime.
- Reads and edits the same shared event calendar as Nomadic Paws Studio.
- Loads test-only product inventory and supports a quantity/cart rehearsal.
- Includes the preserved Stripe Terminal native module, simulated-reader discovery, protected test PaymentIntents, sale confirmation, and inventory refresh.
- Remains hard-locked to test mode by the server; no live card can be charged.

## Next native slice

1. Create the separate Expo project and Apple App ID for `co.nomadicpaws.register`.
2. Verify the Netlify test variables and Stripe Terminal test location.
3. Build one native TestFlight version and run a complete simulated-reader sale.
4. Add the physical reader only after simulated sales and inventory reconciliation pass.

Never enable live mode until the explicit launch checklist is complete.
