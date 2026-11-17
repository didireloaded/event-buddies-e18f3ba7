import type { Crew } from "../src/lib/crew/client";
import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
const source = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const url = process.env["VITE_SUPABASE_URL"] ?? source.match(/VITE_SUPABASE_URL="([^"]+)"/)?.[1];
test("signed-in crew fixture opens a friend on the map and confirms Ghost Mode", async ({
  page,
}) => {
  test.skip(!url, "Requires local public Cloud configuration for the signed-in UI fixture.");
  const userId = "d1111111-1111-4111-8111-111111111111";
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: "qa@example.invalid",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = [
    { alg: "HS256", typ: "JWT" },
    { sub: userId, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 },
    "fixture",
  ]
    .map((v) => (typeof v === "string" ? v : Buffer.from(JSON.stringify(v)).toString("base64url")))
    .join(".");
  const crew: Crew = {
    id: "d2222222-2222-4222-8222-222222222222",
    name: "QA Coast crew",
    revision: 0,
    meeting: null,
    members: [
      {
        id: userId,
        name: "QA Maya",
        owner: true,
        generation: 0,
        pointId: "sos-main",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    ],
  };
  await page.route(`${url}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path.includes("/auth/")) body = { user };
    if (path.endsWith("attendee_crew_state")) body = crew;
    if (path.endsWith("attendee_crew_command")) {
      const input = route.request().postDataJSON();
      if (input.p_command.op === "stop") {
        crew.members[0]!.pointId = null;
        crew.members[0]!.expiresAt = null;
        crew.members[0]!.generation++;
      }
      body = { ok: true };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.addInitScript(
    ({ key, user, token }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: token,
          refresh_token: "qa-fixture",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
      localStorage.setItem(
        "event-buddies:20000000-0000-4000-8000-000000000002:attendee",
        JSON.stringify({
          profile: { name: "QA Maya", handle: "qa" },
          hasName: true,
          onboardingDone: true,
          selectedEventId: "20000000-0000-4000-8000-000000000002",
        }),
      );
    },
    { key: `sb-${new URL(url!).hostname.split(".")[0]}-auth-token`, user, token },
  );
  await page.goto("/#crew");
  await expect(page.getByRole("heading", { name: "QA Coast crew" })).toBeVisible();
  await page.screenshot({ path: "test-results/connected-crew-390.png", scale: "css" });
  await page.getByRole("button", { name: /QA Maya · You/ }).click();
  await expect(page).toHaveURL(/#map/);
  await expect(page.getByText(/QA Maya shared this landmark until/)).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Crew", exact: true })
    .click();
  await page.getByRole("button", { name: /Stop sharing · Ghost Mode/ }).click();
  await expect(page.getByText("Location private", { exact: true })).toBeVisible();
});
