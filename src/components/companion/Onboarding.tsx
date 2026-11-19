import { useState } from "react";
import { ArrowRight, Compass, MapPin, Music2, Users } from "lucide-react";
import { getEventCategoryTerms } from "@/lib/intelligence/event-intelligence";
import { AvatarPicker } from "./AvatarPicker";
import { initials, useCompanion } from "./context";
import { PrimaryButton, SecondaryButton } from "./ui";

export function Onboarding() {
  const { attendee, navigate, data } = useCompanion();
  const terms = getEventCategoryTerms(data.event.category, data.event.templateConfig);
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
      className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      aria-label="Welcome to Event Buddies"
    >
      <div className="flex min-h-12 items-center justify-between border-b border-separator pb-2">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-md bg-primary text-[12px] font-extrabold text-primary-foreground"
          >
            EB
          </span>
          <span className="eb-display text-[15px]">Event Buddies</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-muted-foreground">{step + 1} of 3</span>
          {step < 2 && (
            <button
              type="button"
              className="min-h-11 px-2 text-[15px] font-semibold text-primary"
              onClick={() => {
                setMode("both");
                setStep(2);
              }}
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {step === 0 && (
        <div className="flex flex-1 flex-col justify-center py-8">
          <p className="eb-kicker text-primary">Festivals · Conferences · Parties · Live Sports</p>
          <h1 className="eb-page-title mt-3 text-[40px] leading-[1.02]">
            Find your people.
            <br />
            <span className="text-primary">Don’t lose them.</span>
          </h1>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-muted-foreground">
            Discover events, keep tickets offline, navigate venue maps and coordinate with your crew
            — adapted to every event you attend.
          </p>
          <div className="mt-7 grid grid-cols-3 gap-3 border-t border-separator pt-5 text-[13px] text-muted-foreground">
            <div>
              <Compass size={18} className="text-primary" aria-hidden />
              <p className="mt-1.5 font-semibold text-foreground">Live venue maps</p>
            </div>
            <div>
              <Users size={18} className="text-primary" aria-hidden />
              <p className="mt-1.5 font-semibold text-foreground">Private crews</p>
            </div>
            <div>
              <MapPin size={18} className="text-primary" aria-hidden />
              <p className="mt-1.5 font-semibold text-foreground">Offline passes</p>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex-1 py-8">
          <p className="eb-kicker text-primary">Personalise home</p>
          <h1 className="eb-page-title mt-2">
            {terms.isConferenceLike ? "How do you want to explore?" : "What’s your festival mode?"}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Sets what sits first on your event screen. Nothing is hidden and you can switch anytime.
          </p>
          <div className="eb-list mt-6">
            {(
              [
                {
                  value: "music",
                  label: terms.isConferenceLike ? "Here for the sessions" : "Here for the music",
                  detail: terms.isConferenceLike
                    ? "Speakers and timed agenda first"
                    : "Headliners, stages and lineup first",
                  icon: Music2,
                },
                {
                  value: "friends",
                  label: terms.isConferenceLike ? "Here for networking" : "Here to meet people",
                  detail: "Crew meetups and live pins first",
                  icon: Users,
                },
                {
                  value: "both",
                  label: "A bit of both",
                  detail: "Balanced view of programme, map and crew",
                  icon: MapPin,
                },
              ] as const
            ).map(({ value, label, detail, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                className="vibe-choice eb-row py-4"
                onClick={() => {
                  setMode(value);
                  setStep(2);
                }}
              >
                <span className="grid size-11 flex-none place-items-center rounded-xl bg-favorite-soft text-primary">
                  <Icon size={21} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold text-foreground">{label}</span>
                  <span className="block text-[14px] text-muted-foreground">{detail}</span>
                </span>
                <ArrowRight size={18} className="flex-none text-muted-foreground" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <form
          className="flex flex-1 flex-col py-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length >= 2) finish();
          }}
        >
          <p className="eb-kicker text-primary">Quick profile</p>
          <h1 className="eb-page-title mt-2">What should we call you?</h1>
          <div className="my-6">
            <AvatarPicker fallbackLabel={initials(name) || "?"} altName={name.trim()} size="lg" />
          </div>
          <label htmlFor="welcome-name" className="sr-only">
            Your name
          </label>
          <input
            id="welcome-name"
            className="eb-field text-center text-[17px] font-medium"
            autoComplete="nickname"
            autoFocus
            maxLength={50}
            placeholder="Your name"
            aria-invalid={name.trim().length === 1 || undefined}
            aria-describedby="welcome-name-hint"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <p
            id="welcome-name-hint"
            role={name.trim().length === 1 ? "alert" : undefined}
            className={
              name.trim().length === 1
                ? "mt-2 text-center text-[14px] font-medium text-destructive"
                : "mt-2 text-center text-[14px] text-muted-foreground"
            }
          >
            {name.trim().length === 1
              ? "Add at least one more character to continue."
              : name.trim().length === 0
                ? "Enter at least 2 characters — this is how your friends will see you."
                : "This is how your friends will see you."}
          </p>
          <div className="mt-auto pt-8">
            <PrimaryButton type="submit" disabled={name.trim().length < 2}>
              Go to my event
            </PrimaryButton>
          </div>
        </form>
      )}

      {step === 0 && (
        <div className="space-y-2.5">
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
