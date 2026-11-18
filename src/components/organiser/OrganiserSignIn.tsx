import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryButton } from "@/components/companion/ui";

export function OrganiserSignIn() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/organiser` },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        Event Buddies
      </p>
      <h1 className="ios-large-title mt-1">Organiser sign-in</h1>
      <p className="mt-2 text-[16px] text-muted-foreground">
        We’ll email you a sign-in link. No password needed.
      </p>
      {state === "sent" ? (
        <p role="status" className="mt-6 rounded-xl bg-secondary px-4 py-3 text-[16px]">
          Check {email} for your sign-in link.
        </p>
      ) : (
        <form onSubmit={send} className="mt-6 space-y-3">
          <label className="block text-[15px] font-medium" htmlFor="org-email">
            Work email
          </label>
          <input
            id="org-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="ios-field w-full"
          />
          {state === "error" && (
            <p role="alert" className="text-[15px] text-destructive">
              Couldn’t send the link. Try again.
            </p>
          )}
          {offline && <p className="text-[15px] text-muted-foreground">You’re offline. Connect to sign in.</p>}
          <PrimaryButton type="submit" disabled={state === "sending" || offline}>
            {state === "sending" ? "Sending…" : "Email me a link"}
          </PrimaryButton>
        </form>
      )}
      <Link to="/" className="mt-8 min-h-11 text-[15px] text-primary">
        Back to the attendee app
      </Link>
    </main>
  );
}
