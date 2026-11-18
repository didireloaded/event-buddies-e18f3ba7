import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { accountConfigured } from "@/lib/account/use-auth";
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
  const [mode, setMode] = useState<"in" | "up" | "magic">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const returnUrl = () => new URL(next, window.location.origin).href;

  useEffect(() => {
    if (!accountConfigured) return;
    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error && active) setMsg("Couldn’t check your sign-in. Try again.");
        if (data.session && active) window.location.replace(next);
      })
      .catch(() => {
        if (active) setMsg("Couldn’t check your sign-in. Try again.");
      });
    return () => {
      active = false;
    };
  }, [next]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !accountConfigured) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: returnUrl() },
        });
        if (error) setMsg("Couldn’t send the sign-in link. Check your email and try again.");
        else setMsg("Check your email for your sign-in link.");
      } else if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg("Couldn’t sign in. Check your email and password, then try again.");
        else window.location.assign(next);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: returnUrl() },
        });
        if (error) setMsg("Couldn’t create the account. Check your details and try again shortly.");
        else if (data.session) window.location.assign(next);
        else setMsg("Check your email to confirm your account.");
      }
    } catch {
      setMsg("Couldn’t reach sign-in. Check your connection and retry.");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    if (busy || !accountConfigured) return;
    setBusy(true);
    setMsg(null);
    try {
      sessionStorage.setItem("eb-auth-next", next);
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + "/login?next=" + encodeURIComponent(next),
      });
      if (result.error) setMsg("Couldn’t sign in. Try again.");
      else if (!result.redirected) void navigate({ href: next });
    } catch {
      setMsg("Couldn’t reach sign-in. Check your connection and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-5 py-10">
      <h1 className="text-3xl font-bold text-foreground">
        {mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Email sign-in link"}
      </h1>
      <a href={next} className="min-h-11 text-primary">
        Back to Event Buddies
      </a>
      {!accountConfigured && (
        <p role="status" className="text-[15px] text-muted-foreground">
          Account connection settings are pending. Your device saves remain available.
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Email
          <input
            className="ios-field"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode !== "magic" && (
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Password
            <input
              className="ios-field"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {msg && (
          <p role="alert" className="text-sm text-muted-foreground">
            {msg}
          </p>
        )}
        <button
          disabled={busy || !accountConfigured}
          className="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {mode === "in" ? "Sign in" : mode === "up" ? "Sign up" : "Email me a link"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMsg(null);
          setMode(mode === "magic" ? "in" : "magic");
        }}
        className="min-h-11 rounded-full border border-border bg-background font-semibold text-foreground"
      >
        {mode === "magic" ? "Use a password instead" : "Email me a sign-in link"}
      </button>
      <button
        type="button"
        disabled={busy || !accountConfigured}
        onClick={() => social("google")}
        className="min-h-11 rounded-full border border-border bg-background font-semibold text-foreground"
      >
        Continue with Google
      </button>
      <button
        type="button"
        disabled={busy || !accountConfigured}
        onClick={() => social("lovable")}
        className="min-h-11 rounded-full border border-border bg-background font-semibold text-foreground"
      >
        Continue with Lovable
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="min-h-11 text-sm font-medium text-foreground underline"
      >
        {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
