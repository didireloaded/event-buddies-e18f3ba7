Here's a concrete, buildable implementation plan for the repo, mapped to the priority order we agreed on. I'll cover **schema changes (Drizzle), API contracts, component breakdown, and sequencing** for each phase. Where it helps, I'll show actual code shapes so you can drop them into the existing structure.

---

## Phase 0 — Prep (½ day)

- Add `.env.example` with `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `POSTHOG_KEY`.
- Add `drizzle.config.ts` if missing + npm scripts: `db:generate`, `db:migrate`, `db:seed`, `db:studio`.
- Add `tests/` with Vitest + Playwright; wire GitHub Actions (lint, typecheck, test, build).
- Add `src/lib/env.ts` using `zod` to validate env at boot.
- Replace hard-coded demo UUIDs in `src/lib/demo-data.ts` with a seed script that is **idempotent but real** (still seeded, but via proper accounts with real auth rows).

---

## Phase 1 — Auth + Real Event Join *(makes it a product)*

### Schema (new tables)

```ts
// src/db/schema.ts — additions
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  name: text("name"),
  image: text("image"),
  handle: text("handle").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  // ... standard Auth.js columns
}, (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) }));

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }));

// Event join access — replaces the demo assumption that everyone is in one event
export const eventAccess = pgTable("event_access", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("attendee"), // attendee | staff | organiser
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("event_access_user_event").on(t.userId, t.eventId) }));

// Add to events table
// joinCode: text("join_code").unique(), publicListing: boolean("public_listing").default(true)
```

### API

- **Auth.js v5** (NextAuth) with Drizzle adapter: `src/app/api/auth/[...nextauth]/route.ts`.
  - Providers: Email magic link (Resend), Google, Apple.
  - `src/lib/auth.ts` exports `auth()`, `signIn()`, `signOut()`.
- `POST /api/events/join-by-code` → `{ code }` → creates `eventAccess` row, returns event summary.
- `GET /api/events/mine` → events the user has access to.
- `GET /api/events/discover?city=&from=&to=&q=` → public events.
- Rewrite `/api/demo-actions` and `/api/organiser-actions` to derive `userId` from session, not from client payload.

### Components

```
src/components/auth/
  ├── SignInModal.tsx           // tabbed email/SSO
  ├── UserMenu.tsx              // avatar, settings, sign out
  └── AuthGuard.tsx             // wraps server components, redirects to /signin
src/components/events/
  ├── JoinEventModal.tsx        // code entry + camera scanner
  ├── EventDiscoveryGrid.tsx
  ├── EventCard.tsx
  └── MyEventsSwitcher.tsx      // multi-event context switcher in nav
src/app/(auth)/signin/page.tsx
src/app/(app)/discover/page.tsx
src/app/(app)/e/[eventSlug]/page.tsx   // replaces / as the home surface
```

### Notes

- Add `middleware.ts` for route protection on `/e/*`, `/organiser/*`.
- Session context via `SessionProvider` (client) + `auth()` (server).
- Guest bootstrap: a `POST /api/guest` that creates a throwaway user + signed cookie so a QR-scan flow doesn't require signup. Upgrade path: "claim your account" prompt.

---

## Phase 2 — Offline-First + Push *(survives a festival)*

### Schema

```ts
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("push_sub_unique").on(t.userId, t.endpoint) }));

// Every state change is versioned for delta sync
export const eventRevisions = pgTable("event_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  revision: bigint("revision", { mode: "number" }).notNull(),
  changeType: text("change_type").notNull(),        // performance | stage | announcement | mapPoint
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Client architecture

```
public/sw.js                       // Workbox service worker
src/lib/offline/
  ├── db.ts                        // idb wrapper; caches: events, schedule, mapPoints, crew
  ├── syncQueue.ts                 // outbox of user actions with clientActionId (idempotency)
  ├── syncEngine.ts                // flushes queue on 'online', exponential backoff
  └── cache.ts                     // cache-first for map tiles, SWR for schedule
src/components/offline/
  ├── OfflineBanner.tsx
  ├── SyncIndicator.tsx            // "3 actions pending"
  └── ConnectivityProvider.tsx
```

### API

- `POST /api/push/subscribe` → `{ subscription }` → upsert row.
- `POST /api/push/unsubscribe`.
- `GET /api/events/:id/changes?since=<revision>` → deltas for SWR.
- `POST /api/sync` → `{ actions: OutboxAction[] }` → each action has `clientActionId`; server dedupes by `(userId, clientActionId)` in a `syncedActions` table. Returns per-action `{ status, result }`.

### Push delivery

- `src/lib/push/send.ts` — uses `web-push` with VAPID keys.
- Triggers: schedule change on followed artist, announcement targeted at user's stage, crew ping, meeting point created, reminder due.
- Prefer **data-only pushes** with a service worker handler for composability.

### Notes

- Add `next-pwa` or a manual Workbox config.
- Do **not** cache the POST APIs — cache GETs only.
- Add a `syncedActions` table with a TTL cleanup job.

---

## Phase 3 — Friend Graph + Privacy-Controlled Location *(the core promise)*

### Schema

```ts
export const friendships = pgTable("friendships", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: uuid("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  addresseeId: uuid("addressee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending | accepted | blocked
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
}, (t) => ({ uniq: uniqueIndex("friend_pair").on(t.requesterId, t.addresseeId) }));

export const locationShares = pgTable("location_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  crewId: uuid("crew_id").references(() => crews.id, { onDelete: "cascade" }), // null = all friends
  visibility: text("visibility").notNull().default("precise"), // precise | approximate | off
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  accuracyM: integer("accuracy_m"),
  heading: doublePrecision("heading"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("share_user_event_crew").on(t.userId, t.eventId, t.crewId) }));

export const locationConsents = pgTable("location_consents", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull(),
  version: text("version").notNull(), // consent text version
});
```

### API

- `POST /api/friends/requests` → `{ addresseeHandle }`.
- `POST /api/friends/requests/:id/accept|decline`.
- `DELETE /api/friends/:userId`.
- `POST /api/friends/block/:userId`.
- `GET /api/friends` → list with presence.
- `PATCH /api/location` → `{ lat, lng, accuracy, heading }` — only writes if a non-paused `locationShares` row exists and consent is present. Upserts and fans out to subscribers via pub/sub.
- `POST /api/location/controls` → `{ visibility, crewId?, expiresInMinutes?, pause }`.
- **Real-time**: `GET /api/location/stream` (SSE) or a WebSocket at `/ws` with a Redis adapter. Server filters friends based on crew/privacy.

### Components

```
src/components/friends/
  ├── FriendList.tsx
  ├── FriendRequestInbox.tsx
  ├── AddFriendSheet.tsx         // handle search + QR + contact sync (native only)
  ├── FriendQR.tsx               // renders + scanner
  └── BlockedUsers.tsx
src/components/location/
  ├── CrewMap.tsx                // replaces static dots
  ├── FriendDot.tsx              // bearing cone, last-seen, distance
  ├── PrivacyPanel.tsx           // ghost mode, timer, per-crew scope
  ├── MeetingPointPin.tsx
  └── useFriendPresence.ts       // SSE/WS hook
src/app/(app)/e/[slug]/crew/page.tsx
```

### Notes

- Use **PostGIS** (`geography(Point,4326)`) for `lat/lng` — enables `ST_DWithin` for "friends within 200m."
- Server must **never** return a friend's precise dot if their `visibility = 'approximate'` — round to 100m grid and add jitter.
- Enforce `expiresAt` in a cron (or check on read) — hide expired shares.
- Consent must be recorded before any location write; UI should block "Find my friends" until granted.

---

## Phase 4 — Schedule Utility *(clash detection, calendar, reminders)*

### Schema (extend `userScheduleItems`)

```ts
// additions
reminderAt: timestamp("reminder_at", { withTimezone: true }),
reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
```

### API

- `POST /api/schedule/:performanceId` (toggle) — exists, add server-side clash check returning `{ conflict: performanceId[] }`.
- `POST /api/schedule/:performanceId/reminder` → `{ minutesBefore }`.
- `GET /api/schedule/export.ics?eventId=&token=` — tokenized so Calendar apps can refetch when schedule changes.
- `GET /api/schedule/now-next?eventId=` — what's on now and next near the user.
- `GET /api/artists/:id` → bio, genres, links, preview URL.

### Components

```
src/components/schedule/
  ├── ScheduleGrid.tsx           // adds conflict highlighting
  ├── ConflictBanner.tsx
  ├── ReminderPicker.tsx
  ├── CalendarExportButton.tsx
  ├── NowNextCard.tsx
  └── ArtistSheet.tsx
```

### Notes

- Reminder delivery: cron via **Vercel Cron** / a `pg_cron` job scanning `reminderAt <= now() AND reminderSentAt IS NULL` → push.
- ICS token = signed JWT containing `userId+eventId+scheduleVersion`, so schedule edits invalidate the feed.

---

## Phase 5 — Organiser Tools *(two-sided value)*

### Schema

```ts
export const eventMembers = pgTable("event_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // owner | admin | stage_manager | comms | readonly
}, (t) => ({ uniq: uniqueIndex("event_member").on(t.eventId, t.userId) }));

// extend event_announcements with targeting + priority
// targetType: all | stage | vip | geofence | crew
// targetId: uuid | null
// priority: info | warning | emergency
// geofenceLat/Lng/RadiusM
```

### API

- `POST /api/organiser/events` → create event.
- `POST /api/organiser/events/:id/members` → invite by email + role.
- `PUT /api/organiser/events/:id/schedule` → bulk replace/update (drag-drop), validated with Zod, conflict-detects, bumps `eventRevisions`.
- `POST /api/organiser/events/:id/announcements` → `{ priority, targetType, targetId, geofence?, title, body }`. Server fans out via push.
- `GET /api/organiser/events/:id/analytics` → aggregate queries.
- `POST /api/organiser/events/:id/announcements/:id/pin`.

### Components

```
src/components/organiser/
  ├── ScheduleBuilder.tsx        // drag-drop with dnd-kit, time grid
  ├── AnnouncementComposer.tsx   // target picker + priority + preview
  ├── MembersTable.tsx           // RBAC management
  ├── AnalyticsDashboard.tsx
  ├── MapEditor.tsx              // drop POIs
  └── IncidentInbox.tsx          // for Phase 6
```

### Notes

- Enforce RBAC in a `requireEventRole(eventId, [roles])` server helper used in every organiser route.
- Every mutation should insert an `auditLogs` row (table already exists).
- Schedule builder must handle **live updates**: when an organiser drags a set, bump revision → fans out via push to affected users' schedules.

---

## Phase 6 — Safety + Accessibility + Moderation *(trust)*

### Schema

```ts
export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),           // medical | security | harassment | lost_child | other
  severity: text("severity").notNull().default("normal"),
  status: text("status").notNull().default("open"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  description: text("description"),
  anonymous: boolean("anonymous").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // message | user | announcement
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### API

- `POST /api/sos` → `{ eventId, lat, lng }` → creates incident, pushes to organiser + nearby crew, rings a distinct push type.
- `POST /api/incidents` → form submission (anonymous allowed).
- `POST /api/reports` → moderation queue.
- `POST /api/users/:id/block` — reuse friendships table with `status='blocked'`.

### Components

```
src/components/safety/
  ├── SOSButton.tsx              // long-press, haptic + countdown
  ├── IncidentReportSheet.tsx
  └── EmergencyInfoCard.tsx      // exit + medical on map
src/components/moderation/
  ├── ReportButton.tsx
  ├── BlockList.tsx
  └── (organiser) ModerationQueue.tsx
```

### Accessibility

- Add `eslint-plugin-jsx-a11y`, `axe-core` in Playwright.
- Focus trap + roving tabindex on modals, map controls, schedule grid.
- **Do not** rely on color alone: add icon + text on map POIs and conflict warnings.
- Respect `prefers-reduced-motion` in map fly-to and animations.
- All new interactive controls need ARIA labels; add a skip-to-content link.
- Announce live changes via an `aria-live="polite"` region ("Schedule updated: Main Stage 20:00 → 20:30").
- Add dark mode (`class="dark"` toggle + `prefers-color-scheme`).

---

## Phase 7 — Native + Widgets + Analytics *(retention)*

### Native

- Wrap the Next.js app with **Capacitor** for fastest path, or go **Expo** if you want real background location and reliability.
- Required native capabilities: background location, push (APNs/FCM), Bluetooth beacons (optional), haptics, camera QR scanner.
- Widgets: iOS WidgetKit (next set + crew count), Android Glance equivalent. Data source: a small JSON endpoint `/api/widget/state`.

### Analytics

- **PostHog** for product analytics (funnels, session replay disabled for privacy on map screens).
- **Server events**: `event_joined`, `schedule_item_added`, `crew_created`, `sos_triggered`, `announcement_opened`.
- Aggregated metrics surfaced to organisers via Phase 5 analytics endpoint.

### Feature flags

- Simple `flags` table keyed by user cohort, or use PostHog Flags from day one. Gate new organiser tools and native-only features.

---

## Cross-cutting concerns to bake in as you go

- **Rate limiting**: Upstash Redis + `@upstash/ratelimit` middleware on all POST routes (especially `/api/sos`, `/api/announcements`, `/api/reports`).
- **Idempotency**: `clientActionId` on all attendee mutations (needed for offline queue).
- **Audit logging**: use existing `auditLogs` table for every organiser mutation and every SOS.
- **Data export & deletion**: `GET /api/me/export`, `DELETE /api/me` (GDPR).
- **Timezones**: store UTC, render with event tz — send tz from client on write.
- **Structured errors**: shared `ApiError` type + `handleRoute(fn)` wrapper for uniform `{ error: { code, message } }` responses.
- **Testing gates**: any schema migration needs a test; any new API route needs a Zod schema + happy-path + auth-failure test.

---

## Suggested 6-sprint plan (2-week sprints, one dev)

| Sprint | Deliverable |
|---|---|
| **S1** | Phase 0 + Auth + real event join |
| **S2** | Offline shell + IndexedDB cache + push subscriptions |
| **S3** | Friend graph + privacy-controlled real-time location |
| **S4** | Clash detection + reminders + calendar export + Now/Next |
| **S5** | Organiser RBAC + schedule builder + targeted announcements |
| **S6** | SOS + moderation + accessibility pass + analytics |

Ship a **preview to real users at end of S3** — that's the earliest point the core promise ("I can see my friends on the map") is real, and it's the single best validation checkpoint.

---

## Concrete files to create first (if you want a starting point)

```
src/db/schema.ts                    // add: users, accounts, sessions, verificationTokens,
                                    //      eventAccess, friendships, eventMembers,
                                    //      locationShares (extend), locationConsents,
                                    //      pushSubscriptions, eventRevisions, incidents, reports
src/lib/auth.ts                     // NextAuth v5 config
src/lib/requireRole.ts              // RBAC helper
src/lib/apiHandler.ts               // typed route wrapper
src/app/api/auth/[...nextauth]/route.ts
src/app/api/events/join-by-code/route.ts
src/app/api/friends/requests/route.ts
src/app/api/location/route.ts
src/app/api/sync/route.ts
src/app/api/push/subscribe/route.ts
src/middleware.ts
public/sw.js
```

If you want, tell me which phase you want to start with and I'll write the **first 2–3 files verbatim** (schema block, auth config, and the friend-request route) so you can drop them in and run `db:generate`.
