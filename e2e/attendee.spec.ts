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

async function offlineReady(page: Page) {
  await page.getByRole("button", { name: /Offline & installation/ }).click();
  await expect(
    page.getByText("The app files and public event page are saved", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
}

test("first visit can skip to a name and retain it after refresh", async ({ page }) => {
  await page.goto("/#home");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("M");
  await expect(page.getByRole("button", { name: "Go to my event" })).toBeDisabled();
  await page.getByLabel("Your name", { exact: true }).fill("Maya");
  await page.getByRole("button", { name: "Go to my event" }).click();
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await page.getByRole("button", { name: "Preview Sound of Summer" }).click();
  await page.getByRole("button", { name: "I’m going", exact: true }).click();
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

test("attendee screens stay concise and event switching preserves saved artists", async ({
  page,
}) => {
  await guest(page);
  await page.goto("/#lineup");
  await page.getByRole("button", { name: "Save Shimza to favourites", exact: true }).click();
  await page.goto("/#home");
  await expect(page.getByRole("button", { name: /Ask about the festival/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your crew", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Menu: profile/ }).click();
  await expect(page.getByText("Organiser workspace", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.goto("/#you");
  await page.getByRole("link", { name: "Switch event", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await page.getByRole("button", { name: "Preview Sound of Summer" }).click();
  await page.getByRole("button", { name: "I’m going", exact: true }).click();
  await page.goto("/#lineup");
  await expect(
    page.getByRole("button", { name: "Remove Shimza from favourites", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/#map");
  await expect(page.getByRole("button", { name: "Location privacy", exact: true })).toBeVisible();
  await expect(page.getByText("Lineup", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Mark where I am", { exact: true })).toHaveCount(0);
});

test("meeting validation rejects outside hours and saves a valid plan", async ({ page }) => {
  await guest(page);
  await page.goto("/#crew");
  await page.getByRole("button", { name: "Choose a meetup spot", exact: true }).click();
  await page.getByLabel("Date & time (CAT)").fill("2026-12-28T11:00");
  await page.getByRole("button", { name: "Save meeting plan", exact: true }).click();
  await expect(page.locator("#meeting-error")).toBeVisible();
  await page.getByLabel("Date & time (CAT)").fill("2026-12-28T17:30");
  await page.getByRole("button", { name: "Save meeting plan", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: /Meet at/ })).toContainText("17:30");
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
  await offlineReady(page);
  await page.getByRole("button", { name: /Ticket vault/ }).click();
  await page.locator("#ticket-vault input[type=file]").setInputFiles({
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
  await page.getByRole("button", { name: /Ticket vault/ }).click();
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
  await offlineReady(page);
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
  await page.goto("/#info");
  await page.getByRole("button", { name: /Ask about the festival/ }).click();
  await page.getByLabel("Your question", { exact: true }).fill("Can I bring glass?");
  await page.getByRole("button", { name: "Ask the event assistant", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("saved event information");
  await page.getByText("Read the saved event answers", { exact: true }).click();
  await expect(page.locator("#assistant-title").locator("..")).toContainText("glass");
});

test("map place sheets retain the chosen landmark when planning a meeting", async ({ page }) => {
  await guest(page);
  await page.goto("/#crew");
  await page.getByRole("button", { name: "Choose a meetup spot", exact: true }).click();
  await page.getByRole("button", { name: "Save meeting plan", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.goto("/#map");
  await page
    .getByRole("group", { name: "Filter places" })
    .getByRole("button", { name: /^Stages/ })
    .click();
  await page
    .locator("#map-category-places")
    .getByRole("button", { name: /Jetty Funk Stage/ })
    .click();
  await expect(page.getByRole("dialog", { name: "Jetty Funk Stage", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Plan a meeting here", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await expect(page.getByLabel("Meeting place", { exact: true })).toHaveValue("sos-jetty");
});

test("profile editing opens in a sheet and returns keyboard focus", async ({ page }) => {
  await guest(page);
  await page.goto("/#you");
  const trigger = page.getByRole("button", { name: /Edit name/ });
  await trigger.focus();
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "My profile", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("link", { name: "Switch event", exact: true })).toBeVisible();
});

test("crew avatars open real saved records and remove them persistently", async ({ page }) => {
  await guest(page);
  await page.goto("/#crew");
  await page.evaluate(() => {
    const key = "event-buddies:20000000-0000-4000-8000-000000000002:attendee";
    const prefs = JSON.parse(localStorage.getItem(key)!);
    prefs.sharedPlans = [
      {
        receivedAt: Date.now(),
        plan: {
          version: 1,
          event: "20000000-0000-4000-8000-000000000002",
          name: "QA Friend",
          artists: [],
          meeting: null,
        },
      },
    ];
    localStorage.setItem(key, JSON.stringify(prefs));
  });
  await page.reload();
  await page.getByRole("button", { name: "View QA Friend’s shared plan", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "QA Friend", exact: true })).toContainText(
    "No meeting point shared",
  );
  await page.getByRole("button", { name: "Remove saved plan", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "View QA Friend’s shared plan", exact: true }),
  ).toHaveCount(0);
});

test("sheet grabber follows a drag and dismisses after the threshold", async ({ page }) => {
  await guest(page);
  await page.goto("/#you");
  await page.getByRole("button", { name: /Edit name/ }).click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await page.waitForFunction(() =>
    document
      .querySelector("dialog[open]")
      ?.getAnimations()
      .every((animation) => animation.playState === "finished"),
  );
  const handle = page.locator("dialog[open] > div > div").first();
  const box = (await handle.boundingBox())!;
  const top = (await dialog.boundingBox())!.y;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 35, { steps: 4 });
  await expect
    .poll(() => dialog.evaluate((el) => el.getBoundingClientRect().top))
    .toBeGreaterThan(top + 20);
  await page.mouse.move(x, y + 85, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});
