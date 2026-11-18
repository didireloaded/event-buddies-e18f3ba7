# Event Buddies — Requirements Reconciliation Ledger

Updated 18 November 2026 against the connected codebase (`organiser_workspace` foundation, private Cloud sync/crews, MCP server, and attendee PWA). Every row below reflects actual verified code and uses one explicit status: **Implemented**, **Partial**, **Deferred**, or **Blocked**. Saved proposals in `docs/product/sources/` are not treated as implemented features.

## Source preservation

- [product-review](sources/product-review.md) from attachment `79b8bf59-6ca8-4afe-a8bc-73091e84bcf0`.
- [journey-audit](sources/journey-audit.md) from attachment `42b5aee2-05e8-4454-b851-1b14d28cd575`.
- [100-feature-ideas](sources/100-feature-ideas.md) from attachment `b749385f-cce0-4f4e-b314-5901b04ea4a3`.
- journey-audit-second duplicates [journey-audit](sources/journey-audit.md).
- 100-feature-ideas-second duplicates [100-feature-ideas](sources/100-feature-ideas.md).
- [120-feature-platform](sources/120-feature-platform.md) from attachment `eacac6ed-b742-494b-91fb-9e26de3bb191`.
- [dice-patterns](sources/dice-patterns.md) from attachment `ced7ee63-7421-403f-b007-d69bd07bd70f`.
- [dice-partiful](sources/dice-partiful.md) from attachment `ae99e44e-36a4-481c-bcd4-84cc16721599`.
- [linkup-patterns](sources/linkup-patterns.md) from attachment `1e8bdcfb-a758-47a3-aba4-f7f2b959a8ca`.

Earlier supplied documents remain in `docs/engineering/references` and `docs/original-source/`. Duplicate attachments remain linked as aliases above.

## Decisions resolving conflicts

- Explicit latest requests govern. Keep onboarding and event selection without bottom navigation, then reveal navigation (`Events`, `Lineup`, `Map`, `Crew`) after event confirmation, with `You` (profile) in the header.
- Onboarding includes an optional, skippable local photo picker (`AvatarPicker.tsx`) that renders across profile, crew and active check-in map pins without requesting camera permission.
- The glass photo-card event picker and upcoming-events calendar follow `docs/product/visual-references/`.
- The palette uses restrained coastal teal actions/favourites and muted amber stage markers over neutral surfaces (`src/styles.css`). Original photography retains its authentic colours.
- Keep the supplied venue-plan coordinates (`src/lib/event/sound-of-summer.ts`). Road-map styling does not authorize invented roads, walking routes or GPS positions.
- Attendee account sync (`backend/cloud/attendee-sync.sql`), private Cloud crews (`backend/cloud/shared-crews.sql`), MCP public facts server (`src/lib/mcp/`), and private organiser draft/review/live-override workspace (`drizzle/migrations/0000_organiser_workspace.sql`, `src/components/organiser/`) are present. Public social discovery, crew chat, push delivery, partner feed imports, and organiser analytics remain unfinished or blocked.

## 100-feature-ideas

| Source item | Requirement | Status | Audit notes / missing dependency | Owning source |
| --- | --- | --- | --- | --- |
| 1 | Instant Event Explorer | Partial | Onboarding precedes event selection; single verified event (`Sound of Summer 2026`) only | `EventSelection.tsx`, `EventCompanion.tsx` |
| 2 | Personal Festival Dashboard | Implemented | Event hub, saved count, crew shortcut, lifecycle afterglow/recap | `HomeView.tsx`, `PostEventState.tsx` |
| 3 | My Ticket | Partial | Offline IndexedDB ticket vault implemented; official entitlement validation blocked on Howler/ticketing API | `TicketVault.tsx` |
| 4 | Offline Festival Pack | Implemented | Workbox SW precaches app shell, map & 24 portraits; honest offline/reconnect banner (`OfflineReadiness.tsx`) | `pwa.ts`, `OfflineReadiness.tsx` |
| 5 | Unified Search | Partial | Searches artists, venue, city and places for the verified event; multi-event catalogue blocked on additional verified events | `EventSelection.tsx`, `MapView.tsx`, `LineupView.tsx` |
| 6 | Event Timeline | Partial | Event hours & countdown work; per-set timeline blocked on organiser-published set times | `HomeView.tsx`, `LineupView.tsx` |
| 7 | Official Announcements | Partial | In-app one-way broadcast & emergency alert feed (`organiser_broadcasts`, `LiveTab.tsx`, `SheetContent.tsx`); OS web-push blocked on push provider | `LiveTab.tsx`, `SheetContent.tsx`, `organiser-and-crew-extensions.sql` |
| 8 | My Festival Plan | Partial | Saved artists, meeting plan, and AI day-plan review work; unpublished set times stay pending | `LineupView.tsx`, `DayPlanPanel.tsx`, `forms.tsx` |
| 9 | Quick Action Bar | Implemented | Four bottom tabs post-selection plus header safety, profile and menu controls | `EventCompanion.tsx`, `SafetyAccess.tsx` |
| 10 | Multi-Event Support | Blocked | Per-event storage/SQL scoping implemented; blocked on additional verified/published event records | `sound-of-summer.ts`, `organiser_events` |
| 11 | Live DJ Schedule | Blocked | Schedule UI & live organiser status override exist; blocked on organiser-published set times for Sound of Summer | `LineupView.tsx`, `LiveTab.tsx` |
| 12 | Now Playing / Up Next | Blocked | Organiser Live tab filters verified `HH:MM` slots; attendee feed blocked on published timetable (`performances: []`) | `LineupView.tsx`, `LiveTab.tsx` |
| 13 | Favourite DJs | Implemented | Save/remove persists locally and syncs to Cloud account with durable outbox replay | `LineupView.tsx`, `use-attendee.ts` |
| 14 | Performance Reminders | Blocked | Blocked on confirmed set times and push notification provider/permission verification | `SheetContent.tsx` |
| 15 | Set Clash Detector | Blocked | `scheduleClashes()` logic exists (`schedule.ts`); blocked on published overlapping set times | `schedule.ts`, `LineupView.tsx` |
| 16 | Artist Profiles | Implemented | 25 announced artists with 24 supplied portraits, stage/billing, and honest TBA set times | `SheetContent.tsx`, `ArtistAvatar.tsx` |
| 17 | Music Preview | Partial | Opens external Spotify artist search links; no embedded licensed audio playback | `SheetContent.tsx` |
| 18 | Find My DJ on the Map | Implemented | Stage artists open stage pin on map; map search matches artist names (`shimza` → Main Stage) | `SheetContent.tsx`, `map.ts` |
| 19 | Shared Crew Lineup | Implemented | Lineup shows friend badges from both imported QR Bump plans and signed-in Cloud crewmates (`attendee_crew_artist_overlap`) | `LineupView.tsx`, `cloud-extensions.ts`, `organiser-and-crew-extensions.sql` |
| 20 | Discover My Next DJ | Implemented | Random pick from unsaved announced artists (`spin()`) | `EventCompanion.tsx`, `LineupView.tsx` |
| 21 | Smart Map Filters | Implemented | Data-derived category chips with real counts (`Stages 3`, `Bars 17`, `Toilets 5`, `Food 1`, `Medics 2`, `Gates 3`, `Sponsors 6`, `Tents 2`, `Zones 2`) | `MapView.tsx`, `places.ts` |
| 22 | Find Facilities | Implemented | Category filter lists + plan-relative `NearbyPlaces` helper (explicitly marks water stations unmapped) | `MapView.tsx`, `NearbyPlaces.tsx` |
| 23 | Personal Map Pins | Implemented | Private 60m expiring local landmark check-in (`LandmarkCheckin.tsx`) with photo avatar pin & status clear | `LandmarkCheckin.tsx`, `PinPrivacy.tsx` |
| 24 | Crew Meeting Pins | Implemented | Cloud-backed crew meeting (`ConnectedCrew.tsx`) + local meeting & QR exchange (`forms.tsx`, `FestivalBump.tsx`) | `ConnectedCrew.tsx`, `shared-crews.sql` |
| 25 | Stage Information | Implemented | All 3 stages mapped with descriptions and announced artist billing | `MapView.tsx`, `sound-of-summer.ts` |
| 26 | Venue Walking Routes | Blocked | Blocked on verified georeferenced venue GPS calibration and path survey (`mapGeoreferenced: false`) | `sound-of-summer.ts` |
| 27 | Accessible Venue Routes | Blocked | Blocked on verified venue accessibility route survey and georeferenced calibration | `sound-of-summer.ts` |
| 28 | Festival Zone Explorer | Implemented | Experience & Platinum zones mapped with honest entitlement check notes | `MapView.tsx`, `sound-of-summer.ts` |
| 29 | Map Updates | Blocked | Organiser site-plan/zone editor saves to private organiser DB; public attendee live sync & push blocked | `EventReview.tsx`, `organiser_events` |
| 30 | Offline Saved Locations | Implemented | All 41 venue points & site-plan PNG precached for offline map access | `pwa.ts`, `sound-of-summer.ts` |
| 31 | Private Crews | Implemented | Authenticated Cloud private crews: create, 7d expiring invite code/QR, join, leave, owner transfer, RLS & RPC isolation | `ConnectedCrew.tsx`, `shared-crews.sql` |
| 32 | QR Friend Connect | Implemented | Both offline `FestivalBump` QR/link plan share and Cloud crew invite QR (`qrcode.react`, `jsqr`) | `FestivalBump.tsx`, `ConnectedCrew.tsx` |
| 33 | Crew Meeting Planner | Implemented | Shared Cloud crew meeting with revision conflict detection + offline personal meeting validation | `ConnectedCrew.tsx`, `forms.tsx` |
| 34 | Live Friend Location | Partial | Opt-in expiring (1h) Cloud landmark pins & immediate Ghost Mode implemented; continuous GPS tracking intentionally Deferred | `ConnectedCrew.tsx`, `shared-crews.sql` |
| 35 | Quick Status Updates | Partial | Local quick-ping share sheet (`QuickPings.tsx`) and status chips; no in-app real-time status push | `QuickPings.tsx`, `SheetContent.tsx` |
| 36 | Crew Chat | Deferred | Owner-deferred; stays external share/WhatsApp handoff until chat & moderation backend approved | `QuickPings.tsx`, `AfterEventData.tsx` |
| 37 | Regroup Now | Partial | Preset regroup meeting & share helper works locally; no push alert to crew | `Regroup.tsx` |
| 38 | Crew Polls | Deferred | Owner-deferred multi-user backend feature | `requirements-ledger.md` |
| 39 | Shared Travel Plans | Deferred | Local car/shuttle bookmark exists (`RideBookmark.tsx`); shared crew travel deferred | `RideBookmark.tsx` |
| 40 | Safe Check-In | Partial | Opt-in 1h expiring crew landmark pin + Ghost Mode (`ConnectedCrew.tsx`); automated safe check-in notifications deferred | `ConnectedCrew.tsx`, `PinPrivacy.tsx` |
| 41 | Party Screen | Implemented | Full-screen high-contrast signal screen with countdown & custom text | `FindMe.tsx` |
| 42 | Big Text Sign | Implemented | Big text display mode on `FindMe.tsx` | `FindMe.tsx` |
| 43 | Crew Colour Sync | Deferred | Monochrome/teal local signal screen works; synchronized multi-device crew light show deferred | `FindMe.tsx` |
| 44 | Party Countdown | Implemented | Local screen countdown timer (`FindMe.tsx`) | `FindMe.tsx` |
| 45 | Crowd Mood Poll | Deferred | Owner-deferred moderated audience polling | `requirements-ledger.md` |
| 46 | Song of the Night | Deferred | Owner-deferred moderated audience feature | `requirements-ledger.md` |
| 47 | Festival Shoutouts | Deferred | Owner-deferred moderated audience feature | `requirements-ledger.md` |
| 48 | Dance Challenge | Implemented | Local self-reported challenge deck & bingo grid | `FestivalPlay.tsx` |
| 49 | Crew Photo Timer | Implemented | 5-second local countdown screen (`FindMe.tsx`); native camera shutter remains separate user action | `FindMe.tsx` |
| 50 | Spin the Next Stage | Implemented | Random pick from verified venue stages (`FestivalPlay.tsx`) | `FestivalPlay.tsx` |
| 51 | Festival Scavenger Hunt | Blocked | Blocked on organiser-authored scavenger checkpoints & rules | `sound-of-summer.ts` |
| 52 | Festival Bingo | Implemented | Persistent local self-reported festival bingo (`play.ts`) | `FestivalPlay.tsx`, `play.ts` |
| 53 | DJ Trivia | Blocked | Blocked on verified artist/festival trivia content | `sound-of-summer.ts` |
| 54 | Crew Challenges | Deferred | Owner-deferred multi-user challenge backend | `requirements-ledger.md` |
| 55 | Stage Explorer | Partial | Self-reported local festival passport implemented; official NFC/QR checkpoints deferred | `FestivalPassport.tsx` |
| 56 | Festival Predictions | Blocked | Blocked on verified event/schedule data and scoring rules | `requirements-ledger.md` |
| 57 | Challenge Wheel | Implemented | Local challenge spinner (`FestivalPlay.tsx`) | `FestivalPlay.tsx` |
| 58 | Best Festival Outfit | Deferred | Owner-deferred moderated social contest | `requirements-ledger.md` |
| 59 | Sponsor Treasure Trail | Deferred | Owner-deferred sponsor campaign & verification backend | `requirements-ledger.md` |
| 60 | Hidden Achievements | Blocked | Blocked on verified event checkpoint data | `requirements-ledger.md` |
| 61 | Festival Camera | Implemented | Private IndexedDB photo capture/upload, caption & landmark tagging (`EventMemories.tsx`) | `EventMemories.tsx`, `memories.ts` |
| 62 | Personal Photo Diary | Implemented | Private per-event photo diary with remove/replace & download | `EventMemories.tsx`, `memories.ts` |
| 63 | Moment Bookmarks | Implemented | Landmark-linked local memories (`EventMemories.tsx`) | `EventMemories.tsx` |
| 64 | Crew Photo Album | Deferred | Owner-deferred shared media storage & moderation | `AfterEventData.tsx` |
| 65 | Photo Missions | Implemented | Local photo challenge prompts (`FestivalPlay.tsx`) | `FestivalPlay.tsx` |
| 66 | Official Aftermovie Submissions | Deferred | Owner-deferred rights/moderation submission pipeline | `requirements-ledger.md` |
| 67 | Personal Festival Recap | Implemented | Post-event recap view (`EventRecap.tsx`, `PostEventState.tsx`) and PNG card export (`recap-card.ts`) | `EventRecap.tsx`, `recap-card.ts` |
| 68 | My Lineup Poster | Implemented | Monochrome PNG export of saved artists (`createLineupPoster`) | `LineupView.tsx`, `recap-card.ts` |
| 69 | Crew Yearbook | Deferred | Owner-deferred shared post-event crew archive | `requirements-ledger.md` |
| 70 | Festival Memory Archive | Partial | Local event-scoped diary implemented; multi-year cross-event archive blocked on multi-event catalogue & retention policy | `EventMemories.tsx` |
| 71 | Vendor Directory | Blocked | Food court & sponsors mapped on plan; full vendor directory blocked on organiser vendor details | `sound-of-summer.ts` |
| 72 | Food Menus | Blocked | Blocked on organiser/vendor menu & pricing data | `sound-of-summer.ts` |
| 73 | Accepted Payments | Blocked | Blocked on organiser/vendor payment method confirmation | `sound-of-summer.ts` |
| 74 | Queue Information | Deferred | Owner-deferred live queue telemetry | `requirements-ledger.md` |
| 75 | Water Stations | Blocked | `NearbyPlaces` handles missing water category honestly; blocked on verified water point coordinates | `NearbyPlaces.tsx`, `sound-of-summer.ts` |
| 76 | Charging Points | Blocked | Not listed on supplied site plan; blocked on verified organiser data | `InfoView.tsx`, `sound-of-summer.ts` |
| 77 | Shuttle Information | Blocked | Transport card notes buses exist on Howler; stops, times & fares blocked on organiser confirmation | `InfoView.tsx`, `sound-of-summer.ts` |
| 78 | Find My Ride | Implemented | Car/shuttle landmark bookmark + optional ride photo + map reopen (`RideBookmark.tsx`, `RidePhoto.tsx`) | `RideBookmark.tsx`, `RidePhoto.tsx` |
| 79 | Lost and Found | Blocked | Listed as pending confirmation in `SafetyAccess.tsx` until organiser supplies contact/location | `SafetyAccess.tsx` |
| 80 | Accessibility Guide | Blocked | Blocked on verified organiser accessibility information | `sound-of-summer.ts` |
| 81 | Emergency Map | Implemented | 2 medical points mapped with direct filter (`Medics` / safety icon) & `SafetyAccess` sheet | `SafetyAccess.tsx`, `MapView.tsx` |
| 82 | Emergency Contacts | Blocked | Safety sheet points to medical stations; one-tap call blocked on verified emergency phone number | `SafetyAccess.tsx` |
| 83 | Verified Information Labels | Implemented | Explicit "pending organiser confirmation" / "unpublished" labels across Assistant, Lineup, Info & MCP | `EventAssistant.tsx`, `event-facts.ts`, `mcp/` |
| 84 | Low-Battery Mode | Partial | `batterySaver` adjusts clock refresh (60s vs 10s) and `prefers-reduced-motion` is respected; full OS power profiling pending | `EventCompanion.tsx`, `styles.css` |
| 85 | Expiring Location Sharing | Implemented | Both local (60m) and Cloud crew landmark pins auto-expire within 60m or event end + 2h, plus Ghost Mode | `shared-crews.sql`, `PinPrivacy.tsx` |
| 86 | Granular Sharing Permissions | Partial | Opt-in landmark sharing + Ghost Mode + selective contact fields in `FestivalBump`; per-member rules deferred | `ConnectedCrew.tsx`, `FestivalBump.tsx` |
| 87 | Block and Report | Deferred | Deferred with public social discovery/chat | `requirements-ledger.md` |
| 88 | Outdoor Visibility Mode | Partial | High-contrast tokens & original/monochrome map toggle implemented; field sunlight verification pending | `MapView.tsx`, `styles.css` |
| 89 | Language Options | Blocked | English-only copy; localized event data & translations blocked on verified multi-language content | `sound-of-summer.ts` |
| 90 | Offline Status Indicator | Implemented | Header offline banner (`WifiOff`) + `OfflineReadiness` registration & status sheet | `EventCompanion.tsx`, `OfflineReadiness.tsx` |
| 91 | Organiser Dashboard | Implemented | Magic-link `/organiser` PWA, 4 tabs, PDF extract, site-plan/zone editor, admin verification queue & Cloud SQL extensions | `OrganiserApp.tsx`, `AccountTab.tsx`, `organiser-and-crew-extensions.sql` |
| 92 | Official Event Updates | Partial | Organiser Live tab edits `program` status and publishes in-app broadcasts (`organiser_broadcasts`); background push blocked on push provider | `LiveTab.tsx`, `SheetContent.tsx` |
| 93 | Lineup Management | Implemented | Organiser Program sheet adds/edits/reorders/removes items & adapts Festival/Conference/Corporate terms | `EventReview.tsx`, `LiveTab.tsx` |
| 94 | Vendor Management | Deferred | Out of first-release organiser scope (zones cover food/bar/sponsor pins on site plan) | `EventReview.tsx` |
| 95 | Venue Issue Reporting | Deferred | Owner-deferred operations workflow | `requirements-ledger.md` |
| 96 | Sponsor Campaigns | Deferred | Excluded per Build Brief ("no sponsor-management suite") | `requirements-ledger.md` |
| 97 | Live Stage Polls | Deferred | Owner-deferred moderated audience polling | `requirements-ledger.md` |
| 98 | Event Analytics | Implemented | Aggregate-only counts RPC (`organiser_event_aggregates`: saved plans, crews, members, active pins) + counts-only CSV export; zero PII | `LiveTab.tsx`, `organiser-and-crew-extensions.sql` |
| 99 | Multi-Festival Platform | Partial | Per-event ID isolation, organiser CRUD & `list_published_events()` → `EventSelection.tsx` sync built; awaiting additional verified public events | `EventSelection.tsx`, `organiser-and-crew-extensions.sql` |
| 100 | Official Ticketing Integration | Blocked | External Howler link only; ticket validation & tier entitlements blocked on ticketing provider integration | `TicketVault.tsx`, `OrganiserWorkspace.tsx` |

## 120-feature-platform

| Source item | Requirement | Status | Audit notes / missing dependency | Owning source |
| --- | --- | --- | --- | --- |
| 1 | Explore Events | Partial | Glass photo card explorer & search built for Sound of Summer; wider catalogue blocked on verified events | `EventSelection.tsx` |
| 2 | Nearby Events | Blocked | Blocked on verified multi-event catalogue and geographic location opt-in | `EventSelection.tsx` |
| 3 | Event Categories | Partial | Event category rendered (`Music festival`); multi-category filtering needs multiple verified events | `EventSelection.tsx` |
| 4 | Advanced Event Search | Partial | Searches artists, venue, city & places for current event; multi-event search pending catalogue | `EventSelection.tsx` |
| 5 | My Events | Partial | Event follow/save & per-event storage scoping works for Sound of Summer | `HomeView.tsx`, `use-attendee.ts` |
| 6 | Follow Organisers | Deferred | Owner-deferred multi-organiser public directory feature | `requirements-ledger.md` |
| 7 | Personalised Recommendations | Deferred | Owner-deferred multi-event recommendation engine | `requirements-ledger.md` |
| 8 | Event Collections | Deferred | Owner-deferred multi-event curation | `requirements-ledger.md` |
| 9 | Event Sharing | Implemented | Web Share API + clipboard URL copy (`shareEvent`) | `EventCompanion.tsx` |
| 10 | Event Calendar | Implemented | Month calendar grid with event-day highlight, date filter & `.ics` download | `EventSelection.tsx`, `schedule.ts` |
| 11 | Ticket Wallet | Partial | IndexedDB image/PDF vault with replace & delete; validation deferred/blocked | `TicketVault.tsx` |
| 12 | Ticket Integrations | Blocked | External Howler URL only; provider API integration blocked | `HomeView.tsx`, `OrganiserWorkspace.tsx` |
| 13 | Entry QR Quick Access | Partial | Opens full-size offline ticket image/PDF from Home & You; no live gate validation | `TicketVault.tsx`, `HomeView.tsx` |
| 14 | Personal Itinerary | Partial | Saved artists, meeting plan & AI day plan (`DayPlanPanel.tsx`); set times blocked on organiser schedule | `LineupView.tsx`, `DayPlanPanel.tsx` |
| 15 | Event Reminders | Blocked | Blocked on confirmed set times and verified push notifications | `SheetContent.tsx` |
| 16 | Schedule Conflict Detection | Blocked | `scheduleClashes()` implemented; blocked on published overlapping set times | `schedule.ts` |
| 17 | Group Planning | Implemented | Cloud private crew shared meeting (`ConnectedCrew.tsx`) + offline QR plan comparison (`LineupView.tsx`) | `ConnectedCrew.tsx`, `LineupView.tsx` |
| 18 | Transport Planner | Partial | Verified transport notes + local car/shuttle landmark bookmark; bus times/stops blocked on organiser data | `InfoView.tsx`, `RideBookmark.tsx` |
| 19 | Preparation Checklist | Implemented | Persistent festival packing checklist (`PreparationChecklist.tsx`) | `PreparationChecklist.tsx`, `preparation.ts` |
| 20 | Download Event Pack | Implemented | Workbox SW offline precache & status verification (`OfflineReadiness.tsx`) | `pwa.ts`, `OfflineReadiness.tsx` |
| 21 | Dynamic Event Programme | Blocked | Organiser editor & DB exist; attendee live feed blocked on public `organiser_events` sync & set times | `EventReview.tsx`, `LineupView.tsx` |
| 22 | Now Happening | Blocked | Organiser Live tab filters `HH:MM` items; attendee display blocked on published set times | `LiveTab.tsx`, `LineupView.tsx` |
| 23 | Coming Up Next | Blocked | Blocked on published artist set times | `sound-of-summer.ts` |
| 24 | Favourite Performers | Implemented | Heart toggle + Cloud account sync & durable outbox replay | `LineupView.tsx`, `use-attendee.ts` |
| 25 | Performer Profiles | Implemented | Artist detail sheets with supplied portraits, billing, stage & Spotify search | `SheetContent.tsx`, `ArtistAvatar.tsx` |
| 26 | Programme Filters | Implemented | Stage chips, search box, and `All` / `Saved` toggle | `LineupView.tsx` |
| 27 | Personal Schedule View | Partial | Shows saved artists & reviewed day plan; timed rows await published set times | `LineupView.tsx`, `DayPlanPanel.tsx` |
| 28 | Programme Changes | Blocked | Organiser Live tab edits `program` status (`delayed`/`moved`/`cancelled`); attendee live push blocked | `LiveTab.tsx` |
| 29 | Crew Schedule Comparison | Implemented | Lineup displays avatar badges from both QR Bump imports and signed-in Cloud crewmates (`attendee_crew_artist_overlap`) | `LineupView.tsx`, `cloud-extensions.ts` |
| 30 | Smart Event Suggestions | Implemented | Grounded Lovable AI Gateway day plan (`suggestDayPlan`) clamping unverified times to TBA | `DayPlanPanel.tsx`, `day-plan.functions.ts` |
| 31 | Interactive Venue Maps | Implemented | Supplied venue plan with zoom (+/-), pinch/drag pan, full-screen dialog & monochrome/original toggle | `MapView.tsx`, `use-map-gestures.ts` |
| 32 | Search the Map | Implemented | Searches places, types, synonyms (`bathroom`, `medical`) & artist-to-stage mapping | `MapView.tsx`, `map.ts` |
| 33 | Facility Filters | Implemented | Data-derived category chips + instant matching list sheet | `MapView.tsx`, `places.ts` |
| 34 | Save a Landmark | Implemented | Private 60m local landmark pin (`LandmarkCheckin.tsx`) + Cloud crew pin (`ConnectedCrew.tsx`) | `LandmarkCheckin.tsx`, `ConnectedCrew.tsx` |
| 35 | Share a Meeting Point | Implemented | Cloud crew meeting sync + offline Bump QR/link exchange | `ConnectedCrew.tsx`, `FestivalBump.tsx` |
| 36 | Find My Parking | Implemented | Car/shuttle landmark bookmark + optional ride photo + map jump | `RideBookmark.tsx`, `RidePhoto.tsx` |
| 37 | Walking Navigation | Blocked | Blocked on verified georeferenced GPS calibration (`mapGeoreferenced: false`) | `sound-of-summer.ts` |
| 38 | Accessible Route Information | Blocked | Blocked on verified venue accessibility route data | `sound-of-summer.ts` |
| 39 | Live Venue Updates | Blocked | Organiser zone edits save to DB; live attendee map updates blocked on public organiser-event feed | `EventReview.tsx` |
| 40 | Map Checkpoints | Partial | Self-reported local Festival Passport (`FestivalPassport.tsx`); verified checkpoints deferred | `FestivalPassport.tsx` |
| 41 | Buddies Network | Deferred | Public attendee network deferred; private event-scoped Cloud crews implemented | `ConnectedCrew.tsx` |
| 42 | Create a Crew | Implemented | Authenticated Cloud private crew creation with server RPC & RLS isolation | `ConnectedCrew.tsx`, `shared-crews.sql` |
| 43 | QR Friend Connect | Implemented | Expiring Cloud crew invite QR/code + offline Festival Bump QR/code | `ConnectedCrew.tsx`, `FestivalBump.tsx` |
| 44 | Crew Invitations | Implemented | Server-validated 7-day / event-end+2h invites with owner revocation & rate limits | `ConnectedCrew.tsx`, `shared-crews.sql` |
| 45 | Crew Meetup Planner | Implemented | Shared Cloud crew meeting with revision conflict handling + personal meeting form | `ConnectedCrew.tsx`, `forms.tsx` |
| 46 | Live Location Sharing | Partial | Opt-in 1h expiring landmark pins & Ghost Mode implemented; continuous GPS tracking deferred | `ConnectedCrew.tsx`, `shared-crews.sql` |
| 47 | Quick Status Messages | Partial | Quick message presets via native share/clipboard (`QuickPings.tsx`); no in-app chat delivery | `QuickPings.tsx` |
| 48 | Crew Chat | Deferred | Owner-deferred; stays external share handoff | `AfterEventData.tsx` |
| 49 | Crew Voting | Deferred | Owner-deferred multi-user backend feature | `requirements-ledger.md` |
| 50 | Regroup Mode | Partial | Regroup time presets + shareable location text; no in-app push alert | `Regroup.tsx` |
| 51 | Open to Meet | Deferred | Owner-deferred public discovery feature | `requirements-ledger.md` |
| 52 | Interest Badges | Deferred | Owner-deferred social discovery feature | `requirements-ledger.md` |
| 53 | Event Connections | Deferred | Owner-deferred persistent social graph | `requirements-ledger.md` |
| 54 | QR Contact Exchange | Implemented | Versioned QR/code payload with validated import & optional contact details | `FestivalBump.tsx`, `festival-bump.ts` |
| 55 | Networking Mode | Deferred | Owner-deferred public discovery feature | `requirements-ledger.md` |
| 56 | Find Shared Interests | Deferred | Owner-deferred public discovery feature | `requirements-ledger.md` |
| 57 | Community Meetups | Deferred | Owner-deferred public group feature | `requirements-ledger.md` |
| 58 | New Friend Icebreakers | Implemented | Local conversation prompts (`FestivalPlay.tsx`) | `FestivalPlay.tsx` |
| 59 | Connection Requests | Deferred | Owner-deferred friend/crew request flow | `requirements-ledger.md` |
| 60 | Temporary Event Groups | Partial | Event-scoped private Cloud crews implemented (`attendee_crews`); public temp groups deferred | `ConnectedCrew.tsx`, `shared-crews.sql` |
| 61 | Party Screen | Implemented | Full-screen high-contrast beacon & countdown screen | `FindMe.tsx` |
| 62 | Find My Crew Screen | Implemented | High-visibility beacon mode (`FindMe.tsx`) | `FindMe.tsx` |
| 63 | Colour-Matched Crew Mode | Deferred | Local high-contrast display exists; cross-device crew colour sync deferred | `FindMe.tsx` |
| 64 | Big Message Mode | Implemented | Large text beacon screen (`FindMe.tsx`) | `FindMe.tsx` |
| 65 | Event Countdown | Implemented | Event phase countdown & FindMe timer | `HomeView.tsx`, `FindMe.tsx` |
| 66 | Party Roulette | Implemented | Local random stage & challenge picker (`FestivalPlay.tsx`) | `FestivalPlay.tsx` |
| 67 | Spin the Next Activity | Implemented | Local challenge spinner (`FestivalPlay.tsx`) | `FestivalPlay.tsx` |
| 68 | Crew Photo Challenge | Implemented | Local photo challenge prompt cards (`FestivalPlay.tsx`) | `FestivalPlay.tsx` |
| 69 | Group Selfie Timer | Implemented | 5-second local countdown screen (`FindMe.tsx`) | `FindMe.tsx` |
| 70 | Party Reactions | Deferred | Owner-deferred live social backend | `requirements-ledger.md` |
| 71 | Event Passport | Partial | Self-reported local stops checklist (`FestivalPassport.tsx`); verified stamps deferred | `FestivalPassport.tsx` |
| 72 | Scavenger Hunts | Blocked | Blocked on organiser-supplied hunt checkpoints | `sound-of-summer.ts` |
| 73 | Event Bingo | Implemented | Persistent local festival bingo (`FestivalPlay.tsx`) | `FestivalPlay.tsx`, `play.ts` |
| 74 | Trivia Battles | Blocked | Blocked on verified trivia data & multiplayer backend | `requirements-ledger.md` |
| 75 | Crew Challenges | Deferred | Owner-deferred multi-user backend feature | `requirements-ledger.md` |
| 76 | Daily Challenges | Blocked | Blocked on organiser-supplied challenge content | `requirements-ledger.md` |
| 77 | Hidden Achievements | Blocked | Blocked on verified checkpoint/event triggers | `requirements-ledger.md` |
| 78 | Challenge Leaderboards | Deferred | Owner-deferred multi-user scoring backend | `requirements-ledger.md` |
| 79 | Sponsor Missions | Deferred | Owner-deferred sponsor campaigns | `requirements-ledger.md` |
| 80 | Collectible Event Badges | Partial | Self-reported passport progress (`FestivalPassport.tsx`) | `FestivalPassport.tsx` |
| 81 | Live Audience Polls | Deferred | Owner-deferred moderated audience polling | `requirements-ledger.md` |
| 82 | Live Q&A | Deferred | Owner-deferred moderated Q&A | `requirements-ledger.md` |
| 83 | Crowd Mood Check | Deferred | Owner-deferred moderated audience feature | `requirements-ledger.md` |
| 84 | Favourite Performance Voting | Blocked | Blocked on published timetable & voting backend | `requirements-ledger.md` |
| 85 | Sports Fan Polls | Deferred | Owner-deferred feature | `requirements-ledger.md` |
| 86 | Event-Wide Trivia | Blocked | Blocked on verified event trivia content | `requirements-ledger.md` |
| 87 | Live Challenge Results | Deferred | Owner-deferred live backend | `requirements-ledger.md` |
| 88 | Interactive Venue Screens | Deferred | Owner-deferred venue screen integration | `requirements-ledger.md` |
| 89 | Digital Applause | Deferred | Owner-deferred live interaction | `requirements-ledger.md` |
| 90 | Live Event Feed | Deferred | Owner-deferred moderated social feed | `requirements-ledger.md` |
| 91 | Event Camera | Implemented | Private IndexedDB photo capture/upload & diary (`EventMemories.tsx`) | `EventMemories.tsx`, `memories.ts` |
| 92 | Custom Event Photo Frames | Partial | Monochrome story card export (`memory-card.ts`); organiser-uploaded custom frames blocked | `memory-card.ts` |
| 93 | Personal Photo Diary | Implemented | Private local captions, landmark links, download & delete | `EventMemories.tsx`, `memories.ts` |
| 94 | Crew Photo Albums | Deferred | Owner-deferred shared album backend | `AfterEventData.tsx` |
| 95 | Memory Map | Implemented | Landmark-linked local memories (`EventMemories.tsx`) | `EventMemories.tsx` |
| 96 | Event Highlight Cards | Implemented | Local downloadable PNG story & recap cards (`memory-card.ts`, `recap-card.ts`) | `memory-card.ts`, `recap-card.ts` |
| 97 | Personalised Event Recap | Implemented | Post-event recap view & exportable PNG card | `EventRecap.tsx`, `recap-card.ts` |
| 98 | My Year in Events | Blocked | Blocked on verified multi-event catalogue & history policy | `EventRecap.tsx` |
| 99 | Official Content Submissions | Deferred | Owner-deferred submission/moderation workflow | `requirements-ledger.md` |
| 100 | Event Memory Archive | Partial | Per-event local diary; cross-event archive blocked on multi-event catalogue | `EventMemories.tsx` |
| 101 | Emergency Information | Implemented | Medical & security places + honest steward/safety guidance (`SafetyAccess.tsx`) | `SafetyAccess.tsx` |
| 102 | Medical Facility Locator | Implemented | 2 medical stations mapped with `Medics` filter & `NearbyPlaces` proximity order | `MapView.tsx`, `NearbyPlaces.tsx` |
| 103 | Safety Announcements | Partial | In-app emergency broadcast with explicit confirmation (`organiser_broadcasts`, `LiveTab.tsx`); background OS push blocked on push provider | `LiveTab.tsx`, `SheetContent.tsx` |
| 104 | Safe Check-In | Partial | Expiring Cloud landmark pin + Ghost Mode; automated check-in alerts deferred | `ConnectedCrew.tsx` |
| 105 | Temporary Location Sharing | Implemented | 60m auto-expiring pins (local & Cloud crew), server generation revocation & Ghost Mode | `shared-crews.sql`, `PinPrivacy.tsx` |
| 106 | Privacy Dashboard | Implemented | Clear local/account/crew boundaries, pin revocation & local wipe (`PrivacyPanel.tsx`) | `PrivacyPanel.tsx` |
| 107 | Low Battery Experience | Partial | `batterySaver` clock throttling + reduced-motion support; physical battery benchmarks pending | `EventCompanion.tsx`, `styles.css` |
| 108 | Offline Emergency Information | Implemented | Medical stations, rules & safety guidance precached offline | `pwa.ts`, `SafetyAccess.tsx` |
| 109 | Accessibility Settings | Partial | Reduced motion, keyboard focus return, accessible `<dialog>` sheets & high-contrast tokens; VoiceOver audit pending | `Sheet.tsx`, `styles.css` |
| 110 | Report and Block | Deferred | Deferred with public discovery/chat | `requirements-ledger.md` |
| 111 | Event Builder | Implemented | Organiser `/organiser` Events, Create (PDF/manual), & Review sheets backed by RLS (`organiser_events`) | `OrganiserApp.tsx`, `EventReview.tsx`, `CreateTab.tsx` |
| 112 | Event Templates | Partial | Duplicate-for-next-edition keeps verified venue/rules/zones/site-plan; template gallery not added | `EventReview.tsx` |
| 113 | Feature Toggles | Deferred | Not exposed separately; capabilities adapt automatically by verified event type/data | `schema.ts` |
| 114 | Brand Customisation | Partial | Organiser logo upload & Event-type labels (`Festival`/`Conference`/`Corporate`) implemented; theme overrides not exposed | `AccountTab.tsx`, `EventReview.tsx` |
| 115 | Programme Manager | Implemented | Add/edit/reorder/remove items, status changes & live overrides (`EventReview.tsx`, `LiveTab.tsx`) | `EventReview.tsx`, `LiveTab.tsx` |
| 116 | Interactive Map Editor | Implemented | Site-plan upload + tap-to-position `(x, y)` percentage pins for stages, bars, medical, gates & zones | `EventReview.tsx` |
| 117 | Announcement Centre | Partial | In-app one-way update & emergency broadcast composer and attendee feed (`organiser_broadcasts`); background push blocked on push provider | `LiveTab.tsx`, `SheetContent.tsx` |
| 118 | Interactive Activity Builder | Deferred | Out of first-release organiser scope | `requirements-ledger.md` |
| 119 | Organiser Analytics | Implemented | Aggregate-only counts RPC (`organiser_event_aggregates`) + counts-only CSV export in `LiveTab.tsx` (zero PII) | `LiveTab.tsx`, `organiser-and-crew-extensions.sql` |
| 120 | Team Roles and Permissions | Partial | `app_role ('admin')`, `has_role()` & strict `owner_id = auth.uid()` RLS enforced; multi-member team invites deferred | `0000_organiser_workspace.sql`, `AccountTab.tsx` |
