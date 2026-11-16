# Event Buddies mobile PWA build

13 November 2026

## Product and visual direction

The attendee app supports three primary tasks — choosing performances, finding places at the venue, and planning where to meet the crew. Home, Lineup, Map and Crew are the four persistent destinations. Browser hash navigation supports direct entry, refresh, Back and Forward.

The supplied first image informed the black and white palette, hot pink and mint accents, large condensed poster type, and dark bottom navigation. The two Dribbble pages were reviewed as supporting references for event discovery, event detail hierarchy, and mobile controls. Monochrome concert photography was selected for the event poster. It is reference photography, and the event details identify it as such. The app uses the existing fictional Eternal Summer event and seeded lineup.

Three product-specific decisions shaped this implementation.

- The event name, date and venue form a poster at the top of Home. Lineup and crew planning have direct entry points beneath it.
- Performances use chronological rows with time, stage, genre and an explicit save control. The same performance detail sheet is accessible from the lineup and venue map.
- The venue plan uses stage and amenity markers with the same pink and mint accent system. Crew planning links a meeting place back to this plan.

The former desktop rail and simultaneous side panel were removed from the attendee experience. Wider browsers display a constrained mobile app surface.

## Documentation reviewed

All ten pasted attachments in this chat were read. Three pairs contain identical material, leaving seven distinct documents.

- Repository analysis
- Foundational gaps and feature opportunities
- Phased schema, API and implementation plan
- Attendee and infrastructure feature inventory
- Full backend implementation proposal
- Delight features and signature feature priorities
- Interactive features, interaction primitives and rollout priorities

The supplied Strict Interface Engineer and anti-slop instructions were applied. The Website Design Craft skill and its anti-slop, responsive accessibility and component-state references were read. Cinematic Stageshow applies to product demonstrations. This deliverable implements the attendee application.

## Implemented behavior

- Four-tab mobile attendee interface with browser navigation
- Event save and unsave
- Chronological lineup with artist, genre and stage search
- Stage filters and personal lineup filter
- Persistent on-device demo schedule
- Overlap detection from actual performance start and end times
- Calendar export for saved performances
- Set Roulette excluding saved, cancelled, completed and ended performances
- Roulette reroll, explicit save and no-candidate state
- Filterable venue plan, zoom controls, place details and stage schedules
- Crew member details and local status selection
- Local meeting planner, edit, removal and countdown
- Event announcements, event sharing, location privacy information and install instructions
- Native HTML dialogs with focus containment, Escape dismissal and focus restoration
- PWA manifest, PNG app icons, Apple metadata, safe-area styles and zoom support
- Demo offline shell, images, locally hosted fonts, built scripts and styles
- Network failure indicator and reconnect check

Demo schedule, event preference, status and meeting choices are local to the browser. Existing database-backed schedule and follow mutations remain available through the existing API when database mode is configured.

## Screen review

| Screen or state | Issue found | Severity | Fix and evidence |
| --- | --- | --- | --- |
| Home | Prior marketing headline duplicated the event artwork and carried desktop structure | Major | Rebuilt around an event poster and two task entry points. Screenshots inspected at 320, 390 and 768 pixels |
| Lineup | Tiny labels, inactive view controls and static clash information | Major | Chronological rows, real search and stage filters, explicit saves, calculated overlaps. Browser interactions and 375/390 pixel screenshots inspected |
| Venue map | Place details could sit below the visible area | Major | Selecting a place scrolls its details into view. Water Station detail measured inside the viewport. Filters and 125% zoom exercised |
| Venue map | Existing dark, textured artwork conflicted with the new visual direction | Minor | Simplified to a lighter schematic. Final 390/430 pixel map screenshots inspected |
| Crew meeting | Stage meeting saved but was rejected during reload validation | Major | Validation now accepts both stages and POIs. A Savannah Stage meeting survived subsequent online and offline reloads |
| Dialog dismissal | Native close on component cleanup did not reliably return focus | Major | Captured the initiating control and restored focus after close. Escape returned focus to Make a plan |
| Offline start | First-visit caching needed the production scripts and styles | Major | Service worker preloads built asset references. Offline reload rendered the application, event image, map and local saved choices |
| Failed save | Browser storage can reject writes | Major | State rolls back and an actionable error appears. Simulated QuotaExceededError verified this behavior |

## Verification performed

| Check | Result |
| --- | --- |
| npm run typecheck | PASS |
| npm run lint | PASS |
| npm run build | PASS |
| Overlap, adjacent set, cancelled set and CAT timezone assertions | PASS |
| Browser save and reload persistence | PASS |
| Search with no matching artist | PASS |
| Savannah stage filter | PASS — three matching performances |
| Roulette candidate exhaustion | PASS — four remaining sets added, then empty state |
| Calendar payload | PASS — three saved events, UTC timestamps and calendar header |
| Simulated storage failure | PASS — rollback and visible error |
| Local crew status after reload | PASS |
| Stage meeting after reload | PASS |
| Native dialog Escape and focus return | PASS |
| Offline full reload | PASS — production build with network requests blocked |
| Save during offline session and reload | PASS |
| Offline map and event photo | PASS |
| Reconnect indicator recovery | PASS |
| 320px route overflow checks | PASS — Home, Lineup, Map and Crew |
| 375, 390 and 430px rendered screens | INSPECTED |
| 768px rendered screen | INSPECTED |
| 1440px layout measurement | PASS — 520px app surface, no overflow |
| Reduced motion | PASS — computed main animation is none |
| Console at end of online checks | No messages |
| Physical iPhone, Safari, standalone installation, on-screen keyboard and VoiceOver | NOT RUN |
| Android physical device, installed mode and TalkBack | NOT RUN |
| Real database, authentication, remote crew delivery and push | NOT RUN — services are unconfigured |

## Remaining product scope

The full supplied backlog still includes authentication, event joining and discovery across multiple events, privacy-controlled live location, friend requests, crew messaging, remote reactions and votes, push delivery, photo uploads, recap generation, and organiser backend work. These require connected services and authorization policies. The supplied backend proposal needs adaptation to the existing schema and installed versions before integration.

The current build is a working local mobile PWA foundation with demo event data. It has not been certified for production release.

## Preview and source

Production preview runs at http://localhost:3001.

Source workspace is `work/Event-Buddies-main` beneath this chat workspace. Main changes are in `src/components/event-companion.tsx`, `src/app/mobile-companion.css`, `src/lib/attendee/`, `src/components/pwa-registration.tsx`, `src/app/manifest.ts`, `src/app/layout.tsx`, `src/proxy.ts`, and `public/sw.js`.

Fonts are DM Sans and Barlow Condensed. Their SIL Open Font License files are included alongside the local fonts. The concert reference image is from Unsplash at https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3.
