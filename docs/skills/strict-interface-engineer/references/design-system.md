# Design system and anti-template standards

## Start with product context

Determine product category, audience, content, brand assets, desktop/mobile balance, visual references, accessibility needs, and whether the site is utility-focused, editorial, commerce-oriented or app-like. Reuse existing tokens when editing an existing product. No visual redesign without the user's brief.

## Token architecture

Keep a consistent single source of truth for:
- Color: `background`, `foreground`, `card`, `popover`, `muted`, `muted-foreground`, `primary`, `primary-foreground`, `secondary`, `accent`, `border`, `input`, `ring`, `destructive` plus explicitly named product states.
- Type: font families, font sizes, weights, line heights, letter spacing and text measure.
- Spacing: scale of consistent gaps and page gutters, not arbitrary per-element numbers.
- Radius and shadows: a small controlled set.
- Motion: duration, easing, reduced-motion handling and exit/enter conventions.
- Responsive layout: content-first grid, min/max widths, container sizes and safe-area rules.

Prefer OKLCH/theme variables and semantic Tailwind classes in shadcn. Never hardcode the same hex color repeatedly. Light and dark themes should come from coherent token sets, not manual `dark:` overrides on every component.

## Visual review criteria

- Typography reads comfortably without zoom. Body default is at least around 14–16px; avoid tiny action labels or important metadata.
- Headlines convey specific value. Avoid 'Elevate your experience', 'Reimagine the future' and vague slogan filler.
- Content structure comes before decoration. Let the page breathe without making it sparse to the point of uselessness.
- Use tables/lists where information is tabular or comparable. Use cards only when grouping distinct entities makes the screen easier to scan.
- Use real content and images supplied by the user or legally sourced. Avoid invented testimonials or logos.
- Constrain paragraphs to comfortable reading width, but let imagery and layouts feel intentional, not cookie-cutter.
- Use one primary navigation model, not overlapping tab bars, floating docks and nested sidebars without reason.
- Avoid many rounded rectangles with identical size and padding in every section.
- Use one purposeful dominant visual idea per page. Not every gradient, blur, mesh, marquee, beam, ticker and shadow at once.
- Design practical states with equal care: loading, empty, search-no-results, invalid input, validation, access denied, offline and confirmation.

## 'No AI slop' hard rejects

Reject generic purple neon gradients, glowing borders on every card, arbitrary glass surfaces, oversaturated color, fake dashboard activity, enormous hero numbers without context, identical three-card feature sections, repetitive rounded pills, floating geometry and animated backgrounds without meaning. Reject content that sounds like an ad rather than the product's normal voice.

## For mobile-web/native-feeling experiences

- Prefer a clear top-level task and obvious primary action.
- Minimize steps and reading burden. Do not make every interaction a modal wizard.
- Use comfortable touch regions and scroll areas that avoid nested-scroll traps.
- Use `dvh` units / safe area insets where appropriate. Avoid fixed `100vh` bugs and underlapping the iOS home indicator.
- Do not rely on hover for essential interactions. Ensure active/focus states are distinct.
- Avoid text inputs too small on iOS if they trigger unwanted zoom.
- Keep transitions fast and responsive to intent. Native-feeling means predictable behavior, not copying iOS surface styling indiscriminately.

## For admin and operational apps

Favor legible data density, actionable overview, consistent table interactions, informative status chips, search/filter/sort, auditability and error recovery. Avoid full-width copy that hides work needing attention. Prefer tables, summaries, plain sections and a restrained use of cards rather than a wall of dashboard cards.

## Design acceptance test

Ask: 'Can someone immediately tell what this page does, what they should do next, what state they are in, and whether their action succeeded?' If any answer is unclear, simplify before adding decoration.

## Cross-platform token policy

Share brand meaning (palette roles, typography intent, spacing rhythm, icon language and imagery art direction) across web and native, but implement it using each platform's theme mechanism. CSS variables and Tailwind classes are web mechanisms; SwiftUI Environment, Android Material theme and React Native styles need appropriate native tokens. Do not pretend the same CSS sheet can style React Native views. Support font scaling and platform accessibility contrast settings in addition to light/dark appearance.

For new native screens, read `platform-mobile.md`. For installed PWAs, read `platform-pwa.md`. The anti-AI-slop gate applies to all surfaces.
