# The Flow Is Right in Structure, Wrong in Sequence

Your instinct on IA is solid — **Events → Event → Lineup/Map → Crew** is a coherent mental model. But the *first-run* as described has three problems that will cost you the user before they ever see the good part.

## Brutal verdict

| Your step | Verdict |
|---|---|
| Clips of the app (carousel) | ⚠️ **Dead pattern.** Nobody reads onboarding carousels. They swipe through in 3 seconds and retain nothing. If it's *interactive*, keep it. If it's screenshots, delete it. |
| Fill in name | ✅ Right place, right ask — but **name only**. No email, no phone, no password. Guest-first. |
| Home = list of events | ⚠️ **Depends.** If this is one festival, a "list" of one event is a dead screen. If it's multi-festival, a list is right — but it must remember intent ("You're going to X"). |
| Click event → lineups + maps | ✅ Correct nesting. Use a segmented control, not separate pages. |
| Crew → start crew → invite | 🔴 **Too late, and too buried.** Crew is not a tab you visit — it's *the moment the app becomes useful*. It needs to be reachable from the event, not only from a tab. |

**The single biggest flaw:** your flow has **no "aha" moment.** Onboarding → list → detail → map is an *information* journey. The app's actual value is *social*. The user finishes onboarding and lands on a list of events — which is a brochure again, just one screen deeper.

**Fix:** onboarding must end by **anchoring the user to a specific event** — not a list. Home becomes *"You're going to Sound of Summer"* with the list as a secondary "Discover more."

---

## The Revised First-Run (Screen by Screen)

**Total budget: under 45 seconds. Three screens max. Skippable from screen one.**

### Screen 1 — Value, in one line
- No logo splash longer than 800ms. iOS apps launch *into* content.
- One line: **"Find your people. Don't lose them."**
- One visual: a stylized map pin cluster or two avatars converging. Not a screenshot.
- Bottom: filled pill **Continue** + plain text **Skip** top-right.
- Page dots (2–3 max), iOS style: 7px circles, active pill-shaped 20px wide.

### Screen 2 — Interactive, not a carousel
This replaces "clips of the app." Make the user *do* the thing:

> **"What's your festival mode?"**
> Three large cards: 🎧 Here for the music · 🕺 Here to meet people · 🌅 A bit of both

Tap one → card lifts (`scale-[1.02]`, spring), subtle haptic-style bounce, auto-advance after 300ms. **This is your personalization AND your fun moment AND your demo of the app's personality** — in one screen. It replaces three carousel slides.

### Screen 3 — Name
```tsx
// Circular initials avatar, auto-colored from the name hash
<div className="mx-auto h-24 w-24 rounded-full bg-[var(--accent)]/15
                flex items-center justify-center text-[34px] font-semibold
                text-[var(--accent)] ring-1 ring-black/5">
  {initials || "?"}
</div>

<input
  className="mt-6 w-full rounded-[12px] bg-black/[0.04] px-4 py-3
             text-[17px] text-center outline-none
             focus:ring-2 focus:ring-[var(--accent)]/40 transition-shadow"
  placeholder="Your name"
  autoFocus
/>
<p className="mt-2 text-center text-[13px] text-black/40">
  This is how your crew will see you
</p>
```
- **Ask for nothing else.** No handle, no email, no photo upload (photo is optional and later, in Profile).
- Continue is disabled until ≥2 characters — but **never** show a red error on first run. Just a dimmed button.
- **No "Sign up" / "Log in" toggle.** Guest-first. Account linking is a *post-value* ask, not a *pre-value* ask.

### Screen 4 — The anchor (do not skip this)
Instead of dropping them on a generic list:

> **"You're going to Sound of Summer 2026"**
> One event card, large, already selected. Below it: *"Find your crew"* (primary) and *"Browse other events"* (plain text, small).

This is the difference between "an app with a list" and "an app that knows me." One tap and they're in the product.

---

## Home — Decide This Before You Build It

You have a fork. Pick one:

**Option A — Single-festival app (recommended for launch)**
Home **is** the event. No list at all. Top: event name, countdown, "Tonight's sets." This is dramatically stronger because every screen is already in context.

**Option B — Multi-festival app**
Home is a list, but it must be:

```tsx
<div className="mx-4 overflow-hidden rounded-[16px] bg-white">
  {/* "Your event" pinned at top, visually distinct */}
  <div className="p-4 border-b border-black/[0.06]">
    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
      You're going
    </span>
    <h2 className="mt-1 text-[22px] font-bold tracking-[-0.01em]">Sound of Summer 2026</h2>
    <p className="text-[15px] text-black/50">Langstrand · 14–16 Nov</p>
  </div>
  {/* Other events below, smaller */}
</div>
```

**Either way, "Your event" must be visually distinct and pinned above the rest.** A flat list of events with no personalization is a directory, not a home screen.

---

## Inside the Event — Segmented Control, Not Pages

You said "click on it they can now access lineups maps." Don't make those separate navigations. Use one iOS segmented control at the top:

```
[ Lineup ]  [ Map ]  [ Info ]
```
- **Lineup** — set times, your crew's picks highlighted in your accent, overlap badges
- **Map** — stages, meetup pins, crew dots
- **Info** — tickets, gates, water/medic/toilets, the essentials

**Why segmented:** it keeps the user inside the event context and makes the event feel like a *hub*, not a folder. It's also the most instantly recognizable iOS component after the tab bar.

**Lineup row spec (native-feeling):**
```tsx
<button className="flex w-full items-center gap-3 px-4 py-3 active:bg-black/[0.04] transition-colors">
  <span className="w-[46px] text-[15px] font-semibold tabular-nums text-black/40">23:00</span>
  <div className="flex-1">
    <p className="text-[17px] font-semibold tracking-[-0.01em]">Rüfüs Du Sol</p>
    <p className="text-[13px] text-black/40">Main Stage</p>
  </div>
  {/* Crew overlap avatars — this is the matchmaking surface */}
  <div className="flex -space-x-2">
    {crewGoing.map(u => <Avatar key={u.id} className="h-7 w-7 ring-2 ring-white" />)}
  </div>
</button>
```

**That avatar cluster on every set row is your entire social product.** It answers "who's going to this?" without a single extra screen. Build it.

---

## Crew — The Loop You Actually Need

Your description ("start their crew and invite people") is one action. The crew tab needs **four** surfaces:

**1. Empty state (the most important screen in the app)**
> Illustration (warm, not gray) · **"No crew yet"** · *"Festivals are better with people. Start one and send a link."*
> `[ Start a crew ]` (filled) · `[ Join with a code ]` (tinted)

Never a blank label. Never a dead end.

**2. Create crew — one field**
Crew name (pre-filled: *"Sam's crew"*). That's it. Auto-creates the invite link immediately.

**3. Invite — the growth loop**
```tsx
// Bottom sheet, three options in priority order
[ Share invite link ]        // opens native share sheet → WhatsApp
[ Show QR code ]             // festival-native, works at the gate
[ Copy code ]                // fallback: 6-char code
```
**The invite link is your entire acquisition strategy.** It must deep-link: friend taps → skips onboarding carousel → name only → lands *inside the crew*. That's a 12-second conversion. Build the deep-link path before anything else in the crew flow.

**4. Crew home (once populated)**
- Member avatars, live "sharing" dots
- **Pinned meetup** with countdown: *"Ferris wheel · 12 min"*
- **"Lost someone"** button — one tap, prominent
- Group chat entry
- Plain text **"Leave crew"** at the bottom, no confirmation friction beyond one tap

---

## The Tab Bar — Final Answer

You described Home, Event, Crew. Five tabs is the iOS max; four is cleaner. Ship this:

| Tab | Contains |
|---|---|
| **Events** | Home. Your event pinned, discover below. |
| **Map** | Active event map, crew pins, meetups |
| **Crew** | Crew list → crew home → chat → invite |
| **You** | Vibe, privacy (Ghost Mode), sharing state, settings |

**Chat lives inside Crew**, not as a tab. It's a crew tool, not a feed. If you later find chat is the most-used surface, promote it — but don't start with five tabs to accommodate something nobody's used yet.

---

## The Two Permission Prompts (Get This Order Right)

Your described flow has **no permission strategy**, and that's a silent killer.

**❌ Never ask in onboarding.** Both prompts before value = bounce.

**Notifications** — prime *after* they create or join a crew:
> *"Get a nudge when your crew arrives at the meetup?"* → `[ Not now ]` `[ Allow ]` → system prompt

**Location** — prime *at first share*, with a visible reason:
> *"Share your spot with your crew? Only they can see it, and it stops in 60 min."* → system prompt → then a **persistent "Sharing · 58 min" pill** at the top of the screen.

**Priming copy before the system prompt doubles your grant rate.** Skipping it halves it.

---

## What Will Break This Flow

- 🔴 **A carousel that shows screenshots.** Death. Make screen 2 interactive or cut it entirely.
- 🔴 **Asking for email/password.** Never on first run. Guest-first.
- 🔴 **Landing on a list of events with no "yours."** Feels like a directory.
- 🔴 **A crew tab with no invite link on first visit.** You've built a social app with no social entry point.
- 🔴 **Location prompt in onboarding.** Guaranteed denial, and iOS won't let you re-ask.
- 🔴 **More than 3 onboarding screens.** Conversion falls off a cliff after 3.
- 🔴 **Onboarding you can't skip.** Trapped users delete.
- 🔴 **Anything seeded-fake looking.** For the demo, seed a crew of 3 with real-sounding names — but make it *believable*, not obviously placeholder.

---

## Build Order (Realistic)

| # | Build | Why first |
|---|---|---|
| 1 | 3-screen onboarding: value → vibe → name | Gets you a real first-run |
| 2 | Anchor screen: "You're going to X" | Creates the aha |
| 3 | Tab bar: Events · Map · Crew · You | Makes it read as an app |
| 4 | Event hub with segmented Lineup/Map/Info | The core content |
| 5 | Lineup rows with crew avatar clusters | The social moment |
| 6 | Crew empty state + create + **invite link** | The growth loop |
| 7 | Permission priming (notifications, location) | Retention + trust |
| 8 | Seed a demo crew so nothing looks empty | The "looks shipped" layer |

**The one sentence:** your flow is a **good skeleton with the aha missing and the social loop buried.** Add the anchor screen, put an invite link on the crew empty state, make onboarding interactive instead of a carousel, and never ask for permissions before you've delivered value — and this flow goes from "correct" to "shipped."
