Now we're talking. Everything below is a *delight* feature — the things that get screenshotted, shared on TikTok, and talked about on the dance floor. Grouped by category, with the "why it works" and a rough build shape for each.

---

## 🌟 The 5 signature features (build these first — they define the app)

### 1. Festival Wrapped
Your year in sets. A shareable recap of the whole event: artists seen, stages visited, friends crossed paths with, total distance walked, most emotional moment, your "music personality," your crew's lineup. Auto-generated as a scrollable video + shareable square cards.

- **Why it works:** Spotify Wrapped is the single most-shared app artifact on the internet. Nobody in event tech has nailed it yet — the post-festival gap is the highest-emotion, lowest-competition window.
- **Build:** A `wrapped` job that runs 24h after the event ends, pulls all `eventAccess`, `userScheduleItems`, `locationShares` history, `performances`, and generates a JSON "story" of screens. Render client-side with a Framer Motion story player. Export as image cards via `satori` or `next/og`. Auto-post to crew chat.
- **Viral loop:** Each card has a "made with Event Buddies" sticker + a link back to the event. Free acquisition, forever.

### 2. Friend Radar (proximity game)
When you open the crew map, friends aren't just dots — they emit a **heat signal** that gets brighter as you get closer. At under 50m, your phone **haptically taps** in a rhythm that speeds up the closer you are. Imagine Marco Polo at 100,000 people.

- **Why it works:** It's the single most fun way to use location data. Genuinely useful *and* playful. Massive TikTok potential ("I found my friend in a crowd of 60,000 using haptics").
- **Build:** Client computes distance from SSE stream; use `navigator.vibrate` or native haptics with pattern frequency = `1 / distance`. Map dot uses radial gradient + `requestAnimationFrame` pulse. Optional Web Bluetooth beacon for sub-10m accuracy inside tents.

### 3. Set Roulette
You're bored. Tap "surprise me." The app spins a wheel of every set happening in the next 30 minutes **you haven't scheduled**, weighted by your music taste, friend attendance, and walking distance. Land on one, and it auto-adds to your schedule + notifies your crew. "Three of your friends are going to this."

- **Why it works:** Decision paralysis is real at festivals, and the wheel is inherently delightful. It also creates serendipity — the entire point of a festival.
- **Build:** Server endpoint `/api/schedule/roulette?eventId=` returns weighted random pick using `userScheduleItems`, `friendships`, and artist genres. Client renders with a CSS wheel + physics-based deceleration. Add "re-roll once per hour" for scarcity.

### 4. Lineup Blind Date
The app picks an artist you've never heard of, plays a 30-second preview, and you have one tap to commit: **"I'm going."** It adds to your schedule and tells you who else from your crew got matched to the same blind date. Post-event: "you blind-dated 4 artists and loved 3."

- **Why it works:** Discovery is the soul of festival culture. This gamifies it. It's how people find their new favorite artist and make new crew memories.
- **Build:** `/api/artists/:id/preview` proxies Spotify's 30s preview. "Blind" = filters out artists in your history (top-genre match but no plays). Commit action = schedule add + crew notification + post-event review prompt.

### 5. Photo Pin Drop
Every photo you take, you can drop **on the map** at the exact spot. Your crew (or everyone, if you make it public) sees it pinned to that stage, that bar, that sunset spot. At the end, the app generates a **walking path** through your festival with every photo along the way.

- **Why it works:** Instagram killed location context. This is the anti-feed — memories anchored to places. Hugely shareable ("scroll my festival path").
- **Build:** `photos` table with `(userId, eventId, lat, lng, s3Key, at, crewId?)`. Presigned uploads to R2. Client uses `navigator.geolocation`. Map layer toggles photos on/off. Wrapped generates the path video via `remotion` or client-side `canvas`.

---

## 🎉 Social & viral

**6. Crowd Vibe Meter** — One-tap emoji vote (🔥🤯😴💀👽) per stage. Live heatmap shows where the energy is *right now*. "Main Stage at 🔥🔥🔥, Stage B is dead." Organisers see it in the dashboard, attendees see it on the map. Turns 60,000 people into a real-time vibe sensor.

**7. Music Compatibility** — "You and Alex are **87% compatible**." Computed from followed artists, scheduled sets, and listening history if Spotify connected. Sidebar shows your top-matching friends. Silent killer for crew dynamics.

**8. Festival Twin** — Find the stranger (or friend) with the highest music compatibility. "You matched 96% with @maracrush — say hi at the Drumcode tent." Optional one-tap introduction through the app (both must consent).

**9. Crew Leaderboard** — Post-event friendly competition: most sets seen, most stages visited, most friends found first, longest streak of consecutive sets, most ambitious walking path. Badges at every tier. Optional weekly leaderboard *during* the festival ("Alex is up 3 sets, catch up").

**10. Crew Roast** — AI (Claude/GPT) generates a friendly, roasting recap of each crew member's festival choices. "Alex saw the same DJ 4 times. Alex, blink twice if you're ok." Sharable. Hilarious. High virality.

**11. Anonymous Compliment** — Walk within 20m of someone and the app offers: "send a compliment." They get it anonymously, you get a warm fuzzy. Rate-limited, moderated. Wholesome-viral.

**12. Konami code on the schedule** — ↑↑↓↓←→←→BA reveals a hidden easter-egg stage that only appears to people who try. Bands love this kind of thing.

---

## 🎵 Music & personality

**13. Clash Resolver** — When you have two sets at once, instead of just warning you, the app says: **"You like Anyma 12% more than Fisher based on your listening. And 4 of your crew are going to Anyma."** Suggests a split ("Anyma first half, Fisher second half") with a map path showing the walk time between.

**14. Schedule Personality** — After 5+ sets added, the app assigns your festival archetype: *Main Stage Chaser, Crate Digger, Techno Purist, Sidequest Specialist, Rain Dancer.* Shows as a badge on your pin. Flipping hilarious in crew chat.

**15. "Who's Most Excited"** — For each upcoming set, live counter of attendees who have it scheduled + a "🔥 excited" button that adds to the energy score. Artist merch team *loves* this data.

**16. Preview Battle** — 30-second previews of two artists side by side. Tap the one you like more. Trains recommendations *and* builds anticipation. Duolingo for taste.

**17. Soundtrack of My Festival** — Post-event playlist: every artist you saw, plus the 3 most-played tracks from their set. Exports to Spotify/Apple Music. "Here's your summer 2025."

**18. Live Captions for Announcements** — Organiser drops an announcement → it plays as TTS through your headphones if you have them on. Accessibility + magic for people in loud areas.

---

## 🗺️ Map games & spatial fun

**19. Ghost Mode (the fun version)** — Go off the map for 30 minutes. Your crew gets a **clue every 5 minutes**: "she's near a bar," "she's within 100m of a stage," "she's moving fast." A playful hide-and-seek that keeps location sharing opt-in and delightful.

**20. Beacon Mode** — You're lost in a crowd. Tap "I'm the flag." Your dot becomes a giant pulsing beacon visible to your crew and a 300m radius of *anyone* running the app, but only your crew sees your name. Turns "where are you" into a fun treasure hunt.

**21. Rendezvous Countdown** — Set a meeting point. Everyone in the crew gets a live countdown, an ETA from their current position, and a "leave now" nudge when it's time. Walking path drawn on everyone's map simultaneously. Solves the single biggest crew frustration at festivals.

**22. Stage Radar** — Your phone buzzes gently when you're within 80m of a stage playing an artist on your schedule. Live haptic nudge. "Psst — Anyma is 3 minutes in, 200m away." Ends the "wait which stage is this" moment.

**23. Bathroom & Bar Queue Tracker** — Crowdsourced wait times. "Leftmost bar: 4 min. Main bathroom: 12 min." One tap to report, live aggregate. Stupidly useful, impossible to stop using.

**24. Lost & Found Wall** — Report a lost item or a found one, with photo + geotag. Crew and event-level visibility. "I lost my left AirPod near the food truck." Way better than a WhatsApp group.

**25. Photo Walk** — See your entire festival path traced on the map, with every photo pinned along it. Post-event, get a shareable video of the journey.

---

## 👯 Crew chaos

**26. Walkie-Talkie Mode** — Push-to-talk **voice messages** to your crew, delivered near-instantly (WebRTC / MQTT). Cheaper than data-dependent calls, works on 2G. Genuinely useful, feels cool.

**27. Panic Pin** — You're separated and overwhelmed. One tap: your location pins to a crew-wide alert with a "I'm here, come find me" message. Shows as a glowing pulsing pin on everyone's map until someone taps "on my way."

**28. Split-Screen Schedule** — Compare your schedule with a friend's side-by-side. Overlaps highlighted in green, conflicts in yellow, "you two will only see each other 2 times" in red. Silent killer for "should I go with you?"

**29. Group Photo Dump** — Everyone uploads their photos to a shared crew album. Auto-grouped by time and location ("Main Stage, 11pm — 42 photos"). Generates a highlight reel. The group album everyone always *intends* to make but never does.

**30. Mystery Crew Member** — Organiser (or a friend) secretly adds someone to the crew with a masked identity. Revealed at a preset time or when someone guesses correctly. Silly, social, sticky.

**31. Afterparty Roulette** — 2am, you're not done. The app shows what's still going on: afterparties, silent discos, chill tents, late food trucks. One tap to see who's still up.

---

## 🎪 Organiser circus (crowd-pleasers that make organisers love you)

**32. Crowd DJ** — For a designated stage/slot, attendees vote on the next track from a curated list. The winning track plays next. The crowd becomes the DJ. Huge engagement, huge press.

**33. Secret Show Reveal** — A hidden set is announced to *only* people who opened the app in the last hour, at a specific stage in 10 minutes. FOMO at industrial scale. Draws app opens, drives foot traffic, gets shared.

**34. Artist Voice Drop** — Artist records a 15-second voice note: "come see me in 20, I'm playing the track you asked for." Pushed to everyone who's followed them. Feels intimate and rare.

**35. Wave Count** — For any stage, a live counter of how many people are "waving." Lights up the map. Organisers use it as crowd sentiment.

**36. Encore Meter** — After a set ends, a live meter: 🔥 "encore" votes per second. The stage team sees it on a big screen. The crowd *loves* participating in "should they play one more?"

**37. Sync Lights** — For festival-branded sets, the app turns the audience's phone flashlights into a synchronized wave in rhythm with the music. Runs off audio detection (Microphone API) — no server sync needed. Looks absolutely magical.

**38. Bingo Card** — Organiser creates a bingo card for the day ("took a photo with a stranger," "saw a sunrise set," "got asked to hold a drink"). Attendees fill squares, tap to claim. First to bingo wins merch. Massive replay loop, huge crew energy.

**39. Lineup Reveal Animation** — Instead of a static image, the lineup drops as a scrollable, animated, sound-designed experience in the app. Artists reveal one by one with 3-second previews. One of the highest-retweet moments of festival season.

**40. Photo Booth** — Open the app, tap "photo booth," get a branded filter frame in the event's visual identity. Save, share, done. Organisers get UGC. You get fun photos. Win-win.

---

## 🧪 Wildcards

**41. Pick-a-Stage Coin Flip** — Can't decide between two stages? Tap. A coin flips in AR over your camera. Done. Emotional commitment achieved.

**42. Air Hugs** — Long-press a friend's pin → send a haptic *hug* to their phone. Their phone does a warm two-pulse pattern. No notification, no text, just feeling. Silent and lovely.

**43. Emotional Pins** — Walk past a moment and tap "🌅 this was a moment." Your map gets hearts where you felt something. Wrapped replays them with audio.

**44. Voice Diary** — One tap, 20 seconds of talking. Auto-transcribed, auto-tagged to your current stage. Becomes the voiceover track of your Wrapped.

**45. Sunset Alert** — The app knows where the sun sets relative to your festival layout. It pings you: "sunset in 8 minutes, best view from the hill to your left." Tiny, magical, impossible to not screenshot.

**46. Rain Radar Overlay** — Live weather radar on the map, with a "you have 12 minutes until rain — nearest covered stage is 200m left." Utility that becomes a story.

**47. Find My Phone** — One-tap "call my phone" for a crew member whose phone is lost nearby (plays a loud noise through their app if it's open). Silly-fun, actually useful.

**48. Photo Frame Generator** — Post-event, generate a custom festival "you were here" frame with your name, crew, and lineup art. Shareable image in one tap.

**49. Time Capsule** — One tap to record a short message to yourself, delivered as a push notification one year later. "One year ago you were at Anyma. Here's what you said." Unreal retention.

**50. Leave-Now Nudge** — Far stage, 15 minutes to go. The app tells you: **"leave now and you'll catch the opener; leave in 5 and you'll miss it."** Turns the map into a personal timekeeper. Feels like the app *knows* you.

---

## 🎁 Easter eggs (small but disproportionate joy)

- **Long-press the logo** → a random motivational quote from a famous musician.
- **Shake the schedule** → it shuffles into a "chaos schedule" that rearranges your day.
- **Tap the map compass 3×** → compass flips upside down for 5 seconds. Toddlers love it. Adults screenshot it.
- **First-time user typing "help" in search** → a paper-plane animation flies across the screen offering support.
- **Any time someone types "bathroom" or "toilet"** → an emoji rain animation for 200ms. Micro-fun that gets shared.
- **On festival anniversary** → your phone softly vibrates once at 11:11am, no notification. "We're still thinking about last year."
- **Hidden "Konami" stage** in the schedule (see #12).

---

## 📈 Viral mechanics to bake into all of the above

- **Every shareable card** carries a tiny branded edge ("Event Buddies · [Event Name] 2025") + a deep link back to the app.
- **Invites to join a crew** are mini landing pages with a photo of the crew, the event, and "Alex invited you." Auto-accepted after install.
- **Post-event recap** auto-posts a link into your crew chat and asks "share to Instagram Story?" pre-filled.
- **Referral badges** — invite 3 friends to a crew, get a "Crew Founder" badge and a custom emoji on your pin.
- **Snapchat/TikTok-style share sheets** — any moment, any card, one tap to share with an auto-generated caption.

---

## 🚀 If you're building in priority order

| Wave | Build | Effort | Payoff |
|---|---|---|---|
| **1** | Friend Radar + Photo Pin Drop + Rendezvous Countdown | M | Daily use, viral moments |
| **2** | Festival Wrapped + Set Roulette + Crew Leaderboard | M | Post-event virality, retention |
| **3** | Crowd Vibe Meter + Lineup Blind Date + Music Compatibility | M | Social discovery |
| **4** | Organiser Crowd DJ + Secret Show Reveal + Bingo | M | Press, organiser love |
| **5** | Ghost Mode + Air Hugs + Sunset Alert + Beacon | S | Delight, shareable |
| **6** | Wrapped video + walkie-talkie + voice diary | L | Signature features |

The core insight: **the standard event app is a utility** (schedule, map, notifications). The app people *love* is a **social game with a memory attached**. Everything above is one of those two things. Ship the game first, the memory second, and you own the post-festival window that nobody else has claimed.