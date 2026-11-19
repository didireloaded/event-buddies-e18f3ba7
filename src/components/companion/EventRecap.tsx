import { useCompanion } from "./context";
import { PrimaryButton, SecondaryButton } from "./ui";
import { useEffect, useState } from "react";
import { eventLifecycle } from "@/lib/attendee/lifecycle";
import { createCrewYearbookCard, createRecapCard } from "@/lib/attendee/recap-card";
import { eventTime } from "@/lib/attendee/schedule";
import { AfterEventData } from "./AfterEventData";

export function EventRecap() {
  const { data, attendee, crew: sync, places, navigate, openPlace, now } = useCompanion();
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    if (!preview) return;
    const url = URL.createObjectURL(preview);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [preview]);
  const phase = eventLifecycle(data, now).phase;
  const people = [...new Set(attendee.preferences.sharedPlans.map((entry) => entry.plan.name))];
  const exportRecap = async (share: boolean) => {
    setExporting(true);
    try {
      const blob = await createRecapCard(data, attendee.preferences);
      setPreview(blob);
      const file = new File([blob], `${data.event.slug}-recap.png`, { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] }) && navigator.share)
        await navigator.share({ files: [file], title: `My ${data.event.name} recap` });
      else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (share) attendee.notify("Recap card downloaded. Share it from your photos or files.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        attendee.notify("Couldn’t create the recap card. Try again.", true);
    } finally {
      setExporting(false);
    }
  };
  const exportYearbook = async () => {
    setExporting(true);
    try {
      const crewName = sync.crew?.name ?? `Our ${data.event.name} Crew`;
      const memberNames = sync.crew
        ? sync.crew.members.map((m) => m.name)
        : [attendee.preferences.profile.name, ...people];
      const activeMeeting = sync.crew?.meeting ?? attendee.preferences.meeting;
      const meetingPlace = activeMeeting
        ? places.find((p) => p.id === activeMeeting.pointId)
        : null;
      const meetingLabel =
        activeMeeting && meetingPlace
          ? `${meetingPlace.name} · ${eventTime(activeMeeting.at)} CAT`
          : "No fixed meeting time saved";
      const blob = await createCrewYearbookCard({
        data,
        preferences: attendee.preferences,
        crewName,
        memberNames,
        meetingLabel,
      });
      setPreview(blob);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${data.event.slug}-crew-yearbook.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      attendee.notify("Crew yearbook card downloaded.");
    } catch {
      attendee.notify("Couldn’t create the crew yearbook card.", true);
    } finally {
      setExporting(false);
    }
  };
  const stops = places.filter((p) => attendee.preferences.stamps.includes(p.id));
  const artists = data.festival.artists.filter((a) =>
    attendee.preferences.savedArtists.includes(a.id),
  );
  return (
    <section className="mx-4 mt-4 border-y border-border py-5" aria-labelledby="recap-title">
      <p className="eyebrow">
        {phase === "dormant"
          ? "Until the next one"
          : phase === "archive"
            ? "Your saved archive"
            : "Your recap is ready"}
      </p>
      <h1 id="recap-title" className="ios-large-title mt-2">
        Your {data.event.name}
      </h1>
      <p className="mt-2 text-[16px] text-muted-foreground">
        {phase === "dormant"
          ? `The next ${data.event.name} dates are awaiting announcement. Your saved festival record is here.`
          : "Keep the plan. Share the memory."}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <PrimaryButton disabled={exporting} onClick={() => exportRecap(true)}>
          {exporting ? "Creating…" : "Share recap card"}
        </PrimaryButton>
        <SecondaryButton disabled={exporting} onClick={() => exportRecap(false)}>
          Save recap
        </SecondaryButton>
      </div>
      <SecondaryButton className="mt-2" disabled={exporting} onClick={() => void exportYearbook()}>
        Download crew yearbook card
      </SecondaryButton>
      <div className="mt-4 rounded-2xl bg-popover p-4 text-[14px]">
        <p className="font-semibold text-primary">My year in events · 2026</p>
        <p className="mt-1">
          1 confirmed festival ({data.event.name}) · {artists.length} saved artists ·{" "}
          {stops.length + attendee.preferences.customStamps.filter((s) => s.checked).length} checked
          stops
          {attendee.preferences.collections.length
            ? ` · Collections: ${attendee.preferences.collections.join(", ")}`
            : ""}
        </p>
      </div>
      {previewUrl && (
        <img
          src={previewUrl}
          alt={`Your generated ${data.event.name} recap card with your saved artists and checked stops`}
          width={1080}
          height={1350}
          className="mt-4 w-full rounded-2xl"
        />
      )}
      <h3 className="mt-5 text-[17px] font-semibold">Artists you saved</h3>
      <p className="mt-1 text-[15px]">
        {artists.map((a) => a.name).join(" · ") || "No artists saved for this edition."}
      </p>
      <h3 className="mt-5 text-[17px] font-semibold">Stops you checked off</h3>
      {stops.length ? (
        <ul className="mt-1 divide-y divide-border">
          {stops.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between text-left text-[15px]"
                onClick={() => openPlace(p.id)}
              >
                {p.name}
                <span aria-hidden>↗</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[15px]">Your passport has no recorded stops.</p>
      )}
      <p className="my-4 text-[15px] text-muted-foreground">
        {attendee.preferences.sharedPlans.length} shared{" "}
        {attendee.preferences.sharedPlans.length === 1 ? "plan" : "plans"} kept on this phone.
      </p>
      {people.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[17px] font-semibold">People who shared a plan</h3>
          <p className="mt-1 text-[15px]">{people.join(" · ")}</p>
        </div>
      )}
      <PrimaryButton onClick={() => navigate("you")}>Back up my festival plan</PrimaryButton>
      <SecondaryButton className="mt-2" onClick={() => navigate("crew")}>
        Open saved plans
      </SecondaryButton>
      {data.festival.officialUrl && (
        <a
          className="mt-3 flex min-h-11 items-center font-semibold"
          href={data.festival.officialUrl}
          target="_blank"
          rel="noreferrer"
        >
          More from the organiser ↗<span className="sr-only"> Opens in a new tab</span>
        </a>
      )}
      <AfterEventData />
    </section>
  );
}
