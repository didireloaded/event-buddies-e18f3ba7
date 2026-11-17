# Interactive Features for Event-Buddies

"Interactive" here means features where **something happens back** — a tap triggers a response, phones react, other people respond, the crowd moves. It's the difference between a schedule (view) and a game (play). I've grouped them by *who* you're interacting with, then added the **primitives** (the technical levers that make any of this possible), plus a **build sequence**.

---

## 👥 User ↔ User (real-time, personal)

**1. Live Pin Reactions** — Tap a friend's pin on the map → a wheel of emojis (👋😂🔥🍺💀💃) appears → tap one → that emoji pops on **their** screen for 2 seconds with a small haptic buzz. They can tap back instantly. Silent, playful, zero typing. This one interaction alone replaces a hundred "where r u" texts.

**2. Poke / Nudge** — Classic but with modern UX. A friend's pin gives you "nudge." Their phone does a distinct double-buzz pattern. You can nudge back. Streaks appear on the map ("Alex nudged you 6× tonight").

**3. Air Hug** — Long-press a friend's pin → their phone does a **warm two-pulse haptic** and a soft glow appears on their screen for a moment. No notification, no text. Their pin gives yours an "🤗 received." Pure feeling, zero noise.

**4. Haptic Compass** — You want to find Alex but can't look at your phone. Tap "find Alex." Your phone starts **buzzing with intensity proportional to closeness** and **pulses in the direction** of the bearing (different rhythms = ahead/left/right). You find them without looking. Feels like a superpower.

**5. Whisper** — Send a friend a message that doesn't appear as a notification — instead their phone gives a specific haptic, and if they open the app, they see your message overlaid on the map. For things you don't want in a chat log ("come outside, I have something").

**6. Two-Way Beacon (Proximity Game)** — Both phones pulse faster as you approach each other. Below 50m the pin turns red and haptics double. It's Marco Polo at scale. Works when GPS is fuzzy — bearing + haptic closes the last 20m.

**7. "Find Me" Request** — One tap sends a crew-wide request. Everyone's phone buzzes once. Whoever accepts gets a share link. Solves the "I'm lost" moment without spamming chat.

**8. Live Crew Status** — One tap on your own pin sets your status: *dancing / chilling / eating / escaping / at the bar / meeting someone*. Shows on every crew member's map as an icon. Updates in real-time. Endlessly useful, surprisingly fun ("Alex has been on 'escaping' for 40 minutes").

**9. "I'm Going Here" Intent Broadcast** — Tap a stage or POI → "I'm heading here in 5 min." Your pin animates along the walking path to that point, so your crew sees you *moving toward* something. They can tap "joining." The plan forms without a single message.

**10. Crew Pull** — You're at a boring stage. Tap "pull me out" → a subtle signal goes to the crew ("Alex wants rescue"). One friend can tap "on my way" → you get a haptic + their ETA. Works silently.

**11. Live Vote** — "Where next?" → options appear (Stage A / Bar / Chill zone / Home). Every crew member sees live tally bars with each person's avatar next to their vote. Auto-locks in 60 seconds. No more infinite back-and-forth.

**12. Haptic Wave** — Tap "wave" in crew chat → **every crew member's phone buzzes simultaneously** in the same pattern. Instant "we're all here" moment before a set starts.

**13. Photo Reaction Stream** — Someone drops a photo in the crew feed → everyone can tap-and-hold anywhere on the photo to react at that point (like a pin-drop reaction). Hearts and laughing faces accumulate on the spots people find funniest. FOMO photo dumping, solved.

**14. Ready-to-Go Signal** — Tap a button labeled "I'm leaving." Your pin turns green and pulses. Everyone in the crew sees it without a message. The unwritten law of "when we leave, we go together" finally has a UX.

**15. Silent Countdown Sync** — Crew sets a meeting time → all phones buzz in sync at T-15, T-5, T-0. No notifications visible if you're already looking. Feels like the app is a conductor.

**16. Typing Indicators (Chat + Reactions)** — When a crew member is composing a message or reacting to a pin, others see a subtle pulsing dot next to their name. Small but transforms the "is anyone alive" anxiety.

**17. Tap-to-Friend** — Two phones touch (NFC tap on Android, AirDrop-style gesture on iOS) → adds each other as friends instantly. Zero friction, physical, delightful.

**18. Screen Bump** — Both phones shake simultaneously at the same moment (accelerometer match) → friends confirmed. Silly, sticky, shareable.

**19. Reverse Nudge** — You tap your own pin ("nudge me") → the app buzzes your phone once every 5 minutes as a "check if you're ok" nudge if you're alone for a long time. Small mental-health feature that's also a quiet joke.

**20. Whisper Vote** — Ask a single friend "A or B?" in a whisper. Their pin shows two buttons (A / B). They tap one. You get a haptic + the answer overlaid on your map. Faster than typing. Zero chat noise.

---

## 🎉 User ↔ Crowd (collective, real-time)

**21. Live Emoji Rain** — Send an emoji to a stage → **the next 3 seconds of every phone watching that stage** shows it falling across the screen. Aggregate: "🔥 × 2,431 in the last minute." The crowd becomes a single organism. Huge at drops.

**22. Crowd Vibe Pulse** — Continuous one-tap send: 🔥 / 😴 / 🤯 / 🕺 / 💀. Aggregated into a live meter per stage, visible on the map. Everyone sees how the energy is doing. On the stage screen at bigger events.

**23. Encore Meter** — After a set ends, the crowd gets 90 seconds to tap "encore." Live counter visible to the artist and on the stage screen. Massive participation.

**24. Flash Meetup** — Announce a spontaneous meetup ("Drumcode tent, 5 min, everyone"). Live counter of who's going. Everyone's map routes them there. Turns the crowd into a flash mob.

**25. Live Polls on Stage** — Artist/organiser pushes a poll: "Which track next?" / "Should I play it?" Live tally on the stage screen + every phone. Crowd votes in real-time. Huge.

**26. Cheer Counter** — During a set, tap the fire button as many times as you want (rate-limited). Aggregate cheer level rises in real-time and appears on the stage screen as a glowing bar. Physical participation, zero cognitive load.

**27. Crowd-Sourced Stage Heat** — Walk into a tent → app auto-detects you're near a stage → "Are you at Stage A?" Yes/No. Confirms crowd size in real-time. Feeds the heat map, and each tap makes the map better for everyone. Reciprocal.

**28. Queue Reporter** — One-tap buttons for the nearest bar/bathroom: "empty / short / long / insane." Live aggregate. Immediate payoff (you see the current queue before walking over). Zero cost to tap.

**29. Live Prediction** — "Will Anyma open with *Consciousness*?" → everyone votes. Real-time tally visible to all voters. After the set, correct voters get a badge. Turns passive anticipation into a shared game.

**30. Split Reaction** — Same as emoji rain but harder: after a set ends, everyone picks 💚 or 💔. Live split shows as a bar. Screenshot-bait.

**31. Cheer Wall** — Quick text punchline appears on the stage screen for 3 seconds if enough people upvote it. Live, moderated, hilarious.

**32. Crowd DJ** — Artist enables it for a slot. Next-track candidates appear on every phone with 30s previews. Vote live. The winning track plays next. Crowd-as-DJ, unrepeatable moment.

---

## 🎤 User ↔ Artist

**33. Live Q&A** — Artist opens a thread → questions upvote → artist answers top ones in real-time. Questions appear on stage screen if the artist allows it. Feels intimate at massive scale.

**34. Song Requests** — Live vote on upcoming tracks. Aggregated across all phones at the stage. Artist sees the tally on their phone and can play to it. Shared agency in the set.

**35. Artist Voice Drop** — Artist records 15s of voice → fans get a push with the audio. They can reply with a 15s voice note (opt-in, moderated). Two-way, human, warm.

**36. "Are You At My Set" Check-in** — When the artist goes live, everyone with the set scheduled gets a live counter of "who's here with me right now" on their map. Shared presence, shared moment.

**37. Fan Selfie Wall** — Opt-in: fans post selfies → aggregated into a live mosaic on the stage screen. "We're all here together." Consensual, moderated, joyful.

**38. After-Set Meetup** — Artist pins a spot + time. Everyone at the set sees a "catch me after" prompt with a route. Turns fans into a flash meetup.

**39. Live Setlist Tagging** — Crowd taps to tag tracks in real-time as they're played. Auto-generates a setlist at the end that fans can save to Spotify.

**40. Two-Way Shoutout** — Artist can push a message to everyone who has them followed and their scheduled set. Fans can reply with emoji (which appear briefly on the artist's screen). Reciprocal without becoming a message inbox.

---

## 🎪 User ↔ Organiser

**41. Live Help Request** — "I need help" → options (medical, lost, harassment, general) → creates an incident with location → someone on the ground gets assigned → live two-way thread with status updates. Bypasses phone queues, handles crowds.

**42. Map Pin Reports** — Tap-and-hold anywhere on the map → report an issue (spill, broken gate, crowd pinch point, missing sign). Photo attached. Organiser sees an aggregated, geo-pinned queue. Real-time triage view. Users see "issue reported, 4 other reports nearby" as confirmation.

**43. Suggestion Box + Live Votes** — Submit a suggestion ("more water refill at stage 3") → other attendees upvote → organiser sees the top suggestions in real-time. Live vote counters keep everyone engaged.

**44. Live Lost & Found** — Report lost/found with photo + last-known location → real-time matching (photo similarity + proximity + time). Notifications when a match is found. Two-way thread with anonymous or identified options.

**45. FAQ Direct** — Type a question → AI answers from the event FAQ → if unresolved, "escalate to a human" → real two-way thread with an organiser. Users get answers in seconds, organisers stop answering the same 20 questions.

**46. Feedback Per Stage** — After a set, one-tap "was this good?" → aggregates by stage and set. Organisers see per-set sentiment in real-time. Artists see it after.

**47. Live Crowd Flow Report** — Users tap "it's crowded here" → server aggregates per area. Organisers see heat spikes and re-route foot traffic. Users see a "current flow" layer that keeps them safe.

**48. Two-Way Announcements** — Organiser broadcast → attendees can react (👍 / 👀 / ❤️) → aggregate reaction count visible to the organiser. Organisers finally know if anyone *read* their announcement.

**49. Live Attendance Dial** — Organisers see a live counter ("34,127 in the app right now, 11,204 at Main Stage"). Every tap by every attendee updates it in near-real-time. Turns the crowd into a live dial the organiser can read.

---

## 🌍 User ↔ Environment (physical + AR)

**50. AR Scavenger Hunt** — Organiser (or brands) hides virtual items at specific map points. Attendees walk to a location, open AR view, and "collect" by pointing their camera. Auto-completes quests. Turns walking around into a game. Massive at sponsored events.

**51. Geocache Beacon** — Someone drops a hidden virtual flag at a random spot. Others can only see it when within 30m. Whoever finds it first "wins the flag" (or takes it to a new location). Interactive in every direction.

**52. AR Photo Frame** — At a specific spot, an AR frame appears in the camera view (branded, event-themed). Pose, tap, photo goes into your Wrapped. Zero work, all delight. Ends up on Instagram.

**53. Shake to Reveal** — Shake your phone at a mystery spot (indicated on the map) → an easter egg or a secret track plays or a new stage unlocks. Physical interaction the phone knows how to detect.

**54. Clap to Unlock** — At a hidden location, the app listens for a clap (or a scream, or a beat) → unlocks something. Massive at drops. Huge TikTok moment ("I clapped at the right spot and the stage lit up on my map").

**55. Beacon Proximity Unlocks** — Bluetooth beacons placed at stages, bars, or sponsor zones. When you're within 10m, a badge or reward unlocks. Silent — you don't know it happened until your phone buzzes.

**56. QR Treasure Hunt** — QR stickers hidden around the festival. Scan → unlocks a badge, a discount, a secret. Encourages walking, discovering new zones. Easy to build, hugely interactive.

**57. Motion-Powered Mini-Games** — At quiet moments: tap timing games, shake counters, "jump as high as you can," "spin the phone." Small, dumb, delightful. Add a leaderboard per crew.

**58. Light Painting** — Point your camera at a stage during a specific track → the app captures the ambient light → turns into a color and adds a dot to the festival's collective "light painting" in real-time. Looks astonishing post-event.

**59. Sound Signature** — Record 3 seconds at a set → the app fingerprints it → "you're hearing *[track]* by *[artist]*." Live Shazam for the crowd. Shared to crew in one tap.

---

## 🧑‍🤝‍🧑 Crew-as-a-unit interactions

**60. Crew Cheer** — One tap from the crew leader → **every phone in the crew buzzes simultaneously**, regardless of phone state. Used for "assemble," "one more song," "sunrise is coming." Feels like a ritual.

**61. Group Reaction Moment** — At a pre-arranged moment (or spontaneously), everyone in the crew taps "cheer." All phones buzz together. Post-event, you get a memory of "the time your crew cheered 30 times in one night."

**62. Crew Trips (Live Itinerary)** — Plan a "trip" (next 3 hours). Every crew member edits in real-time, sees updates as they happen. When it's time to move, everyone gets the cue. Group planning without a group chat.

**63. Silent Assembly** — Leader taps "assemble at *location*." Every crew phone buzzes once, but no message appears on screen. All pins route there. Everyone arrives without a single text being read.

**64. Group Timer** — "In 10 minutes we leave." Countdown on every crew member's phone. At T-0, everyone gets a haptic + green pulse on their pin. One decision, no nagging.

**65. Live Photo Challenge** — Crew leader drops a prompt ("best photo of a stranger in a bucket hat") → everyone in the crew can submit → crew votes → winner gets a badge. Keeps the crew engaged between sets.

**66. Split-Screen Compare** — Two crew members' schedules side-by-side. Real-time. Overlaps green, conflicts yellow, "you two will only see each other 2 times" red. Tap a set → "let's both go" → auto-adds to both. Silent coordination.

**67. Join-Me on Map** — Tap a crew member's pin → "join them" → a route appears on your map that updates in real-time as they move. You become a live pursuit. Great for "I'm 3 minutes behind you."

**68. Crew Battle (Leaderboards)** — Two crews in the same event → live leaderboard across a set of challenges (most sets seen, most distances walked, most photos). Updates in real-time. Silly but wildly sticky.

---

## 🎮 Gamified interaction layers

**69. Bingo Card (interactive)** — A live card of tasks per day. Complete by tapping ("I got asked to hold a drink," "I saw a sunrise set," "I met a stranger"). Live completion % per crew. First to Bingo wins a badge. The single most interactive organiser tool you can ship — it turns the whole festival into one big scavenger hunt.

**70. Photo Missions** — The app assigns a random mission ("photo of a stranger's tattoo," "sunset silhouette," "someone crying at a set"). Complete by uploading. Crew votes. New mission every 2 hours. Constantly generates shareable moments.

**71. Daily Challenges** — "See 3 stages," "meet someone new," "dance to a genre you don't know." Auto-detected from location + schedule + interactions. Streaks. Badges on your pin.

**72. Live Trivia at Stages** — During breaks between sets, a 30-second trivia round on the stage screen + your phone. Fastest tap wins. Whole crowd plays. Ends with a winner's name on screen. Addictive.

**73. Prediction Game** — Predict the next track (from a shortlist), the encore track, the surprise guest. Real-time scoring across the crowd. Leaderboard. Post-event prizes.

**74. Hidden Stage Unlock** — Complete N interactions (5 bingo squares, 10 emoji sends, 3 photo missions) → unlocks the location of a hidden stage or secret show. Addictive progression loop that ties every other feature together.

**75. Streaks** — Daily interactions build streaks. Streak milestones unlock emoji packs, pin styles, badge animations. Low-cost, high-retention.

**76. Achievements** — Badges that live on your pin and in your Wrapped: *"Sunrise Survivor," "Crowd DJ Winner," "First to 100 cheers," "Found a hidden stage."* Badges are visible in the crew and on the map. Social proof at a glance.

---

## 🧩 The interaction primitives (build these once, use everywhere)

These aren't features — they're **building blocks** that make every feature above 10× cheaper to build:

| Primitive | What it enables | Tech |
|---|---|---|
| **`sendHaptic(userId, pattern, priority)`** | Air Hug, Crew Cheer, Compass, Poke | Web Vibration API + native haptics via Capacitor |
| **`broadcast(channel, event)`** | Emoji rain, crowd vote, live polls | Redis pub/sub + SSE/WS |
| **`streamMyLocation(userId, audience)`** | Friend Radar, two-way beacon, walkie-talkie | SSE + Redis per-user channels |
| **`tapToReact(targetType, targetId, emoji)`** | Pin reactions, photo reactions, cheer counters | `reactions` table + broadcast |
| **`requestReply(userIds, prompt, options)`** | Silent Vote, Whisper Vote, pull-me-out | `prompts` table + push + SSE reply stream |
| **`routeTo(userId, targetLatLng)`** | Join-me, rendezvous, meet-here, flash meetup | Client-side maps + `walking-path` cache |
| **`startGame(gameId, params)`** | Bingo, trivia, prediction, polls | `games` table + real-time state stream |
| **`unlock(userId, unlockId)`** | Beacon, AR, QR, hidden stage | `unlocks` table + client gates |
| **`cooldown(userId, actionId, seconds)`** | Prevents spam on every tap-to-send | Redis sliding window |
| **`aggregate(counterId, windowSeconds)`** | Live counters, heat maps, splits | Redis sorted sets + periodic SSE snapshot |

Ship the primitives, and the 76 features above become **a weekend each** instead of a sprint each.

---

## ⚙️ UX/behavior rules that make interactivity feel *good* (not annoying)

- **Silent by default.** Interactions should feel like a touch on the shoulder, not a Telegram message. Push notifications only for (a) emergency, (b) friend request, (c) meeting-point call. Everything else is a haptic or a live overlay.
- **Cooldowns everywhere.** Rate-limit the fun stuff or it becomes spam. 1 poke per 30s, 1 emoji per 10s, 1 cheer per 3s. Aggregation hides spammers from view.
- **Bilateral consent for the "social" actions.** Air Hug, compliment, "find me" — all opt-in on the receiving side. Anyone can go invisible without losing their pin.
- **One-tap, zero typing.** Every interaction above must be reachable in ≤2 taps from the map. Anything that requires typing loses 80% of use.
- **Reversibility.** Every tap-to-send action is undoable for 5 seconds. Reduces accidental sends, raises trust.
- **Aggregation visible to the sender.** "Your cheer helped push Main Stage to 🔥🔥🔥" — rewards participation.
- **Degrade gracefully.** Offline queuing for all interactions; when connectivity returns, the batch fires once. Interactions must *never* fail silently. Show a tiny "queued" pill.

---

## 🚀 Build sequence (interactive layer)

**Phase 1 — Ship the "small magic" (2 weeks)**
- Haptic primitives (`sendHaptic`, patterns library)
- Air Hug, Poke, Wave
- Live Pin Reactions
- Crew Cheer
- Silent Vote / Whisper Vote
- One-tap live status

**Phase 2 — Collective moments (2 weeks)**
- Emoji Rain
- Crowd Vibe Meter
- Cheer Counter
- Live Polls on Stage
- Encore Meter
- Live Crew Vote

**Phase 3 — Spatial interactions (2 weeks)**
- Two-Way Beacon
- Haptic Compass
- Intent Broadcast + Join-Me
- Rendezvous Countdown with sync buzz
- Photo Pin Drop + Photo Reaction Stream

**Phase 4 — Game layer (3 weeks)**
- Bingo Card
- Photo Missions
- Live Trivia
- Prediction Game
- Hidden Stage Unlock
- Achievements + streaks

**Phase 5 — Physical layer (3–4 weeks, hardware needed)**
- AR Scavenger Hunt
- Beacon Proximity Unlocks
- QR Treasure Hunt
- Shake / Clap to Unlock
- Sound Signature

**Phase 6 — Artist & organiser interactivity (3 weeks)**
- Live Q&A, Song Requests, Voice Drops
- Fan Selfie Wall
- Two-way announcements with reactions
- Live help request + map pin reports

---

## 🎯 The single most important interaction to ship first

**Live Pin Reactions + Haptic Compass.** Not because they're the flashiest, but because they replace the two most common festival behaviours — *"where are you?"* and *"did you see that?"* — with a gesture that's faster, quieter, and more fun than any message ever was. Everything else in the list becomes easier to sell once these are real, because the app has already proven that interactions here are *worth doing*.

If you want, I can now write the **interaction engine code** — the `sendHaptic`, `broadcast`, `tapToReact`, and `cooldown` primitives + a `ReactionsProvider` client context so any component can fire any interaction in one line.
