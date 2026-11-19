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
  Lock,
  Sparkles,
  Trophy,
  Store,
  CalendarRange,
  Check,
  Stamp,
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
import { isModuleEnabled, resolveEventTemplate } from "@/lib/templates/event-templates";
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

  const { config: templateConfig, definition: templateDef } = resolveEventTemplate({
    category: data.event.category,
    templateConfig: data.event.templateConfig,
  });
  const family = templateConfig.layoutFamily;
  const terms = getEventCategoryTerms(data.event.category, templateConfig);
  const featured = selectFeaturedParticipants(data);
  const sectionOrder = getPersonalisedHomeOrder(
    preferences.festivalMode,
    templateConfig.homeSectionOrder,
  );
  const activeMode = preferences.festivalMode ?? "both";
  const otherEvents = availableEvents.filter(
    (ev) =>
      ev.event.id !== data.event.id &&
      (ev.event.visibility ?? ev.event.templateConfig?.visibility) !== "private_invite",
  );
  const primaryTicket = eventTickets[0] ?? null;
  const gateLabel = getEventGateLabel(data);
  const opensTime = getEventOpensTime(data);
  const activeTierLabel = formatTicketTier(primaryTicket?.tier ?? preferences.ticketTier);
  const hasTicketsModule = isModuleEnabled(templateConfig, "tickets");
  const hasMapModule = isModuleEnabled(templateConfig, "map");
  const hasCrewModule =
    isModuleEnabled(templateConfig, "crew") || isModuleEnabled(templateConfig, "networking");
  const hasPassportModule = isModuleEnabled(templateConfig, "passport");
  const hasRsvpModule = isModuleEnabled(templateConfig, "rsvp");
  const isPrivate = templateConfig.visibility === "private_invite" || terms.isPrivateLike;
  const hasTicketUrl = Boolean(data.event.ticketUrl || data.festival.ticketUrl);

  const cycleMode = () => {
    const next = activeMode === "music" ? "friends" : activeMode === "friends" ? "both" : "music";
    attendee.update({ festivalMode: next });
  };

  const formattedDate = formatEventDate(data.event, {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
  const formattedHours = formatEventHours(data.event);

  const renderHero = () => {
    const actionsRow = (darkOverlay: boolean) => (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!ready}
          aria-label="Save event"
          aria-pressed={preferences.following}
          onClick={toggleFollow}
          className={`eb-press grid size-11 place-items-center rounded-full ${
            darkOverlay
              ? "bg-black/55 text-white backdrop-blur-md"
              : "border border-border bg-card text-foreground"
          }`}
        >
          <Heart
            size={19}
            fill={preferences.following ? "currentColor" : "none"}
            className={preferences.following && !darkOverlay ? "text-primary" : ""}
          />
        </button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Share event"
          className={`eb-press grid size-11 place-items-center rounded-full ${
            darkOverlay
              ? "bg-black/55 text-white backdrop-blur-md"
              : "border border-border bg-card text-foreground"
          }`}
        >
          <Share2 size={18} strokeWidth={1.85} />
        </button>
      </div>
    );

    // 1. PROFESSIONAL LAYOUT (Conference & Summit, Corporate) — Editorial Paper Masthead, zero nightclub overlay
    if (family === "professional") {
      return (
        <section
          className="border-b border-separator px-4 pb-6 pt-5"
          aria-label={data.event.name}
          data-home-layout="professional"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {data.event.logoUrl && (
                <img
                  src={data.event.logoUrl}
                  alt={`${data.event.name} logo`}
                  width={40}
                  height={40}
                  className="size-10 rounded-lg border border-border object-cover"
                />
              )}
              <div>
                <p className="eb-kicker text-primary">
                  {templateDef.categoryLabel} · {phase.label}
                </p>
                <p className="text-[13px] text-muted-foreground">{data.festival.organiser}</p>
              </div>
            </div>
            {actionsRow(false)}
          </div>

          <button
            type="button"
            onClick={() => openSheet({ kind: "event" })}
            aria-label={`About ${data.event.name}`}
            className="mt-4 block w-full text-left"
          >
            <h1 className="eb-page-title break-words">{data.event.name}</h1>
            {(templateConfig.tagline ||
              (data.event.description &&
                !data.event.description.includes(data.event.venueName))) && (
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                {templateConfig.tagline || data.event.description}
              </p>
            )}
          </button>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-separator pt-4 text-[14px] sm:grid-cols-3">
            <div>
              <dt className="eb-kicker text-[11px]">Date &amp; Hours</dt>
              <dd className="mt-0.5 font-semibold text-foreground">{formattedDate}</dd>
              <dd className="text-[13px] text-muted-foreground">{formattedHours}</dd>
            </div>
            <div>
              <dt className="eb-kicker text-[11px]">Venue</dt>
              <dd className="mt-0.5 font-semibold text-foreground">{data.event.venueName}</dd>
              <dd className="text-[13px] text-muted-foreground">{data.event.city}</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="eb-kicker text-[11px]">{terms.placesLabel}</dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {data.stages.length > 0
                  ? `${data.stages.length} ${data.stages.length === 1 ? terms.placeSingular.toLowerCase() : terms.placesLabel.toLowerCase()}`
                  : "Venue TBC"}
              </dd>
              <dd className="text-[13px] text-muted-foreground">
                {data.festival.artists.length} {terms.peopleLabel.toLowerCase()}
              </dd>
            </div>
          </dl>

          {data.event.heroImageUrl && (
            <div className="mt-5 overflow-hidden rounded-xl border border-border">
              <img
                src={data.event.heroImageUrl}
                alt={data.event.name}
                width={1200}
                height={520}
                fetchPriority="high"
                className="h-44 w-full object-cover sm:h-56"
              />
            </div>
          )}
        </section>
      );
    }

    // 2. SOCIAL LAYOUT (Private Celebration, Wedding, Nightlife) — Invitation-led Editorial Hero
    if (family === "social") {
      return (
        <section className="px-4 pt-4" aria-label={data.event.name} data-home-layout="social">
          <div className="eb-panel overflow-hidden">
            {data.event.heroImageUrl && (
              <div className="relative h-52 w-full overflow-hidden sm:h-64">
                <img
                  src={data.event.heroImageUrl}
                  alt={data.event.name}
                  width={1200}
                  height={640}
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
                <div className="absolute right-3 top-3">{actionsRow(true)}</div>
              </div>
            )}
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-favorite-soft px-3 py-1 text-[12px] font-semibold text-primary">
                    {isPrivate ? (
                      <Lock size={12} aria-hidden />
                    ) : (
                      <Sparkles size={12} aria-hidden />
                    )}
                    {isPrivate ? "Private invitation" : templateDef.categoryLabel}
                  </span>
                  <span className="text-[13px] font-medium text-muted-foreground">
                    {phase.label}
                  </span>
                </div>
                {!data.event.heroImageUrl && actionsRow(false)}
              </div>

              <button
                type="button"
                onClick={() => openSheet({ kind: "event" })}
                aria-label={`About ${data.event.name}`}
                className="mt-3 block w-full text-left"
              >
                <h1 className="eb-page-title break-words">{data.event.name}</h1>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  {formattedDate} · {formattedHours} · {data.event.venueName}
                </p>
                {templateConfig.rsvpNote && (
                  <p className="mt-2 border-l-2 border-primary pl-3 text-[14px] text-foreground">
                    {templateConfig.rsvpNote}
                  </p>
                )}
              </button>

              {hasRsvpModule && (
                <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-separator pt-4">
                  <button
                    type="button"
                    disabled={!ready}
                    onClick={toggleFollow}
                    aria-pressed={preferences.following}
                    className={`eb-press inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold ${
                      preferences.following
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-secondary text-foreground"
                    }`}
                  >
                    {preferences.following ? <Check size={16} aria-hidden /> : null}
                    {preferences.following ? "RSVP confirmed · Going" : terms.primaryCtaLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("crew")}
                    className="eb-press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[14px] font-semibold text-foreground"
                  >
                    <Users size={15} aria-hidden /> Guest circle
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    // 3. COMPETITION LAYOUT (Sports Event) — High-Contrast Stadium Matchday Banner
    if (family === "competition") {
      return (
        <section
          className="border-b-4 border-primary bg-card px-4 pb-6 pt-5"
          aria-label={data.event.name}
          data-home-layout="competition"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-primary-foreground">
              <Trophy size={13} aria-hidden />
              {phase.label} · Matchday
            </span>
            {actionsRow(false)}
          </div>
          <button
            type="button"
            onClick={() => openSheet({ kind: "event" })}
            aria-label={`About ${data.event.name}`}
            className="mt-4 block w-full text-left"
          >
            <h1 className="eb-page-title break-words text-[34px] uppercase tracking-tight">
              {data.event.name}
            </h1>
            <p className="mt-2 text-[15px] font-semibold text-muted-foreground">
              {formattedDate} · {formattedHours} · {data.event.venueName}
            </p>
          </button>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="#lineup"
              className="eb-press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
            >
              <Trophy size={15} aria-hidden /> View {terms.programLabel}
            </a>
            {hasMapModule && (
              <a
                href="#map"
                className="eb-press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-[14px] font-semibold text-foreground"
              >
                <MapPin size={15} aria-hidden /> Stadium map
              </a>
            )}
          </div>
        </section>
      );
    }

    // 4. DISCOVERY LAYOUT (Market, Expo, Cultural, Custom) — Bright Editorial Showcase Hero
    if (family === "discovery") {
      return (
        <section className="px-4 pt-4" aria-label={data.event.name} data-home-layout="discovery">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {data.event.heroImageUrl && (
              <div className="relative h-56 w-full overflow-hidden">
                <img
                  src={data.event.heroImageUrl}
                  alt={data.event.name}
                  width={1200}
                  height={640}
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
                <div className="absolute right-3 top-3">{actionsRow(true)}</div>
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-primary">
                  <Store size={14} aria-hidden /> {templateDef.categoryLabel} · {phase.label}
                </span>
                {!data.event.heroImageUrl && actionsRow(false)}
              </div>
              <button
                type="button"
                onClick={() => openSheet({ kind: "event" })}
                aria-label={`About ${data.event.name}`}
                className="mt-2 block w-full text-left"
              >
                <h1 className="eb-page-title break-words">{data.event.name}</h1>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  {formattedDate} · {formattedHours} · {data.event.venueName}
                </p>
              </button>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="#lineup"
                  className="eb-press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
                >
                  Browse {terms.peopleLabel}
                </a>
                {hasPassportModule && (
                  <button
                    type="button"
                    onClick={() => openSheet({ kind: "passport" })}
                    className="eb-press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[14px] font-semibold text-foreground"
                  >
                    <Stamp size={15} aria-hidden /> {terms.passportLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    // 5. EXPERIENCE LAYOUT (Music Festival, Concert) — Full-Bleed Dark Immersive Photography Hero
    return (
      <section
        className="relative overflow-hidden"
        aria-label={data.event.name}
        data-home-layout="experience"
      >
        <div className="relative h-[320px] w-full overflow-hidden bg-gradient-to-br from-[#132229] via-[#112e36] to-[#0d0f12] sm:h-[380px]">
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
            className="absolute inset-0 bg-gradient-to-t from-[#0d0f12] via-[#0d0f12]/45 to-black/25"
          />
          <div className="absolute left-4 top-4 flex items-center gap-2">
            {data.event.logoUrl && (
              <img
                src={data.event.logoUrl}
                alt={`${data.event.name} logo`}
                width={36}
                height={36}
                className="size-9 rounded-lg border border-white/25 object-cover"
              />
            )}
            <span className="rounded-full bg-black/65 px-3 py-1 text-[12px] font-semibold tracking-wide text-white">
              {phase.label}
            </span>
          </div>
          <div className="absolute right-4 top-4">{actionsRow(true)}</div>

          <button
            type="button"
            onClick={() => openSheet({ kind: "event" })}
            aria-label={`About ${data.event.name}`}
            className="absolute inset-x-0 bottom-0 p-5 text-left text-white"
          >
            <p className="text-[13px] font-semibold uppercase tracking-wider text-white/75">
              {data.festival.organiser} · {data.event.city}
            </p>
            <h1 className="eb-display mt-1 line-clamp-2 break-words text-[34px] leading-[1.0] text-white sm:text-[42px]">
              {data.event.name}
            </h1>
            <p className="mt-2 truncate text-[14px] text-white/85">
              {formattedDate} · {formattedHours} · {data.event.venueName}
            </p>
          </button>
        </div>
      </section>
    );
  };

  const renderSection = (id: HomeSectionId) => {
    switch (id) {
      case "featured": {
        if (featured.length === 0) {
          return (
            <section
              key="featured"
              className="mx-4 mt-7 border-y border-separator py-5"
              aria-label={`Featured ${terms.peopleLabel.toLowerCase()}`}
              data-testid="home-featured-section"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="eb-section-heading">{terms.programLabel}</h2>
                <a
                  href="#lineup"
                  className="flex min-h-11 items-center gap-1 text-[14px] font-semibold text-primary"
                >
                  {terms.programLabel === "Lineup"
                    ? "Your lineup"
                    : `Full ${terms.programLabel.toLowerCase()}`}{" "}
                  <ArrowUpRight size={15} aria-hidden />
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

        // PROFESSIONAL / COMPETITION: Structured Hairline Ledger (NOT Festival Poster!)
        if (family === "professional" || family === "competition") {
          return (
            <section
              key="featured"
              className="mx-4 mt-7"
              aria-label={`Featured ${terms.peopleLabel.toLowerCase()}`}
              data-testid="home-featured-section"
            >
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="eb-section-heading">{terms.featuredHeading}</h2>
                <a
                  href="#lineup"
                  className="flex min-h-11 items-center gap-1 whitespace-nowrap text-[14px] font-semibold text-primary"
                >
                  {terms.programLabel === "Lineup"
                    ? "Your lineup"
                    : `Full ${terms.programLabel.toLowerCase()}`}{" "}
                  <ArrowUpRight size={15} aria-hidden />
                </a>
              </div>
              <div className="eb-list">
                {featured.map((item) => {
                  const perf = data.performances.find((p) => p.artistId === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openSheet({ kind: "artist", artist: item })}
                      className="eb-row py-3.5"
                    >
                      <ArtistAvatar artist={item} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-bold uppercase tracking-wide text-primary">
                          {item.isHeadliner ? terms.headlinerBadge : "Featured"}
                          {perf
                            ? ` · ${perf.scheduledStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : ""}
                        </span>
                        <span className="mt-0.5 block truncate text-[17px] font-bold text-foreground">
                          {item.name}
                        </span>
                        <span className="block truncate text-[14px] text-muted-foreground">
                          {item.stageName ?? item.role}
                        </span>
                      </span>
                      <ArrowUpRight
                        size={17}
                        className="flex-none text-muted-foreground"
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        }

        // EXPERIENCE / SOCIAL / DISCOVERY: Editorial Monumental Lead + Portrait Rail
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
        const portraitStrip = [...others, ...additionalPortraits];

        return (
          <section
            key="featured"
            className="mx-4 mt-7 space-y-4"
            aria-label={`Featured ${terms.peopleLabel.toLowerCase()}`}
            data-testid="home-featured-section"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="eb-section-heading">{terms.featuredHeading}</h2>
              <a
                href="#lineup"
                className="flex min-h-11 flex-none items-center gap-1 whitespace-nowrap text-[14px] font-semibold text-primary"
              >
                {terms.programLabel === "Lineup"
                  ? "Your lineup"
                  : `Full ${terms.programLabel.toLowerCase()}`}{" "}
                <ArrowUpRight size={15} aria-hidden />
              </a>
            </div>

            {lead && (
              <button
                type="button"
                onClick={() => openSheet({ kind: "artist", artist: lead })}
                className="eb-press flex w-full items-center gap-4 border-y border-separator py-4 text-left"
              >
                <ArtistAvatar artist={lead} large />
                <span className="min-w-0 flex-1">
                  <span className="eb-kicker text-primary">
                    {lead.isHeadliner ? terms.headlinerBadge : "Featured"}
                  </span>
                  <span className="eb-display mt-1 block truncate text-[24px] text-foreground">
                    {lead.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[14px] text-muted-foreground">
                    {lead.stageName ?? lead.role}
                  </span>
                </span>
                <ArrowUpRight size={19} className="flex-none text-muted-foreground" aria-hidden />
              </button>
            )}

            {portraitStrip.length > 0 && (
              <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {portraitStrip.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => openSheet({ kind: "artist", artist: act })}
                    className="eb-press w-[8.25rem] flex-none text-left"
                  >
                    <ArtistAvatar artist={act} variant="portrait" eager />
                    <span className="mt-2 block truncate text-[15px] font-bold leading-snug text-foreground">
                      {act.name}
                    </span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {act.stageName ?? act.role}
                    </span>
                  </button>
                ))}
                <a
                  href="#lineup"
                  className="eb-press flex w-[7.25rem] flex-none flex-col items-center justify-center rounded-xl border border-border bg-card p-3 text-center text-primary"
                >
                  <span className="eb-display text-[22px] tabular-nums text-primary">
                    {remainingArtists > 0 ? `+${remainingArtists}` : <ArrowUpRight size={22} />}
                  </span>
                  <span className="mt-1.5 block text-[13px] font-semibold leading-tight text-foreground">
                    Full {terms.programLabel.toLowerCase()}
                  </span>
                </a>
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
                  View full {terms.programLabel.toLowerCase()}
                </a>
              </div>
            )}
          </section>
        );
      }

      case "crew":
        if (!hasCrewModule) return null;
        return (
          <div key="crew" data-testid="home-crew-section">
            <CrewPeople
              action={
                <button
                  type="button"
                  onClick={() => navigate("crew")}
                  className="eb-press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
                >
                  <Users size={15} aria-hidden />
                  {terms.isConferenceLike ? "Open network" : "Find your crew"}
                </button>
              }
            />
          </div>
        );

      case "essentials":
        return (
          <section key="essentials" className="mx-4 mt-7" aria-label="Event essentials and venue">
            <h2 className="eb-section-heading mb-3">On the ground</h2>
            {/* Clean Editorial Hairline Index — Zero 2-Column Utility Card Soup */}
            <div className="eb-list">
              <a href="#info" className="eb-row py-3.5">
                <span className="grid size-10 flex-none place-items-center rounded-lg bg-favorite-soft text-primary">
                  <Info size={19} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold leading-snug">
                    {terms.essentialsHeading}
                  </span>
                  <span className="block text-[14px] text-muted-foreground">
                    {terms.entryRulesLabel} · Transport · Safety
                  </span>
                </span>
                <ArrowUpRight size={17} className="flex-none text-muted-foreground" aria-hidden />
              </a>

              {hasMapModule && (
                <a href="#map" className="eb-row py-3.5">
                  <span className="grid size-10 flex-none place-items-center rounded-lg bg-secondary text-foreground">
                    <MapPin size={19} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold leading-snug">Venue map</span>
                    <span className="block text-[14px] text-muted-foreground">
                      {data.points.length + data.stages.length > 0
                        ? `${data.points.length + data.stages.length} locations on the venue plan`
                        : "Venue details & meeting points"}
                    </span>
                  </span>
                  <ArrowUpRight size={17} className="flex-none text-muted-foreground" aria-hidden />
                </a>
              )}

              <button
                type="button"
                onClick={() => openSheet({ kind: "safety" })}
                className="eb-row py-3.5"
              >
                <span className="grid size-10 flex-none place-items-center rounded-lg bg-secondary text-primary">
                  <Shield size={19} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold leading-snug">
                    Safety &amp; medical points
                  </span>
                  <span className="block text-[14px] text-muted-foreground">
                    ICE medical card &amp; on-site support
                  </span>
                </span>
                <ArrowUpRight size={17} className="flex-none text-muted-foreground" aria-hidden />
              </button>
            </div>
          </section>
        );

      case "upcoming":
        // Private parties & weddings NEVER display irrelevant public discovery links!
        if (isPrivate) return null;
        if (otherEvents.length === 0 && !data.festival.relatedEvent.name) return null;
        return (
          <section key="upcoming" className="mx-4 mt-7" aria-label="Upcoming events">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="eb-section-heading">Upcoming events</h2>
              <a
                href="#events"
                className="flex min-h-11 items-center gap-1 text-[14px] font-semibold text-primary"
              >
                Explore all <CalendarDays size={15} aria-hidden />
              </a>
            </div>
            <div className="eb-list">
              {otherEvents.length > 0 ? (
                otherEvents.slice(0, 2).map((ev) => (
                  <a key={ev.event.id} href="#events" className="eb-row justify-between py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[16px] font-semibold">
                        {ev.event.name}
                      </span>
                      <span className="block truncate text-[14px] text-muted-foreground">
                        {formatEventDate(ev.event, { day: "numeric", month: "short" })} ·{" "}
                        {ev.event.venueName}
                      </span>
                    </span>
                    <ArrowUpRight size={17} className="text-muted-foreground" aria-hidden />
                  </a>
                ))
              ) : (
                <a href="#events" className="eb-row justify-between py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-semibold">
                      {data.festival.relatedEvent.name}
                    </span>
                    <span className="block truncate text-[14px] text-muted-foreground">
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

  const showTicketBar = hasTicketsModule && (primaryTicket !== null || hasTicketUrl);

  return (
    <div className="pb-24">
      {renderHero()}

      {/* Concise Onboarding Focus Switcher Strip */}
      <div className="mx-4 mt-4 flex min-h-11 items-center justify-between gap-2 border-b border-separator pb-3 text-[14px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {family === "professional" ? (
            <CalendarRange size={15} className="text-primary" aria-hidden />
          ) : (
            <Music2 size={15} className="text-primary" aria-hidden />
          )}
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
          className="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground"
          aria-label="Change home focus"
        >
          <SlidersHorizontal size={13} aria-hidden /> Switch focus
        </button>
      </div>

      {/* Template-ordered + Personalised Sections */}
      {sectionOrder.map(renderSection)}

      <InstallReminder />

      {/* Persistent Sticky Bottom Ticket Bar (Only when ticketing applies — never invents Buy Tickets on ticketless private parties!) */}
      {showTicketBar && (
        <div
          data-testid="event-ticket-bar"
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[720px] border-t border-separator bg-bar px-4 py-2.5 backdrop-blur-xl md:rounded-t-2xl md:border-x"
        >
          {primaryTicket ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold tabular-nums text-foreground">
                  {activeTierLabel} · {gateLabel} · Opens {opensTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openGateCard(0)}
                className="eb-press flex min-h-11 flex-none items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
              >
                <Ticket size={15} aria-hidden />
                Show my ticket
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] text-muted-foreground">No ticket yet</p>
              <button
                type="button"
                onClick={() => openSheet({ kind: "buy-tickets" })}
                className="eb-press flex min-h-11 flex-none items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
              >
                Buy tickets
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
