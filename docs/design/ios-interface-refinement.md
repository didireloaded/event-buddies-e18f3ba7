# iOS interface refinement

The owner’s 17 November monochrome direction and event-selection references supersede this earlier pink-accent refinement. See [the current build report](discovery-and-monochrome.md).

## Brief

Event Buddies is a mobile PWA for Sound of Summer attendees finding facilities, saving artists and meeting friends on a low-signal coast. The primary tasks are opening a venue point, finding a friend’s shared meetup and reviewing the lineup. Navigation remains Events, Map, Crew and You, with browser hash history.

Retain the supplied festival photography, artist portraits, hot-pink identity and authentic venue plan. Following the owner’s further rejection of the editorial appearance, use a neutral grouped-grey canvas, white surfaces, pink actions, system typography and a light edge-aligned tab bar. Use compact toolbars, inset rows and contextual sheets.

## Screen and state ownership

- First visit collects a name, then shows deliberate event selection. The real event opens a preview sheet with “I’m going.” Selection persists in event-scoped preferences. Existing named users retain their event. You offers Switch event. Accepted, validated plan imports select the same event.
- Selection has no bottom tab bar. Its past-event state opens the existing recap. Only the real event is listed.
- Home uses a compact event thumbnail, date, venue and countdown. Konsta iOS List and ListItem components expose Lineup, Map and Essentials as task rows with real counts. The crew action and tappable people remain on Home. Transport, coast details and the assistant live in Essentials.
- Crew shows the attendee and people from actually imported plans. Avatars open saved-plan details with a meeting-point action and removal. QR sharing, scanning, regroup and the find-me screen retain their real local behavior. The meetup editor is secondary.
- Map shows search, category counts, a category dropdown list and the venue plan. Place details open in a sheet. Location privacy remains reachable through the eye-off control. A private active pin retains its expiry bar.
- You shows identity, festival preference, event switching, ticket copy, privacy and offline installation. Low-power and backup controls were removed from this primary surface.
- The attendee menu no longer links to the organiser workspace. The separate organiser route still exists.

## Product-specific choices

1. The actual festival photo is cropped as a thumbnail beside venue information. The event name and all utility headings use system typography.
2. The 41 supplied venue points own category counts and sheets. The plan remains pinchable and pannable, with accessible zoom controls.
3. Crew avatars come from imported plans and open those saved records. Empty Crew has QR sharing and scanning actions.

## Component research

Konsta 5.5.0 is MIT licensed, supports React and uses Tailwind 4 in the supplied source. Installed through Bun to preserve the committed lockfile. The iOS provider disables Material ripples and hover highlights. Home uses its List and ListItem components and the event-selection confirmation uses its Button. Existing native-dialog sheets retain their focus management, Escape dismissal and drag behavior.

The archive contains source and kitchen-sink examples for navigation bars, grouped lists, tab bars, sheets and action sheets. It contains no SKILL.md. Reusable engineering guidance can be written from these patterns, with separate accessibility and gesture verification.

@makemore/mobile-design-system 0.1.1 declares Next >=14 as a peer. Event Buddies uses TanStack Start. @ayuuxh/ios-kit 0.2.0 declares React >=18 and depends on Framer Motion 11. Neither was installed.

Direct requests initially failed. After the owner pointed out the open browser tabs, both files were inspected through the browser UI. In the Community kit, the Typography page shows 17px text with 22px leading and 34px text with 41px leading. Its Navigation page shows large and small titles, bottom sheets and translucent edge-aligned tab bars. The Builder file’s Native Components page shows grouped control surfaces, a two-part segmented selector, activity sheets, text fields and sheet/action shapes. Its agent introduction maps components to SwiftUI/UIKit APIs. Package adoption figures and the full catalogue remain unverified. Refero searches earlier returned an inactive-subscription error.

## Reference lock for the second refinement

The Community kit’s Typography and Navigation pages are the dominant reference for type scale, neutral grouped surfaces and tab-bar placement. The Builder kit contributes grouped-control and segmented-selector treatment. Konsta’s installed iOS List and ListItem implement Home task navigation. The photo supports event recognition, the pink tint identifies actions and selection, and counts come from the event data. The oversized poster heading, promotional captions, warm paper canvas and black floating dock were removed. Sheet, search, filter, profile, empty and offline states follow the same surface system. No new dependencies were added in this refinement.

Reference nodes inspected in the browser on 16 November 2026

- [Community Typography](https://www.figma.com/design/7VxmHxnQKcEKlJAistSqgS/?node-id=205-47526)
- [Community Tab Bars](https://www.figma.com/design/7VxmHxnQKcEKlJAistSqgS/?node-id=61-24635)
- [Builder Native Components](https://www.figma.com/design/1kg5Naga26bg7FrOdtAwV6/?node-id=15-0)

## Verification

The production check runs strict TypeScript, scoped lint, Vitest, credential-scanner tests, the production build and bundle credential-format checks. Playwright covers onboarding and event selection, saved artists, event switching, attendee-menu exclusions, meetup validation, category counts, actual two-touch pinch, drag, offline ticket persistence, offline assistant access from Essentials, selected-place handoff, profile focus return and sheet drag dismissal.

Rendered Chromium inspection includes 390px Home, Crew, Map, Lineup and You. The event selector and preview sheet were inspected at 320px with reduced motion. Additional responsive and browser results are recorded in the delivery report after the final run.

Physical iPhone Safari, installed standalone mode, soft keyboard, VoiceOver and Android device tests remain NOT RUN.

## Integration boundaries

Live crew membership, moving GPS positions, event-only public discovery, delivery of location requests and ticket entitlements await the deferred Cloud connection and authoritative integrations. Imported plans are saved copies. The ticket vault stores a local file and does not verify ticket tier. Vendor menus are absent from the event source. Set times remain unpublished.

The Lovable builder reported insufficient workspace credits during this session. GitHub synchronization remains the delivery path. No local database migrations were added.
