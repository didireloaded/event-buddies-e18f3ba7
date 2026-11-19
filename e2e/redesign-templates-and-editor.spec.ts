import { test, expect, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { buildDefaultTemplateConfig } from "../src/lib/templates/event-templates";

const envSource = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const supabaseUrl =
  process.env["VITE_SUPABASE_URL"] ?? envSource.match(/VITE_SUPABASE_URL="([^"]+)"/)?.[1];

const SOS_ID = "20000000-0000-4000-8000-000000000002";
const USER_ID = "d1111111-1111-4111-8111-111111111111";
const SHOT_DIR = "test-results/redesign-qa";

function buildMockJwt(userId: string) {
  return [
    { alg: "HS256", typ: "JWT" },
    { sub: userId, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 },
    "qa-sig",
  ]
    .map((v) => (typeof v === "string" ? v : Buffer.from(JSON.stringify(v)).toString("base64url")))
    .join(".");
}

function buildMockUser() {
  return {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "qa-studio@example.invalid",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
}

async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("multi-event visual separation & all 5 layout families (Discover, Festival, Conference, Private Party, Sports, Market)", async ({
  page,
}) => {
  mkdirSync(SHOT_DIR, { recursive: true });
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  const confTemplate = buildDefaultTemplateConfig("conference_summit");
  const privateTemplate = {
    ...buildDefaultTemplateConfig("private_celebration"),
    tagline: "Sunset dinner & vinyl listening on the rooftop",
    rsvpNote: "Smart casual · rooftop doors open at 19:00",
  };
  const sportsTemplate = {
    ...buildDefaultTemplateConfig("sports_event"),
    tagline: "Coastal Sevens Championship · Finals Day",
  };
  const marketTemplate = {
    ...buildDefaultTemplateConfig("food_lifestyle_market"),
    tagline: "25 coastal artisans, roasters & local kitchens",
  };

  const seededEvents = [
    {
      id: "e-conf-2026",
      eventType: "conference",
      name: "Windhoek Digital Summit 2026",
      startDate: "2026-12-10",
      endDate: "2026-12-11",
      venue: "Safari Court Conference Centre, Windhoek",
      gatesOpen: "08:30",
      entryRules: "Check in at the main foyer desk with your QR badge.",
      program: [
        {
          title: "Dr. Selma Amupolo — Opening Keynote: Namibia Cloud 2030",
          place: "Plenary Hall A",
          time: "09:00",
          status: "scheduled",
          headliner: true,
          featured: true,
        },
        {
          title: "Fintech & Mobile Payments Panel",
          place: "Room B",
          time: "11:15",
          status: "scheduled",
          featured: true,
        },
        {
          title: "Design Systems Workshop",
          place: "Studio C",
          time: "14:00",
          status: "scheduled",
        },
      ],
      zones: [
        {
          name: "Plenary Hall A",
          type: "stage",
          x: 34,
          y: 42,
          accessTier: "all",
          vendorNote: "Keynotes & live captioning",
          status: "open",
        },
        {
          name: "Registration Desk",
          type: "gate",
          x: 50,
          y: 80,
          accessTier: "all",
          vendorNote: "Badge printing & lanyards",
          status: "open",
        },
      ],
      sitePlanPath: null,
      sitePlanUrl: null,
      templateConfig: confTemplate,
      visibility: "public",
      publishedAt: "2026-11-18T09:00:00Z",
    },
    {
      id: "e-priv-2026",
      eventType: "private",
      name: "Selmas 30th Rooftop Dinner",
      startDate: "2026-12-18",
      endDate: "2026-12-18",
      venue: "The Skybar Terrace, Windhoek",
      gatesOpen: "19:00",
      entryRules: "Private guest list only.",
      program: [
        {
          title: "Welcome Cocktails & Vinyl Set",
          place: "North Terrace",
          time: "19:30",
          status: "scheduled",
          featured: true,
        },
        {
          title: "Long-Table Dinner & Toasts",
          place: "Conservatory",
          time: "20:30",
          status: "scheduled",
          featured: true,
        },
      ],
      zones: [
        {
          name: "North Terrace",
          type: "stage",
          x: 45,
          y: 40,
          accessTier: "all",
          vendorNote: "Sunset drinks",
          status: "open",
        },
      ],
      sitePlanPath: null,
      sitePlanUrl: null,
      templateConfig: privateTemplate,
      visibility: "private_invite",
      publishedAt: "2026-11-18T10:00:00Z",
    },
    {
      id: "e-sport-2026",
      eventType: "sports",
      name: "Namibia Coastal Sevens Finals",
      startDate: "2026-12-22",
      endDate: "2026-12-22",
      venue: "Vineta Stadium, Swakopmund",
      gatesOpen: "11:00",
      entryRules: "No glass bottles inside stadium stands.",
      program: [
        {
          title: "Coastal Sharks vs Desert Lions",
          place: "Main Pitch",
          time: "14:00",
          status: "scheduled",
          headliner: true,
          featured: true,
        },
        {
          title: "Windhoek Wanderers vs Walvis Bay XV",
          place: "Main Pitch",
          time: "16:30",
          status: "scheduled",
          featured: true,
        },
      ],
      zones: [
        {
          name: "Main Pitch",
          type: "stage",
          x: 50,
          y: 50,
          accessTier: "all",
          vendorNote: "East & West grandstands",
          status: "open",
        },
      ],
      sitePlanPath: null,
      sitePlanUrl: null,
      templateConfig: sportsTemplate,
      visibility: "public",
      publishedAt: "2026-11-18T11:00:00Z",
    },
    {
      id: "e-market-2026",
      eventType: "expo",
      name: "Swakopmund Artisan Food Market",
      startDate: "2026-12-26",
      endDate: "2026-12-26",
      venue: "Mole Promenade, Swakopmund",
      gatesOpen: "09:00",
      entryRules: "Free public entry. Cashless & card stalls.",
      program: [
        {
          title: "Slowtown Coffee Roasters",
          place: "Promenade Row A",
          time: "09:00",
          status: "scheduled",
          featured: true,
        },
        {
          title: "Atlantic Oyster & Grill Bar",
          place: "Seafront Deck",
          time: "10:30",
          status: "scheduled",
          featured: true,
        },
      ],
      zones: [
        {
          name: "Seafront Deck",
          type: "food",
          x: 60,
          y: 45,
          accessTier: "all",
          vendorNote: "Fresh oysters & craft sodas",
          status: "open",
        },
      ],
      sitePlanPath: null,
      sitePlanUrl: null,
      templateConfig: marketTemplate,
      visibility: "public",
      publishedAt: "2026-11-18T12:00:00Z",
    },
  ];

  await page.addInitScript(
    ({ events, sosId }) => {
      localStorage.setItem("event-buddies:published-organiser-events", JSON.stringify(events));
      localStorage.setItem(
        `event-buddies:${sosId}:attendee`,
        JSON.stringify({
          profile: { name: "Maya", handle: "maya_na" },
          hasName: true,
          onboardingDone: true,
          selectedEventId: sosId,
        }),
      );
    },
    { events: seededEvents, sosId: SOS_ID },
  );

  // 1. GLOBAL PLATFORM DISCOVER (Warm Editorial Paper, excludes private invite events!)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#events");
  const root = page.locator("[data-app-scope]").first();
  await expect(root).toHaveAttribute("data-app-scope", "global");
  await expect(root).toHaveAttribute("data-surface-mode", "light");
  await expect(page.getByText("Windhoek Digital Summit 2026")).toBeVisible();
  await expect(page.getByText("Namibia Coastal Sevens Finals")).toBeVisible();
  await expect(page.getByText("Swakopmund Artisan Food Market")).toBeVisible();
  // Private celebration MUST NOT leak into public Discover!
  await expect(page.getByText("Selmas 30th Rooftop Dinner")).toHaveCount(0);
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/01-global-discover-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1280, height: 800 });
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/02-global-discover-desktop.png` });

  // 2. CATEGORY 1 — MUSIC FESTIVAL (Experience / Dark Obsidian — Sound of Summer)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#home");
  await expect(root).toHaveAttribute("data-app-scope", "event");
  await expect(root).toHaveAttribute("data-layout-family", "experience");
  await expect(root).toHaveAttribute("data-surface-mode", "dark");
  await expect(page.locator('[data-home-layout="experience"]')).toBeVisible();
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/03-festival-home-mobile.png`, fullPage: true });

  await page.goto("/#lineup");
  await expect(page.getByRole("heading", { name: "Lineup" })).toBeVisible();
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/04-festival-lineup-mobile.png`, fullPage: true });

  await page.goto("/#map");
  await expect(page.getByRole("heading", { name: "Map", exact: true })).toBeVisible();
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/05-festival-map-mobile.png` });

  await page.goto("/#crew");
  await expect(page.getByRole("heading", { name: "Crew", exact: true })).toBeVisible();
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/06-festival-crew-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#home");
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/07-festival-home-desktop.png` });

  // 3. CATEGORY 2 — CORPORATE CONFERENCE (Professional / Light Warm Paper, zero festival jargon)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/events/windhoek-digital-summit-2026#home");
  await expect(root).toHaveAttribute("data-layout-family", "professional");
  await expect(root).toHaveAttribute("data-surface-mode", "light");
  await expect(page.locator('[data-home-layout="professional"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Windhoek Digital Summit 2026" })).toBeVisible();
  await expect(page.getByText(/Dr\. Selma Amupolo/)).toBeVisible();
  const mainNav = page.getByRole("navigation", { name: "Main" });
  await expect(mainNav.getByRole("link", { name: "Agenda" })).toBeVisible();
  await expect(mainNav.getByRole("link", { name: "Network" })).toBeVisible();
  await expect(page.getByText(/Spotify/i)).toHaveCount(0);
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/08-conference-home-mobile.png`, fullPage: true });

  await mainNav.getByRole("link", { name: "Agenda" }).click();
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
  await expect(page.getByText("09:00")).toBeVisible();
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/09-conference-agenda-mobile.png`, fullPage: true });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/events/windhoek-digital-summit-2026#home");
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/10-conference-home-desktop.png` });

  // 4. CATEGORY 3 — PRIVATE CELEBRATION (Social / Private Invite-only — RSVP, no Buy tickets, no public feed)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/events/selmas-30th-rooftop-dinner#home");
  await expect(root).toHaveAttribute("data-layout-family", "social");
  await expect(page.locator('[data-home-layout="social"]')).toBeVisible();
  await expect(page.getByText("Private invitation")).toBeVisible();
  await expect(page.getByRole("button", { name: "RSVP · I’m in" })).toBeVisible();
  await expect(page.getByTestId("event-ticket-bar")).toHaveCount(0);
  await expect(page.getByText("Sound of Summer")).toHaveCount(0);
  await page.getByRole("button", { name: "RSVP · I’m in" }).click();
  await expect(page.getByRole("button", { name: "RSVP confirmed · Going" })).toBeVisible();
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/11-private-party-home-mobile.png`, fullPage: true });

  // 5. CATEGORY 4A — SPORTS EVENT (Competition / Fixtures)
  await page.goto("/events/namibia-coastal-sevens-finals#home");
  await expect(root).toHaveAttribute("data-layout-family", "competition");
  await expect(page.locator('[data-home-layout="competition"]')).toBeVisible();
  await expect(mainNav.getByRole("link", { name: "Fixtures" })).toBeVisible();
  await expect(page.getByText("Coastal Sharks vs Desert Lions")).toBeVisible();
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/12-sports-home-mobile.png`, fullPage: true });

  // 6. CATEGORY 4B — FOOD & LIFESTYLE MARKET (Discovery / Vendors)
  await page.goto("/events/swakopmund-artisan-food-market#home");
  await expect(root).toHaveAttribute("data-layout-family", "discovery");
  await expect(page.locator('[data-home-layout="discovery"]')).toBeVisible();
  await expect(mainNav.getByRole("link", { name: "Vendors" })).toBeVisible();
  await expect(page.getByText("Slowtown Coffee Roasters")).toBeVisible();
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/13-market-home-mobile.png`, fullPage: true });

  expect(pageErrors).toEqual([]);
});

test("organiser visual template editor: 12 templates, live mobile/tablet/desktop preview, lossless switch & publish", async ({
  page,
}) => {
  test.skip(!supabaseUrl, "Requires VITE_SUPABASE_URL for signed-in Organiser Studio fixture.");
  mkdirSync(SHOT_DIR, { recursive: true });
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  const evtId = "f1111111-1111-4111-8111-111111111111";
  const eventsDb = [
    {
      id: evtId,
      owner_id: USER_ID,
      status: "draft",
      event_type: "conference",
      name: "Namibia Tech & Design Week",
      start_date: "2026-12-15",
      end_date: "2026-12-16",
      venue: "Mercure Hotel, Windhoek",
      gates_open: "08:30",
      entry_rules: "Conference lanyard required at Hall A.",
      program: [
        {
          title: "Keynote: Designing for African Cities",
          place: "Hall A",
          time: "09:30",
          status: "scheduled",
          headliner: true,
          featured: true,
        },
      ],
      zones: [
        {
          name: "Hall A",
          type: "stage",
          x: 40,
          y: 45,
          accessTier: "all",
          vendorNote: "Main plenary",
          status: "open",
        },
      ],
      source_label: "",
      source_pdf_path: null,
      site_plan_path: null,
      extraction_missing: [],
      updated_at: "2026-11-19T12:00:00Z",
    },
  ];
  let savedTemplateId: string | null = null;

  await page.route(`${supabaseUrl}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    if (path.includes("/auth/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: buildMockUser() }),
      });
    }
    if (path.endsWith("/rest/v1/organiser_profiles")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user_id: USER_ID,
          organisation: "Studio Windhoek",
          display_name: "Tangi",
          verification_status: "verified",
        }),
      });
    }
    if (path.endsWith("/rest/v1/organiser_events")) {
      if (req.method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(eventsDb),
        });
      }
      if (req.method() === "PATCH") {
        const patch = req.postDataJSON() as Record<string, unknown>;
        Object.assign(eventsDb[0]!, patch);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(eventsDb),
        });
      }
    }
    if (path.endsWith("/rpc/save_organiser_event_extras")) {
      const body = req.postDataJSON() as { p_template_config?: { templateId?: string } };
      savedTemplateId = body.p_template_config?.templateId ?? null;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    if (path.endsWith("/rpc/get_organiser_event_extras")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ barMenus: [], mapCalibration: null, templateConfig: null }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  const authKey = `sb-${new URL(supabaseUrl!).hostname.split(".")[0]}-auth-token`;
  await page.addInitScript(
    ({ authKey, user, token }) => {
      localStorage.setItem(
        authKey,
        JSON.stringify({
          access_token: token,
          refresh_token: "qa-refresh",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
    },
    { authKey, user: buildMockUser(), token: buildMockJwt(USER_ID) },
  );

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/organiser#events/${evtId}`);
  await expect(page.getByRole("heading", { name: "Namibia Tech & Design Week" })).toBeVisible();

  // Open Visual Template Editor & Live Attendee Preview
  await page.getByRole("tab", { name: /Template & Preview/i }).click();
  await expect(page.getByTestId("organiser-template-editor")).toBeVisible();

  const livePreview = page.getByTestId("live-attendee-preview-frame");
  await expect(livePreview).toHaveAttribute("data-layout-family", "professional");
  await expect(livePreview).toContainText("Namibia Tech & Design Week");
  await expect(livePreview).toContainText("Keynote: Designing for African Cities");

  // Capture desktop Template Editor with side-by-side Live Attendee Preview
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/14-organiser-template-editor-desktop.png` });

  // Switch template to Nightlife & Club Party (Social Dark) — verify real programme data preserved!
  await page.locator('[data-template-option="nightlife_party"]').click();
  await expect(livePreview).toHaveAttribute("data-layout-family", "social");
  await expect(livePreview).toHaveAttribute("data-surface-mode", "dark");
  await expect(livePreview).toContainText("Keynote: Designing for African Cities");

  // Switch template to Sports Event (Competition Light) — verify real programme data still preserved!
  await page.locator('[data-template-option="sports_event"]').click();
  await expect(livePreview).toHaveAttribute("data-layout-family", "competition");
  await expect(livePreview).toContainText("Keynote: Designing for African Cities");

  // Switch back to Nightlife & Club Party to save
  await page.locator('[data-template-option="nightlife_party"]').click();
  await expect(livePreview).toHaveAttribute("data-layout-family", "social");

  // Toggle Tablet & Desktop preview sizes
  await page.getByRole("button", { name: "Tablet preview" }).click();
  await page.getByRole("button", { name: "Desktop preview" }).click();
  await page.getByRole("button", { name: "Mobile preview" }).click();

  // Save template & branding
  await page.getByRole("button", { name: "Save template & branding" }).click();
  await expect.poll(() => savedTemplateId).toBe("nightlife_party");
  await expect(page.getByText(/synced to Cloud/i)).toBeVisible();

  // Mobile viewport check of Template Editor
  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoOverflow(page);
  await page.screenshot({ path: `${SHOT_DIR}/15-organiser-template-editor-mobile.png` });

  expect(pageErrors).toEqual([]);
});
