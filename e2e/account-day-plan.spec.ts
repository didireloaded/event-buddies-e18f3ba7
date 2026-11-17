import { test, expect } from "@playwright/test";
const storageKey = "event-buddies:20000000-0000-4000-8000-000000000002:attendee";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            profile: { name: "QA Attendee", handle: "qa" },
            hasName: true,
            onboardingDone: true,
            selectedEventId: "20000000-0000-4000-8000-000000000002",
          }),
        );
    },
    { key: storageKey },
  );
});
test("day-plan empty state, private persistence and Clear plan work on mobile", async ({
  page,
}) => {
  await page.goto("/#lineup");
  await expect(
    page.getByRole("button", { name: "Suggest my day plan", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/Suggested plans stay on this device/)).toBeVisible();
  await page.getByRole("button", { name: "Save Shimza to favourites", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Suggest my day plan", exact: true }),
  ).toBeEnabled();
  // A labelled fixture tests saved-result rendering without spending AI credits.
  await page.evaluate(
    ({ key }) => {
      const preferences = JSON.parse(localStorage.getItem(key)!);
      preferences.dayPlan = {
        summary: "QA saved-plan fixture",
        items: [
          {
            kind: "favourite_artist",
            title: "Shimza",
            time: "Time to be announced",
            place: null,
            detail: "Saved artist",
          },
        ],
        note: "Set times are pending.",
      };
      localStorage.setItem(key, JSON.stringify(preferences));
    },
    { key: storageKey },
  );
  await page.reload();
  await expect(page.getByText("QA saved-plan fixture")).toBeVisible();
  await page.screenshot({ path: "test-results/day-plan-390.png", fullPage: false });
  await page.getByRole("button", { name: "Clear plan", exact: true }).click();
  await page.reload();
  await expect(page.getByText("QA saved-plan fixture")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Suggest my day plan", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/day-plan-320.png", scale: "css" });
});
test("profile reaches account sign-in with a retained return route", async ({ page }) => {
  await page.goto("/#you");
  await expect(page.getByRole("heading", { name: "Your account", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/account-390.png" });
  await page.getByRole("link", { name: "Sign in or create an account", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/login\?next=/);
  await page.screenshot({ path: "test-results/sign-in-390.png" });
});
