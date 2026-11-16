# Architecture, security and release readiness

## Project architecture

- Match the existing framework and route conventions. Do not rewrite a stable Vite app into Next.js without explicit justification.
- Keep shared UI primitives and domain-specific components separate.
- Keep business logic in small modules that can be tested independently of presentation.
- Render data on the server when possible and use client islands only for actual interactivity.
- Use framework-native loading/error boundaries, route handlers, forms and caching correctly. Check installed framework versions before introducing version-specific patterns.
- Prefer named TypeScript interfaces/types for domain data, validated API boundaries, stable IDs and explicit nullable states.
- Keep package versions coherent and lockfile modifications minimal. Avoid grabbing unrelated dependencies because a registry component example imports them.

## Real features, not demos

For each action determine its source of truth, authorization policy, persistence, validation, failure mode, double-submit behavior and user-visible completion. A button that only changes a number in component state is not a booking, a payment or a saved database record.

For forms: label every field, mark required inputs, provide inline errors, validate on client for fast feedback and on server for security, debounce only when appropriate, and preserve entered values on recoverable error. If the user wants email delivery, send through an authorized server-side provider and test failure paths; don't substitute `mailto:`.

For lists/tables: show accurate counts, stable sorting, pagination/virtualization where necessary, search semantics, empty states and appropriate row actions. Do not fabricate live status, ratings, reviews or financial statistics.

## Security minimum

1. **Secrets**: Never place private tokens, database service-role credentials or signing keys in source, skills, project config committed to git, client bundles, URLs or screenshots. Use dedicated secret management and server-only injection. If a key is accidentally shared, rotate it.
2. **Auth and authorization**: Verify every sensitive server operation using the authenticated user's identity and permissions. Hiding a button is not authorization.
3. **Data isolation**: Use row-level authorization/RLS where supported; test cross-user reads/writes and deny-by-default behavior.
4. **Validation**: Validate request payloads on the server using a documented schema; enforce size/type limits and safe file handling.
5. **Injection prevention**: Avoid `dangerouslySetInnerHTML` with untrusted content, raw SQL string concatenation, unsafe redirects, and unsanitized external links.
6. **CSRF/session protection**: Respect framework/session protections, cookie policies and correct HTTP method semantics for actions.
7. **Uploads**: Enforce file type, max size, ownership, private storage or signed URL access and safe file names.
8. **Dependencies and registries**: Inspect new code for exfiltration, network telemetry, remote scripts, suspicious install hooks and license restrictions.
9. **Error hygiene**: Don't expose stack traces, secrets, raw provider responses or account identifiers in user-facing toasts.
10. **Audit logging**: Record important admin and financial actions without logging sensitive request contents.

## Performance / SEO

- Avoid shipping large client bundles for server-renderable pages.
- Use image optimization, declared dimensions, suitable responsive sources, lazy loading for below-fold media, and meaningful alt text.
- Reserve space for async content to reduce layout shift.
- Use caching intentionally and invalidate changed data after mutations. Do not cache private data across users.
- Avoid eager heavy motion, shaders or 3D libraries for simple effects.
- Use semantic metadata, titles, descriptions and proper heading order for public pages. Verify canonical URLs, sitemap and indexing only if relevant to the task.
- Consider slow networks, mobile CPU and offline/error handling as user scenarios.

## Operational safety

- Never apply destructive migrations, replace an existing preset, overwrite custom components or drop production data without user approval and a rollback plan.
- Do not simulate successful integrations. Distinguish demo data from real data.
- If an external provider is unavailable, leave the integration in a clear pending state and report the precise blocker.
