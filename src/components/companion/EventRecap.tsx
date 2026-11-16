import { useCompanion } from "./context";
import { PrimaryButton, SecondaryButton } from "./ui";

export function EventRecap() {
  const { data, attendee, places, navigate, openPlace } = useCompanion();
  const stops = places.filter((p) => attendee.preferences.stamps.includes(p.id));
  const artists = data.festival.artists.filter((a) =>
    attendee.preferences.savedArtists.includes(a.id),
  );
  return (
    <section className="mx-4 mt-4 border-y border-border py-5" aria-labelledby="recap-title">
      <p className="eyebrow">Until the next one</p>
      <h2 id="recap-title" className="mt-2 text-[26px] font-bold">
        Your Sound of Summer
      </h2>
      <p className="mt-2 text-[16px] text-muted-foreground">
        Your saved moments stay here after the gates close.
      </p>
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
      <PrimaryButton onClick={() => navigate("you")}>Back up my festival plan</PrimaryButton>
      <SecondaryButton className="mt-2" onClick={() => navigate("crew")}>
        Open saved plans
      </SecondaryButton>
      <a
        className="mt-3 flex min-h-11 items-center font-semibold"
        href={data.festival.officialUrl}
        target="_blank"
        rel="noreferrer"
      >
        More from the organiser ↗<span className="sr-only"> Opens in a new tab</span>
      </a>
    </section>
  );
}
