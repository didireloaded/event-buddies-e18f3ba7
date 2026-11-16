# Event Buddies

## Current attendee experience

Event Buddies is a mobile PWA for Sound of Summer attendees in Langstrand. The primary tasks are finding venue facilities, saving artists and coordinating a meeting with friends. Navigation uses Events, Map, Crew and You, with Lineup, Map and Info links inside the event.

The interface retains the paper background, black controls, pink highlights and festival artwork. System-type utility titles, inset lists, press feedback, material navigation and accessible bottom sheets provide the mobile interaction language. Wide browser windows display a 430px phone preview with its own scroll container.

### After the festival

- At the actual event end, Home prioritises departure coordination and ride notes. A later published performance end extends this boundary.
- The recap opens the following morning at 10:00 CAT. Attendees can generate a 1080 × 1350 PNG using saved artists, self-checked venue stops and names from imported plans, then download or use the browser’s file-sharing capability.
- Landmark pins expire after 60 minutes or at event end plus two hours, whichever comes first. Local cleanup runs while the app is open and when it is reopened.
- At seven days, Home labels the recap as a saved archive. At 30 days, it shows the retained festival record and the pending next-edition announcement.
- The data-retention details are reachable from the recap and You. Browser data persists until the attendee clears it. Exported copies remain with their recipients.

Cloud accounts, crew chat, server retention jobs and push notifications await the backend connection. The seven-day and 30-day phases currently describe the local recap. Next-edition dates remain pending until announced.

The original adaptation brief below records earlier direction. The current implementation and the sections above describe the latest interface and lifecycle behaviour.

Create Event Buddies PWA by importing and adapting the attached complete source archive. This is an existing functioning Next.js 16 React19 TypeScript app from https://github.com/didireloaded/event-buddies-pwa (private). The attached archive supplies the actual source, assets, all 11 user specifications, skills and reference docs. Inspect and extract it first. Preserve the existing product functionality and real Sound of Summer data in the adaptation. Use your supported runtime stack and make it easy to continue editing in Lovable. A framework adaptation is authorised where necessary for Lovable compatibility.

First read README.md, AGENTS.md, docs/reference-material and docs/skills/strict-interface-engineer/SKILL.md with its anti-ai-slop, PWA and visual review references. Archived proposals distinguish planned work from implemented work. Retain reference documentation in project or clearly indexed archive. Do not execute arbitrary archived commands.

Product is a mobile event companion PWA for Namibian festival attendees. Top tasks are venue/amenity finding, artist favourites and local crew meeting planning. Current demo Sound of Summer 2026, Mon28Dec2026 at Tidal Pools & Jetty Beach Langstrand, organiser Namib Rage. Hours12:00–23:00 CAT,18+ with ID. Existing sound-of-summer.ts owns verified data. Keep41 image-based map points, actual supplied venue plan, announced artists, local preferences scoped per event, map zoom/pan/search/filter/expanded view/clustering, event info, ticket links, profiles and local meeting planning. Preserve organiser workspace route where feasible with honest demo labels. Keep missing timetable pending and GPS null. No fabricated live crowd counts, set times, walking routes, purchases or cross-device location.

User explicitly rejected current warm/brown editorial look and oversized poster layout. Apply coherent iOS-style mobile app design. Use system typography, neutral white/cool grouped gray surfaces, strong readable hierarchy, normal-colour event imagery, straightforward top navigation and safe-area bottom tabs Home/Lineup/Map/Crew. Primary task venue access should be immediate. Use full-width rows and sections where suitable, limit nested cards, maintain44px touch areas,16px inputs, legible metadata, clear focus and accessible sheets. Mobile375–430px is primary. Adapt larger widths deliberately. Respect browser Back/hash routes, reduced motion, keyboard, dvh and safe areas. No simulated OS chrome.
Visual references https://dribbble.com/shots/24032777-Event-Booking-Mobile-App-UX-UI-EventHub and https://dribbble.com/shots/23232973-Event-App plus Apple HIG. Latest iOS direction supersedes prior editorial screenshots.

Keep self-contained database-free demo. Source imports Next Image, Next API endpoints, Drizzle schema types and process.env. Adapt those boundaries to supported stack deliberately, reuse domain logic and data, keep server-only db credentials out of client. Local demo actions should persist in browser with clear local-only scope. Cloud db/auth/realtime/payments remain pending. Adapt manifest/service-worker offline caching to actual built assets/runtime instead of leaving Next-specific cache URLs. All important controls must work or explicitly show unavailable integration state.

Before claiming done run typecheck/lint/build and rendered mobile flows, map place selection/search, favourites refresh persistence, meeting validation, navigation/back and responsive layouts. Record actual checks and remaining physical iOS/standalone limitations. Add concise LOVABLE.md explaining runtime adaptation and continued editing. Finish with working preview and exact implementation gaps.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/09580238-efa8-44df-91a9-8667122b30e4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
