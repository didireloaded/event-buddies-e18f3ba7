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
    let observed = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      observed = true;
      if (active) setState({ user: session?.user ?? null, loading: false, error: "" });
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && !observed)
          setState({
            user: data.session?.user ?? null,
            loading: false,
            error: error ? "Couldn’t check your sign-in. Try again." : "",
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
