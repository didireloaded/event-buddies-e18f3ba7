import { useState } from "react";
import { MapPin, Music2, Users } from "lucide-react";
import { initials, useCompanion } from "./context";
import { PrimaryButton, SecondaryButton } from "./ui";

export function Onboarding({ onSkip }: { onSkip: () => void }) {
  const { attendee, navigate, data } = useCompanion();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"music" | "friends" | "both">("both");
  const [name, setName] = useState(
    attendee.preferences.profile.name === "Guest" ? "" : attendee.preferences.profile.name,
  );
  const finish = (skip: boolean) => {
    if (skip) {
      attendee.update({ onboardingDone: true });
      onSkip();
      return;
    }
    if (
      attendee.update({
        onboardingDone: true,
        ...(skip
          ? {}
          : {
              festivalMode: mode,
              following: true,
              profile: { ...attendee.preferences.profile, name: name.trim() },
            }),
      })
    )
      navigate("home");
  };
  return (
    <section
      className="flex min-h-[calc(100dvh-9rem)] flex-col px-5 pb-8"
      aria-label="Welcome to Event Buddies"
    >
      <div className="flex min-h-12 items-center justify-between">
        <span className="text-[14px] text-muted-foreground">{step + 1} of 3</span>
        <button type="button" className="min-h-12 px-3 font-semibold" onClick={() => finish(true)}>
          Skip
        </button>
      </div>
      {step === 0 && (
        <div className="flex flex-1 flex-col justify-center py-6">
          <div className="mb-8 flex items-end gap-3 text-favorite" aria-hidden>
            <MapPin size={72} />
            <Users size={48} />
          </div>
          <h1 className="display-title text-[clamp(2.75rem,12vw,4.5rem)]">
            Find your people.
            <br />
            <span className="text-favorite">Don’t lose them.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[17px] text-muted-foreground">
            Your {data.event.name} map, favourite artists and one meeting plan to share with
            friends.
          </p>
        </div>
      )}
      {step === 1 && (
        <div className="flex-1 py-6">
          <h1 className="text-[30px] font-bold leading-tight">What’s your festival mode?</h1>
          <div className="mt-6 space-y-3">
            {(
              [
                { value: "music", label: "Here for the music", icon: Music2 },
                { value: "friends", label: "Here to meet people", icon: Users },
                { value: "both", label: "A bit of both", icon: MapPin },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className="vibe-choice flex min-h-20 w-full items-center gap-4 rounded-2xl border border-border bg-popover px-4 text-left text-[18px] font-semibold"
                onClick={() => {
                  setMode(value);
                  setStep(2);
                }}
              >
                <Icon size={26} className="text-favorite" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 2 && (
        <form
          className="flex flex-1 flex-col py-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length >= 2) finish(false);
          }}
        >
          <h1 className="text-[30px] font-bold">What should we call you?</h1>
          <div
            className="mx-auto my-8 grid size-24 place-items-center rounded-full bg-favorite-soft text-[34px] font-bold text-favorite"
            aria-hidden
          >
            {initials(name) || "?"}
          </div>
          <label htmlFor="welcome-name" className="sr-only">
            Your name
          </label>
          <input
            id="welcome-name"
            className="ios-field text-center"
            autoComplete="nickname"
            autoFocus
            maxLength={50}
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <p className="mt-2 text-center text-[14px] text-muted-foreground">
            This is how your friends will see you.
          </p>
          <div className="mt-auto pt-8">
            <PrimaryButton type="submit" disabled={name.trim().length < 2}>
              Go to my event
            </PrimaryButton>
          </div>
        </form>
      )}
      {step === 0 && <PrimaryButton onClick={() => setStep(1)}>Continue</PrimaryButton>}
      {step > 0 && (
        <SecondaryButton className="mt-3" onClick={() => setStep(step - 1)}>
          Back
        </SecondaryButton>
      )}
    </section>
  );
}
