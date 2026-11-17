# **Event Buddies**

Product review • UI/UX audit • GitHub code review • 17 November 2026

I reviewed the [live Event Buddies app](https://festival-map-meetup-buddies.lovable.app/?utm_source=chatgpt.com) against the latest code in your [GitHub repository](https://github.com/didireloaded/event-buddies-e18f3ba7?utm_source=chatgpt.com), including the changes merged on 16 November.

**My overall impression is positive. I like the direction, and I think this could become a genuinely useful festival app in Namibia. But I would make another round of product and interface improvements before promoting it heavily.**

The foundation is more substantial than a typical Lovable prototype. You're using actual festival information, artist images, a detailed venue plan, locally saved preferences, QR sharing and offline functionality.

The biggest issue isn't that the app lacks features. It's that **the most valuable features aren't always the easiest to reach, and the promise of finding your friends is currently stronger than what the app can actually deliver.**

My assessment of the current direction

Product concept

## **9/10**

Strong use case

UI direction

## **7/10**

Clean, but a little generic

Feature foundation

## **8/10**

Substantial implementation

Event-day readiness

## **6/10**

Needs field testing and integrations

These are qualitative product assessments, not measured usability or performance scores. I verified the code and public-facing page content, but haven't completed a hands-on physical-device or pixel-by-pixel screenshot audit.

## **1. My thoughts on the concept**

I think you're solving three legitimate festival problems.

**Before the event**, attendees want to see who's performing, save artists, plan with friends and understand the venue.

**During the event**, they want to find a stage, locate toilets or medics, identify a meeting point and reconnect when someone gets separated.

**After the event**, they may want to keep a record of their experience and share memories.

Your app already accounts for all three phases. That's a sensible product direction.

What makes Event Buddies interesting is that it doesn't need to compete directly with Howler or become another ticketing platform. It can become the companion that people use after buying their tickets.

I'd position it as:

> **Event Buddies helps you find your way, follow your music and stay connected with your people at festivals.**

That is a clearer product identity than trying to be a festival social network, navigation app, ticket wallet, event directory and AI assistant all at once.

## **2. Do I like the design?**

**Yes, especially the move toward a simpler mobile interface.**

The latest implementation has system typography, native-style bottom navigation, good touch-target sizes, an established colour system and compact list rows. You've also moved away from the oversized editorial layout that previously made the experience more like a promotional website.

I like that you're using the actual Sound of Summer crowd photograph, artist portraits and venue plan rather than generated festival imagery.

But I think the visual design has moved slightly too far toward a generic iOS settings app.

Clean and functional is good. Losing the character of the event isn't.

I would keep the native mobile interactions while introducing a stronger festival identity through selected photography, deliberate typography, recognisable stage colours and clearer action hierarchy. Not through unnecessary gradients, animations or decorative cards.

## **3. Would it work at an actual festival?**

**As an offline event guide and meeting planner, yes, potentially. As a real-time friend-finding app, not yet.**

Here is the distinction that matters.

| Experience                          | Current state                                       |
| ----------------------------------- | --------------------------------------------------- |
| Find stages and facilities          | Implemented through venue-plan pins                 |
| Search artists and save favourites  | Implemented                                         |
| Create a meeting point              | Implemented                                         |
| Share a plan through QR             | Implemented                                         |
| View an imported friend's plan      | Implemented as a saved copy                         |
| Save a ticket on your phone         | Implemented, local-only                             |
| Open the event offline              | Implemented with caching, needs device verification |
| See where a friend is moving        | Not connected                                       |
| Send an in-app message to your crew | Not connected                                       |
| Receive live location requests      | Not connected                                       |
| Get turn-by-turn venue directions   | Not implemented                                     |
| View official DJ performance times  | Awaiting publication                                |

The code is appropriately transparent about many of these limitations, which is good.

I would be particularly careful with the word **location**. The current app uses selected landmarks and locally saved pins. It doesn't continuously access phone GPS to locate people.

That's not necessarily a weakness. In fact, a privacy-first, low-data alternative could be an advantage at coastal festivals where reception is poor.

But the user should know exactly whether they're sharing a saved meeting place or their actual live position.

## **4. What's working and what's not**

### **What's working well**

**The venue map**

This is probably your strongest feature. You're using the actual venue-plan image with searchable locations, category filters, pin clustering and zoom controls. That is far more useful than displaying a generic Google Map of Langstrand.

**QR sharing and regrouping**

People can exchange saved meeting plans, create a regroup card and open a full-screen Find Me display. These are practical solutions, especially when mobile data is unreliable.

**Offline-first thinking**

The implementation includes a service worker, asset caching, local preferences and IndexedDB ticket storage. There are also automated tests for offline-related behaviour.

**Privacy and safety**

I like that GPS isn't requested unnecessarily, landmark pins expire, and medical facilities are available from a dedicated safety shortcut.

**The event lifecycle**

The app changes behaviour before, during and after a festival, including departure planning and a post-event recap. That's good product thinking, even though it isn't the first thing I would focus on.

### **The AI-slop UI audit**

I found several patterns worth addressing in the current implementation. Some are confirmed directly in the code. Others are design judgments that should be checked against mobile screenshots.

| Finding                                                            | My assessment                                                           | Priority |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------- |
| Excessive reliance on iOS settings-style rows                      | Makes the app feel more like a utility than a festival experience       | Medium   |
| Similar rounded containers and icon tiles across sections          | Creates repetitive visual hierarchy                                     | Medium   |
| Three-step onboarding followed by event selection                  | Too much friction before reaching the useful features                   | High     |
| Main bottom navigation excludes Lineup                             | Buries one of the most-used festival features                           | High     |
| 430px desktop phone frame with thick outline                       | Feels like a prototype presentation instead of a responsive application | Medium   |
| 11px map labels and 12px tab labels                                | Too small for comfortable use in bright outdoor conditions              | High     |
| Festival mode preference without a corresponding experience change | Collects information without providing visible value                    | Medium   |
| Multiple related crew actions spread across different places       | Makes simple tasks feel more complicated                                | High     |

The specific files behind these findings are [EventCompanion.tsx](https://github.com/didireloaded/event-buddies-e18f3ba7/blob/main/src/components/companion/EventCompanion.tsx?utm_source=chatgpt.com), [Onboarding.tsx](https://github.com/didireloaded/event-buddies-e18f3ba7/blob/main/src/components/companion/Onboarding.tsx?utm_source=chatgpt.com) and [styles.css](https://github.com/didireloaded/event-buddies-e18f3ba7/blob/main/src/styles.css?utm_source=chatgpt.com).

There is also a theme inconsistency worth checking. The app wraps its UI in a Konsta iOS provider with `dark` enabled, while the custom stylesheet defines a light, white-and-grey design. That can cause third-party components to look inconsistent with the rest of the interface.

### **A few more important issues**

**The onboarding is longer than necessary.**

Someone standing outside Sound of Summer with poor reception shouldn't have to work through several screens, enter a name, choose their festival mode, select an event and confirm they're going before accessing a map.

I'd let people browse immediately. Ask for their name when they create or share a crew plan.

**The navigation should reflect actual usage.**

Currently the bottom navigation is Events, Map, Crew and You. Lineup is accessed through the Events screen.

For a festival companion, I would rather use:

Home

Lineup

**Map**

Crew

Suggested navigation structure. Move You/Profile into the top-right header.

This gives the user direct access to the three main experiences without making them search through Home.

**The Crew screen has too many ways to do similar things.**

There is Find Me, Regroup, Festival Bump, Share Meetup Link, Quick Pings and Create Meeting.

Each has a purpose, but the combined experience needs simplifying.

I'd make Crew revolve around three obvious actions: **Add a friend, Share a meeting point and Find each other.** Put the secondary functionality inside those flows.

**The map still needs event-day polish.**

The source has 41 venue locations, but many pins and labels will compete for space on a phone. I would prioritise nearest toilets, medics, entrances, bars and stages by category, with larger tap targets and easier selection.

I would also make it impossible to confuse a manually selected landmark with someone's current GPS position.

### **Two launch issues I found in the repository**

**PWA manifest**

The `public/manifest.webmanifest` file in the latest GitHub commit is empty. Meanwhile, the Vite configuration disables automatic manifest generation.

That needs fixing before you rely on Add to Home Screen, especially on Android. The existing service worker doesn't replace a valid web app manifest.

Files: `public/manifest.webmanifest` and `vite.config.ts`

**Festival information consistency**

Your source data acknowledges that the supplied map names its western stage differently from the advertised Coca-Cola Coke Studio Stage.

The organiser's website also lists an 11 PM finish, while Howler shows 11:59 PM.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://namibrage.com\&sz=32)

Namib Rage Events+1



The app currently uses the organiser's 11 PM hours. That's reasonable as a conservative choice, but the actual event-day cutoff and final map labels must be confirmed with Namib Rage before launch.

File: `src/lib/event/sound-of-summer.ts`

There's another smaller concern with the QR/link system. The shared payload can include personal contact details, and shared links don't have server-side revocation. I would keep personal contact sharing strictly optional, warn people before sharing and minimise what gets included by default.

## **5. What I would improve next**

I wouldn't rebuild the application. I'd refine it in this order.

### **01**

**Make the core experience immediate**

Remove unnecessary onboarding friction, change the bottom navigation and let someone open Lineup or Map without setting up their profile. Use the Home screen to highlight the event, favourite artists and their saved meeting point.

### **02**

**Redesign Crew around one simple journey**

Create or import a crew plan, select a meeting landmark, share it, then access a clear regroup action. Make it obvious which information is saved locally and which information is actually shared.

### **03**

**Make the map excellent**

Increase map-label readability, reduce overlapping pins, improve place-selection behaviour and make medics, toilets and exits accessible in one tap. Validate every pin against the final approved venue plan.

### **04**

**Add more event personality without making the UI busy**

Keep the neutral native interface, but use real festival artwork and photography in a few carefully chosen places. Reduce repetitive icon tiles and rounded cards. Remove the fake phone frame on desktop and use a deliberate responsive layout instead.

### **05**

**Fix launch readiness and test on real devices**

Repair the manifest, verify complete offline loading, and test iPhone Safari, installed PWA mode and Android. Test the QR exchange between two phones, camera permissions, screen brightness outdoors, empty states, small screens and poor connectivity.

### **What I wouldn't prioritise yet**

I wouldn't spend the next development cycle building more AI tools, social profiles, activity feeds or complicated event-personalisation features.

The AI assistant and suggested day-plan feature are interesting, but they depend heavily on complete, reliable event data. With official performance times still pending, the basic map, lineup and crew experience deserves more attention.

Real-time friend locations could come later as an explicit opt-in feature, with clear consent, expiry controls and an actual backend connection.

## **My final verdict**

**I like Event Buddies. I think the concept is worth developing and testing with real people at Sound of Summer.**

Its strongest opportunity isn't becoming the biggest event app with the most features. It's becoming the one attendees trust when they need information quickly.

If someone opens it and can find a toilet, locate the Coke Studio Stage, check their favourite artists or share a meeting point within a few seconds, you've created something useful.

And I think that's where the next version should go.

My recommendation is to treat this as a **focused refinement, not another full redesign**. Keep the working logic, fix the launch blockers, improve navigation and make the festival-day experience more distinctive.

The next milestone should be a real-world test with several people using different phones, including one or two deliberately disconnected from mobile data. That's what will tell you whether the product works beyond the code and the design.
