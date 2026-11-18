import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ToolError, type AuthContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createBearerFetch(supabaseKey: string, token: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };
}

export function requireCallerSupabase(auth: AuthContext): {
  supabase: SupabaseClient<Database>;
  userId: string;
} {
  const token = auth.getToken();
  const userId = auth.getUserId();
  if (!token || !userId) {
    throw new ToolError("Sign in through OAuth to read your synced Event Buddies plan or crew.");
  }
  const url =
    (typeof process !== "undefined" ? process.env["SUPABASE_URL"] : undefined) ??
    import.meta.env["VITE_SUPABASE_URL"];
  const key =
    (typeof process !== "undefined" ? process.env["SUPABASE_PUBLISHABLE_KEY"] : undefined) ??
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new ToolError("Lovable Cloud connection settings are unavailable on this server.");
  }
  const supabase = createClient<Database>(url, key, {
    global: {
      fetch: createBearerFetch(key, token),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return { supabase, userId };
}
