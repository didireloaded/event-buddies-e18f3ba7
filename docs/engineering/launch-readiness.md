# Festival launch readiness

## Current system

Event Buddies uses React 19, TanStack Start, Vite 8 and a static supplied venue plan. Event facts live in `src/lib/event/sound-of-summer.ts`. Plans, preferences and landmark check-ins use browser storage. Landmark photos use IndexedDB. Cloud settings are deferred by the owner. There are currently no connected crew tables, account sessions, realtime messages or push subscriptions.

The supplied engineering brief is preserved in [product-ops-source.md](product-ops-source.md). Its future architecture proposals must be checked against this implementation before use.

## Repeatable checks

Run `npm run check` for strict TypeScript, scoped app lint, the unit suite, client-secret scanner tests and a production build with a public-bundle scan. GitHub Actions runs this on pull requests and main using `bun install --frozen-lockfile`. The Bun lockfile resolves the dependency versions. Full repository lint retains a separate backlog outside the scoped attendee check.

The scanner checks public build files, VITE_ environment values and VITE_ lines in local env files for supported privileged-credential formats. It reports a path and category without printing the matched value. It recognises private-key blocks, Supabase secret keys, Stripe secret keys, OpenAI project keys and service-role JWTs. Arbitrary secrets without recognisable formats still require review. Server-only env values are outside the public-env scan.

## Offline behaviour

Production precaches app assets, the venue plan and portraits. The registrar waits for the worker to activate and saves the public root document so the first offline reopen has a document. The root document is public event content. Private account pages must receive separate caching rules when accounts are connected.

You shows the actual offline-setup result, including blocked editor/dev previews, unsupported browsers and setup failures. A saved meeting enables a dismissible iPhone installation reminder. It asks for no browser permissions. The install sheet explains Safari Share → Add to Home Screen and the iOS notification requirements.

Local plans remain usable with no connection. AI requests have eight-second client and server abort signals, with retryable error feedback. There is no message-send queue because in-app message delivery is awaiting Cloud. Native share and QR codes remain user-operated handoffs.

## Launch gates and ownership

### Verification on 16 November 2026

- `npm run check` passed strict TypeScript, scoped lint, 38 Vitest tests, three scanner tests, the production build and the public-file credential-format scan.
- Bun 1.3.3 accepted the committed lockfile with frozen resolution in a temporary lockfile check. Remote GitHub Actions results are tracked on the pull request.
- A temporary Node harness served the built Cloudflare fetch handler and public assets. Chromium at 390px loaded the app, activated the production worker, then reloaded with network disabled. Home, Lineup, Map, Crew and You remained usable. The authentic map and all 24 portraits loaded offline.
- iPhone user-agent emulation showed the install reminder after a saved meeting. Its steps opened in a sheet and dismissal persisted in local preferences. Actual iOS installation and web-push delivery were not run.
- The initial index, route, event-data and runtime chunks total approximately 189 KiB gzip. The QR decoder loads on scanner use and remains in the offline precache. LCP, low-end CPU and physical battery measurements are pending.
- The offline-readiness section, offline banner and install sheet were inspected in rendered mobile views. Real iPhone/Android, standalone mode, assistive technology and the venue walk are pending.

| Gate                                             | Current state                                                      | Required proof or owner action                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Cloud RLS and data isolation                     | Pending Cloud connection                                           | Configure schema through Lovable, require authenticated crew membership, test outsider and second-account reads and writes    |
| Client credentials                               | Automated format scan added                                        | Review environment and bundle for each release, keep service-role and signing keys server-side                                |
| Offline Home, lineup, static map and local plans | Production cache implementation present                            | Run cold connected load, offline reload and reconnect against the production build                                            |
| Chat queue and retries                           | Pending Cloud connection                                           | Persist authorised actions, display queued state, define deduplication and reconnect behaviour                                |
| iPhone installation guidance                     | Implemented                                                        | Test actual Safari and Home Screen flow on a supported iPhone                                                                 |
| Notifications                                    | Pending integration                                                | Installed iOS 16.4+ and supported Android only, permission after value, verify delivery and opt-out                           |
| Anonymous auth and account upgrade               | Pending Cloud connection                                           | Prove guest UUID, linking and authorisation without losing existing local plans                                               |
| Invites and abuse prevention                     | Local QR/link copies only                                          | Server-side unpredictable expiring invite tokens, rate limits, reports and blocks before public crew discovery                |
| Pin retention                                    | Local expiry implemented                                           | Server TTL cleanup and deletion proof when Cloud pins exist                                                                   |
| Analytics and error reporting                    | Provider setup pending                                             | Owner selects project, privacy settings and public configuration, verify events without names, messages or location payloads  |
| Privacy and terms                                | Local data explanation and deletion present, launch policy pending | Owner supplies operator identity and approved terms, verify deletion across each connected system                             |
| Mobile E2E                                       | Unit tests and browser interaction checks available                | Add automated iPhone-viewport journeys and run them in CI                                                                     |
| Physical phones and venue                        | Pending device access                                              | iPhone Safari and installed mode, Android Chrome, low-end Android, three-person venue walk and measured 30-minute battery use |
| Performance                                      | Measurement required                                               | Measure initial gzip JS, LCP on throttled 4G and device CPU before approving the budget                                       |
| Git ownership                                    | GitHub repository connected                                        | Branch → PR → checks → review → merge, verify Lovable sync after merge                                                        |
| Release operations                               | Pending release decision                                           | Tag a reviewed release, establish rollback, custom domain and branded contact details                                         |
| Database backups                                 | Pending Cloud connection                                           | Confirm backup coverage, retention and restore test with the account owner                                                    |

## Cloud implementation invariants

Before implementing shared crews, define RLS for every table and validate every sensitive write server-side. Anonymous accounts receive the same membership isolation as linked accounts. Keep the latest coarse pin only, enforce its expiry, and stop writes when sharing ends. Invite joins, crew creation, pin writes and messages need server-side rate limits. Client timers and hidden buttons provide UI feedback while server checks enforce access.

Avoid claiming App Store availability until an approved native distribution exists. Notification delivery and background cleanup require target-platform proof. A browser preview does not establish physical-phone battery life or venue accuracy.
