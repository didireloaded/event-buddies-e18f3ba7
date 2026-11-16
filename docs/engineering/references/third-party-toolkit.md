Here is the full third-party toolkit, organized by what the app actually needs to survive a festival weekend, along with the exact Lovable prompts to wire each one in.

**The rule for all of them:** every key goes into a Supabase Edge Function secret or a `VITE_` env var that holds *only* a public/anon token. No service-role key, no REST API key, no private billing key ever touches the client bundle.

---

## The Full Toolkit (by priority)

| Priority | Tool | What it solves | Key type for Lovable |
|---|---|---|---|
| **P0** | **MapTiler + MapLibre** | The festival map (offline-capable, no Google billing cliff) | Public key — `VITE_MAPTILER_KEY` |
| **P0** | **OneSignal** | Push notifications: "Maya is at Main Stage," "Lost someone" alerts | App ID client-side, REST API key **server-side only** |
| **P1** | **react-qr-master** | Crew invite QR codes — festival-native, works at the gate | No key needed, pure client-side |
| **P1** | **Vercel OG (`@vercel/og`)** | The shareable **crew card** — your only viral artifact | No key, runs on Vercel Functions |
| **P1** | **PostHog** | Funnel analytics: onboarding → crew → invite → pin | `phc_` project token (public) |
| **P1** | **Sentry** | Crash/error tracking — you won't be at the festival with 4,000 users | `VITE_SENTRY_DSN` (public DSN) |
| **P2** | **RevenueCat Web SDK** | If you sell "Crew Pro" or paid meetup features | **Web Billing public key only** (`rcb_`), server webhook for entitlements |
| **P2** | **Twilio / SendGrid** | Optional SMS verification (POPIA-compliant ZA numbers) or transactional email | API keys **server-side only** |

---

## Integration Prompts (paste into Lovable, in this order)

### PROMPT 1 — MapTiler + MapLibre (the map that works offline)

```
Install maplibre-gl. Create a MapCanvas component that renders a MapTiler Cloud map via MapLibre GL JS.

1. Read the style URL from VITE_MAPTILER_STYLE_URL and the key from VITE_MAPTILER_KEY.
2. MapLibre GL JS v6 is ESM-only and loads its Web Worker from a URL. Configure the worker once before the first `new Map()` call, or the map renders blank.
3. Render three layers: static stage markers (from a local event JSON), crew pins (circle layer bound to Supabase pins data), and a meetup flag layer (accent color).
4. Offline fallback: if tiles fail, render a static event map image with pins overlaid, labeled "Map may be outdated."
5. Do not use Google Maps. MapTiler keys are client-side and will appear in the bundle — that is expected, but never put a service key there.
```

MapTiler’s SDK extends MapLibre GL JS, and the React integration is a thin wrapper — the key gotcha is the ESM worker configuration under Vite.

---

### PROMPT 2 — OneSignal push (with the iOS caveat built in)

```
Install the OneSignal web SDK. Wire push notifications with the REST API key kept server-side only.

1. Client: initialize OneSignal with VITE_ONESIGNAL_APP_ID. After a user creates or joins a crew, call OneSignal.login(userId) using the Supabase user UUID as the external ID. On logout or Ghost Mode, call OneSignal.logout().
2. Add a column `onesignal_external_user_id` (TEXT, indexed) to the profiles table to track registration.
3. Create a Supabase Edge Function called `send-push-notification`. It accepts { userId, title, message } and calls the OneSignal REST API at https://onesignal.com/api/v1/notifications with `include_external_user_ids: [userId]`. Read ONESIGNAL_API_KEY and ONESIGNAL_APP_ID from Supabase Edge Function secrets — never from the client.
4. Add a visible "Add to Home Screen" instruction for iOS Safari after crew creation. A Safari tab gets zero push notifications on iOS; only a Home Screen PWA can receive them. Do not promise push on iOS until the user has installed to Home Screen.
5. Prime before the system prompt: show a custom screen "Get a nudge when your crew arrives?" with [Not now] [Allow] before calling OneSignal.Notifications.requestPermission().
```

OneSignal is the standard Lovable push integration — the key pattern is client-side registration with an external user ID, and server-side sends from a Supabase Edge Function so the REST API key never leaks.

---

### PROMPT 3 — QR codes for invites (client-side, zero backend)

```
Install react-qr-master. On the crew invite sheet, render a QR code of the crew invite URL using the <QRCode> component.

1. Use a styled QR: fgColor should match the app accent color, bgColor white, shape="rounded", level="H" (high error correction — festival screens are scratched and dirty).
2. Add a download button using the `useQRDownload` hook. Export as PNG.
3. The QR must encode the deep link `/join/${inviteCode}`, not a generic homepage URL.
4. Show the QR alongside the share link and the 6-character code — three invite paths in one sheet.
```

react-qr-master is React-native, ships its own types, and needs no API key — it renders a QR from a string value in one component. The high error-correction level is not optional at a festival.

---

### PROMPT 4 — Vercel OG (the crew card that gets shared)

```
Install @vercel/og. Create an API route `/api/og/crew` that generates a dynamic crew card image using JSX and CSS via ImageResponse.

1. Accept query params: eventName, crewName, memberAvatars (comma-separated URLs), topSets.
2. Render a wristband-styled card: event name in a chunky display font, crew avatars in a horizontal row, "X sets in common," and the Event Buddies wordmark.
3. Set Cache-Control headers so the CDN caches the generated image — do not regenerate on every request.
4. The card must be 1200×630 for Open Graph / Stories. Add the /api/og/* route to robots.txt Allow so social scrapers can fetch it.
5. On the post-event recap screen, add a "Share your crew card" button that opens the native share sheet with this image URL.
```

Vercel OG generates images from HTML/CSS without a browser, caches them on the CDN, and is the right tool for the one viral artifact that brings next year’s users.

---

### PROMPT 5 — PostHog (wire it through the Lovable MCP, not hardcoded keys)

```
Connect PostHog via Lovable's MCP connector: Settings → Connectors → New MCP server, URL https://mcp.posthog.com/mcp, OAuth.

Then prompt: Install posthog-js. Use the PostHog MCP `projects-get` tool to discover the project token and host — do NOT hardcode placeholder keys.

Initialize at module top-level in main.tsx (NOT inside useEffect):
- posthog.init with capture_pageview: false, capture_pageleave: true, autocapture: true, person_profiles: 'identified_only'.
- Wrap the app in PostHogProvider.
- capture_pageview must be false — the provider automatically tracks SPA route changes.

Track exactly these events with the Supabase user UUID (never names or emails): onboarding_completed, event_selected, crew_created, crew_joined, invite_sent, pin_dropped, lost_someone_used.

Enable Exception Autocapture in PostHog project settings. Do NOT add manual window.onerror handlers.
```

PostHog’s Lovable MCP integration is the cleanest path — it discovers credentials rather than asking you to paste them, and it gives you natural-language querying of your funnel from inside Lovable.

---

### PROMPT 6 — Sentry (error tracking before the festival, not after)

```
Install @sentry/react and @sentry/vite-plugin.

1. Initialize Sentry in main.tsx before any other imports. Read the DSN from VITE_SENTRY_DSN. Only enable when import.meta.env.PROD.
2. Add @sentry/vite-plugin to vite.config.ts for source maps. Keep it last in the plugins array.
3. Set tracesSampleRate to 0.2 (20% — enough to catch performance regressions without burning quota).
4. Do not log PII. The user context should be the Supabase UUID only.
```

Sentry catches what analytics cannot: the blank map, the failed pin insert, the keyboard covering the name input. Pair it with PostHog — PostHog catches behaviour, Sentry catches errors.

---

### PROMPT 7 — RevenueCat (only if you monetize — do not start here)

```
Install @revenuecat/purchases-js. Configure RevenueCat Web Billing once at app startup.

1. Use the Web Billing public key (starts with rcb_, sandbox rcb_sb_) from VITE_REVENUECAT_WEB_API_KEY. This is NOT the Apple or Google platform key.
2. The Web SDK does not mint anonymous IDs automatically — pass the Supabase user UUID as appUserId explicitly.
3. Call Purchases.configure({ apiKey, appUserId }) exactly once. Access the singleton via Purchases.getSharedInstance().
4. Load offerings with getOfferings(). For a one-time "Crew Pro" purchase, call purchase() with the package.
5. Point a RevenueCat webhook at a Supabase Edge Function. When a purchase or renewal event arrives, set the user's plan in the profiles table. Never trust the client to unlock features.
```

RevenueCat Web is only relevant if you sell something — and for a festival app, physical tickets and bookings are allowed via web checkout on iOS and Android, so you are not forced into in-app purchase for those.

---

### PROMPT 8 — Twilio / SendGrid (optional, for verification or email)

```
If SMS verification is needed: create a Supabase Edge Function `send-sms-verification` that calls Twilio Verify. Read TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID from Edge Function secrets. Never put the auth token in a VITE_ variable.

For transactional email (recap export, invite reminders): create an Edge Function `send-email` using SendGrid. Read SENDGRID_API_KEY from Edge Function secrets.

Both functions must be called only from the server, never directly from the browser.
```

Twilio has local South African virtual numbers for POPIA-compliant sender IDs, and SendGrid’s free tier covers 100 emails/day for transactional mail — enough for recap exports and invite nudges.

---

## The Order That Matters

| # | Tool | Why this order |
|---|---|---|
| 1 | **MapTiler + MapLibre** | The map is the canvas — build it before anything sits on it |
| 2 | **OneSignal** | Push is the retention layer, but it depends on crew creation existing |
| 3 | **QR codes** | The invite loop needs a shareable artifact — QR is the festival-native one |
| 4 | **Vercel OG** | The crew card is the growth artifact — build it once the recap exists |
| 5 | **PostHog** | Wire it before you have users so the funnel is clean from day one |
| 6 | **Sentry** | Wire it in the same session as PostHog — they are a pair |
| 7 | **RevenueCat** | Only after you have a paid offer — do not pre-build monetization |
| 8 | **Twilio / SendGrid** | Only if you need verification or email — both are optional |

---

**The one sentence:** MapTiler gives you a map that works without Google billing, OneSignal gives you push with the REST key locked server-side, QR codes and Vercel OG give you the two shareable artifacts that spread the app, PostHog and Sentry tell you what broke and where users dropped, and RevenueCat and Twilio are only there if you actually sell something — wire them in that order, keep every private key in Supabase Edge Function secrets, and the third-party layer stops being a risk and starts being the infrastructure.
