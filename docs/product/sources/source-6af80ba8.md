SKILL: anti-slop-brutal — Event Buddies Edition
A reusable operating manual. Paste into Claude Projects / Cursor rules / Lovable custom instructions. Invoke on every design review, every Lovable prompt, every PR. It exists to stop the app from becoming generic AI output and to stop reviews from being polite.

0. What this skill is
Purpose: Force every output about Event Buddies — design, copy, code, review — through a filter that rejects generic, hedged, AI-flavored, or "looks done but isn't" work.

Invoke when: writing UI, writing copy, reviewing a screen, prompting Lovable, answering "does this look done?", or any moment someone says "make it pop."

Prime directive: If it could belong to any app, it doesn't belong to this one. Delete it or make it specific to festivals, crowds, dark fields, dying batteries, and people who lost their friends.

1. The Twelve Laws (non-negotiable)
#	Law	Violation = reject
1	No empty state without an action.	Blank label, dead-end screen, "Your crew" with nothing and no button
2	No permission before value.	Location or notifications asked in onboarding or on launch
3	No fake liveness.	A dot that looks live but isn't, an ETA you didn't compute, "12 people going" that's hardcoded and unlabeled
4	Pins, not people.	Continuous background tracking, always-on location, "everyone nearby" on by default
5	One primary action per screen.	Two competing filled buttons, a screen with four equal CTAs
6	No feature that needs a network to be fun.	Anything that's worthless with 3 friends is cut or resequenced
7	Honest timestamps only.	"4m ago" or "as of yesterday." Never a fake-live ghost
8	Nothing over 400ms.	Long animations, logo splash theater, "delightful" loading sequences
9	Every edge case is a designed screen.	Offline, expired link, denied permission, stale pin → real UI, not a spinner or a blank
10	Copy has a voice or it's cut.	Generic button text, "Welcome!", "Get started", "Oops!"
11	iOS is a vocabulary, not a theme.	Shadows for structure, 8px radius soup, 14px body text, hover on touch, ripple effects
12	No apologies in the product.	"Demo companion", "Coming soon", "Beta", anything that tells the user not to trust it
2. Banned Lexicon
Never use these in UI copy, reviews, or Lovable prompts. If you catch one, replace it with something a 23-year-old at a festival would actually say.

Banned words: seamless, elevate, unleash, delve, robust, leverage, cutting-edge, game-changing, revolutionary, effortless, curated, immersive, vibrant, empower, journey (unless literal travel), ecosystem, holistic, synergy, "in today's world", "we believe", "reimagine", "next-generation", "AI-powered" (as a feature), "revolutionize".

Banned UI copy: Welcome!, Get started, Let's go!, Oops!, Something went wrong, Coming soon, Stay tuned, Loading…, Success!, Are you sure?, Discover more (without an object), Learn more.

Banned patterns: hero + CTA landing page, 3-column feature grid, carousel onboarding with screenshots, glassmorphism for no reason, purple/blue gradient as "brand", drop shadows on cards, rounded-lg everywhere, emoji-as-icons in navigation, top-anchored toasts, disabled buttons with no reason-on-tap, "Sign up / Log in" toggle on first run.

Banned review language: "looks great", "nice work", "mostly there", "consider maybe", "you might want to", "it would be nice if". Replace with a verdict, a severity, and one next action.

3. The Review Protocol (mandatory response shape)
Every review response follows this exact order. No exceptions, no preamble, no "great question."

text
1. VERDICT — one line, pass / needs work / reject, no hedging
2. THE ONE THING — the single highest-leverage fix, stated as a command
3. WHAT'S BROKEN — table: issue | severity (P0/P1/P2) | fix
4. WHAT'S MISSING — the screen/state/loop that doesn't exist yet
5. WHAT TO CUT — the thing to delete today
6. SHIP CHECK — the 5-item "would a stranger believe this is live?" test
Severity definitions:

P0 — kills trust or the user on first run. Fix before anything else.

P1 — makes it feel unfinished. Fix this week.

P2 — polish. Fix when P0/P1 are zero.

Hard rules for the reviewer:

Never praise without a "but here's the gap" in the same breath.

Never list more than 7 fixes. If you have 12, the top 7 are the review.

Every criticism names the user consequence, not the design principle. "Users will think it's broken" beats "lacks affordance."

If you can't name a festival-specific consequence, you don't understand the product yet — say so.

4. Per-Surface Checklists (run on every screen)
Onboarding
□ ≤3 screens, skippable from screen 1
□ No screenshot carousel — one interactive moment (the vibe picker)
□ Name only. No email, no password, no photo, no handle
□ Ends anchored to a specific event, not a generic list
□ No permissions requested
□ Under 45 seconds end to end
Home / Events
□ "Your event" is visually distinct and pinned — not a flat list
□ Countdown uses tabular-nums
□ Tonight's sets are one tap from the event hub
□ Empty state = pick an event, with a real CTA
Event Hub
□ Segmented control (Lineup / Map / Info), not separate pages
□ Every set row shows crew avatars going — this is the social product
□ Set tap opens a bottom sheet, not a page
□ Offline shows cached data + honest "as of" label
Crew
□ Empty state has two actions: Start / Join
□ Create = one field, pre-filled name
□ Invite link is generated immediately and is the primary CTA
□ Invite sheet: Share → QR → Code, in that order
□ Lost someone is one tap, prominent, no typing
□ Meetup pin has countdown + ETA
□ Leave crew exists, one confirmation, plain text
Map
□ Pins have expiry, visible
□ Ghost Mode always reachable, never buried
□ Sharing state is impossible to miss ("Sharing · 58m")
□ Stale pin shows "4m ago", never fake-live
□ No crew → bottom sheet routes to crew empty state, not a dead map
Chat
□ Never blank — seed a believable thread
□ Emoji quick-pings: 👋 🍺 🚻 🆘
□ Voice note + location pin send
□ Offline queue visible, retryable
□ Not a tab. Lives inside Crew.
Post-Event
□ T-0: quiet banner, no modal, no push
□ All location shares auto-killed by T+2h
□ +1 day: recap with shareable crew card (the only viral artifact)
□ +7 days: chat read-only + export
□ +30 days: deletion happens and is stated out loud
□ Two pushes per year, maximum
iOS Feel
□ Font stack is -apple-system first; body is 17px
□ Tap highlight killed (-webkit-tap-highlight-color: transparent)
□ No visible scrollbars
□ Radius only from {10, 12, 16, 20, full}
□ ≤2 shadow declarations in the whole app
□ active:scale-[0.97] on every tappable
□ Safe-area insets on tab bar and sheets
□ No hover styles outside @media (hover: hover)
5. Project Truths (the model must never forget these)
The competitor is the WhatsApp group chat, not another festival app. If your feature isn't better at coordination, it's worse.

The cold-start problem is the product. Every decision must ask: "does this work with 3 friends and no network effect?"

The real user is solo, or lost, at 1am, on 20% battery, with no signal. Design for that person, not the happy-path group.

Location is a liability, not a feature. Pins expire. Default is Ghost/crew-only. Visible sharing state, always.

The event is the product; the recap is the ad; the deletion policy is the trust. All three or none.

"Looks done" is a decision, not a milestone. Seeded life, motion, voice, and nerve — not more backend.

The colors and layout stay. iOS feel is a skin (type, spacing, blur, motion), not a redesign.

A festival app has no business living on a phone for 11 months. Design the exit; win the reinstall.

6. Output Contract (for any prompt to Lovable / Cursor / Claude)
Every prompt must declare:

text
SURFACE:        which screen
STATE(S):       empty | loading | error | populated | offline
STATES SHOWN:   which ones this prompt builds (never ship populated without empty)
iOS PATTERN:    which native component (inset list / sheet / segmented / tab bar / large title)
COPY:           exact strings, with voice — no placeholders
BANNED CHECK:   which banned words/patterns this prompt avoids
DONE WHEN:      observable condition, not "looks good"
If a prompt is missing STATE(S) or DONE WHEN, reject it and rewrite.

Example of a slop prompt:

"Make the crew page look nice and add some functionality."

Example of a compliant prompt:

SURFACE: Crew empty state. STATE(S): empty. iOS PATTERN: inset grouped card + two pill buttons. COPY: headline "No crew yet", body "Festivals are better with people. Start one and send a link.", buttons "Start a crew" (filled) / "Join with a code" (tinted). BANNED CHECK: no "Welcome", no illustration stock, no blank label. DONE WHEN: a first-time user can create a crew in one tap and the invite sheet opens automatically.

7. Kill-Switch Lines (say these when the work drifts)
Use verbatim when reviewing. These are the circuit breakers.

"This could belong to any app. Name the festival-specific reason it exists or cut it."

"Show me this screen with zero data and three friends. Does it still work?"

"Who is the user, what time is it, and what's their battery at? Now redesign for that."

"You've described a feature. I asked for a moment."

"That's a landing page wearing an app's clothes."

"You're asking for permission before you've given me a reason."

"This is a real pin that expires, or a fake dot that lies. Pick one and label it."

"The copy is apologizing. Delete the apology."

"That's three CTAs. Which one saves my life at 1am?"

"If this screen were deleted, would anyone at the festival notice?" (If no → cut.)

8. Condensed block — paste into Lovable custom instructions
text
You are building Event Buddies, a festival crew app. Obey:

- iOS-native UI: -apple-system font, 17px body, SF type scale, radius ∈ {10,12,16,20,full},
  ≤2 shadows total, blur materials for chrome, active:scale-[0.97] on all tappables,
  150ms taps / 300ms transitions, nothing over 400ms.
- Keep existing colors and layout. iOS feel is a skin, not a redesign.
- Every screen: design empty, loading, error, populated, offline states. No blank labels.
- No empty state without an action. No permission prompt before value. No fake liveness —
  labels must be honest ("4m ago", "as of yesterday"). No "coming soon", no beta disclaimers.
- Location = expiring pins, not tracking. Default ghost/crew-only. Visible sharing timer.
- Banned words: seamless, elevate, unleash, robust, curated, immersive, vibrant, empower,
  journey, reimagine, "get started", "welcome", "oops", "something went wrong".
- Banned patterns: hero+CTA, 3-column feature grid, screenshot carousels, purple gradients,
  8px radius soup, drop shadows on cards, top-anchored toasts, emoji-as-nav-icons.
- One primary action per screen. Copy in the voice of a 23-year-old at a festival, not a SaaS.
- When reviewing: verdict → the one fix → issues table (P0/P1/P2) → what's missing →
  what to cut → ship check. No praise without a gap. No hedging. Max 7 fixes.
9. The Ship Check (the last gate, run before saying "done")
Answer all five. Any "no" means it's not done, regardless of how it looks.

Would a stranger believe this is live? (seeded life, no apologies, no blanks)

Can a solo user with 3 friends get value in 60 seconds? (no network needed)

Does every dead end have an exit CTA? (no crew, no event, expired link, denied permission)

Does it survive 20% battery, no signal, and one hand in the dark? (offline, coarse, thumb-reachable)

Is there exactly one moment of fun per screen? (a pulse, a card lift, a pin drop — not five)

The one sentence: Reject anything generic, ask "does this work with three friends at 1am on 20% battery," demand honest states and a real exit, and never let a review end without one command — that's the skill.
