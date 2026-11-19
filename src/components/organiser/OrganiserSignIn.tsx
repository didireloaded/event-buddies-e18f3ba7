import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryButton } from "@/components/companion/ui";

export function OrganiserSignIn() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const syncOnline = () => setOffline(!navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending" || offline || !email.trim()) return;
    setState("sending");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/organiser` },
      });
      setState(error ? "error" : "sent");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="border-b border-separator pb-5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-md bg-primary text-[12px] font-extrabold text-primary-foreground"
          >
            EB
          </span>
          <p className="eb-kicker">Event Buddies · Organiser Studio</p>
        </div>
        <h1 className="eb-page-title mt-3">Organiser sign-in</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Create, customise and publish multi-event experiences. We’ll email you a sign-in link — no
          password needed.
        </p>
      </div>

      {state === "sent" ? (
        <div className="mt-6 space-y-3">
          <p role="status" className="eb-panel px-4 py-3.5 text-[15px]">
            Check <strong>{email.trim()}</strong> for your sign-in link.
          </p>
          <button
            type="button"
            className="min-h-11 text-[15px] font-semibold text-primary"
            onClick={() => setState("idle")}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="mt-6 space-y-4">
          <label className="block text-[14px] font-semibold" htmlFor="org-email">
            Work email
          </label>
          <input
            id="org-email"
            type="email"
            required
            autoComplete="email"
            placeholder="team@organisation.com"
            aria-invalid={state === "error" || undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="eb-field w-full"
          />
          {state === "error" && (
            <p role="alert" className="text-[14px] font-medium text-destructive">
              Couldn’t send the link. Try again.
            </p>
          )}
          {offline && (
            <p role="status" className="text-[14px] text-muted-foreground">
              You’re offline. Connect to sign in.
            </p>
          )}
          <PrimaryButton type="submit" disabled={state === "sending" || offline}>
            {state === "sending" ? "Sending…" : "Email me a link"}
          </PrimaryButton>
        </form>
      )}
      <Link
        to="/"
        className="mt-8 inline-flex min-h-11 items-center text-[15px] font-semibold text-primary"
      >
        ‹ Back to the attendee app
      </Link>
    </main>
  );
}
