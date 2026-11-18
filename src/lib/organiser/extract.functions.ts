import { createServerFn } from "@tanstack/react-start";
import { GatewayError, generateResponse } from "@lovable.dev/ai-gateway";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractionJsonSchema, extractionSchema, missingFields, PDF_MAX_BYTES } from "./schema";

const INSTRUCTIONS = `You read an event document supplied by its organiser and copy facts into JSON.
Rules:
- Copy only facts printed in the document. If a field is not stated, return null. Never guess.
- Dates as YYYY-MM-DD, times as HH:MM 24h, only when printed.
- program lists performers, speakers or sessions exactly as printed. Use null for missing place or time.
- event_type: festival, conference or corporate only when obvious; otherwise null.`;

type Result = { ok: true; missing: string[] } | { ok: false; error: string };

export const extractEventFromPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("organiser_events")
      .select("id, source_pdf_path, status")
      .eq("id", data.eventId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error || !row) return { ok: false, error: "Draft not found." };
    if (!row.source_pdf_path) return { ok: false, error: "No PDF attached to this draft." };
    const file = await supabase.storage.from("organiser-files").download(row.source_pdf_path);
    if (file.error || !file.data) return { ok: false, error: "Couldn’t open the uploaded PDF." };
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > PDF_MAX_BYTES)
      return { ok: false, error: "PDF must be non-empty and 50 MB or smaller." };
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const base64 = btoa(binary);
    try {
      const response = await generateResponse(
        {
          model: "openai/gpt-6-astra",
          instructions: INSTRUCTIONS,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_file",
                  filename: "event.pdf",
                  file_data: `data:application/pdf;base64,${base64}`,
                },
                { type: "input_text", text: "Extract the event facts." },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "event_extraction",
              strict: true,
              schema: extractionJsonSchema as unknown as Record<string, unknown>,
            },
          },
        },
        { signal: AbortSignal.timeout(25000) },
      );
      const text = response.output
        .flatMap((item) => (item.type === "message" ? item.content : []))
        .map((part) => (part.type === "output_text" ? part.text : ""))
        .join("");
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return { ok: false, error: "The document reader returned unreadable data. Try again." };
      }
      const parsed = extractionSchema.safeParse(json);
      if (!parsed.success)
        return { ok: false, error: "Extracted details failed checks. Try again." };
      const x = parsed.data;
      const missing = missingFields(x);
      const update = await supabase
        .from("organiser_events")
        .update({
          ...(x.event_type ? { event_type: x.event_type } : {}),
          name: x.name ?? "",
          start_date: x.start_date,
          end_date: x.end_date,
          venue: x.venue ?? "",
          gates_open: x.gates_open ?? "",
          entry_rules: x.entry_rules ?? "",
          program: x.program.map((p) => ({
            title: p.title,
            place: p.place ?? "",
            time: p.time ?? "",
            status: "scheduled",
          })),
          extraction_missing: missing,
        })
        .eq("id", data.eventId);
      if (update.error) return { ok: false, error: "Couldn’t save the extracted details." };
      return { ok: true, missing };
    } catch (err) {
      if (err instanceof GatewayError) {
        if (err.httpStatus === 402) return { ok: false, error: "AI credits have run out." };
        if (err.httpStatus === 429)
          return { ok: false, error: "Too many requests. Try again in a minute." };
      }
      return { ok: false, error: "Couldn’t read the document. Your draft is kept; try again." };
    }
  });
