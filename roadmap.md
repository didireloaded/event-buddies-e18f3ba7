# Event Buddies upgrade

## Current scope: Phase 1 — restrained Welcome, Auth and Discover
- [x] Dark scoped global surfaces, photographic welcome, accessible interest selection and Discover presentation.
- [x] Confirm-password validation, confirmation resend cooldown and preserved account return paths.
- [x] Audit hosted signup and apply only missing discovery columns/public-read exclusions.
- [x] Focused tests, rendered mobile/desktop checks and documentation; stop before Phase 2.
- [ ] Inbox confirmation/reset and live OAuth round-trips: requires a reachable owner inbox and provider interaction; physical iOS unavailable.
- [ ] Full regression gate: existing realtime-pins assertion fails and template-editor times out under suite contention; deferred event systems unchanged.
- [x] Repair signup/sign-in/recovery/confirmation states; hosted email enabled, public signup allowed, confirmation required and Google enabled.
- [x] Global multi-select interests, explicit account/guest choice, Discover handoff; preserve direct links and returning users.
- [x] Focused tests and mobile guest/event-entry/error verification; report remaining live checks separately.
- [x] Temporary confirmed account restored in browser; signed-in Discover verified.

The upgrades below are deferred; do not change event tools in this authentication pass.

Design: preserve the current coastal-teal iOS language, real photography, readable touch controls and four attendee tabs. Priorities: tickets at the gate, finding a place, coordinating a private crew. Preserve hash navigation and guest/offline access.

- [ ] Sticky Event Hub ticket action bar and full-screen white multi-ticket gate viewer with local offline storage.
- [ ] Manual General / VIP / All-access selection and honest venue access guidance.
- [ ] Home photo, featured performers, compact crew strip and exactly four Essentials actions; remove duplicate utility rows.
- [ ] Stage-grouped lineup, organiser headliner flags and stage/map links.
- [ ] Private crew avatar strip and direct share/QR/code invitations.
- [ ] Full venue-plan fit, touch gestures and category-specific place sheets.
- [ ] Explicit single-shot GPS consent, Ghost Mode, freshness and authorised crew pins; no uncalibrated GPS dot.
- [ ] Four organiser tabs, draft review and enforced publishing criteria.
- [ ] Mode-aware Home ordering and visual self-reported passport stamps.
- [ ] Tests, mobile/desktop flow verification and documentation; record physical-phone limitations.