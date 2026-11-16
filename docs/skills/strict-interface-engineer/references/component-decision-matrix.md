# Component decision matrix

## Always classify the job first

Do not choose a UI library by popularity. Select the smallest reliable system that matches the interaction and existing framework. For any new dependency, check current docs, maintenance status, licence, React compatibility, SSR/Next support, CSS collisions, bundle and a11y behavior.

| Need | First choice | Alternative or special case | Avoid |
| --- | --- | --- | --- |
| Basic controls, forms, dialogs, tabs | Already installed shadcn primitives | Radix Themes when the whole product deliberately uses Themes | Mixing multiple base systems without design normalization |
| Unstyled low-level behavior | Existing shadcn foundation | Radix Primitives, Base UI, React Aria per the project | Rebuilding focus traps or roving focus yourself |
| Opinionated ready-styled UI | Existing app's design system | Radix Themes as an intentional system | Installing Themes only to get one Button |
| Toast feedback | Existing toast provider | Sonner; Base UI toast where its stack uses it | Multiple root toasters, promises that never finish |
| Mobile bottom drawer | Installed shadcn Drawer matching foundation | Maintain a known working Vaul implementation only when justified | New reliance on unmaintained Vaul by default |
| Search / command menu | shadcn Command | `cmdk` for custom composing | Hand-rolled keyboard and aria behavior |
| Animated changing values | `@number-flow/react` | `Intl.NumberFormat` plain text for static or reduced-motion content | Fake data, animation that obscures accessibility |
| Polished animations | CSS for simple states | Motion only when choreographed behavior needs it | global `transition-all` and over-animated dashboards |
| Landing-page effects | shadcn + custom CSS | Magic UI with reviewed code | Animating every heading, large shader payloads |
| Specialty visual component | existing component | RareUI or 21st.dev piece with compatibility & licence review | Copying arbitrary remote code into the app |
| AI-native agent interface patterns | existing product pattern | `www.beautifului.dev` examples | Copying examples whose behavior does not fit UX |

## Source-specific notes

### shadcn/ui

The CLI copies component source into the project. Its configuration, aliases, icons, style and foundation are project-specific. Prefer official shadcn skill for exact rules. `init`, `add`, `docs`, `search`, `info`, `preset`, `mcp` and `apply` have different effects; read current help before executing destructive commands. Third-party items can be installed via compatible registries, then audited.

**Important distinction**: shadcn may use Base UI, Radix or React Aria. Components with the same name can have different props. Never copy code from a Base UI example into a Radix component without verifying the actual API.

### Radix Themes vs primitives

`@radix-ui/themes` is pre-styled with its own Theme provider and CSS. Radix Primitives provide accessible low-level behavior, with styling owned by the application. A shadcn project based on Radix primitives does not require the Themes package. If Themes is used, import its CSS once at the global root, wrap the correct portion in `<Theme>`, and audit visual token collisions.

### Sonner

Use to notify a user about events, preferably from the outcome of real async operations. One toaster at app layout. `toast.success`, `.error`, `.promise`, `.loading` are available per documentation. `toast.promise` must settle; do not mask failure. Keep feedback concise and actionable.

### Vaul

The original author labels the repository unmaintained. Some shadcn variants still incorporate Vaul, and other variants have migrated to Base UI drawers. Audit the installed version, do not assume every `Drawer` is the same. Do not force-remigrate stable existing apps just for novelty.

### cmdk

The user-provided `github.com/dip/cmdk` documentation shows an accessible command menu with filtering, grouping, a dialog variant and keyboard navigation. It is a client-side React control. For large datasets, consider server-side searching/virtualization rather than rendering huge item collections. Shadcn Command may wrap cmdk; inspect actual installed source.

### NumberFlow

Use to animate transitions of meaningful changing numbers. `import NumberFlow from '@number-flow/react'`. Always check locale and reduced motion. Its current docs warn about scientific/engineering notation and RTL/non-Latin digits; use plain formatted text when unsupported. Do not animate a count that the backend never provided.

### Emil Kowalski's skills

`emilkowalski/skills` is a collection of design engineering, motion, testing, mobile-native and library-selection skills. Good complementary modules include `pick-ui-library`, `animate`, `review-animations`, `animation-performance`, `mobile-native`, `break-ui`, and `ask-sonner`. Install only those your agent understands and can follow; do not replace this skill's verification gate with vague style advice.

### Magic UI

Animated React/TypeScript/Tailwind/Motion components and a shadcn registry. Suitable as occasional accents on landing pages and editorial pages, not as a foundation for every input, table or admin panel. Inspect shaders, animation cost, reduced-motion behavior and their source before use.

### RareUI

Has a separate `rareui` CLI (`init`, `add`, `diff`) optimized for React/Next and Tailwind. Don't run `rareui init` over an existing `components.json` before reviewing what it changes. Prefer adding individual components after reviewing licence and dependencies.

### Beautiful UI: two different domains

- User-provided `https://www.beautifului.dev/` offers AI-native interface examples including chat, approval cards, streaming text, prompt bars, tables and thinking states. Its `/license` shows MIT as reviewed.
- `https://beautiful-ui.dev/` (hyphen) is a **different** site with Notchset components, distinct setup and a Free/Pro licence. Never mix its installation or commercial rights with the user-provided non-hyphen URL.

### 21st.dev

A searchable component library and AI/MCP integration. Use discovery to evaluate candidates, retrieve actual code only when useful, and review it before committing. The old "Magic MCP" name in many tutorials has been superseded by the 21st MCP branding. Retrieval caps, authentication options and commands can change, so verify docs before installing.

## Dependency evaluation score

Record a yes/no for: (1) solves requested user task, (2) compatible with installed stack, (3) licence allows target deployment, (4) maintained enough for use, (5) accessible, (6) responsive and touch-safe, (7) no unwanted telemetry/secrets, (8) acceptable bundle and runtime overhead. If any of 1–3 or 7 fail, reject. If 4–6 or 8 raise concerns, document mitigation or prefer a different option.

## Mandatory platform compatibility gate

The library choices in the above table apply to **web UI** unless their own documentation explicitly supports native. For React Native/Expo, use React Native components and compatible native libraries. For SwiftUI/Android Compose use platform components. **Do not** import DOM-first shadcn/ui, Radix Themes, Sonner, cmdk, Vaul, Magic UI or NumberFlow web packages directly into a native view. Sharing design intent does not require sharing incompatible implementation.

A cross-platform product must choose components per runtime and verify separately on web, iOS and Android. See `platform-mobile.md`, `platform-web.md`, `platform-pwa.md`.
