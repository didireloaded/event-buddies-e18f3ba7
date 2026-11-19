import {
  Heart,
  Share2,
  Users,
  Music2,
  MapPin,
  Info,
  CalendarDays,
  ArrowUpRight,
  Ticket,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import { eventPhase, formatEventDate, formatEventHours } from "@/lib/attendee/event-clock";
import { eventLifecycle } from "@/lib/attendee/lifecycle";
import { formatTicketTier, getEventGateLabel, getEventOpensTime } from "@/lib/attendee/tickets";
import {
  getEventCategoryTerms,
  getPersonalisedHomeOrder,
  selectFeaturedParticipants,
  type HomeSectionId,
} from "@/lib/intelligence/event-intelligence";
import { useEvent } from "@/context/EventContext";
import { useCompanion } from "./context";
import { ArtistAvatar } from "./ArtistAvatar";
import { CrewPeople } from "./CrewPeople";
import { PostEventState } from "./PostEventState";
import { InstallReminder } from "./OfflineReadiness";

export function HomeView({ onShare }: { onShare: () => void }) {
  const { data, attendee, now, navigate, openSheet, eventTickets, openGateCard } = useCompanion();
  const { availableEvents } = useEvent();
  const { preferences, toggleFollow, ready } = attendee;
  const phase = eventPhase(data, now);
  const life = eventLifecycle(data, now);
  if (life.phase !== "upcoming" && life.phase !== "live") return <PostEventState />;

  const terms = getEventCategoryTerms(data.event.category);
  const featured = selectFeaturedParticipants(data);
  const sectionOrder = getPersonalisedHomeOrder(preferences.festivalMode);
  const activeMode = preferences.festivalMode ?? "both";
  const otherEvents = availableEvents.filter((ev) => ev.event.id !== data.event.id);
  const primaryTicket = eventTickets[0] ?? null;
  const gateLabel = getEventGateLabel(data);
  const opensTime = getEventOpensTime(data);
  const activeTierLabel = formatTicketTier(primaryTicket?.tier ?? preferences.ticketTier);

  const cycleMode = () => {
    const next = activeMode === "music" ? "friends" : activeMode === "friends" ? "both" : "music";
    attendee.update({ festivalMode: next });
  };

  const renderSection = (id: HomeSectionId) => {
    switch (id) {
      case "featured": {
        if (featured.length === 0) {
          return (
            <section
              key="featured"
              className="mx-4 mt-5 rounded-2xl bg-popover p-4"
              aria-label={`Featured ${terms.peopleLabel.toLowerCase()}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-bold">{terms.programLabel}</h2>
                <a
                  href="#lineup"
                  className="flex min-h-11 items-center gap-1 text-[15px] font-semibold text-primary"
                >
                  Your lineup <ArrowUpRight size={16} aria-hidden />
                </a>
              </div>
              <p className="mt-1 text-[15px] text-muted-foreground">
                {data.festival.artists.length > 0
                  ? `${data.festival.artists.length} announced ${terms.peopleLabel.toLowerCase()} · browse full ${terms.programLabel.toLowerCase()} to save favourites.`
                  : `${terms.programLabel} highlights appear here once confirmed by the organiser.`}
              </p>
            </section>
          );
        }

        const [lead, ...others] = featured;
        const additionalPortraits = data.festival.artists
          .filter(
            (a) => Boolean(a.avatarUrl) && a.id !== lead?.id && !others.some((o) => o.id === a.id),
          )
          .slice(0, 6)
          .map((a) => ({
            ...a,
            stageName: a.stageId
              ? (data.stages.find((s) => s.id === a.stageId)?.name ?? null)
              : null,
          }));
        const remainingArtists = Math.max(
          0,
          data.festival.artists.length -
            (lead ? 1 : 0) -
            others.length -
            additionalPortraits.length,
        );
        return (
          <section
            key="featured"
            className="mx-4 mt-5 space-y-3"
            aria-label={`Featured ${terms.peopleLabel.toLowerCase()}`}
            data-testid="home-featured-section"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[20px] font-bold tracking-tight">
                {terms.isConferenceLike ? "Featured speakers" : "Headliners & featured"}
              </h2>
              <a
                href="#lineup"
                className="flex min-h-11 flex-none items-center gap-1 whitespace-nowrap text-[15px] font-semibold text-primary"
              >
                Your lineup <ArrowUpRight size={16} aria-hidden />
              </a>
            </div>

            {lead && (
              <button
                type="button"
                onClick={() => openSheet({ kind: "artist", artist: lead })}
                className="ios-card ios-press flex w-full items-center gap-3.5 p-3.5 text-left"
              >
                <ArtistAvatar artist={lead} large />
                <span className="min-w-0 flex-1">
                  <span className="inline-block rounded-full bg-favorite-soft px-2.5 py-0.5 text-[12px] font-semibold text-primary">
                    {lead.isHeadliner
                      ? terms.isConferenceLike
                        ? "Keynote"
                        : "Headliner"
                      : "Featured"}
                  </span>
                  <span className="mt-1 block truncate text-[20px] font-bold leading-tight">
                    {lead.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[14px] text-muted-foreground">
                    {lead.stageName ?? lead.role}
                  </span>
                </span>
                <ArrowUpRight size={18} className="flex-none text-muted-foreground" aria-hidden />
              </button>
            )}

            {others.length > 0 && (
              <div className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                {others.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => openSheet({ kind: "artist", artist: act })}
                    className="ios-card ios-press flex w-[7.5rem] flex-none flex-col items-center p-3 text-center"
                  >
                    <ArtistAvatar artist={act} large eager />
                    <span className="mt-2 block w-full truncate text-[14px] font-semibold leading-snug">
                      {act.name}
                    </span>
                    <span className="block w-full truncate text-[12px] text-muted-foreground">
                      {act.stageName ?? act.role}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {additionalPortraits.length > 0 && (
              <div className="space-y-2 pt-0.5">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  More on the {terms.programLabel.toLowerCase()}
                </p>
                <div className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                  {additionalPortraits.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => openSheet({ kind: "artist", artist: act })}
                      className="ios-card ios-press flex w-[7.5rem] flex-none flex-col items-center p-3 text-center"
                    >
                      <ArtistAvatar artist={act} large eager />
                      <span className="mt-2 block w-full truncate text-[14px] font-semibold leading-snug">
                        {act.name}
                      </span>
                      <span className="block w-full truncate text-[12px] text-muted-foreground">
                        {act.stageName ?? act.role}
                      </span>
                    </button>
                  ))}
                  <a
                    href="#lineup"
                    className="ios-press flex w-[6.5rem] flex-none flex-col items-center justify-center rounded-[20px] bg-favorite-soft p-3 text-center text-primary"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-popover text-[16px] font-bold tabular-nums text-primary">
                      {remainingArtists > 0 ? `+${remainingArtists}` : <ArrowUpRight size={20} />}
                    </span>
                    <span className="mt-2 block text-[13px] font-semibold leading-tight">
                      Full {terms.programLabel.toLowerCase()}
                    </span>
                  </a>
                </div>
              </div>
            )}

            {preferences.savedArtists.length > 0 && (
              <div className="flex items-center justify-between gap-2 text-[14px] text-muted-foreground">
                <span>
                  {preferences.savedArtists.length} saved in your {terms.programLabel.toLowerCase()}
                </span>
                <a
                  href="#lineup"
                  className="inline-flex min-h-11 flex-none items-center whitespace-nowrap font-semibold text-primary"
                >
                  View full lineup
                </a>
              </div>
            )}
          </section>
        );
      }

      case "crew":
        return (
          <div key="crew" data-testid="home-crew-section">
            <CrewPeople
              action={
                <button
                  type="button"
                  onClick={() => navigate("crew")}
                  className="ios-press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
                >
                  <Users size={15} aria-hidden />
                  Find your crew
                </button>
              }
            />
          </div>
        );

      case "essentials":
        return (
          <section
            key="essentials"
            className="mx-4 mt-5 space-y-2.5"
            aria-label="Event essentials and venue"
          >
            <div className="grid grid-cols-2 gap-2.5">
              <a href="#info" className="ios-card ios-press flex flex-col justify-between p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-favorite-soft text-primary">
                  <Info size={20} aria-hidden />
                </span>
                <span className="mt-4 block text-[16px] font-semibold leading-snug">
                  {terms.isConferenceLike ? "Event essentials" : "Festival essentials"}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">
                  Entry · Travel · Safety
                </span>
              </a>
              <a
                href="#map"
                className="ios-press relative flex flex-col justify-between overflow-hidden rounded-[20px] bg-foreground p-4 text-white"
              >
                {data.event.mapImageUrl && (
                  <img
                    src={data.event.mapImageUrl}
                    alt=""
                    aria-hidden
                    width={400}
                    height={300}
                    decoding="async"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 grayscale"
                  />
                )}
                <span className="relative grid size-10 place-items-center rounded-xl bg-white/15 text-pin-stage backdrop-blur-sm">
                  <MapPin size={20} aria-hidden />
                </span>
                <span className="relative mt-4 block text-[16px] font-semibold leading-snug text-white">
                  Venue map
                </span>
                <span className="relative mt-0.5 block text-[13px] text-white/75">
                  {data.points.length + data.stages.length} places on plan
                </span>
              </a>
            </div>
            <button
              type="button"
              onClick={() => openSheet({ kind: "safety" })}
              className="ios-card ios-press flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left"
            >
              <span className="grid size-8 flex-none place-items-center rounded-lg bg-favorite-soft text-primary">
                <Shield size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold">
                Safety &amp; medical points
              </span>
              <span className="text-[13px] font-medium text-muted-foreground">
                ICE &amp; medics
              </span>
            </button>
          </section>
        );

      case "upcoming":
        if (otherEvents.length === 0 && !data.festival.relatedEvent.name) return null;
        return (
          <section key="upcoming" className="mx-4 mt-6 space-y-2" aria-label="Upcoming events">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold">Upcoming events</h2>
              <a
                href="#events"
                className="flex min-h-11 items-center gap-1 text-[15px] font-semibold text-primary"
              >
                Explore all <CalendarDays size={16} aria-hidden />
              </a>
            </div>
            <div className="ios-group">
              {otherEvents.length > 0 ? (
                otherEvents.slice(0, 2).map((ev) => (
                  <a key={ev.event.id} href="#events" className="ios-row justify-between py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[16px] font-semibold">
                        {ev.event.name}
                      </span>
                      <span className="block truncate text-[13px] text-muted-foreground">
                        {formatEventDate(ev.event, {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {ev.event.venueName}
                      </span>
                    </span>
                    <ArrowUpRight size={17} className="text-muted-foreground" aria-hidden />
                  </a>
                ))
              ) : (
                <a href="#events" className="ios-row justify-between py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-semibold">
                      {data.festival.relatedEvent.name}
                    </span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {data.festival.relatedEvent.date} · {data.festival.relatedEvent.venue}
                    </span>
                  </span>
                  <ArrowUpRight size={17} className="text-muted-foreground" aria-hidden />
                </a>
              )}
            </div>
          </section>
        );
    }
  };

  return (
    <div className="pb-24">
      {/* Photography-first Event Hero (clean typographic coastal fallback when event has no artwork yet) */}
      <section
        className="mx-4 mt-2 overflow-hidden rounded-[24px] bg-popover shadow-sm"
        aria-label={data.event.name}
      >
        <div className="relative h-60 w-full overflow-hidden bg-gradient-to-br from-[#16232b] via-[#133842] to-[#0d1419]">
          {data.event.heroImageUrl && (
            <img
              src={data.event.heroImageUrl}
              alt={`${data.event.name} crowd`}
              width={1200}
              height={800}
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/15"
          />
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <button
              type="button"
              disabled={!ready}
              aria-label="Save event"
              aria-pressed={preferences.following}
              onClick={toggleFollow}
              className="ios-press grid size-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md"
            >
              <Heart size={20} fill={preferences.following ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={onShare}
              aria-label="Share event"
              className="ios-press grid size-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md"
            >
              <Share2 size={19} strokeWidth={1.85} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => openSheet({ kind: "event" })}
            aria-label={`About ${data.event.name}`}
            className="absolute inset-x-0 bottom-0 p-4 text-left text-white"
          >
            <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[12px] font-semibold backdrop-blur-md">
              {phase.label}
            </span>
            <h1 className="mt-1.5 line-clamp-2 break-words text-[28px] font-bold leading-tight tracking-tight text-white">
              {data.event.name}
            </h1>
            <p className="mt-1 truncate text-[14px] text-white/90">
              {formatEventDate(data.event, {
                weekday: "short",
                day: "numeric",
                month: "long",
              })}{" "}
              · {formatEventHours(data.event)} · {data.event.venueName}
            </p>
          </button>
        </div>

        {/* Functional onboarding mode switcher pill */}
        <div className="flex min-h-12 items-center justify-between gap-2 bg-secondary/45 px-4 py-1.5 text-[14px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Music2 size={15} className="text-primary" aria-hidden />
            Prioritising:{" "}
            <strong className="font-semibold text-foreground">
              {activeMode === "music"
                ? terms.modeMusicLabel
                : activeMode === "friends"
                  ? terms.modeFriendsLabel
                  : terms.modeBothLabel}
            </strong>
          </span>
          <button
            type="button"
            onClick={cycleMode}
            className="inline-flex min-h-11 flex-none items-center gap-1 rounded-full bg-secondary px-3 text-[13px] font-semibold text-foreground"
            aria-label="Change home focus"
          >
            <SlidersHorizontal size={13} aria-hidden /> Switch focus
          </button>
        </div>
      </section>

      {/* Personalised home sections driven by onboarding festivalMode */}
      {sectionOrder.map(renderSection)}

      <InstallReminder />

      {/* Surface 1 — Persistent Sticky Event Hub Bottom Ticket Action Bar (Zero 5th tab!) */}
      <div
        data-testid="event-ticket-bar"
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[720px] border-t border-border bg-bar/98 px-4 py-2.5 backdrop-blur-xl md:rounded-t-2xl md:border-x"
      >
        {primaryTicket ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium tabular-nums text-foreground">
                {activeTierLabel} · {gateLabel} · Opens {opensTime}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openGateCard(0)}
              className="ios-press flex min-h-11 flex-none items-center gap-1.5 rounded-full bg-primary px-4 text-[15px] font-semibold text-primary-foreground"
            >
              <Ticket size={16} aria-hidden />
              Show my ticket
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] text-muted-foreground">No ticket yet</p>
            <button
              type="button"
              onClick={() => openSheet({ kind: "buy-tickets" })}
              className="ios-press flex min-h-11 flex-none items-center gap-1.5 rounded-full bg-favorite-soft px-4 text-[15px] font-semibold text-primary"
            >
              Buy tickets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
