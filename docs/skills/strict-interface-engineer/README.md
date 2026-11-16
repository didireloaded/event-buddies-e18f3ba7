# Strict Interface Engineer

A reusable **anti-AI-slop design and coding skill** for **websites, web apps, PWAs and native mobile apps**, including React Native/Expo, SwiftUI and Android Compose. It enforces original product-specific UI, appropriate platform conventions, functional interactions, safe integration, and proof of quality before completion.

The skill deliberately does **not** require shadcn/ui, Next.js, Expo, Radix Themes, Sonner, Magic UI, 21st.dev or any other library in every project. It inspects the project and uses the right components for that platform. Web packages are not automatically native-compatible.

## What you get

- `SKILL.md` — entrypoint, strict rules, workflow and cross-platform decisions.
- `references/anti-ai-slop-gate.md` — 25 recognizable AI design problems, rejection triggers and precise fixes.
- `references/visual-review-checklist.md` — screenshot rubric, hard failures, visual quality acceptance.
- `references/platform-web.md` — public websites, web apps and responsive behavior.
- `references/platform-mobile.md` — Expo/React Native, SwiftUI, Android, native navigation and accessibility.
- `references/platform-pwa.md` — mobile-browser and installed PWA behavior.
- Other `references/` — UI library selection, tokens, interactions, architecture, security, tests, debugging and MCP setup.
- `examples/AGENTS.example.md` — short repository-level policy to use alongside the skill.
- `examples/mcp.example.json`, `examples/codex-config.example.toml`, `examples/components.fragment.json` — **optional** integrations. Never paste a secret into these files or commit your actual secret.

## Install in Codex or another skill-aware IDE

1. Extract this ZIP.
2. Place the `strict-interface-engineer` folder in your agent skills directory. A commonly supported Codex location is `~/.agents/skills/strict-interface-engineer/`, though verify with your Codex build.
3. Keep `SKILL.md` in the folder root with `references/` beside it.
4. Optionally copy the content of `examples/AGENTS.example.md` into your repository's own agent instructions, adapting it to your project.
5. Start a fresh agent session and explicitly ask it to use `strict-interface-engineer`.

Example:

```bash
mkdir -p ~/.agents/skills
cp -R strict-interface-engineer ~/.agents/skills/
```

## Copy-and-use prompt

> Use the strict-interface-engineer skill. First classify this repository as website, web app, PWA, native mobile app, or cross-platform app. Inspect the existing architecture, real UI and brand. Before implementation identify the primary user journey, content hierarchy and visual direction. Enforce the anti-AI-slop gate. Reject template heroes, card overload, vague AI copy, tiny text, meaningless effects and nonfunctional controls. Use platform-specific navigation, keyboard behavior, safe areas and accessibility. Review the rendered result on the intended devices, fix design and behavior failures, and report only tests actually run.

## How the library links fit

- shadcn/ui, Radix Themes, Sonner, cmdk, Vaul, NumberFlow, Magic UI, RareUI, Beautiful UI and 21st.dev are primarily **web resources**. They are candidates, not hard requirements.
- For React Native/Expo, prefer verified native primitives and installed platform-compatible libraries; use native design guidance from Apple and Android.
- For web/PWA, preserve semantics, browser URLs and history; a 'native look' must not break the web.
- The MCP examples only help the agent retrieve components and documentation. They do not improve design taste automatically.

## Complementary upstream guidance

Official shadcn and Emil Kowalski's skills are useful for web; Expo/Apple/Android documentation is important for mobile. Install only compatible complementary skills for the project. See `references/source-register.md`.

## Security note

A 21st.dev bearer token appeared in the user's earlier research message. **Rotate it**. The actual token is not included in this package. Inject tokens via environment variables and keep private keys off the client.

## Validation and source limits

The ZIP and skill contents are checked for structure, and its markdown entrypoint can be read by a skill-aware agent. Installing this package does not prove that an existing app or website meets the quality gate. External package versions and APIs must be checked against the project at build time. The supplied YouTube video was not directly verified; documentation was reviewed independently.
