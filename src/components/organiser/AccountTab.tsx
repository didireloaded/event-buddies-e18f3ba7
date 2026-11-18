import { Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dbError, signedUrl, uploadOwnFile } from "@/lib/organiser/data";
import {
  IMAGE_TYPES,
  validateImageFile,
  validateVerificationFile,
  verificationStatusCopy,
} from "@/lib/organiser/schema";
import { PrimaryButton, SecondaryButton, Section } from "@/components/companion/ui";
import type { OrgCtx } from "./OrganiserApp";

export function AccountTab({ ctx }: { ctx: OrgCtx }) {
  const { profile, userId, reload } = ctx;
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [organisation, setOrganisation] = useState(profile?.organisation ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setOrganisation(profile?.organisation ?? "");
  }, [profile?.display_name, profile?.organisation]);

  useEffect(() => {
    let active = true;
    void signedUrl(profile?.logo_path ?? null).then((url) => {
      if (active) setLogoUrl(url);
    });
    return () => {
      active = false;
    };
  }, [profile?.logo_path]);

  async function upsertProfile(patch: {
    display_name?: string;
    organisation?: string;
    logo_path?: string | null;
    verification_document_path?: string | null;
    verification_status?: string;
  }) {
    if (!profile && patch.verification_status === "pending") {
      const { error: initErr } = await supabase.from("organiser_profiles").insert({
        user_id: userId,
        display_name: displayName.trim(),
        organisation: organisation.trim(),
      });
      if (initErr) throw new Error(dbError(initErr.message));
    }
    const payload = {
      user_id: userId,
      display_name: patch.display_name ?? displayName.trim(),
      organisation: patch.organisation ?? organisation.trim(),
      ...(patch.logo_path !== undefined ? { logo_path: patch.logo_path } : {}),
      ...(patch.verification_document_path !== undefined
        ? { verification_document_path: patch.verification_document_path }
        : {}),
      ...(patch.verification_status !== undefined
        ? { verification_status: patch.verification_status }
        : {}),
    };
    const { error: dbErr } = await supabase
      .from("organiser_profiles")
      .upsert(payload, { onConflict: "user_id" });
    if (dbErr) throw new Error(dbError(dbErr.message));
    await reload();
  }

  async function saveBasics(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await upsertProfile({
        display_name: displayName.trim(),
        organisation: organisation.trim(),
      });
      setStatus("Organiser profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save organiser profile.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogo(file: File) {
    const problem = validateImageFile(file, 5 * 1024 * 1024);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const path = await uploadOwnFile(userId, file, "logo");
      await upsertProfile({ logo_path: path });
      setStatus("Organisation logo saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t upload the logo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerification(file: File) {
    const problem = validateVerificationFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const path = await uploadOwnFile(userId, file, "verification");
      await upsertProfile({
        verification_document_path: path,
        verification_status: "pending",
      });
      setStatus("Verification proof submitted. Review status is pending.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t submit verification proof.");
    } finally {
      setBusy(false);
    }
  }

  const verification = profile?.verification_status ?? "unverified";

  return (
    <div className="py-4">
      <h1 className="ios-large-title">Organiser account</h1>

      <Section title="Profile & logo" id="org-profile">
        <form onSubmit={(e) => void saveBasics(e)} className="ios-card space-y-4 p-4">
          <div className="flex items-center gap-4">
            <div className="grid size-16 flex-none place-items-center overflow-hidden rounded-2xl bg-secondary text-[13px] font-semibold text-muted-foreground">
              {logoUrl ? (
                <img src={logoUrl} alt="Organisation logo" className="h-full w-full object-cover" />
              ) : (
                "Logo"
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="ios-press inline-flex min-h-11 cursor-pointer items-center rounded-full bg-secondary px-4 text-[15px] font-semibold">
                {logoUrl ? "Replace logo" : "Upload logo"}
                <input
                  type="file"
                  accept={IMAGE_TYPES.join(",")}
                  disabled={busy}
                  className="sr-only"
                  onChange={(e) => {
                    const chosen = e.currentTarget.files?.[0];
                    e.currentTarget.value = "";
                    if (chosen) void handleLogo(chosen);
                  }}
                />
              </label>
              {logoUrl && (
                <button
                  type="button"
                  disabled={busy}
                  className="min-h-11 text-[15px] font-semibold text-destructive"
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    setStatus("");
                    try {
                      await upsertProfile({ logo_path: null });
                      setStatus("Logo removed.");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Couldn’t remove the logo.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <label className="block text-[15px] font-semibold">
            Your name
            <input
              className="ios-field mt-1"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex Shikongo"
            />
          </label>
          <label className="block text-[15px] font-semibold">
            Organisation name
            <input
              className="ios-field mt-1"
              maxLength={120}
              value={organisation}
              onChange={(e) => setOrganisation(e.target.value)}
              placeholder="Namib Rage Events"
            />
          </label>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </PrimaryButton>
        </form>
      </Section>

      <Section title="Organisation verification" id="org-verification">
        <div className="ios-card space-y-3 p-4">
          <p className="text-[15px] font-semibold capitalize">Status: {verification}</p>
          <p className="text-[15px] text-muted-foreground">
            {verificationStatusCopy(verification)}
          </p>
          {verification !== "verified" && (
            <label className="ios-press inline-flex min-h-11 cursor-pointer items-center rounded-full bg-secondary px-4 text-[15px] font-semibold">
              {verification === "pending"
                ? "Replace verification file"
                : "Upload verification document"}
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                disabled={busy}
                className="sr-only"
                onChange={(e) => {
                  const chosen = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  if (chosen) void handleVerification(chosen);
                }}
              />
            </label>
          )}
          <p className="text-[13px] text-muted-foreground">
            PDF, JPG, PNG or WebP up to 10 MB. Approval requires an administrator review.
          </p>
        </div>
      </Section>

      {status && (
        <p role="status" className="mt-4 rounded-xl bg-secondary px-4 py-3 text-[15px]">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-warning-soft px-4 py-3 text-[15px]">
          {error}
        </p>
      )}

      <Section title="Privacy & access" id="org-privacy">
        <div className="ios-card space-y-3 p-4">
          <p className="text-[15px] text-muted-foreground">
            Drafts, uploaded files and event records are scoped to your account by database rules.
            Full workspace data deletion awaits an approved retention and ownership-transfer policy.
          </p>
          <Link to="/" className="flex min-h-11 items-center font-semibold text-primary">
            Open attendee app
          </Link>
          <SecondaryButton
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const { error: outErr } = await supabase.auth.signOut({ scope: "local" });
                if (outErr) throw outErr;
              } catch {
                setError("Couldn’t sign out. Check your connection and try again.");
                setBusy(false);
              }
            }}
          >
            Sign out
          </SecondaryButton>
        </div>
      </Section>
    </div>
  );
}
