# Attendee accounts and day plans

## Connected backend

The existing Lovable Cloud project is enabled. Its reference is `ynxkniraobmlvbtaaptk`. Schema setup was applied through the project's Cloud SQL editor on 17 November 2026. Lovable's builder rejected the provisioning message because its workspace had no credits, so the existing Cloud SQL editor was used.

`backend/cloud/attendee-sync.sql` is the additive, rerunnable schema source. It preserves the managed integration files and migration directories. Apply schema updates using Lovable Cloud. The public catalogue contains the source event's 25 artist IDs, 41 place IDs and published event hours. Extend this catalogue from verified event data when another event is added.

## Data ownership and sync

Signed-in attendees save favourite artist IDs and their current private meeting plan per account and event. The existing meeting model has one current plan. Authentication uses the managed Supabase client and existing sign-in route. RLS checks `auth.uid()` for every private row. The write function derives identity from the session and runs with invoker permissions.

Changes are queued durably per action in browser storage. Favourite edits use explicit saved/removed values. Meetings use the last change accepted by the server. The server locks each attendee/event row and records action IDs in the same transaction, so retrying a timed-out action applies once. Clients reconcile on entry, focus, reconnect and every 30 seconds while mounted. Failed requests time out and remain queued for retry. Account settings show pending, offline and failed states.

Guest saves require an explicit review/import after sign-in. Switching accounts clears the previous account's cached selection and queued changes. Sign-out warns before discarding queued changes. Photo storage and ticket copies remain local browser resources.

## Day-plan behavior

The Lineup action uses the existing server-side Lovable AI Gateway. It takes favourite IDs and a meeting, resolves facts against real stages and points, and clamps unverified set times to pending. Empty, loading, failure/retry, review and Clear plan states are implemented. Suggestions persist in the current device's attendee storage. The suggestion is private and does not deliver a meeting invitation to a crew.

## Configuration

Use the public variables documented in `.env.example`. Lovable already supplies these in its environment. Local configuration belongs in ignored `.env.local`. Keep gateway credentials in server Secrets. No privileged database key is required by the attendee client.

## Verification on 17 November 2026

- Deployed database checks passed for catalogue counts, valid meeting, unknown artists/places and outside-hours rejection.
- `backend/cloud/verify-attendee-sync.sql` passed in Cloud. Its transaction rolled back fixture identities and records. It asserts cross-account read/insert/update/delete denial, per-account action IDs, idempotent replay and independent artist edits.
- Anonymous REST access can read the public catalogue and is denied access to private preferences and action records.
- Local hook tests exercise account restoration in a second simulated session, sign-out cache separation and offline/reconnect replay with mocked transport.
- Real email confirmation, Google OAuth and two physical phones have not been exercised. Database RLS tests and simulated sessions provide separate evidence for their respective layers.
- AI completion against the hosted gateway remains dependent on workspace AI credits. Loading, error/retry, local result persistence and clearing are tested with controlled responses. Test fixtures are labelled.

## Remaining backend work

Shared crew groups, invite authorisation, member roles, realtime crew updates, location sharing, emergency alert delivery, organiser tenancy and publication workflows remain separate backend slices. The current account meeting is private to its owner. The local promoter workspace is outside this branch.
