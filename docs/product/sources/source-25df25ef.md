**Verdict: the live app has not moved. It is still the same editorial landing page you asked to be killed — the feedback in your voice note describes exactly what's wrong with it, and none of it has been acted on.** The GitHub repo still 404s (private or deleted), so I can't verify whether code exists behind the live URL, but what's rendered is unchanged: the same wall of "ride home," "coast watch," "ask about the festival," "read the saved answers," "Namib Rage" — the exact clutter you said to remove.

---

## The One Thing

**Stop adding content and start deleting it.** Your voice note says the app is "too much reading," "cluttered," "editorial," "overwhelming," "doesn't feel like iOS" — and the live app is *all* of those things. Before anything else: **one screen, one job.** The home page should be the event name, the event image, and *your crew*. Everything else is secondary or gone.

---

## What's Broken (Against Your Own Feedback)

| Your instruction | Live app | Severity |
|---|---|---|
| Remove organizer menu items from user app | Still a landing page with no user nav at all — worse than the problem | P0 |
| Home: event name + image + title + two cards + crew | Still shows ride home, coast watch, ask about festival, saved answers, Namib Rage | P0 |
| "Your crew" → heading + small avatars, tappable | "Your crew" is still an empty label at the bottom — no avatars, no action | P0 |
| Remove "Ask about the festival" | Still present — the largest block on the page | P0 |
| Remove "Read the saved answers" | Still present — a 25-line wall of text | P0 |
| Remove "Also from Namib Rage" | Still present | P1 |
| Map: search bar + filter chips (stages, bars, toilets, food, medic, gate, zones) | No map exists on the live app | P0 |
| Map: stage dropdown → glimpse info → other stages | Not built | P1 |
| Map: bar tap → what that bar sells | Not built | P1 |
| Ticket-tier zones (VIP yellow, platinum cyan, general pink, off-limits) | Not built | P1 |
| Crew: see what crew is doing, not editorial copy | Crew section is empty and has no activity | P0 |
| Profile: actually look like a profile | No profile screen | P1 |
| Overall: iOS feel, less reading | Still a web landing page with editorial typography and zero native chrome | P0 |

**The brutal read:** your voice note is a correct diagnosis. The live app is the disease. Nothing has changed.

---

## What's Missing (What the Voice Note Actually Asks For)

**1. A real home screen — not a flyer.**
- Event name: **Sound of Summer**
- One image of the event (One Coast Three Stage, pool jetty)
- Title line: **"Opens in 41 days"**
- Two cards only: **Your Night** and **Your Lineup**
- **Crew** heading with small tappable avatars
- **Nothing else.** No ride home. No coast watch. No ask. No saved answers. No Namib Rage.

**2. A map that is a map — not a text dump.**
- Search bar at top
- Filter chips: All · Stages · Bars · Toilets · Food · Medic · Gate · Zones
- Stage tap → bottom sheet with a glimpse of info
- Bar tap → what that specific bar is selling
- Food court tap → what's selling there
- **Ticket-tier overlay:** VIP yellow, platinum/cyan, general pink. Off-limits areas visibly locked with a one-line reason ("Your ticket doesn't include this zone").

**3. Ticket scanning at onboarding.**
- Scan the Howler ticket → app knows the tier → map colors the person and the zones.
- This is a genuinely differentiating feature and it solves a real festival problem (VIP confusion at gates). But it's a **P1**, not a P0 — do not block the core crew loop on it.

**4. Crew tracking + cross-path interaction.**
- Live crew pins on the map (already specced, not built).
- **Opt-in "discoverable at this event"** — only for this event, ghost mode by default.
- Cross-path interaction: a one-tap **"Hey, where are you?"** → the other person can **pin their location to you specifically** → you meet. **No chat. No profile browsing. One nudge, one pin, done.**
- This is the feature that makes the app feel alive *without* a network — but it is **P2** relative to the core crew loop. Build crew first, discovery second.

**5. A crew section that feels like a crew.**
- Not editorial copy. Not "backup plan." Not "low power mode."
- Just: **avatars, who's sharing, where they are, last seen, and a "Lost someone" button.**
- If it doesn't help you find your people, it doesn't belong in the crew area.

**6. A profile that looks like a profile.**
- Avatar, name, vibe, sharing state, active shares with timers, leave crew, delete data.
- iOS inset grouped list. No cards with paragraphs.

---

## What to Cut (Today, Not Later)

- **"Ask about the festival"** — delete the entire section. It's a chatbot bolted onto a flyer.
- **"Read the saved event answers"** — delete the 25-line text wall. If the info matters, it belongs in a Map > Info sheet or an FAQ, not the home page.
- **"Ride home" and "Coast watch"** — delete. Not core.
- **"Also from Namib Rage"** — delete from the user app. Organizer content does not belong here.
- **Organizer workspace, roles, transporting** — delete from the user menu. If you need an organizer view, it's a separate app or a hidden route.
- **"Backup plan," "Low power mode," "Save meeting plan"** — delete from the crew area. This is editorial filler, not product.
- **"Lineup · Map · Info" segmented control above the map** — if the user is on the Map tab, they're on the map. Don't put a segmented control that competes with the tab bar.
- **"Opens in 14 days / You are at the main stage"** — remove from the map header. The map should be a map, not a status dashboard.
- **Every paragraph longer than two lines** — delete or move behind a tap.

---

## The iOS Problem (This Is the Root Cause)

Your voice note says "doesn't feel like an iOS app," and the live app confirms it: it's a **web page with editorial typography**, not a native app. The fixes from the previous iOS skin spec have not been applied:

- No tab bar. No large-title nav bar. No inset grouped lists. No blur materials. No spring motion. Body text is not 17px. Tap highlight is probably still the default gray flash. Cards have editorial spacing, not iOS rhythm.

**If the visual foundation isn't iOS, no amount of content rearrangement will make it feel native.** Apply the iOS skin spec before adding a single new feature.

---

## The Rebuild Order (Non-Negotiable)

| # | What | Why |
|---|---|---|
| 1 | **Delete the clutter.** Remove everything listed in "What to Cut." | The app is drowning in text. One deletion pass buys more than ten features. |
| 2 | **Apply the iOS skin.** Tab bar, large-title nav, 17px body, inset lists, blur, springs. | The "doesn't feel iOS" problem is structural, not cosmetic. |
| 3 | **Rebuild Home:** event name + image + "Opens in 41 days" + two cards + Crew avatars. Nothing else. | This is the screen the user actually asked for. |
| 4 | **Rebuild Crew:** heading + avatars + sharing state + Lost Someone. Delete editorial copy. | The crew area must feel like a crew, not a magazine. |
| 5 | **Rebuild Map:** search bar + filter chips + stage/bar/food detail sheets. | A map without filters and detail is a picture, not a tool. |
| 6 | **Rebuild Profile:** inset grouped list, sharing state, delete data. | A profile that looks like a settings page, not a landing page. |
| 7 | **Ticket scan at onboarding** (P1). | Differentiator, but does not block the core loop. |
| 8 | **Cross-path discovery** (P2). | Only after crew tracking works. |

---

## The Ship Check (Would a stranger believe this is live?)

1. **Is the home page readable in under 5 seconds?** No — it's a wall of text.
2. **Is there a tab bar?** No.
3. **Can you see your crew's faces on the home screen?** No.
4. **Does the map exist?** No.
5. **Does the app feel like iOS?** No — it feels like a Notion page.

**Five noes. It's not shipped. It's the same demo.**

---

**The one sentence:** your voice note is the correct brief — delete the editorial clutter, rebuild Home as event + image + two cards + crew avatars, rebuild Map as search + filters + detail sheets, rebuild Crew as avatars + sharing + Lost Someone, apply the iOS skin before anything else — and the live app hasn't done any of it, so the next prompt is not "add a feature," it's **"delete everything that isn't one of the five screens above."**
