# Motion and interaction standards

## Should it animate?

Every animation must serve one of four purposes: spatial continuity, cause/effect, progress, or appropriate feedback. For extremely frequent interactions (command palette and keyboard workflows), prefer no entry delay. If a user repeats a motion many times a day, shorten or remove it.

## Movement defaults

- Prefer transitions on `transform` and `opacity`. Avoid animating layout or expensive blur unless profiling shows it is safe.
- Use duration and easing appropriate to the action. Simple hover/press often feels right around 100–200ms; major surface changes may take longer where justified. There is no mandatory universal duration.
- Entrance should feel responsive rather than starting slowly. Do not use huge scales or translate elements across unrelated regions.
- Use transform origins that reflect actual triggers for popovers. Dialogs generally stay visually centered.
- Preserve layout continuity. If a list item moves, help the eye track it, but do not animate every table update.
- `prefers-reduced-motion: reduce` must remove nonessential movement while retaining state changes and context.
- Pause or limit background movement, avoid autoplay motion that distracts from primary content.

## Specialized interactions

### Sonner

Mount once. Toast after real result, use warning for recoverable issues and error for failure. Avoid redundant success toasts when the UI already makes success clear. Time-sensitive outcomes may need inline persistent feedback rather than a transient toast.

### Drawers / bottom sheets

Test drag/swipe on touch devices, scroll interaction, overlay dismissal, input focus, backdrop clicks, escape, nested layers and safe-area height. Focus moves inside on open and returns to trigger on close. Confirm accessible title/description. Use the installed library's exact API.

### Command menu / cmdk

Test open/close keyboard shortcut, escape, focus return, arrow navigation, enter selection, no-results state, filtering, screen-reader label and conflicts with text inputs. Use explicit unique values for items. Do not intercept native browser shortcuts unnecessarily.

### NumberFlow

Enable only for data that changes and benefits from temporal continuity. Plain currency text is sufficient for static receipts and financial records. Account for motion reduction, locale and unsupported numeral systems.

### Loading and optimistic updates

Use optimistic updates only if rollback and error recovery are implemented. Do not claim an action happened until the backend confirms. Show skeletons for true pending content only. Avoid spinners that never resolve.

## Performance gate

Profile costly animation if interactions stutter. Avoid global `transition-all`, huge composited layers, backdrop filters on whole screens, multiple looping particles and unnecessary `will-change`. Check mobile hardware/CPU throttling when available. If an effect doesn't demonstrably improve comprehension or feedback, remove it.
