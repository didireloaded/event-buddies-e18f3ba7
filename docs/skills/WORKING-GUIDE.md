# Working guide for Event Buddies

Prepared on 18 November 2026 from the supplied local library and six requested review skills.

## Authority and scope

Use this folder as reference material when planning, building, reviewing and verifying Event Buddies. The user's current request, applicable repository instructions and actual project contracts govern the work. A downloaded project's own AGENTS.md describes that project and does not automatically govern Event Buddies.

Choose guidance for the task and installed stack. Read the selected skill and its relevant references before applying it. Preserve existing user work and source assets. Resolve overlapping advice through the actual requirements, accessibility, data safety and project conventions. Numerical heuristics about file size, coverage, abstraction counts or animation duration need context.

The attendee product is a mobile PWA. Its web semantics, browser history, shareable links, safe areas, keyboard handling and offline behaviour are part of its interface. Native iOS guidance informs interaction and visual decisions. Verification claims must identify the browser or physical device actually tested.

## Reference routing

| Work | Read | Apply |
| --- | --- | --- |
| UI and interaction | `strict-interface-engineer/SKILL.md` and relevant references | Inspect existing screens, define the screen's primary task, map states, preserve the approved identity, implement and inspect the rendered result. |
| PWA behaviour | `strict-interface-engineer/references/platform-pwa.md` | Safe areas, viewport height, browser Back, deep links, keyboard access, install behaviour, offline entry and reconnect. |
| Visual review | Strict Interface Engineer's anti-slop gate and visual checklist, supplemented by `anti-slop-main 2/skills/antislop-ui/SKILL.md` | Check composition, density, type, authentic imagery, controls and states against the user's references. Explain product-specific choices. |
| Responsive and accessible UI | `anti-slop-main 2/skills/antislop-layoutmobile/SKILL.md` and `antislop-human/SKILL.md` | Test reflow, overflow, touch targets, contrast, focus, text resizing and keyboard visibility. Verify accessibility facts against current standards. |
| Reference analysis | `hallmark-main/skills/hallmark/SKILL.md` and relevant study references | Extract hierarchy, density, navigation and image treatment from references. Keep Event Buddies' established product identity and authentic assets. |
| General engineering | `agent-skills-main/skills/` selected by task | Use the existing architecture, explicit trust boundaries, small complete changes and relevant verification. |
| Writing | `no-ai-slop-main/skills/no-ai-slop/SKILL.md`, with copywriting guidance as needed | Preserve meaning and voice, remove repetition and filler, use concise action labels and factual availability messages. |
| Comment cleanup | `anti-slop-main 2/skills/antislop-code/SKILL.md` | Keep explanations of contracts, concurrency, security and non-obvious constraints. Remove redundant narration within the authorised change. |
| TypeScript lint rules | `anti-slop-main/skills/install-anti-slop/SKILL.md` and its rule sources | Evaluate each proposed rule against the repo's tooling, runtime validation and maintainability before changing lint configuration. |
| Formal static review | `code-review-gate-skill-main/skills/code-review-gate/SKILL.md` | Pin the reviewed source, trace concrete failure paths, maintain evidence and reconcile findings. Static evidence and runtime evidence have separate limits. |
| Debugging and verification | Selected Addy, Matt Pocock or Superpowers skills | Reproduce, trace the owning layer, fix the cause, verify the affected behaviour and adjacent regressions. |
| Specialist questions | ECC, cc-polymath and Hermes catalogues | Locate relevant skills by domain. Inspect their prerequisites and host compatibility before using their workflow. |

## Installed review skills

All six requested skills are installed under `/Users/visionhaus/.codex/skills/`.

| Skill | Source | Role |
| --- | --- | --- |
| `code-review` | `mattpocock/skills`, `skills/engineering/code-review` | Separate requirements compliance and repository standards. When invoked, resolve its review base, spec and tracker requirements and follow its independent review workflow. |
| `caveman-review` | `juliusbrussee/caveman`, `skills/caveman-review` | Short actionable findings with exact locations. Security and architectural findings retain enough explanation to assess them. |
| `code-review-and-quality` | `addyosmani/agent-skills`, `skills/code-review-and-quality` | General review across correctness, readability, architecture, security and performance. Check actual callers and guards before reporting a defect. |
| `review-pr` | `warpdotdev/common-skills`, `.agents/skills/review-pr` | Structured `review.json` for workflows needing machine-readable review. Use its annotated diff and bundled output validator. |
| `code-reviewer` | `google-gemini/gemini-cli`, `.gemini/skills/code-reviewer` | Local or PR review across behaviour, maintainability, error handling and tests. Adapt command examples to the actual project and available tools. |
| `open-code-review` | `alibaba/open-code-review`, `skills/open-code-review` | OCR's external review engine. Native mode requires its CLI and a configured model provider. Installing the skill alone does not configure or verify that engine. |

Use a review workflow appropriate to the request. Follow an invoked workflow's required output and prerequisite rules. External posting, model-provider configuration and billable review execution require authorisation appropriate to those actions.

## Development sequence

1. Inspect the actual checkout, branch, outstanding edits, routes, data ownership, dependencies and relevant tests.
2. State the user journey, primary action, visual references and acceptance conditions. Reuse information already supplied by the user.
3. Map loading, empty, validation, denied permission, offline, success and failure states. Establish persistence and authorisation at the responsible layer.
4. Build a complete slice through its normal entry points. Reuse fitting primitives, helpers and domain types. Preserve older saved data where supported.
5. Review against the requirements and project standards. Trace security, concurrency, retries and data-loss concerns to concrete code paths. Give each finding a location, trigger, consequence and proposed correction.
6. Run relevant project checks and inspect the actual UI. Test critical account and crew boundaries with separate identities when those boundaries change.
7. Report implemented behaviour, actual checks, release status and remaining verification. State provider, credit, data or device limitations precisely.

## Examples for the deferred features

### Crew invitation links

Retain the invitation through onboarding and authentication. Show the crew name and the approved member preview, require explicit joining and keep admin actions owner-authorised on the server. Test invalid, expired and revoked links, replay, existing membership and event mismatch. A preview endpoint must expose only its approved fields through its own access boundary.

### Onboarding profile photos

Design capture/upload, preview and crop, validation, progress, retry, change and removal. Validate files server-side, define storage ownership and visibility, and propagate the saved avatar to crew lists and map markers. Test denied camera access, invalid files, failed upload and cross-account access. Preserve the user's map-avatar requirement.

### Location sharing

Reconcile the proposed snapshot and live-location approaches with the desired product behaviour before implementation. Define accuracy, venue calibration, sharing audience, freshness, expiry and battery policy. Persist queued actions safely, make replacement and deduplication atomic, and enforce access and expiry on the server. Pending offline removal needs clear wording until confirmed remotely. Verify real behaviour across phones before making accuracy or delivery claims.

## Library inspection limits

The initial inventory found 1,394 SKILL.md entry points, containing 1,246 distinct contents and approximately 13.25 MB of entry-point text, across 18 top-level collections. Several numbered anti-slop directories and writing collections repeat content. Some directories contain full agent frameworks, language variants, scripts and test fixtures.

The inventory enumerated entry points and compared their content hashes. Focused reading covered the requested review workflows and the principal design, PWA, accessibility, writing and verification guidance. An exhaustive line-by-line audit of every framework, script, fixture and specialist skill remains outside that reading. Read the exact resources needed by each future task and verify their claims against the current project and official documentation.

The current app implementation and database are unchanged by this skill installation and reference study.
