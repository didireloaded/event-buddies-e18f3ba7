import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/account/auth-errors";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Event Buddies" },
      {
        name: "description",
        content: "Choose a new password using your Event Buddies recovery email.",
      },
      { property: "og:title", content: "Reset your Event Buddies password" },
      { property: "og:description", content: "Secure account recovery for Event Buddies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});
function ResetPassword() {
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    const recoveryLink =
      new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (active && event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    if (recoveryLink)
      void supabase.auth.getUser().then(({ data }) => {
        if (active && data.user) setRecovery(true);
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!recovery || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(authErrorMessage(error));
      else void navigate({ href: "/#events", replace: true });
    } catch {
      setError("Couldn’t update your password. Check your connection and retry.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div data-app-scope="global" className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-5 py-8">
        <h1 className="eb-page-title">Reset password</h1>
        {recovery ? (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="text-[15px] font-semibold">
              New password
              <input
                className="eb-field mt-2"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Button disabled={busy} className="min-h-12 rounded-full">
              {busy ? "Updating password…" : "Save new password"}
            </Button>
          </form>
        ) : (
          <p role="status">
            Open the password reset link from your email. If it expired, request another.
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <Button variant="outline" onClick={() => void navigate({ href: "/login?mode=in" })}>
          Back to sign in
        </Button>
      </main>
    </div>
  );
}
