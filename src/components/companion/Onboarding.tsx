import { useState } from "react";
import { MapPin, Music2, Users } from "lucide-react";
import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";
import { AvatarPicker } from "./AvatarPicker";
import { initials, useCompanion } from "./context";
import { PrimaryButton, SecondaryButton } from "./ui";

export function Onboarding() {
  const { attendee, navigate, data } = useCompanion();
  const terms = getEventCategoryTerms(data.event.category);
  const [step, setStep] = useState(attendee.preferences.onboardingDone ? 2 : 0);
  const [mode, setMode] = useState<"music" | "friends" | "both">(
    attendee.preferences.festivalMode ?? "both",
  );
  const [name, setName] = useState(
    attendee.preferences.profile.name === "Guest" ? "" : attendee.preferences.profile.name,
  );
  const finish = () => {
    if (name.trim().length < 2) return;
    if (
      attendee.update({
        onboardingDone: true,
        hasName: true,
        festivalMode: mode,
        following: true,
        profile: { ...attendee.preferences.profile, name: name.trim() },
      })
    )
      navigate("events");
  };
  return (
    <section
      className="flex min-h-[calc(100dvh-9rem)] flex-col px-5 pb-8"
      aria-label="Welcome to Event Buddies"
    >
      <div className="flex min-h-12 items-center justify-between">
        <span className="text-[14px] text-muted-foreground">{step + 1} of 3</span>
        {step < 2 && (
          <button
            type="button"
            className="min-h-12 px-3 font-semibold"
            onClick={() => {
              setMode("both");
              setStep(2);
            }}
          >
            Skip
          </button>
        )}
      </div>
      {step === 0 && (
        <div className="flex flex-1 flex-col justify-center py-6">
          <div className="mb-8 flex items-end gap-3 text-favorite" aria-hidden>
            <MapPin size={72} />
            <Users size={48} />
          </div>
          <h1 className="ios-large-title">
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
          <h1 className="text-[30px] font-bold leading-tight">
            {terms.isConferenceLike ? "How do you want to explore?" : "What’s your festival mode?"}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            This shapes what sits first on your Home screen. Nothing is hidden and you can switch
            anytime.
          </p>
          <div className="mt-6 space-y-3">
            {(
              [
                {
                  value: "music",
                  label: terms.isConferenceLike ? "Here for the sessions" : "Here for the music",
                  icon: Music2,
                },
                {
                  value: "friends",
                  label: terms.isConferenceLike ? "Here for networking" : "Here to meet people",
                  icon: Users,
                },
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
            if (name.trim().length >= 2) finish();
          }}
        >
          <h1 className="text-[30px] font-bold">What should we call you?</h1>
          <div className="my-6">
            <AvatarPicker fallbackLabel={initials(name) || "?"} altName={name.trim()} size="lg" />
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
      {step === 0 && (
        <div className="space-y-3">
          <PrimaryButton onClick={() => setStep(1)}>Continue</PrimaryButton>
          <SecondaryButton onClick={() => navigate("events")}>
            Browse events without signing in
          </SecondaryButton>
        </div>
      )}
      {step > 0 && (
        <SecondaryButton className="mt-3" onClick={() => setStep(step - 1)}>
          Back
        </SecondaryButton>
      )}
    </section>
  );
}
