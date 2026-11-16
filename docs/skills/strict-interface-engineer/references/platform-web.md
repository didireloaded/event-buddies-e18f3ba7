# Websites and web applications

The web remains a document and navigation platform, even when the UI is highly app-like. Correct HTML, URLs, history, keyboard, SEO and adaptive layout matter. Distinguish public editorial/marketing sites from internal tools and transactional web apps.

## Public website requirements

- Lead with actual product purpose and concrete visitor action. Avoid template headlines, meaningless KPIs and fake reviews.
- Prioritize readable headlines, navigation, content architecture, image selection/art direction and credible calls to action over excessive components.
- Use semantic headings, links for navigation, buttons for actions, meaningful alt text, proper metadata/OG information, canonical routes and sitemap when applicable.
- Optimize real images: responsive sizes, aspect ratio, lazy-load below fold, avoid visual shift, keep hero image relevant and copyright-safe.
- Consider SEO/indexability if the website needs discovery, and don't hide all meaningful text in a client-only shell by accident.
- At mobile widths, intentionally reorganize content. A narrow desktop header is not a responsive mobile navigation system.

## Web application requirements

- Design around the user's actual workload. Dense information may need a table or editable list, not a grid of large cards.
- Navigation should be stable and predictable. Search, filters, selection, sorting and pagination must reflect real state.
- Error, empty, loading, permission-denied and save states are part of the interface.
- Support keyboard workflows, focus visibility, appropriate shortcuts, accessible overlays and browser Back behavior.
- Handle session expiry and authorization failures gracefully without displaying fake success.

## Responsive layout checks

- Use content-driven breakpoints, fluid spacing, constrained reading measure and intentional layouts at compact, medium and wide sizes.
- Test approximately 320/375, 768, 1024 and 1440 CSS px for relevant routes and more when content dictates.
- Watch for overflow, clipped table actions, tiny tap targets, sticky headers hiding anchor locations, dialog height, horizontal scroll and long labels.
- Where data tables need horizontal scroll on small screens, provide an accessible/obvious pattern or alternative view. Do not chop off critical columns without an explicit content strategy.
- Test a narrow desktop window as well as mobile emulation. Real devices can behave differently.

## Component decision sequence

1. Inspect existing primitives and the project's design tokens.
2. If shadcn is in the repo, inspect its `components.json`, `base`, icon package and installed component implementation. Fetch current docs before JSX.
3. Use Radix Themes only when intentionally adopting that styled web system. It isn't required just because some shadcn components use Radix primitives.
4. Add specialized packages only for a specific job: Sonner (feedback), cmdk (command), NumberFlow (changing numbers), compatible drawer, etc.
5. Source Magic UI, RareUI, 21st.dev, Beautiful UI as optional inspiration/components after licence/security/API review, not mandatory page construction.
6. Prefer simple CSS for simple motion. Check performance and reduced motion.

## Strict code checks

- Preserve server/client boundaries in Next.js and validate on the server.
- Do not hardcode secrets in frontend bundles or use `NEXT_PUBLIC_` for private credentials.
- Semantic markup and native browser behavior first. Don't replace link/button semantics with arbitrary clickable divs.
- No inaccessible canvas-only primary controls, mystery icons without labels, or hover-only interactions.
- Avoid overgeneralized reusable components that become complex prop soup. Build small clear UI compositions.

## Visual failure patterns

- Every route is a template hero + features + testimonial carousel whether or not the content supports it.
- Dark glass dashboard with tiny text, neon metrics and no prioritized actions.
- A booking form disguised as a slideshow with poor back navigation and lost state.
- Generic AI-sounding paragraphs fill whitespace rather than helping a visitor decide.

## Web source anchors

- shadcn catalog: https://ui.shadcn.com/docs/components
- Radix Themes: https://www.radix-ui.com/themes/docs/overview/getting-started
- WCAG target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- WCAG enhanced target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced
