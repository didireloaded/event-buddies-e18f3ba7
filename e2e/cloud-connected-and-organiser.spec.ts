import { test, expect, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import type { Crew } from "../src/lib/crew/client";

const envSource = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const supabaseUrl =
  process.env["VITE_SUPABASE_URL"] ?? envSource.match(/VITE_SUPABASE_URL="([^"]+)"/)?.[1];

const USER_ID = "d1111111-1111-4111-8111-111111111111";
const SOS_ID = "20000000-0000-4000-8000-000000000002";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxGkAAAAASUVORK5CYII=",
  "base64",
);

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
    email: "qa-organiser@example.invalid",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
}

async function seedSignedInSession(page: Page, baseUrl: string) {
  const user = buildMockUser();
  const token = buildMockJwt(USER_ID);
  const authKey = `sb-${new URL(baseUrl).hostname.split(".")[0]}-auth-token`;
  await page.addInitScript(
    ({ authKey, user, token, sosId }) => {
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
      const attendeeKey = `event-buddies:${sosId}:attendee`;
      if (!localStorage.getItem(attendeeKey)) {
        localStorage.setItem(
          attendeeKey,
          JSON.stringify({
            profile: { name: "QA Maya", handle: "qamaya" },
            hasName: true,
            onboardingDone: true,
            selectedEventId: sosId,
          }),
        );
      }
    },
    { authKey, user, token, sosId: SOS_ID },
  );
}

test("connected crew: photo upload, invite QR, active-session live GPS, Ghost Mode & cloud ticket sync", async ({
  page,
  context,
}) => {
  test.skip(!supabaseUrl, "Requires VITE_SUPABASE_URL for signed-in Cloud UI fixture.");
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -22.8205, longitude: 14.5418, accuracy: 12 });

  const crewId = "d2222222-2222-4222-8222-222222222222";
  const inviteCode = "d3333333-3333-4333-8333-333333333333";
  const crew: Crew = {
    id: crewId,
    name: "QA Coast crew",
    revision: 0,
    meeting: null,
    members: [
      {
        id: USER_ID,
        name: "QA Maya",
        owner: true,
        generation: 0,
        pointId: null,
        expiresAt: null,
      },
    ],
  };

  let droppedGpsPin: Record<string, unknown> | null = null;
  let removedPin = false;
  let syncedTicketToCloud = false;

  await page.route(`${supabaseUrl}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path.includes("/auth/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: buildMockUser() }),
      });
    }
    if (path.endsWith("attendee_crew_state")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(crew),
      });
    }
    if (path.endsWith("attendee_crew_command")) {
      const input = req.postDataJSON() as { p_command: { op: string } };
      if (input.p_command.op === "invite") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            invite: inviteCode,
            expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
          }),
        });
      }
      if (input.p_command.op === "stop") {
        crew.members[0]!.pointId = null;
        crew.members[0]!.expiresAt = null;
        crew.members[0]!.generation++;
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    if (path.endsWith("/rpc/drop_pin") || path.endsWith("/functions/v1/drop-pin")) {
      droppedGpsPin = req.postDataJSON() as Record<string, unknown>;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    if (path.endsWith("/rpc/remove_pin")) {
      removedPin = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    if (path.endsWith("/rest/v1/tickets")) {
      if (req.method() === "POST") {
        syncedTicketToCloud = true;
        return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await seedSignedInSession(page, supabaseUrl!);
  await page.goto("/#crew");
  await expect(page.getByRole("heading", { name: "QA Coast crew" })).toBeVisible();

  // 1. Owner crew photo upload
  await page.locator('label:has-text("Crew photo") input[type="file"]').setInputFiles({
    name: "crew.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await expect(page.getByRole("img", { name: "QA Coast crew photo" })).toBeVisible();

  // 2. Invite friend via visual Add button -> QR + copy code + copy link
  await page.getByRole("button", { name: "Add friend to crew", exact: true }).click();
  await page.getByRole("button", { name: "Generate invite code", exact: true }).click();
  await expect(page.getByText(inviteCode)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy code", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy invite link", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  // 3. Opt-in active-session Live GPS sharing -> accuracy badge + drop_pin -> Ghost Mode revocation
  await page.getByRole("button", { name: "Share live location", exact: true }).click();
  await page.getByRole("button", { name: "15 min", exact: true }).click();
  await page.getByRole("button", { name: "Start sharing live location", exact: true }).click();
  await expect(page.getByText(/Live location · Live/i)).toBeVisible();
  await expect(page.getByText(/±12\s?m/)).toBeVisible();
  await expect.poll(() => droppedGpsPin).not.toBeNull();

  // Ghost Mode stops GPS & revokes pin
  await page.getByRole("button", { name: /Stop sharing · Ghost Mode/ }).click();
  await expect(page.getByText(/Live location · Live/i)).toHaveCount(0);
  await expect.poll(() => removedPin).toBe(true);

  // 4. Signed-in Cloud ticket metadata sync & honest disclosure
  await page.getByRole("button", { name: "My Tickets & Passes", exact: true }).click();
  await expect(
    page.getByText(/Ticket metadata \(tier, label, code\) backs up privately/i),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter a ticket code manually", exact: true }).click();
  await page.getByLabel("Ticket code or reference").fill("CLOUD-SYNC-2026");
  await page.getByRole("button", { name: "Save ticket code offline", exact: true }).click();
  await expect.poll(() => syncedTicketToCloud).toBe(true);

  expect(pageErrors).toEqual([]);
});

test("organiser workspace end-to-end: desktop & mobile layout, manual/URL create, site-plan validation, 3-point GPS calibration, bar menu, publish & live broadcast to attendee", async ({
  page,
}) => {
  test.skip(!supabaseUrl, "Requires VITE_SUPABASE_URL for signed-in Organiser fixture.");
  mkdirSync("test-results/qa-screenshots", { recursive: true });
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  type MockOrgEvent = Record<string, unknown> & { id: string };
  const eventsDb: MockOrgEvent[] = [
    {
      id: "e1111111-1111-4111-8111-111111111111",
      owner_id: USER_ID,
      status: "draft",
      event_type: "festival",
      name: "Coastal Draft Fest",
      start_date: "2026-12-20",
      end_date: "2026-12-20",
      venue: "Swakopmund Jetty",
      gates_open: "12:00",
      entry_rules: "18+ only.",
      program: [],
      zones: [],
      source_label: "",
      source_pdf_path: null,
      site_plan_path: null,
      extraction_missing: [],
      updated_at: "2026-11-19T08:00:00Z",
    },
  ];
  const broadcastsDb: Record<string, unknown>[] = [];
  let createdSeq = 2;

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
          organisation: "Namibia Live Productions",
          contact_name: "QA Organiser",
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
      if (req.method() === "POST") {
        const body = req.postDataJSON() as Record<string, unknown>;
        const newId = `e${createdSeq}111111-1111-4111-8111-11111111111${createdSeq}`;
        createdSeq++;
        const row: MockOrgEvent = {
          id: newId,
          owner_id: USER_ID,
          status: "draft",
          event_type: "festival",
          name: "",
          start_date: null,
          end_date: null,
          venue: "",
          gates_open: "",
          entry_rules: "",
          program: [],
          zones: [],
          source_label: "",
          source_pdf_path: null,
          site_plan_path: null,
          extraction_missing: [],
          updated_at: new Date().toISOString(),
          ...body,
        };
        eventsDb.unshift(row);
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(row),
        });
      }
      if (req.method() === "PATCH") {
        const idEq = url.searchParams.get("id")?.replace(/^eq\./, "");
        const patch = req.postDataJSON() as Record<string, unknown>;
        const target = eventsDb.find((ev) => ev.id === idEq);
        if (target) Object.assign(target, patch, { updated_at: new Date().toISOString() });
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(target ? [target] : []),
        });
      }
    }
    if (path.includes("/storage/v1/object/sign/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ signedURL: "/images/sound-of-summer-site-plan-2026.png" }),
      });
    }
    if (path.includes("/storage/v1/object/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ Key: "site-plans/qa-uploaded.webp" }),
      });
    }
    if (path.endsWith("/rpc/send_organiser_broadcast")) {
      const body = req.postDataJSON() as { p_event_id: string; p_kind: string; p_message: string };
      const broadcast = {
        id: "b1111111-1111-4111-8111-111111111111",
        eventId: body.p_event_id,
        kind: body.p_kind,
        message: body.p_message,
        createdAt: new Date().toISOString(),
      };
      broadcastsDb.unshift(broadcast);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(broadcast),
      });
    }
    if (path.endsWith("/rpc/list_event_broadcasts")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(broadcastsDb),
      });
    }
    if (path.endsWith("/rpc/list_published_organiser_events")) {
      const pub = eventsDb
        .filter((e) => e.status === "published")
        .map((e) => ({
          id: e.id,
          eventType: e.event_type,
          name: e.name,
          startDate: e.start_date,
          endDate: e.end_date,
          venue: e.venue,
          gatesOpen: e.gates_open,
          entryRules: e.entry_rules,
          program: e.program,
          zones: e.zones,
          sitePlanPath: e.site_plan_path,
          sitePlanUrl: e.site_plan_path ? "/images/sound-of-summer-site-plan-2026.png" : null,
          publishedAt: e.updated_at,
        }));
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(pub),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await seedSignedInSession(page, supabaseUrl!);

  // 1. Desktop (1280x800) Organiser workspace sidebar & operational metrics
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/organiser");
  const desktopNav = page.getByRole("complementary", { name: "Organiser desktop navigation" });
  await expect(desktopNav).toBeVisible();
  await expect(page.getByText("Namibia Live Productions")).toBeVisible();
  await expect(page.getByText("Coastal Draft Fest")).toBeVisible();
  await page.screenshot({ path: "test-results/qa-screenshots/organiser-desktop-events.png" });

  // 2. Create Tab: External URL import + duplicate protection + Manual Conference setup
  await desktopNav.getByRole("link", { name: "Create" }).click();
  await page
    .getByLabel("Official ticket or event listing URL")
    .fill("https://www.webtickets.co.za/v2/event/namib-jazz-night");
  await page.getByRole("button", { name: "Create reviewed draft from URL", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Namib Jazz Night" })).toBeVisible();

  // Duplicate URL rejected
  await desktopNav.getByRole("link", { name: "Create" }).click();
  await page
    .getByLabel("Official ticket or event listing URL")
    .fill("https://www.webtickets.co.za/v2/event/namib-jazz-night");
  await page.getByRole("button", { name: "Create reviewed draft from URL", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("already exists");

  // Manual Conference Setup
  await page.getByLabel("Event template").selectOption("conference");
  await page.getByLabel("Event name").fill("Windhoek AI Forum 2026");
  await page.getByLabel("Start date").fill("2026-12-10");
  await page.getByLabel("Venue & city").fill("Hilton, Windhoek");
  await page.getByRole("button", { name: "Create manual draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Windhoek AI Forum 2026" })).toBeVisible();

  // 3. Programme Headliner + Readiness check
  await page.getByRole("button", { name: /Agenda/ }).click();
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByLabel(/item 1 name/i).fill("Dr. Selma Amupolo");
  await page.getByLabel("Item 1 place").fill("Main Hall");
  await page.getByLabel("Item 1 time").fill("09:00");
  await page.getByRole("checkbox", { name: /Keynote/i }).check();
  await page.getByRole("button", { name: "Save agenda", exact: true }).click();

  // 4. Site plan upload validation (<2000px rejected, 4.8:1 panorama rejected, 2400x1600 accepted + 3-point calibration!)
  const [smallBuf, panoBuf, validBuf] = await page.evaluate(async () => {
    async function makePng(w: number, h: number): Promise<number[]> {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#1a5f7a";
      ctx.fillRect(0, 0, w, h);
      const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
      return [...new Uint8Array(await blob.arrayBuffer())];
    }
    return [await makePng(800, 600), await makePng(2400, 500), await makePng(2400, 1600)];
  });

  await page.getByRole("button", { name: /Site plan/ }).click();
  const siteDialog = page.getByRole("dialog", { name: "Site plan" });
  const siteInput = siteDialog.locator('input[type="file"]');

  // Reject 800x600 (< 2000px) — alert must be visible RIGHT INSIDE the modal sheet!
  await siteInput.setInputFiles({
    name: "tiny.png",
    mimeType: "image/png",
    buffer: Buffer.from(smallBuf!),
  });
  await expect(siteDialog.getByRole("alert")).toContainText("2000px");

  // Reject 2400x500 (extreme aspect ratio > 3:1)
  await siteInput.setInputFiles({
    name: "pano.png",
    mimeType: "image/png",
    buffer: Buffer.from(panoBuf!),
  });
  await expect(siteDialog.getByRole("alert")).toContainText(/shape doesn.t fit/i);

  // Accept valid 2400x1600 with 90° rotation
  await siteDialog.getByRole("button", { name: /Rotate 90°/ }).click();
  await siteInput.setInputFiles({
    name: "valid-plan.png",
    mimeType: "image/png",
    buffer: Buffer.from(validBuf!),
  });
  await expect(siteDialog.getByRole("alert")).toHaveCount(0);

  // 3-point GPS calibration save
  await siteDialog.getByText("Calibrate GPS (3 reference points)").click();
  await siteDialog.getByRole("button", { name: "Save GPS calibration", exact: true }).click();
  await expect(siteDialog.getByText(/GPS affine calibration saved/i)).toBeVisible();
  await siteDialog.getByRole("button", { name: "Done", exact: true }).click();

  // 5. Bar Menu Editor
  await page.getByRole("button", { name: /Bar drinks menu/ }).click();
  await page.getByLabel("Drink name").fill("Artisan Espresso");
  await page.getByLabel("Drink price (optional)").fill("N$ 35");
  await page.getByRole("button", { name: "Add drink", exact: true }).click();
  await page.getByRole("button", { name: "Save bar menu", exact: true }).click();

  // 6. Publish event!
  await page.getByRole("button", { name: "Publish event", exact: true }).click();
  await page.getByRole("button", { name: "Confirm publish", exact: true }).click();
  await expect(page.getByText(/published · conference/i)).toBeVisible();

  // 7. Live Tab: Schedule update + Emergency Broadcast confirmation gate
  await desktopNav.getByRole("link", { name: "Live" }).click();
  await expect(page.getByText("Dr. Selma Amupolo")).toBeVisible();
  await page.getByLabel("Broadcast type").selectOption("emergency");
  await page.getByLabel(/Message \(/).fill("Main Hall doors open 15 minutes early at 08:45.");
  const publishAlertBtn = page.getByRole("button", {
    name: "Publish emergency alert",
    exact: true,
  });
  await expect(publishAlertBtn).toBeDisabled();
  await page.getByRole("checkbox", { name: /Confirm this is an urgent safety alert/ }).check();
  await expect(publishAlertBtn).toBeEnabled();
  await publishAlertBtn.click();
  await expect(page.getByText("Main Hall doors open 15 minutes early at 08:45.")).toBeVisible();
  await page.screenshot({ path: "test-results/qa-screenshots/organiser-desktop-live.png" });

  // Mobile Organiser layout zero-overflow check (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  const orgOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(orgOverflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/qa-screenshots/organiser-mobile-live.png" });

  // 8. Organiser-to-Attendee roundtrip: open published conference in Attendee App!
  await page.goto("/events/windhoek-ai-forum-2026#home");
  await expect(page.getByRole("heading", { name: "Windhoek AI Forum 2026" })).toBeVisible();
  await expect(page.getByText("Dr. Selma Amupolo")).toBeVisible();

  // Open Menu -> Event updates -> Emergency broadcast from LiveTab is visible!
  await page.getByRole("button", { name: /Menu: profile/ }).click();
  await page.getByRole("button", { name: /Event updates/ }).click();
  await expect(page.getByText("Main Hall doors open 15 minutes early at 08:45.")).toBeVisible();

  expect(pageErrors).toEqual([]);
});
