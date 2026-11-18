import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleDashed, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dbError, uploadOwnFile } from "@/lib/organiser/data";
import { extractEventFromPdf } from "@/lib/organiser/extract.functions";
import { validatePdf } from "@/lib/organiser/schema";
import { PrimaryButton, SecondaryButton, Section } from "@/components/companion/ui";
import type { OrgCtx } from "./OrganiserApp";

type Step = "idle" | "draft" | "upload" | "extract" | "done" | "error";

const CHECKLIST = [
  { key: "draft", label: "Create private draft" },
  { key: "upload", label: "Upload PDF document" },
  { key: "extract", label: "Read printed event facts" },
] as const;

export function CreateTab({ ctx }: { ctx: OrgCtx }) {
  const [step, setStep] = useState<Step>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelledRef.current = true;
    };
  }, []);

  async function processPdf(file: File) {
    const problem = validatePdf(file);
    if (problem) {
      setError(problem);
      setStep("error");
      return;
    }
    if (offline) {
      setError("You’re offline. Connect before uploading a PDF.");
      setStep("error");
      return;
    }

    cancelledRef.current = false;
    setFileName(file.name);
    setError("");
    setMissing([]);
    setCreatedId(null);

    try {
      setStep("draft");
      const { data: inserted, error: insErr } = await supabase
        .from("organiser_events")
        .insert({
          owner_id: ctx.userId,
          status: "draft",
          source_label: file.name.slice(0, 120),
        })
        .select("id")
        .single();
      if (insErr || !inserted) throw new Error(dbError(insErr?.message));
      if (cancelledRef.current || !mountedRef.current) return;
      setCreatedId(inserted.id);

      setStep("upload");
      const path = await uploadOwnFile(ctx.userId, file, "pdfs");
      const { error: pathErr } = await supabase
        .from("organiser_events")
        .update({ source_pdf_path: path })
        .eq("id", inserted.id);
      if (pathErr) throw new Error(dbError(pathErr.message));
      if (cancelledRef.current || !mountedRef.current) return;

      setStep("extract");
      const result = await extractEventFromPdf({ data: { eventId: inserted.id } });
      if (cancelledRef.current || !mountedRef.current) return;
      if (!result.ok) {
        setError(`${result.error} Your draft was kept so you can fill details manually.`);
        setStep("error");
        await ctx.reload();
        return;
      }

      setMissing(result.missing);
      setStep("done");
      await ctx.reload();
    } catch (err) {
      if (cancelledRef.current || !mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Couldn’t upload this PDF. Try again.");
      setStep("error");
    }
  }

  async function createBlankDraft() {
    if (offline) {
      setError("You’re offline. Connect to create a draft.");
      return;
    }
    setError("");
    const { data, error: insErr } = await supabase
      .from("organiser_events")
      .insert({ owner_id: ctx.userId, status: "draft" })
      .select("id")
      .single();
    if (insErr || !data) {
      setError(dbError(insErr?.message));
      return;
    }
    await ctx.reload();
    ctx.go("events", data.id);
  }

  const busy = step === "draft" || step === "upload" || step === "extract";
  const order = ["draft", "upload", "extract", "done"];

  return (
    <div className="py-4">
      <h1 className="ios-large-title">Create event</h1>
      <p className="mt-1 text-[16px] text-muted-foreground">
        Upload an event PDF or start a blank draft. Everything stays private until you review and
        publish.
      </p>

      <Section title="1. Upload a PDF" id="org-create-pdf">
        <div className="ios-card space-y-4 p-4">
          <div className="flex items-start gap-3">
            <FileText size={22} className="mt-0.5 flex-none text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="text-[16px] font-semibold">Lineup, programme or info sheet</p>
              <p className="text-[14px] text-muted-foreground">
                PDF only, up to 50 MB. Missing fields stay marked “Not found” for you to fill in.
              </p>
            </div>
          </div>

          {offline && (
            <p role="status" className="text-[14px] text-muted-foreground">
              You’re offline. PDF upload requires a connection.
            </p>
          )}

          <label
            className={`ios-press flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-[17px] font-semibold text-primary-foreground ${
              busy || offline ? "pointer-events-none opacity-50" : "cursor-pointer"
            }`}
          >
            {busy ? "Working on PDF…" : "Choose PDF file"}
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy || offline}
              className="sr-only"
              onChange={(e) => {
                const chosen = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (chosen) void processPdf(chosen);
              }}
            />
          </label>

          {fileName && step !== "idle" && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="truncate text-[14px] font-medium">{fileName}</p>
              <ul className="space-y-1.5 text-[14px]">
                {CHECKLIST.map((item) => {
                  const done = order.indexOf(step) > order.indexOf(item.key) || step === "done";
                  const active = step === item.key;
                  return (
                    <li key={item.key} className="flex items-center gap-2">
                      {done ? (
                        <CheckCircle2 size={16} className="text-success" aria-hidden />
                      ) : (
                        <CircleDashed
                          size={16}
                          className={active ? "text-primary" : "text-muted-foreground"}
                          aria-hidden
                        />
                      )}
                      <span className={active ? "font-semibold" : "text-muted-foreground"}>
                        {item.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {busy && (
                <button
                  type="button"
                  className="min-h-11 text-[15px] font-semibold text-destructive"
                  onClick={() => {
                    cancelledRef.current = true;
                    setStep("idle");
                    setError(
                      "PDF upload cancelled. Reopen Drafts if the draft was already created.",
                    );
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {step === "done" && createdId && (
            <div role="status" className="space-y-3 border-t border-border pt-3">
              <p className="text-[15px] font-semibold">Draft ready for human review.</p>
              {missing.length > 0 && (
                <p className="text-[14px] text-muted-foreground">
                  Not found in document: {missing.join(", ")}.
                </p>
              )}
              <PrimaryButton onClick={() => ctx.go("events", createdId)}>
                Review extracted draft
              </PrimaryButton>
            </div>
          )}

          {error && (
            <div role="alert" className="space-y-2 rounded-xl bg-warning-soft p-3 text-[14px]">
              <p>{error}</p>
              {createdId && (
                <button
                  type="button"
                  className="min-h-11 font-semibold text-primary"
                  onClick={() => ctx.go("events", createdId)}
                >
                  Open saved draft
                </button>
              )}
            </div>
          )}

          <SecondaryButton disabled={busy || offline} onClick={() => void createBlankDraft()}>
            Start blank draft instead
          </SecondaryButton>
        </div>
      </Section>

      <Section title="2. Find an event to claim" id="org-create-claim">
        <div className="ios-card space-y-2 p-4">
          <p className="text-[16px] font-semibold">Partner event feeds unavailable</p>
          <p className="text-[14px] text-muted-foreground">
            Authorized partner feeds for What’s On Namibia and All Things Swakopmund aren’t
            connected yet. Webtickets pages aren’t scraped; external ticket URLs can be added after
            creating a draft.
          </p>
        </div>
      </Section>
    </div>
  );
}
