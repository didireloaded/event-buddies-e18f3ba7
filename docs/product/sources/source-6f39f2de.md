# Part 1 — Fun Features Users Actually Want

Grouped by **fun-per-effort**. Festival context is the filter: dark, loud, drunk, one hand, dying battery, no signal. If a feature needs typing, reading, or two hands, it's not fun — it's work.

## 🟢 Tier S — Ship these. They *are* the fun.

| Feature | Why it works | Effort |
|---|---|---|
| **"Lost someone" button** | The #1 real festival emotion. One tap → your pin + a ping to your crew. Solves the most painful moment. | Low |
| **Meetup pin + countdown + ETA** | *"Ferris wheel · 12 min · 400m."* Anticipation is dopamine. | Low |
| **Crew "pulse"** — live dots/avatars on a stylized map | Seeing your people move = the app feels alive. | Med |
| **"Who's at this stage?"** | Tap a stage → see crew + nearby avatars. Contextual, not creepy. | Med |
| **Voice notes in chat** | You can't type at a festival. You *can* shout into your phone. | Low |
| **Emoji quick-pings** — 👋 "here", 🍺 "bar", 🚻 "toilets", 🆘 "come get me" | Zero typing, huge personality, instantly understood. | Low |
| **Flashlight / "find me" strobe** | The dark-field classic — flash your phone so your friend can spot you. Delightful and *actually useful*. | Low |
| **Set-overlap matching** — *"You + Maya: 92% same sets"* | Taste as the social signal. Numbers are dopamine, and it's not creepy. | Med |

## 🟡 Tier A — High delight, slight lift

- **"Walk with me" (night safety)** — pair up to walk to the exit/toilets after dark. This is the feature that gets *word-of-mouth* from solo attendees and women. Genuinely differentiating.
- **Vibe check** — anonymous crowd mood per stage: 🔥 packed / 😌 chill / 🕺 lit. Real-time, no names, harmless fun.
- **"Leaving now" broadcast** — one tap: "heading to Main Stage, anyone coming?" Turns solo movement into group movement.
- **Crew stats / leaderboard** — most sets seen, most steps, latest night. Playful, competitive, shareable.
- **Digital wristband card** — your festival identity as a shareable graphic. This is your growth artifact — people post it, friends ask "what app is that?"
- **Countdown to gates** — a live timer on the home screen. Cheap, and it makes the app feel *anticipatory*.
- **"Who has a charger / water / gum?"** — crowd-sourced tiny favors. Festival apps are secretly logistics apps.

## 🔵 Tier B — Post-MVP, keep on the roadmap

- **Photo drops into crew** (post-festival recap lives here — this is your retention hook)
- **Lineup planner with crew overlap visualization**
- **"Lost & found" board** (festival-specific, surprisingly used)
- **Water / medic / toilets / exits finder** on the map
- **Guess-the-next-song between sets** (light, social, no stakes)
- **Digital friendship bracelet / pin trading**
- **"Secret meetup drop"** — a surprise location revealed at a set time. Pure fun, zero utility, high sharing.

## 🔴 The Cut List — do not build these

- Friends-of-friends graphs (cold-start poison)
- Crowd heatmaps (creepy + battery + data you don't have)
- Ticketing / wallet (someone else's problem)
- An in-app social feed (you're not Instagram, and nobody wants another feed)
- Full profiles with bios and photos (invites judgment and harassment; keep it light)
- Anything that requires typing more than 5 words

**The through-line:** every Tier S feature works with **3 friends and no network effect.** That's the test. If a feature needs a million users to be fun, it's not a feature — it's a fantasy.

---

# Part 2 — The GPS / Geolocation / Tracking Honest Talk

This is the part where I get blunt, because **continuous location tracking will kill this app** — technically, legally, and reputationally — if you build it the obvious way.

## The brutal truths

1. **Continuous GPS drains 5–10% battery per hour.** At a festival, a phone at 40% at 6pm needs to last until 2am. An app that visibly eats battery is deleted *that night* and never reinstalled. This is your single biggest technical risk.
2. **The data uplink will fail even when GPS works.** Festival cell towers are catastrophically overloaded. Your phone knows exactly where it is — and can't tell anyone. Continuous tracking that fails silently is worse than no tracking.
3. **Accuracy is garbage at festivals.** Crowds, stages, metal structures, urban-canyon effect → ±10–50m. "Your friend is 15m away" when they're actually across the field destroys trust fast. One bad pin at 1am and the app is dead to that user.
4. **Background location is an App Store / Play Store review liability.** Both platforms scrutinize it, and if you can't justify it, you get rejected. "Festival buddy app" is not a strong enough justification for always-on background tracking.
5. **Always-on location for strangers is the creepiest possible default.** In a proximity-social app, one "how did they find me" moment is a 10-person churn event plus a warning in the group chat. You will never hear about it, and you'll never recover from it.

## What to build instead — the "pins, not people" model

**Rule: don't track people. Let people drop pins.**

| ❌ Don't | ✅ Do |
|---|---|
| Continuous background location | **Static "I'm here" pins** with auto-expiry (30–60 min) |
| Live always-on dots for everyone | **Live dots only for your crew, only while sharing** |
| Exact coordinates | **Coarse grid squares** (e.g., "Main Stage area") — good enough to find someone, useless to a stalker |
| Broadcast to all attendees | **Crew-only by default**, opt-in to "discoverable nearby" |
| Permanent sharing | **Expiring shares** with a visible countdown ("sharing for 28 min") |
| Hide the tracking | **Persistent "you are sharing" indicator** + one-tap Ghost Mode |

**The mental model to design around:** it's not Find My. It's *"drop a pin where you'll be and I'll meet you there."* That's the festival behavior that actually exists — you agree on a landmark because GPS is unreliable. Lean into it instead of fighting it.

## Privacy model (this is the product, not the fine print)

**Tiered visibility — make it explicit and visible:**
1. **Ghost** — nothing shared. Default for new users until they choose otherwise.
2. **Crew only** — the safe default once they join a crew.
3. **Same-set people** — opt-in discoverability for people going to the set you're at. This is your matchmaking engine and it feels *contextual*, not stalkerish.
4. **Everyone nearby** — opt-in, clearly flagged, and I'd genuinely consider not building it at all.

**Non-negotiables:**
- **Opt-in, never opt-out.** No pre-checked boxes.
- **Auto-expire everything.** Location shares die after 30–60 min unless renewed. Show the timer.
- **One-tap Ghost Mode** that's always reachable — not buried in settings.
- **Block / report / leave crew** on every surface, one tap, no explanation required.
- **A visible "sharing" indicator** at all times. If the user can't tell who can see them, they will assume the worst.
- **No location history stored server-side** beyond what's needed for the live feature. If it's not stored, it can't leak. Say this out loud in your privacy copy — it's a selling point.

**Legal:** you're building in Namibia / operating from Southern Africa — check your jurisdiction's data-protection law (POPIA-style frameworks are becoming the norm regionally; GDPR principles are the safest baseline). **Location data is sensitive personal data.** You need: a plain-language privacy policy, a lawful basis for processing, a deletion path, and a breach plan. Do this *before* any public festival launch, not after. A privacy-policy link in the footer is not optional — it's table stakes for app store approval anyway.

## Technical spec — what to actually build

- **Foreground-only location.** Only request location while the app is open and the user is actively sharing. No background permission.
- **Coarse accuracy.** Request `BALANCED`/`COARSE` accuracy, not `HIGH`. You need "which field," not "which blade of grass."
- **Static pins over streams.** Send a position on demand (button tap / check-in), not a continuous stream.
- **Offline-first queue.** Cache last-known pin locally; queue updates; show "last updated 4m ago" honestly instead of pretending it's live.
- **Geofencing for meetups** (optional, cheap): notify the crew "you're within 100m of the meeting point" — no continuous tracking needed.
- **Bluetooth/UWB for the last 50 meters** (later): this is how AirTags nail precision indoors. It's the *right* tool for "we're both at this stage, where exactly?" without GPS. Park it for v2, but design the map so precision-finding can slot in.
- **Battery budget as a feature.** Publish it: *"Location only while the app is open. No background drain."* That's a marketing line.
- **Test at the real venue.** Walk Langstrand with 3 phones and 3 people. Time how long a pin takes, how wrong it is, how much battery it eats. Do this before you build anything else on top of the map.

## The safety layer (say it out loud)

Festival safety is gendered and real. **"Walk with me"** and **auto-expiring, crew-only, ghost-mode-by-default** are not features — they're the reason a woman will install this at all. If your app can't answer *"can a stranger find me?"* with an unambiguous **no**, you don't have a product, you have a liability. Put that answer on the first-run screen.

---

## The one-sentence version

**Build pins, not tracking. Expire everything. Default to crew-only. Make the sharing state impossible to miss. And ship the fun stuff — regroup, voice notes, emoji pings, the flashlight — because those are what make people open it twice.**

The GPS question isn't "how do we track people better." It's **"how do we help people find each other with the least data, the least battery, and the most trust."** Get that right and the app feels magic. Get it wrong and no amount of nice design saves it.
