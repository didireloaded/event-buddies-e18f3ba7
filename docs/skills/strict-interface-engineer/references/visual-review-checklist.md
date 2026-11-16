# Visual design acceptance checklist

This is a quality control sheet for *rendered* UI, not an excuse to judge the code only by screenshots. Use alongside `anti-ai-slop-gate.md`.

## Evidence to capture

- Relevant screen at the principal target device size and at least one alternate width or size class.
- Any key scrolled state, empty/loading/error state and one interaction state such as an opened menu, focused input or sheet.
- For native, iOS and Android evidence separately if both are targets. For PWA, browser and standalone modes when available.
- Real content or clearly labeled fixtures. Use edge cases including long titles, no results, large counts and large font sizes.
- Note what you could **not** inspect. Never fabricate screenshot review.

## Visual rubric, 0–3 per area

0 means clearly broken/generic; 1 means weak; 2 means acceptable; 3 means deliberate and strong.

| Dimension | 0 / fail example | 3 / target example |
| --- | --- | --- |
| Product identity | Same starter template across unrelated domains | Distinct content structure and brand voice |
| Information hierarchy | User cannot find primary action | Primary task is immediate and supported by layout |
| Typography | Tiny, low-contrast, random weights | Legible, disciplined, purposeful hierarchy |
| Layout and spacing | Card overload, uneven rhythm, clipped elements | Spacing and grouping communicate structure |
| Imagery and authenticity | Stock filler and fake client content | Relevant, licensed and correctly cropped assets |
| Navigation and interaction | Dead/hidden controls, confusing destination | Discoverable model with predictable state |
| Responsiveness/native fit | Desktop shrunk to phone, system overlap | Intentionally adapted navigation and density |
| Accessibility/inclusion | Focus missing, text cut, motion unavoidable | Keyboard/screen-reader and size settings supported |
| Motion and finish | Everywhere animation, jank and delays | Motion reinforces cause/effect and performs well |
| Edge-state design | Generic empty or false success | Useful, branded and actionable states |

**Interpretation:** A screen must have no hard-stop issue. Use the score to identify what to improve, not to falsely certify subjective 'production readiness'. A high total does not excuse a critical failing dimension.

## Mandatory inspection questions

1. Can the user say what this screen is for after a glance?
2. Is the next action obvious without reading a wall of text?
3. Is it clearly designed for *this* product rather than an AI default?
4. Is the typography readable at actual physical size and larger text settings?
5. Does the content order work on mobile and wide screens?
6. Do dialogs, navigation, toasts, sheets and forms behave properly?
7. Are there unnecessary cards, pills, glows, shadows or animated surfaces?
8. Are the real failure states reassuring and actionable instead of fake?
9. Is the brand consistent in different screens and device modes?
10. Can a reviewer identify 3 intentional choices and why they were made?

## Required audit report format

For each major revised screen, report:

| Screen / state | Issue observed | Severity | Specific fix | Verification |
| --- | --- | --- | --- | --- |
| Example: mobile booking review | Bottom CTA overlaps system inset | Blocker | Add inset-aware bottom container | Retest real/simulated phone |

Then state the top three product-specific design choices, the primary generic pattern rejected and evidence of actual device/browser inspection. If screenshots or device testing were not available, explicitly say **NOT INSPECTED**.

## Mandatory 'break the UI' cases

- One-letter and unusually long names
- Long local-language translations / RTL where applicable
- Empty/null data, zero, large counts, long currencies
- No network, slow network, denied permissions
- Very short phone screen, landscape, tablet/window resize
- System font scaled up, high contrast, reduced motion
- Repeated fast taps, duplicate submission, expired session
- Screen-reader focus, hardware keyboard and Back/escape
