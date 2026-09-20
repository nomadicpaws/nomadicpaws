# Nomadic Paws Events app

Dedicated Katie-only companion for event planning and mobile sales.

## Current first slice

- Uses the existing protected seller access session.
- Remembers the session in iOS/Android secure storage for its eight-hour lifetime.
- Reads and edits the same shared event calendar as Nomadic Paws Studio.
- Loads test-only product inventory and supports a quantity/cart rehearsal.
- Clearly prevents live charges and leaves checkout disabled until Stripe Terminal is installed and tested in a native build.

## Next native slice

1. Add the preserved local Stripe Terminal package.
2. Connect simulated-reader discovery and test payment processing.
3. Add sale confirmation and inventory reconciliation status.
4. Create the separate Expo project and Apple App ID for `co.nomadicpaws.register`.

Never enable live mode until the explicit launch checklist is complete.
