import { describe, expect, it } from "vitest";
import {
  computeAffineCalibration,
  computeBounds,
  computeCanvasMaxZoom,
  computeChromePadding,
  computeFittedImageRect,
  computeMaxZoom,
  projectGpsToImagePercent,
  validateSitePlanDimensions,
} from "@/lib/attendee/map-fit";
import {
  analyzeOrganiserEvent,
  getEventCategoryTerms,
  getPersonalisedHomeOrder,
  selectFeaturedParticipants,
} from "@/lib/intelligence/event-intelligence";
import {
  classifyPositionFreshness,
  computeLiveShareExpiry,
  formatAccuracyBadge,
} from "@/lib/crew/live-gps";
import { getDemoData } from "@/lib/event/demo-data";
import { SAMPLE_BAR_MENU } from "@/lib/attendee/bar-menu";
import { eventFacts, searchLocalFacts } from "@/lib/attendee/event-facts";
import { addGlobalBuddy, readGlobalBuddies, removeGlobalBuddy } from "@/lib/crew/buddies";
import { readStoredMapCalibration, saveStoredMapCalibration } from "@/lib/organiser/event-adapter";

describe("Map Fit placement, zoom limits, aspect-ratio fitting and upload validation", () => {
  it("computes aspect-ratio-preserving geographic bounds without stretching", () => {
    const res = computeBounds([14.54, -22.82], 2000, 1000, 1);
    const latSpanMeters = (res.north - res.south) * 111_320;
    const lngSpanMeters = (res.east - res.west) * 111_320 * Math.cos((-22.82 * Math.PI) / 180);
    expect(Math.round(lngSpanMeters / latSpanMeters)).toBe(2);
    expect(res.corners).toHaveLength(4);
  });

  it("solves 3-point affine GPS calibration and projects lat/lng accurately onto 0–100%", () => {
    const transform = computeAffineCalibration([
      { x: 0, y: 0, lat: -22.8, lng: 14.5 },
      { x: 100, y: 0, lat: -22.8, lng: 14.6 },
      { x: 0, y: 100, lat: -22.9, lng: 14.5 },
    ]);
    expect(transform).not.toBeNull();
    const projected = projectGpsToImagePercent(-22.85, 14.55, transform!);
    expect(projected).toEqual({ x: 50, y: 50 });
  });

  it("caps maxZoom based on native image resolution and prevents zooming low-res images into blur", () => {
    const hiRes = computeMaxZoom(4000, 400, 15, 3000);
    expect(hiRes).toBeGreaterThan(17);
    expect(hiRes).toBeLessThanOrEqual(20);

    const lowRes = computeMaxZoom(800, 400, 15, 600);
    expect(lowRes).toBe(16); // baseZoom + 1 hard cap for <2000px images

    expect(computeCanvasMaxZoom(4000, 3000, 390)).toBeLessThanOrEqual(4.5);
    expect(computeCanvasMaxZoom(800, 600, 390)).toBeLessThanOrEqual(2.5);
  });

  it("fits landscape, portrait and square site plans inside chrome-padded viewports without cropping", () => {
    const padding = computeChromePadding({ topChrome: 56, bottomChrome: 97, side: 16 });
    expect(padding.top).toBe(72);
    expect(padding.bottom).toBe(113);

    const landscape = computeFittedImageRect(390, 600, 2400, 1200, padding);
    expect(landscape.width).toBe(358);
    expect(landscape.height).toBe(179);

    const portrait = computeFittedImageRect(390, 600, 1200, 2400, padding);
    expect(portrait.height).toBe(415);
    expect(portrait.width).toBe(208);
  });

  it("rejects site plan uploads below 2000px or with extreme panoramic aspect ratios", () => {
    expect(validateSitePlanDimensions(800, 600)).toBe(
      "This image is too small to read at zoom. Please upload a version at least 2000px on the long side.",
    );
    expect(validateSitePlanDimensions(4200, 1000)).toBe(
      "This image's shape doesn't fit a phone screen. Please crop it to a standard festival map shape.",
    );
    expect(validateSitePlanDimensions(1000, 4200)).toContain("shape doesn't fit");
    expect(validateSitePlanDimensions(3000, 2200)).toBeNull();
    expect(validateSitePlanDimensions(6000, 8000)).toBeNull();
  });
});

describe("Event-scoped Intelligence, Onboarding personalisation, Bar Sample Menu & Live GPS", () => {
  it("personalises Home section priority for Music, Friends and Both without hiding sections", () => {
    const music = getPersonalisedHomeOrder("music");
    const friends = getPersonalisedHomeOrder("friends");
    const both = getPersonalisedHomeOrder("both");

    expect(music[0]).toBe("featured");
    expect(friends[0]).toBe("crew");
    expect(both).toHaveLength(4);
    expect(new Set(music)).toEqual(new Set(friends));
  });

  it("selects featured headliners instead of dumping all 25 artists and adapts conference labels", () => {
    const data = getDemoData();
    const featured = selectFeaturedParticipants(data);
    expect(featured.length).toBeGreaterThanOrEqual(1);
    expect(featured.length).toBeLessThanOrEqual(4);
    expect(featured[0]?.id).toBe("shimza");

    const confTerms = getEventCategoryTerms("Conference");
    expect(confTerms.programLabel).toBe("Agenda");
    expect(confTerms.modeMusicLabel).toBe("Sessions");
    expect(confTerms.modeFriendsLabel).toBe("Networking");
    expect(confTerms.entryRulesLabel).toBe("Registration & Access");
  });

  it("flags overlapping slots and duplicate performers in organiser readiness intelligence", () => {
    const issues = analyzeOrganiserEvent({
      name: "Test Event",
      venue: "",
      startDate: "2026-12-28",
      entryRules: "",
      sitePlanPath: "path.webp",
      eventType: "festival",
      zones: [],
      program: [
        {
          title: "Act A",
          place: "Main",
          time: "20:00",
          status: "scheduled",
          featured: false,
          headliner: false,
          featuredOrder: null,
        },
        {
          title: "Act A",
          place: "Main",
          time: "20:00",
          status: "scheduled",
          featured: false,
          headliner: false,
          featuredOrder: null,
        },
      ],
    });
    expect(issues.some((i) => i.id.startsWith("dup-"))).toBe(true);
    expect(issues.some((i) => i.id.startsWith("overlap-"))).toBe(true);
    expect(issues.some((i) => i.id === "missing-venue")).toBe(true);
  });

  it("clearly marks the sample bar drinks menu as sample with unconfirmed prices", () => {
    expect(SAMPLE_BAR_MENU.isSample).toBe(true);
    expect(SAMPLE_BAR_MENU.items.every((item) => item.price === null)).toBe(true);
  });

  it("classifies live GPS freshness, background pause, stale expiry and accuracy honestly", () => {
    const now = Date.now();
    expect(classifyPositionFreshness(now - 5000, "live", now).label).toBe("Live");
    expect(classifyPositionFreshness(now - 60_000, "live", now).label).toBe("Last seen recently");
    expect(classifyPositionFreshness(now - 180_000, "live", now)).toEqual({
      label: "Location outdated",
      isStale: true,
    });
    expect(classifyPositionFreshness(now, "paused_background", now).label).toBe(
      "Sharing paused while backgrounded",
    );
    expect(formatAccuracyBadge(14)).toBe("±14m");
    expect(formatAccuracyBadge(85)).toBe("Approximate (~85m)");

    const end = new Date(now + 4 * 3600_000);
    expect(computeLiveShareExpiry("15m", end, now)).toBe(now + 15 * 60_000);
    expect(computeLiveShareExpiry("until_end", end, now)).toBe(+end);
  });

  it("tags event knowledge facts with Verified/Pending provenance and supports offline local search", () => {
    const data = getDemoData();
    const facts = eventFacts(data);
    expect(facts.find((f) => f.id === "venue")?.status).toBe("verified");
    expect(facts.find((f) => f.id === "venue")?.source).toBe("Namib Rage Events");
    expect(facts.find((f) => f.id === "timetable")?.status).toBe("pending");
    const glassHits = searchLocalFacts(data, "Can I bring glass bottles?");
    expect(glassHits.length).toBeGreaterThan(0);
    expect(glassHits[0]?.text.toLowerCase()).toContain("glass");
  });

  it("persists Global Buddies across events and stores organiser 3-point GPS calibration", () => {
    localStorage.clear();
    const added = addGlobalBuddy({
      name: "Lukas",
      handle: "lukas_na",
      lastEventName: "Sound of Summer",
    });
    expect(added).toHaveLength(1);
    expect(readGlobalBuddies()[0]?.handle).toBe("lukas_na");
    // Deduplicates
    expect(addGlobalBuddy({ name: "Lukas" })).toHaveLength(1);
    const removed = removeGlobalBuddy(added[0]!.id);
    expect(removed).toHaveLength(0);

    const refs = [
      { x: 0, y: 0, lat: -22.8, lng: 14.5 },
      { x: 100, y: 0, lat: -22.8, lng: 14.6 },
      { x: 0, y: 100, lat: -22.9, lng: 14.5 },
    ];
    const transform = computeAffineCalibration(refs)!;
    saveStoredMapCalibration("evt-cal-1", {
      refs,
      transform,
      updatedAt: "2026-11-19T10:00:00Z",
    });
    expect(readStoredMapCalibration("evt-cal-1")?.transform).toEqual(transform);
    saveStoredMapCalibration("evt-cal-1", null);
    expect(readStoredMapCalibration("evt-cal-1")).toBeNull();
  });
});
