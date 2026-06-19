import { expect, type Page, test } from '@playwright/test';

/**
 * Project detail page — the home → card → detail → back journey for projects
 * whose `details` are populated (the internal `/projects/:slug` route).
 *
 * Two environmental conditions are skipped (not failed) because they are outside
 * this change's control:
 *   - no project has `details` populated, so no internal card link renders;
 *   - the app can't reach its live API and falls to the global error page (the
 *     whole site degrades, not just this route).
 */

/** The global page-loader error state shown when bootstrap data fails to load. */
async function appFellToErrorPage(page: Page): Promise<boolean> {
  return (await page.getByText('Houston, we have a problem.').count()) > 0;
}

test.describe('project detail', () => {
  test('navigates home → card → detail → back', async ({ page }) => {
    await page.goto('/');
    test.skip(await appFellToErrorPage(page), 'App could not load live data in this environment.');

    const detailLink = page.locator('a[href^="/projects/"]').first();
    const hasInternalProject = (await detailLink.count()) > 0;
    test.skip(!hasInternalProject, 'No project with populated details in live data.');

    await detailLink.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+$/);

    // Detail page promotes the project name to the page's single h1.
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveCount(1);

    await page.getByRole('link', { name: /back to home/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('renders the project name as the page h1 (data-driven)', async ({ page, request }) => {
    const res = await request.get('/api/projects');
    test.skip(!res.ok(), 'Projects API unavailable in this environment.');
    const projects = (await res.json()) as { slug: string; name: string }[];
    test.skip(projects.length === 0, 'No projects in live data.');

    const { slug, name } = projects[0];
    await page.goto(`/projects/${slug}`);
    test.skip(await appFellToErrorPage(page), 'App could not load live data in this environment.');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(name);

    // Back link is keyboard-reachable with visible focus, and returns home.
    const back = page.getByRole('link', { name: /back to home/i });
    await back.focus();
    await expect(back).toBeFocused();
    await back.click();
    await expect(page).toHaveURL(/\/$/);
  });
});
