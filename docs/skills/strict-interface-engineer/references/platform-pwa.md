# Mobile web and PWA quality

PWAs are websites that can offer install and offline capabilities. They are not native applications. A native-looking visual shell is insufficient; preserve browser navigation, shareability and accessibility.

## Must inspect

Framework, manifest, icons, viewport meta, service worker setup, installability, browser support assumptions, caching strategy, auth persistence, online/offline data model, forms, sticky bars and safe areas.

## Mobile web rules

- Use `dvh`/appropriate viewport units instead of fragile fixed `100vh` assumptions for full-height layouts where supported.
- Respect `env(safe-area-inset-*)` when running edge-to-edge or standalone mode, while avoiding double padding.
- Ensure focused input is not covered by the on-screen keyboard or sticky bottom CTA.
- Prefer readable form control text (often at least 16 CSS px for iOS input zoom behavior); don't make labels tiny to fit a mockup.
- Avoid hover-only controls, delayed tap feedback and sticky hover states on touch.
- Use correct semantic buttons, inputs and anchors; keep browser Back history functional.
- Keep installs optional and explain platform-specific limitations. Never claim push notifications, background sync or offline writes work without explicit tests on the target browser.
- Offline caching and stale data are different. Label sync state, avoid acting on stale values as current, and handle conflicts when reconnecting.
- Test iOS Safari and Android Chrome if supported, not only desktop browser resizing.
- Design app-like navigation that still has clear routes and accessible recovery; don't trap the user in a modal sheet stack.

## PWA visual acceptance

The UI must be comfortable to touch and read, handle browser chrome and standalone mode, avoid bottom content overlap, and keep actions visible when the keyboard is open. A bottom tab bar is optional, not a mandatory definition of a mobile app.

## PWA verification

1. Compact widths and short viewport.
2. Safari/Chrome where available, ordinary tab and standalone installed mode when requested.
3. Soft keyboard visibility, input scroll, focus and submit.
4. Browser Back, refresh, deep link and shareable routes.
5. Offline entry, retry, stale-state warning and reconnect if offline is promised.
6. Notification permissions only if actual feature exists, never decorative toggles.
7. Accessibility with touch exploration, keyboard and reduced motion.

If any test environment is unavailable, record it under NOT RUN.
