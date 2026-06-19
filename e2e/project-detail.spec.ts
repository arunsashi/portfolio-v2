import { detailedProject, expect, test } from './fixtures';

/**
 * Project detail page — exercised against deterministic API fixtures (see
 * fixtures.ts), which include one learning project with `details` populated so
 * the internal `/projects/:slug` card link renders and the full journey runs.
 */
test.describe('project detail', () => {
  test('navigates home → card → detail → back', async ({ page }) => {
    await page.goto('/');

    const detailLink = page.locator(`a[href="/projects/${detailedProject.slug}"]`);
    await expect(detailLink).toBeVisible();
    await detailLink.click();

    await expect(page).toHaveURL(new RegExp(`/projects/${detailedProject.slug}$`));

    // Detail page promotes the project name to the page's single h1.
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(detailedProject.name);

    await page.getByRole('link', { name: /back to home/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('renders the project summary and is keyboard reachable (a11y)', async ({ page }) => {
    await page.goto(`/projects/${detailedProject.slug}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(detailedProject.name);
    await expect(page.getByText(detailedProject.details!.summary)).toBeVisible();

    // Back link is keyboard-focusable with visible focus, and returns home.
    const back = page.getByRole('link', { name: /back to home/i });
    await back.focus();
    await expect(back).toBeFocused();
    await back.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('card keeps the external "Live" link as a secondary action', async ({ page }) => {
    await page.goto('/');

    const live = page.getByRole('link', { name: /open live link in a new tab/i });
    await expect(live).toBeVisible();
    await expect(live).toHaveAttribute('href', detailedProject.url!);
    await expect(live).toHaveAttribute('target', '_blank');
  });
});
