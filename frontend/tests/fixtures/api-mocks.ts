import type { Page } from "@playwright/test";
import type {
  CallerFrequencyResponse,
  CountryCodeDistributionResponse,
} from "../../src/features/analytics/api";

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

export const countryCodeDistribution: CountryCodeDistributionResponse = {
  summary: { total_calls: 12, distinct_country_codes: 2 },
  countries: [
    {
      country_code: "852",
      call_count: 9,
      call_share: 0.75,
      distinct_callers: 3,
      one_time_callers: 1,
      repeat_callers: 2,
      calls_per_caller: 3,
    },
    {
      country_code: "44",
      call_count: 3,
      call_share: 0.25,
      distinct_callers: 3,
      one_time_callers: 3,
      repeat_callers: 0,
      calls_per_caller: 1,
    },
  ],
};

export const emptyCountryCodeDistribution: CountryCodeDistributionResponse = {
  summary: { total_calls: 0, distinct_country_codes: 0 },
  countries: [],
};

export async function installApiMocks(
  page: Page,
  overrides: {
    callerFrequency?: CallerFrequencyResponse;
    countryCodes?: CountryCodeDistributionResponse;
  } = {},
) {
  const callerFrequencyResponse = overrides.callerFrequency ?? callerFrequency;
  const countryCodesResponse =
    overrides.countryCodes ?? countryCodeDistribution;

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
      case "/api/calls/country-codes":
        await route.fulfill({ json: countryCodesResponse });
        break;
      default:
        await route.fulfill({
          status: 404,
          json: { detail: "Unexpected test endpoint" },
        });
    }
  });
}