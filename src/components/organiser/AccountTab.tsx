import { Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dbError, signedUrl, uploadOwnFile } from "@/lib/organiser/data";
import {
  deleteMyAccountData,
  listAdminVerifications,
  listOrganiserTeamMembers,
  manageOrganiserTeamMember,
  reviewOrganiserVerification,
  type AdminVerificationRow,
  type OrganiserTeamMember,
} from "@/lib/organiser/cloud-extensions";
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
  const [adminRows, setAdminRows] = useState<AdminVerificationRow[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [team, setTeam] = useState<OrganiserTeamMember[]>([]);
  const [teamEmail, setTeamEmail] = useState("");
  const [teamRole, setTeamRole] = useState<OrganiserTeamMember["role"]>("editor");

  useEffect(() => {
    let active = true;
    void Promise.all([listAdminVerifications(), listOrganiserTeamMembers(userId)]).then(
      ([rows, members]) => {
        if (!active) return;
        setAdminRows(rows);
        setTeam(members);
      },
    );
    return () => {
      active = false;
    };
  }, [userId]);

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
                <img
                  src={logoUrl}
                  alt="Organisation logo"
                  width={64}
                  height={64}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
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

      <Section title="Team roles & collaborators" id="org-team">
        <div className="ios-card space-y-3 p-4">
          <p className="text-[14px] text-muted-foreground">
            Your account is the workspace owner. Assign team roles for event editors, live
            operations staff or read-only reviewers.
          </p>
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || !teamEmail.trim()) return;
              setBusy(true);
              setError("");
              setStatus("");
              try {
                const res = await manageOrganiserTeamMember(userId, "upsert", teamEmail, teamRole);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setTeam(res.members);
                setTeamEmail("");
                setStatus("Collaborator role saved.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="email"
                required
                aria-label="Collaborator email"
                className="ios-field"
                placeholder="teammate@example.com"
                value={teamEmail}
                onChange={(e) => setTeamEmail(e.target.value)}
              />
              <select
                aria-label="Collaborator role"
                className="ios-field"
                value={teamRole}
                onChange={(e) => setTeamRole(e.target.value as OrganiserTeamMember["role"])}
              >
                <option value="editor">Editor (drafts & zones)</option>
                <option value="live_ops">Live ops (schedule & issues)</option>
                <option value="viewer">Viewer (read-only)</option>
              </select>
            </div>
            <SecondaryButton type="submit" disabled={busy || !teamEmail.trim()}>
              Assign team role
            </SecondaryButton>
          </form>
          {team.length > 0 && (
            <ul className="divide-y divide-border pt-2 text-[14px]">
              {team.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 break-all">
                    <strong>{m.email}</strong> ·{" "}
                    <span className="uppercase text-primary">{m.role}</span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-11 flex-none px-2 text-[13px] font-semibold text-destructive disabled:opacity-50"
                    onClick={async () => {
                      if (busy) return;
                      setBusy(true);
                      setError("");
                      setStatus("");
                      try {
                        const res = await manageOrganiserTeamMember(userId, "remove", m.email);
                        if (!res.ok) {
                          setError(res.error);
                          return;
                        }
                        setTeam(res.members);
                        setStatus("Collaborator removed.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
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
          {!confirmDelete ? (
            <button
              type="button"
              disabled={busy}
              className="min-h-11 text-[15px] font-semibold text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Delete my synced account data
            </button>
          ) : (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-[14px] text-muted-foreground">
                Deletes your unpublished drafts and synced attendee data, transfers any crew you own
                to the longest-standing member, and signs you out.
              </p>
              <div className="flex gap-2">
                <PrimaryButton
                  className="bg-destructive"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    const res = await deleteMyAccountData();
                    if (!res.ok) {
                      setBusy(false);
                      setError(res.error);
                      return;
                    }
                    await supabase.auth.signOut({ scope: "local" });
                    setBusy(false);
                  }}
                >
                  Confirm delete
                </PrimaryButton>
                <SecondaryButton onClick={() => setConfirmDelete(false)}>Cancel</SecondaryButton>
              </div>
            </div>
          )}
        </div>
      </Section>

      {adminRows && (
        <Section title="Admin verification queue" id="org-admin-queue">
          <div className="ios-card divide-y divide-border p-4">
            {adminRows.length === 0 ? (
              <p className="text-[15px] text-muted-foreground">No organiser profiles submitted.</p>
            ) : (
              adminRows.map((row) => (
                <div key={row.userId} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <p className="text-[16px] font-semibold">
                    {row.organisation || "Unnamed organisation"} ·{" "}
                    {row.displayName || row.userId.slice(0, 8)}
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Status: <strong className="capitalize">{row.verificationStatus}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || row.verificationStatus === "verified"}
                      className="min-h-11 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground disabled:opacity-50"
                      onClick={async () => {
                        setBusy(true);
                        const res = await reviewOrganiserVerification(row.userId, "verified");
                        if (!res.ok) setError(res.error);
                        else setAdminRows(await listAdminVerifications());
                        await reload();
                        setBusy(false);
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy || row.verificationStatus === "rejected"}
                      className="min-h-11 rounded-full border border-border px-4 text-[14px] font-semibold disabled:opacity-50"
                      onClick={async () => {
                        setBusy(true);
                        const res = await reviewOrganiserVerification(row.userId, "rejected");
                        if (!res.ok) setError(res.error);
                        else setAdminRows(await listAdminVerifications());
                        await reload();
                        setBusy(false);
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
