# Event discovery and monochrome build

## Brief and reference lock

Build the attendee PWA for choosing a real event, navigating its venue and coordinating saved plans. The owner’s latest visual direction adds restrained coastal colour to the neutral base. Deep teal owns actions, favourites, active navigation and focus. Muted amber distinguishes stage pins on the charcoal map. Preserve the real event photography and site-plan coordinates.

The supplied glass-card reference’s centre phone owns event selection composition. The supplied calendar owns the month grid. The map reference owns the charcoal surface, search/filter hierarchy and marker treatment. Existing iOS typography, accessible dialogs, hash history and safe areas remain the interaction foundation.

## Built

- Onboarding and event selection hide bottom navigation across routes. Validated crew-plan import remains available through its deep link. Confirming an event reveals the bar through a 240ms slide. Reduced motion removes it.
- The journey audit’s navigation change is applied through Events, Lineup, Map and Crew tabs, with Profile in the header. Desktop uses an unframed, bounded app column.
- Event selection uses the actual festival photo, glass information panel, verified venue/hours and one preview action. The calendar marks the published event date, supports month browsing, shows an actionable empty date and exports verified event hours to ICS.
- Search matches the available event, artist names, venue, city and facility names. The catalogue currently has one complete verified event.
- The venue map uses a charcoal plan treatment and monochrome markers. Its drawing remains the supplied image. The base canvas fills the viewport without stretching the plan. Pinch, pan, zoom controls, category lists, counts and place sheets remain functional.
- Monochrome tokens apply to navigation, controls, exported recap/regroup cards, app icons and browser theme colour.
- Preparation checklist saves device-local progress from Essentials.
- Find Me supports names, custom large messages, event/meetup countdowns, a five-second photo countdown and black/white screen choice. It sends no message and takes no photo automatically.
- Festival Extras contains random choices from actual stages, personal challenges, conversation prompts, photo prompts and a self-reported persistent bingo board.
- Photo Diary stores validated JPG/PNG/WebP photos up to 8 MB each in IndexedDB. Captions and optional real venue landmarks stay with each record. Original downloads and monochrome story-card PNG exports are available. Deletion and the event-scoped privacy cleanup include the diary.
- Saved artist posters export every selected artist without inventing set times.
- The previously empty PWA manifest now describes standalone launch and the existing icon assets.

## Source accounting

All 37 explicitly supplied text-attachment paths are indexed in [the source register](../product/source-register.md). Exact duplicates link to one preserved copy. The five new screenshots are retained under docs/product/visual-references, outside the runtime bundle.

The two feature libraries contain 220 numbered ideas. [The ledger](../product/requirements-ledger.md) records each with source identity, existing behavior, partial implementation, conflicting owner instructions or a deferred dependency. Preserving a proposal does not establish implementation.

## Verification and limits

Verified on 17 November 2026. `npm run check` passed TypeScript, scoped lint, 41 unit tests, 3 credential-scanner tests, the production build and the browser-bundle secret check. The production-preview Playwright suite passed all 18 tests. The expanded suite checks calendar filtering, ICS hours, onboarding gates, checklist persistence, large-message state, private photo save/export/offline/remove, favourites, poster export, bingo, actual-stage handoff, manifest assets, browser Back, map gestures, tickets, assistant offline state and sheets.

Physical iPhone Safari, installed standalone mode, VoiceOver, camera permission and virtual-keyboard behavior require device verification. The browser camera/file picker is invoked by the attendee.

All backend work is deferred by the owner. Accounts, connected memberships, live GPS sharing, delivered requests, voting, live polls, announcements, moderation, organiser publishing, official ticket validation and additional verified event content remain separate dependencies. No schema migrations, provider settings or new gateway endpoints were changed.

Final responsive geometry checks covered Events, Home, Lineup, Map, Crew, Profile, Essentials and Calendar at 320, 390, 768 and 1440 CSS pixels with no horizontal overflow. Rendered event-card, calendar, Home, charcoal map, bingo and short-screen signal screenshots were inspected. These are Chromium web checks. Hosted CI and Lovable sync are checked separately during publication.

## Restrained colour refinement

17 November 2026. The owner asked for more colour after reviewing the monochrome pass. This remains a mobile attendee PWA for finding venue facilities, saving artists and meeting friends. Primary navigation, touch sizes, safe areas and truthful local states retain the existing structure.

Use deep coastal teal for actionable controls and saved state, pale teal for selected filters, and muted amber outlines for actual stage markers. White grouped surfaces and neutral text keep reading light. Event photography supplies the broad colour range. This avoids colouring every row or card and keeps pink out of the interaction palette. The dark-map selection tint has a lighter token for legibility. Icons and labels accompany colour states.

Palette verification passed npm run check and all 18 production-preview browser tests. Eight screen states at 320, 390, 768 and 1440px had no horizontal overflow. Home and Map screenshots were visually inspected at 390px. Browser-rendered sRGB contrast measured 6.78:1 for teal/white controls, 7.01:1 for selected-map-filter text, and 9.57:1 for stage icons against the dark pin surface. Physical-device checks remain outstanding.
