# Nomadic Paws Admin app

This is the native iPhone control panel for the existing Nomadic Paws website. It is intentionally separate from Decap CMS while continuing to use the website's Netlify backend.

## First milestone

- Secure sign-in using the existing event-register access session.
- Native Trail Journal story cards with readable Draft, Scheduled, and Published states.
- Four-photo Pinterest campaign workspace.
- Live 2:3 previews with Bark, Sage, Cream, and Terracotta logo treatments.
- Small/medium and left/right logo controls.

The next milestone connects photo-library upload and campaign saving to the existing GitHub/Netlify publishing flow. Stripe Terminal then joins the same app after Apple signing and TestFlight are available.

## Apple readiness

The bundle identifier is `co.nomadicpaws.admin`. EAS build profiles are included so a cloud iOS build can be created without owning a Mac once the Apple Developer membership is active.
