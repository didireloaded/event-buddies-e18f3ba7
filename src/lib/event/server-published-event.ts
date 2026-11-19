import { getDemoData } from "@/lib/event/demo-data";
import type { DemoData } from "@/lib/event/types";
import { publishedEventSchema } from "@/lib/organiser/cloud-extensions";
import { organiserEventToDemoData } from "@/lib/organiser/event-adapter";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResolvedServerEvent =
  | { ok: true; data: DemoData; source: "builtin" | "published_cloud" }
  | { ok: false; error: string };

/**
 * Authoritatively resolves published event data on the server for AI functions.
 * Never trusts client-supplied official event facts or unpublished drafts:
 * - Default built-in event is loaded directly from verified server data.
 * - Any other eventId is verified against the public published-event RPC on Supabase
 *   (which enforces `status = 'published'` in SQL).
 */
export async function resolvePublishedEventOnServer(
  eventId?: string | null,
  options?: {
    fetcher?: typeof fetch;
    supabaseUrl?: string;
    supabaseKey?: string;
  },
): Promise<ResolvedServerEvent> {
  const defaultEvent = getDemoData();
  const normalized = eventId?.trim() ?? "";

  if (
    !normalized ||
    normalized === defaultEvent.event.id ||
    normalized.toLowerCase() === defaultEvent.event.slug.toLowerCase()
  ) {
    return { ok: true, data: defaultEvent, source: "builtin" };
  }

  if (!UUID_RE.test(normalized)) {
    return {
      ok: false,
      error: "Published details for this event couldn’t be verified on the server.",
    };
  }

  const envUrl =
    options?.supabaseUrl ??
    process.env["SUPABASE_URL"] ??
    process.env["VITE_SUPABASE_URL"] ??
    "";
  const envKey =
    options?.supabaseKey ??
    process.env["SUPABASE_ANON_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    "";

  if (!envUrl || !envKey) {
    return {
      ok: false,
      error:
        "Published event verification isn’t configured on the server yet. Your saved event facts are available below.",
    };
  }

  const doFetch = options?.fetcher ?? fetch;
  try {
    const endpoint = `${envUrl.replace(/\/+$/, "")}/rest/v1/rpc/list_published_events`;
    const response = await doFetch(endpoint, {
      method: "POST",
      headers: {
        apikey: envKey,
        Authorization: `Bearer ${envKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: "Couldn’t verify published event details on the server right now. Try again shortly.",
      };
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      return {
        ok: false,
        error: "Published event details couldn’t be verified on the server.",
      };
    }

    for (const row of payload) {
      const parsed = publishedEventSchema.safeParse(row);
      if (parsed.success && parsed.data.id === normalized) {
        return {
          ok: true,
          data: organiserEventToDemoData(parsed.data),
          source: "published_cloud",
        };
      }
    }

    return {
      ok: false,
      error:
        "This event isn’t published in the verified event directory yet. Only published events can use the AI assistant.",
    };
  } catch {
    return {
      ok: false,
      error: "Couldn’t reach the verified event directory. Try again shortly.",
    };
  }
}
