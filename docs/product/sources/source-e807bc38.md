# 1. What I'd Still Add

Add these in this order — each one exists to make the app **useful with zero friends on it**, because that's your real cold-start problem.

**Utility that works alone (this is your survival layer):**
- **Offline schedule + map.** Festival signal is trash. A cached lineup and a static venue map with stage markers makes the app worth opening even if nobody else has it. This is the single most underrated feature in festival apps.
- **"I'm here" one-tap pin.** Drop your location at a stage with one thumb press, no typing. Battery-friendly, works on bad signal, and doubles as the meeting-point primitive.
- **Battery-saver location mode.** Festival phones die at 60%. Any app that visibly drains battery gets deleted on day one.
- **Pinned meetup with countdown + ETA.** *"Ferris wheel · 12 min · 400m"* — the emotional core. Reunion anticipation.

**Social layer (only after the above):**
- **Crew invite links** that work over WhatsApp/iMessage. You do not have a network — borrow theirs.
- **Set-time overlap** (*"You and Maya are both at Main Stage, 23:00"*) — taste as the matchmaking signal, not endless profiles.
- **Group chat with a pinned meetup** — not a WhatsApp clone, a *coordination* thread. Pin location, ETA, "who's in."
- **"Walk with me" at night.** Solo attendees (especially women) will not walk dark festival grounds alone. This is the feature that gets you word-of-mouth.

**Trust layer (non-negotiable, but invisible):**
- **Opt-in, expiring location sharing** (auto-off after X hours). Never always-on.
- **Report / block / leave crew.** One-tap exit from any group. No friction, no explanation required.
- **"Who can find me" toggle** front and center on the profile.

**Retention layer:**
- **Post-festival recap** — photos, sets you saw, people you met. The app must not die when the gates close, or you lose the reinstall.
- **Useful notifications only:** *"Maya just arrived at Main Stage."* Three a day max. Never "come back and chat!"

**Skip for now:** friends-of-friends, crowd-density heatmaps, ticket wallet integration, gamification. They're fun and they don't fix the cold start.

---

# 2. What's Missing

**The product, basically.** Concretely:

- **A reason to open it before the festival.** Right now it's an event flyer. There's no "who else is going," no lineup planning, no crew forming. Zero pre-event value = zero downloads before the day.
- **Identity.** No profile, no vibe, no artists. You can't match people you can't describe.
- **Discovery / matchmaking.** The entire promise in the name is absent.
- **Messaging.** The #1 festival text is "where are you?" You don't answer it.
- **A map.** It's literally in your URL. It's not in your app.
- **Consent model.** No privacy story = no trust = no install for a location app.
- **Session / persistence.** Browser-local storage means clearing cache nukes your crew. That's a data-loss bug wearing a demo badge.
- **Onboarding.** No value prop, no vibe picker, no first-run path. The user lands on a poster and has to guess.
- **Empty and error states.** Blank "Your crew" is the whole app's emotional state right now.
- **Notifications.** None. So nothing ever brings anyone back.
- **Moderation.** A social app with no report/block is a liability you can't ship.
- **The "after."** No retention loop post-festival.

**And the strategic thing that's missing:** you haven't picked a lane. Is this *"don't lose your friends"* (utility, Find My competitor) or *"don't be alone"* (social, meet-people app)? Those are different products with different onboarding, different privacy postures, different retention. Right now it reads as neither.

---

# 3. What Would Make Users Uninstall

Brutal list, roughly in order of likelihood:

1. **Nobody else is on it.** A social app with an empty network is deleted in 90 seconds. This is your #1 killer and it's not a design problem, it's a cold-start problem.
2. **The location permission prompt on first launch.** Ask before you've delivered value and you get denied — then deleted.
3. **It's worse than the WhatsApp group chat they already have.** If your chat isn't *better at coordination* (pinned meetup, ETA, map), they'll coordinate in WhatsApp and open your app zero times.
4. **It doesn't work offline.** One "can't load" screen at a festival with 40k people on the same tower and it's gone forever.
5. **Battery drain.** Location + polling + animations = dead phone = rage delete.
6. **Notification spam** — or worse, **no notifications**, so they forget it exists and delete it in the spring cleaning.
7. **Creepiness.** If a user feels broadcast to strangers, or can't tell who can see them, they delete and tell three friends.
8. **Requires an account before value.** Any signup wall before the first "aha" is a churn tax.
9. **One failed meetup.** A pin that's 200m off, an ETA that's wrong, a chat that didn't deliver — in a crowded field at 1am, one failure is the end. Reliability *is* the feature.
10. **The "Demo companion" footer.** It tells users "this isn't real, don't invest." That's an uninstall prompt you wrote yourself.
11. **The festival ends.** No post-event value, no reason to keep it, deleted within a week. Then you've lost the reinstall for next year.
12. **Visual timidity.** Not usually a *stated* reason, but "feels unfinished / feels like a webpage" quietly kills retention. People don't trust products that don't look confident.

---

# 4. Why Should Users Download It

**Right now? They shouldn't.** There's no answer on the screen. So here's the answer you need to *build toward*, and then put on the store listing and the first-run screen:

### The one-liner
> **"Never lose your crew at a festival again."**

### The three reasons, in order of power
1. **Reunion speed.** "Where are you?" becomes a pin and an ETA instead of fifteen texts. Works when signal doesn't.
2. **Not being alone.** Going solo is scary and common. Match on the sets you're both seeing, meet at a stage, walk together at night. This is the underserved market — everyone builds for groups, nobody builds for the person who bought one ticket.
3. **Less phone, more festival.** A cached schedule and a map means you stop doom-scrolling a lineup PDF and start watching sets.

### The download trigger
**Buying the ticket.** That's the moment of intent. Whatever gets them from "I have a ticket" to "I have the app" — a QR code, a promoter partnership, a crew invite link — that's the growth loop. Not app store discovery.

### Why not WhatsApp + Find My?
Because WhatsApp is where the group chat *lives*, and Find My broadcasts your location to everyone forever. Yours is the middle: **festival-specific, expiring, consent-first, and built for bad signal and dead batteries.** Say that out loud in the onboarding — one sentence, above the fold.

###
