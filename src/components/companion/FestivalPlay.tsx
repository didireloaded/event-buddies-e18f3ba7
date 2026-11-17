import { useState } from "react";
import { BINGO_ITEMS, PHOTO_PROMPTS, ICEBREAKERS, randomItem } from "@/lib/attendee/play";
import { useCompanion } from "./context";
import { PrimaryButton, SecondaryButton, Segmented } from "./ui";

export function FestivalPlay() {
  const { places, attendee, openPlace, openSheet } = useCompanion();
  const [tab, setTab] = useState<"explore" | "bingo">("explore");
  const [stageId, setStageId] = useState<string | null>(null);
  const [photoPrompt, setPhotoPrompt] = useState(PHOTO_PROMPTS[0]);
  const [icebreaker, setIcebreaker] = useState(ICEBREAKERS[0]);
  const [challenge, setChallenge] = useState<(typeof BINGO_ITEMS)[number] | null>(null);
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
      ) : (
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
      )}
    </div>
  );
}
