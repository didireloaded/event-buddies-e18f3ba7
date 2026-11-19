import { useState } from "react";
import { askEvent } from "@/lib/event-assistant/assistant.functions";
import { eventFacts, searchLocalFacts, type EventFact } from "@/lib/attendee/event-facts";
import { useCompanion } from "./context";
import { PrimaryButton } from "./ui";

function FactBadge({ status }: { status: EventFact["status"] }) {
  const styles =
    status === "verified"
      ? "bg-favorite-soft text-primary"
      : status === "sample"
        ? "bg-warning-soft text-foreground"
        : "bg-secondary text-muted-foreground";
  const label =
    status === "verified"
      ? "Verified"
      : status === "sample"
        ? "Sample"
        : status === "outdated"
          ? "Outdated"
          : "Pending";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles}`}>
      {label}
    </span>
  );
}

export function EventAssistant() {
  const { data } = useCompanion();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<EventFact[] | null>(null);
  const facts = eventFacts(data);

  return (
    <section className="mx-4 mt-6 border-y border-border py-4" aria-labelledby="assistant-title">
      <h2 id="assistant-title" className="ios-section-title">
        Ask about {data.event.name}
      </h2>
      <p className="mb-3 text-[15px] text-muted-foreground">
        Rules, transport and venue facilities from the verified event guide. Unpublished details are
        marked clearly as pending.
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
              data: {
                question,
                eventId: data.event.id,
                eventName: data.event.name,
                facts,
              },
              signal: AbortSignal.timeout(8000),
            });
            if (result.ok) {
              setAnswer(result.facts);
            } else {
              const localMatches = searchLocalFacts(data, question);
              if (localMatches.length > 0) setAnswer(localMatches);
              setError(result.error);
            }
          } catch {
            const localMatches = searchLocalFacts(data, question);
            if (localMatches.length > 0) setAnswer(localMatches);
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
            Not covered in the published event guide. Check the official event page or ask the
            organiser.
          </p>
        )}
        {answer?.map((fact) => (
          <div key={fact.id} className="border-t border-border py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{fact.title}</h3>
              <FactBadge status={fact.status} />
            </div>
            <p className="mt-1">{fact.text}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Source: {fact.source} · Checked {fact.updatedAt}
            </p>
          </div>
        ))}
      </div>
      <details className="mt-2">
        <summary className="min-h-11 cursor-pointer content-center font-semibold">
          Read the saved event answers
        </summary>
        <dl>
          {facts.map((fact) => (
            <div className="border-t border-border py-3" key={fact.id}>
              <dt className="flex items-center justify-between gap-2 text-[16px] font-semibold">
                <span>{fact.title}</span>
                <FactBadge status={fact.status} />
              </dt>
              <dd className="mt-1 text-[15px] text-muted-foreground">{fact.text}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
