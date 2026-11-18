---
name: anti-slop-brutal
description: Apply the supplied Event Buddies design, copy and review manual when changing attendee UI, reviewing festival flows or drafting builder prompts for this project.
---

# Event Buddies review guide

Read [the supplied manual](references/event-buddies-manual.md) before reviewing or changing Event Buddies UI, copy or builder prompts. Use its six-part response format for design reviews and its state and acceptance contract for builder prompts.

Apply alongside the repository’s Strict Interface Engineer guidance. Preserve the current palette, layout and mobile PWA architecture. Ground decisions in venue finding, meeting friends, low signal and limited battery.

## Apply against the actual implementation

- Verify current source and rendered behaviour before issuing a verdict. Record missing evidence explicitly.
- Keep real event facts in `src/lib/event/sound-of-summer.ts`. Preserve stable artist IDs and existing attendee data.
- Use actual imported-plan names and saved-artist overlap for social context. A populated chat example requires real messages or an explicitly labelled test fixture.
- Display timestamps, countdowns, locations and ETAs only when the app has the underlying information. Explain unavailable information beside the relevant action.
- Keep local landmark check-ins private and expiring. Represent actual sharing state and storage scope clearly.
- Accounts, account sync of favourites and meetings, private Cloud crews with invite codes, shared meetings and expiring landmark pins are implemented. Crew chat, public discovery, server retention jobs and push notifications are not. The manual’s proposed flows for those describe acceptance targets for future implementation.
- Preserve browser zoom, text selection, keyboard access, focus return and reduced-motion support. Apply press feedback where it suits the control, with readable type and comfortable touch targets.
- Treat motion, fun and perceived activity as requirements for intentional feedback. Evaluate them against truthful state and accessibility.

## Evidence before delivery

Run relevant type, lint, test and build checks for code changes. Inspect changed screens and important empty, error and offline states on the intended phone size. Name untested environments and unresolved gaps. A documentation-only update requires source fidelity and link checks.
