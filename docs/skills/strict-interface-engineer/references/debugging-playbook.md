# Debugging playbook

Use this approach when a website fails, UI looks wrong, or a component integration breaks.

## 1. Reproduce

Record exact route, action, browser, viewport, current user/role, expected result, actual result, and first observable failure. Read error logs and browser console; do not rely solely on the visual symptom.

## 2. Trace the boundary

- Component import issue: compare alias, installed path, dependency and export.
- Build error: inspect version mismatch, named exports, `use client`, typecheck and JSX.
- Styling issue: inspect global CSS order, theme provider, Tailwind version, duplicate styles, CSS specificity and portal scope.
- Overlay issue: inspect stacking contexts, parent overflow, portal position, focus trap and iOS safe areas.
- Hydration error: inspect server/client conditional rendering, browser-only APIs, date/time/locale output and DOM structure.
- Backend failure: inspect actual request, server logs, auth headers/cookies, schema validation, permissions and RLS.
- Toast failure: inspect whether one Toaster is mounted, whether the handler is client-side and whether a promise settles.
- Animation stutter: inspect layout thrashing, large repaints, filters, looping effects and device CPU.

## 3. Test the smallest hypothesis

Make one scoped change and reproduce the failing case. Avoid random CSS patching or blanket dependency upgrades. If a third-party component is buggy, inspect its source and documented API before changing internals.

## 4. Regression test

Test adjacent routes and related controls. For instance, a drawer fix should not break dialog focus or body scroll, and a global style change should not alter buttons throughout the site unexpectedly.

## 5. Report

Describe root cause, exact fix, affected paths, executed test evidence, and any remaining risk. If root cause is uncertain, mark it as hypothesis rather than fact.
