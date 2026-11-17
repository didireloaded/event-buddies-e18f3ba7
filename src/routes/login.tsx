import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: oauthReturnPath(s["next"]) }),
  head: () => ({
    meta: [
      { title: "Sign in — Event Buddies" },
      { name: "description", content: "Sign in to Event Buddies to connect an assistant." },
      { property: "og:title", content: "Sign in — Event Buddies" },
      { property: "og:description", content: "Sign in to Event Buddies to connect an assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const returnUrl = () => new URL(next, window.location.origin).href;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg(error.message);
      window.location.assign(next);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: returnUrl() },
      });
      setBusy(false);
      setMsg(error ? error.message : "Check your email to confirm your account.");
    }
  }

  async function social(provider: "google" | "lovable") {
    sessionStorage.setItem("eb-auth-next", next);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/login?next=" + encodeURIComponent(next),
    });
    if (result.error) return setMsg(result.error.message ?? "Sign-in failed.");
    if (result.redirected) return;
    void navigate({ href: next });
  }

  // Returning from a social sign-in with an existing session: continue.
  if (typeof window !== "undefined") {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && !busy && mode === "in" && !email) window.location.replace(next);
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-5 py-10">
      <h1 className="text-3xl font-bold text-foreground">
        {mode === "in" ? "Sign in" : "Create account"}
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Email
          <input className="ios-field" type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Password
          <input className="ios-field" type="password" required minLength={6}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {msg && <p role="alert" className="text-sm text-muted-foreground">{msg}</p>}
        <button disabled={busy}
          className="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">
          {mode === "in" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button type="button" onClick={() => social("google")}
        className="min-h-11 rounded-full border border-border bg-background font-semibold text-foreground">
        Continue with Google
      </button>
      <button type="button" onClick={() => social("lovable")}
        className="min-h-11 rounded-full border border-border bg-background font-semibold text-foreground">
        Continue with Lovable
      </button>
      <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="min-h-11 text-sm font-medium text-foreground underline">
        {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
