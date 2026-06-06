import { expect, test } from '@playwright/test';

/**
 * Baseline smoke suite — structural assertions that must always hold, stable
 * regardless of the live news/profile data. The QA agent extends e2e coverage
 * per change in sibling spec files.
 */

test.describe('home', () => {
  test('boots without falling to the error page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Arun Sudi/i);

    // The page-loader flips to a themed error screen if initial APIs don't
    // resolve. Its absence is our "the app loaded" signal.
    await expect(page.getByText(/try again later/i)).toHaveCount(0);
  });

  test('has the core landmarks and skip link (a11y)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a.skip-link')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
  });

  test('shows the Hire Me call to action', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /hire me/i })).toBeVisible();
  });
});

test.describe('news', () => {
  test('news page renders its heading', async ({ page }) => {
    await page.goto('/news');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
