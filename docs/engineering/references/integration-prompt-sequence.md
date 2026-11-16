Here's the exact tech stack and the prompt sequence to integrate it into your Lovable app. The order matters — each prompt assumes the previous one is done, so don't skip ahead.

---

## The Tech Stack (Final, Locked)

| Layer | Package | Role |
|---|---|---|
| **Backend** | `@supabase/supabase-js` | Postgres, Auth (anonymous), Realtime (Broadcast + Presence), Storage, Edge Functions |
| **Server state** | `@tanstack/react-query` | Data fetching, caching, optimistic updates, mutation defaults |
| **Offline** | `dexie` + `dexie-react-hooks` | IndexedDB local source of truth, outbox queue |
| **Offline (cache persist)** | `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister` | Persists the query cache to IndexedDB |
| **PWA / service worker** | `vite-plugin-pwa` + `workbox-precaching` | App shell offline, install prompt, update handling |
| **Maps** | `maplibre-gl` + `@turf/turf` (optional, for distance) | Offline-capable map, no Google billing cliff |
| **Motion** | `framer-motion` | Springs for sheets, press-scale, staggered lists (already available in Lovable projects) |
| **Icons** | `lucide-react` | SF-style icons at strokeWidth 1.75 — already ships with shadcn/ui in Lovable |
| **Dates** | `date-fns` | Formatting, `formatDistanceToNow` for "4m ago", already present in many Lovable templates |
| **Validation** | `zod` | Env boundaries, forms, API payload validation |
| **Analytics** | `posthog-js` + `@posthog/react` | Funnel: onboarding → crew → invite → pin |
| **Errors** | `@sentry/react` + `@sentry/vite-plugin` | Source maps + runtime errors in production |

**What you do NOT need right now:** Redis, Kafka, PostGIS, H3, Convex. Supabase Realtime + Dexie covers you to 10,000 concurrent. Add the heavy layer only when load proves it.

---

## The Prompt Sequence (paste into Lovable, in order)

### PROMPT 1 — Install all dependencies (one shot)

```
Install these npm packages as dependencies. Do not wire anything yet, just install:

@supabase/supabase-js @tanstack/react-query @tanstack/react-query-persist-client
@tanstack/query-async-storage-persister dexie dexie-react-hooks vite-plugin-pwa
workbox-precaching maplibre-gl framer-motion zod date-fns posthog-js @posthog/react
@sentry/react @sentry/vite-plugin

Pin each to its latest stable version. Do not upgrade existing packages. Do not change any code yet. Confirm when done.
```

Lovable installs packages on request and wires them in — there is no terminal step. If Lovable pushes back, name the exact package: *"Use the `maplibre-gl` package to render the map."* It will install it.

---

### PROMPT 2 — Supabase connection + anonymous auth

```
Connect this project to my Supabase project.

1. Read the Supabase URL and anon key from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables. Create a single client in src/lib/supabase.ts using createClient().
2. Enable anonymous sign-in. On app launch, if there is no active session, call supabase.auth.signInAnonymously() before rendering the main app. The user must never see a login screen on first run.
3. Generate TypeScript types from the database schema and place them in src/types/database.ts. Use these types everywhere, no `any`.
4. Create a `profiles` table: id (uuid, references auth.users), display_name (text), vibe (text check in 'music','social','both'), created_at (timestamptz default now()). Enable RLS. Policy: a user can select and update only their own row.

Show me the final src/lib/supabase.ts and the SQL migration file.
```

Supabase's anonymous users behave like permanent users but use the `authenticated` role, so your RLS policies must check the `is_anonymous` claim if you ever need to distinguish them.

---

### PROMPT 3 — The full schema with RLS (security before features)

```
Create these tables with RLS enabled on every single one. Do not skip RLS on any table.

crews (id uuid pk, name text not null, event_id uuid, invite_code text unique not null, created_by uuid references profiles, created_at timestamptz default now())
crew_members (crew_id uuid references crews on delete cascade, user_id uuid references profiles on delete cascade, joined_at timestamptz default now(), primary key (crew_id, user_id))
pins (id uuid pk, crew_id uuid references crews on delete cascade, user_id uuid references profiles, lat double precision not null, lng double precision not null, label text, expires_at timestamptz not null, created_at timestamptz default now())
messages (id uuid pk, crew_id uuid references crews on delete cascade, user_id uuid references profiles, body text, kind text check in ('text','voice','ping','pin'), created_at timestamptz default now())
reports (id uuid pk, reporter_id uuid, target_user_id uuid, crew_id uuid, reason text, created_at timestamptz default now())

RLS policies — every table scoped to crew membership:
- crews: select/update only if auth.uid() is in crew_members for that crew_id. insert allowed for any authenticated user (they become creator).
- crew_members: select only if auth.uid() is a member of that crew_id. insert only for yourself (user_id = auth.uid()).
- pins: select/insert/update/delete only if auth.uid() is a member of that crew_id.
- messages: same as pins.
- reports: insert only (reporter_id = auth.uid()), select only for admins (defer admin role to later — for now no select policy).

Write the SQL migration. After it runs, tell me exactly how to test it with a second anonymous account.
```

**This is the prompt that prevents a headline.** A proximity app with RLS off is a public location database. Test with a second account before going further.

---

### PROMPT 4 — Realtime: private channels + broadcast + presence

```
Replace any postgres_changes realtime usage with private Broadcast channels.

1. For each crew, subscribe to `crew:${crewId}:pins` and `crew:${crewId}:chat` with `{ config: { private: true } }`. Never use public channels for crew data.
2. Add RLS policies on realtime.messages:
   - For broadcast: allow insert and select only when realtime.topic() matches a crew the user belongs to, and extension = 'broadcast'.
   - For presence: same, extension = 'presence'.
3. Create a `useCrewChannel(crewId)` hook that joins the private channel on mount and leaves on unmount.
4. When a pin is inserted into the pins table, fire a database trigger that broadcasts on the crew channel: `pin:created` with the pin payload. Do the same for messages: `message:created`.
5. Use Presence for ephemeral "who is sharing" state only. Call channel.track({ user_id, sharing: true }) when the user starts sharing, and channel.untrack() when they stop. Never write presence to the database.

Disable "Allow public access" in Realtime settings as part of this change. Show me the realtime.messages RLS policy and the trigger function.
```

Private channels require `private: true` on the client and RLS on `realtime.messages` — public channels skip authorization checks entirely. This is the difference between a crew chat and a public broadcast.

---

### PROMPT 5 — Pins with expiry + pg_cron cleanup

```
1. When a user taps "I'm here", insert a pin with expires_at = now() + interval '60 minutes'. Round lat/lng to 3 decimal places before insert (≈100m precision). Never store location history — only the latest pin per user per crew. On insert, delete any existing pin for the same user_id + crew_id first (upsert pattern).
2. Add a pg_cron job (or a Supabase scheduled Edge Function) that runs every 60 seconds: DELETE FROM pins WHERE expires_at < now().
3. The client must show the countdown on every pin: "58 min left". If a pin is older than 60 minutes, it must not render.
4. Ghost Mode: a toggle that immediately stops all pin writes and leaves all realtime channels. The UI must show a persistent "Sharing · 58m" pill when active. When Ghost Mode is on, show "You're hidden" everywhere location is relevant.
5. Request geolocation only on user action: getCurrentPosition with enableHighAccuracy: false, maximumAge: 60000, timeout: 8000. Never call watchPosition.
```

Pins expire, history doesn't exist, and the user can always see their sharing state. That's the trust model.

---

### PROMPT 6 — Offline-first: Dexie outbox + TanStack Query persistence

```
Implement offline-first with three pieces:

1. Dexie database (src/lib/db.ts) with tables: outbox (id auto, action text, payload json, created_at, retry_count), pins_cache, messages_cache, schedule_cache.

2. TanStack Query persistence:
   - Use PersistQueryClientProvider with an async IndexedDB persister (via @tanstack/query-async-storage-persister).
   - Set gcTime >= persister maxAge.
   - Use shouldDehydrateMutation to only persist paused mutations that have registered mutation defaults.
   - Call resumePausedMutations on app launch.
   - Register setMutationDefaults for every mutation key BEFORE resume runs, by importing the defaults module at app boot.

3. The outbox pattern:
   - On any write (pin drop, message send), stamp a client UUID in onMutate, write to Dexie immediately, enqueue an outbox row with action + payload + idempotency key. Then fire the TanStack mutation.
   - A worker drains the outbox in order when `online` fires, when the tab becomes visible, and on app launch.
   - Send an Idempotency-Key header. On the server, honor it so retries don't create duplicates.
   - Use exponential backoff with jitter for transient failures. Remove 4xx validation errors from the queue and surface them to the user.
   - Show "2 waiting to send" in the UI whenever the outbox is non-empty.

4. Every network call gets an 8-second timeout and a cached fallback. Never a spinner-forever. Write to Dexie first, let TanStack Query react to local data changes — not the other way around.
```

This is the production-tested pattern: Dexie is the local source of truth, TanStack Query is the reactive mirror, and the outbox survives a dead battery and a killed tab. Do not persist the query cache as the source of truth — that's a zombie generator.

---

### PROMPT 7 — PWA service worker (app shell offline)

```
Configure vite-plugin-pwa:
- Precache the app shell, manifest, and icons.
- Runtime caching: NetworkFirst for Supabase API calls with a short maxAge (so reads work offline from cache), CacheFirst for map tiles and static images.
- Show an install prompt after the user creates or joins a crew (not before). Include a one-time "Add to Home Screen" instruction for iOS Safari with a screenshot of the Share menu — iOS Safari tabs get zero push notifications.
- Updates wait if mutations are still pending, so a reload doesn't drop local work.
- Register the service worker in main.tsx and expose offlineReady / needRefresh via virtual:pwa-register/react.
```

PWA precaches the shell and keeps Supabase traffic network-only — this is the exact pattern in production apps that need offline-first with auth. **The iOS push caveat is non-negotiable:** a Safari tab cannot receive web push. Only a Home Screen PWA can.

---

### PROMPT 8 — MapLibre map

```
Replace any map library with maplibre-gl.

1. Create a MapCanvas component using maplibre-gl with a MapTiler or OSM raster tile source. Read the style URL from VITE_MAP_STYLE_URL. Do not use Google Maps — no API key billing cliff.
2. Render three layers:
   - Static stage markers (from a hardcoded event JSON, not the database yet).
   - Crew pins: circle layer bound to the pins data, with avatar images if available.
   - Meetup pin: a distinct accent-colored flag layer.
3. Pins must be sized by zoom: avatar dots at high zoom, cluster circles at low zoom.
4. On pin tap, open a bottom sheet with the pin label, "4m ago", and "Walk with me".
5. Offline fallback: if tiles fail, show a static event map image with an overlay of pins in their approximate positions. Label it "Map may be outdated".
6. Under Vite, configure the MapLibre worker once before the first `new Map()` call — MapLibre GL JS loads its worker from a URL the bundler can't resolve on its own.
```

MapLibre is the right choice: open-source, Vite-compatible, no surprise invoice. The worker configuration is the one gotcha that will burn you if you skip it.

---

### PROMPT 9 — Motion (Framer Motion springs)

```
Add framer-motion to all interactive surfaces:
- Bottom sheets: slide up with a spring (stiffness 300, damping 30), grabber handle, scrim bg-black/40 backdrop-blur-[2px].
- Every tappable: active:scale-[0.97] with 150ms transition.
- Lists: staggered fade-in, 40ms delay per row.
- Pins/dots: gentle pulse loop (opacity 1 → 0.6, 2.5s ease-in-out infinite). Subtle.
- Page transitions: 300ms maximum. Nothing over 400ms. Respect prefers-reduced-motion.
```

Framer Motion is already available in Lovable projects; just ask for it.

---

### PROMPT 10 — Analytics + error tracking

```
Add PostHog and Sentry.

PostHog:
- Initialize PostHogProvider at the root of the app (main.tsx).
- Read VITE_POSTHOG_PROJECT_TOKEN and VITE_POSTHOG_HOST from env.
- Track exactly these events with no PII (use the user UUID, never names or emails):
  onboarding_completed, event_selected, crew_created, crew_joined, invite_sent, pin_dropped, lost_someone_used.

Sentry:
- Initialize Sentry in main.tsx before any other imports. Read VITE_SENTRY_DSN from env.
- Add @sentry/vite-plugin to vite.config.ts for source maps. Keep it last in the plugins array.
- Only enable in production (import.meta.env.PROD).
```

PostHog uses the `VITE_` prefix for client-side env vars; Sentry needs the Vite plugin for source maps or your stack traces will be useless.

---

### PROMPT 11 — The AGENTS.md block (paste once, rules apply forever)

```
Create an AGENTS.md file in the project root with this content exactly. Lovable reads AGENTS.md on every prompt, so these rules persist.

# Event Buddies — Agent Rules

## Stack (do not change)
React + Vite + TypeScript + Tailwind + shadcn/ui + Supabase + TanStack Query + Dexie + MapLibre + Framer Motion + Lucide + date-fns + Zod + PostHog + Sentry.

## Data rules
- Supabase Postgres is the source of truth. Dexie is the local source of truth for offline writes. TanStack Query is a reactive mirror, not the source of truth.
- RLS on EVERY table. Test with a second anonymous account before claiming a feature is done.
- Private realtime channels only. Never use postgres_changes for new features. Never use public channels for crew data.
- Pins expire in 60 minutes. Store latest pin only, never history. Round coordinates to 3 decimal places.
- Location is requested on user action only. Never watchPosition. Ghost Mode stops all writes immediately.

## UI rules
- iOS feel: -apple-system font, 17px body, radius ∈ {10,12,16,20,full}, ≤2 shadows total, blur chrome, active:scale-[0.97], 150ms taps / 300ms transitions.
- Every screen: empty, loading, error, populated, offline. No blank labels. No empty state without an action.
- No permission prompt before value. No fake liveness. Honest timestamps only ("4m ago", "as of yesterday").
- No "Demo companion", "Coming soon", "Beta", "Welcome", "Get started", "Oops", "Something went wrong".
- One primary action per screen. Copy in the voice of a 23-year-old at a festival.

## Code rules
- TypeScript strict. No `any`. No secrets in VITE_ vars except the Supabase anon key and PostHog token.
- Feature folders: a feature owns its screens, hooks, and types. No cross-feature imports except through components/ui and lib.
- Every mutation has an idempotency key and a Dexie outbox row.
```

Lovable reads `AGENTS.md` at the start of every session — this is how you stop it from drifting back to generic patterns after 20 prompts.

---

## The Build Order (non-negotiable)

| # | Prompt | Why this order |
|---|---|---|
| 1 | Install dependencies | Nothing works without the packages |
| 2 | Supabase + anonymous auth | Identity before data |
| 3 | Schema + RLS | Security before features |
| 4 | Realtime private channels | Live experience needs auth |
| 5 | Pins with expiry | Location done right |
| 6 | Offline outbox | Festival reality |
| 7 | PWA + service worker | Shell must survive no signal |
| 8 | MapLibre | The canvas |
| 9 | Motion | The "alive" layer |
| 10 | Analytics + Sentry | You won't be at the festival |
| 11 | AGENTS.md | Locks the rules for future prompts |

---

## The Three Things That Will Break If You Skip Them

1. **RLS before realtime.** A private channel with no `realtime.messages` policy is a public channel with extra steps. The RLS on `realtime.messages` is what makes `private: true` mean anything.
2. **Mutation defaults before resume.** If you persist paused mutations without registering `setMutationDefaults` first, a restart resurrects zombies — records with no function to replay them.
3. **The MapLibre worker.** Under Vite, the worker URL doesn't resolve on its own. Configure it once before the first `new Map()` or the map renders blank and you'll spend a day debugging it.

---

**The one sentence:** Install the twelve packages in one prompt, then connect Supabase with anonymous auth and RLS before anything else, then wire realtime as private channels, then build the Dexie outbox before the map, then let AGENTS.md hold the rules — and your Lovable app stops being a demo and starts being an app with a backend that won't leak, won't die offline, and won't forget a write when the tab closes.
