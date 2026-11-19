import { clearAccountCache, queuedActions } from "@/lib/account/outbox";
import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";
import { deleteMyAccountData } from "@/lib/organiser/cloud-extensions";
import { useState } from "react";
import { Cloud, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanion } from "./context";
import { storageKey, parseStoredPreferences } from "@/lib/attendee/use-attendee";
import { Sheet } from "./Sheet";
import { PrimaryButton } from "./ui";

export function AccountPanel() {
  const { attendee, data, crew } = useCompanion();
  const { auth, sync } = attendee;
  const terms = getEventCategoryTerms(data.event.category);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copyMeeting, setCopyMeeting] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkNotice, setLinkNotice] = useState("");
  const [guest, setGuest] = useState<ReturnType<typeof parseStoredPreferences> | null>(null);
  function reviewImport() {
    try {
      setCopyMeeting(false);
      const raw = localStorage.getItem(storageKey(data.event.id));
      setGuest(raw ? parseStoredPreferences(JSON.parse(raw), data) : null);
      setImporting(true);
    } catch {
      setError("This phone’s guest plan couldn’t be read.");
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const result = await supabase.auth.signOut({ scope: "local" });
      if (result.error) throw result.error;
      setConfirmLeave(false);
    } catch {
      setError("Couldn’t sign out. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-5 ios-card space-y-3 p-4" aria-labelledby="account-heading">
      <div className="flex items-center gap-2">
        <Cloud size={21} className="text-favorite" />
        <h2 id="account-heading" className="text-[20px] font-semibold">
          Your account
        </h2>
      </div>
      {auth.loading ? (
        <p role="status" className="text-[15px] text-muted-foreground">
          Checking sign-in…
        </p>
      ) : auth.user ? (
        <>
          <p className="break-words text-[15px]">{auth.user.email ?? "Guest cloud session"}</p>
          {!auth.user.email && (
            <form
              className="space-y-2 rounded-xl bg-secondary p-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!linkEmail.trim() || busy) return;
                setBusy(true);
                setError("");
                setLinkNotice("");
                try {
                  const { error: linkErr } = await supabase.auth.updateUser({
                    email: linkEmail.trim(),
                  });
                  if (linkErr)
                    setError("Couldn’t link that email. Check the address and try again.");
                  else setLinkNotice("Check your inbox to confirm and keep this cloud account.");
                } catch {
                  setError("Couldn’t link your email right now.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="block text-[14px] font-medium">
                Link an email to keep this guest cloud account
                <input
                  type="email"
                  required
                  className="ios-field mt-1"
                  placeholder="you@example.com"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={busy || !linkEmail.trim()}
                className="min-h-11 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground disabled:opacity-50"
              >
                Link email
              </button>
              {linkNotice && (
                <p role="status" className="text-[13px] text-muted-foreground">
                  {linkNotice}
                </p>
              )}
            </form>
          )}
          <p role="status" className="text-[15px] text-muted-foreground">
            {sync.status === "checking" || sync.status === "guest"
              ? "Syncing favourites and meeting plan…"
              : sync.status === "offline"
                ? `Offline · ${sync.pending} changes waiting to sync`
                : sync.status === "error"
                  ? "Account sync needs attention"
                  : "Favourites and meeting plan saved to your account."}
          </p>
          {sync.error && (
            <p role="alert" className="text-[15px] text-destructive">
              {sync.error}
            </p>
          )}
          <button
            type="button"
            disabled={busy || sync.status === "checking"}
            className="min-h-11 font-medium text-favorite disabled:opacity-50"
            onClick={sync.retry}
          >
            {sync.status === "checking" ? "Syncing…" : "Sync now"}
          </button>
          <button
            type="button"
            className="block min-h-11 text-left text-favorite"
            onClick={reviewImport}
          >
            Review this phone’s guest favourites & meeting
          </button>
          <button
            type="button"
            disabled={busy}
            className="flex min-h-11 items-center gap-2 text-favorite disabled:opacity-50"
            onClick={() => {
              if (queuedActions(attendee.scope).length || crew.pending) setConfirmLeave(true);
              else void signOut();
            }}
          >
            <LogOut size={18} />
            {busy ? "Signing out…" : "Sign out"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="block min-h-11 text-left text-[15px] font-semibold text-destructive disabled:opacity-50"
            onClick={() => setConfirmDelete(true)}
          >
            Delete synced account data
          </button>
          <p className="text-[14px] text-muted-foreground">
            Suggested day plans, ticket copies and photos stay on this device. Your account’s
            meeting plan is private to you.
          </p>
        </>
      ) : (
        <>
          <p className="text-[15px] text-muted-foreground">
            Sign in to keep favourite {terms.peopleLabel.toLowerCase()} and your meeting plan
            available on your other phones.
          </p>
          {auth.configured ? (
            <a
              href="/login?next=%2F%23you"
              className="flex min-h-11 items-center font-semibold text-favorite"
            >
              Sign in or create an account
            </a>
          ) : (
            <p className="text-[15px] text-muted-foreground">
              Account connection settings are pending. Your device saves remain available.
            </p>
          )}
        </>
      )}
      {(error || auth.error) && (
        <p role="alert" className="text-[15px] text-destructive">
          {error || auth.error}
        </p>
      )}
      {importing && (
        <Sheet title="Copy this phone’s guest plan?" onClose={() => setImporting(false)}>
          <p className="mb-3 text-[17px]">
            {guest?.savedArtists.length ?? 0} favourite {terms.peopleLabel.toLowerCase()}
            {guest?.meeting ? " and a meeting plan" : ""} are saved in this browser’s guest space.
          </p>
          <p className="mb-4 text-[15px] text-muted-foreground">
            Only copy these if they belong to you. Existing account favourites will be kept.
          </p>
          {guest?.meeting && (
            <label className="mb-4 flex min-h-11 items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={copyMeeting}
                onChange={(event) => setCopyMeeting(event.target.checked)}
              />
              Also copy the guest meeting, replacing my account meeting
            </label>
          )}
          <PrimaryButton
            disabled={!guest || (!guest.savedArtists.length && !(guest.meeting && copyMeeting))}
            onClick={() => {
              if (!guest) return;
              const ok = attendee.update({
                savedArtists: [
                  ...new Set([...attendee.preferences.savedArtists, ...guest.savedArtists]),
                ],
                ...(copyMeeting && guest.meeting ? { meeting: guest.meeting } : {}),
              });
              if (ok) setImporting(false);
            }}
          >
            Copy selected saves to my account
          </PrimaryButton>
        </Sheet>
      )}
      {confirmLeave && (
        <Sheet title="Sign out with queued changes?" onClose={() => setConfirmLeave(false)}>
          <p className="mb-4 text-[17px]">
            {sync.pending + (crew.pending ? 1 : 0)} changes have not reached your account. Signing
            out removes this account’s local cache and queued changes from this phone.
          </p>
          <PrimaryButton
            disabled={busy}
            onClick={() => {
              void signOut();
            }}
          >
            Sign out & discard queued changes
          </PrimaryButton>
          <button
            type="button"
            className="mt-2 min-h-11 w-full text-favorite"
            onClick={() => setConfirmLeave(false)}
          >
            Keep syncing
          </button>
        </Sheet>
      )}
      {confirmDelete && (
        <Sheet title="Delete synced account data?" onClose={() => setConfirmDelete(false)}>
          <p className="mb-4 text-[17px]">
            This deletes your synced favourites, private meeting plan and crew membership from
            Lovable Cloud, transfers any crew you own to the longest-standing member, and signs you
            out.
          </p>
          <PrimaryButton
            className="bg-destructive"
            disabled={busy}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              setError("");
              const res = await deleteMyAccountData();
              if (!res.ok) {
                setBusy(false);
                setError(res.error);
                setConfirmDelete(false);
                return;
              }
              clearAccountCache(attendee.scope);
              await signOut();
              setConfirmDelete(false);
            }}
          >
            Delete synced data & sign out
          </PrimaryButton>
          <button
            type="button"
            className="mt-2 min-h-11 w-full text-favorite"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
        </Sheet>
      )}
    </section>
  );
}
