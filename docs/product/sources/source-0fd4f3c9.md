# Same UI. Same Colors. Now Make It Feel Like iOS.

The good news: **iOS feel is not a redesign — it's a skin.** Roughly 80% of "this feels native" comes from four things: **typography, spacing rhythm, material blur, and motion.** You keep every screen and every color you have. You change how they're rendered. Here's the exact spec.

---

## 1. Typography — The Biggest Lever (Do This First)

Your current type is a web type scale. iOS has its own, and it's instantly recognizable. Swap the font stack and the scale, and it will feel 40% more native before you touch anything else.

**Font stack** (put in `index.css` / Tailwind config):
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
  "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

**The iOS type scale** — use these exact sizes. Tailwind arbitrary values:

| Style | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|
| Large Title | 34 / 41 | 700 | `-0.02em` | Screen headers |
| Title 2 | 22 / 28 | 700 | `-0.01em` | Section headers |
| Headline | 17 / 22 | 600 | `-0.01em` | Card titles |
| Body | 17 / 22 | 400 | `0` | Paragraphs, list text |
| Subhead | 15 / 20 | 400 | `0` | Secondary text |
| Footnote | 13 / 18 | 400 | `0` | Metadata, timestamps |
| Caption | 12 / 16 | 400 | `0` | Labels |
| Caption 2 | 11 / 13 | 500 | `0` | Tab bar labels |

```tsx
<h1 className="text-[34px] leading-[41px] font-bold tracking-[-0.02em]">Sound of Summer</h1>
<p  className="text-[17px] leading-[22px] tracking-normal">Your crew</p>
<span className="text-[13px] leading-[18px] text-black/50">2m ago</span>
```

**Three rules that make type feel native:**
1. **Tight tracking on anything ≥22px, zero on body.** That's the #1 tell.
2. **Numbers get `tabular-nums`** — `font-variant-numeric: tabular-nums` on times, counts, ETAs.
3. **Never use 14px or 16px body text.** iOS body is 17. That single change is huge.

---

## 2. Layout Rhythm — The 4pt Grid + Inset Grouping

iOS is aggressively consistent: **16–20px side margins, 4pt vertical rhythm, inset grouped lists.** Your layout probably has web-standard padding (24/32px, dense spacing). Tighten it.

```tsx
<main className="px-4">           {/* 16px margins — not 24, not 32 */}
  <section className="space-y-2"> {/* 8px gaps between list groups */}
```

**The signature iOS component you must adopt — inset grouped list:**
```tsx
<div className="mx-4 overflow-hidden rounded-[12px] bg-white divide-y divide-black/[0.06]">
  <button className="flex w-full items-center justify-between px-4 py-3 active:bg-black/[0.04] transition-colors">
    <span className="text-[17px]">Your crew</span>
    <span className="text-[15px] text-black/40">3 people</span>
  </button>
  <button className="flex w-full items-center justify-between px-4 py-3 active:bg-black/[0.04] transition-colors">
    <span className="text-[17px]">Meetup point</span>
    <span className="text-[15px] text-black/40">Ferris wheel</span>
  </button>
</div>
```
That rounded-12 white card on a slightly gray background **is** iOS. If your app currently uses cards on white with borders, flip it: `bg-[#F2F2F7]` page background (iOS systemGroupedBackground), white cards on top.

> **Keep your palette — just add the two iOS system grays for hierarchy.** `#F2F2F7` (page bg) and `#FFFFFF` (card). Those aren't new brand colors, they're native structure. This alone sells "iOS app."

---

## 3. The Chrome — Tab Bar + Large Title Nav Bar

These two components are the reason people believe an app is an app. Build them and it's done.

**Bottom tab bar** (blurred material, 49px + safe area):
```tsx
<nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.08] bg-white/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
  <div className="flex h-[49px] items-stretch">
    {tabs.map(t => (
      <button key={t.id}
        className="flex flex-1 flex-col items-center justify-center gap-[2px] active:opacity-50 transition-opacity">
        <t.Icon size={24} strokeWidth={1.75} className={active ? "text-[var(--accent)]" : "text-black/40"} />
        <span className="text-[10px] font-medium leading-none tracking-[-0.01em]">{t.label}</span>
      </button>
    ))}
  </div>
</nav>
```
Body needs `pb-[calc(49px+env(safe-area-inset-bottom))]` so content never hides under it.

**Large title nav bar that collapses on scroll** — the most recognizable iOS motion there is:
```tsx
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 32);
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);

<header className={cn(
  "sticky top-0 z-40 px-4 pt-[env(safe-area-inset-top)]",
  "transition-[background-color,backdrop-filter,box-shadow] duration-200",
  scrolled && "bg-white/80 backdrop-blur-xl border-b border-black/[0.08]"
)}>
  <h1 className={cn(
    "font-bold tracking-[-0.02em] transition-all duration-200 origin-left",
    scrolled ? "text-[17px] leading-[22px] py-3" : "text-[34px] leading-[41px] pt-2 pb-4"
  )}>
    Sound of Summer
  </h1>
</header>
```
That font shrink + blur-on-scroll is the entire "native iOS" illusion. Ship it.

**Icons:** SF Symbols aren't licensable for web. Use **`lucide-react` at `strokeWidth={1.75}` with round caps** — closest free match. Avoid filled/emoji icons; they break the illusion instantly.

---

## 4. Materials — Blur, Hairlines, and Almost No Shadows

iOS doesn't use drop shadows for structure. It uses **translucent blur layers and 0.5–1px hairlines.**

| Element | iOS treatment |
|---|---|
| Nav bar / tab bar | `bg-white/80 backdrop-blur-xl` + `border-black/[0.08]` |
| Bottom sheet | `bg-white/95 backdrop-blur-2xl` |
| Modal scrim | `bg-black/40 backdrop-blur-[2px]` |
| Cards | White, **no shadow**, hairline border or none |
| Floating buttons | One soft shadow only: `shadow-[0_8px_24px_rgba(0,0,0,0.12)]` |

**Rule:** if you have more than 2 shadow declarations in the app, delete them. Web-ness lives in shadows.

---

## 5. Components to Restyle (Same Content, Native Skins)

**Buttons — iOS has exactly three:**
```tsx
// Filled (primary)
className="h-12 w-full rounded-full bg-[var(--accent)] text-[17px] font-semibold text-white
           active:scale-[0.97] transition-transform duration-150"

// Tinted (secondary)
className="h-11 rounded-full bg-[var(--accent)]/12 px-5 text-[17px] font-semibold text-[var(--accent)]
           active:scale-[0.97] transition-transform"

// Plain (tertiary)
className="text-[17px] text-[var(--accent)] active:opacity-50"
```
Never rectangular buttons. Never borders on filled buttons. Always a press-scale.

**Bottom sheet with grabber** (replace full-page navigations):
```tsx
<div className="fixed inset-0 z-50">
  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={close} />
  <div className="absolute inset-x-0 bottom-0 rounded-t-[20px] bg-white pb-[env(safe-area-inset-bottom)]
                  shadow-[0_-8px_40px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom duration-300">
    <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-black/20" />
    <div className="px-4 pt-4">{children}</div>
  </div>
</div>
```

**Segmented control** (for Schedule / Map / Crew filters):
```tsx
<div className="mx-4 flex rounded-[9px] bg-black/[0.06] p-[2px]">
  {options.map(o => (
    <button className={cn(
      "flex-1 rounded-[7px] py-[6px] text-[13px] font-medium transition-all duration-200",
      active === o ? "bg-white shadow-sm" : "text-black/60"
    )}>{o}</button>
  ))}
</div>
```

**Switch** — build the iOS toggle (rounded-full track, white thumb, spring), not a checkbox. **Toast** — bottom-anchored above tab bar, not top. **Avatars** — always circular, 1px inner ring `ring-1 ring-black/5`.

---

## 6. Motion — Springs, Not Eases

iOS motion is spring-based and fast. In Lovable, install Framer Motion (`npm i framer-motion` — ask Lovable to do it).

```tsx
const spring = { type: "spring", stiffness: 400, damping: 32 };
const sheetSpring = { type: "spring", stiffness: 300, damping: 30 };
```
- **Press:** `active:scale-[0.97]` + `transition-transform duration-150` on every tappable.
- **Sheets:** slide up 300ms spring.
- **Lists:** staggered fade-in, 40ms delay per row.
- **Dots/pins:** gentle pulse loop (`animate-[pulse_2.5s_ease-in-out_infinite]` but subtle — opacity 1→0.6).
- **Respect reduced motion:** wrap in `@media (prefers-reduced-motion)`.

**Durations: 150ms for taps, 250–350ms for transitions. Nothing longer, ever.** Long animations are the #1 web tell.

---

## 7. The "It's Actually an App" Tricks

```html
<!-- index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
<meta name="theme-color" content="#F2F2F7" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Event Buddies" />
```

```css
html {
  -webkit-tap-highlight-color: transparent;   /* kills the gray flash — huge */
  overscroll-behavior-y: none;                 /* no rubber-band on the page */
  -webkit-text-size-adjust: 100%;
}
body { -webkit-overflow-scrolling: touch; }
*:not(input):not(textarea) { user-select: none; -webkit-user-select: none; }
::-webkit-scrollbar { display: none; }         /* horizontal rails must not show */
```

**Desktop:** frame it in a phone. On desktop this is the difference between "web page" and "app preview."
```tsx
<div className="min-h-screen bg-neutral-200 flex items-center justify-center p-8">
  <div className="h-[844px] w-[390px] overflow-hidden rounded-[54px] ring-[10px] ring-black shadow-2xl">
    <App />
  </div>
</div>
```

---

## 8. What Will Break the Illusion — Kill These

- ❌ **Visible scrollbars** (especially horizontal rails)
- ❌ **Material-style ripples** or bordered buttons
- ❌ **Hover states on touch** — use `active:` only, wrap hovers in `@media (hover:hover)`
- ❌ **`border-radius: 4px` / `8px` on cards** — iOS uses 10, 12, 16, 20, and full pill. Pick from that set only.
- ❌ **Stacked drop shadows** on cards
- ❌ **Body text at 14/16px**
- ❌ **Emoji as icons**
- ❌ **Animations over 400ms**
- ❌ **Toasts at the top of the screen**
- ❌ **Anything that scrolls the whole page horizontally**
- ❌ **The "Demo companion" footer** — still the loudest non-native signal on the page. Delete it.

---

## 9. Lovable Prompt Snippets (Paste These)

> "Update the global font stack to `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif` with `-webkit-font-smoothing: antialiased`. Replace all body text with a 17px/22px iOS type scale, headers at 34px/41px bold with `-0.02em` tracking. Add `font-variant-numeric: tabular-nums` to all times, counts, and ETAs."

> "Add a fixed iOS-style bottom tab bar (49px tall, `bg-white/80 backdrop-blur-xl`, hairline top border, `pb-[env(safe-area-inset-bottom)]`) with Map, Crew, Chat, Schedule, Profile. Icons: lucide-react at strokeWidth 1.75. Labels 10px medium. Add matching bottom padding to page content."

> "Add a sticky large-title nav bar on every screen that shrinks from 34px bold to 17px semibold and gains `bg-white/80 backdrop-blur-xl` plus a hairline border after 32px of scroll. Add `viewport-fit=cover` meta and `-webkit-tap-highlight-color: transparent`."

> "Convert all cards to iOS inset grouped lists: page background `#F2F2F7`, cards white `rounded-[12px] mx-4`, rows separated by `divide-black/[0.06]`, rows use `active:bg-black/[0.04]` with 150ms transition. Remove all drop shadows from cards."

> "Replace all buttons with iOS styles: primary is `h-12 rounded-full` filled with the accent color and `active:scale-[0.97]`; secondary is tinted at 12% opacity; tertiary is plain text. No borders, no ripples."

> "Install framer-motion. Convert all modals to bottom sheets: `rounded-t-[20px]`, grabber handle, slide-up spring (stiffness 300, damping 30), scrim `bg-black/40 backdrop-blur-[2px]`. Add 150ms press-scale feedback to every tappable element."

---

## 10. Priority Checklist (Half a Day, Realistic)

| # | Change | Impact | Time |
|---|---|---|---|
| 1 | Font stack + iOS type scale | 🔥🔥🔥 | 30 min |
| 2 | `-webkit-tap-highlight-color: transparent` + hide scrollbars | 🔥🔥 | 5 min |
| 3 | Page bg `#F2F2F7`, cards white, kill shadows | 🔥🔥🔥 | 30 min |
| 4 | Bottom tab bar with blur | 🔥🔥🔥 | 45 min |
| 5 | Collapsing large title header | 🔥🔥🔥 | 45 min |
| 6 | Inset grouped lists | 🔥🔥 | 30 min |
| 7 | Pill buttons + `active:scale` everywhere | 🔥🔥 | 20 min |
| 8 | Bottom sheets replacing modals | 🔥🔥 | 45 min |
| 9 | Safe-area insets + `viewport-fit=cover` | 🔥🔥 | 10 min |
| 10 | Device frame on desktop | 🔥 | 15 min |
| 11 | **Delete the "Demo companion" footer** | 🔥🔥🔥 | 1 min |

**Do 1, 2, 3, 11 in the first hour.** Those four alone will make it read as iOS. Everything after that is polish on a foundation that already feels right.

The colors and layouts stay. You're just speaking Apple's language instead of the web's — and that's a vocabulary, not a redesign.
