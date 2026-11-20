import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
export const accountConfigured = Boolean(
  import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
);
export function useAccountAuth() {
  const [state, setState] = useState<{ user: User | null; loading: boolean; error: string }>({
    user: null,
    loading: accountConfigured,
    error: "",
  });
  useEffect(() => {
    if (!accountConfigured) return;
    let active = true;
    let revision = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      revision += 1;
      if (active) setState({ user: session?.user ?? null, loading: false, error: "" });
    });
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (active && revision === 0)
          setState({
            user: data.user ?? null,
            loading: false,
            error:
              error && error.name !== "AuthSessionMissingError"
                ? "Couldn’t check your sign-in. Try again."
                : "",
          });
      })
      .catch(() => {
        if (active)
          setState({
            user: null,
            loading: false,
            error: "Couldn’t check your sign-in. Try again.",
          });
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return { ...state, configured: accountConfigured };
}
