import { expect, test } from "@playwright/test";
import {
  callerFrequency,
  emptyCallerFrequency,
  installApiMocks,
} from "./fixtures/api-mocks";

test.beforeEach(async ({ page }) => {
  await installApiMocks(page);
});

test.describe("caller frequency", () => {
  test("shows metrics, exact frequency buckets and ranked country-aware callers", async ({
    page,
  }, testInfo) => {
    await page.goto("/analysis");
    const section = page.getByRole("region", {
      name: "Caller Frequency Distribution",
      exact: true,
    });
    for (const [label, count] of [
      ["Total Calls", "9"],
      ["Distinct Callers", "4"],
      ["One-time Callers", "2"],
      ["Repeat Callers", "2"],
    ]) {
      await expect(
        section
          .getByRole("group", { name: label, exact: true })
          .getByText(count, { exact: true }),
      ).toBeVisible();
    }
    await expect(
      section.getByRole("img", {
        name: "Caller frequency distribution: 1 call: 2 callers; 2 calls: 1 caller; 5 calls: 1 caller",
      }),
    ).toBeVisible();
    const rows = section
      .getByRole("grid", { name: "Top repeat callers" })
      .getByRole("row");
    await expect(rows).toHaveCount(5);
    for (const [index, caller] of callerFrequency.top_callers.entries()) {
      await expect(rows.nth(index + 1).getByRole("gridcell")).toHaveText([
        caller.country_code,
        caller.caller_number,
        String(caller.call_count),
      ]);
    }
    await section.screenshot({
      path: testInfo.outputPath("caller-frequency-desktop.png"),
    });
  });

  test("shows zero metrics and an empty state without a chart or grid", async ({
    page,
  }) => {
    await page.route("**/api/calls/caller-frequency", async (route) => {
      await route.fulfill({ json: emptyCallerFrequency });
    });
    await page.goto("/analysis");
    const section = page.getByRole("region", {
      name: "Caller Frequency Distribution",
      exact: true,
    });
    await expect(
      section.getByRole("heading", { name: "No callers recorded" }),
    ).toBeVisible();
    await expect(
      section.getByRole("group").getByText("0", { exact: true }),
    ).toHaveCount(4);
    await expect(section.getByRole("img")).toHaveCount(0);
    await expect(section.getByRole("grid")).toHaveCount(0);
  });

  test("waits for the initial loader query before displaying results", async ({
    page,
  }) => {
    let requested = false;
    let releaseResponse = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    await page.route("**/api/calls/caller-frequency", async (route) => {
      requested = true;
      await gate;
      await route.fulfill({ json: callerFrequency });
    });
    try {
      await page.goto("/analysis");
      await expect.poll(() => requested).toBe(true);
      await expect(
        page.getByRole("heading", { name: "Analysis", exact: true }),
      ).not.toBeVisible();
    } finally {
      releaseResponse();
    }
    await expect(
      page.getByRole("heading", { name: "Caller Frequency Distribution" }),
    ).toBeVisible();
  });

  for (const failure of ["HTTP error", "invalid response"] as const) {
    test(`keeps other sections visible after ${failure} and recovers on Retry`, async ({
      page,
    }) => {
      test.setTimeout(45000);
      let failing = true;
      await page.route("**/api/calls/caller-frequency", async (route) => {
        if (!failing) {
          await route.fulfill({ json: callerFrequency });
        } else if (failure === "HTTP error") {
          await route.fulfill({
            status: 500,
            json: { detail: "Frequency unavailable" },
          });
        } else {
          await route.fulfill({
            json: {
              ...callerFrequency,
              summary: { ...callerFrequency.summary, total_calls: -1 },
            },
          });
        }
      });
      await page.goto("/analysis");
      const section = page.getByRole("region", {
        name: "Caller Frequency Distribution",
        exact: true,
      });
      await expect(section.getByRole("alert")).toContainText(
        "Could not load caller frequency",
        { timeout: 30000 },
      );
      await expect(
        page.getByRole("heading", { name: "Hourly Distribution (Peak Hours)" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Error", exact: true }),
      ).toHaveCount(0);
      failing = false;
      await section.getByRole("button", { name: "Retry" }).click();
      await expect(
        section.getByRole("grid", { name: "Top repeat callers" }),
      ).toBeVisible();
      await expect(section.getByRole("alert")).toHaveCount(0);
    });
  }

  for (const width of [320, 390]) {
    test(`contains chart and table scrolling at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/analysis");
      const section = page.getByRole("region", {
        name: "Caller Frequency Distribution",
        exact: true,
      });
      await expect(
        section.getByRole("grid", { name: "Top repeat callers" }),
      ).toBeVisible();
      const chart = section.getByRole("region", {
        name: "Scrollable caller frequency chart",
      });
      await expect
        .poll(() =>
          chart.evaluate(
            (element) => element.scrollWidth > element.clientWidth,
          ),
        )
        .toBe(true);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      const metric = section.getByRole("group", {
        name: "Distinct Callers",
        exact: true,
      });
      await expect(metric).toBeVisible();
      await expect
        .poll(() =>
          metric.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        )
        .toBe(true);
      await section.screenshot({
        path: testInfo.outputPath(`caller-frequency-${width}.png`),
      });
    });
  }
});