The Behance page itself is thin — it's a project cover with one line: *"event discovery, social interaction, and group coordination can live in one seamless experience."* But the LinkUp *pattern* it points to is fully documented across the ecosystem of apps using that name, and the UX logic is consistent enough to extract cleanly. Here is what's worth stealing, and what's noise.

---

### The Core UX Thesis (the one thing worth stealing)

**LinkUp's entire premise is that group chat is where plans go to die.** The documented problem is that coordination "drifts across long chat threads" and "possible options are hard to turn into one agreed outcome that everyone can find later." The solution is not more chat — it's **structured decision-making**: polls, explicit confirmations, and a separate "confirmed plan" state.

**Why this matters for Event Buddies:** your app currently has no coordination primitive at all. You have pins and "Lost someone," but you don't have a way for a crew to *decide* something together ("Main Stage or the bar?" "Leave at 11 or 1?"). LinkUp's thesis is that the decision is the hard part, not the location.

---

### The Features Worth Stealing (ranked by relevance)

**1. The Poll-as-Proposal.**
The most consistently documented LinkUp UX pattern is structured polling for group decisions — not just "yes/no," but proposals with vote tallies and a clear "closed" state. The key UX insight: the poll must have **a visible end state** — the group needs to see that the decision is *finished*, not just that votes exist.

**How to use it:** Add a "Vote" composer to the crew chat. *"Main Stage or Bar 2? [Main Stage] [Bar 2]"* → everyone taps → the winner is highlighted, the poll locks, and a message appears: *"Crew decided: Main Stage."* One tap, no thread-reading, no ambiguity. This is a **P1** — more useful than a full chat clone, and a fraction of the engineering.

**2. Privacy Tiers for Plans.**
One LinkUp variant explicitly supports **public, friends-only, and invite-only** plans, because different social preferences require different visibility. This is the same insight as your Ghost Mode, but applied to *events and meetups*, not just location.

**How to use it:** When a crew drops a meetup pin or creates a "plan," let the creator choose: **Crew only** (default) or **Invite-only link**. Never default to public. This is already aligned with your trust model — just formalize it as a per-plan setting.

**3. Map-Based Discovery, Not List-Based.**
Multiple LinkUp variants organize discovery around an **interactive map** where nearby activities are visible as pins you can tap to join. The UX logic is that festivals are spatial — a list of events is the wrong metaphor.

**How to use it:** This validates your existing Map tab. The difference is LinkUp's map is **discovery-first** (what's happening near me?) while yours is currently coordination-first (where is my crew?). Consider a toggle: **"My Crew" / "Discover"** on the map. Discover shows public meetups or stage activity, crew shows your people. Do not build this until crew tracking works — but it's the natural next layer.

**4. The "Confirmed Plan" as a Separate Object.**
LinkUp's most sophisticated variant treats a **confirmed plan** as a distinct entity with a version history — if the time or activity changes, old confirmations are cleared and everyone must re-confirm. This prevents the classic festival failure: *"Wait, I thought we said 11?"*

**How to use it:** Your meetup pin is currently static. Make it a **plan object** with a state: `proposed → confirmed → changed`. When someone changes the meetup point or time, the pin visually flags *"Changed — confirm?"* and everyone must tap to acknowledge. This is a small data-model change with a large coordination payoff.

**5. Lightweight Gamification (optional, late-stage).**
One LinkUp case study (the car-event version) added **points for attending and engaging**, redeemable for real rewards from sponsors. This is not core to a festival crew app, but it's a proven retention mechanic for a seasonal product.

**How to use it (P3, after launch):** Award points for attending sets, dropping pins, and completing meetups. Redeem for festival merch or bar discounts. Do not build this until the core loop is stable — but keep the data model open to it (an `actions` or `events` log table).

---

### What to Ignore (and Why)

| LinkUp feature | Why it doesn't fit Event Buddies |
|---|---|
| **Swipe-to-match (Tinder-style)** | Multiple LinkUp variants use profile swiping to find people. A festival is not a dating context, and your users already have a crew — they don't need to swipe to find one. The invite link is a better growth mechanic. |
| **Recurring plans / reminders** | LinkUp supports recurring meetups (weekly brunch, etc.). Festivals are one-off events. A recurring meetup is meaningless when the gates close in 72 hours. |
| **Full calendar integration** | LinkUp syncs plans to calendars. A festival schedule is already in the app — pushing it to Google Calendar is a P3 nice-to-have, not a core loop. |
| **Car-club / hobby-group features** | The car-event LinkUp variant has clubs, vehicle tracking, and host-following. These are community features for a year-round hobby, not a 3-day festival. Skip entirely. |
| **AI iMessage agent for planning** | One LinkUp uses an AI agent to negotiate plans over iMessage. This is clever but over-engineered for your use case. Your crew already knows each other; they don't need an AI to interpret "I'm free after class." |

---

### The One UX Pattern to Adopt Immediately

**The "Decision Card" in the crew chat.**

Not a poll feature — a **single message type** that any crew member can send:

```
┌─────────────────────────────┐
│  Crew decision               │
│  Where are we meeting?       │
│  [Ferris wheel] [Main Stage] │
│  ─────────────────────────   │
│  Sam voted · 2 of 4 voted    │
└─────────────────────────────┘
```

Tap an option → the card updates with your avatar → when everyone votes or a deadline passes, the card locks with a green "Decided" state and the result is pinned to the crew home.

**Why this beats a full chat:** it solves the exact problem LinkUp identified — coordination drift — with one component, no thread-reading, and a visible finish line. It's the smallest possible version of LinkUp's thesis, and it fits directly into your existing crew surface.

---

**The one sentence:** LinkUp's real lesson is not "add chat" or "add discovery" — it's that **groups fail at the moment of decision, not the moment of conversation**, so steal the structured poll, the confirmed-plan object, and the privacy tier for plans, and ignore the swiping, the recurring reminders, and the AI agent — your festival crew needs a way to *decide* together in one tap, not another place to talk.
