# Anti-AI-slop quality gate

Read before any greenfield screen, redesign, design audit or visual acceptance decision. The purpose is **not** to make every interface monochrome or minimal. It is to reject generic, incoherent or poorly adapted visual decisions. A striking editorial page, playful consumer mobile app and dense enterprise admin can all pass.

## The primary question

**Could this design be reused unchanged for five unrelated products simply by changing the logo, colors and text?** If yes, the interface lacks specific intent. Reconsider its hierarchy, structure, real content and identity before decoration.

## Mandatory pre-design evidence

Before producing substantial UI, the agent must identify:
1. What product and user this is for, which job matters most, and what the user wants to complete.
2. Existing brand system or reference material. Which details distinguish it from other products?
3. Real content/data types, real visuals or clearly labeled placeholders, and the content density needed.
4. Target device, environment and input method (touch, mouse, keyboard, assistive tech).
5. One primary action and navigation model per core view.
6. Two possible structural directions for nontrivial new products and a reason to select one.
7. What **not** to use. Include specific reference/brand conflicts, not just 'no AI slop'.

## 25 signals to detect and fix

| # | Signal | Better behavior |
| --- | --- | --- |
| 1 | Every product gets a giant centered headline above three feature cards | Choose structure based on the actual information hierarchy and task |
| 2 | Purple/blue gradients are used without brand justification | Establish a deliberate palette from the real brand |
| 3 | All surfaces use glass blur, glowing borders or heavy drop shadows | Limit visual effects to a few functional moments or remove them |
| 4 | Every region is inside a rounded card, including headings and instructions | Use plain sections, rows, lists and tables where appropriate |
| 5 | Random floating blobs, orbs, background grids or animated particles | Remove decoration that contributes no meaning or hierarchy |
| 6 | Identical cards repeat with only an icon and two lines of copy changed | Differentiate content by priority, structure and genuine interaction |
| 7 | Overly generic slogans or invented promises | Use specific, plain-language information and real user vocabulary |
| 8 | Imaginary testimonials, client logos, bookings, activity or revenue charts | Use verified content or plainly labeled design fixtures |
| 9 | A random font is chosen solely because it looks 'modern' | Pick typography that supports brand, language and legibility |
| 10 | Tiny 9–11px labels or gray-on-gray essential text | Increase type scale and contrast; assess real reading conditions |
| 11 | All corners are extremely rounded, including unrelated controls | Define a limited, intentional shape language |
| 12 | Every button is a large pill and every label is uppercase | Create hierarchy with appropriate sizes and labels |
| 13 | Icon packs/styles are mixed or oversized without purpose | Use one coherent icon style and intentional sizes |
| 14 | Every section has an entrance animation or hover movement | Animate meaningful state, not repeated decorative reveals |
| 15 | Oversized whitespace pushes important content below the fold | Balance breathing room with task visibility and density |
| 16 | Uneven spacing and arbitrary margin values on near-identical components | Use spacing tokens and optically align elements |
| 17 | Hero images are generic, tonally wrong or badly cropped | Select authentic and relevant assets with responsive art direction |
| 18 | Charts and counters exist to look like a dashboard, not support decisions | Display real metrics with labels, context and meaningful comparison |
| 19 | Mobile UI is desktop UI squeezed into a narrow column | Redesign hierarchy, controls and navigation for touch and viewport |
| 20 | A web PWA copies an iOS app shell but breaks browser history or keyboard | Keep real web navigation and browser semantics |
| 21 | Too many competing CTAs, tabs, filters and badges in the first viewport | Establish one primary action and progressive disclosure |
| 22 | Buttons are dead or navigation links do not navigate | Implement actual behavior or remove the control |
| 23 | The empty and error states look like default boilerplate | Design task-specific guidance, retry and recovery |
| 24 | A modal, drawer or popover appears where a plain page would be clearer | Use the interaction that best matches context and frequency |
| 25 | The design looks polished at one screenshot size but breaks under long text, dark mode or large fonts | Test realistic variation and adaptive layout |

## Hard-stop violations

Do **not** approve the screen when any of the following remain:
- A primary task cannot be found or completed.
- Essential text is unreadable, truncated or obscured.
- The UI visibly ignores supplied brand/reference direction without justification.
- Layout fails on the intended phone or desktop size.
- Decorative motion interferes with usability or ignores reduced motion.
- Fake data or fake success is represented as production behavior.
- Accessibility prevents normal navigation or screen-reader use on critical flows.
- An AI-generated 'polished' design cannot explain its structure in terms of user needs.

## The three-pass design review

### Pass 1: grayscale/wireframe pass

Inspect layout without decorative effects. Can a new user understand purpose, hierarchy and next action? If not, changing colors will not fix the design. Fix composition, grouping, navigation and content order.

### Pass 2: visual identity pass

Inspect typography, imagery, real brand cues, color, borders, radius, whitespace, iconography and density. Can a reviewer identify what kind of product it is? Do the surfaces feel coherent? Are the visual choices traceable to a brief or reference?

### Pass 3: interaction and stress pass

Test navigation, focus, mobile keyboard, small/large screens, empty/loading/failure, long names, large text, offline if supported, reduced motion and slow network. A screenshot is not a product.

## What is allowed

Gradients, cards, shadows, glass, split heroes, giant headings, parallax and animation are **not inherently bad**. Use them when they support an intentional brand or experience, and pass contrast, performance and accessibility checks. Strict means deliberate, not boring.

## Product-specific patterns

- **Creative studio / production**: let real work, cinematography and editorial pacing drive layout. Avoid generic startup icon cards and fake 'projects delivered' counters.
- **Travel/tourism**: real destination imagery, clear service pathways and trustworthy booking details, not random landscape backgrounds and vague discovery copy.
- **Operations/admin**: favor legible data, tables, actions and status clarity over oversized metric cards. Critical states should be visible first.
- **Mobile booking/service**: clear one-handed task entry, obvious progress, native-aware input, concise labels and retained context. Avoid long wizard forms unless genuinely required.
- **Consumer/social**: content first, predictable navigation, readable typography, responsive feedback and sensible thumb reach. Avoid novelty interaction for core tasks.

## Anti-slop acceptance note

Before marking design ready, state the **three most product-specific design decisions**, what generic alternative was rejected, and which screenshots/device states were inspected. If this explanation would apply word-for-word to any other product, the review is too generic.
