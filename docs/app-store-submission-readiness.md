# Nomadic Paws Studio App Store submission readiness

Internal preparation notes for the private Creative & Publishing Studio.

## Native permissions currently used

- **Photos read access:** select Cheeto photos and videos from Apple Photos/iCloud Photos for private Studio work.
- **Photos add access:** save finished images and videos for Instagram, TikTok, or YouTube handoff.
- **Notifications:** optional gentle Instagram-readiness reminder. The user chooses whether to enable it.
- **Device authentication:** unlock a remembered private session with the iPhone’s configured Face ID or device passcode.
- **Sign in with Apple:** individual Katie, Trinitie, and CatNana accounts.

Studio no longer requests Stripe Reader Bluetooth, local-network, or location permissions. Those belong only to the future separate Event Register app.

## App privacy answers to verify in App Store Connect

The final answers must match the production services at submission time. Expected categories based on the current implementation:

- Account identifier and email supplied through Sign in with Apple, used for authentication and team access.
- User-generated content: private drafts, captions, review notes, photos, videos, templates, and project metadata.
- Optional Instagram post URLs are stored only as private archive metadata; the app does not require Meta login or publish through Instagram APIs.
- Optional precise/private location typed into an Adventure note. This is user-entered content; the app does not request device location and does not publish it automatically.
- Diagnostics should be declared only if Expo, Apple, Netlify, or another enabled production service collects them in the submitted build.
- No advertising tracking and no sale of user information.

Review the actual App Store privacy questionnaire rather than copying these notes blindly; Apple’s wording and service behavior can change.

## Material to prepare before submission

- App icon and final display name: Nomadic Paws.
- Support URL on `nomadicpaws.co` with a working contact path.
- Privacy-policy URL describing the private team app, Apple sign-in, cloud media, drafts, and deletion/contact process.
- App Store description that clearly identifies this as Nomadic Paws’ private creative and publishing workspace.
- iPhone screenshots showing Today, Media Library, Trail Journal, Instagram Studio, Pinterest, and Video Studio without private draft information.
- App Review notes explaining that reviewer access is required and providing a safe review account or Apple-approved alternative when submission begins.
- Verification that no screen, permission string, or review note describes the removed Event Register.
- Final test of account revocation, sign-out, remembered sign-in, and device-passcode unlock.
- Final test that the optional Journal backup uses the iOS share sheet and does not transmit Google credentials through Nomadic Paws services.

## Release gate

Do not submit merely because a build processes successfully. Submit after the three-person TestFlight checklist passes and the privacy/support URLs are public and accurate.
