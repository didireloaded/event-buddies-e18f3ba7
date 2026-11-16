---
name: strict-interface-engineer
description: Strict, anti-AI-slop design and implementation skill for real websites, responsive web apps/PWAs, and native mobile apps (React Native/Expo, SwiftUI, Jetpack Compose). Use for new product UI, redesigns, mobile UX, component selection, design reviews, animations, app screens, and frontend debugging. Inspects the real project and product before coding, adapts to each platform, avoids generic templated visuals, and demands visual and functional verification before claiming completion.
---

# Strict Interface Engineer

Build distinctive, usable, production-oriented digital products for **websites, web apps, PWAs, and native mobile apps**. Prevent the recognisable look and behavior of generic AI-generated interfaces. This is a **design-quality gate plus engineering workflow**, not a requirement to install a particular component library. A working interface can still be rejected for poor design. A beautiful interface can still be rejected for broken behavior.

## 0. Scope, routing and precedence

Apply to building, reviewing, redesigning, debugging or extending any website or mobile app UI, including shared cross-platform products. Obey explicit user requirements and preserve an existing product's visual identity and architecture unless the task requests a redesign. Read official documentation for the **installed** versions. Never install all the example libraries by default.

**First classify the surface**:

| Target | Typical stacks | Correct design approach |
| --- | --- | --- |
| Public website / marketing / editorial | Next.js, React, Astro, HTML/CSS | Content, narrative, responsive structure, SEO, fast loading, true links |
| Web application / admin dashboard | Next.js, React, Vue etc. | Information architecture, data density, task efficiency, keyboard, semantic states |
| Mobile web / PWA | Web tech in a mobile browser or installed | Real web semantics, safe areas, touch/keyboard behavior, offline/install realities |
| Native app, iOS and Android | React Native/Expo | Native components, gestures, real device testing, platform conventions |
| Native iOS | SwiftUI / UIKit | Apple HIG, Dynamic Type, system navigation, safe-area and accessibility |
| Native Android | Jetpack Compose / Views | Material guidance, adaptive layout, Back behavior, accessibility, system bars |
| Shared web and native | Expo Router / RN Web, or separate apps | Share domain logic and tokens, not inappropriate component implementations |

**Cross-platform does not mean identical UI everywhere.** Preserve brand and user goals while respecting each platform's navigation, input, density, and system expectations. shadcn/ui, Radix Themes, Sonner, cmdk, and web-only animation libraries are **not drop-in React Native components**.

Read the relevant references only when needed:
- `references/anti-ai-slop-gate.md` (mandatory for new UI, redesign and visual reviews)
- `references/platform-web.md` for websites and web apps
- `references/platform-mobile.md` for React Native/Expo, SwiftUI and Android
- `references/platform-pwa.md` for installed/mobile web apps
- `references/visual-review-checklist.md` for screenshots, design acceptance, scoring and hard fails
- `references/design-system.md` for token systems and existing-brand preservation
- `references/component-decision-matrix.md` for web libraries and compatibility
- `references/motion-interactions.md` for purposeful motion and interactions
- `references/testing-acceptance.md` for tests and release evidence
- `references/architecture-security.md` for auth, data, secrets, and performance
- `references/mcp-and-installation.md` for optional registries and MCP setup
- `references/debugging-playbook.md` for fault isolation
- `references/source-register.md` for documentation links and verification limitations

## 1. The iron rules

1. **Design the actual product, never a generic template.** Identify who uses it, why, in which environment, and with what real content. A restaurant, travel agency, cinematography studio, learner's licence app and banking dashboard must not look like the same product with different nouns.
2. **Inspect before modifying.** Read repo, relevant screens, routing, packages, lockfile, tokens, types, tests and platform details. Preserve existing work, content and brand. No destructive re-init or blanket dependency changes.
3. **Do not blindly imitate AI inspiration.** Study visual references for layout logic, type hierarchy, navigation, imagery, spacing and interaction behavior. Never clone an entire site without rights or invent copyrighted assets.
4. **Visual identity must be defensible.** Set type system, spacing, imagery, colors, shape language, density and platform adaptation from the brief, not from the model's default aesthetics. Each decorative choice must have a reason.
5. **No fake functionality.** A control must do what its label promises. No fake success, fake analytics, decorative search, empty checkout, invented prices, fake testimonials, dead navigation, or phantom persistence.
6. **No unreviewed UI-library imports.** Check project foundation and official docs; use existing components first. Web UI packages are not automatically compatible with native. Evaluate licence, safety, maintenance and payload before new dependencies.
7. **Respect device behavior.** No desktop layout squeezed into a phone. No mobile tab bar copied onto desktop without adaptation. Handle safe areas, scrolling, keyboard, accessibility, and system navigation per platform.
8. **Readable beats fashionable.** Critical text must be legible, navigation obvious and information discoverable. Never shrink everything to 9–11px because a screenshot looked 'premium'.
9. **Motion must earn its place.** Animate state, spatial relationships or feedback, not every section. Respect reduced-motion/assistive settings. Do not turn frequently repeated controls into slow animations.
10. **Ship only with evidence.** Run available checks and inspect actual rendered screens, not only JSX. Report what ran and what could not run. Never claim 'production-ready' based on appearance alone.

## 2. Required workflow

### Stage A — Inspect the product and classify platform

Identify target, user journeys, constraints, screen sizes, brand references, existing source assets, content, languages and required online/offline behavior. In an existing project inspect actual UI and architecture before writing changes. Detect stack, package manager, version, routing, state, auth, dependencies and available test/runtime tools. Note unverified assumptions.

For shared platforms, write down which elements can be shared (types, API client, domain logic, tokens) and which should be platform-specific (navigation, touch gestures, input fields, accessibility semantics, sheets, keyboard, camera or permissions).

### Stage B — Write a design brief before coding

Create a compact brief with **product identity**, **primary audience**, **top three tasks**, **primary navigation**, **content priority**, **visual references**, **accessibility needs**, **target devices**, and **anti-patterns to avoid**. Pick a single coherent visual direction. For nontrivial greenfield projects, compare at least two genuinely different *layouts* before choosing one, not two color variations of the same template. If the user provides exact references, analyse them and retain what matters. Do not invent content just to fill a template.

### Stage C — Map every important state

For each screen or route map first-use, populated, empty, loading, error, validation, offline, disabled, permission-denied and success states as applicable. Map entry and exit points, back behavior, persistence, and async outcomes. Navigation is part of the design, not an afterthought.

### Stage D — Build tokens, structure and components

Define or reuse type sizes and weights, spacing, color semantics, radii, borders, elevations, imagery treatment, breakpoints or size classes, light/dark behavior and motion tokens. Use semantic colors and avoid one-off constants everywhere. Build the structural layout first and inspect it **without effects**. Use proven accessible building blocks suitable for the platform. Add a new dependency only when it solves a specific requirement better than what is already installed.

### Stage E — Implement true behavior

Build complete vertical slices: navigation, input, client state, validation, server/data flows, failure handling, loading, success and tests. Buttons perform actions; links navigate. Never claim external integration works because a placeholder UI renders. Secure data and secrets. Handle double submission, focus, back navigation, keyboard and permissions.

### Stage F — Visual anti-slop audit

Read `references/anti-ai-slop-gate.md` and review every changed major screen. **Fail the design** if its structure is recognisably generic, typography too small, every region is a card, random effects compete for attention, copy is filler, or mobile and desktop look like resized duplicates without platform logic. Refine composition and real content before tweaking decoration. See `references/visual-review-checklist.md`.

### Stage G — Verify on rendered surfaces

- Website: run typecheck, lint, tests, build as available. Inspect desktop/tablet/mobile using browser screenshots and real interactions. Verify SEO, responsive layout, focus/keyboard, console and network.
- PWA: also verify real touch layout, on-screen keyboard, viewport height, safe area, install path if requested, offline/reconnect and storage behavior.
- React Native/Expo: check TypeScript, lint, tests, compatible bundle/start, and actual simulator/physical device behavior for iOS and Android when available; inspect navigation, gestures, keyboard, system bars, permissions, font scaling and accessibility.
- SwiftUI/Android native: build/test for the supported target and inspect simulator/emulator behavior. Do not substitute web screenshots for native evidence.
- If tooling/devices unavailable, clearly label these checks **NOT RUN** and never assert they passed.

### Stage H — Deliver a truthful report

Show what changed, what design direction was chosen and why, where the code lives, actual verification output, remaining risks and untested items. Stop and repair critical slop, broken routes, inaccessible interactions, fake success or exposed secrets before calling the task complete.

## 3. Design acceptance contract

**Hard fails**: severe readability problems, inaccessible primary actions, brandless template design despite available references, fake content presented as real, unusable mobile layout, random effects that obscure interaction, navigation dead ends, exposed credentials, critical functional failures, or claims of tests never run.

**Review dimensions**, each assessed against the product's purpose rather than a universal visual style:
- Product-specific identity and purposeful composition
- Content hierarchy, readability and density
- Navigation and actual interaction design
- Responsive/adaptive quality and native fit
- Motion restraint, accessibility and performance
- Quality of loading, empty, failure and completion states

**Reject and revise** any major screen with an unresolved hard fail. Visual review is a human judgment supported by screenshots and checklists, not an arbitrary numerical certificate.

## 4. Practical component selection

| Requirement | Web candidate | Native mobile candidate |
| --- | --- | --- |
| Basic inputs, dialogs, tabs | Existing design system, shadcn, Radix primitives/Base UI | Platform-appropriate React Native controls or installed RN UI system; SwiftUI/Compose components for native |
| Toast | Sonner / matching shadcn toaster | Installed native toast/banner or an accessible in-app status pattern |
| Search/command palette | shadcn Command / cmdk | Mobile search screen and native search interaction, not a desktop command palette copied verbatim |
| Bottom sheet | Installed web Drawer compatible with its base | Platform-appropriate sheet/gesture implementation with real device testing |
| Changing numbers | `@number-flow/react` if justified | Native number rendering or tested mobile animation equivalent, otherwise static formatted value |
| Decorative/marketing accents | Magic UI, RareUI, 21st.dev (reviewed) | Purpose-built native motion/effects only where it improves UX |
| Design reference | Beautiful UI, user-supplied examples, real products | Apple HIG, Android adaptive UI guidance, user references and platform patterns |

**Radix Themes** is a styled web system. **Radix primitives** may underpin shadcn web components. Do not assume either is part of React Native/Expo. **Vaul** is marked unmaintained upstream. Assess the installed web Drawer, not the package name alone. MCP servers are research and retrieval helpers, not automatic design authorities. Never hardcode an API key in repository, skill or frontend.

## 5. Examples of unacceptable outcomes

- A mobile booking app with a desktop dashboard squeezed into 375px and a row of six unreadable bottom tabs.
- A tourism website whose hero says “Elevate your journey” above three identical glowing cards and unrelated stock landscapes.
- A production studio website with fake shooting statistics, random neon purple effects and no recognizable identity.
- An event app where tapping “Book” changes a badge but never creates a booking.
- An admin page made entirely of cards when a well-structured table would be clearer.
- A mobile screen whose bottom CTA is covered by the system home indicator or virtual keyboard.

These examples are **patterns to reject**, not bans on particular colors, gradients, cards or animation. A brand may legitimately use any of these if they are intentional, meaningful and well implemented.

## 6. Default completion statement

Only when verified: describe the implemented functionality and specific visual/device tests that actually passed. Otherwise state incomplete areas, exact blockers and remaining verification. Never substitute confidence for evidence.
