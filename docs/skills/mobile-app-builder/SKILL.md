---
name: mobile-app-builder
description: Build and review production-oriented mobile apps with React Native/Expo, SwiftUI, Jetpack Compose, or mobile web/PWA. Enforces product-specific UX, native platform conventions, accessible states, secure real behavior, efficient architecture, and evidence-based device verification without generic AI-generated UI.
---

# Mobile App Builder

Build complete, distinctive, usable mobile products. This skill applies to:

- React Native and Expo apps
- SwiftUI and UIKit iOS apps
- Jetpack Compose and Android Views apps
- mobile web apps and PWAs when the user expects a mobile experience
- cross-platform products with shared domain logic and platform-specific UI

This is a mobile product engineering skill, not a request to make a web page look narrow. Mobile is defined by touch, lifecycle, navigation, safe areas, keyboard behavior, permissions, accessibility, connectivity, and platform expectations.

## Operating principles

1. Inspect before editing.
2. Preserve the project’s existing architecture, brand, dependencies, and user work.
3. Build the real product and real user journey, not a screenshot or generic template.
4. Put behavior and invariants in the layer that owns them.
5. Use platform-native primitives and conventions.
6. Do not add a dependency unless it solves a concrete problem and is compatible with the installed versions.
7. Never fake persistence, payments, bookings, messages, analytics, uploads, notifications, synchronization, or success.
8. Make accessibility, error recovery, offline behavior, and permission denial part of the feature.
9. Prefer the smallest complete vertical slice over a broad unfinished shell.
10. Report only verification that actually happened.

## Instruction precedence

Follow instructions in this order:

1. System and safety instructions.
2. The user’s current request.
3. The nearest applicable project instructions, including `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `README.md`, architecture documents, and security documents.
4. This skill.
5. General platform guidance in official documentation for the installed SDK and dependency versions.

Project-local instructions apply to the project where they are found. Do not copy instructions from an unrelated repository or pretend that a downloaded example is a universal rule.

## Stage 1: classify the mobile target

Identify:

- React Native, Expo, SwiftUI/UIKit, Jetpack Compose/Views, or mobile web/PWA
- iOS, Android, or both
- phone, tablet, foldable, desktop window, or mixed size classes
- online-only, offline-capable, or offline-first behavior
- authentication and account model
- permissions required: camera, location, notifications, contacts, files, Bluetooth, biometrics, or other capabilities
- input methods: touch, keyboard, stylus, voice, assistive technology, or external pointer
- supported OS versions and installed SDK versions

For shared products, explicitly separate what can be shared:

- domain types
- validation rules
- API clients
- business logic
- persistence policy
- design meaning and token intent

Keep platform-specific when necessary:

- navigation
- screen transitions
- input controls
- sheets and dialogs
- keyboard behavior
- system bars and insets
- permissions
- gestures
- accessibility APIs
- camera, location, notifications, files, and biometrics

Do not import DOM-first web systems into native screens. Web UI libraries such as shadcn/ui, Radix Themes, Sonner, cmdk, Vaul, Magic UI, and other browser-first packages are not automatically compatible with React Native, SwiftUI, or Compose.

## Stage 2: inspect the actual project

Before writing code:

1. Inspect the working tree and preserve unrelated changes.
2. Read the package manifest, lockfile, app configuration, native project files, routes, navigation, state, API layer, persistence, schemas, tests, and existing components.
3. Identify the current design tokens, typography, colors, icons, images, spacing, radii, and component primitives.
4. Identify the primary user, environment, user goal, top three tasks, and primary action.
5. Inspect existing screens on the real target surface if possible.
6. Trace data ownership and authorization before touching user or sensitive data.
7. Determine how loading, empty, validation, error, offline, permission-denied, disabled, and success states are currently represented.

Do not reinitialize a stable app, replace its navigation system, upgrade all dependencies, or introduce a new UI framework merely because a tutorial uses it.

## Stage 3: create a compact product brief

Before substantial UI work, establish:

- product identity and audience
- primary user job
- top three user actions
- navigation model
- content hierarchy and density
- visual direction and existing references
- target devices and orientations
- accessibility requirements
- online/offline expectations
- permission requirements
- states and recovery paths
- explicit anti-patterns to avoid

For a new nontrivial product, compare two different structural layouts before selecting one. Do not compare only two color palettes.

## Anti-AI-slop mobile gate

Reject and revise a screen when:

- the main purpose or next action is unclear
- the phone screenshot looks like a shrunken desktop website
- every region is a rounded card
- the screen uses generic hero copy or invented promises
- fake metrics, reviews, users, bookings, revenue, or activity are shown as real
- essential text is tiny or low contrast
- bottom actions are hidden by the keyboard or home indicator
- a tab bar has too many unreadable destinations
- icons are unlabeled or mixed from incompatible styles
- controls are decorative or dead
- the design uses glass, blur, glows, gradients, blobs, particles, or shadows without a product reason
- animations delay common actions or compete with content
- empty, error, offline, or denied states are boilerplate and do not help recovery
- the design could be reused for five unrelated products by changing only the logo, colors, and nouns

Cards, gradients, bold colors, rounded controls, and animation are allowed when they support a defensible product identity and remain readable, accessible, performant, and useful.

## Stage 4: map the complete behavior

For each important screen and action, map:

- first use
- populated state
- loading state
- empty state
- validation state
- error state
- offline state
- disabled state
- permission-denied state
- success state
- back and dismiss behavior
- refresh and lifecycle behavior
- persistence after app restart
- deep link or notification entry where relevant

Trace every feature through:

```text
screen entry
→ user action
→ client validation
→ server validation
→ authorization
→ persistence or external operation
→ confirmed result
→ visible feedback
→ retry or recovery
→ refresh, back, restart, reconnect, and duplicate-action behavior
```

For every mutation identify:

- authoritative source of truth
- invariant owner
- stable identifier
- authorization rule
- validation and size limits
- concurrency and duplicate-submit behavior
- retry and idempotency policy
- failure and rollback behavior
- user-visible completion condition

Do not display confirmed success before the authoritative operation succeeds. If the app is offline, label pending local work and explain when it will synchronize. Do not silently discard user input or queued work.

## Stage 5: build the mobile structure

Use platform-appropriate structure:

- native stack navigation for hierarchical tasks
- bottom navigation only for a small number of top-level destinations
- navigation rails or split views on larger windows where appropriate
- real lists with virtualization for long collections
- plain sections, rows, forms, and tables where they are clearer than cards
- sheets and dialogs only when the task benefits from a temporary surface
- visible titles, clear back behavior, and predictable dismissal

Support:

- safe areas and system bars
- status bar, notch, Dynamic Island, cutouts, and home indicator
- portrait and landscape where relevant
- tablets, foldables, split-screen, and resizable windows where relevant
- content reflow at large font sizes
- touch targets around 44–48 logical units where practical
- keyboard avoidance and scroll-to-focused-field behavior
- content that can be reached without relying on hover
- focus order and screen-reader semantics

Do not use fixed screen heights that break under keyboard, browser chrome, split-screen, or font scaling. For mobile web, prefer `dvh` and safe-area insets where appropriate.

## Platform-specific requirements

### React Native and Expo

- Inspect the Expo SDK, React Native version, app config, router/navigation, native modules, and build profile.
- Use `View`, `Text`, `Pressable`, `TextInput`, `FlatList`, `SectionList`, and compatible native libraries unless the project already has a vetted design system.
- Use React Native accessibility props and roles rather than web-only ARIA patterns.
- Verify deep links, hardware/system Back, gestures, keyboard avoidance, font scaling, and screen-reader labels.
- Use platform-compatible animation and gesture libraries only when justified and installed correctly.
- Test camera, location, notification, biometric, file, and permission-denial paths when relevant.
- Do not assume React Native Web behavior proves iOS or Android behavior.

### iOS native

- Follow Apple navigation, toolbar, sheet, safe-area, Dynamic Type, VoiceOver, and system interaction conventions.
- Respect keyboard, return-key behavior, swipe-back, modal dismissal, orientation, and home-indicator areas.
- Use semantic accessibility labels, traits, hints, and focus order.
- Test increased text sizes, VoiceOver, contrast, and permission denial.

### Android native

- Follow Android adaptive navigation, system-bar, edge-to-edge, Back, font-scale, and lifecycle conventions.
- Support TalkBack, large fonts, orientation, configuration changes, and larger screens where relevant.
- Use platform-appropriate dialogs, sheets, navigation, and permission flows.
- Test Back-stack behavior, recreation, keyboard/insets, and offline/reconnect behavior.

### Mobile web and PWA

- Preserve real URLs, browser history, refresh, deep links, shareability, and semantic HTML.
- Use correct buttons, links, form controls, labels, and focus behavior.
- Handle iOS Safari and Android Chrome differences where supported.
- Test browser Back, keyboard visibility, safe-area padding, viewport changes, install mode, online/offline, stale data, reconnect, and retry.
- Do not claim installability, push notifications, background sync, or offline writes without target-browser evidence.

## Secure mobile implementation

Never place private credentials, service-role keys, signing keys, or privileged tokens in the app bundle, frontend code, URLs, screenshots, logs, or committed configuration.

For sensitive features:

- authenticate every protected operation
- authorize on the server, not only by hiding UI
- isolate records by user, organization, event, or tenant
- validate payloads on the server
- enforce file type, size, ownership, and visibility for uploads
- use safe storage and signed access where needed
- protect payment and booking operations from duplicate submission
- avoid raw provider errors in the UI
- avoid unsafe redirects, injection, SSRF, and unsanitized external content
- audit important administrative and financial actions without logging sensitive content
- handle session expiry and revoked permissions clearly

## Motion and interaction

Animate only for:

- spatial continuity
- cause and effect
- progress
- meaningful feedback

Prefer transform and opacity. Keep common interactions fast. Avoid global transition rules, layout-heavy animation, large blur effects, continuous decorative loops, and motion that blocks reading or action.

Respect reduced-motion settings. The reduced-motion state must still communicate the same state change and result.

For gestures, verify:

- touch target
- gesture direction and threshold
- scroll conflict
- cancellation
- velocity and continuity
- keyboard interaction
- screen-reader alternative
- failure and recovery

## Writing and content

Use product vocabulary, not generic marketing copy. Labels should describe the action. Errors should explain what happened and what the user can do next. Offline and pending states must be truthful. Do not fill empty screens with invented content.

Remove repetitive, inflated, vague, or formulaic writing without changing the product’s meaning. Keep important content readable and localizable. Account for long names, translations, RTL where relevant, dates, currencies, and pluralization.

## Verification matrix

Run the smallest sufficient proof for the target.

### Functional

- launch and primary navigation
- primary happy path
- invalid input
- loading and retry
- empty results
- network timeout or failure
- repeated fast taps and duplicate submission
- app restart and persistence
- back/dismiss behavior
- permission granted and denied
- offline and reconnect when supported
- deep link or notification entry when relevant

### Visual and responsive

- compact phone
- larger phone
- tablet or larger window when supported
- portrait and landscape when supported
- long content and long names
- large font or Dynamic Type
- dark mode and high contrast when supported
- focused input and open keyboard
- scrolled state
- loading, error, empty, offline, and success state

### Accessibility

- VoiceOver on iOS or TalkBack on Android where available
- semantic labels and roles
- focus order and focus visibility
- touch target size
- text scaling and reflow
- contrast
- reduced motion
- keyboard or switch-access alternatives where relevant

### Engineering

- type checking or compilation
- linting
- unit and integration tests
- production build or platform bundle
- migration and rollback safety where applicable
- dependency and secret review
- authorization and data-isolation tests for changed boundaries

If a simulator, physical device, browser, or platform is unavailable, mark the check `NOT RUN`. A web preview is not evidence of native iOS or Android behavior.

## Completion report

Use this format:

```text
Implemented
- [behavior and screens changed]
- [data, API, persistence, permissions, or platform changes]
- [new dependencies, if any, and why]

Design decisions
- [three product-specific mobile decisions]
- [generic pattern rejected]

Verified
- [build/typecheck/lint/test] — PASS / FAIL / NOT RUN
- [primary user journey] — PASS / FAIL / NOT RUN
- [iOS device/simulator] — PASS / FAIL / NOT RUN
- [Android device/emulator] — PASS / FAIL / NOT RUN
- [mobile browser/PWA] — PASS / FAIL / NOT RUN
- [keyboard/accessibility/font scaling] — PASS / FAIL / NOT RUN
- [offline/permission/error states] — PASS / FAIL / NOT RUN

Remaining
- [material risk, blocker, or untested platform]
```

Never claim production-ready, secure, fully tested, offline-capable, native-compatible, or cross-platform-compatible without the corresponding evidence.

Stop when the requested mobile product behavior is complete and verified. Do not add speculative features or unrelated cleanup.
