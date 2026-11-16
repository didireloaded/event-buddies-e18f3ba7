# Native mobile design and engineering

Covers Expo/React Native, SwiftUI/UIKit and Android Compose/Views. Use official SDK documentation for the specific installed version. Do not introduce a new navigation or UI framework just because it appears in a tutorial.

## Native is a different medium

A native app is not a 390px web page. It must respect the operating system's navigation, input, gestures, accessibility, lifecycle, permissions, haptics, system bars and safe areas. Preserve a cross-platform brand but allow iOS and Android to differ where users expect them to.

## Platform classification

- **Expo/React Native**: inspect `app.json`/`app.config.*`, `package.json`, routing, dependencies, React Native/Expo SDK versions, native modules and navigation. Expo Router is often appropriate for existing Expo Router projects; follow project conventions rather than switching blindly.
- **iOS native**: inspect Xcode project, deployment target, SwiftUI vs UIKit, navigation ownership, `Assets.xcassets`, design tokens and accessibility.
- **Android native**: inspect Gradle, Kotlin/Compose versions, navigation, themes, window insets and Android API support.
- **Multi-platform app**: list code and patterns safe to share and those requiring platform components. Keep platform divergence explicit rather than buried under brittle conditionals.

## Native mobile layout rules

1. Determine content order by thumb use, task priority and screen size, not a desktop grid.
2. Use native stack/tab navigation when appropriate. Use bottom navigation for a small set of **top-level** destinations, not every subpage or action. Adapt to larger screens where a rail, sidebar or split layout fits better.
3. Respect status bars, cutouts, home indicators, gesture areas, orientation, tablets and split-screen windows. Do not put critical controls beneath system chrome.
4. Support on-screen keyboard. Inputs, validation and submit controls must remain reachable. Test keyboard avoidance and scroll-to-field on both major platforms.
5. Use scalable system font sizing (`fontScale`, Dynamic Type, Android font scale as applicable). Text must reflow without clipped rows and fixed heights.
6. Provide comfortable touch targets, usually around 44–48 logical units for primary touch interactions where feasible. This is an internal quality target, not a claim that one exact size is required by every platform/spec.
7. Show clear navigation titles, back behavior, system permissions and dismiss paths.
8. Prefer real lists and platform-appropriate virtualization for long content, not giant non-virtualized `ScrollView` trees.
9. Make scrolling feel natural: avoid nested scroll conflicts, bottom sheets blocking lists and accidental swipe-to-dismiss while editing.
10. Adapt to device appearance settings and increased contrast where supported; do not hardcode text colors without theme meaning.
11. Preserve core tasks when offline if requirements demand it, and show reliable sync/conflict states. No fake persistence.
12. Avoid text-heavy onboarding, repeated confirmation dialogs and unnecessary modal journeys.

## iOS-specific checks

- Follow Apple HIG for content hierarchy, safe areas and familiar navigation/toolbar placement.
- Support Dynamic Type and accessibility labels/traits.
- Use native feeling page/sheet transitions and gestures when compatible with the app's structure, not just a translucent 'iOS-like' skin.
- Ensure interactive controls do not sit under the home indicator; account for keyboard, notch, Dynamic Island and landscape.
- Test VoiceOver, return-key actions, scroll indicators and dismissal. Do not disable system interaction behavior without purpose.

## Android-specific checks

- Follow Android adaptive layout and navigation guidance, including edge-to-edge, system bars and Back navigation.
- Test TalkBack, large font setting, RTL when relevant, orientation, dynamic color only if coherent with brand.
- Larger screens may use navigation rail, split pane or different content arrangement. Do not stretch phone UI across tablet width.
- Check permission flows, keyboard/insets, back-stack consistency and lifecycle/recreation where applicable.

## Expo/React Native details

- Inspect and honor Expo SDK and RN versions; API/dependency constraints change. Prefer compatible install mechanisms for Expo packages. Avoid blanket `latest` upgrades.
- Use native primitives (`View`, `Text`, `Pressable`, `TextInput`, `FlatList`, etc.) or a vetted React Native design system. DOM-based shadcn, Radix Themes, `cmdk`, Sonner and Magic UI web packages should **not** be imported into native screens.
- Expo Router and React Navigation can solve navigation, but follow existing project routing and exact-version docs. Test deep links and hardware/system Back.
- Use accessibility props and roles specific to RN, not web-only HTML `aria` guesses.
- For animation, prefer lightweight built-in approaches or a compatible native motion/gesture library only where justified. Check JS/UI thread performance and reduced-motion preferences.
- Avoid 'web-only' CSS, `window` APIs and DOM assumptions in native modules. If using React Native for Web, isolate platform differences and test every target.
- For camera, location, notifications, biometrics and files, implement permission, denial, fallback and simulator-unavailable states.

## Native visual quality gate

Reject if: the phone screenshot could be a shrunk website, status bar overlaps content, bottom controls collide with the home indicator, virtual keyboard hides form completion, tab labels are unreadable, gestures are ambiguous, a whole screen is nested cards, or giant unused whitespace hides the main task.

## Native verification matrix

| Dimension | Evidence |
| --- | --- |
| Functional | Actual tap, navigation, data and back-flow verified |
| Visual | At least a compact phone and a larger device/tablet if target includes it |
| Keyboard | Numeric/text keyboard, focused field visible, form submission usable |
| Accessibility | Screen reader labels, dynamic type/font scaling, contrast, touch size |
| Platform | iOS and Android separately when both are supported |
| System | Insets, status bar, permission denial, orientation and reconnect as relevant |
| Performance | List/gesture/transition smoothness on real or simulated target |

If simulator/physical device is inaccessible, report **NOT RUN**. Do not claim native testing from a web preview.

## Official anchors

- Expo routing: https://docs.expo.dev/develop/app-navigation/
- Expo Router: https://docs.expo.dev/router/introduction/
- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Apple layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Android adaptive navigation: https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
