# Sound of Summer 2026 integration

Updated 13 November 2026.

## Confirmed event information

Sound of Summer is now the primary event in database-free demo mode. It has its own event identifier and local preferences.

| Detail | Implemented value | Source |
| --- | --- | --- |
| Date | Monday 28 December 2026 | Namib Rage and Howler |
| Venue | Tidal Pools & Jetty Beach, Langstrand | Namib Rage and Howler |
| Operating hours | 12:00–23:00 CAT | Organiser’s published approved hours |
| Age | 18+, valid ID required | Namib Rage and Howler |
| Organiser | Namib Rage Events | Official event page |
| Headliner | Shimza, announced for Savanna Main Stage | Namib Rage and Howler |
| Additional named artists | Timo ODV, Kurt April, Celso Fabbri, Faffa Bruwer | Howler |
| Individual set times | Awaiting publication | No confirmed timetable found in the reviewed primary sources |
| Ticket purchase | External official Howler link | Link from the organiser’s event page |

Howler lists a later finishing time than the organiser’s site. The app uses the organiser’s approved operating hours and explains the discrepancy in Event details. The supplied plan labels the western stage Afro Tech & Amapiano. The organiser’s 2026 page lists Coke Studio. The plan’s original label is preserved and its correspondence to the 2026 stage list is marked as unconfirmed.

Instagram could not be fetched and searches did not provide usable first-party posts. The information included in this build comes from the organiser and its ticketing provider.

### Sources

- [Official Sound of Summer event page](https://namibrage.com/festivals/sound-of-summer)
- [Official Howler event listing](https://namibrage.howler.co.za/events/sound-of-summer-2026-8a50)
- [Official Campout Dune Fest page](https://namibrage.com/festivals/campout)
- [Past-edition photo used in the app, linked from the organiser’s official event page](https://res.cloudinary.com/pixel-penguin/image/upload/c_scale,w_1920/v1660917080/websites/namib_rage/images/gallery%20images/sos/IMG_2520_cvbue3.jpg)
- The venue layout is the image supplied by the user in this chat.

## Applied from the screen-by-screen request

| Request | Current behavior |
| --- | --- |
| Keep colours | Existing black, white, pink and mint application colours retained |
| Use Sound of Summer as main demo | Event identity, metadata, venue, hours, artist data, official links and photo updated |
| Open event into a large map | Open event launches an expanded native-dialog site plan |
| Use the supplied layout | Original image retained as an uncropped square coordinate space |
| Keep map icons small | 26px marker visuals, larger tap areas and same-category clustering |
| Tap stages and amenities | Place details, stage information, artist announcement and meeting-plan action |
| Map search | Place names, amenity types, bathroom/medical synonyms, and Shimza’s confirmed stage assignment |
| Map filters | Stages, food, bars, toilets, entrances, sponsor points, zones and safety points |
| Zoom and pan | 1x–4x zoom and scroll/pan, including an expanded map view |
| Know the actual time | Device clock rendered in Africa/Windhoek, refreshed every ten seconds and on focus |
| Event countdown and live status | Derived from actual current time and event boundaries |
| Currently playing and next saved set | Rendering logic exists for timed performances. No timed performances are fabricated for this event |
| Artist lineup and saving | Five named artists displayed, with local saved-artist persistence |
| Profile access | Top-right profile control opens editable local display name and username |
| Event details and ticket link | Real date, venue, hours, organiser attribution, official information and ticket links |
| Event rules and transport | Published entry restrictions and parking/bus information accessible from the event menu |
| Upcoming events and See all | Sound of Summer and a verified link to Campout Dune Fest shown in the discovery sheet |
| Organiser and demo controls in attendee navigation | Attendee navigation contains Home, Lineup, Map, Crew and attendee information controls |
| Offline event package | New plan, past-edition photo, application scripts, styles and fonts included in the demo cache |

## Venue annotations

The interactive overlay has 41 mapped features based on the supplied image.

- Three stages
- Seventeen bar markers
- Five toilet blocks
- Two medic points
- Three entrance arrows
- One food court
- Two tents
- Six identifiable sponsor points
- Experience and Platinum zones

Marker coordinates are normalized image positions. GPS coordinates are explicitly null because the supplied raster plan has not been georeferenced. The app does not assign invented GPS positions to the amenities.

Vendor names, menus, prices, payment methods and opening hours are awaiting confirmation. The supplied image does not separately label emergency exits, security, water points, accessible routes or transport stops. Those locations need organiser information before they can be added accurately.

## Visual and functional review

| Screen or state | Issue | Fix | Verification |
| --- | --- | --- | --- |
| Home | Former event name and opening hour were hardcoded | Event-driven labels, Sound of Summer data and actual-time status | Rendered at 390px, route overflow checked at 320px |
| Map | Supplied layout differs from the former schematic | Original raster with normalized marker positions | Map and expanded map screenshots inspected |
| Map with many bars | Nearby marker tap areas can overlap | Same-type clusters open a place chooser | All 17 bars counted, cluster chooser exercised |
| Expanded map | Requires modal focus and dismissal | Native dialog, Escape and focus return | Escape closed it and focused Expand site plan |
| Lineup | Public sources omit set times | Announced artists have local saves and explicit timetable status | Artist save survived reload |
| Stage details | Stage naming differs between sources | Preserve supplied label and expose the conflict | Main Stage displayed Shimza and pending set times |
| Profile | Top-right control needed a destination | Local name and username form | Valid edit survived reload |
| Offline package | New assets must be cached | Cache version 3 includes both new images | Offline full reload restored the plan and saved artist |

### Checks actually run

- npm run typecheck — PASS
- npm run lint — PASS
- npm run build — PASS
- Event clock assertions for upcoming, opening boundary, closing boundary and Monday date — PASS
- Open event launches expanded map — PASS
- Main Stage selection displays Shimza — PASS
- All 17 bars present in the directory — PASS
- Bar cluster opens place chooser — PASS
- Search Shimza highlights Main Stage even after choosing another filter — PASS
- Local artist save and reload — PASS
- Local profile edit and reload — PASS
- Expanded map Escape and focus return — PASS
- Offline full reload, supplied plan and artist persistence — PASS
- 320px root overflow checks across all four routes — PASS
- Reduced-motion main animation — none
- 390px rendered Home, Lineup, Map and expanded plan — INSPECTED
- Physical iPhone/Safari, on-screen keyboard, VoiceOver and standalone installation — NOT RUN

## Work still required from the broader feature list

- Cross-device crew creation, short-code joining, invitations, owner permissions and membership limits need shared backend state and account/membership authorization.
- Live crew movement, crew-only live maps and remote meeting notifications need consent-aware location delivery and connected realtime services.
- GPS position on this image, nearest-place distances, internal walking routes, accessible routing and restricted-area avoidance need georeferencing and a confirmed walkable path network.
- Artist reminders, Now Playing, detailed stage timetables and calendar exports need confirmed set times. Push delivery also needs push subscriptions and a delivery service.
- Food and bar menus, prices, deals and stock need supplied vendor data.
- Ticket wallet, purchases and transfers need an authorised ticketing integration.
- Multi-event discovery currently includes verified event links. A complete multi-event catalogue and event switching remain backend work.

The full pasted feature list has not all been implemented. This update delivers the Sound of Summer demo, supplied-map integration and the supported screen changes listed above.

## Product-specific design decisions

1. The user’s actual venue image is the map surface, preserving its coastline, stages, brand points and access zones.
2. Announced artists and actual event time drive Home and Lineup, with source gaps made explicit at the affected controls.
3. The Open event action expands the plan immediately, and small clustered overlays support interaction with the source image.

The former generic site schematic and hardcoded fictional performance times were replaced for this event. Current screenshots are saved beside this review.
