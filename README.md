# Event Buddies

Event Buddies is a mobile-first event companion PWA for attendees and a private event-management workspace for organisers.

## Architecture & What Is Built

### 1. Real-Time Crew Pin Pipe (`crew:{id}:pins`)

- **`public.pins` Table & Row-Level Security (`backend/cloud/realtime-pins.sql`):** Stores active crew pins (`id`, `event_id`, `crew_id`, `user_id`, `display_name`, `point_id`, rounded venue-plan `x`/`y`, optional rounded GPS `lat`/`lng`, `created_at`, `expires_at`) isolated by crew membership.
- **`drop-pin` Edge Function & RPC (`supabase/functions/drop-pin/index.ts`, `public.drop_pin`, `public.remove_pin`):** Rounds venue-plan coordinates to 1 decimal place and optional single-shot `navigator.geolocation` coordinates to 4 decimal places (~11 m), enforces a 60-minute expiry capped at event end + 2 hours, and upserts into `public.pins` and `public.attendee_crew_members`.
- **Realtime Broadcast Trigger (`public.broadcast_crew_pin_change`):** Broadcasts `pin:upserted` on insert/update and `pin:removed` on delete to the private topic `crew:{crew_id}:pins` (`realtime.send(..., true)`), backed by `realtime.messages` RLS policies.
- **Client Subscription (`src/lib/crew/pins.ts`, `src/lib/crew/use-crew.ts`):** Subscribes to `crew:${crew.id}:pins` with `{ config: { private: true } }` so a pin dropped or cleared (Ghost Mode) on Phone A updates on Phone B in real time.
- **Scheduled Server Expiry (`pg_cron` + `public.cleanup_expired_event_data`):** Runs every minute when `pg_cron` is active to delete expired rows from `public.pins` (firing the `DELETE` trigger to broadcast `pin:removed`), clear expired member pins, and remove expired crew invites.

### 2. Private Connected Crews & Offline Plan Exchange

- **Private Cloud Crews (`src/components/companion/ConnectedCrew.tsx`, `backend/cloud/shared-crews.sql`):** Create a private crew, generate a 7-day expiring invite code/QR and clickable `/?crewInvite=<uuid>#crew` deep link, scan a friend's crew QR in-app (`QrCameraScanner.tsx`), set a shared crew meeting point, share expiring landmark pins, or enter Ghost Mode immediately.
- **Crew Coordination Hub (`src/components/companion/CrewCoordination.tsx`):** Delivered quick pings (`At the stage`, `Bar run`, `Toilets`, `Regroup`), safe-arrival check-in (`I’m safe`), crew help alerts (`Need my crew`), single-vote-per-member crew polls, shared travel plans, short crew notes, and a downloadable 1080 × 1350 Crew Yearbook PNG card.
- **Offline QR & Link Plan Exchange (`src/components/companion/FestivalBump.tsx`):** Works without an account or signal to share and import a friend's meeting point, top saved artists, and festival interest badges.

### 3. Attendee Companion PWA (`Sound of Summer 2026`)

- **Onboarding & Event Selection (`Onboarding.tsx`, `EventSelection.tsx`):** Optional local profile photo picker (`AvatarPicker.tsx`), glass-card event picker, month calendar filter, `.ics` export, personal event collections (`Going`, `Wishlist`, `Coastal Summer`, `With Crew`), and organiser follow (`Namib Rage Events`). Bottom navigation (`Events`, `Lineup`, `Map`, `Crew`) appears after confirming an event, with `You` in the header.
- **Venue Map (`MapView.tsx`):** Authentic supplied Sound of Summer 2026 venue plan with 41 mapped points across 9 categories (`Stages 3`, `Bars 17`, `Toilets 5`, `Food 1`, `Medics 2`, `Gates 3`, `Sponsors 6`, `Tents 2`, `Zones 2`), two-finger pinch zoom, drag panning, pin clustering, monochrome/original plan toggle, landmark-relative nearby-facility finder (`NearbyPlaces.tsx`), and live crew landmark badges.
- **Lineup & Planning (`LineupView.tsx`, `DayPlanPanel.tsx`):** 25 announced artists with 24 supplied portraits, stage filters, Cloud account sync with durable offline outbox replay (`backend/cloud/attendee-sync.sql`), crew artist-overlap badges, multi-platform music search links (Spotify, Apple Music, YouTube Music, SoundCloud), opt-in set reminders, downloadable 1080 × 1350 lineup poster, and grounded day-plan suggestions.
- **Offline Pack, Ticket Vault & Safety (`TicketVault.tsx`, `EventMemories.tsx`, `SafetyAccess.tsx`):** Workbox service worker precaches the app shell, venue map, and artist portraits (`src/lib/pwa.ts`). Includes an offline IndexedDB ticket vault (JPG, PNG, WebP, PDF up to 8 MB) with pass-tier reference, private photo diary with story-card export, 5-second group photo timer with optional camera auto-snap (`FindMe.tsx`), grounded festival facts quiz (`FestivalPlay.tsx`), custom passport checkpoints (`FestivalPassport.tsx`), and a private-on-device Emergency Medical & ICE card.

### 4. Role-Protected Organiser Workspace (`/organiser`)

- **Private Organiser Workspace (`src/components/organiser/`, `drizzle/migrations/0000_organiser_workspace.sql`, `backend/cloud/organiser-and-crew-extensions.sql`):** Magic-link authentication, organisation profile and verification upload, admin verification review queue, manual and PDF-assisted event draft creation, site-plan upload with tap-to-position `(x, y)` zone pins, vendor notes and access tiers, publish readiness checks, live schedule status overrides with undo, one-way attendee broadcasts and emergency alerts (`organiser_broadcasts`), live venue issue log, team collaborator roles (`organiser_team_members`), and aggregate-only attendance counts (`organiser_event_aggregates` — zero attendee PII).

### 5. OAuth-Protected MCP Endpoint (`/mcp`)

- Mounted at `/mcp` (`src/lib/mcp/`) with OAuth consent at `/.lovable/oauth/consent`:
  - `get_event_overview`
  - `search_lineup`
  - `search_venue_places`
  - `get_my_saved_plan` (authenticated user-scoped)
  - `get_my_crew` (authenticated user-scoped)

## Verification & Local Development

```sh
npm install
npm run dev
```

Run the full verification gate before pushing:

```sh
npm run check
npm run test:e2e
```

- `npm run check` runs TypeScript (`tsc --noEmit`), ESLint, Vitest unit & component tests, the security credential format tests (`npm run test:security`), and the production Vite + Cloudflare Nitro build (`scripts/check-client-secrets.mjs`).
- `npm run test:e2e` builds and serves the production bundle and runs the Playwright mobile Chromium test suite (`e2e/`).
- Cloud SQL scripts in `backend/cloud/` (`attendee-sync.sql`, `shared-crews.sql`, `realtime-pins.sql`, `organiser-and-crew-extensions.sql`) and their `verify-*.sql` scripts apply and test the database tables, RLS policies, Realtime broadcast triggers, and `pg_cron` jobs in Lovable Cloud.
