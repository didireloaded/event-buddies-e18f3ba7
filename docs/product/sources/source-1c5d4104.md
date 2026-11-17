# After the Event — The Part Everyone Forgets to Design

Brutal truth first: **the post-event experience is where most festival apps die, and nobody notices because everyone's watching the install numbers.** You'll see a spike at ticket purchase, a flood at gates-open, then a cliff the morning after. If you don't design that cliff, you lose the reinstall for next year — and the reinstall is your only real growth loop after the invite link.

But here's the other brutal truth: **most users *should* uninstall.** A festival app has no business living on someone's phone for 11 months. The goal is not "keep them installed" — it's **"be the obvious thing to reinstall next year, and be the thing they share the morning after."** Design for the exit, not against it.

---

## The Timeline (design each phase, not just "the recap")

```
T-0        last set ends
+0–6h      THE AFTERGLOW     — still at venue/campsite, leaving, saying goodbye
+1 day     THE RECAP DROP    — memories land, sharing happens
+3–7 days  THE FADE          — chat dies or becomes a group chat
+7 days    THE ARCHIVE       — read-only, export offered
+30 days   THE DORMANCY      — countdown to next event
Next year  THE REACTIVATION  — one notification, not five
```

---

## Phase 1 — The Afterglow (T-0 → +6h)

**The event ends at 02:00. Do not do anything clever at 02:00.** No "how was it?" modal while people are walking out of a field in the dark. The app should be *quieter* than during the event, not louder.

What actually matters in these hours:

- **"Leaving now" / "Walk with me"** still works — this is the highest-value safety window, and the app should keep serving it until the last person leaves.
- **The event hub flips to a soft banner, not a takeover:** *"That's a wrap. Recap lands tomorrow."* One line. No confetti, no modal.
- **Location sharing already expired** (60-min pins), so nothing to "turn off." If anyone still has an active share, auto-kill it at T+2h with a quiet toast: *"Location sharing ended — event over."*
- **Crew chat stays live** — people are still coordinating rides, lost items, "who has my jacket."

**Do not** send a push notification in this window. The one exception: if a crew member is still sharing a pin and the event has ended, one gentle nudge: *"Maya is still sharing her location. Stop?"* — but honestly, just auto-expire it and skip the notification.

---

## Phase 2 — The Recap Drop (+1 day, ~10:00 local)

This is the single most important post-event moment, and it has **one job: make the user share something.**

**Entry:** one push notification, once, never repeated:
> *"Your Sound of Summer recap is ready 🎪"*

**The Recap screen** (Event Hub becomes this, read-only):

```
┌─────────────────────────────┐
│  Sound of Summer 2026        │
│  3 days · 14 sets · 4 crew   │
├─────────────────────────────┤
│  SETS YOU SAW                │
│  Rüfüs · Main Stage · 23:00  │
│  [crew avatars who were there]│
│  ...                          │
├─────────────────────────────┤
│  YOUR CREW                   │
│  [avatar cluster] 4 people   │
│  92% same sets as Maya       │
├─────────────────────────────┤
│  PHOTOS (optional)           │
│  [drop photos into crew]     │
├─────────────────────────────┤
│  [ Share your crew card ]    │  ← THE GROWTH ARTIFACT
│  [ Save recap ]              │
└─────────────────────────────┘
```

**The "crew card" is the whole point.** A generated, shareable image — wristband-styled, your event, your crew avatars, your top sets, "Sound of Summer 2026." It exports to Stories/WhatsApp. **This is your one viral artifact per event.** Every share is an ad you didn't pay for, and the friend who sees it is *exactly* your next-year user.

**States:**
- **You went solo, no crew** → *"You did it solo. Respect."* + your sets. Never punish the solo user with an empty crew section.
- **Crew went but you left early** → still show their sets, honestly.
- **No photos uploaded** → skip the section entirely, don't show an empty box.
- **Offline** → recap is generated server-side and cached; must work on a train home.

---

## Phase 3 — The Fade (+3 → +7 days)

Here's the decision that separates a professional product from a naive one: **what happens to the crew chat?**

| Option | Verdict |
|---|---|
| Keep chat live forever | 🔴 **No.** You're now competing with WhatsApp with a worse chat, paying storage for dead threads, and your "festival app" has become a mediocre messenger. |
| Delete chat at +7 days | 🔴 **No.** People will lose photos and plans ("we said we'd do next year together") and they'll never trust you again. |
| **Archive read-only at +7 days, export offered** | ✅ **Yes.** |

**The archive spec:**
- At +7 days: chat becomes **read-only**. Composer replaced with a single line: *"This festival's over. Chat is archived but you can still read it."*
- **Export** button: *"Save chat & photos"* → downloads a file or emails a link. One tap.
- Crew members can still see each other's *profiles* (name, vibe) — **never live location, that's long dead.**
- Chat is deleted from your servers at **+30 days** — and **say so up front**, on the archive screen: *"Archived chats are deleted after 30 days. Export if you want to keep it."* That's a trust move, not a legal move.

**Why read-only beats both alternatives:** it honors the memory, it stops you from running a messenger, and the 30-day deletion is a privacy selling point you can put in marketing.

---

## Phase 4 — The Archive & Dormancy (+7 → +30 days → next year)

**Data lifecycle — be explicit, it's a feature:**

| Data | What happens | When |
|---|---|---|
| Live location / pins | Already expired (60 min) | continuous |
| Any residual location history | **Deleted** | T+24h, automatically |
| Chat | Read-only → **deleted** | +7 days → +30 days |
| Crew membership | Persists (name + avatars only) | until user leaves |
| Recap (sets, crew card) | Persists, user-owned | until user deletes |
| Photos | Only what user explicitly saved | until user deletes |

**Put this table on a "Your data after the event" screen**, reachable from the archive. *"We delete your location within 24 hours of the event ending. We delete archived chats after 30 days. Your recap stays until you delete it."* That's the kind of sentence that gets screenshotted and builds trust — and it's also your legal cover.

**Dormancy screen (what the app shows if opened in, say, March):**
> *"Sound of Summer was 4 months ago. Next up: [next event] — 87 days."*
> `[ See the lineup ]` (if announced) · `[ Leave a note for your crew ]` (optional, lightweight — one message to the archived crew, like a group postcard)

That optional "note" is a cheap re-engagement hook. Not a feed, not a chat — a single postcard to the crew, once. Keep it small or cut it.

**Notifications stop at +1 day, except:**
- Next event announced for the same festival → one push.
- Tickets on sale → one push.
- That's it. Two pushes per year is a *good* notification cadence for a seasonal app. Anything more and you're the spam app that gets muted, and muted = invisible at reactivation time.

---

## Phase 5 — The Reactivation (next year)

This is where your invite-link growth and crew card compound:

1. **Festival announces dates** → one push: *"Sound of Summer 2027 · 12–14 Nov. Your crew from last year is still here."* (Yes, really — the crew persists by name/avatars. That sentence is your entire retention playbook in one line.)
2. **User opens app** → Home shows *"Your event"* with the crew still attached, invite link ready.
3. **Ticket purchase** → deep link back in. The loop restarts with zero onboarding.

**The brutal metric to watch:** what % of last year's users open the app within 7 days of next year's announcement. If that number is above ~15–20%, you have a product. Below 5%, you have a novelty, and no amount of post-event design fixes it — the event itself wasn't good enough.

---

## Edge Cases (the ones that make it feel shipped)

| Scenario | Behaviour |
|---|---|
| User opens app *during* a set that hasn't ended | Normal — recap only triggers after **last set of last day**, not "event end date" |
| User never opens again until next year | Their data was already cleaned up; they land on Home with crew + next event. No "welcome back, here's 40 notifications." |
| Crew member leaves during the event | Their pinned location dies immediately, their chat messages stay (read-only), no ghost avatar |
| Event is cancelled mid-way | Recap screen becomes an honest notice + refund info if you have it; **don't** generate a "fun" recap for a cancelled event — that's tone-deaf |
| User deletes the app post-event | Server keeps recap 30 days (per data policy), crew membership 30 days; deletion is honest and documented — don't silently retain |
| Multiple events on one account | Recap is **per event**; a "festival shelf" view lists all recaps, each with its own crew card |

---

## What to Build vs Cut

**Build (in order):**
1. **Event-end state machine** — hub flips to "wrap" banner at T-0, no modal. (tiny, high impact)
2. **Auto-kill all location shares at T+2h.** (trust — non-negotiable)
3. **Recap screen + crew card export** (+1 day). **This is your growth engine.**
4. **Chat archive → read-only at +7 days with export.** (retention of memory, not of the user)
5. **"Your data after the event" screen with the deletion table.** (trust + legal)
6. **Dormancy screen + next-event countdown.**
7. **Two pushes per year, max.**

**Cut:**
- A post-event social feed ("what people are saying") — you're not building a network.
- "Rate the festival" surveys — nobody fills them, and it's not your job.
- Keeping chat live indefinitely.
- Recap photos that require uploading **during** the event (nobody will — ask after).
- Any notification more than 48h after the event ends, until next year's announcement.

---

## The One-Sentence Version

**At T-0, go quiet and kill every location share; at +1 day, drop a recap with a shareable crew card (your only viral artifact); at +7 days, archive the chat read-only with an export; at +30 days, delete what you said you'd delete and say it out loud; then go silent until next year's announcement — and let the crew that persists be the sentence that brings them back.**

The honest framing: **the event is the product, the recap is the ad, and the deletion policy is the trust.** Design all three or you'll build an app that's great for three days and invisible for 362.
