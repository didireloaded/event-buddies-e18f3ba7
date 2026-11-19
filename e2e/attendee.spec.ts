import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

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

test("event calendar filters dates and exports the verified event hours", async ({ page }) => {
  await guest(page);
  await page.goto("/#events");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await page
    .getByRole("group", { name: "Event discovery view" })
    .getByRole("button", { name: "Calendar" })
    .click();
  await expect(page.getByText("December 2026", { exact: true })).toBeVisible();
  await expect(page.getByText("Published event date", { exact: true })).toHaveCount(0);
  const dateButtons = page.locator(".event-calendar button[data-day]");
  const dateSizes = await dateButtons.evaluateAll((buttons) =>
    buttons.map((button) => {
      const { width, height } = button.getBoundingClientRect();
      return { width, height };
    }),
  );
  expect(dateSizes.length).toBeGreaterThan(27);
  expect(dateSizes.every(({ height }) => height === 44)).toBe(true);
  expect(
    Math.max(...dateSizes.map(({ width }) => width)) -
      Math.min(...dateSizes.map(({ width }) => width)),
  ).toBeLessThan(1);

  await page.getByRole("button", { name: /Sunday, December 27th, 2026/ }).click();
  await expect(page.getByText("No published events on this date.")).toBeVisible();
  await page.getByRole("button", { name: "Show Sound of Summer", exact: true }).click();
  await page.getByRole("button", { name: "Preview Sound of Summer", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add event to my calendar", exact: true }).click();
  const file = await download;
  const content = await readFile((await file.path())!, "utf8");
  expect(content).toContain("DTSTART:20261228T100000Z");
  expect(content).toContain("DTEND:20261228T210000Z");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await page.getByRole("button", { name: "I’m going", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});

test("fresh deep links cannot reveal attendee navigation before event selection", async ({
  page,
}) => {
  await page.goto("/#map");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Skip", exact: true })).toBeVisible();
});

test("preparation checklist persists and the big-message signal stays local", async ({ page }) => {
  await guest(page);
  await page.goto("/#info");
  await page.getByRole("checkbox", { name: "Pack my physical ID", exact: true }).check();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Pack my physical ID", exact: true }),
  ).toBeChecked();
  await page.goto("/#crew");
  await page.getByRole("button", { name: "Find me screen", exact: true }).click();
  await page
    .getByRole("group", { name: "Signal display" })
    .getByRole("button", { name: "Message", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Big screen message", exact: true }).fill("MEET AT GATE");
  await expect(page.getByText("MEET AT GATE", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Use white screen", exact: true }).click();
  await expect(page.locator(".signal-screen")).toHaveAttribute("data-light", "true");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("private photo diary saves offline, exports a card and removes the photo", async ({
  page,
  context,
}) => {
  await guest(page);
  await page.goto("/#you");
  await offlineReady(page);
  await page.getByRole("button", { name: /Photo diary/ }).click();
  await page.getByLabel("Add a photo", { exact: true }).setInputFiles({
    name: "unsupported.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await page.getByRole("button", { name: "Save memory on this phone", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("JPG, PNG or WebP");
  await page.getByLabel("Add a photo", { exact: true }).setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("damaged image"),
  });
  await page.getByRole("button", { name: "Save memory on this phone", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("couldn’t be read");
  await page.getByLabel("Add a photo", { exact: true }).setInputFiles({
    name: "memory.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxGkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByLabel("Caption", { exact: true }).fill("QA memory");
  await page.getByRole("button", { name: "Save memory on this phone", exact: true }).click();
  await expect(page.getByText("QA memory", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download story card", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/-story\.png$/);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Photo diary/ }).click();
  await expect(page.getByText("QA memory", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("QA memory", { exact: true })).toHaveCount(0);
});

test("favourites retain artist identity after refresh", async ({ page }) => {
  await guest(page);
  await page.goto("/#lineup");
  await page.getByRole("button", { name: "Save Shimza to favourites", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remove Shimza from favourites", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const poster = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download my lineup poster/ }).click();
  expect((await poster).suggestedFilename()).toMatch(/-my-lineup\.png$/);
});

test("festival bingo persists and the random stage opens a real venue point", async ({ page }) => {
  await guest(page);
  await page.goto("/#crew");
  await page.getByRole("button", { name: /Festival extras/ }).click();
  await page.getByRole("button", { name: "Pick a stage", exact: true }).click();
  await page.getByRole("button", { name: /^Show .*Stage/ }).click();
  await expect(page).toHaveURL(/#map$/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.goto("/#crew");
  await page.getByRole("button", { name: /Festival extras/ }).click();
  await page
    .getByRole("group", { name: "Festival extras" })
    .getByRole("button", { name: "Bingo", exact: true })
    .click();
  await page.getByRole("button", { name: "Take a water break", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Take a water break", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await page.getByRole("button", { name: /Festival extras/ }).click();
  await page
    .getByRole("group", { name: "Festival extras" })
    .getByRole("button", { name: "Bingo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Take a water break", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("nearby facilities use a landmark and open one place sheet", async ({ page }) => {
  await guest(page);
  await page.goto("/#map");
  await page.getByRole("button", { name: "Find nearby facilities", exact: true }).click();
  await page.getByRole("button", { name: "Toilets", exact: true }).click();
  await expect(
    page.getByText("Ordered by proximity on the supplied image.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Toilet.*↗/ })
    .first()
    .click();
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Plan a meeting here", exact: true }),
  ).toBeVisible();
});

test("PWA manifest declares standalone entry and existing app icons", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/#home");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBeTruthy();
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
  await page.getByRole("link", { name: /Your lineup/ }).click();
  await expect(page).toHaveURL(/#lineup$/);
  await page.goBack();
  await expect(page).toHaveURL(/#home$/);
  await page.getByRole("link", { name: /Venue map/ }).click();
  await expect(page).toHaveURL(/#map$/);
  await page.goBack();
  await page.getByRole("link", { name: /Festival essentials/ }).click();
  await expect(page).toHaveURL(/#info$/);
  await page.goBack();
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
  await expect(page.locator("main").getByText("Lineup", { exact: true })).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Lineup", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open your profile", exact: true }).click();
  await expect(page).toHaveURL(/#you$/);
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

test("onboarding optional self-photo attaches, persists across views, and can be removed", async ({
  page,
}) => {
  await page.goto("/#home");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "selfie.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxGkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByRole("img", { name: /profile photo/i })).toBeVisible();
  await page.getByLabel("Your name", { exact: true }).fill("Maya");
  await page.getByRole("button", { name: "Go to my event" }).click();
  await page.getByRole("button", { name: "Preview Sound of Summer" }).click();
  await page.getByRole("button", { name: "I’m going", exact: true }).click();

  await page.goto("/#you");
  await expect(page.getByRole("img", { name: /Maya’s profile photo/i })).toBeVisible();
  await page.getByRole("button", { name: /Edit name/ }).click();
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove photo", exact: true })).toHaveCount(0);
});

test("map category chips only list existing categories and include tents", async ({ page }) => {
  await guest(page);
  await page.goto("/#map");
  const filterGroup = page.getByRole("group", { name: "Filter places" });
  await expect(filterGroup.getByRole("button", { name: /Tents/ })).toContainText("2");
  await expect(filterGroup.getByRole("button", { name: /Water/ })).toHaveCount(0);
});

test("organiser route renders safely without client errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/organiser");
  await expect(page.getByRole("heading", { name: /Organiser/i })).toBeVisible();
  expect(errors).toEqual([]);
});

test("crew invite deep link is retained and login supports magic-link mode", async ({ page }) => {
  await guest(page);
  await page.goto("/?crewInvite=d3333333-3333-4333-8333-333333333333#crew");
  await expect(page).toHaveURL(/\/#crew$/);
  await expect(
    page.getByText("Crew invite ready — sign in to review and join this private crew."),
  ).toBeVisible();
  await page.goto("/login?next=%2F%23crew");
  await page.getByRole("button", { name: "Email me a sign-in link", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Email sign-in link" })).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveCount(0);
});

test("crew coordination pings, polls, trivia predictions and private medical card work end-to-end", async ({
  page,
}) => {
  await guest(page);
  await page.goto("/#crew");

  // 1. Safe check-in ping & Crew poll
  await page.getByRole("button", { name: "I’m safe" }).click();
  await expect(page.getByText("I’m safe and checked in")).toBeVisible();

  await page.getByRole("button", { name: "Crew poll" }).click();
  await page.getByRole("button", { name: "Post poll" }).click();
  await expect(page.getByText("Which stage next?")).toBeVisible();

  // 2. Festival extras -> Trivia & picks -> Save predictions
  await page.getByRole("button", { name: /Festival extras/ }).click();
  await page.getByRole("button", { name: "Trivia & picks" }).click();
  await expect(page.getByText("Sound of Summer facts quiz")).toBeVisible();
  await page.getByRole("button", { name: "Save my predictions" }).click();
  await page.getByRole("button", { name: "Done" }).click();

  // 3. Emergency & first aid -> private medical card
  await page.getByRole("button", { name: "Emergency and first aid" }).click();
  await page.getByRole("button", { name: "Add private medical & ICE card" }).click();
  await page.getByLabel("Emergency contact name").fill("Maya");
  await page.getByLabel("Blood type (optional)").fill("O+");
  await page.getByRole("button", { name: "Save on this phone" }).click();
  await expect(page.getByText("ICE contact:")).toBeVisible();
  await expect(page.getByText("O+")).toBeVisible();
});
