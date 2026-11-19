import { useState } from "react";
import { askEvent } from "@/lib/event-assistant/assistant.functions";
import { eventFacts } from "@/lib/attendee/event-facts";
import { useCompanion } from "./context";
import { PrimaryButton } from "./ui";

export function EventAssistant() {
  const { data } = useCompanion();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<ReturnType<typeof eventFacts> | null>(null);
  return (
    <section className="mx-4 mt-6 border-y border-border py-4" aria-labelledby="assistant-title">
      <h2 id="assistant-title" className="ios-section-title">
        Ask about the festival
      </h2>
      <p className="mb-3 text-[15px] text-muted-foreground">
        Rules, transport and venue facilities, from the saved event information. Unpublished details
        are noted clearly.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          if (question.trim().length < 3) {
            setError("Ask a question with at least three characters.");
            return;
          }
          setBusy(true);
          setError("");
          setAnswer(null);
          try {
            if (!navigator.onLine) throw new Error("Offline");
            const result = await askEvent({
              data: { question },
              signal: AbortSignal.timeout(8000),
            });
            if (result.ok) setAnswer(result.facts);
            else setError(result.error);
          } catch {
            setError(
              "You can still read the saved event information below. Reconnect to ask the assistant.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-[15px] font-semibold">
          Your question
          <input
            className="ios-field my-2"
            value={question}
            maxLength={400}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Can I bring glass?"
          />
        </label>
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Checking event facts…" : "Ask the event assistant"}
        </PrimaryButton>
      </form>
      <div aria-live="polite" className="mt-3 text-[15px]">
        {error && <p role="alert">{error}</p>}
        {answer?.length === 0 && (
          <p>
            Answer pending. The existing event information does not cover that question. Check with
            the organiser.
          </p>
        )}
        {answer?.map((fact) => (
          <div key={fact.id} className="border-t border-border py-3">
            <h3 className="font-semibold">{fact.title}</h3>
            <p className="mt-1">{fact.text}</p>
            {fact.pending && (
              <p className="mt-2 font-semibold text-muted-foreground">
                Some details are pending organiser confirmation.
              </p>
            )}
          </div>
        ))}
      </div>
      <details className="mt-2">
        <summary className="min-h-11 cursor-pointer content-center font-semibold">
          Read the saved event answers
        </summary>
        <dl>
          {eventFacts(data).map((fact) => (
            <div className="border-t border-border py-3" key={fact.id}>
              <dt className="text-[17px] font-semibold">{fact.title}</dt>
              <dd className="mt-1 text-[15px] text-muted-foreground">{fact.text}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
