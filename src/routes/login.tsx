import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
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
      {
        name: "description",
        content: "Sign in to Event Buddies to sync your favourites, meeting plan and private crew.",
      },
      { property: "og:title", content: "Sign in — Event Buddies" },
      {
        property: "og:description",
        content: "Sign in to Event Buddies to sync your favourites, meeting plan and private crew.",
      },
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
  const statusId = useId();
  const passwordId = useId();
  const [mode, setMode] = useState<"in" | "up" | "magic">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "info" } | null>(null);
  const returnUrl = () => new URL(next, window.location.origin).href;

  useEffect(() => {
    if (!accountConfigured) return;
    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error && active) {
          setMsg({ text: "Couldn’t check your sign-in. Try again.", tone: "error" });
        }
        if (data.session && active) window.location.replace(next);
      })
      .catch(() => {
        if (active) setMsg({ text: "Couldn’t check your sign-in. Try again.", tone: "error" });
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
    const trimmedEmail = email.trim();
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: { emailRedirectTo: returnUrl() },
        });
        if (error) {
          setMsg({
            text: "Couldn’t send the sign-in link. Check your email and try again.",
            tone: "error",
          });
        } else {
          setMsg({ text: "Check your email for your sign-in link.", tone: "info" });
        }
      } else if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) {
          setMsg({
            text: "Couldn’t sign in. Check your email and password, then try again.",
            tone: "error",
          });
        } else {
          window.location.assign(next);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: returnUrl() },
        });
        if (error) {
          setMsg({
            text: "Couldn’t create the account. Check your details and try again shortly.",
            tone: "error",
          });
        } else if (data.session) {
          window.location.assign(next);
        } else {
          setMsg({ text: "Check your email to confirm your account.", tone: "info" });
        }
      }
    } catch {
      setMsg({ text: "Couldn’t reach sign-in. Check your connection and retry.", tone: "error" });
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
      if (result.error) setMsg({ text: "Couldn’t sign in. Try again.", tone: "error" });
      else if (!result.redirected) void navigate({ href: next });
    } catch {
      setMsg({ text: "Couldn’t reach sign-in. Check your connection and retry.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function guestSession() {
    if (busy || !accountConfigured) return;
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        setMsg({
          text: "Guest cloud sessions aren’t enabled on this server yet. Use an email sign-in link or password.",
          tone: "error",
        });
      } else {
        window.location.assign(next);
      }
    } catch {
      setMsg({
        text: "Couldn’t start a guest session. Check your connection and retry.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const hasError = msg?.tone === "error";

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-5 py-10">
      <h1 className="text-3xl font-bold text-foreground">
        {mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Email sign-in link"}
      </h1>
      <a href={next} className="inline-flex min-h-11 items-center text-primary">
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
            aria-invalid={hasError || undefined}
            aria-describedby={msg ? statusId : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode !== "magic" && (
          <div className="flex flex-col gap-1 text-sm font-medium text-foreground">
            <label htmlFor={passwordId}>Password</label>
            <div className="relative flex items-center">
              <input
                id={passwordId}
                className="ios-field pr-12"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                aria-invalid={hasError || undefined}
                aria-describedby={msg ? statusId : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1 grid size-11 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </div>
          </div>
        )}
        {msg && (
          <p
            id={statusId}
            role={hasError ? "alert" : "status"}
            className={
              hasError ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"
            }
          >
            {msg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !accountConfigured}
          className="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
        className="min-h-11 rounded-full border border-border bg-background font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue with Google
      </button>
      <button
        type="button"
        disabled={busy || !accountConfigured}
        onClick={() => social("lovable")}
        className="min-h-11 rounded-full border border-border bg-background font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue with Lovable
      </button>
      <button
        type="button"
        disabled={busy || !accountConfigured}
        onClick={() => void guestSession()}
        className="min-h-11 rounded-full border border-border bg-background font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue with guest cloud session
      </button>
      <button
        type="button"
        onClick={() => {
          setMsg(null);
          setMode(mode === "in" ? "up" : "in");
        }}
        className="min-h-11 text-sm font-medium text-foreground underline"
      >
        {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
