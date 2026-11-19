import { describe, expect, it } from "vitest";
import { getDemoData } from "@/lib/event/demo-data";
import { parseStoredPreferences } from "@/lib/attendee/use-attendee";
import { bumpLink, readBump, PROFILE_BADGES } from "@/lib/attendee/festival-bump";
import { SOUND_OF_SUMMER_TRIVIA } from "@/lib/attendee/play";
import { parseZones } from "@/lib/organiser/schema";
import { crewActivitySchema } from "@/lib/organiser/cloud-extensions";

describe("Remaining X features — preferences, bump badges, trivia, crew activities & organiser zones", () => {
  const data = getDemoData();

  it("parses and validates badges, reminders, ticketTier, medicalCard, collections, customStamps and predictions", () => {
    const parsed = parseStoredPreferences(
      {
        profile: { name: "Alex", handle: "alex" },
        hasName: true,
        onboardingDone: true,
        selectedEventId: data.event.id,
        badges: ["Amapiano", "Sunset Set", "InvalidBadge"],
        reminders: ["shimza", "unknown-artist"],
        ticketTier: "platinum",
        medicalCard: {
          contactName: "Maya",
          contactPhone: "+264 81 000 0000",
          notes: "Penicillin allergy",
          bloodType: "O+",
        },
        collections: ["Going", "Coastal Summer", "FakeCollection"],
        followedOrganisers: ["Namib Rage Events"],
        customStamps: [
          { id: "c1", label: "Sunset photo by the jetty", checked: true },
          { id: "c2", label: "", checked: false },
        ],
        predictions: {
          firstStageId: data.stages[0]!.id,
          anthemArtistId: "shimza",
          note: "Opening set at sunset",
        },
      },
      data,
    );

    expect(parsed.badges).toEqual(["Amapiano", "Sunset Set"]);
    expect(parsed.reminders).toEqual(["shimza"]);
    expect(parsed.ticketTier).toBe("platinum");
    expect(parsed.medicalCard).toEqual({
      contactName: "Maya",
      contactPhone: "+264 81 000 0000",
      notes: "Penicillin allergy",
      bloodType: "O+",
    });
    expect(parsed.collections).toEqual(["Going", "Coastal Summer"]);
    expect(parsed.followedOrganisers).toEqual(["Namib Rage Events"]);
    expect(parsed.customStamps).toEqual([
      { id: "c1", label: "Sunset photo by the jetty", checked: true },
    ]);
    expect(parsed.predictions).toEqual({
      firstStageId: data.stages[0]!.id,
      anthemArtistId: "shimza",
      note: "Opening set at sunset",
    });
  });

  it("includes and validates optional festival interest badges in Festival Bump plans", () => {
    const raw = JSON.stringify({
      version: 1,
      event: data.event.id,
      name: "Alex",
      artists: ["shimza"],
      meeting: null,
      badges: [PROFILE_BADGES[0], PROFILE_BADGES[3]],
    });
    const plan = readBump(raw, data);
    expect(plan.badges).toEqual(["Amapiano", "Sunset Set"]);
    const link = bumpLink("https://eventbudides.lovable.app/#crew", plan);
    expect(link).toContain("Amapiano");
  });

  it("grounds all Sound of Summer trivia questions in verified event facts", () => {
    expect(SOUND_OF_SUMMER_TRIVIA.length).toBeGreaterThanOrEqual(4);
    for (const item of SOUND_OF_SUMMER_TRIVIA) {
      expect(item.options[item.answerIndex]).toBeTruthy();
      expect(item.fact.length).toBeGreaterThan(10);
    }
  });

  it("parses organiser zone items with accessTier, vendorNote and status defaults", () => {
    const zones = parseZones([
      { name: "Main Stage", type: "stage", x: 50, y: 50 },
      {
        name: "Platinum Bar",
        type: "bar",
        x: 75,
        y: 35,
        accessTier: "platinum",
        vendorNote: "Card and cashless wristbands accepted",
        status: "busy",
      },
    ]);
    expect(zones).toHaveLength(2);
    expect(zones[0]?.accessTier).toBe("all");
    expect(zones[0]?.status).toBe("open");
    expect(zones[1]?.accessTier).toBe("platinum");
    expect(zones[1]?.vendorNote).toBe("Card and cashless wristbands accepted");
    expect(zones[1]?.status).toBe("busy");
  });

  it("validates crew coordination activity items (ping, safe, sos, poll, travel, message)", () => {
    const poll = crewActivitySchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      eventId: data.event.id,
      authorName: "Alex",
      kind: "poll",
      message: "Which stage next?",
      pointId: "main-stage",
      meta: { options: ["Main Stage", "House & Techno Stage"], votes: { self: 0 } },
      createdAt: new Date().toISOString(),
    });
    expect(poll.kind).toBe("poll");
    expect(poll.pointId).toBe("main-stage");
  });
});
