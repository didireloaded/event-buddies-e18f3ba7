# Attendee app verification and remaining work

## Implemented in this pass

Private connected crews support creation, invite codes and QR display, joining, owner invite replacement, shared meetings with conflict detection, member lists, leaving and owner transfer. The initial connected model permits one private crew per attendee per event, up to 100 members. Invites expire within seven days or at event end plus two hours.

Members voluntarily share a venue landmark for up to one hour. Expired pins are excluded by the server and client. Ghost Mode removes the local display immediately and queues remote removal. A server generation counter rejects older queued shares after stop. Map markers and member rows open the shared landmark. Crew data refreshes every 15 seconds while the page is visible and on focus/reconnect. This is foreground polling.

Reads and writes use caller-checked database functions. Private tables have RLS and no direct client grants. Commands serialize per authenticated actor and lock the crew row. Action IDs make retries idempotent. Invite attempts have server-side rate limits. Invalid invites and meeting conflicts produce actionable responses. Account changes clear identity-scoped crew caches and pending commands.

Map, Crew, Profile and Info modules load on demand. Offline precaching includes their build chunks. Hidden pages stop periodic crew refreshes to reduce battery/network work.

## Database evidence

Applied `backend/cloud/shared-crews.sql` through the existing Lovable Cloud SQL editor. Ran `verify-shared-crews.sql` against the deployed functions with four transaction-scoped authenticated fixture identities. Assertions passed for creation/join/replay, member-only reads/writes, direct self-join denial, shared meetings, version conflicts, unknown venue rejection, pin expiry and stop revocation, owner transfer, invite revocation/rate limits and final leave. Fixtures were rolled back.

The preceding attendee-preference tests separately verify favourites, private meeting storage and account ownership.

## Feature audit

The archived 220-item ledger contains implemented features, historical alternatives, future proposals and verified-data dependencies. The complete library is not implemented.

- Current browser coverage includes onboarding, event selection/calendar, favourites, artist portraits, map filters/zoom/pinch/pan, place sheets, local meetings, offline ticket copies, offline app routes, photo diary, local QR plans, bingo, profile sheets, day-plan review and account entry.
- Shared crew forms and landmark/Ghost Mode behavior have component tests. The Cloud integration SQL tests exercise the real database with distinct identities.
- Physical-phone account confirmation, Google OAuth, venue accuracy, installed Safari behavior, battery measurements and notification delivery still require device/provider verification.
- Hosted AI responses depend on workspace AI credits. Pending/unavailable responses, review persistence and clearing have controlled tests. Set times, weather forecast, tides, transport schedules, bar menus and ticket entitlement validation depend on verified organiser data.
- Public crew discovery, join requests, moderation, crew chat, emergency delivery, push notifications, payment/ticket validation, geographic GPS calibration, automated retention jobs, server account deletion and organiser publication remain unfinished backend/product work.
- Shared-pin expiry hides access immediately on reads. Scheduled physical deletion of expired database fields is pending. Account deletion through an external admin tool needs an owner-transfer cleanup path before an in-app deletion feature is released.

## Continuation

Run `npm run check` and `npm run test:e2e`. Use the committed Cloud verification scripts after schema changes. Preserve the separate local promoter checkout. GitHub Actions previously failed before launching jobs, so report hosted CI independently of local checks. Continue through the requirements ledger with explicit verification evidence for each implemented slice.

## Catalogue access correction

The internal validation catalogue is now inaccessible through direct anonymous or authenticated reads. The broad read policy was removed. Database validation reads it through a restricted boolean function, while attendee writes retain invoker permissions and owner RLS. See `backend/cloud/private-event-catalogue.sql` and `verify-private-catalogue.sql`.
