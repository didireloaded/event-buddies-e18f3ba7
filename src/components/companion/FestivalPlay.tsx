import { useState } from "react";
import {
  BINGO_ITEMS,
  PHOTO_PROMPTS,
  ICEBREAKERS,
  SOUND_OF_SUMMER_TRIVIA,
  randomItem,
} from "@/lib/attendee/play";
import { useCompanion } from "./context";
import { PrimaryButton, SecondaryButton, Segmented } from "./ui";

export function FestivalPlay() {
  const { data, places, attendee, openPlace, openSheet } = useCompanion();
  const [tab, setTab] = useState<"explore" | "bingo" | "trivia">("explore");
  const [stageId, setStageId] = useState<string | null>(null);
  const [photoPrompt, setPhotoPrompt] = useState(PHOTO_PROMPTS[0]);
  const [icebreaker, setIcebreaker] = useState(ICEBREAKERS[0]);
  const [challenge, setChallenge] = useState<(typeof BINGO_ITEMS)[number] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const stages = places.filter((p) => p.type === "stage");
  const existingPred = attendee.preferences.predictions;
  const [predStage, setPredStage] = useState(existingPred?.firstStageId || (stages[0]?.id ?? ""));
  const [predArtist, setPredArtist] = useState(
    existingPred?.anthemArtistId || (data.festival.artists[0]?.id ?? ""),
  );
  const [predNote, setPredNote] = useState(existingPred?.note ?? "");
  const stage = places.find((place) => place.id === stageId);
  const completed = attendee.preferences.bingo;
  return (
    <div className="space-y-5">
      <Segmented
        label="Festival extras"
        value={tab}
        options={[
          { value: "explore", label: "Explore" },
          { value: "bingo", label: "Bingo" },
          { value: "trivia", label: "Trivia & picks" },
        ]}
        onChange={setTab}
      />
      {tab === "explore" ? (
        <>
          <section className="space-y-3">
            <h3 className="text-[20px] font-semibold">Pick a challenge</h3>
            <PrimaryButton
              onClick={() =>
                setChallenge(
                  randomItem(BINGO_ITEMS.filter((item) => item.id !== challenge?.id)) ?? null,
                )
              }
            >
              Pick a challenge
            </PrimaryButton>
            {challenge && (
              <div aria-live="polite">
                <p className="text-[17px] font-semibold">{challenge.label}</p>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  A personal challenge. Progress is self-reported.
                </p>
                <SecondaryButton
                  className="mt-3"
                  onClick={() => {
                    if (!completed.includes(challenge.id))
                      attendee.update({ bingo: [...completed, challenge.id] });
                  }}
                >
                  {completed.includes(challenge.id) ? "Checked off" : "Mark complete"}
                </SecondaryButton>
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h3 className="text-[20px] font-semibold">Pick the next stage</h3>
            <p className="text-[16px] text-muted-foreground">
              A random stop from the supplied venue plan.
            </p>
            <PrimaryButton
              onClick={() =>
                setStageId(
                  randomItem(
                    places.filter((place) => place.type === "stage" && place.id !== stageId),
                  )?.id ?? null,
                )
              }
            >
              Pick a stage
            </PrimaryButton>
            {stage && (
              <SecondaryButton onClick={() => openPlace(stage.id)}>
                Show {stage.name} ↗
              </SecondaryButton>
            )}
          </section>
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-[20px] font-semibold">Crew photo challenge</h3>
            <p className="text-[17px]" aria-live="polite">
              {photoPrompt}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton
                onClick={() =>
                  setPhotoPrompt(
                    randomItem(PHOTO_PROMPTS.filter((prompt) => prompt !== photoPrompt)) ??
                      PHOTO_PROMPTS[0],
                  )
                }
              >
                Another prompt
              </SecondaryButton>
              <SecondaryButton onClick={() => openSheet({ kind: "memories" })}>
                Save a photo
              </SecondaryButton>
            </div>
          </section>
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-[20px] font-semibold">Start a conversation</h3>
            <p className="text-[17px]" aria-live="polite">
              {icebreaker}
            </p>
            <SecondaryButton
              onClick={() =>
                setIcebreaker(
                  randomItem(ICEBREAKERS.filter((prompt) => prompt !== icebreaker)) ??
                    ICEBREAKERS[0],
                )
              }
            >
              Another question
            </SecondaryButton>
          </section>
        </>
      ) : tab === "bingo" ? (
        <>
          <p className="text-[15px] text-muted-foreground">
            {completed.length} of 9 · self-reported on this phone
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BINGO_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={completed.includes(item.id)}
                disabled={!attendee.ready}
                className="min-h-28 rounded-xl border border-border p-2 text-[15px] font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                onClick={() =>
                  attendee.update({
                    bingo: completed.includes(item.id)
                      ? completed.filter((id) => id !== item.id)
                      : [...completed, item.id],
                  })
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          {completed.length === BINGO_ITEMS.length && (
            <p className="text-[20px] font-semibold">Your festival board is complete.</p>
          )}
          <button
            type="button"
            className="min-h-11 text-[16px] underline"
            onClick={() => attendee.update({ bingo: [] })}
          >
            Reset my board
          </button>
        </>
      ) : (
        <div className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-[20px] font-semibold">Sound of Summer facts quiz</h3>
            <p className="text-[14px] text-muted-foreground">
              Grounded in verified 2026 event details.
            </p>
            {SOUND_OF_SUMMER_TRIVIA.map((q) => {
              const chosen = answers[q.id];
              const answered = chosen !== undefined;
              const correct = chosen === q.answerIndex;
              return (
                <div key={q.id} className="ios-card space-y-2 p-3">
                  <p className="text-[16px] font-semibold">{q.question}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-pressed={chosen === idx}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-left text-[14px] font-medium aria-pressed:border-primary aria-pressed:bg-primary/15"
                      >
                        <span>{opt}</span>
                        {answered && idx === q.answerIndex && (
                          <span className="text-[12px] font-semibold text-primary">Correct</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {answered && (
                    <p className="text-[13px] text-muted-foreground">
                      {correct ? "Spot on — " : "Verified fact: "}
                      {q.fact}
                    </p>
                  )}
                </div>
              );
            })}
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-[20px] font-semibold">My festival predictions</h3>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  attendee.update({
                    predictions: {
                      firstStageId: predStage,
                      anthemArtistId: predArtist,
                      note: predNote.trim(),
                    },
                  })
                ) {
                  attendee.notify("Predictions saved on this phone");
                }
              }}
            >
              <label className="block text-[14px] font-semibold">
                First stage our crew visits
                <select
                  className="ios-field mt-1"
                  value={predStage}
                  onChange={(e) => setPredStage(e.target.value)}
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[14px] font-semibold">
                Artist set of the night
                <select
                  className="ios-field mt-1"
                  value={predArtist}
                  onChange={(e) => setPredArtist(e.target.value)}
                >
                  {data.festival.artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[14px] font-semibold">
                Personal prediction note (optional)
                <input
                  className="ios-field mt-1"
                  maxLength={140}
                  placeholder="Closing track by the tidal pools…"
                  value={predNote}
                  onChange={(e) => setPredNote(e.target.value)}
                />
              </label>
              <PrimaryButton type="submit">Save my predictions</PrimaryButton>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
