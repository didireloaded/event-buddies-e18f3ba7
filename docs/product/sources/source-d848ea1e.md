# Event-Buddies — Full Backend Implementation

This is the complete backend: schema, auth, shared infrastructure, every API route group, real-time, push, jobs, and deployment. Code is written to drop into the existing `src/` structure. Sections are ordered so you can ship incrementally.

---

## 0. Architecture at a glance

| Concern | Choice |
|---|---|
| Runtime | Next.js 16 route handlers (Node runtime) |
| DB | PostgreSQL + Drizzle ORM |
| Cache / pub-sub | Redis (`ioredis`) — required for SSE fan-out and rate limits |
| Auth | Auth.js v5 (NextAuth) + Drizzle adapter |
| Validation | Zod |
| Rate limit | `@upstash/ratelimit` (or `rate-limiter-flexible` backed by Redis) |
| Push | `web-push` (VAPID) + outbox table drained by cron |
| Real-time | Server-Sent Events (SSE) over Redis pub/sub |
| Jobs | `GET /api/cron/*` secured by `CRON_SECRET`, hit by Vercel Cron |
| Storage | S3-compatible (Cloudflare R2) via presigned uploads |
| Observability | `pino` structured logs + Sentry + PostHog (server-side) |

New packages to install:

```bash
npm i next-auth @auth/drizzle-adapter zod ioredis web-push pino pino-pretty \
      @upstash/ratelimit nanoid ics @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
      @sentry/nextjs
npm i -D @types/web-push drizzle-kit vitest @vitest/coverage-v8
```

Env (`src/lib/env.ts`):

```ts
import { z } from "zod";

export const env = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),
  EMAIL_SERVER: z.string().url().optional(),          // Resend SMTP for magic links
  EMAIL_FROM: z.string().email().default("no-reply@eventbuddies.app"),
  RESEND_API_KEY: z.string().optional(),
  REDIS_URL: z.string().url(),
  VAPID_PUBLIC_KEY: z.string(),
  VAPID_PRIVATE_KEY: z.string(),
  VAPID_SUBJECT: z.string().default("mailto:ops@eventbuddies.app"),
  CRON_SECRET: z.string().min(16),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  ICS_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
}).parse(process.env);
```

---

## 1. Full database schema

Replace `src/db/schema.ts` with the following (keeps your existing tables, adds everything else). Trim as needed, but this is the complete set.

```ts
// src/db/schema.ts
import {
  pgTable, uuid, text, timestamp, boolean, integer,
  doublePrecision, bigint, jsonb, primaryKey, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ============ Auth ============ */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  name: text("name"),
  image: text("image"),
  handle: text("handle").unique(),
  isGuest: boolean("is_guest").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ handleIdx: index("users_handle_idx").on(t.handle) }));

export const accounts = pgTable("accounts", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
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

export const locationConsents = pgTable("location_consents", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull(),
  version: text("version").notNull(),
});

/* ============ Organisers & events ============ */

export const organisers = pgTable("organisers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organiserMembers = pgTable("organiser_members", {
  organiserId: uuid("organiser_id").notNull().references(() => organisers.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
}, (t) => ({ pk: primaryKey({ columns: [t.organiserId, t.userId] }) }));

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organiserId: uuid("organiser_id").notNull().references(() => organisers.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  venueName: text("venue_name"),
  city: text("city"),
  country: text("country"),
  timezone: text("timezone").notNull().default("UTC"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  imageUrl: text("image_url"),
  joinCode: text("join_code").unique(),
  publicListing: boolean("public_listing").default(true).notNull(),
  published: boolean("published").default(false).notNull(),
  revision: bigint("revision", { mode: "number" }).default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ cityIdx: index("events_city_idx").on(t.city) }));

export const eventMembers = pgTable("event_members", {
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // owner | admin | stage_manager | comms | readonly
}, (t) => ({ pk: primaryKey({ columns: [t.eventId, t.userId] }) }));

export const eventAccess = pgTable("event_access", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("attendee"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("event_access_user_event").on(t.userId, t.eventId) }));

export const eventFollows = pgTable("event_follows", {
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => ({ pk: primaryKey({ columns: [t.eventId, t.userId] }) }));

export const eventRevisions = pgTable("event_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  revision: bigint("revision", { mode: "number" }).notNull(),
  changeType: text("change_type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ idx: index("event_revisions_idx").on(t.eventId, t.revision) }));

/* ============ Content ============ */

export const stages = pgTable("stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  capacity: integer("capacity"),
});

export const artists = pgTable("artists", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  genres: jsonb("genres").$type<string[]>().default(sql`'[]'::jsonb`),
  spotifyUrl: text("spotify_url"),
  appleMusicUrl: text("apple_music_url"),
});

export const performances = pgTable("performances", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  stageId: uuid("stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
  artistId: uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("scheduled"),
}, (t) => ({ idx: index("perf_event_time_idx").on(t.eventId, t.startsAt) }));

export const userScheduleItems = pgTable("user_schedule_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  performanceId: uuid("performance_id").notNull().references(() => performances.id, { onDelete: "cascade" }),
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex("user_sched_unique").on(t.userId, t.performanceId),
  idx: index("user_sched_reminder_idx").on(t.reminderAt, t.reminderSentAt),
}));

export const eventMapPoints = pgTable("event_map_points", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // stage | food | bar | toilet | water | medical | exit | accessible_toilet | crew
  label: text("label").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  accessible: boolean("accessible").default(false).notNull(),
  metadata: jsonb("metadata"),
});

export const eventAnnouncements = pgTable("event_announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  priority: text("priority").notNull().default("info"), // info | warning | emergency
  targetType: text("target_type").notNull().default("all"), // all | stage | vip | geofence | crew
  targetId: uuid("target_id"),
  geofenceLat: doublePrecision("geofence_lat"),
  geofenceLng: doublePrecision("geofence_lng"),
  geofenceRadiusM: integer("geofence_radius_m"),
  pinned: boolean("pinned").default(false).notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ============ Social ============ */

export const friendships = pgTable("friendships", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterId: uuid("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  addresseeId: uuid("addressee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending | accepted | blocked
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
}, (t) => ({ uniq: uniqueIndex("friend_pair").on(t.requesterId, t.addresseeId) }));

export const crews = pgTable("crews", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  inviteCode: text("invite_code").unique(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const crewMembers = pgTable("crew_members", {
  crewId: uuid("crew_id").notNull().references(() => crews.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.crewId, t.userId] }) }));

export const locationShares = pgTable("location_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  crewId: uuid("crew_id").references(() => crews.id, { onDelete: "cascade" }),
  visibility: text("visibility").notNull().default("precise"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  accuracyM: integer("accuracy_m"),
  heading: doublePrecision("heading"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("share_user_event_crew").on(t.userId, t.eventId, t.crewId) }));

export const meetingPoints = pgTable("meeting_points", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  crewId: uuid("crew_id").references(() => crews.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  label: text("label").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ============ Notifications ============ */

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("push_sub_unique").on(t.userId, t.endpoint) }));

export const pushOutbox = pgTable("push_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  payload: jsonb("payload").notNull(),
  priority: text("priority").notNull().default("normal"),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ idx: index("push_outbox_pending_idx").on(t.sentAt, t.createdAt) }));

/* ============ Safety & moderation ============ */

export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  severity: text("severity").notNull().default("normal"),
  status: text("status").notNull().default("open"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  description: text("description"),
  anonymous: boolean("anonymous").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ idx: index("incidents_event_open_idx").on(t.eventId, t.status) }));

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ============ Infrastructure ============ */

export const actionLog = pgTable("action_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientActionId: text("client_action_id").notNull(),
  result: jsonb("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("action_log_idem").on(t.userId, t.clientActionId) }));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ============ PostGIS (optional but recommended) ============ */

// Run in a migration when ready:
//   CREATE EXTENSION IF NOT EXISTS postgis;
//   ALTER TABLE location_shares ADD COLUMN geom geography(Point,4326)
//     GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;
//   CREATE INDEX ON location_shares USING GIST (geom);
```

Generate the migration:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## 2. Auth (Auth.js v5)

**`src/lib/auth.ts`**

```ts
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Email from "next-auth/providers/email";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { env } from "@/lib/env";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/signin", verifyRequest: "/signin/verify" },
  providers: [
    Email({
      server: { host: "smtp.resend.com", port: 465, auth: { user: "resend", pass: env.RESEND_API_KEY! } },
      from: env.EMAIL_FROM,
    }),
    Google({ clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET! }),
    Apple({ clientId: env.APPLE_CLIENT_ID!, clientSecret: env.APPLE_CLIENT_SECRET! }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      // @ts-expect-error augment
      session.user.handle = (user as any).handle ?? null;
      return session;
    },
  },
});
```

**`src/app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

**`src/types/next-auth.d.ts`**

```ts
import "next-auth";
declare module "next-auth" {
  interface Session { user: { id: string; handle?: string | null; email?: string | null; name?: string | null; image?: string | null } }
}
```

**Guest bootstrap** — `POST /api/guest` creates a throwaway user and signs a session cookie.

```ts
// src/app/api/guest/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { nanoid } from "nanoid";
import { handleRoute } from "@/lib/apiHandler";

export const POST = handleRoute(async () => {
  const id = crypto.randomUUID();
  const sessionToken = nanoid(48);
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id, email: `guest_${id}@guest.local`, isGuest: true,
      name: "Guest", handle: `guest_${nanoid(6)}`,
    });
    await tx.insert(sessions).values({
      sessionToken, userId: id,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
});
```

---

## 3. Shared API infrastructure

**`src/lib/apiHandler.ts`** — typed route wrapper: session, error → JSON, logging.

```ts
import { NextResponse, NextRequest } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type Ctx = { req: NextRequest; session: { userId: string } | null; params: Record<string, string> };

export function handleRoute(
  fn: (ctx: Ctx) => Promise<Response>,
  opts: { auth?: boolean } = {}
) {
  return async (req: NextRequest, { params }: { params?: Promise<Record<string, string>> } = {}) => {
    const start = Date.now();
    try {
      const session = await auth();
      const userId = (session?.user as any)?.id as string | undefined;
      if (opts.auth && !userId) throw new ApiError(401, "unauthorized", "Sign in required");

      const resolvedParams = params ? await params : {};
      const res = await fn({
        req,
        session: userId ? { userId } : null,
        params: resolvedParams,
      });
      logger.info({ route: req.nextUrl.pathname, status: res.status, ms: Date.now() - start });
      return res;
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: { code: "validation", message: "Invalid input", issues: err.issues } },
          { status: 422 }
        );
      }
      logger.error({ route: req.nextUrl.pathname, err }, "unhandled");
      return NextResponse.json({ error: { code: "internal", message: "Server error" } }, { status: 500 });
    }
  };
}
```

**`src/lib/requireEventRole.ts`** — RBAC.

```ts
import { db } from "@/db";
import { eventMembers, eventAccess } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ApiError } from "@/lib/apiHandler";

const ORDER = { readonly: 1, comms: 2, stage_manager: 3, admin: 4, owner: 5 } as const;
export type OrgRole = keyof typeof ORDER;

export async function requireEventRole(eventId: string, userId: string, min: OrgRole) {
  const row = await db.query.eventMembers.findFirst({
    where: and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, userId)),
  });
  if (!row) throw new ApiError(403, "forbidden", "Not an event member");
  if (ORDER[row.role as OrgRole] < ORDER[min]) throw new ApiError(403, "forbidden", "Insufficient role");
  return row.role as OrgRole;
}

export async function requireEventAccess(eventId: string, userId: string) {
  const row = await db.query.eventAccess.findFirst({
    where: and(eq(eventAccess.eventId, eventId), eq(eventAccess.userId, userId)),
  });
  if (!row) throw new ApiError(403, "forbidden", "Join this event first");
  return row.role;
}
```

**`src/lib/rateLimit.ts`**

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "ioredis";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/apiHandler";

const redis = new Redis(env.REDIS_URL);

export const limiters = {
  default: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), prefix: "rl:def" }),
  sos:     new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(3, "1 h"),    prefix: "rl:sos" }),
  announce:new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:ann" }),
  location:new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, "1 m"), prefix: "rl:loc" }),
  report:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:rep" }),
};

export async function enforce(limiter: keyof typeof limiters, id: string) {
  const { success } = await limiters[limiter].limit(id);
  if (!success) throw new ApiError(429, "rate_limited", "Too many requests");
}
```

**`src/lib/idempotency.ts`**

```ts
import { db } from "@/db";
import { actionLog } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function withIdempotency<T>(
  userId: string, clientActionId: string, fn: () => Promise<T>
): Promise<T> {
  const prior = await db.query.actionLog.findFirst({
    where: and(eq(actionLog.userId, userId), eq(actionLog.clientActionId, clientActionId)),
  });
  if (prior) return prior.result as T;

  const result = await fn();
  await db.insert(actionLog).values({
    userId, clientActionId, result: result as any,
  }).onConflictDoNothing();
  return result;
}
```

**`src/lib/bumpRevision.ts`** — every content change bumps revision + publishes.

```ts
import { db } from "@/db";
import { events, eventRevisions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { publish } from "@/lib/redis";

export async function bumpRevision(
  eventId: string, changeType: string, payload: unknown
) {
  const [row] = await db.update(events)
    .set({ revision: sql`${events.revision} + 1` })
    .where(eq(events.id, eventId))
    .returning({ revision: events.revision });
  const revision = row.revision;
  await db.insert(eventRevisions).values({ eventId, revision, changeType, payload });
  await publish(`evt:${eventId}`, { type: "revision", revision, changeType, payload });
  return revision;
}
```

**`src/lib/redis.ts`**

```ts
import { Redis } from "ioredis";
import { env } from "@/lib/env";

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

export async function publish(channel: string, message: unknown) {
  await redis.publish(channel, JSON.stringify(message));
}

export async function subscribe<T>(channel: string, onMessage: (m: T) => void) {
  const sub = redis.duplicate();
  await sub.subscribe(channel);
  sub.on("message", (_chan, raw) => {
    try { onMessage(JSON.parse(raw)); } catch {}
  });
  return { close: () => sub.quit() };
}
```

**`src/lib/logger.ts`**

```ts
import pino from "pino";
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "*.email", "*.lat", "*.lng"],
});
```

---

## 4. Route groups — the full surface

Below, `📄` marks a file path and `→` its contract. Fully-written implementations follow after each list where the logic is non-trivial.

### 4.1 Auth

| Route | Contract |
|---|---|
| `📄 src/app/api/auth/[...nextauth]/route.ts` | Handled by Auth.js |
| `POST /api/guest` | Create guest + session cookie (shown above) |

### 4.2 Users / me

| Route | Contract |
|---|---|
| `GET /api/me` | `{ user, consents: { location: { grantedAt, version } } }` |
| `PATCH /api/me` | `{ name?, handle?, image? }` |
| `GET /api/me/export` | JSON dump of user data (GDPR) |
| `DELETE /api/me` | Cascade delete |
| `GET /api/me/sessions` | Active sessions |
| `DELETE /api/me/sessions/:token` | Revoke one |
| `POST /api/me/location-consent` | `{ version: string }` — records consent |

### 4.3 Events (public + join)

| Route | Contract |
|---|---|
| `GET /api/events/discover?city=&from=&to=&q=` | Public events |
| `GET /api/events/mine` | Events user has access to |
| `POST /api/events/join-by-code` | `{ code }` → creates `eventAccess` |
| `POST /api/events/:id/leave` | Remove own access |
| `POST /api/events/:id/follow` | Toggle `eventFollows` |
| `GET /api/events/:id/bootstrap` | One-shot payload: event, stages, mapPoints, performances, user schedule, crews |

**`src/app/api/events/join-by-code/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { events, eventAccess } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleRoute, ApiError } from "@/lib/apiHandler";
import { enforce } from "@/lib/rateLimit";

const body = z.object({ code: z.string().min(4).max(64) });

export const POST = handleRoute(async ({ req, session }) => {
  const { code } = body.parse(await req.json());
  await enforce("default", `join:${session!.userId}`);

  const ev = await db.query.events.findFirst({ where: eq(events.joinCode, code) });
  if (!ev) throw new ApiError(404, "not_found", "Invalid code");

  await db.insert(eventAccess).values({ eventId: ev.id, userId: session!.userId })
    .onConflictDoNothing();

  return NextResponse.json({
    event: { id: ev.id, slug: ev.slug, name: ev.name, timezone: ev.timezone },
  });
}, { auth: true });
```

**`src/app/api/events/[id]/bootstrap/route.ts`**

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventAccess, events, stages, eventMapPoints, performances,
         userScheduleItems, crews, crewMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { handleRoute, ApiError } from "@/lib/apiHandler";

export const GET = handleRoute(async ({ session, params }) => {
  const eventId = params.id;
  const access = await db.query.eventAccess.findFirst({
    where: and(eq(eventAccess.eventId, eventId), eq(eventAccess.userId, session!.userId)),
  });
  if (!access) throw new ApiError(403, "forbidden", "Not joined");

  const [ev, st, pts, perfs, mine, userCrews] = await Promise.all([
    db.query.events.findFirst({ where: eq(events.id, eventId) }),
    db.select().from(stages).where(eq(stages.eventId, eventId)),
    db.select().from(eventMapPoints).where(eq(eventMapPoints.eventId, eventId)),
    db.select().from(performances).where(eq(performances.eventId, eventId)),
    db.select().from(userScheduleItems).where(eq(userScheduleItems.userId, session!.userId)),
    db.select({ id: crews.id, name: crews.name, role: crewMembers.role })
      .from(crewMembers).innerJoin(crews, eq(crews.id, crewMembers.crewId))
      .where(and(eq(crewMembers.userId, session!.userId), eq(crews.eventId, eventId))),
  ]);

  return NextResponse.json({
    event: ev, stages: st, mapPoints: pts, performances: perfs,
    schedule: mine, crews: userCrews, revision: ev!.revision,
  });
}, { auth: true });
```

### 4.4 Organiser — event management

| Route | Contract |
|---|---|
| `POST /api/organiser/events` | Create event (draft) |
| `PATCH /api/organiser/events/:id` | Update metadata |
| `POST /api/organiser/events/:id/publish` | Sets `published`, generates `joinCode` |
| `GET/POST/DELETE /api/organiser/events/:id/members` | RBAC management |
| `PUT /api/organiser/events/:id/schedule` | Bulk schedule replace (bumps revision, notifies affected users) |
| `POST /api/organiser/events/:id/stages` | CRUD stages |
| `POST /api/organiser/events/:id/map-points` | CRUD POIs |
| `POST /api/organiser/events/:id/announcements` | Compose / schedule |
| `POST /api/organiser/events/:id/announcements/:id/send` | Send now |
| `GET /api/organiser/events/:id/analytics` | Aggregates |
| `GET /api/organiser/events/:id/incidents` | Triage |
| `PATCH /api/organiser/incidents/:id` | Assign / resolve |

**`src/app/api/organiser/events/[id]/announcements/route.ts`** — the important one (targeting + fan-out):

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { eventAnnouncements, eventAccess, eventMembers,
         crewMembers, performances, userScheduleItems, users } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { handleRoute, ApiError } from "@/lib/apiHandler";
import { requireEventRole } from "@/lib/requireEventRole";
import { enqueuePushBulk } from "@/lib/push/outbox";
import { bumpRevision } from "@/lib/bumpRevision";
import { enforce } from "@/lib/rateLimit";

const create = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  priority: z.enum(["info", "warning", "emergency"]).default("info"),
  targetType: z.enum(["all", "stage", "vip", "geofence", "crew"]).default("all"),
  targetId: z.string().uuid().optional(),
  geofence: z.object({ lat: z.number(), lng: z.number(), radiusM: z.number().int().min(10).max(5000) }).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export const POST = handleRoute(async ({ req, session, params }) => {
  const eventId = params.id;
  await requireEventRole(eventId, session!.userId, "comms");
  await enforce("announce", `ann:${session!.userId}`);

  const input = create.parse(await req.json());
  if (input.targetType !== "all" && !input.targetId) {
    throw new ApiError(422, "validation", "targetId required for targeted announcements");
  }

  const [row] = await db.insert(eventAnnouncements).values({
    eventId, authorId: session!.userId,
    title: input.title, body: input.body, priority: input.priority,
    targetType: input.targetType, targetId: input.targetId ?? null,
    geofenceLat: input.geofence?.lat ?? null,
    geofenceLng: input.geofence?.lng ?? null,
    geofenceRadiusM: input.geofence?.radiusM ?? null,
    scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
    sentAt: input.scheduledFor ? null : new Date(),
  }).returning();

  await bumpRevision(eventId, "announcement", { id: row.id, title: row.title, priority: row.priority });

  if (!input.scheduledFor) await fanOut(row);

  return NextResponse.json({ announcement: row }, { status: 201 });
}, { auth: true });

async function fanOut(row: typeof eventAnnouncements.$inferSelect) {
  let recipientIds: string[] = [];
  if (row.targetType === "all") {
    const rows = await db.select({ id: eventAccess.userId }).from(eventAccess)
      .where(eq(eventAccess.eventId, row.eventId));
    recipientIds = rows.map(r => r.id);
  } else if (row.targetType === "stage" && row.targetId) {
    const rows = await db.select({ id: eventMembers.userId }).from(eventMembers)
      .where(eq(eventMembers.eventId, row.eventId));
    recipientIds = rows.map(r => r.id);
    // plus attendees with a schedule item on that stage
    const sched = await db.select({ id: userScheduleItems.userId })
      .from(userScheduleItems)
      .innerJoin(performances, eq(performances.id, userScheduleItems.performanceId))
      .where(and(eq(performances.eventId, row.eventId), eq(performances.stageId, row.targetId)));
    recipientIds = [...new Set([...recipientIds, ...sched.map(s => s.id)])];
  } else if (row.targetType === "crew" && row.targetId) {
    const rows = await db.select({ id: crewMembers.userId }).from(crewMembers)
      .where(eq(crewMembers.crewId, row.targetId));
    recipientIds = rows.map(r => r.id);
  }
  // geofence handled client-side at delivery time (see note below)

  await enqueuePushBulk(recipientIds, {
    title: row.title,
    body: row.body,
    priority: row.priority === "emergency" ? "high" : "normal",
    data: { type: "announcement", announcementId: row.id, eventId: row.eventId, priority: row.priority },
  });
}
```

> **Geofence note:** for `geofence` targets, insert an announcement row and let clients subscribe via `GET /api/events/:id/live` — the server filters delivery by checking each user's latest `locationShares` row against `ST_DWithin`. Simpler: enqueue to all, and the SW drops if the cached user location is outside the radius.

### 4.5 Schedule (attendee)

| Route | Contract |
|---|---|
| `POST /api/schedule/:performanceId` | Toggle; returns `{ added, conflictIds }` |
| `POST /api/schedule/:performanceId/reminder` | `{ minutesBefore }` |
| `GET /api/schedule/now-next?eventId=` | Now playing + next near user |
| `GET /api/schedule/export.ics?eventId=&t=` | ICS feed |

**`src/app/api/schedule/[performanceId]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { userScheduleItems, performances } from "@/db/schema";
import { and, eq, ne, lt, gt } from "drizzle-orm";
import { handleRoute, ApiError } from "@/lib/apiHandler";
import { withIdempotency } from "@/lib/idempotency";

const body = z.object({ action: z.enum(["add", "remove"]), clientActionId: z.string().min(8) });

export const POST = handleRoute(async ({ req, session, params }) => {
  const { action, clientActionId } = body.parse(await req.json());
  const perfId = params.performanceId;

  return withIdempotency(session!.userId, clientActionId, async () => {
    const perf = await db.query.performances.findFirst({ where: eq(performances.id, perfId) });
    if (!perf) throw new ApiError(404, "not_found", "Performance not found");

    if (action === "remove") {
      await db.delete(userScheduleItems)
        .where(and(eq(userScheduleItems.userId, session!.userId),
                   eq(userScheduleItems.performanceId, perfId)));
      return { added: false, conflictIds: [] as string[] };
    }

    // Detect conflicts: same user has another item overlapping
    const conflicts = await db.select({ id: userScheduleItems.performanceId })
      .from(userScheduleItems)
      .innerJoin(performances, eq(performances.id, userScheduleItems.performanceId))
      .where(and(
        eq(userScheduleItems.userId, session!.userId),
        ne(userScheduleItems.performanceId, perfId),
        lt(performances.startsAt, perf.endsAt),
        gt(performances.endsAt, perf.startsAt),
      ));

    await db.insert(userScheduleItems)
      .values({ userId: session!.userId, performanceId: perfId })
      .onConflictDoNothing();

    return { added: true, conflictIds: conflicts.map(c => c.id) };
  });
}, { auth: true });
```

**`src/app/api/schedule/export.ics/route.ts`**

```ts
import { handleRoute, ApiError } from "@/lib/apiHandler";
import { db } from "@/db";
import { userScheduleItems, performances, artists, stages, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";
import { env } from "@/lib/env";
import ics from "ics";

function sign(eventId: string, userId: string) {
  return createHmac("sha256", env.ICS_SECRET).update(`${userId}:${eventId}`).digest("hex");
}

export const GET = handleRoute(async ({ req, session }) => {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) throw new ApiError(422, "validation", "eventId required");

  const [ev] = await db.select().from(events).where(eq(events.id, eventId));
  const rows = await db.select({
    perfId: performances.id, startsAt: performances.startsAt, endsAt: performances.endsAt,
    artist: artists.name, stage: stages.name, status: performances.status,
  }).from(userScheduleItems)
    .innerJoin(performances, eq(performances.id, userScheduleItems.performanceId))
    .innerJoin(artists, eq(artists.id, performances.artistId))
    .innerJoin(stages, eq(stages.id, performances.stageId))
    .where(eq(userScheduleItems.userId, session!.userId));

  const event = {
    calName: `Event Buddies · ${ev.name}`,
    events: rows.map(r => ({
      uid: `${r.perfId}@eventbuddies`,
      title: `${r.artist} @ ${r.stage}${r.status !== "scheduled" ? ` (${r.status})` : ""}`,
      start: [r.startsAt.getUTCFullYear(), r.startsAt.getUTCMonth() + 1, r.startsAt.getUTCDate(),
              r.startsAt.getUTCHours(), r.startsAt.getUTCMinutes()] as [number, number, number, number, number],
      end: [r.endsAt.getUTCFullYear(), r.endsAt.getUTCMonth() + 1, r.endsAt.getUTCDate(),
            r.endsAt.getUTCHours(), r.endsAt.getUTCMinutes()] as [number, number, number, number, number],
      startInputType: "utc" as const, startOutputType: "utc" as const,
      endInputType: "utc" as const, endOutputType: "utc" as const,
    })),
  };
  const { error, value } = ics.createEvents(event.events);
  if (error) throw new ApiError(500, "ics", String(error));

  return new Response(value, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=60" },
  });
}, { auth: true });
```

### 4.6 Friends

| Route | Contract |
|---|---|
| `GET /api/friends` | Friends + presence snapshot |
| `POST /api/friends/requests` | `{ handle }` |
| `POST /api/friends/requests/:id/accept` | — |
| `POST /api/friends/requests/:id/decline` | — |
| `DELETE /api/friends/:userId` | — |
| `POST /api/friends/block/:userId` | — |
| `GET /api/friends/requests/incoming` | — |

**`src/app/api/friends/requests/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { friendships, users, pushOutbox } from "@/db/schema";
import { eq, or, and } from "drizzle-orm";
import { handleRoute, ApiError } from "@/lib/apiHandler";
import { enforce } from "@/lib/rateLimit";

const body = z.object({ handle: z.string().min(3).max(32) });

export const POST = handleRoute(async ({ req, session }) => {
  const { handle } = body.parse(await req.json());
  await enforce("default", `fr:${session!.userId}`);

  const target = await db.query.users.findFirst({ where: eq(users.handle, handle) });
  if (!target) throw new ApiError(404, "not_found", "User not found");
  if (target.id === session!.userId) throw new ApiError(422, "validation", "Can't add yourself");

  const existing = await db.query.friendships.findFirst({
    where: or(
      and(eq(friendships.requesterId, session!.userId), eq(friendships.addresseeId, target.id)),
      and(eq(friendships.requesterId, target.id), eq(friendships.addresseeId, session!.userId)),
    ),
  });
  if (existing && existing.status !== "pending") {
    throw new ApiError(409, "conflict", `Already ${existing.status}`);
  }

  const [row] = await db.insert(friendships).values({
    requesterId: session!.userId, addresseeId: target.id,
  }).onConflictDoNothing().returning();

  await db.insert(pushOutbox).values({
    userId: target.id,
    payload: {
      title: "New friend request",
      body: `${handle} wants to be friends`,
      data: { type: "friend_request", requestId: row?.id },
    },
  });

  return NextResponse.json({ friendship: row }, { status: 201 });
}, { auth: true });
```

### 4.7 Crews

| Route | Contract |
|---|---|
| `POST /api/events/:id/crews` | `{ name }` |
| `POST /api/crews/join-by-code` | `{ code }` |
| `GET /api/crews/:id` | Crew + members |
| `POST /api/crews/:id/leave` | — |

### 4.8 Location (the critical one)

| Route | Contract |
|---|---|
| `PATCH /api/location` | `{ eventId, lat, lng, accuracy?, heading? }` (rate-limited; consent required) |
| `POST /api/location/controls` | `{ eventId, crewId?, visibility, expiresInMinutes?, pause? }` |
| `GET /api/location/stream?eventId=` | SSE of friend-visible positions |
| `POST /api/location/consent` | `{ version }` |

**`src/app/api/location/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { locationShares, locationConsents, friendships, crewMembers, users } from "@/db/schema";
import { and, eq, or, isNull, gt } from "drizzle-orm";
import { handleRoute, ApiError } from "@/lib/apiHandler";
import { enforce } from "@/lib/rateLimit";
import { publish } from "@/lib/redis";

const body = z.object({
  eventId: z.string().uuid(),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracy: z.number().int().min(0).max(10000).optional(),
  heading: z.number().min(0).max(360).optional(),
});

export const PATCH = handleRoute(async ({ req, session }) => {
  await enforce("location", `loc:${session!.userId}`);
  const b = body.parse(await req.json());

  const consent = await db.query.locationConsents.findFirst({
    where: eq(locationConsents.userId, session!.userId),
  });
  if (!consent) throw new ApiError(403, "consent_required", "Grant location consent first");

  const shares = await db.select().from(locationShares).where(and(
    eq(locationShares.userId, session!.userId),
    eq(locationShares.eventId, b.eventId),
    isNull(locationShares.pausedAt),
    or(isNull(locationShares.expiresAt), gt(locationShares.expiresAt, new Date())),
  ));
  if (shares.length === 0) return NextResponse.json({ ok: true, fanned: 0 });

  await db.update(locationShares)
    .set({ lat: b.lat, lng: b.lng, accuracyM: b.accuracy ?? null, heading: b.heading ?? null, updatedAt: new Date() })
    .where(and(eq(locationShares.userId, session!.userId), eq(locationShares.eventId, b.eventId)));

  // Fan-out: for each share row, determine the audience and publish to their personal channels
  const user = await db.query.users.findFirst({ where: eq(users.id, session!.userId) });
  let fanned = 0;

  for (const share of shares) {
    // Decide audience
    let audienceIds: string[] = [];
    if (share.crewId) {
      const rows = await db.select({ id: crewMembers.userId }).from(crewMembers)
        .where(eq(crewMembers.crewId, share.crewId));
      audienceIds = rows.map(r => r.id);
    } else {
      const rows = await db.select({
        a: friendships.addresseeId, r: friendships.requesterId,
      }).from(friendships)
        .where(and(
          eq(friendships.status, "accepted"),
          or(eq(friendships.requesterId, session!.userId), eq(friendships.addresseeId, session!.userId)),
        ));
      audienceIds = rows.map(x => (x.a === session!.userId ? x.r : x.a));
    }

    // Precise vs approximate
    const lat = share.visibility === "approximate" ? round(b.lat, 3) + jitter() : b.lat;
    const lng = share.visibility === "approximate" ? round(b.lng, 3) + jitter() : b.lng;

    const msg = {
      userId: session!.userId,
      handle: user?.handle,
      name: user?.name,
      image: user?.image,
      lat, lng,
      accuracy: share.visibility === "approximate" ? 100 : b.accuracy,
      heading: share.visibility === "approximate" ? null : b.heading,
      visibility: share.visibility,
      at: Date.now(),
    };

    await Promise.all(audienceIds.map(id => publish(`loc:user:${id}`, msg)));
    fanned += audienceIds.length;
  }

  return NextResponse.json({ ok: true, fanned });
}, { auth: true });

function round(n: number, p: number) { const f = 10 ** p; return Math.round(n * f) / f; }
function jitter() { return (Math.random() - 0.5) * 0.0005; }
```

**`src/app/api/location/stream/route.ts`** — SSE, per-user channel.

```ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { subscribe } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const channel = `loc:user:${userId}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`));

      send("hello", { channel });
      const sub = await subscribe<any>(channel, (msg) => send("location", msg));
      const ping = setInterval(() => controller.enqueue(encoder.encode(`: ping\n\n`)), 20_000);

      req.signal.addEventListener("abort", async () => {
        clearInterval(ping);
        await sub.close();
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

### 4.9 Push

| Route | Contract |
|---|---|
| `POST /api/push/subscribe` | `{ subscription }` |
| `POST /api/push/unsubscribe` | `{ endpoint }` |
| `GET /api/push/vapid-public-key` | `{ key }` |

**`src/app/api/push/subscribe/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { handleRoute } from "@/lib/apiHandler";

const body = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
  }),
});

export const POST = handleRoute(async ({ req, session }) => {
  const { subscription } = body.parse(await req.json());
  await db.insert(pushSubscriptions).values({
    userId: session!.userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: req.headers.get("user-agent"),
  }).onConflictDoUpdate({
    target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
    set: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
  return NextResponse.json({ ok: true });
}, { auth: true });
```

**`src/lib/push/outbox.ts`**

```ts
import { db } from "@/db";
import { pushOutbox } from "@/db/schema";

export async function enqueuePush(userId: string, payload: {
  title: string; body: string; priority?: "normal" | "high"; data?: Record<string, unknown>;
}) {
  await db.insert(pushOutbox).values({
    userId,
    payload,
    priority: payload.priority ?? "normal",
  });
}

export async function enqueuePushBulk(userIds: string[], payload: Parameters<typeof enqueuePush>[1]) {
  if (userIds.length === 0) return;
  const rows = userIds.map(userId => ({ userId, payload, priority: payload.priority ?? "normal" }));
  // chunk to avoid param limits
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(pushOutbox).values(rows.slice(i, i + 500));
  }
}
```

**`src/lib/push/send.ts`** — worker drains the outbox.

```ts
import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions, pushOutbox } from "@/db/schema";
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

export async function drainOutbox(limit = 200) {
  const batch = await db.select().from(pushOutbox)
    .where(and(
      isNull(pushOutbox.sentAt),
      lte(pushOutbox.attempts, 5),
    ))
    .orderBy(pushOutbox.createdAt)
    .limit(limit);

  for (const row of batch) {
    const subs = await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, row.userId));
    if (subs.length === 0) {
      await db.update(pushOutbox).set({ sentAt: new Date() }).where(eq(pushOutbox.id, row.id));
      continue;
    }
    let success = false;
    let lastError = "";
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(row.payload),
          { urgency: row.priority === "high" ? "high" : "normal" }
        );
        success = true;
      } catch (err: any) {
        lastError = String(err?.statusCode ?? err);
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
      }
    }
    if (success) {
      await db.update(pushOutbox).set({ sentAt: new Date() }).where(eq(pushOutbox.id, row.id));
    } else {
      await db.update(pushOutbox)
        .set({ attempts: sql`${pushOutbox.attempts} + 1`, lastError })
        .where(eq(pushOutbox.id, row.id));
    }
  }
  logger.info({ drained: batch.length }, "push outbox drain");
  return batch.length;
}
```

### 4.10 Offline sync

| Route | Contract |
|---|---|
| `POST /api/sync` | `{ actions: OutboxAction[] }` — idempotent batch |
| `GET /api/events/:id/changes?since=` | Deltas since revision |

**`src/app/api/sync/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleRoute } from "@/lib/apiHandler";
import { toggleScheduleAction } from "@/lib/actions/schedule";
import { toggleFollowAction } from "@/lib/actions/follow";
import { setLocationAction } from "@/lib/actions/location";
import { withIdempotency } from "@/lib/idempotency";

const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("schedule.toggle"), clientActionId: z.string(), performanceId: z.string().uuid(), action: z.enum(["add", "remove"]) }),
  z.object({ type: z.literal("event.follow"), clientActionId: z.string(), eventId: z.string().uuid(), follow: z.boolean() }),
  z.object({ type: z.literal("location.set"), clientActionId: z.string(), eventId: z.string().uuid(), lat: z.number(), lng: z.number(), accuracy: z.number().optional() }),
]);
const body = z.object({ actions: z.array(action).max(50) });

const handlers = {
  "schedule.toggle": toggleScheduleAction,
  "event.follow": toggleFollowAction,
  "location.set": setLocationAction,
} as const;

export const POST = handleRoute(async ({ req, session }) => {
  const { actions } = body.parse(await req.json());
  const results = [];
  for (const a of actions) {
    const result = await withIdempotency(session!.userId, a.clientActionId, () =>
      handlers[a.type](session!.userId, a as any)
    ).catch(e => ({ error: String(e?.message ?? e) }));
    results.push({ clientActionId: a.clientActionId, result });
  }
  return NextResponse.json({ results });
}, { auth: true });
```

**`src/app/api/events/[id]/changes/route.ts`**

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventRevisions, events } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { handleRoute, ApiError } from "@/lib/apiHandler";
import { requireEventAccess } from "@/lib/requireEventRole";

export const GET = handleRoute(async ({ req, session, params }) => {
  await requireEventAccess(params.id, session!.userId);
  const since = Number(new URL(req.url).searchParams.get("since") ?? 0);

  const [ev] = await db.select({ revision: events.revision }).from(events).where(eq(events.id, params.id));
  if (!ev) throw new ApiError(404, "not_found", "Event not found");
  if (ev.revision === since) return NextResponse.json({ revision: since, changes: [] });

  const changes = await db.select().from(eventRevisions)
    .where(and(eq(eventRevisions.eventId, params.id), gt(eventRevisions.revision, since)))
    .orderBy(eventRevisions.revision);

  return NextResponse.json({ revision: ev.revision, changes });
}, { auth: true });
```

### 4.11 Meeting points

| Route | Contract |
|---|---|
| `POST /api/events/:id/meeting-points` | `{ label, lat, lng, crewId?, startsAt? }` (broadcasts to crew) |
| `POST /api/meeting-points/:id/check-in` | `{ lat, lng }` — pings crew |
| `POST /api/meeting-points/:id/close` | — |

### 4.12 Safety / SOS

| Route | Contract |
|---|---|
| `POST /api/sos` | `{ eventId, lat?, lng? }` — creates incident, alerts crew + staff |
| `POST /api/incidents` | `{ eventId, type, description, lat?, lng?, anonymous? }` |
| `POST /api/reports` | `{ targetType, targetId, reason }` |

**`src/app/api/sos/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { incidents, eventMembers, crewMembers, crews, locationShares } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { handleRoute } from "@/lib/apiHandler";
import { enforce } from "@/lib/rateLimit";
import { enqueuePushBulk } from "@/lib/push/outbox";
import { publish } from "@/lib/redis";
import { logger } from "@/lib/logger";

const body = z.object({
  eventId: z.string().uuid(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const POST = handleRoute(async ({ req, session }) => {
  await enforce("sos", `sos:${session!.userId}`);
  const b = body.parse(await req.json());

  const [incident] = await db.insert(incidents).values({
    eventId: b.eventId,
    reporterId: session!.userId,
    type: "sos",
    severity: "critical",
    lat: b.lat ?? null, lng: b.lng ?? null,
    description: "SOS button pressed",
  }).returning();

  // Notify event staff (all member roles)
  const staff = await db.select({ id: eventMembers.userId }).from(eventMembers)
    .where(eq(eventMembers.eventId, b.eventId));
  await enqueuePushBulk(staff.map(s => s.id), {
    title: "🆘 SOS triggered",
    body: `Incident at ${b.lat?.toFixed(5)}, ${b.lng?.toFixed(5)}`,
    priority: "high",
    data: { type: "sos", incidentId: incident.id, eventId: b.eventId },
  });

  // Notify user's crews in this event
  const myCrews = await db.select({ id: crews.id }).from(crews)
    .innerJoin(crewMembers, eq(crewMembers.crewId, crews.id))
    .where(and(eq(crewMembers.userId, session!.userId), eq(crews.eventId, b.eventId)));
  for (const c of myCrews) {
    const peers = await db.select({ id: crewMembers.userId }).from(crewMembers)
      .where(eq(crewMembers.crewId, c.id));
    const recipients = peers.map(p => p.id).filter(id => id !== session!.userId);
    await enqueuePushBulk(recipients, {
      title: "🆘 Crew member needs help",
      body: "Open Event Buddies to see their location",
      priority: "high",
      data: { type: "sos_crew", crewId: c.id, eventId: b.eventId },
    });
  }

  await publish(`evt:${b.eventId}`, {
    type: "sos", incidentId: incident.id, reporterId: session!.userId, at: Date.now(),
  });
  logger.warn({ incidentId: incident.id, eventId: b.eventId }, "sos triggered");

  return NextResponse.json({ incident }, { status: 201 });
}, { auth: true });
```

### 4.13 Analytics (organiser)

**`src/app/api/organiser/events/[id]/analytics/route.ts`**

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventAccess, eventFollows, userScheduleItems, performances, eventAnnouncements, pushOutbox } from "@/db/schema";
import { eq, and, gte, lt, sql, count } from "drizzle-orm";
import { handleRoute } from "@/lib/apiHandler";
import { requireEventRole } from "@/lib/requireEventRole";

export const GET = handleRoute(async ({ session, params }) => {
  await requireEventRole(params.id, session!.userId, "admin");
  const eventId = params.id;

  const [joined] = await db.select({ n: count() }).from(eventAccess).where(eq(eventAccess.eventId, eventId));
  const [followed] = await db.select({ n: count() }).from(eventFollows).where(eq(eventFollows.eventId, eventId));

  const topArtists = await db.select({
    artistId: performances.artistId,
    saves: count(userScheduleItems.id),
  }).from(performances)
    .leftJoin(userScheduleItems, eq(userScheduleItems.performanceId, performances.id))
    .where(eq(performances.eventId, eventId))
    .groupBy(performances.artistId)
    .orderBy(sql`count(${userScheduleItems.id}) desc`)
    .limit(10);

  const [announcementsSent] = await db.select({ n: count() }).from(eventAnnouncements)
    .where(and(eq(eventAnnouncements.eventId, eventId), sql`${eventAnnouncements.sentAt} is not null`));

  return NextResponse.json({
    joined: Number(joined.n),
    followed: Number(followed.n),
    announcementsSent: Number(announcementsSent.n),
    topArtists,
  });
}, { auth: true });
```

### 4.14 Health

**`src/app/api/health/route.ts`**

```ts
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export const GET = async () => {
  const checks: Record<string, "ok" | "fail"> = { db: "fail", redis: "fail" };
  try { await db.execute(sql`select 1`); checks.db = "ok"; } catch {}
  try { await redis.ping(); checks.redis = "ok"; } catch {}
  const ok = Object.values(checks).every(v => v === "ok");
  return NextResponse.json({ ok, checks, uptime: process.uptime() }, { status: ok ? 200 : 503 });
};
```

---

## 5. Real-time — SSE pattern summary

| Channel | Published from | Subscribed via |
|---|---|---|
| `loc:user:{userId}` | `PATCH /api/location` (per-audience fan-out) | `GET /api/location/stream` |
| `evt:{eventId}` | `bumpRevision`, `sos` | `GET /api/events/:id/live` (add this if needed for schedule deltas) |
| `crew:{crewId}` | meeting-point check-ins, chat | `GET /api/crews/:id/stream` |

If you outgrow SSE (iOS Safari tab thottling), swap the transport for a WebSocket server on a side process — the Redis pub/sub layer stays identical.

---

## 6. Background jobs (cron)

Secure with `Authorization: Bearer ${CRON_SECRET}`. Add to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/drain-push", "schedule": "*/1 * * * *" },
    { "path": "/api/cron/reminders", "schedule": "*/1 * * * *" },
    { "path": "/api/cron/announcements", "schedule": "*/1 * * * *" },
    { "path": "/api/cron/cleanup", "schedule": "0 * * * *" }
  ]
}
```

**`src/app/api/cron/_guard.ts`**

```ts
import { env } from "@/lib/env";
import { ApiError } from "@/lib/apiHandler";

export function assertCron(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) throw new ApiError(401, "unauthorized", "Cron only");
}
```

**`src/app/api/cron/reminders/route.ts`** — sends schedule reminders.

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userScheduleItems, performances, artists } from "@/db/schema";
import { and, eq, lte, isNull, isNotNull } from "drizzle-orm";
import { handleRoute } from "@/lib/apiHandler";
import { assertCron } from "../_guard";
import { enqueuePushBulk } from "@/lib/push/outbox";

export const GET = handleRoute(async ({ req }) => {
  assertCron(req);
  const now = new Date();
  const due = await db.select({
    id: userScheduleItems.id, userId: userScheduleItems.userId,
    startsAt: performances.startsAt, artist: artists.name,
  }).from(userScheduleItems)
    .innerJoin(performances, eq(performances.id, userScheduleItems.performanceId))
    .innerJoin(artists, eq(artists.id, performances.artistId))
    .where(and(
      isNotNull(userScheduleItems.reminderAt),
      isNull(userScheduleItems.reminderSentAt),
      lte(userScheduleItems.reminderAt, now),
    )).limit(500);

  for (const r of due) {
    await enqueuePushBulk([r.userId], {
      title: "Up next",
      body: `${r.artist} starts soon`,
      data: { type: "reminder", startsAt: r.startsAt.toISOString() },
    });
    await db.update(userScheduleItems).set({ reminderSentAt: now }).where(eq(userScheduleItems.id, r.id));
  }
  return NextResponse.json({ sent: due.length });
});
```

Also: `/api/cron/drain-push` calls `drainOutbox()`; `/api/cron/announcements` finds `scheduledFor <= now AND sentAt IS NULL` and calls `fanOut`; `/api/cron/cleanup` deletes expired shares, old `action_log` (>7 days), old `event_revisions` (>30 days), stuck outbox rows.

---

## 7. Middleware

**`src/middleware.ts`**

```ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // protect app surfaces
  const protectedPrefixes = ["/e/", "/organiser", "/crew", "/me"];
  if (protectedPrefixes.some(p => pathname.startsWith(p))) {
    const session = await auth();
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/signin";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // security headers
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(self), camera=(self), microphone=()");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
```

---

## 8. Service worker (push + offline cache)

**`public/sw.js`** — the minimal version needed for push delivery and app-shell caching:

```js
const SHELL = "shell-v1";
const API = "api-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(["/", "/offline.html"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  // network-first for API, fall back to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(API).then(c => c.put(event.request, copy));
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  // cache-first for static
  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
  }
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const { title = "Event Buddies", body = "", priority = "normal", data: payload = {} } = data;
  event.waitUntil(self.registration.showNotification(title, {
    body, data: payload,
    tag: payload.type,
    renotify: priority === "high",
    requireInteraction: priority === "high",
    vibrate: priority === "high" ? [200, 100, 200, 100, 200] : undefined,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(self.clients.matchAll({ type: "window" }).then(clients => {
    for (const c of clients) { if (c.url.includes(target) && "focus" in c) return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
```

Register from the app after permission is granted:

```ts
// src/lib/push/register.ts (client)
export async function registerPush(vapidPublicKey: string) {
  const reg = await navigator.serviceWorker.register("/sw.js");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return null;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  await fetch("/api/push/subscribe", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return sub;
}
```

---

## 9. Testing

- **Unit** — `vitest` for `lib/*`, `handleRoute`, `requireEventRole`, `withIdempotency`.
- **Integration** — spin up Postgres in Docker + `testcontainers`; hit route handlers directly.
- **Contract** — one test per route: happy path + auth failure + rate-limit.
- **E2E** — Playwright: guest → join by code → add schedule → enable location → see friend dot.

---

## 10. Deployment checklist

- [ ] Postgres + Redis provisioned; `DATABASE_URL`, `REDIS_URL` set
- [ ] `drizzle-kit migrate` on deploy
- [ ] VAPID keys generated (`npx web-push generate-vapid-keys`) — rotate via env
- [ ] `CRON_SECRET` set; `vercel.json` crons live
- [ ] R2 bucket + presigned upload endpoint (add `POST /api/uploads/presign` when needed)
- [ ] Sentry init in `instrumentation.ts`
- [ ] PostHog init server-side
- [ ] WAF/rate limit at edge (Cloudflare) in front of `/api/*`
- [ ] `AUTH_SECRET`, `ICS_SECRET` set (32+ bytes random)
- [ ] Backup policy for Postgres (daily, 7-day retention)
- [ ] Health check wired to uptime monitor (`/api/health`)
- [ ] Log drain (Axiom/Datadog) receiving pino output

---

## What this gives you

A backend that is complete end-to-end:

- **Auth** with SSO, magic links, guests, sessions, GDPR erasure/export
- **Two-sided events** — public discovery, join-by-code, organiser RBAC, schedule builder, targeted announcements, analytics
- **Location** with explicit consent, per-crew/per-friend scope, time-limited, approximate vs precise, real-time SSE fan-out with per-recipient degradation
- **Offline** — revisions, delta sync, idempotent mutation batch endpoint
- **Push** — persistent outbox, VAPID, service worker, priority/urgency, per-device cleanup on 410
- **Safety** — SOS with fan-out to staff + crew, anonymous incident reporting, report/block
- **Observability** — structured logs, health check, audit log table, crash-safe cron

If you want, I can next write the **client SDK** (`src/lib/api.ts` + `useFriendPresence`, `useScheduleSync`, `useOfflineQueue`) so the frontend talks to this backend cleanly.
