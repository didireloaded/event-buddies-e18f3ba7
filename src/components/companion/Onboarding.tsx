import { useState } from "react";
import {
  ArrowRight,
  Check,
  Music2,
  Presentation,
  BriefcaseBusiness,
  PartyPopper,
  Trophy,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  INTERESTS,
  savePlatformPreferences,
  usePlatformPreferences,
  type Interest,
} from "@/lib/account/platform-navigation";
import { useCompanion } from "./context";

const INTEREST_ICONS = [Music2, Presentation, BriefcaseBusiness, PartyPopper, Trophy, Store];

export function Onboarding() {
  const { navigate, data } = useCompanion();
  const preferences = usePlatformPreferences();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<Interest[]>(preferences.interests);
  const [error, setError] = useState("");
  function finish(mode: "up" | "in" | "guest") {
    if (!savePlatformPreferences({ interests, completed: true })) {
      setError("Your choices couldn’t be saved on this device. You can still continue.");
    }
    if (mode === "guest") navigate("events");
    else window.location.assign(`/login?mode=${mode}&next=${encodeURIComponent("/#events")}`);
  }
  return (
    <section
      className={`welcome-screen relative mx-auto flex min-h-dvh flex-col px-5 py-8 ${step === 0 ? "welcome-photo" : "max-w-lg"}`}
      aria-label="Welcome to Event Buddies"
    >
      {step === 0 && data.event.heroImageUrl && (
        <img
          src={data.event.heroImageUrl}
          alt="Sound of Summer past edition"
          className="welcome-backdrop"
          width={1200}
          height={800}
        />
      )}
      <p className="eb-display relative z-10 text-[20px]">
        Event Buddies<span className="text-primary">.</span>
      </p>
      <div
        className={`relative z-10 flex flex-1 flex-col ${step === 0 ? "justify-end pb-8 pt-36" : "py-10"}`}
      >
        <p className="eb-kicker text-primary">
          {step === 0
            ? "Namibia. And wherever’s next."
            : step === 1
              ? "01 / Your interests"
              : "02 / Your account"}
        </p>
        <h1 className="eb-page-title mt-3">
          {step === 0
            ? "Your Events. Your People. All in One Place."
            : step === 1
              ? "What are you into?"
              : "Make it yours"}
        </h1>
        {step === 0 && (
          <p className="mt-4 max-w-sm text-[17px] text-muted-foreground">
            Discover events, connect with friends and enjoy every experience.
          </p>
        )}
        {step === 1 && (
          <p className="mt-3 text-[16px] text-muted-foreground">
            Pick a few. You’ll still see events outside your interests.
          </p>
        )}
        {step === 1 && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {INTERESTS.map((interest, index) => {
              const Icon = INTEREST_ICONS[index] ?? Music2;
              return (
                <label
                  key={interest}
                  className="interest-tile relative flex min-h-32 cursor-pointer flex-col justify-between rounded-lg border border-border bg-card p-4 text-[16px] font-semibold"
                  data-selected={interests.includes(interest)}
                >
                  <Icon size={26} className="text-primary" aria-hidden />
                  <span>{interest}</span>
                  {interests.includes(interest) && (
                    <Check size={18} aria-hidden className="absolute right-3 top-3 text-primary" />
                  )}
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={interests.includes(interest)}
                    onChange={() =>
                      setInterests((old) =>
                        old.includes(interest)
                          ? old.filter((i) => i !== interest)
                          : [...old, interest],
                      )
                    }
                  />
                </label>
              );
            })}
          </div>
        )}
        {step === 2 && (
          <div className="mt-6 flex flex-col gap-3">
            <Button className="min-h-12 rounded-full" onClick={() => finish("up")}>
              Create Account
            </Button>
            <Button
              variant="outline"
              className="min-h-12 rounded-full"
              onClick={() => finish("in")}
            >
              Sign In
            </Button>
            <Button variant="ghost" className="min-h-12" onClick={() => finish("guest")}>
              Continue as Guest
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-destructive">
            {error}
          </p>
        )}
      </div>
      {step < 2 && (
        <Button
          className="relative z-10 min-h-12 rounded-full"
          onClick={() => {
            savePlatformPreferences({ interests, completed: false });
            setStep(step + 1);
          }}
        >
          {step === 0 ? "Get Started" : "Continue"} <ArrowRight size={18} aria-hidden />
        </Button>
      )}
      {step < 2 && (
        <Button
          variant="ghost"
          className="relative z-10 mt-3 min-h-11"
          onClick={() => finish("guest")}
        >
          Continue as Guest
        </Button>
      )}
      {step === 0 && (
        <Button variant="link" className="relative z-10 min-h-11" onClick={() => finish("in")}>
          Already have an account? Sign In
        </Button>
      )}
      {step > 0 && (
        <Button variant="ghost" className="mt-3 min-h-11" onClick={() => setStep(step - 1)}>
          Back
        </Button>
      )}
    </section>
  );
}
