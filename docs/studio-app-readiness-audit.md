# Nomadic Paws Studio readiness audit

Updated September 2, 2026 from the original project overview and the current app source.

## What is connected and functional

- Private Apple sign-in with Katie, Trinitie, and CatNana roles, remembered sessions, and device-passcode unlock.
- Personalized Today screens and role-specific navigation.
- Shared Adventure uploads from iPhone Photos, including photos and short videos.
- Shared Media Library with tags, notes, orientation, usage counts, and access for Katie and Trinitie.
- Instagram weekly rhythm, daily readiness, editable drafts, assignment handoff, optional reminder time, five-hashtag rule, Cheeto Assistant suggestions, and native Instagram handoff.
- One-time Trinitie blurry-photo Easter egg and real low-resolution warning.
- Trail Journal Write, Photos, Social, and Publish workflow with local safety copies, synchronized drafts, versions, GitHub publishing, and Netlify status language.
- CatNana anchored passage notes, explicit note-save feedback, return-to-Katie confirmation, changed-passage follow-up, and repeat review rounds.
- Optional Instagram-preview sharing from Trinitie to CatNana.
- Pinterest four-image campaigns, 2:3 treatment previews, logo controls, RSS-first timing, +7/+14/+21 CSV timing, and retroactive campaigns.
- Shared Video Studio projects, iPhone Photos and Media Library video selection, editable overlays, fonts, colors, timing, animated preview, and native rendering/export.
- Shared content calendar and shared preview surfaces.
- Netlify database migrations and production functions. Deployment `75c446a` is published with migrations applied.

## Complete in code, but requiring one real-phone verification pass

- A full Katie → CatNana → Katie → CatNana review cycle with more than one passage note.
- A Trinitie Instagram preview appearing and disappearing from CatNana’s Today screen.
- Instagram handoff opening the correct native share destination with caption and media order intact.
- Video export from both a local Photos clip and a shared Media Library clip.
- Keyboard avoidance and keyboard dismissal on every multiline editor.
- Offline local draft recovery after force-closing and reopening the app.
- Conflict messaging when the same Journal draft is edited from two devices.
- Long titles, larger accessibility text, and the smallest supported iPhone viewport.

## Highest-value remaining Studio work

### Release-critical

1. Finish an end-to-end phone test of every role using real accounts.
2. Add clearer retry actions to any load or synchronization error that currently shows only text.
3. Verify that every handoff can return from Handed Off to Ready when posting fails.
4. Verify media uploads resume or recover cleanly after the network is interrupted.
5. Confirm all finished exports have predictable filenames and remain re-downloadable.
6. Complete the App Store privacy, permission, screenshot, support, and review-note material.

### Important after the first dependable release

- A richer Content Seed relationship map showing every platform adaptation together.
- Search and filters spanning platform, person, status, trail, product, event, and date.
- Undo for assignment, crop, ordering, and schedule changes.
- Automated broken-link, disclosure, sensitive-location, and schedule-relationship checks.
- Smarter duplicate-photo and higher-quality-original matching.
- Multi-clip trim, split, and reorder tools in Video Studio.
- Stronger safe-zone, contrast, text-size, and rapid-flash checks.
- Dark mode for photo and video work.

## Deliberately separate or deferred

- The Event Register is no longer part of Studio navigation or Studio permissions. Its implementation and backend map are preserved for a dedicated seller app under `future-event-register/` and the existing `event-register/` web app.
- Event planning, inventory, Cheeto Event Kit, feeding modes, and reconciliation belong to the later events/business app layer.
- Automatic posting is not required for the first Studio release. Instagram, TikTok, and YouTube use native handoff; Pinterest retains RSS and CSV.
- CEO Lock remains a future playful desktop feature.

## Credit-conscious build plan

No TestFlight build should be started for one isolated visual fix. Work is grouped into batches:

1. **Current no-build batch:** backend verification, audit, error-state cleanup, Register separation, and test checklist.
2. **Next consolidated TestFlight build:** all release-critical interface fixes plus the CatNana/Trinitie handoff workflow.
3. **One correction build if needed:** only failures found through the complete three-person phone checklist.
4. **Release candidate build:** App Store metadata and final native configuration only after the correction pass is clean.

Expo usage should be checked immediately before each planned build because credits and billing periods are account state, not a reliable number to hard-code in this document.

