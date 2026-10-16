import { expect, test } from "@playwright/test";
import type { CallerFrequencyResponse } from "../src/features/analytics/api";

const callerFrequency: CallerFrequencyResponse = {
  summary: {
    total_calls: 9,
    distinct_callers: 4,
    one_time_callers: 2,
    repeat_callers: 2,
  },
  distribution: [
    { calls_per_caller: 1, caller_count: 2 },
    { calls_per_caller: 2, caller_count: 1 },
    { calls_per_caller: 5, caller_count: 1 },
  ],
  top_callers: [
    { country_code: "852", caller_number: "0012XXXX", call_count: 5 },
    { country_code: "852", caller_number: "3456XXXX", call_count: 2 },
    { country_code: "44", caller_number: "0012XXXX", call_count: 1 },
    { country_code: "852", caller_number: "7890XXXX", call_count: 1 },
  ],
};

const emptyCallerFrequency: CallerFrequencyResponse = {
  summary: {
    total_calls: 0,
    distinct_callers: 0,
    one_time_callers: 0,
    repeat_callers: 0,
  },
  distribution: [],
  top_callers: [],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/calls/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    switch (path) {
      case "/api/calls/list":
        await route.fulfill({ json: { call_logs: [] } });
        break;
      case "/api/calls/volume":
        await route.fulfill({ json: { period: "day", points: [] } });
        break;
      case "/api/calls/hourly":
        await route.fulfill({ json: { points: [] } });
        break;
      case "/api/calls/day-of-week":
        await route.fulfill({
          json: {
            days: [],
            weekday: { call_count: 0, observed_days: 0, calls_per_day: 0 },
            weekend: { call_count: 0, observed_days: 0, calls_per_day: 0 },
            rate_ratio: null,
            confidence_interval_95: null,
            p_value: null,
            test_available: false,
            test_unavailable_reason: "No observed dates.",
          },
        });
        break;
      case "/api/calls/caller-frequency":
        await route.fulfill({ json: callerFrequency });
        break;
      default:
        await route.fulfill({
          status: 404,
          json: { detail: "Unexpected test endpoint" },
        });
    }
  });
});

test("index page shows the Unknown Call title", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Unknown Call" }),
  ).toBeVisible();
});

test("analysis page shows the Analysis title", async ({ page }) => {
  await page.goto("/analysis");

  await expect(
    page.getByRole("heading", { name: "Analysis", exact: true }),
  ).toBeVisible();
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
      ["Calls with identifiers", "9"],
      ["Distinct identifiers", "4"],
      ["One-time identifiers", "2"],
      ["Repeat identifiers", "2"],
    ]) {
      await expect(
        section
          .getByRole("group", { name: label, exact: true })
          .getByText(count, { exact: true }),
      ).toBeVisible();
    }
    await expect(
      section.getByRole("img", {
        name: "Caller frequency distribution: 1 call: 2 identifiers; 2 calls: 1 identifier; 5 calls: 1 identifier",
      }),
    ).toBeVisible();
    const rows = section
      .getByRole("grid", { name: "Top recorded callers" })
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
      section.getByRole("heading", { name: "No caller identifiers recorded" }),
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
        section.getByRole("grid", { name: "Top recorded callers" }),
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
        section.getByRole("grid", { name: "Top recorded callers" }),
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
        name: "Distinct identifiers",
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
