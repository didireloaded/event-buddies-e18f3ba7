# Setup and MCP integrations

These are *examples*, not commands to run blindly in an existing project. Consult the current docs before executing. Use the package manager already in the repository. All MCP servers and registries are optional.

## New Next.js + shadcn project

The original user-provided command is:

```bash
pnpm dlx shadcn@latest init --preset b0 --template next
```

`b0` is an opaque preset code. The CLI must resolve it. Do not claim it means a particular theme, radius, base, or layout. For a general new Next.js setup without a code:

```bash
pnpm dlx shadcn@latest init -t next
```

For an existing project, inspect `components.json` first. Never use a new `init` or `apply` command to overwrite custom components without permission and a backup.

Useful project commands:

```bash
pnpm dlx shadcn@latest info --json
pnpm dlx shadcn@latest docs button dialog sonner
pnpm dlx shadcn@latest add button --dry-run
pnpm dlx shadcn@latest add button
```

Run the official shadcn skill setup only if desired:

```bash
pnpm dlx skills add shadcn/ui
```

## Radix Themes (only if intentionally choosing that design system)

```bash
pnpm add @radix-ui/themes
```

At the global app root, import the stylesheet *once*:

```tsx
import '@radix-ui/themes/styles.css'
import { Theme } from '@radix-ui/themes'

// Inside the app's root layout/body:
<Theme accentColor="crimson" grayColor="sand">
  {children}
</Theme>
```

This is not required when using shadcn components based on Radix primitives. Mixing Themes with shadcn styling requires deliberate token normalization and visual review.

## Sonner

For a matching shadcn project:

```bash
pnpm dlx shadcn@latest add sonner
```

In the root layout, mount the installed component once:

```tsx
import { Toaster } from '@/components/ui/sonner'

// In layout tree:
<Toaster />
```

In an interactive client component after an actual successful async action:

```tsx
'use client'
import { toast } from 'sonner'

async function saveProfile() {
  try {
    await persistProfile() // Your actual application function
    toast.success('Changes saved')
  } catch {
    toast.error('Could not save changes')
  }
}
```

If using Sonner without the shadcn wrapper, install `pnpm add sonner` and mount `{ Toaster }` from `sonner`. Do not mount both.

## cmdk

```bash
pnpm add cmdk
```

Or use the installed `Command` from shadcn, which may already include cmdk. Add unique values, labels, commands, keyboard support and correct client boundaries.

## NumberFlow

```bash
pnpm add @number-flow/react
```

```tsx
'use client'
import NumberFlow from '@number-flow/react'

export function LiveTotal({ total }: { total: number }) {
  return <NumberFlow value={total} format={{ style: 'currency', currency: 'NAD' }} />
}
```

This requires verified numeric state. Check current support and limitations for RTL and non-Latin numbers.

## Magic UI via shadcn registry

Merge the following **fragment** into the existing `components.json`, preserving other fields:

```json
{
  "registries": {
    "@magicui": "https://magicui.design/r/{name}.json"
  }
}
```

Then discover and review components before installation. Example item names change over time, so don't guess them. Use shadcn CLI search/docs/MCP, check actual source and test the result. Magic UI's own MCP installer also exists; prefer one discovery path rather than duplicate tools that do the same job.

## RareUI

It has a dedicated CLI:

```bash
pnpm dlx rareui@latest add liquid-button
```

Do not run `rareui init` over an existing shadcn `components.json` before reviewing its effects. Use an individual compatible component after examining its source and licence.

## 21st.dev / formerly Magic MCP

Current documented CLI workflow:

```bash
npm i -g @21st-dev/cli
21st login
21st search "pricing table"
```

Alternatively use `npx @21st-dev/cli install-skill` with current docs. Retrieval or generation may require a paid plan or credits. Neither CLI login nor MCP authorizes hardcoding tokens.

For Codex, put a configured server in `~/.codex/config.toml` (example supplied in `examples/codex-config.example.toml`). Existing Codex versions may support:

```bash
codex mcp add 21st --url https://21st.dev/api/mcp --bearer-token-env-var API_KEY_21ST
```

The `API_KEY_21ST` environment variable must be provided *separately* through a private mechanism. **The user-shared API key must be rotated first.** Never paste its raw value into the repository or a skill.

## shadcn MCP for IDEs

For compatible MCP clients that use JSON, configuration can include:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

The project's registry namespaces (including Magic UI) are read from `components.json`. Codex's native MCP configuration typically uses TOML, not this JSON shape.

## Integration order

1. Run and test the app without any optional MCP.
2. Identify a concrete missing component or research task.
3. Configure one appropriate source and authenticate privately.
4. Restart/reload the IDE as required by that client.
5. Test that the agent can list/discover components before changing code.
6. Add one reviewed component; run typecheck/build and browser check.
7. Keep unused servers disabled to reduce tool noise and unnecessary permissions.

## Helpful defaults

- Do not mix `npm`, `pnpm`, `yarn` and `bun` in one repository.
- Do not commit `~/.codex/config.toml` or real auth config copied from a local machine.
- Never blindly execute `curl | sh` or remote code in an untrusted third-party component.
- Keep registries namespaced and source-specific.
- Prefer official current documentation over tutorial commands when they conflict.
