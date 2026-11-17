# **Event Buddies: Complete user journey audit**

I’m treating this like I’m attending Sound of Summer for the first time on 28 December 2026, using Event Buddies on my phone.

**One limitation upfront.** I could inspect the current GitHub implementation and its screen logic, but I couldn't control the published website to physically tap through it. So this is a complete code-grounded walkthrough of the attendee experience, not a verified live-device test. I'll distinguish problems confirmed in the implementation from usability concerns that still need testing.

## **1. First visit and onboarding**

Needs improvement

The current journey is:

Welcome

Festival mode

Your name

Select event

Event preview

Enter app

### **What I experience**

The welcome message says "Find your people. Don't lose them." I like the message because it immediately communicates a useful outcome.

Next, I'm asked whether I'm here for the music, to meet people or for both. Then I enter a name, select Sound of Summer and confirm that I'm going.

### **The problem**

The journey takes too many interactions to reach the map or lineup. More importantly, the festival-mode choice doesn't visibly change the main app experience.

I'm answering a question without understanding why the app needs the answer.

There's also only one selectable event in the current implementation. The extra event-selection step doesn't create much value yet.

**What I'd change:** Let me explore the event immediately. Ask for my name when I want to share a plan or add friends. Ask about my festival preferences only when they actually influence what the app shows me.

## **2. Home screen**

Good foundation, weak priority

### **What I see**

Based on `HomeView.tsx`, I get the Sound of Summer title, event date, photograph, venue details, countdown, a prominent Find Your Crew button and a set of navigation rows for Lineup, Map and Essentials.

Below that, I see my crew section.

### **What works**

The design is straightforward. It isn't overloaded with promotional content, and the most important festival information is visible.

The actual event photography makes it recognisable.

### **What doesn't work**

The Home screen currently gives a lot of prominence to Find Your Crew, even when I haven't added anybody.

The Lineup and Venue Map are secondary rows. I don't think those tasks should be secondary for someone attending a music festival.

The save-event heart also feels somewhat unnecessary when I've already selected the only available event.

### **What I'd improve**

Home should behave differently depending on where I am in the event journey.

Before the event, show my saved artists, the event date and preparation information.

During the event, show my saved meeting point, quick access to the map, medical facilities and the lineup.

After the event, prioritise getting home and accessing my recap.

I would also make a saved meeting point visible directly on Home, rather than making me return to Crew to find it.

## **3. Lineup**

**One of the stronger experiences**

### **My journey**

I open Lineup, browse the announced artists, search for a DJ, filter by stage and tap a heart to save someone.

I can open an artist's details, check their listed stage, find that stage on the map or open a Spotify search.

The code keeps my favourites on my device, so they should remain after refreshing.

### **What I like**

The artist search is useful. Artist images are present. The save interaction is simple, and I like the direct relationship between the artist page and the venue map.

### **What needs attention**

The official performance timetable is still pending, so there's no reliable set-time schedule yet. That's a data dependency rather than a UI failure.

There's also a "Suggest my day plan" feature, but without confirmed set times its usefulness is limited.

The interface uses quite a few similar-looking list rows. I would give headliners and saved artists slightly stronger visual treatment while preserving the compact layout.

**My recommendation:** Make Lineup a permanent bottom tab and introduce a "My Lineup" view that becomes especially useful once official set times are available.

## **4. Venue map**

**The strongest core feature**

### **My journey**

I tap Map, see the actual supplied festival plan, search by location or artist, choose a category and select a pin.

The map supports zooming, panning, fullscreen viewing, clustered pins and location information.

When I select a place, I can open its details and create a meeting plan at that landmark.

### **What's working**

The association between real venue landmarks and selectable map points is very useful.

The ability to filter stages, bars, toilets, food and medics is practical. The safety shortcut is particularly important.

### **What I would change**

The default map displays many points. On a small screen, that could become visually crowded.

The map labels use approximately 11px text in the CSS, which is too small for an outdoor festival environment. The pin dots are also relatively small, even though their surrounding tap targets are larger.

I'd make the map's most important facilities immediately visible and give people clearer control over the other categories.

I'd also introduce a one-tap action called **Find facilities** with Toilets, Medics, Gates, Bars and Stages.

One important limitation must remain clear. The map isn't georeferenced, so it cannot actually tell me where I am on the venue plan using GPS. It uses manually selected landmarks.

## **5. Crew and finding friends**

This is the part I would spend the most time improving because it's central to the name Event Buddies.

### **My journey**

I open Crew and find the following functionality.

- My profile and any friends whose plans I've imported.
- Lost Someone? Regroup and Find Me Screen.
- Show QR, Scan Friend and Share Meetup Link.
- Quick messages and meeting-point selection.

There are useful ideas here, but the journey is too fragmented.

### **Scenario A. I want to add a friend**

I tap Show QR and my friend scans it.

The code allows their phone to import my name, meeting information and up to three saved artists. If I choose to include an emergency contact, that information can also be shared.

That's useful.

**But there's a significant UX issue in the import behaviour.**

When my friend imports my plan, the app also adds my saved artists to their own favourites and replaces their saved meeting point if my plan includes one.

That can be surprising. I might only want to add someone to my crew without modifying my personal plans.

I'd change this to an import preview with separate choices for saving the friend, adopting their meeting point and adding their artists.

### **Scenario B. My friend is lost**

I tap "Lost someone? Regroup."

I'm asked to choose a landmark and time. I can then generate a QR code, share a link or export a meeting card.

I like this approach because it gives people an agreed physical location without depending on accurate GPS.

What I don't like is that the app also has Find Me, Quick Pings and other sharing mechanisms nearby.

I would consolidate these into a single Find My Crew area with a very clear distinction between **Share my meeting point** and **Find a friend's meeting point**.

### **Scenario C. I want to see my friend's location**

This is where the current experience falls short of what some users may expect.

The imported friend's avatar opens their saved plan. It doesn't show their live position. There isn't a backend connection for live crew membership or real-time messages.

That's okay for a first version, but the interface should say "Last shared meeting point" instead of using language that might imply live tracking.

### **Scenario D. I send "I'm here"**

The quick-message feature lets me pick a landmark and share text through my phone's messaging system.

However, the generated link carries the saved meeting plan, not necessarily the landmark I chose for the quick message.

This creates a potential mismatch. The message could say I'm at one location while the linked plan opens another.

**That needs correcting before event-day use.**

## **6. Find Me screen**

The app includes a full-screen display showing my initials, name and selected place, intended to help friends spot me in a crowd.

This is one of the more interesting small features.

It doesn't need GPS, a database or mobile data. I can simply hold up my phone.

I would keep it.

The main improvements should be ensuring long names don't overflow, maintaining strong visibility outdoors and offering a simple close button that's always reachable.

I would also rename it **Show My Screen** or **Help Friends Spot Me**. "Find Me" can make it sound like the app is doing location tracking.

## **7. Festival essentials and event information**

The Essentials screen includes event details, transport, rules, facility shortcuts, coastal conditions, ticket links and an event assistant.

There's quite a lot of useful information here, but the organisation could be better.

I would expect to open this screen primarily for practical questions.

Is there parking? Can I bring a camera? Where are the medical facilities? How do I get home?

The code does contain information for these questions, although some details are still awaiting organiser confirmation.

### **What I would improve**

Give practical information a clearer structure. Group entry requirements, transport, safety and venue services so I can scan them quickly.

The AI assistant should remain secondary. For the common questions people ask repeatedly, a visible FAQ is faster and more reliable than asking them to type.

The Coastal Conditions section currently states that weather, sunset and tide information is pending. I'd either connect verified information or avoid giving that section prominent space until it's useful.

## **8. Tickets and the offline ticket vault**

This is a genuinely valuable feature.

The app allows me to save a JPG, PNG, WebP or PDF ticket of up to 8 MB locally on my phone.

I can then view that copy without reopening my email or Howler.

The implementation also gives me the ability to replace or remove the saved ticket.

### **What needs improvement**

The ticket vault is currently located inside the You tab.

On event day, people are likely to need their ticket at the entrance, so I would make it accessible much more quickly.

I would add a **My Ticket** shortcut to Home, particularly before and during the entry period.

The app must continue making clear that the stored file is only a copy and is not proof of verified admission.

I would also test whether PDF tickets reliably reopen from local storage on both Android Chrome and iPhone Safari.

## **9. You, profile and settings**

The You screen includes my profile, event switching, festival preference, ticket vault, location privacy, offline installation and data-retention information.

The layout is sensible, but the content is largely utility-focused.

That's why I think the You tab could be moved out of the main bottom navigation and into a profile button in the header.

Most attendees won't need to edit their names or access data-retention settings repeatedly during a festival.

### **One functional inconsistency**

The application has a `PlanBackup` component for downloading and restoring a saved plan.

However, I couldn't find an accessible route to that component in the main You screen or menu.

The post-event recap includes a "Back up my festival plan" button, but that button currently navigates to You rather than directly opening the backup feature.

**I'd treat that as a genuine navigation defect.** The user is promised an action but isn't taken to the relevant tool.

The repository also contains a Festival Passport component for checking off locations. Its integration into the current primary journey appears incomplete.

## **10. Safety and emergency information**

This part of the app is worth keeping prominent.

The header contains an emergency shortcut, and the map has a safety filter.

The emergency sheet gives guidance and lists medical and security points from the venue plan.

That's useful.

However, the organiser's emergency number, lost-property contact and other on-site safety details are still awaiting confirmation.

I would make the emergency screen more direct, with the nearest identifiable medical landmark at the top, a clear map action and an emergency contact only when a verified number is available.

The interface should never make someone believe it's contacting emergency services when it is only displaying information.

## **11. Offline use and installation**

The application has meaningful offline implementation, including a service worker and local data storage.

But an offline feature is only as reliable as the actual installed experience.

The current repository contains an empty `public/manifest.webmanifest`, which needs fixing.

I would test all of the following before launching at Sound of Summer.

| Test                                   | What should happen                                   |
| -------------------------------------- | ---------------------------------------------------- |
| Open app with mobile data switched off | Previously saved app loads                           |
| Open Map offline                       | Venue image and pins are visible                     |
| Search Lineup offline                  | Artist names and favourites remain accessible        |
| Open saved PDF ticket offline          | Ticket is readable                                   |
| Scan a friend's QR offline             | Shared plan imports successfully                     |
| Refresh while offline                  | App remains usable                                   |
| Reopen after the phone restarts        | Saved information is preserved                       |
| Open on iPhone and Android             | Navigation, sheets and touch gestures work correctly |

None of these should be marked as passed from this review alone. The repository documents automated browser coverage, but physical-device testing remains unverified.

## **12. After the event**

The app includes a thoughtful after-event journey.

After the festival finishes, Home prioritises regrouping and departure. Later, attendees can access a recap based on saved artists, self-recorded venue visits and shared plans.

The recap can be exported as an image.

I like the concept, but I would make sure it doesn't distract from getting the core event-day features right.

There is also a usability issue with the ride-home feature.

The `RideBookmark` interface is primarily surfaced in the post-event Home state. I think attendees should be able to save where they're parked or which gate they'll use **before** the festival finishes.

That's the point when they still remember their parking location clearly.

## **13. Organiser workspace**

I also checked the separate organiser interface at `/organiser`.

The source contains a readiness checklist, stage information, venue point counts and an announcement drafting interface.

It's clearly labelled as a demo, with no authentication or publishing backend connected.

The information architecture is useful as an internal development tool, but it isn't an operational organiser dashboard yet.

I would keep it separate from the attendee experience until proper organiser authentication, permissions and data management are implemented.

## **14. The issues I would fix first**

These are the most important findings from the complete source-based journey review.

| Priority | Finding                                                            | Recommended action                                 |
| -------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| P0       | Empty PWA manifest                                                 | Generate a valid manifest and verify installation  |
| P0       | Plan imports overwrite personal meeting choices                    | Separate friend import from adopting shared plans  |
| P1       | Quick message landmark can differ from linked meeting              | Make the shared link represent the chosen location |
| P1       | Backup action doesn't reach the backup component                   | Connect it to the correct screen                   |
| P1       | Too much first-use setup                                           | Allow immediate browsing                           |
| P1       | Lineup buried inside Events                                        | Make Lineup a primary tab                          |
| P1       | Crew has overlapping actions                                       | Consolidate the sharing and regrouping journeys    |
| P1       | Map text is too small for outdoor use                              | Increase label legibility and simplify pins        |
| P1       | Live location expectations aren't fully aligned with functionality | Make local-only status explicit                    |
| P2       | Ride bookmark appears too late                                     | Make it available before and during the event      |
| P2       | Desktop presentation uses a simulated phone frame                  | Implement a deliberate responsive layout           |
| P2       | Multiple reusable components aren't clearly reachable              | Audit and connect or remove orphaned features      |

P0 means address before real users depend on the app. P1 means important usability work. P2 means refinement.

## **15. The ideal attendee journey**

I think the app should feel more like this.

1. **Open Event Buddies**

   See Sound of Summer immediately, with a clear option to browse without creating a profile.
2. **Explore the lineup**

   Find artists, save favourites and view official performance times once published.
3. **Explore the map**

   Find a stage, entrance, toilet or medical point without unnecessary navigation.
4. **Add friends**

   Scan a QR or open a link, review the friend's details and choose what information to save.
5. **Plan a meetup**

   Agree on a venue landmark, share the plan and access it offline.
6. **Prepare for the event**

   Save a ticket, parking reference and offline app copy.
7. **Use it during the event**

   Open Lineup, Map and Crew directly. Keep safety and ticket shortcuts accessible.
8. **Leave and remember**

   Find the saved ride location, regroup and access the recap after the event.

## **Final assessment**

Having traced the full implementation, I think the biggest improvement is **simplification, rather than adding new features**.

You already have enough functionality to make a good first version. The work now is making sure a person who's never seen Event Buddies can understand it without instructions.

A useful benchmark would be this. Give five people the app without explaining anything, then ask them to find a toilet, save an artist, add a friend, create a meeting point and retrieve their ticket. Watch where they hesitate.

That test, together with a proper live-browser and device walkthrough, will reveal the remaining usability problems much more reliably than another round of purely visual redesign.

For an actual tap-by-tap inspection of the published site, including screenshots, broken interactions and device viewport testing, **switch this conversation to ChatGPT Work** and use the same two URLs. Its cloud browser can navigate the live application, which isn't available through the read-only access I used here.
