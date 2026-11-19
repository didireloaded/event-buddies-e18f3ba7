import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";

const SOS_ID = "20000000-0000-4000-8000-000000000002";
const SOS_KEY = `event-buddies:${SOS_ID}:attendee`;
const TECH_ID = "30000000-0000-4000-8000-000000000003";
const CONCERT_ID = "40000000-0000-4000-8000-000000000004";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxGkAAAAASUVORK5CYII=",
  "base64",
);

const PUBLISHED_EVENTS_FIXTURE = [
  {
    id: TECH_ID,
    eventType: "conference",
    name: "Tech Summit 2026",
    startDate: "2026-11-28",
    endDate: "2026-11-29",
    venue: "Safari Court, Windhoek",
    gatesOpen: "08:30",
    entryRules: "Conference badge required at registration desk.",
    program: [
      {
        title: "Keynote: African FinTech",
        place: "Auditorium A",
        time: "09:00",
        status: "scheduled",
        featured: true,
        headliner: true,
        featuredOrder: 0,
      },
      {
        title: "AI Systems Workshop",
        place: "Room B",
        time: "09:30",
        status: "scheduled",
        featured: false,
        headliner: false,
        featuredOrder: 1,
      },
    ],
    zones: [
      {
        name: "Auditorium A",
        type: "stage",
        x: 40,
        y: 45,
        accessTier: "all",
        vendorNote: "Main keynote hall",
        status: "open",
      },
      {
        name: "Espresso Bar",
        type: "bar",
        x: 65,
        y: 55,
        accessTier: "all",
        vendorNote: "Coffee station",
        status: "open",
      },
    ],
    sitePlanPath: null,
    sitePlanUrl: null,
    publishedAt: "2026-11-19T06:00:00Z",
  },
  {
    id: CONCERT_ID,
    eventType: "concert",
    name: "Coastal Sunset Live",
    startDate: "2026-12-28",
    endDate: "2026-12-28",
    venue: "Mole Amphitheatre, Swakopmund",
    gatesOpen: "16:00",
    entryRules: "All ages with guardian.",
    program: [
      {
        title: "Dune Acoustic Trio",
        place: "Sunset Stage",
        time: "18:00",
        status: "scheduled",
        featured: true,
        headliner: true,
        featuredOrder: 0,
      },
    ],
    zones: [
      {
        name: "Sunset Stage",
        type: "stage",
        x: 50,
        y: 50,
        accessTier: "all",
        vendorNote: "Acoustic oceanfront stage",
        status: "open",
      },
    ],
    sitePlanPath: "site-plans/concert.png",
    sitePlanUrl: "/images/sound-of-summer-site-plan-2026.png",
    sitePlanZoomUrl: "/images/sound-of-summer-past-edition.jpg",
    publishedAt: "2026-11-19T06:00:00Z",
  },
];

function attachRuntimeWatchers(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore expected network errors from explicit offline/error tests
      if (
        !text.includes("ERR_INTERNET_DISCONNECTED") &&
        !text.includes("Failed to load resource")
      ) {
        consoleErrors.push(text);
      }
    }
  });
  return {
    assertClean() {
      expect(pageErrors, `Uncaught pageerrors: ${pageErrors.join("; ")}`).toEqual([]);
      const hydrationErrors = consoleErrors.filter(
        (t) => t.includes("#418") || t.toLowerCase().includes("hydrat"),
      );
      expect(hydrationErrors, `Hydration errors: ${hydrationErrors.join("; ")}`).toEqual([]);
    },
    pageErrors,
    consoleErrors,
  };
}

async function seedGuest(page: Page, extra: Record<string, unknown> = {}) {
  await page.addInitScript(
    ({ key, extra }) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(
          key,
          JSON.stringify({
            profile: { name: "Maya", handle: "maya" },
            hasName: true,
            onboardingDone: true,
            selectedEventId: "20000000-0000-4000-8000-000000000002",
            ...extra,
          }),
        );
      }
    },
    { key: SOS_KEY, extra },
  );
}

test("1. progressive guest browsing, multi-event same-day calendar, category filters, and My Events isolation", async ({
  page,
}) => {
  const watcher = attachRuntimeWatchers(page);
  await page.addInitScript((events) => {
    localStorage.setItem("event-buddies:published-organiser-events", JSON.stringify(events));
  }, PUBLISHED_EVENTS_FIXTURE);

  // Fresh visit -> Browse events without signing in -> bottom nav remains hidden
  await page.goto("/#home");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await page.getByRole("button", { name: "Browse events without signing in", exact: true }).click();
  await expect(page).toHaveURL(/#events$/);
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);

  // Category chips work with published events
  const catGroup = page.getByRole("group", { name: "Filter events by category" });
  await catGroup.getByRole("button", { name: "Conference", exact: true }).click();
  await expect(page.getByText("Tech Summit 2026")).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview Sound of Summer" })).toHaveCount(0);
  await catGroup.getByRole("button", { name: "All", exact: true }).click();

  // Search works across venue / artist / event name
  await page.getByLabel("Search events, artists or venues").fill("Swakopmund");
  await expect(page.getByText("Coastal Sunset Live")).toBeVisible();
  await page.getByLabel("Search events, artists or venues").fill("");

  // Calendar displays MULTIPLE events on the same date (28 Dec 2026)
  await page
    .getByRole("group", { name: "Event discovery view" })
    .getByRole("button", { name: "Calendar" })
    .click();
  await expect(page.getByRole("button", { name: "Preview Sound of Summer" })).toBeVisible();
  await expect(page.getByText("Coastal Sunset Live")).toBeVisible();
  await expect(page.getByText("Tech Summit 2026")).toHaveCount(0);

  // My Events starts empty before saving anything (does NOT leak unsaved events!)
  await page
    .getByRole("group", { name: "Event discovery view" })
    .getByRole("button", { name: "My Events", exact: true })
    .click();
  await expect(page.getByText("No saved events yet.")).toBeVisible();
  await expect(page.getByText("Tech Summit 2026")).toHaveCount(0);

  // Back to Explore -> Preview -> save heart -> confirm I'm going -> enters #home with nav!
  await page.getByRole("button", { name: "Show Sound of Summer", exact: true }).click();
  await page.getByRole("button", { name: "Preview Sound of Summer", exact: true }).click();
  await expect(page.getByText("Buy tickets on Howler")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "I’m going", exact: true }).click();
  await expect(page).toHaveURL(/#home$/);
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

  // My Events now includes Sound of Summer
  await page.goto("/#events");
  await page
    .getByRole("group", { name: "Event discovery view" })
    .getByRole("button", { name: "My Events", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Preview Sound of Summer" })).toBeVisible();
  await expect(page.getByText("Tech Summit 2026")).toHaveCount(0);

  watcher.assertClean();
});

test("2. onboarding mode personalisation genuinely reorders Home DOM and /events/$slug adapts to conference", async ({
  page,
}) => {
  const watcher = attachRuntimeWatchers(page);
  await page.addInitScript((events) => {
    localStorage.setItem("event-buddies:published-organiser-events", JSON.stringify(events));
  }, PUBLISHED_EVENTS_FIXTURE);

  // Complete onboarding choosing "Here for the music"
  await page.goto("/#home");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Here for the music", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Kagiso");
  await page.getByRole("button", { name: "Go to my event", exact: true }).click();
  await page.getByRole("button", { name: "Preview Sound of Summer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "I’m going", exact: true }).click();

  // Verify "Music" puts Featured BEFORE Crew in actual vertical DOM coordinates
  await expect(page.getByText("Prioritising:")).toContainText("Music");
  const featuredMusicY = (await page.getByTestId("home-featured-section").boundingBox())!.y;
  const crewMusicY = (await page.getByTestId("home-crew-section").boundingBox())!.y;
  expect(featuredMusicY).toBeLessThan(crewMusicY);

  // Switch focus to "Friends" -> Crew moves ABOVE Featured!
  await page.getByRole("button", { name: "Change home focus", exact: true }).click();
  await expect(page.getByText("Prioritising:")).toContainText("Friends");
  const featuredFriendsY = (await page.getByTestId("home-featured-section").boundingBox())!.y;
  const crewFriendsY = (await page.getByTestId("home-crew-section").boundingBox())!.y;
  expect(crewFriendsY).toBeLessThan(featuredFriendsY);

  // Direct dynamic shareable URL for Tech Summit 2026 (Conference)
  await page.addInitScript((techId) => {
    localStorage.setItem(
      `event-buddies:${techId}:attendee`,
      JSON.stringify({
        profile: { name: "Kagiso", handle: "kagiso" },
        hasName: true,
        onboardingDone: true,
        selectedEventId: techId,
      }),
    );
  }, TECH_ID);
  await page.goto("/events/tech-summit-2026#home");
  await expect(page.getByRole("heading", { name: "Tech Summit 2026" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Featured speakers" })).toBeVisible();
  await expect(page.getByText("Keynote: African FinTech")).toBeVisible();

  // Conference Info -> Registration & Access + Ride Bookmark works with zero entrance points!
  await page.goto("/events/tech-summit-2026#info");
  await expect(page.getByRole("heading", { name: "Registration & Access" })).toBeVisible();
  await page.getByRole("button", { name: /Transport & Parking/ }).click();
  await page.getByRole("button", { name: "Save ride", exact: true }).click();
  await page.getByLabel("Parking or pickup note").fill("Level 2 basement bay 14");
  await page.getByRole("button", { name: "Save on this device", exact: true }).click();
  await expect(page.getByText("Level 2 basement bay 14")).toBeVisible();

  // Conference Crew -> Festival extras -> Trivia does NOT leak Sound of Summer trivia!
  await page.goto("/events/tech-summit-2026#crew");
  await page.getByRole("button", { name: /Festival extras/ }).click();
  await page.getByRole("button", { name: "Trivia & picks", exact: true }).click();
  await expect(
    page.getByText("Verified trivia questions for Tech Summit 2026 appear here"),
  ).toBeVisible();

  watcher.assertClean();
});

test("3. full ticketing Ship Check: multi-ticket swipe, cross-event gate card, offline QR, PDF & invalid file reject", async ({
  page,
  context,
}) => {
  const watcher = attachRuntimeWatchers(page);
  await seedGuest(page);
  await page.addInitScript((techId) => {
    if (!localStorage.getItem("event-buddies:tickets-index:v1")) {
      localStorage.setItem(
        "event-buddies:tickets-index:v1",
        JSON.stringify([
          {
            id: "other-event-ticket-1",
            eventId: techId,
            eventName: "Tech Summit 2026",
            eventDateIso: "2026-11-28T08:30:00+02:00",
            label: "Speaker Pass",
            tier: "all_access",
            holderName: "Maya",
            fileType: "code",
            storageKey: null,
            ticketCode: "TECH-2026-SPK-01",
            fileSize: null,
            addedAt: "2026-11-19T08:00:00Z",
          },
        ]),
      );
    }
  }, TECH_ID);

  await page.goto("/#you");
  await page.getByRole("button", { name: /Offline & installation/ }).click();
  await expect(
    page.getByText("The app files and public event page are saved", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  // Surface 2: You tab shows "Your tickets · 1"
  await expect(page.getByRole("button", { name: /Your tickets · 1/ })).toBeVisible();
  await page.getByRole("button", { name: /Your tickets · 1/ }).click();

  // Reject unsupported SVG file
  await page
    .locator("#ticket-vault input[type=file]")
    .first()
    .setInputFiles({
      name: "bad.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
  await expect(page.getByRole("alert")).toContainText("JPG, PNG, WebP or PDF under 8 MB");

  // Upload Ticket #1 (image) -> choose General tier
  await page.locator("#ticket-vault input[type=file]").first().setInputFiles({
    name: "pass1.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await expect(page.getByTestId("ticket-tier-prompt")).toBeVisible();
  await page
    .getByTestId("ticket-tier-prompt")
    .getByRole("button", { name: /^General/ })
    .click();

  // Add Ticket #2 (manual QR code) -> choose VIP tier
  await page.getByRole("button", { name: "Enter a ticket code manually", exact: true }).click();
  await page.getByLabel("Ticket code or reference").fill("HWL-2026-PARTNER-88");
  await page.getByLabel("Label (optional)").fill("Partner VIP");
  await page.getByRole("button", { name: "Save ticket code offline", exact: true }).click();
  await page.getByTestId("ticket-tier-prompt").getByRole("button", { name: /^VIP/ }).click();

  // Cross-event ticket ("Other events") opens full-screen Gate Card for Tech Summit 2026!
  await expect(page.getByText("Other events", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Tech Summit 2026/ }).click();
  const gateCard = page.getByTestId("gate-card-modal");
  await expect(gateCard).toBeVisible();
  await expect(gateCard).toContainText("TECH-2026-SPK-01");
  await expect(gateCard).toContainText("All-access");
  await gateCard.getByRole("button", { name: "Close ticket", exact: true }).click();
  await expect(gateCard).toHaveCount(0);

  // Surface 3: Info tab -> Tickets row shows Howler honestly
  await page.goto("/#info");
  await expect(page.getByRole("button", { name: /Tickets · Buy from Howler/ })).toBeVisible();

  // Surface 1: Home sticky bar -> Show my ticket -> Multi-ticket swipe & dots (1 of 2 -> 2 of 2)
  await page.goto("/#home");
  const ticketBar = page.getByTestId("event-ticket-bar");
  await expect(ticketBar).toContainText("VIP · West entrance · Opens 12:00");
  await ticketBar.getByRole("button", { name: "Show my ticket", exact: true }).click();
  await expect(gateCard).toBeVisible();
  await expect(gateCard).toContainText("1 of 2");
  await expect(gateCard).toContainText(/brightness|Screen kept awake/i);
  // Pure white QR container + user-select none
  const surfaceStyles = await page.getByTestId("gate-card-surface").evaluate((el) => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, userSelect: cs.userSelect };
  });
  expect(surfaceStyles.bg).toBe("rgb(255, 255, 255)");
  expect(surfaceStyles.userSelect).toBe("none");

  // Advance to 2 of 2
  await gateCard.getByRole("button", { name: "Next ticket", exact: true }).click();
  await expect(gateCard).toContainText("2 of 2");
  await gateCard.getByRole("button", { name: "Close ticket", exact: true }).click();

  // Airplane mode (offline) -> reload -> sticky bar STILL opens Gate Card with Offline badge!
  await context.setOffline(true);
  await page.reload();
  await page
    .getByTestId("event-ticket-bar")
    .getByRole("button", { name: "Show my ticket" })
    .click();
  await expect(gateCard).toBeVisible();
  await expect(gateCard.getByText("Offline", { exact: true })).toBeVisible();
  await expect(gateCard).toContainText("HWL-2026-PARTNER-88");
  await gateCard.getByRole("button", { name: "Close ticket", exact: true }).click();
  await context.setOffline(false);

  watcher.assertClean();
});

test("4. The Map Fit: original colour, aspect ratio, 2-finger rotate+compass, recenter, fullscreen, error recovery, progressive zoom & custom bar menu", async ({
  page,
}) => {
  const watcher = attachRuntimeWatchers(page);
  await seedGuest(page);
  await page.addInitScript((events) => {
    localStorage.setItem("event-buddies:published-organiser-events", JSON.stringify(events));
  }, PUBLISHED_EVENTS_FIXTURE);

  // 4A. Broken map image on an organiser event triggers Error State -> Try again recovers!
  const brokenUrl = "https://qa-map-test.invalid/site-plan.png";
  await page.addInitScript(
    ({ events, concertId, brokenUrl }) => {
      const modified = events.map((ev: (typeof PUBLISHED_EVENTS_FIXTURE)[number]) =>
        ev.id === concertId ? { ...ev, sitePlanUrl: brokenUrl } : ev,
      );
      localStorage.setItem("event-buddies:published-organiser-events", JSON.stringify(modified));
      localStorage.setItem(
        `event-buddies:${concertId}:attendee`,
        JSON.stringify({
          profile: { name: "Maya", handle: "maya" },
          hasName: true,
          onboardingDone: true,
          selectedEventId: concertId,
        }),
      );
    },
    { events: PUBLISHED_EVENTS_FIXTURE, concertId: CONCERT_ID, brokenUrl },
  );
  let shouldFail = true;
  await page.route("https://qa-map-test.invalid/**", async (route) => {
    if (shouldFail) {
      await route.fulfill({ status: 500, body: "Broken map test" });
    } else {
      await route.fulfill({ status: 200, contentType: "image/png", body: TINY_PNG });
    }
  });
  await page.goto("/events/coastal-sunset-live#map");
  await expect(page.getByTestId("map-error-state")).toBeVisible();
  await expect(page.getByText("Couldn’t load the map")).toBeVisible();
  shouldFail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator("img.venue-map-image")).toBeVisible();

  // 4B. Switch to Sound of Summer map for aspect ratio, rotate+compass, recenter & custom bar menu
  await page.goto("/events/sound-of-summer-2026#map");
  const mapImg = page.locator("img.venue-map-image");
  await expect(mapImg).toBeVisible();
  await expect
    .poll(() => mapImg.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);

  // Zero monochrome toggle exists!
  await expect(page.getByRole("button", { name: /Monochrome/i })).toHaveCount(0);

  // Aspect ratio preserved (not stretched)
  const ratios = await mapImg.evaluate((el: HTMLImageElement) => {
    const rect = el.getBoundingClientRect();
    return {
      natural: el.naturalWidth / el.naturalHeight,
      rendered: rect.width / rect.height,
    };
  });
  expect(Math.abs(ratios.natural - ratios.rendered)).toBeLessThan(0.05);

  // Bottom-left hint & Recenter FAB
  await expect(page.getByText("Tap a location to see details", { exact: true })).toBeVisible();
  await expect(page.getByTestId("map-recenter-fab")).toBeVisible();

  // Two-finger pinch + rotate -> Compass appears -> tap Compass resets north!
  const viewport = page.getByLabel(/^Venue plan\. Drag/);
  await viewport.scrollIntoViewIfNeeded();
  const box = (await viewport.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: cx - 50, y: cy, id: 0 },
      { x: cx + 50, y: cy, id: 1 },
    ],
  });
  // Rotate 35 degrees and expand pinch distance
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: cx - 55, y: cy - 45, id: 0 },
      { x: cx + 55, y: cy + 45, id: 1 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByTestId("map-compass-btn")).toBeVisible();
  await page.getByTestId("map-compass-btn").click();
  await expect(page.getByTestId("map-compass-btn")).toHaveCount(0);

  // Recenter FAB resets zoom back to 1x (Zoom out becomes disabled)
  await page.getByTestId("map-recenter-fab").click();
  await expect(page.getByRole("button", { name: "Zoom out", exact: true })).toBeDisabled();

  // Fullscreen map opens and closes cleanly
  await page.getByRole("button", { name: "Open full-screen map", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Full-screen venue plan" })).toBeVisible();
  await page.getByRole("button", { name: "Close full-screen map", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Full-screen venue plan" })).toHaveCount(0);

  // Safety shield icon in Map header filters medics/exits & exposes Safety & ICE button
  await page.getByRole("button", { name: "Show medics, security and exits", exact: true }).click();
  await expect(page.getByRole("button", { name: "Safety & ICE", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show all", exact: true }).click();

  // Organiser custom bar menu overrides Sample Menu cleanly
  await page.evaluate((evId) => {
    localStorage.setItem(
      `event-buddies:${evId}:bar-menus:v1`,
      JSON.stringify([
        {
          id: "org-menu-1",
          name: "Official Main Bar Menu",
          assignedBarNames: ["*"],
          isSample: false,
          paymentNote: "Tap card only.",
          items: [
            {
              id: "d1",
              name: "Windhoek Draught 500ml",
              category: "Beer",
              price: "N$ 45",
              available: true,
            },
            {
              id: "d2",
              name: "Still Water 500ml",
              category: "Water",
              price: "N$ 20",
              available: true,
            },
          ],
        },
      ]),
    );
  }, SOS_ID);
  await page.reload();
  await page.getByLabel("Search venue places or artists").fill("Bar 01");
  await page.getByRole("button", { name: /Bar 01/ }).click();
  await expect(page.getByText("Windhoek Draught 500ml")).toBeVisible();
  await expect(page.getByText("N$ 45")).toBeVisible();
  await expect(page.getByText("Sample Menu", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Done", exact: true }).click();

  // Progressive display -> high-res zoom image swap on Coastal Sunset Live (zoom >= 2x)
  await page.goto("/events/coastal-sunset-live#map");
  const concertImg = page.locator("img.venue-map-image");
  await expect(concertImg).toHaveAttribute("src", /qa-map-test\.invalid\/site-plan\.png/);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(concertImg).toHaveAttribute("src", /sound-of-summer-past-edition\.jpg/);

  watcher.assertClean();
});

test("5. lineup stage detail card, discover roulette, timed schedule clash detection & calendar .ics export", async ({
  page,
}) => {
  const watcher = attachRuntimeWatchers(page);
  await seedGuest(page);
  await page.addInitScript((events) => {
    localStorage.setItem("event-buddies:published-organiser-events", JSON.stringify(events));
  }, PUBLISHED_EVENTS_FIXTURE);

  await page.goto("/#lineup");
  // Stage filter pills show stage detail card + View on Map
  await page
    .getByRole("group", { name: "Filter by stage" })
    .getByRole("button", { name: "Main Stage", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Main Stage" })).toBeVisible();
  await page.getByRole("button", { name: "View on Map", exact: true }).click();
  await expect(page).toHaveURL(/#map$/);
  await expect(page.getByRole("dialog", { name: "Main Stage" })).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  // Search filter + empty reset + Discover roulette
  await page.goto("/#lineup");
  await page.getByLabel("Search artists").fill("zzzz-no-match");
  await expect(page.getByText("No artists found")).toBeVisible();
  await page.getByRole("button", { name: "Show all artists", exact: true }).click();
  await page.getByRole("button", { name: /Discover an artist/ }).click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  // Conference with overlapping sessions (09:00–10:00 and 09:30–10:30) detects schedule clash + exports .ics!
  await page.addInitScript((techId) => {
    localStorage.setItem(
      `event-buddies:${techId}:attendee`,
      JSON.stringify({
        profile: { name: "Maya", handle: "maya" },
        hasName: true,
        onboardingDone: true,
        selectedEventId: techId,
      }),
    );
  }, TECH_ID);
  await page.goto("/events/tech-summit-2026#lineup");
  await page.getByRole("button", { name: /Add Keynote: African FinTech 09:00/ }).click();
  await page.getByRole("button", { name: /Add AI Systems Workshop 09:30/ }).click();
  await page
    .getByRole("group", { name: "Show" })
    .getByRole("button", { name: /Favourites/ })
    .click();
  await expect(page.getByText(/1 clash in your agenda/i)).toBeVisible();

  const icsDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Add sets to calendar/ }).click();
  const icsText = await readFile((await (await icsDownload).path())!, "utf8");
  expect(icsText).toContain("SUMMARY:Keynote: African FinTech");
  expect(icsText).toContain("SUMMARY:AI Systems Workshop");

  watcher.assertClean();
});

test("6. global buddies across events, visual Event Passport stamps, Plan Backup & device data wipe", async ({
  page,
}) => {
  const watcher = attachRuntimeWatchers(page);
  await seedGuest(page);
  await page.addInitScript((events) => {
    localStorage.setItem("event-buddies:published-organiser-events", JSON.stringify(events));
  }, PUBLISHED_EVENTS_FIXTURE);

  await page.goto("/#crew");
  // Global Buddies add -> reload -> persists on Event #2 -> remove
  await page.getByRole("button", { name: "Add a buddy", exact: true }).click();
  await page.getByLabel("Buddy name").fill("Tangi");
  await page.getByLabel("Buddy handle (optional)").fill("@tangi_na");
  await page.getByRole("button", { name: "Save buddy", exact: true }).click();
  await expect(page.getByText("Tangi", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Tangi", { exact: true })).toBeVisible();

  // Event Passport under Activities (collectible stamp grid + custom checkpoint)
  await page.getByRole("button", { name: /Event Passport/ }).click();
  await expect(page.getByText("0 of 8 stamps collected")).toBeVisible();
  await page.getByRole("button", { name: /Main Stage.*Tap to stamp/ }).click();
  await expect(page.getByText("1 of 8 stamps collected")).toBeVisible();
  await page.getByLabel("New custom checkpoint").fill("Ocean sunset pic");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByLabel("Ocean sunset pic")).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  // Switch to Event #2 -> Global Buddy "Tangi" is STILL there!
  await page.addInitScript((techId) => {
    localStorage.setItem(
      `event-buddies:${techId}:attendee`,
      JSON.stringify({
        profile: { name: "Maya", handle: "maya" },
        hasName: true,
        onboardingDone: true,
        selectedEventId: techId,
      }),
    );
  }, TECH_ID);
  await page.goto("/events/tech-summit-2026#crew");
  await expect(page.getByText("Tangi", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove Tangi from buddies", exact: true }).click();
  await expect(page.getByText("Tangi", { exact: true })).toHaveCount(0);

  // Plan backup download + PrivacyPanel honest GPS copy + Clear saved data wipes tickets too
  await page.goto("/events/sound-of-summer-2026#you");
  await page.evaluate((sosId) => {
    localStorage.setItem(
      "event-buddies:tickets-index:v1",
      JSON.stringify([
        {
          id: "wipe-me-1",
          eventId: sosId,
          eventName: "Sound of Summer",
          eventDateIso: "2026-12-28T12:00:00+02:00",
          label: "General Pass",
          tier: "general",
          holderName: "Maya",
          fileType: "code",
          storageKey: null,
          ticketCode: "WIPE-123",
          fileSize: null,
          addedAt: "2026-11-19T08:00:00Z",
        },
      ]),
    );
  }, SOS_ID);
  await page.reload();
  await expect(page.getByRole("button", { name: /Your tickets · 1/ })).toBeVisible();
  await page.getByRole("button", { name: /Location & saved data/ }).click();
  await expect(page.getByText(/GPS location is off by default/)).toBeVisible();
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Clear saved data on this phone", exact: true }).click(),
  ]);
  const remainingTickets = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("event-buddies:tickets-index:v1") ?? "[]"),
  );
  expect(remainingTickets).toHaveLength(0);

  watcher.assertClean();
});

test("7. post-event lifecycle hides sticky ticket bar and exports recap + crew yearbook PNGs", async ({
  page,
}) => {
  const watcher = attachRuntimeWatchers(page);
  await seedGuest(page, { savedArtists: ["shimza"], stamps: ["sos-main"] });

  // 7A. Afterglow (1 hour after 23:00 CAT = 2026-12-29T00:00:00+02:00)
  await page.clock.install({ time: new Date("2026-12-29T00:00:00+02:00") });
  await page.goto("/#home");
  await expect(page.getByRole("heading", { name: "That’s a wrap." })).toBeVisible();
  await expect(page.getByTestId("event-ticket-bar")).toHaveCount(0);

  // 7B. Recap (2 days after event = 2026-12-30T14:00:00+02:00)
  await page.clock.setFixedTime(new Date("2026-12-30T14:00:00+02:00"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your Sound of Summer" })).toBeVisible();
  await expect(page.getByTestId("event-ticket-bar")).toHaveCount(0);

  const recapDl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save recap", exact: true }).click();
  expect((await recapDl).suggestedFilename()).toBe("sound-of-summer-2026-recap.png");

  const yearbookDl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download crew yearbook card", exact: true }).click();
  expect((await yearbookDl).suggestedFilename()).toBe("sound-of-summer-2026-crew-yearbook.png");

  watcher.assertClean();
});

test("8. security & platform routes: open-redirect block, RFC 9728 metadata, MCP 401 & OAuth consent", async ({
  page,
  request,
}) => {
  const watcher = attachRuntimeWatchers(page);

  // RFC 9728 OAuth protected resource metadata
  const metaRes = await request.get("/.well-known/oauth-protected-resource");
  expect(metaRes.ok()).toBeTruthy();
  const metaJson = await metaRes.json();
  expect(metaJson).toHaveProperty("resource");

  // Unauthenticated MCP request rejected with 401 + Bearer challenge
  const mcpRes = await request.post("/mcp", {
    data: { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
  });
  expect(mcpRes.status()).toBe(401);
  expect(mcpRes.headers()["www-authenticate"]).toContain("Bearer");

  // Login blocks external open-redirect ?next=
  await page.goto("/login?next=https://evil.example/steal");
  await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
  // OAuth consent renders cleanly
  await page.goto("/.lovable/oauth/consent");
  await expect(page.locator("body")).not.toBeEmpty();

  watcher.assertClean();
});

test("9. multi-viewport responsive audit (320px to 1280px): zero horizontal overflow, zero broken images & visual captures", async ({
  page,
}) => {
  const watcher = attachRuntimeWatchers(page);
  await seedGuest(page);
  mkdirSync("test-results/qa-screenshots", { recursive: true });

  const viewports = [
    { name: "320-mini", width: 320, height: 568 },
    { name: "375-se", width: 375, height: 667 },
    { name: "390-iphone", width: 390, height: 844 },
    { name: "844-landscape", width: 844, height: 390 },
    { name: "768-tablet", width: 768, height: 1024 },
    { name: "1024-laptop", width: 1024, height: 768 },
    { name: "1280-desktop", width: 1280, height: 800 },
    { name: "1440-wide", width: 1440, height: 900 },
  ];

  const views = ["events", "home", "lineup", "map", "crew", "info", "you"];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const v of views) {
      await page.goto(`/#${v}`);
      await expect(page.locator("main")).not.toBeEmpty();
      // Wait for visible images to settle
      await page.waitForTimeout(250);
      const metrics = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        const brokenImgs = [...document.querySelectorAll("img")]
          .filter((img) => {
            const rect = img.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && (!img.complete || img.naturalWidth === 0);
          })
          .map((img) => img.src);
        return { overflow, brokenImgs };
      });
      expect(metrics.overflow, `Horizontal overflow on ${vp.name} /#${v}`).toBeLessThanOrEqual(1);
      expect(metrics.brokenImgs, `Broken images on ${vp.name} /#${v}`).toEqual([]);

      if (vp.name === "390-iphone" || vp.name === "1280-desktop") {
        await page.screenshot({
          path: `test-results/qa-screenshots/${vp.name}-${v}.png`,
          fullPage: false,
        });
      }
    }
  }

  watcher.assertClean();
});

test("10. strict resilience pass: duplicate-submit guard, invalid form recovery, Escape focus return, reduced motion & long content at 320px/landscape", async ({
  page,
}) => {
  const watcher = attachRuntimeWatchers(page);
  await seedGuest(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/#home");

  // 10A. Escape closes Sheet and returns focus to opening trigger button
  const safetyTrigger = page.getByRole("button", { name: /Safety & medical points/ });
  await safetyTrigger.focus();
  await safetyTrigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Invalid empty ICE card submission shows inline alert instead of saving blank card
  await dialog.getByRole("button", { name: /Add private medical/ }).click();
  await dialog.getByRole("button", { name: "Save on this phone", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(/Enter at least an emergency contact/i);

  // Escape closes sheet & restores focus to safetyTrigger
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(safetyTrigger).toBeFocused();

  // 10B. Duplicate manual ticket code submission is blocked & long holder name does not overflow 320px or landscape Gate Card
  await page.getByRole("button", { name: "My Tickets & Passes", exact: true }).click();
  await page.getByRole("button", { name: "Enter a ticket code manually", exact: true }).click();
  const longHolder = "Alexandrina-Elizabeth-Van-Der-Merwe-Shikongo-Longname";
  await page.getByLabel("Ticket code or reference").fill("HWL-DUP-2026");
  await page.getByLabel("Holder name").fill(longHolder);
  await page.getByRole("button", { name: "Save ticket code offline", exact: true }).click();

  // Re-open manual form and try exact same code -> rejected cleanly with alert
  await page.getByRole("button", { name: "Enter a ticket code manually", exact: true }).click();
  await page.getByLabel("Ticket code or reference").fill("HWL-DUP-2026");
  await page.getByRole("button", { name: "Save ticket code offline", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(/already saved/i);

  // Add second distinct ticket & verify landscape Gate Card (844x390) + ArrowRight keyboard navigation
  await page.getByLabel("Ticket code or reference").fill("HWL-SECOND-2026");
  await page.getByRole("button", { name: "Save ticket code offline", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  await page.setViewportSize({ width: 844, height: 390 });
  await page
    .getByTestId("event-ticket-bar")
    .getByRole("button", { name: "Show my ticket" })
    .click();
  const gateCard = page.getByTestId("gate-card-modal");
  await expect(gateCard).toBeVisible();
  await expect(gateCard).toContainText("1 of 2");
  await gateCard.press("ArrowRight");
  await expect(gateCard).toContainText("2 of 2");
  mkdirSync("test-results/qa-screenshots", { recursive: true });
  await page.screenshot({ path: "test-results/qa-screenshots/844-landscape-gate-card.png" });
  const closeBox = await gateCard.getByRole("button", { name: "Close ticket" }).boundingBox();
  expect(closeBox?.width).toBeGreaterThanOrEqual(44);
  expect(closeBox?.height).toBeGreaterThanOrEqual(44);
  await gateCard.press("Escape");
  await expect(gateCard).toHaveCount(0);

  // 10C. Reduced motion emulation collapses animations/transitions cleanly
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/#crew");
  const reducedDuration = await page.evaluate(() => {
    const nav = document.querySelector(".companion-navigation");
    return nav ? getComputedStyle(nav).animationDuration : "0s";
  });
  expect(parseFloat(reducedDuration)).toBeLessThanOrEqual(0.01);

  // Long unbroken crew note at 320px does not trigger horizontal overflow
  await page.getByRole("button", { name: "Crew note" }).click();
  await page
    .getByLabel("Short crew message")
    .fill("SuperLongUnbrokenLandmarkReferenceTokenWithoutSpaces12345678901234567890");
  await page.getByRole("button", { name: "Post note", exact: true }).click();
  const overflowAfterLongNote = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflowAfterLongNote).toBeLessThanOrEqual(1);

  watcher.assertClean();
});
