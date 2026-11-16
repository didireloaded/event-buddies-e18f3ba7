# Independent source register

Checked 2026-11-08. These URLs are reference material, not dependencies that must all be installed. Documentation and version support can change. Verify the installed package before implementing.

| Resource | URL | Verified role and cautions |
| --- | --- | --- |
| shadcn components | https://ui.shadcn.com/docs/components | Current component catalog; different foundations may expose different APIs |
| shadcn CLI | https://ui.shadcn.com/docs/cli | Init, add, info, preset, diff and other commands. Use project-aware runner |
| shadcn official skill | https://ui.shadcn.com/docs/skills | Official agent skill exists; reads project config and provides exact patterns |
| shadcn MCP | https://ui.shadcn.com/docs/mcp | Registry discovery and component installation |
| shadcn Next installation | https://ui.shadcn.com/docs/installation/next | Scaffold with `init -t next`; avoid resetting existing apps |
| shadcn Radix drawer | https://ui.shadcn.com/docs/components/radix/drawer | Vaul-backed on the documented Radix variant |
| shadcn Base drawer | https://ui.shadcn.com/docs/components/base/drawer | Base UI variant; its API differs from Vaul |
| shadcn Sonner | https://ui.shadcn.com/docs/components/radix/sonner | Toast wrapper with root Toaster for Radix-based setups |
| Radix Themes | https://www.radix-ui.com/themes/docs/overview/getting-started | Pre-styled library, stylesheet and Theme provider; not identical to primitives |
| Sonner | https://sonner.emilkowal.ski/ | React toast notifications and promise/action patterns |
| Vaul | https://github.com/emilkowalski/vaul | Original README explicitly marked unmaintained |
| cmdk | https://github.com/dip/cmdk | Composable command menu and accessible combobox; React client behavior |
| NumberFlow | https://number-flow.barvian.me/ | Animated numbers, format, group, hooks and documented limitations |
| Emil skills | https://github.com/emilkowalski/skills | Modular UI design, animation, mobile-native, break-ui, Sonner and library selection skills |
| Beautiful UI (user link) | https://www.beautifului.dev/ | AI-native interface patterns, separate domain from `beautiful-ui.dev` |
| Beautiful UI licence (user domain) | https://www.beautifului.dev/license | MIT text visible when checked, retain attribution requirements |
| RareUI | https://rareui.in/ | Animated React UI components and examples |
| RareUI CLI | https://rareui.in/docs/installation/cli | `rareui init`, `add`, `diff`; init may edit components.json |
| Magic UI | https://magicui.design/ | Animated UI components, Motion and shadcn-friendly integrations |
| Magic UI MCP | https://magicui.design/docs/mcp | Official MCP and `@magicui` registry examples |
| 21st.dev | https://21st.dev/ | Component, theme, template and AI UI discovery |
| 21st MCP/CLI | https://21st.dev/mcp | CLI login, agent skill and MCP; older Magic MCP rebranded |
| 21st Codex plugin | https://github.com/21st-dev/codex-plugin | Remote MCP and Codex config guidance |

## Name collision to avoid

`https://www.beautifului.dev/` is the user-supplied AI-interface site. `https://beautiful-ui.dev/` with a hyphen hosts a different component system with a different licence, setup and commercial conditions. Do not infer one site's licence or install instructions from the other.

## Video verification limitation

Original provided video: https://www.youtube.com/watch?v=zsCGS-Yzjnw

The video URL was supplied as the origin of the links, but its page/transcript was not accessible from the available browsing interface during this review. Its spoken advice and demonstrated commands therefore were **not verified**. The skill is grounded in the linked official documentation and repositories checked independently. Revisit the video transcript if the user provides it.

## Source trust rules

- Official documentation is authoritative for API syntax, but not a substitute for reviewing the actual installed version.
- GitHub README maintenance statements inform risk, not a promise of package future behavior.
- Registry metadata and demo claims do not prove accessibility, security or performance. Inspect the actual source and test it.
- Keep paid/private source files out of distributed agent skills and public repos.

## Mobile and cross-platform source anchors added 2026-11-08

| Resource | URL | Use |
| --- | --- | --- |
| Expo app navigation | https://docs.expo.dev/develop/app-navigation/ | Router vs Navigation; inspect existing Expo setup |
| Expo Router guide | https://docs.expo.dev/router/introduction/ | File-based universal routing, native/web differences |
| Expo web development | https://docs.expo.dev/workflow/web/ | React Native Web vs web-only DOM components |
| Apple HIG | https://developer.apple.com/design/human-interface-guidelines/ | iOS/iPadOS conventions, accessibility, platform feel |
| Apple adaptive layout | https://developer.apple.com/design/human-interface-guidelines/layout | Visual hierarchy, safe areas, size changes, Dynamic Type |
| Android layout and navigation | https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns | Adaptive navigation and different screen sizes |
| W3C WCAG 2.2 enhanced target size | https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced | 44 CSS px enhanced criterion; distinguish from minimum criterion and native platform guidance |

Do not treat example package versions or template names in these pages as static. Check compatibility with the actual project and current official documentation before installation.
