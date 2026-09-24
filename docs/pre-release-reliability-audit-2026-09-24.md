# Nomadic Paws pre-release reliability audit

Updated September 24, 2026. This audit covers Nomadic Paws Studio, the Events & Mobile Store app, and the shared server functions used by both apps.

## Release decision

The repaired code is ready for one consolidated deployment and TestFlight verification pass. It is not yet a production release candidate because the server fixes have not been deployed from this working copy and the native changes have not been installed on real iPhones.

## Must fix before daily use

1. Deploy the updated server functions. They contain the media recovery, cash-sale idempotency, UUID validation, and Pinterest fixes.
2. Create new Studio and Events TestFlight builds. The Studio build is required for the real Cheeto Kitty font and native upload/editor changes; the Events build is required for cash retry and timeout handling.
3. Complete the four short real-phone checks at the end of this report.
4. Keep the Events app in test mode until one complete card-reader sale and one cash sale have both produced a receipt and changed inventory exactly once.

## Reliability repairs completed

### Photos and videos

- Normalized common iPhone content-type aliases, including JPG and MOV variations that storage previously rejected.
- Added a clear 30-second timeout rather than allowing requests to spin indefinitely.
- Added automatic recovery paths: smaller photos fall back to the regular uploader, while videos fall back to the existing chunked uploader when a direct cloud upload fails.
- Protected selected media during recoverable failures so the person can retry rather than start the selection again.
- Prevented Back and Cancel from silently abandoning an active Adventure upload.
- Added completion receipts and blob-key checks so a lost response can be retried without creating a duplicate media record.
- Isolated on-device caches by signed-in person so cached content from one team member cannot appear for another.
- Stopped authorization and validation failures from being hidden behind stale cached results.
- Fixed partially created Adventures so their updated title, notes, and location are retained during retry.

### Video Studio and fonts

- Added the real Cheeto Kitty font assets and native font loading.
- Fixed exported overlays to use the selected native font name.
- Removed font choices that looked selectable but were never embedded and therefore exported inconsistently.
- Fixed project reopening so a missing or failed clip download clears the old clip; an unrelated previous video can no longer be exported accidentally.
- Preserved Clean as the safe fallback for older projects that refer to removed placeholder fonts.

### Pinterest workflow

- Fixed the double-watermark path. A Studio-rendered working image is now reused directly instead of receiving a second automatic logo during RSS or CSV preparation.
- Added a regression test for already-edited images.

### Events, payments, and stock

- Fixed the malformed server UUID check that caused valid app-created cash sales to fail with “A new UUID requestId is required for each sale.”
- Made cash sales safely retryable. A response lost after a successful sale returns the original receipt instead of recording a second sale or reducing stock twice.
- Added a stable cash request ID while the cart remains unchanged, and reset it when the cart or payment method changes.
- Added a payment timeout message that tells the seller nothing should be charged until Recent payments is checked.
- Consolidated cash and card request-ID validation into one tested server rule.

## Automated verification

- 49 server and workflow tests pass.
- Studio TypeScript validation passes.
- Events TypeScript validation passes.
- Both Expo production configurations resolve successfully.
- The website and sitemap generator complete successfully.
- The final change-set check found no malformed patch whitespace; only existing Windows line-ending notices remain.

The automated tests cover authentication rules, calendar behavior, event permissions and inventory, Instagram and Journal workflows, media settings and rendering, Pinterest RSS/CSV/video behavior, cloud storage helpers, Stripe signatures, and video projects.

## Can wait until after the dependable release

- Expiring old upload-completion receipts after a retention period. They currently store only small metadata records and are safe, but should eventually be cleaned up.
- Resuming the middle of one individual file after the app is force-closed. Completed items are protected, but an interrupted in-progress file must currently be retried.
- Rich multi-clip trim, split, transitions, and advanced animation controls.
- Restoring additional custom fonts after each one has been converted and embedded as a real font asset.
- Automatic cleanup of abandoned, unprocessed card PaymentIntents.
- Broader search, undo, duplicate-photo matching, and accessibility quality suggestions.

## Remaining real-device limitations

Desktop checks cannot prove Apple Photos/iCloud selection, AVFoundation video rendering, Apple sign-in, iOS share handoff, or Stripe Terminal hardware behavior. These require the consolidated TestFlight pass; they are not evidence of a known failure.

## Four-check TestFlight pass

1. **Studio upload:** Add one iPhone photo and one short MOV in a single Adventure. Let the phone lock once, reopen the app, finish the upload, and confirm both items open from Media.
2. **Video save/reopen:** Create a project with Cheeto Kitty text, save it, fully close the app, reopen the project, and export. Confirm the correct clip, wording, color, timing, and font appear.
3. **Pinterest:** Use one already-watermarked working photo in a campaign. Confirm the preview and generated RSS/CSV image contain one watermark, not two, and retain the intended crop.
4. **Events:** In test mode, complete one cash sale, confirm a visible successful receipt and one stock reduction, then refresh Recent payments and inventory. Separately complete one simulated-reader sale when the reader flow is available.

If all four checks pass, the apps can move to the final App Store/privacy review rather than another feature round.
