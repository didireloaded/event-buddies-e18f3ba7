# Testing and acceptance standards

## Verification sequence

1. Before editing: inspect branch state and existing tests. Preserve unrelated changes.
2. After small code changes: run focused tests/typecheck/lint.
3. Before completion: run the project's full relevant tests and a production build.
4. In a browser: test happy path, invalid inputs, empty result, network failure, repeated click, keyboard interaction, mobile viewport and overlay behavior.
5. Audit final diff for unintended changes, secrets, large added dependencies and hardcoded fake data.
6. Record what *actually ran* and outcomes. `Not run` is an acceptable honest report; a guessed pass is not.

## Core acceptance table

| Area | Minimum evidence |
| --- | --- |
| Type safety | `tsc --noEmit` or configured typecheck returns success |
| Code style | Project's lint command returns success or documented preexisting failures |
| Build | Production build completes with no unresolved errors |
| Logic | Appropriate unit/integration tests pass for touched logic |
| Primary flows | Browser or E2E test proves the user's core task works |
| Error handling | Invalid input, denied access and failed network/server return meaningful feedback |
| Responsive | Inspect at ~320, 375, 768, 1024 and 1440px, or justify equivalent device matrix |
| Accessibility | Keyboard navigation, focus visibility/return, labels, dialog semantics, contrast, reduced motion |
| Data correctness | UI agrees with authoritative state, no invented success/price/count |
| Security | No exposed secrets; authorization and validation checked for changed server endpoints |
| Regressions | Existing related flows still work |
| Visual fidelity | Screenshot/visual review of relevant routes and key UI states |

## Browser-level scenarios

### Form

- Submit valid data, see request and confirmed result.
- Submit invalid data, see inline field errors and no false success toast.
- Repeat click rapidly; prevent unintended duplicate side effects.
- Simulate offline/timeout, retry without losing values.
- Keyboard navigate, activate submit, observe focus/errors.

### Dialog/drawer

- Open by pointer, keyboard and touch where relevant.
- Focus enters, escape dismisses when allowed, focus returns to trigger.
- Scroll contents, test page scroll lock and input keyboard viewport behavior.
- Test nested overlays and orientation/viewport resize.

### Search/command

- Search zero/multiple items, match keywords and accents where relevant.
- Tab and arrow navigation; no accidental shortcut conflicts.
- Keyboard Enter selects the expected item and closes appropriately.
- With 1,000+ items, consider performance/virtualization.

### Data CRUD

- Create/read/update/delete where authorized, verify persistence after refresh.
- Attempt forbidden operations from another user; confirm server denies access.
- Handle conflicting edits or stale state appropriately.

## Release severity

**BLOCKER**: critical route crashes, secret leak, authorization bypass, data loss, false payment/booking success, critical accessibility failure, user goal impossible.

**MAJOR**: invalid responsive layout, broken primary navigation, unhandled errors, TypeScript/build failure, serious focus issue.

**MINOR**: nonessential polish inconsistency, isolated spacing issue, optional animation refinement. Prioritize blockers and majors before polish.

## Completion message template

```
Implemented
- [Behavior and changed files]

Verified
- [Command] — PASS / FAIL / NOT RUN
- [Main browser journey] — PASS / FAIL / NOT RUN
- [Mobile/accessibility checks] — PASS / FAIL / NOT RUN

Remaining
- [Explicit blockers, unsupported environments, trade-offs]
```

Never state 'fully tested', 'secure', or 'production ready' when verification was partial.

## Additional acceptance gates for native mobile

| Area | Minimum evidence |
| --- | --- |
| Runtime | App bundles/builds with the actual Expo/RN/SwiftUI/Android toolchain when available |
| iOS | Screens, keyboard, dynamic text, VoiceOver/safe area and system bars inspected on target simulator/device |
| Android | Screens, Back, keyboard, TalkBack/font scale, edge-to-edge and larger-window behavior inspected |
| Cross-platform | Shared flow tested separately on each platform claimed as supported |
| Gestures | Native scrolling, sheets, dismissal, tabs and other gestures physically tested where possible |
| Permissions | Denied/granted and recovery paths for camera/location/notification/files when relevant |
| Offline | Actual reconnect/sync behavior tested when offline is promised |
| Visual quality | Anti-AI-slop gate and multi-screen review passed with evidence, not screenshot intuition alone |

If devices/simulators are inaccessible, state NOT RUN rather than 'looks good on mobile'. A web responsive preview is not equivalent to an iOS or Android native test. The strict design gate lives in `anti-ai-slop-gate.md` and `visual-review-checklist.md`.
