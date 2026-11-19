import { describe, expect, it } from "vitest";
import { organiserEventToDemoData } from "@/lib/organiser/event-adapter";
import { buildPlaces } from "@/lib/attendee/map";

describe("Event-Agnostic Platform — organiserEventToDemoData & Event #2 isolation", () => {
  it("converts a published organiser event (Event #2) into a complete DemoData record with its own stages, map points, lineup and schedule", () => {
    const techSummit = organiserEventToDemoData({
      id: "30000000-0000-4000-8000-000000000003",
      eventType: "conference",
      name: "Tech Summit 2026",
      startDate: "2026-11-28",
      endDate: "2026-11-29",
      venue: "Safari Court, Windhoek",
      gatesOpen: "08:30",
      entryRules: "Conference badge required at all halls.\nNo flash photography.",
      program: [
        {
          title: "Keynote: African FinTech",
          place: "Auditorium A",
          time: "09:00",
          status: "scheduled",
        },
        {
          title: "Panel: Cloud Infrastructure",
          place: "Hall B",
          time: "11:00",
          status: "scheduled",
        },
      ],
      zones: [
        {
          name: "Auditorium A",
          type: "stage",
          x: 35,
          y: 40,
          accessTier: "all",
          vendorNote: "Main keynote hall",
          status: "open",
        },
        {
          name: "Espresso Bar",
          type: "bar",
          x: 60,
          y: 55,
          accessTier: "vip",
          vendorNote: "Specialty coffee & pastries",
          status: "open",
        },
        {
          name: "North Registration",
          type: "gate",
          x: 50,
          y: 85,
          accessTier: "all",
          vendorNote: "Badge pickup",
          status: "open",
        },
      ],
      sitePlanPath: null,
      sitePlanUrl: null,
      publishedAt: "2026-11-19T06:00:00Z",
    });

    expect(techSummit.event.name).toBe("Tech Summit 2026");
    expect(techSummit.event.venueName).toBe("Safari Court");
    expect(techSummit.event.city).toBe("Windhoek");
    expect(techSummit.event.category).toBe("Conference");

    // 2 stages: Auditorium A (from zone) + Hall B (from program place)
    expect(techSummit.stages.map((s) => s.name)).toEqual(["Auditorium A", "Hall B"]);

    // 2 non-stage map points: Espresso Bar + North Registration
    expect(techSummit.points.map((p) => p.name)).toEqual(["Espresso Bar", "North Registration"]);
    expect(techSummit.points[0]?.type).toBe("bar");
    expect(techSummit.points[1]?.type).toBe("entrance");

    // 2 program speakers/sessions + 2 timed performances
    expect(techSummit.festival.artists.map((a) => a.name)).toEqual([
      "Keynote: African FinTech",
      "Panel: Cloud Infrastructure",
    ]);
    expect(techSummit.performances).toHaveLength(2);
    expect(techSummit.festival.timetablePublished).toBe(true);

    // buildPlaces returns strictly Event #2's 4 locations, never Sound of Summer's 41 points
    const places = buildPlaces(techSummit);
    expect(places).toHaveLength(4);
    expect(places.map((p) => p.name)).toEqual([
      "Auditorium A",
      "Hall B",
      "Espresso Bar",
      "North Registration",
    ]);
  });
});
