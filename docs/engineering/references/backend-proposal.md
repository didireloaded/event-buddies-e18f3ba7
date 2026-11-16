**Verdict first: the strongest, state-of-the-art backend for Event Buddies in 2026 is a two-tier architecture — Supabase as the system of record (Postgres + RLS + Auth), with an optional Convex or Redis-geoset live layer only if your realtime location load outgrows Supabase Realtime.** For your current stage, Supabase is the correct default. Convex is the correct escape hatch. A custom Postgres + Redis + Kafka stack is the correct long-term ceiling if you ever hit Snap-Map scale.

Here is the full breakdown, from the framework choice down to the exact schema and fan-out pattern.

---

## 1. The Decision Matrix (2026 edition)

| Need | Best pick | Runner-up | Why |
|---|---|---|---|
| Auth + Postgres + RLS | **Supabase** | Convex | Postgres is the real database; data is portable; RLS is mature |
| Realtime collaboration, presence, live cursors | **Convex** | Supabase Realtime | Convex's reactive sync is best-in-class — Cursor uses it |
| Zero ops, push everything to the platform | Firebase | Convex | Fastest ship, but least predictable bill and NoSQL joins hurt |
| Full SQL access, complex joins, pgvector | **Supabase** | Custom Postgres | Standard Postgres — any tool, ORM, or extension works |
| Solo founder, ship in 2 weeks | **Supabase** | Firebase | Default for 80% of apps; free tier covers you |
| Will sell the company eventually | **Supabase** | Custom | Data portability is the exit strategy |

**The honest verdict from the 2026 comparisons:** Supabase is the safe, predictable default. Convex wins when realtime sync *is* the product. Firebase ships fastest but its bill is the least predictable of the three. For a festival crew app, realtime matters — but **it is not the whole product**. The product is the crew, the meetup, the invite link, and the offline schedule. Supabase handles all of those, and its Postgres foundation is what you want when you need to run analytics on last year's festival data, do a `pg_dump` before the event, or add PostGIS later.

---

## 2. The Recommended Stack (Production-Grade)

### Primary: Supabase (Postgres 17 + Auth + Realtime + Storage + Edge Functions)

**Why Supabase wins for Event Buddies specifically:**

- **Postgres is the right data model.** You have relational data: users → crews → memberships → pins → messages → events. Joins matter. "Who is in this crew and what sets are they going to" is a SQL query, not a document traversal. Convex's document model makes this painful.
- **RLS is your security model, not an afterthought.** Every table — crews, pins, messages, profiles — gets Row Level Security. A user can only read their own crew's data. This is non-negotiable for a proximity-social app, and Supabase makes it the default mental model.
- **Realtime is good enough for festival scale.** Supabase Realtime uses a WAL-based engine. It can see 100–200ms P99 latencies under load — slower than Convex's sub-50ms, but entirely fine for "where is my friend" and "who's at this set". You are not building a multiplayer game.
- **Edge Functions (Deno) handle the server-side logic you cannot put in the client:** rate-limiting invite codes, sending push notifications, cleaning up expired pins, and generating the crew card image.
- **Storage + S3-compatible** for crew photos and recap exports.
- **Self-hostable** — if you ever need to own the infrastructure, you can. Convex self-hosting is not a supported option yet.

**Concrete Supabase configuration for Event Buddies:**

```sql
-- The core schema. Everything is RLS-protected.

create table profiles (
  id uuid primary key references auth.users,
  display_name text not null,
  vibe text check (vibe in ('music', 'social', 'both')),
  created_at timestamptz default now()
);

create table crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_id uuid references events,
  invite_code text unique not null, -- 8 chars, rate-limited
  created_by uuid references profiles,
  created_at timestamptz default now()
);

create table crew_members (
  crew_id uuid references crews on delete cascade,
  user_id uuid references profiles on delete cascade,
  joined_at timestamptz default now(),
  primary key (crew_id, user_id)
);

create table pins (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid references crews on delete cascade,
  user_id uuid references profiles,
  lat double precision not null,
  lng double precision not null,
  label text, -- "ferris wheel", "main stage"
  expires_at timestamptz not null, -- default now() + 60 min
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid references crews on delete cascade,
  user_id uuid references profiles,
  body text,
  kind text check (kind in ('text', 'voice', 'ping', 'pin')),
  created_at timestamptz default now()
);

-- RLS: the security layer. Every table gets this.
alter table profiles enable row level security;
alter table crews enable row level security;
alter table crew_members enable row level security;
alter table pins enable row level security;
alter table messages enable row level security;

-- Example policy: you can only see pins from your own crew.
create policy "crew members see crew pins"
  on pins for select
  using (crew_id in (
    select crew_id from crew_members where user_id = auth.uid()
  ));
```

**The one rule that will save you:** never use `postgres_changes` for new realtime features. It is single-threaded and does not scale. Use `broadcast` with database triggers instead — it is the 2026 recommended pattern.

---

### The Live Layer: Supabase Realtime (Broadcast + Presence)

Supabase Realtime gives you three tools. Use them for exactly these jobs:

| Tool | Use in Event Buddies | Do not use for |
|---|---|---|
| **Broadcast** | Chat messages, pin drops, "lost someone" alerts, meetup updates | Anything that needs history — broadcast is ephemeral, not persisted |
| **Presence** | Who is online in the crew, who is currently sharing, "3 people are at Main Stage" | Storing location history — presence is ephemeral state, not a database |
| **Postgres Changes** | Nothing new. Avoid entirely. | High-frequency updates, anything at scale |

**The pattern for location:**

```
User taps "I'm here"
  → Client calls a Supabase Edge Function (or direct insert) with lat/lng
  → Edge Function inserts into pins with expires_at = now() + 60 min
  → Database trigger broadcasts to the crew channel: `pin:created`
  → Other crew members receive the broadcast and render the pin
  → A cron job (pg_cron) deletes expired pins every 60 seconds
```

**The pattern for presence:**

```
Crew channel = `crew:${crewId}:presence`
  → User joins channel, calls channel.track({ user_id, sharing: true, last_seen: now() })
  → Other members receive presence state
  → When a user stops sharing, they call channel.untrack()
  → No database write for presence — it lives in memory only
```

**Dedicated topics are mandatory for scale.** Do not broadcast to a global channel. Each crew gets its own channel: `crew:${crewId}:pins`, `crew:${crewId}:chat`. This reduces network traffic, improves security, and lets RLS control who can subscribe.

---

### When to Add Convex (the escape hatch)

Do not start with Convex. Start with Supabase. Add Convex only when **all three** of these are true:

1. **You have more than 10,000 concurrent crew members** updating location simultaneously.
2. **Supabase Realtime's 100–200ms P99 latency is visibly hurting the experience** — not just measurable, but *noticeable* in user testing.
3. **You have the engineering capacity to manage a second backend** and the vendor-lock-in trade-off is acceptable.

Convex's realtime is genuinely better — sub-50ms at 5,000 concurrent connections, automatic reactivity, no WebSocket plumbing. But it comes with a proprietary document model, no SQL joins, and a per-developer pricing model that gets expensive as the team grows. For a festival app with 5,000–20,000 attendees, Supabase is more than enough. Do not over-engineer before you have the load.

---

## 3. The Ceiling: What "State of the Art" Looks Like at Scale

If Event Buddies becomes the default festival app across Southern Africa and you are handling millions of location updates per day, here is the architecture you graduate to. This is the architecture used by Snap Map, Find My, and every serious proximity service.

### The two-workload split (the single most important insight)

Live friend location and static place data are **different problems** and must be stored differently:

- **Static places** (stages, toilets, gates, bars) → **PostGIS** with a GiST index. PostGIS handles 10k–30k writes/sec per primary before page-lock contention dominates. It is perfect for "what is near me" queries on data that changes hourly.
- **Live friend locations** → **Redis geosets**, partitioned by spatial cell. Redis is in-memory, handles 100k+ writes/sec, and supports per-member TTL (so pins auto-expire without a cron job).

### The spatial index: H3 hexagonal cells

Do not query by lat/lng bounding box. Use **Uber H3** (or Google S2) to map coordinates to hexagonal cells. Each cell has a resolution — a coarse cell covers a neighborhood, a fine cell covers a stage. Query the user's cell plus its **k-ring** (the neighbors) to find nearby pins. Then **refine with a Haversine distance check** to eliminate false positives at cell boundaries.

**Why hexagons?** They give uniform neighbor distance, which makes radius expansion clean. The trade-off is that every cell-based query returns false positives at boundaries — accept the coarse-filter/fine-filter pattern. It is O(candidates), and candidates are bounded by cell size.

### Kafka partitioned by H3 cell ID

This is the detail that separates a toy from a production system. When a concert ends and 60,000 people open the app simultaneously, the hotspot is a geographic cell, not a user. Partition Kafka by **H3 cell ID**, not user ID. Then you can split a hot cell into finer-resolution children without touching the rest of the system.

### The full stack at scale

| Layer | Technology | Role |
|---|---|---|
| Client | React + Vite (current) | Offline-first, IndexedDB cache |
| API gateway | Cloudflare or Supabase Edge | Rate limiting, SSL, auth token validation |
| Static places | **PostgreSQL + PostGIS** | Stages, toilets, gates — GiST index |
| Live locations | **Redis geoset** (per-member TTL) | Ephemeral pins, 60-min expiry built in |
| Spatial index | **H3** on both PostGIS and Redis | Cell-based fan-out |
| Event bus | **Kafka** partitioned by H3 cell | Decouples writes from broadcasts |
| Realtime fan-out | **WebSocket servers** (stateless, horizontally scaled) | Push to clients |
| Push notifications | **FCM / APNs** via Edge Function | Meetup alerts, "lost someone" |
| Analytics | **ClickHouse** or Postgres read replica | Post-festival insights |

This is the architecture described in the 2026 proximity-service case studies: a PostGIS-backed place search and a Redis geoset-backed live-sharing layer, both indexed by H3 cells, with Kafka partitioned by cell ID so hotspot splits are tractable.

---

## 4. Offline-First Sync (the part most backends get wrong)

Festival signal is trash. The backend must assume the client will be offline for minutes at a time. The 2026 state of the art is a **local-first** architecture with two postures:

| Posture | Who owns truth | Use for |
|---|---|---|
| **Local store as buffer** | Server owns truth; client queues writes | Messages, pins — you want server timestamps and conflict resolution |
| **Local store as replica** | Truth is negotiated (CRDTs) | Collaborative editing — not needed for Event Buddies |

**For Event Buddies, use the buffer posture.** The client writes to IndexedDB first, queues the action, and drains the queue when connectivity returns. The server is the source of truth for timestamps and ordering.

**The sync engine options:**

- **PowerSync** (Postgres ↔ SQLite sync, now with Azure DocumentDB alpha support) — production-hardened, delta-pulls, good for React Native and web.
- **ObjectBox Sync** — offline-first sync with customizable conflict resolution, supports user-specific sync and MongoDB integration.
- **Roll your own with Dexie + TanStack Query** — for a Vite web app, this is the pragmatic choice. Dexie gives you IndexedDB; TanStack Query gives you optimistic updates and retry logic. You queue mutations in a `pending_actions` table, flush on `online` event, and show "2 waiting to send" in the UI.

**The non-negotiable rule:** every network call has an 8-second timeout and a cached fallback. Never a spinner-forever. The offline experience is not a degradation — it is the primary experience for a festival app.

---

## 5. Security: The Backend Will Leak If You Skip This

A proximity-social app with a leaky database is not a bug — it is a headline. Here is the checklist, and it is not optional:

| Layer | Control | Why |
|---|---|---|
| **Database** | RLS on **every** table in `public` | Without it, anyone can read every pin, every message, every profile |
| **Realtime** | RLS-style authorization on `realtime.messages` | Control who can subscribe to a crew channel — otherwise anyone can listen |
| **Keys** | Anon key client-side only; **service role never in the client** | Grep the built bundle for `service_role` before every deploy |
| **Invite codes** | 8 chars, random, **rate-limited** (5 attempts/min/IP), **expiring** (72h) | Otherwise people brute-force crew membership |
| **Location** | Store **latest pin only**, not history. Delete at expiry via `pg_cron`. | If it is not stored, it cannot leak. Round to 3 decimal places (≈100m) server-side. |
| **Messages** | `reports` table + block list from day one | Even if the UI is minimal, the data model must exist |
| **Rate limiting** | Crew creation, pin drops, messages | Supabase Edge Functions or a counter table. Without it, one bad actor can spam your database. |
| **PII** | Never send names/emails to analytics. Use the user UUID. | Privacy-friendly analytics (PostHog, Plausible) are not optional for a location app. |

**The test that matters:** create a second anonymous account, log in, and try to read another user's crew. If you can, RLS is broken. Do this before the URL is public.

---

## 6. Cost Model (honest numbers)

| Scale | Supabase | Convex (if you switched) | Firebase |
|---|---|---|---|
| **Free / dev** | Free (500MB DB, 50k MAUs) | Free (1M function calls, 6 devs) | Free (generous, but pay-per-read) |
| **Early production** (5k users, 500 concurrent) | **$25/mo** (Pro) | **$25/dev/mo** + usage | Pay-as-you-go — can spike |
| **Festival weekend** (20k users, 5k concurrent) | **$25–$75/mo** (Pro or Team) | **$75–$200/mo** (3 devs + heavy realtime) | **Unpredictable** — reads and writes add up fast |
| **Multi-festival scale** (100k users) | **$599/mo** (Team) or custom Postgres | **$200–$500/mo** + bandwidth | **$500–$2,000/mo** possible |

**The brutal truth about Firebase:** its bill is the least predictable of the three because you pay per read and per write. A badly designed query pattern can cost you hundreds of dollars in a weekend. Supabase's flat $25/mo Pro plan is the safest financial posture for a seasonal app. Convex's per-developer pricing is fine for a solo founder but gets expensive as the team grows.

---

## 7. Build Order (the only sequence that works)

| # | What | Why first |
|---|---|---|
| 1 | **Supabase project + schema + RLS on every table** | Security before features. Test with a second account. |
| 2 | **Anonymous auth → profiles** | Guest-first. No email/password on first run. |
| 3 | **Crews + membership + invite codes** (rate-limited, expiring) | The growth loop. This is the product. |
| 4 | **Pins with expiry + `pg_cron` cleanup** | Location done right — store latest only, delete at expiry. |
| 5 | **Realtime broadcast for pins + chat** (not `postgres_changes`) | The live experience. |
| 6 | **Presence for "who's sharing"** (ephemeral, not stored) | The "who's here" moment. |
| 7 | **Edge Functions: push notifications, crew card generation** | The retention and growth artifacts. |
| 8 | **Offline queue (Dexie + TanStack Query)** | The festival reality. |
| 9 | **Sentry + PostHog + Playwright e2e** | You will not be at the festival with 4,000 users. These will. |
| 10 | **Only if load demands it: add Redis geoset + H3** | Do not pre-optimize. Supabase Realtime will carry you to 10k concurrent. |

---

**The one sentence:** Supabase is the strongest backend for Event Buddies today — Postgres + RLS for the relational truth, Broadcast for realtime, Presence for ephemeral state, and an offline queue for the festival reality — and the state-of-the-art ceiling is a PostGIS + Redis-geoset + H3 + Kafka architecture you should design toward but not build until the load proves you need it.
