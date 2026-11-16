# Repository UI engineering rules

Use the `strict-interface-engineer` skill for all website, web application, PWA and native mobile UI work. Read `SKILL.md` plus its platform and anti-AI-slop references before changing screens.

## First inspect

Identify the target platform(s), actual user flows, framework, package manager, component system, brand, existing code and tests. Do not replace working architecture or initialize a new framework without explicit reason. Distinguish web UI packages from native libraries.

## Design policy

No generic AI-looking UI. Do not default to glowing gradients, huge generic hero sections, glass panels, meaningless bento grids, excessive pills, card overload, tiny labels, invented testimonials or pointless animations. Match the product's real content and visual identity. Typography, layout, navigation and spacing must be intentional. Colors and effects are permitted when justified by the brand and proven usable.

## Platform policy

Websites need semantic markup, real links, responsive editorial hierarchy and appropriate SEO. Web apps need legible data and productive task flows. PWAs need safe areas, correct viewport/keyboard handling and browser history. Native apps need platform-correct navigation, gestures, system bars, keyboard avoidance, dynamic type and real device tests where possible.

## Behavior policy

No dead controls, fake submissions, fabricated metrics or success before server confirmation. Use real state and server validation. Handle empty/error/loading/offline/permission states. Protect private tokens and verify external component code/licences before adding it.

## Required review

Inspect rendered screens at the target device sizes, including one empty/error or interaction state. Run available typecheck/lint/tests/build and relevant web or native flows. State exact results; mark unavailable checks as NOT RUN. A functioning UI may still fail the anti-AI-slop visual gate.
