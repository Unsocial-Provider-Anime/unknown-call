import { expect, test } from "@playwright/test";
import {
  emptyCountryCodeDistribution,
  installApiMocks,
} from "./fixtures/api-mocks";

test.beforeEach(async ({ page }) => {
  await installApiMocks(page);
});

test("compares call volume and caller frequency by country code", async ({
  page,
}) => {
  await page.goto("/analysis");
  const section = page.getByRole("region", {
    name: "Country code call statistics",
  });

  await expect(
    page.getByRole("heading", { name: "Country Code Segmentation" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: "Total Calls" })
      .getByText("12", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: "Country Codes" })
      .getByText("2", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Calls by country code: 852: 9 calls; 44: 3 calls",
    }),
  ).toBeVisible();

  const rows = section.getByRole("grid", {
    name: "Country code call statistics",
  }).getByRole("row");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1).getByRole("gridcell")).toHaveText([
    "852",
    "9",
    "75.0%",
    "3",
    "2",
    "3",
  ]);
  await expect(rows.nth(2).getByRole("gridcell")).toHaveText([
    "44",
    "3",
    "25.0%",
    "3",
    "0",
    "1",
  ]);
});

test("shows an empty state when no calls are recorded", async ({ page }) => {
  await installApiMocks(page, {
    countryCodes: emptyCountryCodeDistribution,
  });
  await page.goto("/analysis");
  const section = page.getByRole("region", {
    name: "Country Code Segmentation",
  });

  await expect(
    section.getByRole("heading", { name: "No country codes recorded" }),
  ).toBeVisible();
  await expect(
    section.getByRole("group").getByText("0", { exact: true }),
  ).toHaveCount(2);
  await expect(section.getByRole("img")).toHaveCount(0);
  await expect(
    section.getByRole("grid", { name: "Country code call statistics" }),
  ).toHaveCount(0);
});
