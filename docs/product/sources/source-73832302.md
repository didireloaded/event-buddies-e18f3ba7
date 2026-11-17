# The Engineering & Product-Ops Layer (what nobody told you)

This is the stuff that doesn't show up in a design review and then kills the app two weeks before the festival. Verdict first: **your biggest risks are no longer visual — they're security, offline, notifications, and ownership.** Here's the list, brutal and ordered.

---

## 1. The Five Landmines (non-obvious, will bite you)

| # | Landmine | Brutal truth | Fix |
|---|---|---|---|
| 1 | **iOS web push is crippled** | On iOS, web push only works if the user **adds the app to their Home Screen** (iOS 16.4+). A plain Safari tab gets **zero notifications.** Your entire "nudge when crew arrives" plan dies silently on iPhone. | Detect iOS Safari, show a one-time "Add to Home Screen" instruction with a screenshot. Or plan a Capacitor wrapper later. **Do not promise push notifications in marketing until this is solved.** |
| 2 | **Env keys leak in client builds** | Anything prefixed `VITE_` is **public** in the JS bundle. If a Supabase **service role** key ever lands in a `VITE_` var, your whole database is writable by anyone who opens DevTools. | Only the **anon/public** key goes client-side. Service role stays server-side only. Grep the bundle before every deploy. |
| 3 | **No RLS = public database** | Lovable-generated Supabase apps frequently ship tables with Row Level Security **disabled**. Anyone can read every user, every pin, every message. | RLS **on, on every table**, before any public URL. Test with an anon key from a second account. |
| 4 | **Google Maps billing surprise** | Maps are free until they aren't. One viral weekend and you get a four-figure bill. | Use **MapLibre GL + MapTiler/OSM** or a static festival map image. Free-ish, offline-cacheable, no surprise invoice. |
| 5 | **"PWA on the App Store" is a lie people tell** | A web app cannot be listed on the iOS App Store. If your pitch says "download on the App Store," you need a native shell. | Say **"add to Home Screen"** until you actually wrap with Capacitor. Don't overpromise the store. |

---

## 2. Stack decisions — pick these, stop deliberating

| Concern | Decision | Why |
|---|---|---|
| Framework | React + Vite (what Lovable gives you) | Fine. Don't fight it. |
| Backend | **Supabase** (or Firebase) | Postgres + realtime + anonymous auth in one. Don't hand-roll. |
| Auth | **Anonymous sign-in first**, link to email/Apple/Google later | Guest-first is non-negotiable. Anonymous users get a UUID; upgrading is a one-tap link. |
| State | **TanStack Query** for server state + `useState`/Zustand for UI | Don't put server data in a global store. You'll regret it. |
| Offline cache | **IndexedDB via Dexie** + **Vite PWA plugin** (service worker) | Schedule, map tiles, queued messages, last-known crew pins. |
| Maps | **MapLibre GL** + MapTiler tiles; static venue image as fallback | Offline-capable, no billing cliff. |
| Location | Browser **Geolocation API**, `enableHighAccuracy: false`, `getCurrentPosition` **on demand only** | `watchPosition` is a battery furnace. Never run it continuously. |
| Push | **Web Push** now, note the iOS caveat; **Capacitor** later if you need real push | See landmine #1. |
| Analytics | **PostHog** or **Plausible** (privacy-friendly) | Track the funnel: open → onboarding complete → event selected → crew created → invite sent → pin dropped. |
| Errors | **Sentry** (free tier) | You will not be at the festival with 4,000 users. Sentry will. |
| Hosting | **Vercel/Netlify** + custom domain | Custom domain is a trust signal. `*.lovable.app` is not. |

---

## 3. Files your IDE must have (copy these)

### `AGENTS.md` or `.cursorrules` — the project brain
```md
# Event Buddies — project rules
Mobile-first festival crew app. React + Vite + Tailwind + Supabase.
iOS-native feel: -apple-system font, 17px body, radius ∈ {10,12,16,20,full},
≤2 shadows total, blur chrome, active:scale-[0.97], 150ms taps / 300ms transitions.
Keep existing colors and layout. iOS feel is a skin, not a redesign.

RULES
- Every screen: empty, loading, error, populated, offline. No blank labels.
- No permission prompt before value. Location = expiring pins, not tracking.
- Honest timestamps only ("4m ago"). Never fake liveness.
- Banned words: seamless, elevate, unleash, curated, immersive, vibrant,
  "get started", "welcome", "oops", "coming soon".
- Banned patterns: hero+CTA, screenshot carousels, purple gradients,
  shadows on cards, top-anchored toasts, emoji-as-nav-icons.
- One primary action per screen. TypeScript strict. No `any`.
- Never commit secrets. Only VITE_ anon/public keys client-side.
- RLS required on every Supabase table.

DONE WHEN = observable behaviour, not "looks good".
```

### `.env.example` (committed) + `.env.local` (never committed)
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
# NEVER put service_role, Stripe secret, or push private keys in VITE_ vars
```

### `tsconfig.json`
```json
{ "compilerOptions": { "strict": true, "noUncheckedIndexedAccess": true,
  "noUnusedLocals": true, "noUnusedParameters": true } }
```

### Tooling
- **ESLint + Prettier + Husky pre-commit** — lint + typecheck on every commit. Non-negotiable once you have real users.
- `.editorconfig` — 2-space, LF.
- **Pin versions** in `package.json`. Lovable upgrades can silently break you the night before the festival.

---

## 4. Project structure (keep it boring)
```
src/
  app/            routes, providers, layout
  features/
    onboarding/   steps, vibe picker
    events/       home, hub, lineup, info
    crew/         empty, create, invite, home, chat
    map/          canvas, pins, sheet
    profile/      sharing, privacy, settings
  components/ui/  Button, Sheet, Segmented, ListRow, Avatar
  lib/            supabase.ts, geo.ts, offline.ts, format.ts
  hooks/          useCrew, useSharing, useOnline, useEvent
  types/          database.ts (generated from Supabase)
```

**Rule:** a feature owns its screens, hooks, and types. No cross-feature imports except through `components/ui` and `lib`.

---

## 5. Security checklist (do this before the URL is public)

- [ ] **RLS on every table.** Users can only read their own crew, their own pins, their own messages. Test it with a second anonymous account.
- [ ] **No service role key in the client.** Grep the built bundle for `service_role` — it should return nothing.
- [ ] **Invite codes:** random 6–8 chars, **rate-limited** (e.g. 5 join attempts/min per IP), **expiring** (72h or event end). Otherwise people brute-force crew membership.
- [ ] **Location data:** store the *latest pin only*, not history. Delete pins at expiry (a cron or `pg_cron` job). If it's not stored, it can't leak.
- [ ] **Message/report abuse:** a `reports` table + block list from day one, even if the UI is minimal.
- [ ] **Rate-limit** crew creation, pin drops, and messages (Supabase Edge Functions or a simple counter table).
- [ ] **No PII in analytics.** Don't send names/emails to PostHog; use the user UUID.
- [ ] **Auth:** anonymous users must not be able to enumerate other users (`select * from profiles` should be scoped to crew).

**Brutal note:** a proximity-social app with a leaky database is not a bug — it's a headline. One screenshot of a stranger's location list and you're done.

---

## 6. Offline architecture (this is the feature, not the fallback)

```
Online   → live crew pins, realtime chat, fresh schedule
Unstable → last-known pins + "4m ago", optimistic sends, "sending…"
Offline  → cached schedule, static map image, queued actions,
           banner: "Offline — saved info. Actions will send when connected."
```

- **Service worker** (Vite PWA plugin): cache the shell, the event, the schedule, the map tiles.
- **IndexedDB queue** for messages and pin updates. Flush on reconnect. Show a visible "2 waiting to send" chip.
- **Never a spinner-forever.** Every network call has a timeout (8s) and a cached fallback.
- **Test it:** DevTools → Network → Offline → walk the whole app. If a screen breaks, fix it before launch.

---

## 7. Location & battery rules (hard)

- `getCurrentPosition` **on user action only** (`enableHighAccuracy: false`, `maximumAge: 60000`, `timeout: 8000`).
- **Never** `watchPosition` unless the user is actively on the map with sharing on.
- **Pins expire in 60 min.** A cron deletes them; the UI shows the countdown.
- **Ghost Mode** stops all writes immediately, not just the UI.
- **Test battery:** 30 min of active map use on a real phone. If it drops >10%, you have a problem.
- **Coarse is fine.** Round coordinates to ~3 decimal places (≈100m) server-side. "Which field" is enough; "which blade of grass" is a liability.

---

## 8. Notifications — the honest plan

| Platform | Reality |
|---|---|
| Android Chrome | Web push works well. |
| Desktop | Works, irrelevant. |
| **iOS Safari (tab)** | **No push. At all.** |
| **iOS (Home Screen PWA)** | Push works (16.4+), if you instructed them to install. |

**Plan:** one-time "Add to Home Screen" prompt after the user creates/joins a crew (with a screenshot of the Share menu). Until then, treat notifications as **Android + installed-iOS only**, and never make a core feature depend on them.

---

## 9. Maps — the practical spec

- **MapLibre GL** with a **MapTiler** free tier key (or OSM raster tiles).
- **Static venue image fallback** for offline — a festival map is a drawing anyway.
- Pins are your own layer (avatar dots, meetup flag), not the map provider's.
- **No Google Maps** unless you're ready for the bill and the API-key leak risk.
- **No crowd heatmaps.** You don't have the data, and it's creepy.

---

## 10. Testing & QA — at the venue, not the desk

- **Playwright** with `devices['iPhone 13']` viewport: onboarding, create crew, invite deep-link, drop pin, offline. Run on every deploy.
- **Real-device pass**, at minimum: iPhone Safari (tab + Home Screen), Android Chrome, one low-end Android.
- **Venue walk:** 3 phones, 3 people, at the actual location. Time a pin drop, measure accuracy, watch the battery. Do this **before** you build anything else on the map.
- **The 1am test:** can you find a friend in the dark, one-handed, at 20% battery, with no signal? If not, the feature isn't done.

---

## 11. Analytics — the six events that matter

```
onboarding_completed
event_selected
crew_created | crew_joined
invite_sent   ← your growth metric
pin_dropped
lost_someone_used  ← your value metric
```

If `invite_sent` is low, the growth loop is broken. If `lost_someone_used` is low, your product isn't the product you think it is. Watch those two above all else.

---

## 12. Legal & store — the boring stuff that blocks launch

- **Privacy policy + terms** — required by app stores and expected by users. Plain language, one page.
- **Location is sensitive data.** Say what you collect, why, how long, how to delete. Put it in the app ("Your data after the event" screen), not just a link.
- **Deletion path:** a real "Delete my data" that actually deletes. Required by GDPR-style rules and by trust.
- **Namibia:** no comprehensive data-protection act yet — **use a GDPR-style baseline** (consent, purpose limitation, deletion, breach plan). It's the safest and cheapest posture.
- **If you ever wrap with Capacitor:** Apple will ask *why background location* — have a written answer or don't request it.

---

## 13. Performance budget (mobile, 4G, mid-range Android)

| Metric | Target |
|---|---|
| Initial JS (gzip) | **< 200 KB** |
| LCP | **< 2.5s** on 4G |
| Images | WebP/AVIF, lazy, no hero video |
| Fonts | System fonts only (you already are — keep it) |
| Bundle check | `vite-bundle-visualizer` before every release |

A festival app that takes 6 seconds to load on a crowded tower is a deleted app.

---

## 14. Ownership & Git — the thing that saves you

- **Export the code from Lovable regularly and own a real GitHub repo.** Lovable is a builder, not a backup.
- **Never commit directly to `main`.** Branch → PR → review, even solo. Future-you will thank present-you.
- **Tag releases** (`v2026.1`) before each festival.
- **Back up Supabase** (daily backups on the paid tier, or a `pg_dump` cron). Losing crew data mid-festival is unrecoverable trust damage.
- **Custom domain + branded email** before you talk to any promoter. `*.lovable.app` undercuts the pitch.

---

## 15. The Pre-Launch Gate (all must be yes)

1. RLS on every table, tested from a second account.
2. No secrets in the client bundle.
3. Offline mode works for: home, event hub, schedule, map (static), chat (queued).
4. "Add to Home Screen" prompt shipped for iOS.
5. Every screen has a designed empty, error, and offline state.
6. Sentry + analytics live and receiving events.
7. Privacy policy + terms + delete-my-data all reachable.
8. Playwright e2e green on iPhone viewport.
9. Real-phone venue test done; battery measured.
10. Repo owned, backed up, tagged.

---

**The one sentence:** *Your design is nearly there — now make the database un-leakable, the app work with no signal, the notifications honest about iOS, the maps cheap, and the code yours — because those five things, not the shade of your accent color, decide whether this survives its first real festival.*
