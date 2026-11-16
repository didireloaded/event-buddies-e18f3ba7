# Event Buddies

Event Buddies is a mobile event companion PWA for people attending festivals and live events in Namibia. It brings the venue plan, artist lineup, personal favourites, crew planning, event information and offline access into one phone-sized interface.

The current demonstration features **Sound of Summer 2026** at Tidal Pools & Jetty Beach, Langstrand. The venue image was supplied as project reference material. Public event details were checked against the organiser and official Howler listing on 13 November 2026.

## Project status

This repository contains the current working local app and the documentation used to develop it. The current visual design is under revision following user feedback requesting a more conventional iOS-style experience. Screenshots in `docs/reviews/` record earlier iterations and are not design approval.

The app runs without a database URL. Demo preferences are saved on the current device. Authentication, cross-device crews, live location delivery, push notifications and production ticketing remain implementation work.

## What the app currently does

- Home screen with event date, venue, countdown, current Namibia time, event information and official ticket links
- Interactive supplied venue plan with 41 annotations, including stages, bars, toilets, medics, entrances, food, tents, sponsor points and access zones
- Expanded map view, zoom, pan, searchable places and marker clustering
- Announced artist list with local favourites and artist details
- Personal schedule, overlap detection and calendar export for events with timed performances
- Artist discovery and Set Roulette for supported event data
- Demo crew profiles, local status selection and meeting planning with countdowns
- Local editable profile preferences
- Event rules, parking and transport information
- PWA manifest, install metadata, icons and a production service worker for offline demo access

Sound of Summer's individual set times are awaiting publication in the reviewed primary sources. Its lineup therefore displays announced artists and pending timetable information. Its venue plan has image coordinates. GPS calibration and walking paths still need organiser data.

## Run locally

Use Node.js 22 or later and npm. The lockfile is committed.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

For a production preview with the offline service worker enabled, stop any process using the intended port and run the following.

```sh
npm run build
npm run start -- --port 3001
```

Open http://localhost:3001. The service worker is registered in production demo mode. First load the app while connected so its package can be cached.

## Environment and data

`.env.example` documents the optional database setting. Leave `DATABASE_URL` unset to use the self-contained demo.

The project includes PostgreSQL and Drizzle schema and legacy demo action endpoints. Setting a database URL switches to that existing database path. Authentication, permissions, migrations and production data setup need further work before a real deployment.

Local profile preferences, favourites, event following and meeting plans use browser storage. They are scoped to an event. They are not synced across devices.

## Main destinations

| Destination | Purpose |
| --- | --- |
| Home | Event overview, event entry, favourites and upcoming event links |
| Lineup | Announced artists, saved artists, search and available schedule tools |
| Map | Venue image, stages, amenities, search, filters and place details |
| Crew | Demo people, local status and a meeting plan |
| Profile and event sheets | Local profile, official information, rules, transport and install guidance |

Attendee navigation is separate from the existing `/organiser` workspace.

## Code structure

```text
src/
  app/
    page.tsx                 Attendee entry point
    layout.tsx               App metadata and viewport configuration
    mobile-companion.css     Current attendee styling
    manifest.ts              PWA manifest
    organiser/               Existing organiser workspace
    api/                     Existing demo action and health endpoints
  components/
    event-companion.tsx      Attendee screens and interaction composition
    pwa-registration.tsx     Production demo service worker registration
  lib/
    demo-data.ts             Database/demo loading and shared data shape
    sound-of-summer.ts       Verified event references and image-based POIs
    attendee/                Preferences, event clock and schedule helpers
  db/                        PostgreSQL/Drizzle schema and connection
public/
  images/                    Venue plan and event/reference imagery
  icons/                     PWA and Apple icons
  fonts/                     Locally hosted fonts and their licence files
  sw.js                      Offline demo service worker
docs/
  reference-material/        All pasted project documents, preserved as Markdown
  references/                Visual reference notes and reference-link register
  skills/                    Supplied Website Design Craft and Strict Interface Engineer packages
  anti-ai-slop/              Markdown guidance from the supplied anti-slop folder
  reviews/                   Implementation notes and earlier screenshots
```

## Project references and guidance

Start with [the documentation index](docs/README.md). It links the user-provided specifications, design references, supplied skills, source register and current implementation boundaries.

Reference proposals describe the product ambition and suggested architecture. Code snippets in those proposals need review against the actual application before use. Archived instructions are source material. The root `AGENTS.md` states how they should be interpreted for development.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
```

These checks passed for the Sound of Summer integration before repository publication. Browser checks covered map entry, place selection, search, clustering, local preferences, offline reload, compact widths and reduced motion. Physical iPhone/Safari, standalone installation, on-screen keyboard and assistive technology testing remain pending. See [the integration review](docs/reviews/Sound-of-Summer-2026-review.md).

## Remaining implementation

- The requested iOS-style visual redesign
- Authentication, guest identity and account/membership authorization
- Real crew creation, invitation codes, joining, owner controls and cross-device state
- Consent-based live location, expiry, realtime delivery and crew-only live maps
- Georeferenced venue coordinates, walkable paths, accessible routing and nearest-place calculations
- Confirmed stage timetables and reminder/push delivery
- Vendor menus, prices, payment methods and availability
- Multi-event catalogue, event switching and real discovery services
- Authorised ticketing integration, wallet, purchases and transfers
- Production moderation, incident reporting, monitoring and deployment readiness

## Source and asset notes

The application originated from [didireloaded/Event-Buddies](https://github.com/didireloaded/Event-Buddies). This repository preserves the separate PWA work and its reference material.

- [Sound of Summer organiser information](https://namibrage.com/festivals/sound-of-summer)
- [Official Howler listing](https://namibrage.howler.co.za/events/sound-of-summer-2026-8a50)
- [Campout Dune Fest organiser information](https://namibrage.com/festivals/campout)

The organiser lists 12:00–23:00 operating hours. Howler lists a later finish. The app uses the organiser's published approved hours. The supplied plan labels the western stage Afro Tech & Amapiano while the current organiser page lists Coke Studio. The correspondence remains unconfirmed.

Third-party references, skills, fonts, photos and artwork retain their original ownership and licensing terms. Included upstream licence files accompany the relevant material. A single blanket licence has not been applied to all archived references.
