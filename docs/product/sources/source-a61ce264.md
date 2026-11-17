# The Event Selection Screen — Spec + Prompt

**Correct call. This fixes a structural flaw:** right now the app doesn't know which event you're in until you're already inside a screen that assumes one. A dedicated selection step makes every downstream screen event-scoped and kills the "list of one event that feels like a directory" problem.

**The rule:** onboarding ends → **Event Selection** → Home (event-scoped). The user picks; the app remembers. If they only have one event, it's still a deliberate tap — never auto-enter.

---

## The Screen Logic

```
SIGNUP COMPLETE (name saved)
   │
   └─→ EVENT SELECTION  ← this screen
         ├─ "Happening now" / "Coming up" — current & upcoming events
         ├─ Tap a card → Event Preview sheet → [I'm going]
         │                └─ sets `selected_event_id` locally + in profiles
         └─→ HOME (scoped to that event)
```

**Rules:**
- **One tap to preview, one tap to confirm.** Card tap opens a sheet — never jumps straight in.
- **Selected event is persisted** (local + `profiles.active_event_id`) so the app never asks again unless the user switches.
- **Past events show separately**, dimmed, labeled "Ended" — tapping opens the recap, not the live hub.
- **Empty state** is real: *"No events near you yet"* + *"Got an invite? Join a crew"* — never a blank list.
- **No organizer content here.** Events only.

---

## Screen Anatomy (iOS native)

```
┌──────────────────────────────────┐
│  ‹ back (optional)                │  ← no back after signup; plain "Skip for now"? No — see below
│                                    │
│  Events                            │  ← Large Title 34px bold
│  Pick where you're going           │  ← Subhead 15px black/50
│                                    │
│  HAPPENING NOW                     │  ← Section label 11px uppercase, accent
│  ┌────────────────────────────┐   │
│  │ [event image 16:9]         │   │
│  │ Sound of Summer 2026       │   │  ← 22px bold
│  │ Langstrand · Opens in 41d  │   │  ← 15px black/50, tabular-nums
│  │              [ I'm going ] │   │  ← tinted pill, right-aligned
│  └────────────────────────────┘   │
│                                    │
│  COMING UP                         │
│  ┌────────────────────────────┐   │
│  │ [image]  Windhoek Jazz...  │   │
│  │ Dec 12 · 3 days            │   │
│  └────────────────────────────┘   │
│  ┌────────────────────────────┐   │
│  │ [image]  Coast Festival    │   │
│  │ Jan 4 · 26 days            │   │
│  └────────────────────────────┘   │
│                                    │
│  PAST EVENTS                       │  ← collapsed by default
│  [dimmed cards → tap → Recap]      │
└──────────────────────────────────┘
```

**Card spec:** white `rounded-[16px]`, image 16:9 top, padding 16, title 22/28 bold, meta 15/20 black/50, and **one** action — a tinted pill "I'm going" (or a check + "Going" when selected). No descriptions. No tags. No paragraphs. If the card needs more than four lines of text, it's wrong.

**Preview sheet** (on card tap): image, title, dates, venue, ticket link, and the one action — `[I'm going]` filled pill. That's it. The full event hub opens *after* selection.

---

## States (all five, designed)

| State | What shows |
|---|---|
| **Loading** | 3 skeleton cards (gray blocks, no spinner) |
| **Populated** | Sections: Happening now → Coming up → Past |
| **Empty** | *"No events yet"* + *"Got an invite? Join a crew with a code"* — action, not blank |
| **Offline** | Cached event list + hairline banner *"Offline — showing saved events"* |
| **Error** | *"Couldn't load events"* + `[Try again]` + cached fallback |

---

## Edge Cases (the ones that make it feel shipped)

- **One event only** → still a real screen with one card. The tap is the point.
- **Event happening now** → label switches from "Opens in X days" to **"Happening now"** in accent. Time-sensitive.
- **Event already ended** → moves to Past, dimmed, tapping opens recap.
- **User came from an invite deep link** → event is **pre-selected from the crew's event** and the screen is skipped entirely. Never ask a user to pick the event they were just invited into.
- **User switches events later** → accessible from Profile > "Switch event" → returns here.
- **Selected but then deselected** → allow "Going" → tap again → "Leave event?" confirmation. Don't trap them.

---

## The Lovable Prompt

```
Build the Event Selection screen that appears after signup completes (after the name is saved) and before Home.

LAYOUT — iOS native:
- Sticky large-title nav bar: "Events" at 34px bold -0.02em tracking, collapsing to 17px semibold with bg-white/80 backdrop-blur-xl on scroll >32px.
- Subhead below title: "Pick where you're going" at 15px black/50.
- Sections in order: "HAPPENING NOW" (accent label, 11px uppercase 0.06em tracking), "COMING UP", "PAST EVENTS" (collapsed by default).
- No tab bar on this screen. No back button after signup.

CARD SPEC:
- White rounded-[16px], no shadow, 16px padding.
- 16:9 event image at top, rounded-[12px], object-cover.
- Title 22px bold -0.01em, max 2 lines.
- Meta line 15px black/50 with tabular-nums: "{venue} · Opens in {n} days" — or "Happening now" in accent color if the event has started.
- One action only: tinted pill "I'm going" (12% accent bg, accent text) that becomes a filled pill with a checkmark "Going" when selected.
- Tapping the card body (not the pill) opens a preview bottom sheet.

PREVIEW SHEET:
- Grabber, rounded-t-[20px], slide-up spring (300/30).
- Event image, title 22px bold, dates + venue 15px black/50, ticket link as plain text.
- One primary action: filled pill "I'm going" that sets the event as active.

BEHAVIOUR:
- On "I'm going": save selected_event_id to localStorage and to profiles.active_event_id, then navigate to Home scoped to that event.
- Persist selection — if the user returns, Home opens to their active event, not this screen.
- If the user arrived via an invite deep link and the crew has an event_id, skip this screen entirely and auto-select that event.
- "Switch event" is available later from Profile.

STATES:
- Loading: 3 skeleton cards (gray blocks, not a spinner).
- Empty: centered "No events yet" 22px bold + "Got an invite? Join a crew with a code" 17px black/50 + tinted pill "Join with a code" routing to the join flow.
- Offline: show cached events + hairline banner "Offline — showing saved events".
- Error: "Couldn't load events" + [Try again] button + cached fallback if available.

DATA:
- Query an events table (id, name, venue, starts_at, ends_at, image_url, ticket_url, status).
- Order: happening now first, then coming up by starts_at ascending, then past by ends_at descending.
- No organizer fields on this screen. No descriptions, no tags, no paragraphs.
```

---

## The One Thing

**This screen is the moment the app stops being a flyer and becomes a tool.** Everything downstream — Home, Map, Crew, Lineup — inherits the event from this selection. Get it right and the "app doesn't know where I am" problem disappears permanently. Make it a real screen with real states and a real selection model, not a modal afterthought.

**One sentence:** after signup, show a native Events screen with happening-now / coming-up / past sections, one card per event with one action, a preview sheet to confirm, persist the selection, skip it entirely for invite deep links — and every screen after it finally knows which festival it's talking about.
