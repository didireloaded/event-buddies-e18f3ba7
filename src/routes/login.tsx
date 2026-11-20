import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAccountAuth } from "@/lib/account/use-auth";
import {
  authDestination,
  savePlatformPreferences,
  usePlatformPreferences,
} from "@/lib/account/platform-navigation";
import { authErrorMessage } from "@/lib/account/auth-errors";
import {
  CONFIRMATION_COOLDOWN_SECONDS,
  validateSignupPasswords,
} from "@/lib/account/signup-validation";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: authDestination(s["next"]),
    mode: s["mode"] === "in" ? ("in" as const) : ("up" as const),
  }),
  head: () => ({
    meta: [
      { title: "Create account or sign in — Event Buddies" },
      {
        name: "description",
        content: "Create your Event Buddies account or browse public events as a guest.",
      },
      { property: "og:title", content: "Join Event Buddies" },
      {
        property: "og:description",
        content: "Sign in and discover public events, programmes and private crews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

export function Login() {
  const { next, mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const auth = useAccountAuth();
  const preferences = usePlatformPreferences();
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "pending">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const passwordId = useId();
  const [providers, setProviders] = useState({ google: false, lovable: false });
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const resume = useCallback(() => {
    savePlatformPreferences({ ...preferences, completed: true });
    void navigate({ href: next, replace: true });
  }, [preferences, navigate, next]);
  useEffect(() => {
    if (!auth.loading && auth.user) resume();
  }, [auth.loading, auth.user, resume]);
  useEffect(() => {
    if (!auth.configured) return;
    let active = true;
    void fetch(`${import.meta.env["VITE_SUPABASE_URL"]}/auth/v1/settings`, {
      headers: { apikey: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (active && s)
          setProviders({
            google: s.external?.google === true,
            lovable: s.external?.lovable === true || s.external?.oauth === true,
          });
      })
      .catch(() => {});
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.has("error"))
      setError(
        "This email link is invalid or expired. Request another confirmation or password reset.",
      );
    return () => {
      active = false;
    };
  }, [auth.configured]);
  async function request(action: () => Promise<void>) {
    if (lock.current || !auth.configured) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await action();
    } catch {
      setError("Couldn’t reach the account service. Check your connection and retry.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "up") {
      const invalid = validateSignupPasswords(password, confirmation);
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    if (mode === "pending" && cooldown > 0) return;
    await request(async () => {
      const address = email.trim();
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(address, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) setError(authErrorMessage(error));
        else
          setMessage(
            "If this email has an account, a password reset link will arrive shortly. Check spam too.",
          );
      } else if (mode === "pending") {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: address,
          options: {
            emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) setError(authErrorMessage(error));
        else {
          setCooldown(CONFIRMATION_COOLDOWN_SECONDS);
          setMessage(
            "Confirmation requested. Check your inbox and spam folder before requesting another.",
          );
        }
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) setError(authErrorMessage(error));
        else if (data.session) {
          const verified = await supabase.auth.getUser();
          if (verified.data.user) resume();
          else setError("Your account session couldn’t be verified. Try signing in.");
        } else {
          setCooldown(CONFIRMATION_COOLDOWN_SECONDS);
          setMode("pending");
          setMessage("Check your email to confirm your account. You are not signed in yet.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: address, password });
        if (error) setError(authErrorMessage(error));
        else {
          const verified = await supabase.auth.getUser();
          if (verified.data.user) resume();
          else setError("Your sign-in couldn’t be verified. Please retry.");
        }
      }
    });
  }
  function social(provider: "google" | "lovable") {
    void request(async () => {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/login?next=${encodeURIComponent(next)}`,
      });
      if (result.error) setError(authErrorMessage(result.error));
      else if (!result.redirected) {
        const verified = await supabase.auth.getUser();
        if (verified.data.user) resume();
        else setError("Sign-in didn’t finish. Try email instead.");
      }
    });
  }
  function switchMode(value: typeof mode) {
    setMode(value);
    setError("");
    setMessage("");
  }
  return (
    <div data-app-scope="global" className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-5 py-8">
        <a href="/#events" className="eb-display mb-5 flex min-h-11 items-center text-[20px]">
          Event Buddies<span className="text-primary">.</span>
        </a>
        <h1 className="eb-page-title">
          {mode === "up"
            ? "Create account"
            : mode === "in"
              ? "Sign in"
              : mode === "forgot"
                ? "Reset password"
                : "Confirm your email"}
        </h1>
        <p className="text-[16px] text-muted-foreground">
          {mode === "up"
            ? "A place for your events and your people."
            : mode === "in"
              ? "Welcome back. Pick up where you left off."
              : mode === "pending"
                ? `We sent a confirmation link to ${email || "your email"}.`
                : "We’ll email you a link to choose a new password."}
        </p>
        {!auth.configured && (
          <p role="alert">
            Account connection is unavailable. You can still browse public events as a guest.
          </p>
        )}
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="space-y-2 text-[15px] font-semibold">
            Email
            <input
              className="eb-field"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {(mode === "up" || mode === "in") && (
            <div className="space-y-2">
              <label htmlFor={passwordId} className="text-[15px] font-semibold">
                Password
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  className="eb-field pr-12"
                  type={visible ? "text" : "password"}
                  required
                  minLength={mode === "up" ? 6 : undefined}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-0 min-h-11"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
          )}
          {mode === "up" && (
            <label className="space-y-2 text-[15px] font-semibold">
              Confirm password
              <input
                className="eb-field"
                type={visible ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
          )}
          {message && (
            <p role="status" className="text-[15px] text-muted-foreground">
              {message}
            </p>
          )}
          {(error || auth.error) && (
            <p role="alert" className="text-[15px] text-destructive">
              {error || auth.error}
            </p>
          )}
          <Button
            type="submit"
            disabled={
              busy || !auth.configured || auth.loading || (mode === "pending" && cooldown > 0)
            }
            className="min-h-12 rounded-full"
          >
            {busy
              ? "Please wait…"
              : mode === "up"
                ? "Create Account"
                : mode === "in"
                  ? "Sign In"
                  : mode === "forgot"
                    ? "Send reset link"
                    : cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : "Resend confirmation"}
          </Button>
        </form>
        {mode === "in" && (
          <Button variant="ghost" onClick={() => switchMode("forgot")}>
            Forgot password?
          </Button>
        )}
        {(mode === "up" || mode === "in") && (
          <div className="flex flex-col gap-3 border-t border-separator pt-4">
            {providers.google && (
              <Button
                variant="outline"
                className="google-sign-in min-h-11 gap-2.5 rounded-full"
                disabled={busy}
                onClick={() => social("google")}
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                Continue with Google
              </Button>
            )}
            {providers.lovable && (
              <Button
                variant="outline"
                className="min-h-11 rounded-full"
                disabled={busy}
                onClick={() => social("lovable")}
              >
                <LovableMark />
                Continue with Lovable
              </Button>
            )}
          </div>
        )}
        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          disabled={busy}
          onClick={() => switchMode(mode === "up" ? "in" : "up")}
        >
          {mode === "up" ? "Already have an account? Sign In" : "Create Account"}
        </Button>
        {mode === "in" && (
          <Button variant="ghost" onClick={() => switchMode("pending")}>
            Resend confirmation email
          </Button>
        )}
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            savePlatformPreferences({ ...preferences, completed: true });
            void navigate({ href: "/#events", replace: true });
          }}
        >
          Continue as Guest
        </Button>
      </main>
    </div>
  );
}
