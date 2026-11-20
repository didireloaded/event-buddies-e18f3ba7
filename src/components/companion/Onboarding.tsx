import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  INTERESTS,
  savePlatformPreferences,
  usePlatformPreferences,
  type Interest,
} from "@/lib/account/platform-navigation";
import { useCompanion } from "./context";

export function Onboarding() {
  const { navigate } = useCompanion();
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
      className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-8"
      aria-label="Welcome to Event Buddies"
    >
      <p className="eb-display text-[17px]">Event Buddies</p>
      <div className="flex-1 py-12">
        <p className="eb-kicker text-primary">
          {step === 0 ? "Events. People. Places." : step === 1 ? "Your interests" : "Your account"}
        </p>
        <h1 className="eb-page-title mt-3">
          {step === 0
            ? "Find your next event"
            : step === 1
              ? "What are you into?"
              : "Create account"}
        </h1>
        {step === 1 && (
          <div className="eb-list mt-6">
            {INTERESTS.map((interest) => (
              <label
                key={interest}
                className="eb-row min-h-14 justify-between text-[17px] font-semibold"
              >
                {interest}
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
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
            ))}
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
          className="min-h-12 rounded-full"
          onClick={() => {
            savePlatformPreferences({ interests, completed: false });
            setStep(step + 1);
          }}
        >
          Continue
        </Button>
      )}
      {step < 2 && (
        <Button variant="ghost" className="mt-3 min-h-11" onClick={() => finish("guest")}>
          Continue as Guest
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
