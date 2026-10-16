import type { Page } from "@playwright/test";
import type { CallerFrequencyResponse } from "../../src/features/analytics/api";

export const callerFrequency: CallerFrequencyResponse = {
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

export const emptyCallerFrequency: CallerFrequencyResponse = {
  summary: {
    total_calls: 0,
    distinct_callers: 0,
    one_time_callers: 0,
    repeat_callers: 0,
  },
  distribution: [],
  top_callers: [],
};

export async function installApiMocks(
  page: Page,
  overrides: { callerFrequency?: CallerFrequencyResponse } = {},
) {
  const callerFrequencyResponse = overrides.callerFrequency ?? callerFrequency;

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
        await route.fulfill({ json: callerFrequencyResponse });
        break;
      default:
        await route.fulfill({
          status: 404,
          json: { detail: "Unexpected test endpoint" },
        });
    }
  });
}