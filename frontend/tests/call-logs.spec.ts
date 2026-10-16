import { expect, test } from "@playwright/test";

test("index page shows the Unknown Call title", async ({ page }) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { name: "Unknown Call" })).toBeVisible();
});

test("analysis page shows the Analysis title", async ({ page }) => {
	await page.goto("/analysis");

	await expect(page.getByRole("heading", { name: "Analysis", exact: true })).toBeVisible();
});
