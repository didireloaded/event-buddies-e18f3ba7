# Event Buddies on Lovable

Mobile event companion PWA for Namibian festival attendees. Current demo:
**Sound of Summer 2026**, Mon 28 Dec 2026, Tidal Pools & Jetty Beach, Langstrand
(Namib Rage Events), 12:00–23:00 CAT, 18+ with ID.

## Runtime adaptation (Next.js 16 → TanStack Start)

| Original (Next.js) | Lovable build |
| --- | --- |
| `app/page.tsx` server component calling `getDemoData()` | `src/routes/index.tsx` calls the pure `getDemoData()` (same data on SSR and client) |
| `app/organiser/page.tsx` | `src/routes/organiser.tsx`: honest read-only demo (readiness checks, stages, point counts, local announcement draft; Send disabled) |
| Hash tabs `#home #lineup #map #crew` | Kept. Browser Back, refresh and deep links work |
| `next/image` | Plain `<img>` with width/height; files in `public/images` |
| Drizzle schema types (`$inferSelect`) | Plain types in `src/lib/event/types.ts` |
| `process.env.DATABASE_URL` switch, `db/`, `/api/demo-actions`, `/api/organiser-actions`, `/api/health`, `proxy.ts` | Removed. The legacy database layer is removed. Attendee account storage uses the managed Lovable Cloud integration. Originals kept as `.txt` under `docs/original-source/` |
| `app/manifest.ts` | `public/manifest.webmanifest` |
| Hand-written `public/sw.js` scraping `/_next/static` | `vite-plugin-pwa` (Workbox generateSW) precaches the real `dist/client` build (JS, CSS, venue plan, photo, icons) and caches SSR pages NetworkFirst. Registered only from `src/lib/pwa.ts`, never in dev, iframes or Lovable preview; `?sw=off` unregisters |
| Warm editorial CSS, local fonts | iOS-style tokens in `src/styles.css`, system font stack |

Verified event data still lives in `src/lib/event/sound-of-summer.ts` (unchanged apart
from type imports): 38 venue points + 3 stages = 41 image-based map points, GPS `null`,
5 announced artists, no set times.

## Where things are

- `src/components/companion/`: attendee app. `EventCompanion` (shell, tabs, sheet state),
  `HomeView`, `LineupView`, `MapView`, `CrewView`, `SheetContent`, `forms`, `ui`.
- `src/lib/attendee/`: clock, schedule/clash/ICS export, map search/filter/cluster,
  meeting validation, local preferences (`event-buddies:<eventId>:attendee` in localStorage).
- `src/test/event-buddies.test.ts`: data, map, meeting, preferences and SW-guard rules.
- `docs/`: all supplied specs, skills, anti-slop archive, reviews, original README/AGENTS and source.

## Continue editing

The [Cloud integration brief](docs/engineering/cloud-integration-brief.md) defines the next shared-crew vertical slice and links the four supplied backend/toolkit references. Its corrected acceptance criteria cover guest continuity, validated invites, RLS, author-owned writes, private realtime and one durable replay path. The owner authorised backend work on 17 November 2026. Attendee Cloud sync is documented in `docs/engineering/attendee-cloud-sync.md`.

For attendee UI, copy, design reviews and builder prompts, apply [anti-slop-brutal](docs/skills/anti-slop-brutal/SKILL.md) alongside [Strict Interface Engineer](docs/skills/strict-interface-engineer/SKILL.md). The supplied manual is retained in the skill’s references. Design reviews use verdict, one fix, issues, missing states, cuts and the five-item ship check. Builder prompts identify the surface, states, exact copy and observable completion conditions.

Current navigation is Events, Lineup, Map and Crew, with Profile in the header. Artist data includes the 24 supplied Post portraits plus Shimza. Lovable supplies the public account connection settings. Review local sharing and recap behaviour against actual source and rendered screens.

Ask Lovable in chat, or edit the files above. Change event data only in
`sound-of-summer.ts`. Run `bunx vitest run` after changing rules.

## Not implemented (honest gaps)

- Public crew discovery, join requests, crew chat and continuous live location. Private Cloud crews, invite codes, shared meetings and expiring landmark pins exist; account favourites and private meetings sync through Cloud.
- Organiser editing/publishing and announcement delivery; push notifications
- Set times/reminders (organiser hasn't published), GPS calibration, walking routes, vendor menus/prices
- Ticket purchase (Howler link only), payments

## Visual source of truth

The current direction is restrained coastal teal actions and favourites, muted amber stage
markers, neutral surfaces, real event photos, a glass-card event picker, a published-event
calendar and a charcoal venue map. See `docs/design/discovery-and-monochrome.md` and
`docs/product/visual-references/`. The earlier warm-paper/hot-pink Codex screenshot is
archived as a historical source and no longer governs the UI.
