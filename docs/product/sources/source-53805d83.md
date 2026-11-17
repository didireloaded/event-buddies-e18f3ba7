# Event Buddies — Complete Feature Reference

A single document that consolidates everything: the app's logic, what's live now, everything we've discussed, and for each feature the **logic** and a **working prompt**.

---

# PART 1 — The Logic of the App Itself

## 1.1 The Core Mental Model

**Event Buddies is not a social network. It is a coordination tool for a 3-day window.**

```
The app exists to answer two questions, in this order:
  1. "Who am I going with?"        → the Crew loop
  2. "Where are they right now?"   → the Pin loop
```

Everything else — lineup, map, chat, recap — serves those two questions. If a feature doesn't make either question faster to answer, it's a distraction.

## 1.2 The Three Loops (the whole product)

| Loop | Trigger | Steps | Success state |
|---|---|---|---|
| **Invite loop** | User creates a crew | Create → Generate link → Share → Friend joins → Crew populated | 3+ members in the crew |
| **Coordination loop** | User needs to find someone | Tap Lost Someone / I'm here → Pin drops → Crew sees pin + ETA → Meet | Two people in the same place |
| **Recap loop** | Event ends | +1 day recap → Share crew card → Friend asks "what app?" → Next year reinstall | A shared crew card that brings a new user |

**Every feature in this document belongs to one of these three loops.** That's the test.

## 1.3 The Data Model Logic

```
auth.users (Supabase anonymous)
   │
   └─ profiles (1:1) — name, vibe, onesignal_id
         │
         ├─ crew_members ──┐
         │                 │
         └─ reports        │
                           │
crews ─────────────────────┤
   ├─ invite_code          │
   ├─ event_id             │
   │                       │
   ├─ pins (expires_at) ───┤  ← crew-scoped, 60-min TTL
   └─ messages ────────────┘  ← crew-scoped, read-only after +7d
```

**Rules the data model enforces:**
- A user can only see data for crews they belong to (RLS).
- Pins expire. History is never stored. Only the latest pin per user per crew exists.
- Messages are scoped to a crew, never global.
- Coordinates are rounded to 3 decimals (≈100m) at insert time.
- Presence is ephemeral — it lives in Realtime memory, never in Postgres.

## 1.4 The State Machine Logic

Every screen has **five states** and every feature must handle all five:

```
EMPTY    → designed screen with an action, never a blank label
LOADING  → skeleton rows, not spinners
ERROR    → friendly message + retry + fallback
POPULATED → the happy path
OFFLINE  → cached data + honest "as of" label + queued action indicator
```

**The rule:** a feature is not "done" until all five states are designed. This is the single biggest difference between "demo" and "shipped."

## 1.5 The Trust Logic

```
Default = Ghost (nothing shared)
User action required to share
Share always expires (60 min)
Sharing state always visible ("Sharing · 58m")
Stop is always one tap
```

**Why:** location data is a liability. Every design decision must answer *"can a stranger find me?"* with an unambiguous no by default.

## 1.6 The Offline Logic

```
Dexie (local truth) → outbox queue → Supabase (server truth)
         ↑                                    │
         └──── TanStack Query mirrors ◄────────┘
```

**The rule:** writes go to Dexie first, then to the outbox, then to the server. Reads come from TanStack Query cache first, then network. The user never sees a spinner-forever because Dexie always has data.

## 1.7 The Cold-Start Logic

**Every feature must work with 3 friends and no network effect.**

- A crew of 2 is fully functional.
- A solo user can still plan, see the lineup, drop a pin, and get a recap.
- No feature depends on "millions of users" to be useful.
- The invite loop is the only growth mechanism — build it before anything social.

---

# PART 2 — What's Live Right Now

Based on the live app (`festival-map-meetup-buddies.lovable.app`) as reviewed:

| Element | State | Verdict |
|---|---|---|
| Single event card ("Sound of Summer 2026") | Live | ✅ Works as a poster |
| Date / location display | Live | ✅ Fine |
| Ticket link | Live | ✅ Fine |
| "Your crew" section | Live, **empty, no CTA** | 🔴 P0 — dead end |
| "Demo companion" footer | Live | 🔴 P0 — kills trust |
| Navigation | **None** | 🔴 No tab bar, no routing |
| Map | **None** | 🔴 Missing despite URL |
| Chat | **None** | 🔴 Missing |
| Onboarding | **None** | 🔴 Missing |
| Crew creation | **None** | 🔴 Missing |
| Invite | **None** | 🔴 Missing |
| Backend | **None** | 🔴 Browser-local only |

**Honest summary:** the live app is a landing page with one card. Everything below is what needs to be built.

---

# PART 3 — Master Feature Inventory

| # | Feature | Loop | Status | Priority |
|---|---|---|---|---|
| **ONBOARDING** | | | | |
| 1 | Value screen | Entry | Not built | P0 |
| 2 | Vibe picker (interactive) | Entry | Not built | P0 |
| 3 | Name input with initials avatar | Entry | Not built | P0 |
| 4 | Anchor screen ("You're going to X") | Entry | Not built | P0 |
| **HOME** | | | | |
| 5 | Pinned "Your event" card | Entry | Not built | P0 |
| 6 | Event countdown | Entry | Not built | P1 |
| 7 | Tonight's sets strip | Entry | Not built | P1 |
| 8 | Discover events list | Entry | Not built | P2 |
| **EVENT HUB** | | | | |
| 9 | Segmented control (Lineup/Map/Info) | Content | Not built | P0 |
| 10 | Lineup with crew avatars on set rows | Content | Not built | P0 |
| 11 | Set detail bottom sheet | Content | Not built | P1 |
| 12 | "I'm going" toggle | Content | Not built | P1 |
| 13 | Info tab (gates, water, medic) | Content | Not built | P1 |
| 14 | Offline cached schedule | Content | Not built | P1 |
| **CREW** | | | | |
| 15 | Empty state (Start / Join) | Invite | Not built | P0 |
| 16 | Create crew (one field) | Invite | Not built | P0 |
| 17 | Invite sheet (Share / QR / Code) | Invite | Not built | P0 |
| 18 | Join with code | Invite | Not built | P0 |
| 19 | Crew home (members, meetup, actions) | Invite | Not built | P0 |
| 20 | Leave crew | Invite | Not built | P2 |
| 21 | Member profile sheet | Invite | Not built | P2 |
| **COORDINATION** | | | | |
| 22 | "I'm here" pin drop | Coordination | Not built | P0 |
| 23 | "Lost someone" button | Coordination | Not built | P0 |
| 24 | Meetup pin with countdown + ETA | Coordination | Not built | P0 |
| 25 | "Walk with me" | Coordination | Not built | P1 |
| 26 | Ghost Mode toggle | Coordination | Not built | P0 |
| 27 | Sharing timer pill | Coordination | Not built | P0 |
| **MAP** | | | | |
| 28 | Full-bleed map canvas | Coordination | Not built | P0 |
| 29 | Stage markers | Coordination | Not built | P1 |
| 30 | Crew avatar pins | Coordination | Not built | P0 |
| 31 | Meetup flag pin | Coordination | Not built | P1 |
| 32 | Drop a pin FAB | Coordination | Not built | P1 |
| 33 | Map bottom sheet peek | Coordination | Not built | P1 |
| 34 | Offline map fallback | Coordination | Not built | P1 |
| **CHAT** | | | | |
| 35 | Crew chat with seeded thread | Coordination | Not built | P1 |
| 36 | Emoji quick-pings (👋🍺🚻🆘) | Coordination | Not built | P1 |
| 37 | Voice notes | Coordination | Not built | P2 |
| 38 | Location pin send | Coordination | Not built | P1 |
| 39 | Offline message queue | Coordination | Not built | P1 |
| **PROFILE** | | | | |
| 40 | Edit name + avatar | Account | Not built | P1 |
| 41 | Edit vibe | Account | Not built | P1 |
| 42 | Sharing & privacy screen | Account | Not built | P0 |
| 43 | Active shares list with timers | Account | Not built | P1 |
| 44 | Switch event | Account | Not built | P2 |
| 45 | Notification settings | Account | Not built | P2 |
| 46 | Privacy policy + Delete data | Account | Not built | P0 |
| **PERMISSIONS** | | | | |
| 47 | Notification priming (after crew) | Trust | Not built | P0 |
| 48 | Location priming (at first share) | Trust | Not built | P0 |
| 49 | Home Screen install prompt (iOS) | Trust | Not built | P1 |
| **DEEP LINKS** | | | | |
| 50 | /join/:code resolver | Growth | Not built | P0 |
| 51 | /crew/:id resolver | Growth | Not built | P1 |
| 52 | /event/:id resolver | Growth | Not built | P2 |
| **POST-EVENT** | | | | |
| 53 | T-0 quiet banner | Recap | Not built | P1 |
| 54 | Auto-kill location shares T+2h | Recap | Not built | P0 |
| 55 | +1 day recap screen | Recap | Not built | P1 |
| 56 | Crew card (Vercel OG) | Recap | Not built | P0 |
| 57 | Chat archive read-only at +7d | Recap | Not built | P1 |
| 58 | Chat export | Recap | Not built | P2 |
| 59 | Data deletion at +30d | Recap | Not built | P1 |
| 60 | Dormancy screen + next countdown | Recap | Not built | P1 |
| 61 | Reactivation push (2/year) | Recap | Not built | P2 |
| **INFRASTRUCTURE** | | | | |
| 62 | Supabase + RLS on all tables | Infra | Not built | P0 |
| 63 | Anonymous auth | Infra | Not built | P0 |
| 64 | Realtime private channels | Infra | Not built | P0 |
| 65 | Dexie offline outbox | Infra | Not built | P0 |
| 66 | PWA service worker | Infra | Not built | P1 |
| 67 | PostHog analytics | Infra | Not built | P1 |
| 68 | Sentry errors | Infra | Not built | P1 |
| 69 | iOS feel (type, spacing, motion) | Infra | Partially | P0 |

---

# PART 4 — Per-Feature Logic + Prompt

Each entry: **Logic** (why + how) then **Prompt** (paste into Lovable).

---

## ONBOARDING

### 1. Value Screen
**Logic:** One line, one visual, one Continue, one Skip. No carousel of screenshots. Total time under 5 seconds. The value prop is *"Find your people. Don't lose them."* — festival-specific, not generic.

**Prompt:**
```
Build the first onboarding screen. Full-screen, no tab bar. Headline "Find your people. Don't lose them." in 34px bold -0.02em tracking. A simple illustration of two avatar dots converging on a pin (not a screenshot). Bottom: filled pill "Continue" (h-12 rounded-full accent) and plain text "Skip" top-right. Two page dots below the illustration. No permissions, no login, no logo animation.
```

### 2. Vibe Picker
**Logic:** This replaces the screenshot carousel. It's the only interactive moment in onboarding, and it feeds matchmaking. Three large cards, tap one, card lifts, auto-advance after 300ms. Store the choice in `profiles.vibe`.

**Prompt:**
```
Build the second onboarding screen: "What's your festival mode?" Three large cards stacked vertically: 🎧 "Here for the music", 🕺 "Here to meet people", 🌅 "A bit of both". On tap, the card scales to 1.02 with a spring (framer-motion), gains an accent border, and auto-advances after 300ms. Save the selection to Supabase profiles.vibe. No continue button — tapping a card is the action. Add a plain "Skip" top-right that defaults vibe to 'both'.
```

### 3. Name Input
**Logic:** Name only. No email, no password, no photo. Auto-initials avatar that colors from a hash of the name — this makes the empty state feel personal immediately. Continue is disabled (not red) under 2 characters.

**Prompt:**
```
Build the third onboarding screen: name input. Above the input, a 96px circle avatar showing the initials of what they type (colored deterministically from the name hash using a small palette). Below: input with placeholder "Your name", 17px text, centered, rounded-[12px] bg-black/[0.04], focus ring accent. Below: caption "This is how your crew will see you". Bottom: filled pill "Continue" disabled (opacity-40, not red) until 2+ chars. On continue, insert into profiles with the name and vibe from step 2. No account creation screen.
```

### 4. Anchor Screen
**Logic:** The aha moment. Instead of dropping them on a generic list, tell them *"You're going to Sound of Summer 2026"* and offer two paths: Find your crew (primary) or Browse other events (plain). This is the difference between "an app with a list" and "an app that knows me."

**Prompt:**
```
Build the fourth onboarding screen: the anchor. Large title "You're going to Sound of Summer 2026". Below: the event card from the existing app, but with an accent label "YOU'RE GOING" above the title. Two actions: filled pill "Find your crew" (routes to Crew empty state) and plain text "Browse other events" (routes to discover list). Store onboarded=true locally. This is the last onboarding step.
```

---

## HOME

### 5. Pinned "Your Event" Card
**Logic:** The home screen is not a list of events with no personalization. It's *your* event, pinned, visually distinct, with everything else secondary. If only one festival exists (current state), Home **is** the event.

**Prompt:**
```
Build the Home tab. Top: sticky large-title nav bar "Events" that collapses to 17px on scroll with backdrop-blur-xl. Below: a white rounded-[16px] card with an accent label "YOU'RE GOING", the event title "Sound of Summer 2026" at 22px bold, and venue+dates at 15px black/50. Tapping the card routes to Event Hub. Below the card: "Tonight" section with 2-3 upcoming sets (time in tabular-nums + artist + stage). Below that: "Discover" section with 2-3 other events in smaller cards. Empty state for Discover: "More festivals coming soon" with no fake CTAs.
```

### 6. Event Countdown
**Logic:** Time pressure = engagement. A live countdown ("14 days · 3 hours") makes the app feel anticipatory. Use `date-fns` and `tabular-nums`.

**Prompt:**
```
Add a live countdown to the pinned event card. Use date-fns to compute the time until the event start. Display as "14 days · 3h" in 13px tabular-nums black/50 below the dates. Update every minute via setInterval, clear on unmount. If the event is in progress, show "Happening now" in accent color. If it ended, show "Ended" and route to recap.
```

### 7. Tonight's Sets Strip
**Logic:** A horizontal or vertical list of the next 2-3 sets happening soon, one tap from the event hub. This gives a reason to open the app during the event that isn't "check on friends."

**Prompt:**
```
Add a "Tonight" section on Home below the event card. Show the next 2-3 sets sorted by start time (only sets starting within the next 6 hours). Each row: time (tabular-nums, 15px, black/40), artist name (17px semibold), stage (13px black/40), and crew avatar cluster if any crew member is going. Tapping a row routes to the Event Hub Lineup, scrolled to that set. If no sets tonight, hide the section entirely.
```

---

## EVENT HUB

### 9. Segmented Control (Lineup / Map / Info)
**Logic:** The most iOS-native component and the cleanest way to make the event feel like a hub, not a folder. Do not navigate to separate pages for lineup and map — segment between them so the user stays in event context.

**Prompt:**
```
Build the Event Hub screen. Top: sticky nav with back chevron, event title at 17px semibold, and a share icon. Below: iOS segmented control "Lineup | Map | Info" (h-9, rounded-[9px], bg-black/[0.06], active segment white with shadow-sm). Content area switches based on segment. The segmented control stays sticky below the nav on scroll. Do not navigate to separate pages — switch content in place.
```

### 10. Lineup with Crew Avatars
**Logic:** This is the entire social product embedded in one component. Every set row shows which of your crew is going — zero extra screens. It answers "who's going to this?" as you scroll.

**Prompt:**
```
Build the Lineup tab. Group sets by day with day tabs (Fri / Sat / Sun) using another segmented control. Each set row: time in 46px-wide column (15px tabular-nums black/40), artist name (17px semibold), stage · duration (13px black/40), and on the right a -space-x-2 cluster of circular crew avatars (h-7 w-7 ring-2 ring-white) for crew members going. Tapping a row opens a bottom sheet with the set details. Rows use active:bg-black/[0.04] with 150ms transition, divided by divide-black/[0.06].
```

### 11. Set Detail Sheet
**Logic:** A bottom sheet, not a page. Shows the set info, crew members going, and a single primary action: "Meet here" — which drops a meetup pin at that stage.

**Prompt:**
```
Build a bottom sheet for set details. Grabber handle at top, rounded-t-[20px], slide-up spring (stiffness 300 damping 30). Content: artist name (22px bold), stage (15px black/50), time range with tabular-nums, duration. Below: "X of your crew going" with avatar row. Primary action: filled pill "Meet here" that drops a meetup pin at the stage's coordinates and closes the sheet. Secondary: tinted pill "I'm going" that toggles the user's attendance in a set_attendance table.
```

### 12. "I'm Going" Toggle
**Logic:** Tracks which sets the user is attending. This is what feeds the crew avatar clusters on lineup rows and the "92% same sets" matching later. Store as a many-to-many table.

**Prompt:**
```
Add a set_attendance table (user_id, set_id, created_at, primary key (user_id, set_id)) with RLS scoped to crew membership via crew_id on the sets table. Add an "I'm going" toggle in the set detail sheet. When toggled on, insert a row; when toggled off, delete. The lineup row avatars should update reactively via TanStack Query invalidation. Show the current user's attendance state in the sheet.
```

### 13. Info Tab
**Logic:** Gates, tickets, water, medic, toilets, and FAQ. This is the "boring but essential" content. It should be a static inset grouped list — no design creativity needed, just native iOS styling.

**Prompt:**
```
Build the Info tab. iOS inset grouped list with sections: "Getting in" (gates open time, ticket QR, entry rules), "On site" (water stations, medic points, toilets, exits), "Contact" (emergency number, info desk). Each row: label at 17px, secondary detail at 15px black/40. Use divide-black/[0.06] and active:bg-black/[0.04]. No illustrations, no emoji icons in the list. Fully static, no data fetching.
```

---

## CREW

### 15. Crew Empty State
**Logic:** The most important screen in the app. Two clear actions: Start a crew or Join with a code. Never a blank "Your crew" label. Warm copy, no gray sadness.

**Prompt:**
```
Build the Crew tab empty state. Centered vertically. A warm illustration (two overlapping circles suggesting people, accent-tinted, not gray). Below: "No crew yet" at 22px bold. Below: "Festivals are better with people. Start one and send a link." at 17px black/50, max-w-xs text-center. Two actions stacked with 12px gap: filled pill "Start a crew" (routes to create) and tinted pill "Join with a code" (routes to join sheet). No other content on the screen.
```

### 16. Create Crew
**Logic:** One field. Crew name pre-filled with "{FirstName}'s crew". On create, immediately generate the invite link and open the invite sheet automatically. One tap, one field, invite ready.

**Prompt:**
```
Build the create crew screen. Top: nav with cancel (plain) and title "New crew". Body: single input pre-filled with "{profile.display_name}'s crew", 17px, rounded-[12px] bg-black/[0.04], focus ring accent. Below: caption "You can change this later". Bottom: filled pill "Create" that inserts into crews (generate a random 8-char invite_code) and crew_members (the creator), then navigates to Crew Home and auto-opens the invite sheet. Handle error: if the insert fails, show inline message and keep the button enabled.
```

### 17. Invite Sheet
**Logic:** The growth loop. Three paths in priority order: Share link (native share sheet, WhatsApp first), Show QR (festival-native, works at the gate), Copy code (6-char fallback). The share link must be a deep link (`/join/{code}`) that bypasses onboarding carousel and lands directly in the crew after name.

**Prompt:**
```
Build the invite bottom sheet, auto-opened after crew creation. Grabber handle, rounded-t-[20px], slide-up spring. Title "Invite your crew" at 22px bold. Three options stacked: (1) filled pill "Share invite link" that calls navigator.share with the URL `${window.location.origin}/join/${inviteCode}` and text "Join my crew at Sound of Summer"; (2) tinted pill "Show QR code" that opens a full-screen QR using react-qr-master with level="H", styled with accent fgColor and rounded shape, plus a download button; (3) plain text "Copy code" that copies the 8-char code. Below: caption "Invites expire when the festival ends." Persist the invite code from the crews table.
```

### 18. Join with Code
**Logic:** Enter an 8-char code, preview the crew (name, event, member count), then Join. Handle four error states: invalid code, already a member, crew full, expired.

**Prompt:**
```
Build the join crew screen. Single 8-char input (uppercase, monospace, letter-spaced). On valid length, fetch the crew preview and display: crew name (22px bold), event name, member count, and avatar cluster. Primary: filled pill "Join" that inserts into crew_members and navigates to Crew Home. Handle four states inline: invalid code ("We couldn't find that code"), already a member ("You're already in this crew" with a button to go there), crew full ("This crew is full"), expired ("This invite has expired"). Rate-limit join attempts client-side to 5/min with a toast.
```

### 19. Crew Home
**Logic:** The coordination hub. Shows members with sharing state, pinned meetup with countdown, "Lost someone" prominent, "I'm here" to drop a pin, chat entry, and leave at the bottom.

**Prompt:**
```
Build Crew Home. Top: crew name (34px bold) + event name below. Below: horizontal row of member avatars with live sharing state (green dot if sharing, gray if not). Then: a white rounded-[16px] card showing the pinned meetup with flag icon, label, ETA ("12 min · 400m" in tabular-nums), and countdown. Below: two large action buttons side-by-side — filled "Lost someone 🆘" and tinted "I'm here". Below: members list (avatar, name, last seen "4m ago", sharing state). Below: "Open chat" row with a message preview. Bottom: plain text "Leave crew" in red at 17px, one confirmation tap.
```

### 20. Leave Crew
**Logic:** One confirmation, no guilt. Leaves and redirects to Crew empty state. If the user was the last member, delete the crew.

**Prompt:**
```
Add a "Leave crew" action on Crew Home. On tap, show a bottom sheet: "Leave this crew?" at 17px semibold, "You can rejoin with the invite code." at 15px black/50, and two buttons — destructive "Leave" in red, and plain "Cancel". On confirm, delete the crew_members row. If it was the last member, delete the crew row too. Navigate to Crew empty state. Show a toast "You left the crew".
```

---

## COORDINATION

### 22. "I'm Here" Pin Drop
**Logic:** One thumb press drops a static pin with 60-min expiry. Round coordinates to 3 decimals. Delete any existing pin for the same user+crew first (upsert pattern). Show "Pin shared · 59 min left" toast. Request geolocation on action only, never on load.

**Prompt:**
```
Add an "I'm here" button on Crew Home and on the Map screen. On tap: call navigator.geolocation.getCurrentPosition with enableHighAccuracy: false, maximumAge: 60000, timeout: 8000. Round lat/lng to 3 decimals. Upsert into pins: delete any existing row for the same (user_id, crew_id), then insert with expires_at = now() + 60 minutes. Show a toast "Pin shared · 59 min left" with a countdown. If geolocation fails, show a sheet with a manual map picker instead. Write to Dexie outbox first, then sync.
```

### 23. "Lost Someone" Button
**Logic:** The #1 real festival emotion. One tap: your pin drops + a push notification fires to all crew members "Sam is looking for you" + the crew sees your pin pulse. No typing required.

**Prompt:**
```
Add a prominent "Lost someone 🆘" button on Crew Home. On tap: (1) drop a pin via the I'm here flow with label "Looking for you"; (2) broadcast on `crew:${crewId}:pins` a message { type: 'lost', user_id, pin_id }; (3) call the send-push-notification Edge Function for each crew member with title "Sam is looking for you" and body "Tap to see their location"; (4) show a confirmation sheet "Your crew knows you're looking. Pin shared · 60 min." Show the pin with a pulsing animation on the map for other crew members.
```

### 24. Meetup Pin with Countdown + ETA
**Logic:** A shared reference point with an ETA and countdown. The emotional core — reunion anticipation. Tapping the meetup card shows walking directions and "I'm on my way."

**Prompt:**
```
Add a meetup pin feature. Any crew member can drop a meetup pin from the map (long-press → "Meet here?" sheet) or from a set detail sheet ("Meet here" button). Store in a meetups table (crew_id, label, lat, lng, created_by, expires_at = event end). Show on Crew Home as a white rounded-[16px] card: flag icon, label (17px semibold), "12 min · 400m" (15px tabular-nums black/40), and a live countdown to expires_at. Tapping the card opens a sheet with a "Walk with me" button and an "I'm on my way" button that broadcasts to the crew.
```

### 25. "Walk with Me"
**Logic:** Safety feature. Pair up to walk together at night. The feature that gets word-of-mouth from solo attendees and women. Broadcast a walk request to the crew; other members can accept.

**Prompt:**
```
Add "Walk with me" from the meetup card and from a pin's detail sheet. On tap, broadcast on `crew:${crewId}:chat` a walk request { type: 'walk', user_id, from_lat, from_lng, to_label }. Show the request in crew chat as a special message card with "Sam wants to walk to [location]. Anyone going that way?" and an "I'll walk with you" button. When accepted, both users see each other's pins active for 30 minutes with a "walking together" state. Push notification to the crew when a walk request is created.
```

### 26. Ghost Mode Toggle
**Logic:** One tap stops all pin writes and leaves realtime channels. The UI must show the state visibly — "You're hidden" or "Sharing · 58m" pill in the top-right. Ghost Mode is not a setting buried in a menu; it's a visible, one-tap action.

**Prompt:**
```
Add a Ghost Mode pill in the top-right of Map and Crew Home. When active: "Sharing · 58m" with a green dot. When inactive: "You're hidden" with a gray dot. Tapping opens a small sheet with a toggle and copy "When hidden, your crew can't see your location. You can still see theirs if they're sharing." When Ghost Mode is turned on: stop all pin writes, call channel.untrack() on all presence channels, cancel all interval timers. When turned off: rejoin channels, no auto-resume of previous sharing.
```

---

## MAP

### 28. Full-Bleed Map Canvas
**Logic:** MapLibre + MapTiler, not Google Maps. Render three layers: static stage markers, crew avatar pins, and the meetup flag. Offline fallback is a static event map image with pins overlaid and an "as of yesterday" label.

**Prompt:**
```
Build the Map screen. Full-bleed maplibre-gl canvas with MapTiler style from VITE_MAPTILER_STYLE_URL. Configure the MapLibre worker once before the first `new Map()` call. Render three layers: (1) static stage markers from a local event JSON (accent circles with stage names), (2) crew pins as circular avatar images bound to Supabase pins data, (3) meetup flag in accent color. Disable the map's default controls. Add a floating locate-me FAB bottom-right. Offline fallback: if tiles fail to load, render a static event map image with the same pins overlaid at approximate positions and a banner "Map may be outdated". Do not use Google Maps.
```

### 30. Crew Avatar Pins
**Logic:** Each crew member's latest pin shows as a circular avatar with a colored ring and a "4m ago" label. Pins over 60 minutes old are not rendered. Stale pins (15+ min) show a dimmed avatar with the honest timestamp.

**Prompt:**
```
Render crew pins on the map as circular avatars with a colored ring (accent for active <15min, gray for stale 15-60min). Show last-updated timestamp on tap ("4m ago"). Bind to Supabase pins data for the current crew. Pins with expires_at < now() must not render. Show a pulse animation on pins updated in the last 60 seconds. On pin tap, open a bottom sheet: avatar, name, last-seen, and a "Walk with me" button.
```

### 33. Map Bottom Sheet Peek
**Logic:** A draggable bottom sheet that peeks up by default and shows "3 of your crew are at Main Stage" — turning the map into a live activity feed.

**Prompt:**
```
Add a draggable bottom sheet on the Map screen, peek height 120px, expanded 50vh. Peek state: "3 of your crew are at Main Stage" (computed from pins near the stage coordinates) with a member avatar row. Expanded state: full list of crew members with their current location label and last-seen time. Use framer-motion drag with spring. The sheet must be dismissible by dragging down.
```

---

## CHAT

### 35. Crew Chat
**Logic:** Not a tab. Lives inside Crew. Always seeded with a believable thread so it's never blank on first open. Pinned meetup card at the top.

**Prompt:**
```
Build the crew chat screen, accessed from Crew Home. Header: crew name + back chevron. Pinned meetup card at the top (small, tappable). Message thread: bubbles aligned left for others (bg-black/[0.06]), right for you (bg accent, white text). Each bubble shows avatar + timestamp on first message of a group. Seed with a demo thread: "Where are you?" → "Ferris wheel, by the lights" → a location pin message. Store messages in the messages table. Subscribe to `crew:${crewId}:chat` for realtime updates. Composer at bottom with emoji quick-pings row above it (👋 🍺 🚻 🆘), input, and send button.
```

### 36. Emoji Quick-Pings
**Logic:** Zero typing, instantly understood. Four pings cover the most common festival needs. Each sends a special message type that renders distinctly.

**Prompt:**
```
Add a row of four emoji quick-ping buttons above the chat composer: 👋 "here", 🍺 "bar", 🚻 "toilets", 🆘 "come get me". Each tap sends a message with kind='ping' and a payload { emoji, label }. Render pings as centered pill messages in the thread with the emoji + label. When a 🆘 ping is sent, also trigger the Lost Someone flow (drop a pin, push notify). When a ping is received, show a toast at the bottom of the screen "Maya: at the bar" and vibrate if the API allows.
```

### 38. Location Pin Send
**Logic:** Send your current location as a message. Renders as a mini map card in the thread. Tapping opens the full map at that location.

**Prompt:**
```
Add a location button to the chat composer (map pin icon). On tap, get the current position and send a message with kind='pin' and payload { lat, lng, label: "Dropped a pin" }. Render pin messages as a card with a mini map preview (maplibre static) and the label. Tapping opens the Map screen centered on that coordinate. Pins sent as messages do not expire like regular pins — they're permanent message history.
```

### 39. Offline Message Queue
**Logic:** Messages sent offline queue in Dexie and drain on reconnect. Show "2 waiting to send" in the composer. Never lose a message.

**Prompt:**
```
Extend the chat to be offline-first. On send: write to Dexie messages_cache immediately (optimistic), add a row to the outbox with an idempotency key. Show the message in the thread with a dimmed opacity and a small clock icon. When online, drain the outbox in order: send to Supabase with the Idempotency-Key header. On success, mark sent. On 4xx error, remove from outbox and show "failed to send" with a retry button. On network error, retry with exponential backoff + jitter. Show "2 waiting to send" in the composer whenever outbox is non-empty.
```

---

## PROFILE

### 42. Sharing & Privacy Screen
**Logic:** The trust-building screen. Shows Ghost Mode toggle, "Who can find me" options, and the active shares list with expiry timers. This is where users confirm the app respects their privacy — the single most important account screen.

**Prompt:**
```
Build the Sharing & Privacy screen, accessible from the Profile tab. iOS inset grouped list with sections: (1) "Sharing" — Ghost Mode toggle with description "When on, nobody sees your location"; (2) "Who can find me" — radio options: Crew only (default), Same-set people (opt-in), Off. Show the currently active selection; (3) "Active shares" — list every active pin with its countdown ("Sharing with Sam's crew · 42 min left") and a "Stop" button per pin; (4) "Data" — link to "Your data after the event" and "Delete my data". Use iOS switch style (rounded-full track, white thumb, spring). Never use checkboxes.
```

### 46. Privacy Policy + Delete Data
**Logic:** Required for app store approval, expected by users, and legally necessary. One tap that actually deletes — not a support email.

**Prompt:**
```
Add a "Delete my data" action in Profile. On tap, show a bottom sheet: "Delete all your data?" with copy "This deletes your profile, your crew memberships, your messages, and your pins. It cannot be undone. Your crew will be notified." Two buttons: destructive "Delete everything" and plain "Cancel". On confirm: call a Supabase Edge Function delete-user-data that deletes profiles, crew_members, pins, messages, and calls auth.admin.deleteUser. Sign out and reset the app to onboarding. Show a confirmation toast. Also add a plain "Privacy policy" link that opens a static page with plain-language copy covering: what you collect, why, how long, how to delete.
```

---

## PERMISSIONS

### 47. Notification Priming
**Logic:** Prime before the system prompt. Show a custom screen after the user creates or joins a crew (not in onboarding): "Get a nudge when your crew arrives?" with [Not now] [Allow]. Only then call the OS prompt. Doubles the grant rate.

**Prompt:**
```
Add a notification permission priming sheet that appears after the user's first crew creation or join (once only). Title "Get a nudge when your crew arrives?" at 22px bold. Body "We'll let you know when someone drops a pin or needs help. No spam." at 17px black/50. Two buttons: filled "Allow" and plain "Not now". Only on "Allow", call OneSignal.Notifications.requestPermission(). If the user selects "Not now" or denies the OS prompt, never re-prompt — respect the choice permanently.
```

### 48. Location Priming
**Logic:** Prime at the first share action, not on launch. "Only your crew can see this. Stops in 60 min." Only then request the OS permission. Denied users fall back to manual map pins.

**Prompt:**
```
Add a location permission priming sheet that appears the first time the user taps "I'm here" or "Lost someone". Title "Share your location?" at 22px bold. Body "Only your crew sees this, and it stops in 60 minutes. You can hide any time." at 17px black/50. Two buttons: filled "Share" and plain "Not now". Only on "Share" call navigator.geolocation. If denied or user picks "Not now", open a manual map picker ("Or tap the map to drop your pin") so the feature still works without location permission. Never request on app launch.
```

### 49. Home Screen Install Prompt (iOS)
**Logic:** On iOS Safari tabs, push notifications don't work — only Home Screen PWAs get push. Show an install instruction once, with a screenshot of the Share menu. Frame it as "Get notifications" not "Install app."

**Prompt:**
```
Detect iOS Safari (not already installed to Home Screen) and show a one-time bottom sheet after the user creates or joins a crew. Title "Add to Home Screen for notifications" at 17px semibold. Body "On iPhone, only apps added to Home Screen can send notifications. Tap Share → Add to Home Screen." with a small image of the Share icon. Two buttons: "Got it" and "Later". Store the dismissal locally so it appears once. Do not show this on Android or desktop.
```

---

## DEEP LINKS

### 50. Join Link Resolver
**Logic:** The single most important growth mechanic. A friend taps `/join/{code}` → skips onboarding carousel → name only → lands directly in the crew. Twelve-second conversion. Build this before anything else in the crew flow.

**Prompt:**
```
Add a route /join/:code that resolves an invite deep link. Flow: (1) fetch the crew by invite_code; (2) if invalid or expired, show a friendly error "This invite has expired — ask for a new one" with a button to the crew empty state; (3) if valid and user is not onboarded, show the name screen only (skip the value and vibe screens); (4) insert into crew_members; (5) navigate to Crew Home. The whole flow must take under 15 seconds for a new user. Show the crew name and member avatars during the flow so the user knows who they're joining.
```

---

## POST-EVENT

### 53. T-0 Quiet Banner
**Logic:** At the last set's end, do not do anything clever. No confetti, no modal. Show a quiet banner: "That's a wrap. Recap lands tomorrow." Location shares already expired via cron. Chat stays live.

**Prompt:**
```
Detect when the event's last set has ended (end time in the past). On the Event Hub and Home, replace the "Tonight" section with a quiet banner: "That's a wrap. Recap lands tomorrow." at 15px black/50, centered, no icon. No confetti, no modal, no push notification. Chat remains open. All location sharing has already auto-expired via pg_cron. If any pins remain, they expire within the hour.
```

### 54. Auto-Kill Location Shares T+2h
**Logic:** Two hours after the last set, ensure zero active pins remain. A scheduled function kills any still active. Quiet — no notification.

**Prompt:**
```
Add a Supabase scheduled Edge Function (or pg_cron) that runs every hour. If the current time is more than 2 hours past the event's last set end, delete all pins where crew's event = this event. Do not notify users. On the client, if the user opens the map post-event-end + 2h, show "Event ended. Location sharing is off." and disable pin drops. The event hub transitions to recap mode at T+1 day.
```

### 55. Recap Screen
**Logic:** One push at +1 day: "Your recap is ready." The screen shows sets you saw, crew avatars, and the shareable crew card. This is the growth moment. Everything else is secondary.

**Prompt:**
```
Build the Recap screen replacing the Event Hub at T+1 day after event end. Header: "Sound of Summer 2026" at 34px bold with "3 days · 14 sets · 4 crew" below at 15px black/50. Section "Sets you saw": list with stage and crew avatars who were there. Section "Your crew": avatar cluster + "92% same sets as Maya". Primary CTA at bottom: filled pill "Share your crew card" that opens the native share sheet with the URL of /api/og/crew?event=...&crew=...&avatars=... The generated card shows event name, crew avatars, top sets, and the Event Buddies wordmark. Secondary: plain text "Save recap".
```

### 56. Crew Card (Vercel OG)
**Logic:** The only viral artifact. Generated server-side, cached by CDN, shareable to Stories and WhatsApp. Every share is an ad. This is the growth engine for next year.

**Prompt:**
```
Create an API route /api/og/crew using @vercel/og. Accept query params: eventName, crewName, memberAvatars (comma-separated), topSets. Return ImageResponse with a 1200x630 wristband-styled card: event name in a display font, crew avatars in a row, "X sets in common", and the Event Buddies wordmark. Set Cache-Control headers so CDN caches for 24 hours. Add /api/og/* to robots.txt allow list. Do not regenerate on every request — cache aggressively.
```

### 57. Chat Archive (Read-Only at +7 days)
**Logic:** Chat becomes read-only at +7 days. Export offered. Chat is deleted at +30 days. Say this out loud. Trust, not legal cover.

**Prompt:**
```
Add a scheduled Edge Function that runs daily. When a crew's event ended 7+ days ago, mark the crew's messages as archived=true. In the chat UI, if archived, hide the composer and show a banner: "This festival is over. Chat is archived but you can still read it." with a "Save chat" button that downloads an HTML file or emails a link. At 30+ days past event end, delete all archived messages via the scheduled function. Show a trust screen "Your data after the event" from Profile listing exactly what is deleted when.
```

### 60. Dormancy Screen
**Logic:** If opened during the off-season, show the last event's status plus the next event's countdown. Optional "leave a note to your crew" postcard.

**Prompt:**
```
If the current time is 7+ days after event end and there's no active event, show a Dormancy state on Home. Content: the last event card with "Ended" label, then "Next up: Sound of Summer 2027 · 320 days" with a countdown. Optional: "Leave a note for your crew" that opens a text input and sends a single message to the archived crew chat. This is the only reason to open the app until next year's announcement.
```

---

# PART 5 — The Build Sequence

The order is non-negotiable because each step unlocks the next:

| Phase | Features | Unlocks |
|---|---|---|
| **1. Trust foundation** | #62 Supabase + RLS, #63 anonymous auth | Everything |
| **2. Entry** | #1–4 onboarding, #5 Home | First-run exists |
| **3. Growth loop** | #15–19 crew create + invite + join, #50 deep link | New users can join |
| **4. Coordination core** | #22–26 pins, Ghost Mode, meetup | The product exists |
| **5. Content** | #9–14 event hub, lineup | Reason to open daily |
| **6. Live layer** | #28–34 map, #35–39 chat | Full app experience |
| **7. Trust** | #42 privacy, #47–49 permissions | App store ready |
| **8. Polish** | #69 iOS feel, motion | Feels shipped |
| **9. Retention** | #53–60 post-event, #56 crew card | Growth engine |
| **10. Infra** | #65 offline, #66 PWA, #67–68 analytics | Survives festival |

---

# PART 6 — The Logic, In One Paragraph

**Event Buddies exists to answer two questions:** *"who am I going with?"* and *"where are they right now?"* Every feature belongs to one of three loops — **invite** (create crew → share link → friend joins), **coordination** (drop pin → crew sees → meet up), or **recap** (event ends → share card → next year reinstall). The data model enforces privacy by design: every table is crew-scoped via RLS, pins expire in 60 minutes and are never stored as history, presence is ephemeral, and Ghost Mode is one tap away at all times. The offline layer treats Dexie as the local source of truth and Supabase as the eventual destination — writes queue and drain, reads fall back to cache, and no user ever sees a spinner-forever. Onboarding ends by anchoring the user to a specific event, not a generic list. The crew empty state has two clear actions. The invite link is the growth engine. The crew card is the viral artifact. The post-event deletion policy is the trust moment. Every screen has five states: empty, loading, error, populated, offline — and every empty state has an action. Every feature works with three friends and no network effect. That's the whole app.

**The one sentence:** *Two questions, three loops, five states per screen, RLS on every table, pins that expire, sharing that's always visible, and an invite link that converts a stranger in twelve seconds — that's Event Buddies, and everything else is decoration.*
