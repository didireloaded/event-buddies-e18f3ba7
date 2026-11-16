# Cloud integration brief

## Scope and evidence

Prepared 16 November 2026 from the supplied backend, feature, integration and toolkit references. This is a build contract for the next Cloud pass. Cloud client settings remain deferred by the owner. Schema work belongs in Lovable under the repository’s managed-database rules.

The current app uses TanStack Start, React, Vite, local attendee preferences, IndexedDB photos and a static venue plan. Navigation, onboarding, artist photos, QR exchange, local meetup planning and local recap export already exist. The older feature inventory’s claim that the app has no navigation or map describes another snapshot. Check current source before scheduling replacements.

Sound of Summer is the verified one-day event on 28 December 2026, 12:00–23:00 CAT. Set times and GPS calibration remain unpublished. The supplied three-day examples, attendance counts, ETAs and next-edition dates are illustrative.

## Supplied references

- [Backend architecture proposal](references/backend-proposal.md)
- [Complete feature reference](references/complete-feature-reference.md)
- [Integration prompt sequence](references/integration-prompt-sequence.md)
- [Third-party toolkit](references/third-party-toolkit.md)
- [Existing launch gates and verification](launch-readiness.md)

Source documents are preserved as supplied. The implementation decisions below resolve their conflicting examples. Provider prices, latency figures, capacity thresholds and SDK-version claims require verification at implementation time.

## Decisions

1. Use the existing Lovable Cloud/Supabase connection for identity and shared crew records. Guest use and the cached event must remain available during authentication failure or absent connectivity. Create anonymous sessions when connectivity permits, reuse existing sessions, and link accounts later without replacing the user’s identity or local plans.
2. Reuse the authentic static venue plan, `qrcode.react`, `jsqr`, accessible sheets and local canvas exports. Install a dependency when its vertical slice needs it. Geographic tiles require a verified venue calibration and a provider configuration before they can support accurate venue positions.
3. Postgres owns shared membership, meetings, timestamps and accepted messages. IndexedDB owns the durable client outbox and cached copies. TanStack Query reflects these records. Use one replay owner for each action so an outbox worker and persisted paused mutation cannot submit the same action independently.
4. Durable writes commit through authenticated operations before database-triggered crew broadcasts. Private topics and membership-scoped Realtime authorization protect subscriptions. Re-fetch authorised records after reconnect because broadcast events can be missed. Presence describes connection state only. It cannot establish that someone is physically at a stage.
5. Use expiring landmark pins first. A future optional geographic pin requires explicit consent, coordinate validation, reported accuracy and a calibrated presentation. Rounded coordinates alone provide no guarantee of a precise distance or walking route.
6. Keep push, telemetry, server-generated social cards and paid services as separate integrations with named acceptance tests and account configuration. Core coordination remains usable when notifications are denied or unavailable.

## Seven corrections required before copying the prompts

| Issue                                                                                   | Severity | Implementation requirement                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Self-membership INSERT checks only `user_id = auth.uid()`                               | P0       | A server operation must validate the invite and create membership atomically. Direct self-insertion into an arbitrary crew must fail.                                                                           |
| Crew members receive broad pin/message mutation rights                                  | P0       | Reads require current crew membership. Writes bind the actor to the authenticated author, constrain mutable fields and enforce role-specific crew administration. Reassigning author or crew must fail.         |
| Joining, creator membership, leave and final-member deletion are separate client writes | P1       | Use transactions with idempotency and appropriate locking. Creation commits crew and creator together. Define owner transfer and concurrent joins/leaves.                                                       |
| Location is made permanent inside chat and stale queued pins can be replayed            | P0       | Chat references an expiring location record. Ghost Mode cancels queued shares and sends an idempotent stop action when connected. Old queued shares cannot revive after stop, expiry or a membership change.    |
| Both a Dexie outbox and paused TanStack mutations replay writes                         | P1       | The outbox owns replay. Every action has a stable ID scoped to actor and action type. The server records deduplication and the accepted result atomically with the mutation.                                    |
| Service worker examples cache authenticated API responses generically                   | P0       | Keep authenticated API traffic network-only in the worker. Cache authorised data in an identity-scoped application store, remove it on logout/account change and discard data when membership is revoked.       |
| Push endpoint accepts arbitrary recipient and message fields                            | P0       | The server derives permitted recipients from current crew membership, validates the event and actor, applies rate limits and issues narrowly defined notification types. Provider credentials stay server-side. |

## First Cloud vertical slice

### Surface and states

Crew and invite entry points cover empty, checking-session, loading-preview, populated, invalid-code, expired-invite, denied-access, offline, retry and confirmed-success states. Existing local QR plan imports remain available independently of connected crew membership.

### Data and authorisation

- Profiles retain the authenticated UUID, display name and existing music/friends/both preference vocabulary. Migrate terminology explicitly if the database uses social instead of friends. Self-editable profile fields cannot grant roles.
- Crews reference the event. Membership has a unique crew/user pair and an explicit role. Profile visibility exposes only the fields needed by current fellow members.
- Invite credentials have server-generated entropy, server-side expiry, revocation and server-side attempt limits. Store a verifier separately from general crew reads. Limit the unaffiliated preview to the information intentionally shared with invite holders.
- Meetings reference stable venue-point IDs, include the event and crew, and validate the saved time against current event hours. Use version checks to prevent silent concurrent overwrites.
- Every exposed table receives RLS and deliberately scoped grants. UPDATE requires appropriate SELECT, USING and WITH CHECK policies. Avoid self-referential membership policy recursion. Privileged helpers require restricted execution, a fixed search path and explicit caller checks.
- Offline clients retain their local name and plans. Linking to a session offers a reviewable import with stable IDs. Clearing local data remains independent of server deletion until a connected deletion flow exists.

### Entry flow

1. A named attendee creates a crew using one name field. The server commits the crew, owner membership and invite result atomically.
2. The invite sheet offers share, QR and copy-code actions based on the returned invite. An offline-created local plan is labelled as a local plan until the server confirms crew creation.
3. A friend opens the invite, sees an authorised preview, supplies a name if needed and confirms joining. Route handling follows the installed TanStack router and existing hash/deep-link conventions.
4. Members create or update a meeting through authenticated validation. The UI confirms the accepted result, reconciles reconnects and displays any queued or conflicting action explicitly.

### Done when

- Two independent browser sessions can create/join one crew and read the same accepted meeting.
- A third non-member cannot read or change crew, membership, meetings, pins or messages by guessing IDs or subscribing to topics.
- An invite holder cannot self-insert membership through direct table access. Expired, revoked and rate-limited invites receive recoverable UI.
- Repeated submissions and a lost response followed by retry create one logical result. Concurrent create/join/leave operations preserve membership invariants.
- Offline guest entry retains the cached map and local plan. Reconnect imports or retries without changing identity silently or duplicating meetings.
- Clearing or switching sessions removes identity-scoped cached crew data. Membership revocation blocks future reads and writes, including reconnects.

## Pin and realtime follow-up

Use a unique crew/user key for the latest pin and an atomic upsert. Server checks bind ownership, membership, coordinate or landmark validity, and expiry. The expiry is bounded by the share’s original lifetime and the effective event end plus two hours. Reject expired queued requests instead of granting a fresh hour at reconnect. Clients hide expired records immediately, while scheduled cleanup removes storage copies.

Stopping sharing increments a server-recognised sharing generation or equivalent revocation state. Reject earlier-generation queued shares. If offline, show that local sharing has stopped and that remote removal is waiting for connectivity. The remote copy retains its original visible expiry. Keep crew chat and read subscriptions usable while location sharing is off.

Authorise `crew:<id>:pins` and `crew:<id>:chat` topics against current membership with `private: true` and policies on `realtime.messages`. Database-triggered events should use INSERT, UPDATE and DELETE payloads correctly, and expose only the permitted fields. Channel access is evaluated and cached during connection, so design and test membership revocation for already-connected clients as well as new subscriptions. A private topic name alone does not implement revocation.

## Toolkit-specific requirements

- OneSignal setup requires a verified current SDK/API, identity verification for external-user association, explicit permission and authorised server sends. A location privacy toggle stops location writes independently of the notification opt-in. Sending to the provider confirms provider acceptance only.
- Reuse the working QR implementation and manual-code fallback. QR generation works offline. Joining a server crew through a QR invite requires a connection. Keep those outcomes distinct in labels.
- Keep the existing local recap PNG export. A future server card uses authorised record IDs, validates remote asset sources, limits payload size and avoids public caching of private crew data. Share private files through supported native file sharing or access-controlled expiring URLs. Social-graph previews and vertical Story assets have different aspect ratios.
- PostHog and Sentry require selected projects and privacy settings. Avoid names, message bodies, invite credentials, raw location, session replay and uncontrolled DOM autocapture. Client DSNs/project tokens are public configuration. Source-map upload credentials are server/CI secrets.
- RevenueCat requires an actual paid offer and server-verified entitlements. Twilio/SendGrid require an approved communication use case and provider configuration before integration.
- Redis geospatial sorted-set members do not gain automatic individual expiry from key TTL. Any future Redis layer needs a deliberate member-expiry design. Use measured load and provider limits before adding a second backend.

## Verified documentation anchors

Supabase recommends private channels with RLS on `realtime.messages`, and documents topic- and extension-scoped access policies. It also states that channel policy checks are cached for the connection and refreshed on reconnection or a new JWT. These details inform the authorisation and revocation tests above. [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization)

The current Realtime guide recommends Broadcast for most use cases, Presence for online state and Postgres Changes for small connected-user workloads. Prefer private database-triggered Broadcast for this app’s planned shared crew features. Exact capacity and cost require measurement against the selected project. [Realtime getting started](https://supabase.com/docs/guides/realtime/getting_started)

The changelog index was checked on 16 November 2026. Its CLI v3 breaking-change entry reinforces checking the installed CLI before running deployment commands. Schema changes must still follow this repository’s Lovable-managed workflow. [Supabase changelog](https://supabase.com/changelog)
