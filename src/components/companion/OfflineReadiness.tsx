import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useCompanion } from "./context";
import { SecondaryButton } from "./ui";

export function InstallReminder() {
  const { attendee, openSheet } = useCompanion();
  const [eligible, setEligible] = useState(false);
  useEffect(() => {
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const installed =
      matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && navigator.standalone === true);
    setEligible(ios && !installed && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent));
  }, []);
  if (!eligible || !attendee.preferences.meeting || attendee.preferences.installHintDismissed)
    return null;
  return (
    <section className="mx-4 mt-5 border-y border-border py-3" aria-labelledby="install-reminder">
      <div className="flex items-center gap-2">
        <h2 id="install-reminder" className="flex-1 text-[17px] font-semibold">
          Keep your plan close
        </h2>
        <button
          type="button"
          aria-label="Dismiss installation reminder"
          className="grid size-11 place-items-center"
          onClick={() => attendee.update({ installHintDismissed: true })}
        >
          <X size={20} />
        </button>
      </div>
      <p className="mb-3 text-[15px] text-muted-foreground">
        In Safari, tap Share, then Add to Home Screen. Open the published app once while connected
        to save the map and lineup.
      </p>
      <SecondaryButton onClick={() => openSheet({ kind: "install" })}>
        <Download size={18} />
        Show installation steps
      </SecondaryButton>
    </section>
  );
}

export function OfflineReadiness() {
  const { offlineStatus, openSheet } = useCompanion();
  const description = {
    checking: "Saving the venue map, lineup and app files. Keep this page open while connected.",
    registered:
      "The app files and public event page are saved in this browser. Your plans stay on this device. Your browser can clear stored data, so check again before leaving.",
    blocked:
      "Offline caching is inactive in development and editor previews. Open the published app directly while connected to save the event.",
    unsupported:
      "This browser cannot save the app for offline use. Open the published HTTPS app in Safari or Chrome.",
    failed:
      "The offline copy could not be confirmed. Reconnect and reload before relying on it at the venue.",
  }[offlineStatus];
  return (
    <section className="mt-6 border-y border-border py-4" aria-labelledby="offline-readiness">
      <h2 id="offline-readiness" className="text-[22px] font-bold tracking-tight">
        Before the signal drops
      </h2>
      <p role="status" className="mt-2 text-[15px] text-muted-foreground">
        {description}
      </p>
      <SecondaryButton className="mt-3" onClick={() => openSheet({ kind: "install" })}>
        Add to Home Screen
      </SecondaryButton>
      {offlineStatus === "failed" && (
        <button
          type="button"
          className="mt-2 min-h-11 font-semibold"
          onClick={() => window.location.reload()}
        >
          Reload and check offline copy
        </button>
      )}
    </section>
  );
}
