The most valuable things to steal from DICE and Partiful aren't their features, but their product philosophies. DICE proves that **visual confidence is a feature**—posters *are* the interface, and the ticket *is* the app. Partiful proves that **the invite is the product**—the link works even if nobody downloads the app, and the real product starts after someone says "yes".

Your app has neither. It's a text wall with no visual anchor and an invite flow that requires an app. Here's what to steal, and what to ignore.

---

### 🎯 What to Steal from DICE (Visual Confidence & Frictionless Access)

**1. Let Posters Be the Interface.**
DICE's feed is a vertical scroll of large, poster-style visuals, not a list of text links. Your home screen currently has no image at all.
- **The Steal:** Make the event image the hero of every card. The poster *is* the navigation. No description paragraph is needed if the image is strong enough. This is the fastest way to kill the "AI slop" text wall feel.

**2. The Bottom Bar as a "Get Tickets / I'm Going" Anchor.**
DICE pins a persistent bottom bar on event pages showing the price and a bright "Get Tickets" button. It removes all decision friction.
- **The Steal:** A persistent bottom action bar on the event hub. Not a floating button—a **sticky, native-style bar** with your one primary action ("I'm going" or "Drop a Pin"). It makes the core action unavoidable, which is what a festival app needs.

**3. Ticket-in-App with Timed QR Access.**
DICE tickets exist only as QR codes inside the app, often unlocking 2 hours before the show—no PDFs, no screenshots. This solves real problems: scalping and confusion at the gate.
- **The Steal:** This is perfect for your **ticket-tier scanning idea**. The QR code should live in the app (or Apple Wallet) and activate only when the user is near the venue. It's a trust signal (the ticket is real and yours) *and* a utility (no fumbling for emails at the gate).

**4. "Make Plans" as a Header, Not a Prompt.**
DICE's home header says "Make Plans". It's a command, not a question. It frames the app's purpose in two words.
- **The Steal:** Your home header should say **"Who are you going with?"** or **"Find your crew"**—not "Events." It's a verb, not a noun. It tells the user what to *do*, which is exactly what the app needs.

---

### 🎉 What to Steal from Partiful (Invite Loop & Post-RSVP Coordination)

**1. The Invite Link Works Without the App.**
Partiful's guest RSVP doesn't require downloading anything. You just need a phone number. This is their entire growth engine.
- **The Steal:** Your `/join/:code` deep link is good, but a friend shouldn't have to install the app to RSVP "I'm in" to a crew. **The web preview should let them see the crew and say "Join" with just a name.** Only then prompt them to install. This turns your invite into a true growth loop, not a wall.

**2. "Text Blast" as the Coordination Primitive.**
Partiful's core tool isn't a chat—it's a one-to-many **Text Blast** to the whole guest list. It's how you get 30 people to the same place.
- **The Steal:** Instead of building a full WhatsApp clone, build a **"Blast to Crew"** composer. One message, sent to every member of the crew. This is more useful for festivals ("Main Stage in 10, come find us") than a 1-to-1 chat thread, and it's a fraction of the engineering effort.

**3. The Event Page Is the Atomic Unit.**
Partiful's whole product is the event page—it handles RSVPs, updates, photos, and location all in one place.
- **The Steal:** Your Event Hub is currently a segmented control (Lineup/Map/Info). **Kill that.** The event page should be a single, scrollable surface where the lineup, map preview, and info live as sections. The user should not have to "navigate" to the map—it should be *there*, scrolled to, like a poster on a wall.

**4. "Maybe" is a First-Class RSVP State.**
Partiful's RSVP is Going / Maybe / Can't Go. "Maybe" is a huge unlock for festivals—people often don't know if they can make it until the day.
- **The Steal:** Your "I'm going" toggle is binary. Add **"Maybe"** as a state for the event and for set attendance. It reduces commitment friction and gives you a list of people to nudge later. This is a small change with a big behavioral effect.

---

### 🚫 What NOT to Steal (and Why)

| Feature | Why to skip it for Event Buddies |
|---|---|
| **DICE's "Recently Viewed" section** | It creates a visual hierarchy problem—it pulls attention away from discovery and makes the home screen feel like a history log. You want the event image and crew to dominate, not past views. |
| **Partiful's full invite customization** | Partiful limits aesthetic options so every invite looks good. Your event posters are already designed by the festival. **Don't build a poster editor.** Use the official event art and spend that engineering time on the map and crew features. |
| **DICE's extensive music library onboarding** | Connecting Spotify/Apple Music is a powerful recommendation engine, but for a *festival crew app*, the vibe picker (Music / Social / Both) is enough. Deep personalization is a P2, not a P0. |
| **Partiful's photo albums & polls** | These are party-planning features, not festival-coordination features. A crew at a festival needs a map pin, not a poll about which bar to visit. Skip them until after the core loop works. |

---

### 🛠️ The One-Screen Synthesis (How to Apply It Today)

Take the **visual confidence of DICE** (poster-as-interface, sticky bottom action bar) and the **invite philosophy of Partiful** (link works without the app, "Maybe" as an RSVP state). Apply them to a single screen—your **Event Hub**—to prove the model works.

**The prompt for this screen:**
```
Rebuild the Event Hub as a single, scrollable, DICE-style event page.

1. **Hero Header:** Full-bleed event poster image (16:9). Overlaid at the bottom: event title (22px bold), venue + "Opens in 41 days" (15px tabular-nums). No description paragraph.
2. **Sticky Bottom Action Bar:** A fixed bar at the bottom with one primary action: a filled pill "I'm going" (or "Going ✓" when selected). To the right, a secondary "Maybe" text button. This bar is always visible.
3. **Scrollable Body:**
    - **Your Crew Section:** Section label "YOUR CREW" (11px uppercase). If empty: three muted placeholder avatars + "Start a crew" pill. If populated: tappable avatars + "+" invite.
    - **Lineup Preview Section:** The next 3 upcoming sets (artist, stage, time in tabular-nums). A "See full lineup" text button.
    - **Map Preview Section:** A static map thumbnail with a pin for the main stage. A "View map" text button. (The map is a section, not a tab.)
    - **Info Section:** A single row "Entry rules · 18+, valid ID" that opens a sheet with the full details. No bullet walls.
4. **No Segmented Control.** The screen scrolls. The user does not "navigate" to the map or lineup—they scroll to it.
```

**The one sentence:** Steal DICE's **visual confidence** (posters as interface, sticky action bar) and Partiful's **invite frictionlessness** (link works without the app, "Maybe" state), but reject their feature bloat—your app's job is to get a crew to the same stage, not to host the party or curate the entire music taste graph.
