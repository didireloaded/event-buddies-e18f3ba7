import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import {
  buildDefaultTemplateConfig,
  buildTemplateCssVars,
  EVENT_TEMPLATE_LIST,
  EVENT_TEMPLATES,
  LAYOUT_FAMILIES,
  resolveEventTemplate,
  switchTemplatePreservingData,
  type EventTemplateConfig,
} from "@/lib/templates/event-templates";
import { organiserEventToDemoData } from "@/lib/organiser/event-adapter";
import { TemplateEditor } from "@/components/organiser/TemplateEditor";

vi.mock("@/lib/organiser/data", () => ({
  uploadOwnFile: vi.fn(async () => "event-logos/uploaded.png"),
  signedUrl: vi.fn(async () => "https://example.invalid/uploaded-logo.png"),
}));

afterEach(cleanup);

describe("12-template multi-event architecture", () => {
  it("provides 12 distinct event templates spanning all 5 layout families", () => {
    expect(EVENT_TEMPLATE_LIST).toHaveLength(12);
    const familiesPresent = new Set(EVENT_TEMPLATE_LIST.map((t) => t.layoutFamily));
    expect(familiesPresent.size).toBe(5);
    for (const fam of LAYOUT_FAMILIES) {
      expect(familiesPresent.has(fam)).toBe(true);
    }
  });

  it("assigns distinct visual systems and domain terminology per event type", () => {
    const fest = buildDefaultTemplateConfig("music_festival");
    const conf = buildDefaultTemplateConfig("conference_summit");
    const party = buildDefaultTemplateConfig("private_celebration");
    const sports = buildDefaultTemplateConfig("sports_event");
    const market = buildDefaultTemplateConfig("food_lifestyle_market");

    expect(fest.layoutFamily).toBe("experience");
    expect(fest.surfaceMode).toBe("dark");
    expect(conf.layoutFamily).toBe("professional");
    expect(conf.surfaceMode).toBe("light");
    expect(party.layoutFamily).toBe("social");
    expect(party.visibility).toBe("private_invite");
    expect(sports.layoutFamily).toBe("competition");
    expect(market.layoutFamily).toBe("discovery");

    expect(EVENT_TEMPLATES.conference_summit.terms.programLabel).toBe("Agenda");
    expect(EVENT_TEMPLATES.sports_event.terms.programLabel).toBe("Fixtures");
    expect(EVENT_TEMPLATES.food_lifestyle_market.terms.programLabel).toBe("Vendors");
    expect(EVENT_TEMPLATES.private_celebration.terms.crewLabel).toBe("Guests");

    const festVars = buildTemplateCssVars(fest);
    const confVars = buildTemplateCssVars(conf);
    expect(festVars["--primary"]).not.toBe(confVars["--primary"]);
    expect(festVars["--eb-display-font"]).toBeTruthy();
  });

  it("switches templates losslessly while preserving custom media and tagline", () => {
    const initial: EventTemplateConfig = {
      ...buildDefaultTemplateConfig("conference_summit"),
      logoUrl: "https://example.invalid/logo.png",
      heroImageUrl: "https://example.invalid/hero.jpg",
      tagline: "Namibia Innovation 2026",
    };

    const switched = switchTemplatePreservingData(initial, "sports_event");
    expect(switched.templateId).toBe("sports_event");
    expect(switched.layoutFamily).toBe("competition");
    expect(switched.logoUrl).toBe("https://example.invalid/logo.png");
    expect(switched.heroImageUrl).toBe("https://example.invalid/hero.jpg");
    expect(switched.tagline).toBe("Namibia Innovation 2026");
  });

  it("adapts private organiser events cleanly without leaking Sound of Summer defaults or public visibility", () => {
    const privateTpl = buildDefaultTemplateConfig("private_celebration");
    const demo = organiserEventToDemoData({
      id: "priv-1",
      eventType: "private",
      name: "Selma's 30th Rooftop Dinner",
      startDate: "2026-12-18",
      endDate: "2026-12-18",
      venue: "Skybar Windhoek",
      gatesOpen: "19:00",
      entryRules: "Invite-only guest list.",
      program: [{ title: "Welcome Toasts", place: "Terrace", time: "19:30", status: "scheduled" }],
      zones: [{ name: "Terrace", type: "stage", x: 50, y: 40, accessTier: "all", vendorNote: "", status: "open" }],
      sitePlanPath: null,
      sitePlanUrl: null,
      templateConfig: privateTpl,
      visibility: "private_invite",
      publishedAt: "2026-11-19T12:00:00Z",
    });

    expect(demo.event.visibility).toBe("private_invite");
    expect(demo.event.templateConfig?.templateId).toBe("private_celebration");
    expect(demo.festival.artists.map((a) => a.name)).toEqual(["Welcome Toasts"]);
    expect(demo.festival.ticketUrl).toBe("");
    const resolved = resolveEventTemplate({
      templateConfig: demo.event.templateConfig,
      category: demo.event.category,
    });
    expect(resolved.definition.layoutFamily).toBe("social");
  });
});

describe("Organiser Visual Template Editor & Live Attendee Preview", () => {
  function EditorHarness({
    onSave = vi.fn<(c: EventTemplateConfig) => Promise<void>>(async () => {}),
  }: {
    onSave?: (c: EventTemplateConfig) => Promise<void>;
  }) {
    const [cfg, setCfg] = useState<EventTemplateConfig>(() =>
      buildDefaultTemplateConfig("conference_summit"),
    );
    return (
      <TemplateEditor
        eventId="evt-conf-1"
        userId="org-1"
        eventName="Windhoek Tech Forum"
        startDate="2026-12-10"
        endDate="2026-12-10"
        venue="Safari Court, Windhoek"
        gatesOpen="08:30"
        entryRules="Badge pickup at desk."
        program={[
          {
            title: "Dr. Selma Amupolo — Opening Keynote",
            place: "Hall A",
            time: "09:00",
            status: "scheduled",
            headliner: true,
            featured: true,
            featuredOrder: 0,
          },
        ]}
        zones={[
          {
            name: "Hall A",
            type: "stage",
            x: 35,
            y: 45,
            accessTier: "all",
            vendorNote: "Keynote room",
            status: "open",
          },
        ]}
        sitePlanUrl={null}
        config={cfg}
        onChange={setCfg}
        onSave={onSave}
        saving={false}
        saveNotice=""
      />
    );
  }

  it("renders real event data inside Live Attendee Preview, switches templates losslessly, toggles devices and saves", () => {
    const onSave = vi.fn<(c: EventTemplateConfig) => Promise<void>>(async () => {});
    render(<EditorHarness onSave={onSave} />);

    // Real event data renders inside Live Attendee Preview immediately
    const preview = screen.getByTestId("live-attendee-preview-frame");
    expect(preview).toHaveAttribute("data-layout-family", "professional");
    expect(preview).toHaveAttribute("data-surface-mode", "light");
    expect(preview).toHaveTextContent("Windhoek Tech Forum");
    expect(preview).toHaveTextContent("Dr. Selma Amupolo — Opening Keynote");

    // Switch preview screen to Agenda / Programme
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
    expect(preview).toHaveTextContent("09:00");
    expect(preview).toHaveTextContent("Hall A");

    // Switch preview viewport to Tablet and Desktop
    fireEvent.click(screen.getByRole("button", { name: "Tablet preview" }));
    expect(screen.getByRole("button", { name: "Tablet preview" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Desktop preview" }));
    expect(screen.getByRole("button", { name: "Desktop preview" })).toHaveAttribute("aria-pressed", "true");

    // Switch template to Sports Event -> live preview updates layout family while preserving real programme item!
    fireEvent.click(screen.getByRole("button", { name: /Sports Event/i }));
    expect(preview).toHaveAttribute("data-layout-family", "competition");
    expect(preview).toHaveTextContent("Dr. Selma Amupolo — Opening Keynote");

    // Switch back to Home preview & save template
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.click(screen.getByRole("button", { name: "Save template & branding" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]?.[0]?.templateId).toBe("sports_event");
  });
});
