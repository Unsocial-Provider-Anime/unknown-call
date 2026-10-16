import { expect, test, type Page } from '@playwright/test';
import type { CallLog } from '../src/features/call-logs/api';
import { filterCallLogs } from '../src/features/call-logs/model';

const apiFixtures: Record<string, unknown> = {
  '/api/calls/list': {
    call_logs: [
      {
        id: 1,
        date: '2025-01-10',
        time: '10:30:00',
        country_code: 'US',
        caller_number: '+1-555-0101',
      },
      {
        id: 2,
        date: '2025-01-11',
        time: '14:45:00',
        country_code: 'GB',
        caller_number: '+44-20-5550-0102',
      },
    ],
  },
  '/api/calls/volume': {
    period: 'day',
    points: [
      { date: '2025-01-10', count: 1 },
      { date: '2025-01-11', count: 2 },
    ],
  },
  '/api/calls/hourly': {
    points: [
      { hour: 9, count: 4 },
      { hour: 10, count: 4 },
    ],
  },
  '/api/calls/day-of-week': {
    days: [
      { day: 'Monday', call_count: 1, observed_days: 1, calls_per_day: 1 },
      { day: 'Tuesday', call_count: 1, observed_days: 1, calls_per_day: 1 },
      { day: 'Wednesday', call_count: 0, observed_days: 0, calls_per_day: 0 },
      { day: 'Thursday', call_count: 0, observed_days: 0, calls_per_day: 0 },
      { day: 'Friday', call_count: 0, observed_days: 0, calls_per_day: 0 },
      { day: 'Saturday', call_count: 0, observed_days: 0, calls_per_day: 0 },
      { day: 'Sunday', call_count: 0, observed_days: 0, calls_per_day: 0 },
    ],
    weekday: { call_count: 2, observed_days: 2, calls_per_day: 1 },
    weekend: { call_count: 0, observed_days: 0, calls_per_day: 0 },
    rate_ratio: null,
    confidence_interval_95: null,
    p_value: null,
    test_available: false,
    test_unavailable_reason: 'Insufficient observations for comparison.',
  },
};

const modelCallLogs: CallLog[] = [
  {
    id: 1,
    date: '2025-01-10',
    time: '10:30:00',
    country_code: 'US',
    caller_number: '+1-555-0101',
  },
  {
    id: 2,
    date: '2025-01-11',
    time: '14:45:00',
    country_code: 'GB',
    caller_number: '+44-20-5550-0102',
  },
];

test('filters call-log model case-insensitively with inclusive date bounds', () => {
  expect(
    filterCallLogs(modelCallLogs, {
      search: 'us',
      countryCode: 'all',
      dateFrom: '2025-01-10',
      dateTo: '2025-01-10',
    }).map((log) => log.id),
  ).toEqual([1]);
  expect(
    filterCallLogs(modelCallLogs, {
      search: '',
      countryCode: 'all',
      dateFrom: '2025-01-11',
      dateTo: '2025-01-10',
    }),
  ).toEqual([]);
});

async function mockApi(page: Page) {
  await page.route('**/api/calls/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const response = apiFixtures[pathname];

    if (response === undefined) {
      await route.fulfill({ status: 404, body: 'Unknown API endpoint' });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

test('filters call records and clears the search', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  expect(new URL(page.url()).search).toBe('');

  await expect(
    page.getByRole('heading', { name: 'Unknown Call' }),
  ).toBeVisible();
  await expect(page.getByText('Showing 2 of 2 calls')).toBeVisible();

  await page.getByRole('textbox', { name: 'Search calls' }).fill('5550-0102');
  await expect(page.getByText('Showing 1 of 2 calls')).toBeVisible();
  await expect(page.getByText('+44-20-5550-0102')).toBeVisible();

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText('Showing 2 of 2 calls')).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
});

test('hydrates filters from a shareable URL and clears them back to defaults', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto(
    '/?search=5550-0102&countryCode=GB&dateFrom=2025-01-11&dateTo=2025-01-11',
  );

  await expect(page.getByText('Showing 1 of 2 calls')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search calls' })).toHaveValue(
    '5550-0102',
  );

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText('Showing 2 of 2 calls')).toBeVisible();
  const clearedUrl = new URL(page.url());
  expect(clearedUrl.search).toBe('');
});

test('shows the empty call-log state', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/calls/list', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ call_logs: [] }),
    });
  });
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'No call records yet' }),
  ).toBeVisible();
});

test('rejects malformed call-log API data', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/calls/list', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ call_logs: [{ id: 'invalid' }] }),
    });
  });
  await page.goto('/');

  await expect(page.getByText(/Could not load call records:/)).toBeVisible({
    timeout: 15_000,
  });
});

test('shows call-log errors and recovers on retry', async ({ page }) => {
  let shouldFail = true;
  await mockApi(page);
  await page.route('**/api/calls/list', async (route) => {
    if (shouldFail) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Service temporarily unavailable' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiFixtures['/api/calls/list']),
    });
  });
  await page.goto('/');

  await expect(
    page.getByText('Could not load call records: Service temporarily unavailable'),
  ).toBeVisible({ timeout: 15_000 });
  shouldFail = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Showing 2 of 2 calls')).toBeVisible();
});

test('navigates to analysis and reloads volume for a selected interval', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Analysis' }).click();

  await expect(
    page.getByRole('heading', { name: 'Call Volume Trends Over Time' }),
  ).toBeVisible();
  const weeklyRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === '/api/calls/volume' && url.searchParams.get('period') === 'week';
  });

  await page.getByRole('combobox', { name: 'Interval' }).click();
  await page.getByRole('option', { name: 'Weekly' }).click();
  await weeklyRequest;

  await expect(
    page.getByRole('img', { name: 'Call volume by week, 2 time periods' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Hourly Distribution (Peak Hours)' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Day-of-the-Week Analysis' }),
  ).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Peak:' })).toHaveText(
    'Peak: 09:00, 10:00 (4 calls)',
  );
  await expect(
    page.getByText('Insufficient observations for comparison.'),
  ).toBeVisible();
});

test('shows empty states for analytics panels', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/calls/volume**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ period: 'day', points: [] }),
    });
  });
  await page.route('**/api/calls/hourly', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ points: [] }),
    });
  });
  await page.route('**/api/calls/day-of-week', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        days: [],
        weekday: { call_count: 0, observed_days: 0, calls_per_day: 0 },
        weekend: { call_count: 0, observed_days: 0, calls_per_day: 0 },
        rate_ratio: null,
        confidence_interval_95: null,
        p_value: null,
        test_available: false,
        test_unavailable_reason: null,
      }),
    });
  });
  await page.goto('/analysis');

  await expect(
    page.getByText('There are no calls to plot for this period.'),
  ).toBeVisible();
  await expect(page.getByText('No hourly data available')).toBeVisible();
  await expect(
    page.getByText('There are no observed dates to compare.'),
  ).toBeVisible();
});
