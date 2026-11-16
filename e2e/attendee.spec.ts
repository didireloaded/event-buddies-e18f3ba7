import { test, expect, type Page } from "@playwright/test";

async function guest(page: Page) {
  await page.addInitScript(() => {
    const key = "event-buddies:20000000-0000-4000-8000-000000000002:attendee";
    if (!localStorage.getItem(key))
      localStorage.setItem(
        key,
        JSON.stringify({
          profile: { name: "Maya", handle: "maya" },
          hasName: true,
          onboardingDone: true,
        }),
      );
  });
}

test("first visit can skip to a name and retain it after refresh", async ({ page }) => {
  await page.goto("/#home");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("M");
  await expect(page.getByRole("button", { name: "Go to my event" })).toBeDisabled();
  await page.getByLabel("Your name", { exact: true }).fill("Maya");
  await page.getByRole("button", { name: "Go to my event" }).click();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Go to my event" })).toHaveCount(0);
});

test("favourites retain artist identity after refresh", async ({ page }) => {
  await guest(page);
  await page.goto("/#lineup");
  await page.getByRole("button", { name: "Save Shimza to favourites", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remove Shimza from favourites", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("meeting validation rejects outside hours and saves a valid plan", async ({ page }) => {
  await guest(page);
  await page.goto("/#crew");
  await page.getByRole("button", { name: "Make a meeting plan", exact: true }).click();
  await page.getByLabel("Date & time (CAT)").fill("2026-12-28T11:00");
  await page.getByRole("button", { name: "Save meeting plan", exact: true }).click();
  await expect(page.locator("#meeting-error")).toBeVisible();
  await page.getByLabel("Date & time (CAT)").fill("2026-12-28T17:30");
  await page.getByRole("button", { name: "Save meeting plan", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.reload();
  await expect(page.locator('section[aria-labelledby="crew-meeting"]')).toContainText("17:30");
});

test("map category counts, zoom buttons, pinch and drag work together", async ({ page }) => {
  await guest(page);
  await page.goto("/#map");
  await page
    .getByRole("group", { name: "Filter places" })
    .getByRole("button", { name: /Toilets/ })
    .click();
  await expect(page.locator("#map-category-places")).toContainText("5 on the venue plan");
  await page.getByRole("button", { name: "Show all", exact: true }).click();
  const viewport = page.getByLabel(/^Venue plan\. Drag/);
  await viewport.scrollIntoViewIfNeeded();
  const before = await viewport.evaluate((el) => el.scrollWidth);
  const box = (await viewport.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 40, y, id: 0 },
      { x: x + 40, y, id: 1 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: x - 80, y, id: 0 },
      { x: x + 80, y, id: 1 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => viewport.evaluate((el) => el.scrollWidth)).toBeGreaterThan(before);
  const left = await viewport.evaluate((el) => el.scrollLeft);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 55, y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate((el) => el.scrollLeft)).toBeGreaterThan(left);
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Zoom in", exact: true })).toBeEnabled();
});

test("ticket screenshot survives an offline refresh and can be removed", async ({
  page,
  context,
}) => {
  await guest(page);
  await page.goto("/#you");
  await expect(
    page.getByText("The app files and public event page are saved", { exact: false }),
  ).toBeVisible();
  await page
    .locator("#ticket-vault input[type=file]")
    .setInputFiles({
      name: "ticket-test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxGkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(page.locator("#ticket-vault img")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#ticket-vault img")).toBeVisible();
  await page.getByRole("button", { name: "Remove saved ticket", exact: true }).click();
  await expect(page.locator("#ticket-vault img")).toHaveCount(0);
});

test("offline event routes and saved assistant answers remain available", async ({
  page,
  context,
}) => {
  await guest(page);
  await page.goto("/#you");
  await expect(
    page.getByText("The app files and public event page are saved", { exact: false }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  for (const route of ["lineup", "map", "crew", "info", "home"]) {
    await page.evaluate((value) => {
      location.hash = value;
    }, route);
    await expect(page.locator("main")).not.toBeEmpty();
    await expect(
      page.getByText("Offline · showing the saved event", { exact: false }),
    ).toBeVisible();
  }
  await page.getByLabel("Your question", { exact: true }).fill("Can I bring glass?");
  await page.getByRole("button", { name: "Ask the event assistant", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("saved event information");
  await page.getByText("Read the saved event answers", { exact: true }).click();
  await expect(page.locator("#assistant-title").locator("..")).toContainText("glass");
});
