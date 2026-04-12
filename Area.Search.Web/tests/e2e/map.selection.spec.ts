import { test, expect, Page } from './fixtures';

async function waitForApp(page: Page) {
  await page.waitForTimeout(5000);
}

test.describe('Map App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dist/');
    await waitForApp(page);
  });

  test('should load map page', async ({ page }) => {
    await expect(page.locator('app-map, .map-page-container, google-map').first()).toBeVisible({ timeout: 15000 });
  });

  test('should have tabs', async ({ page }) => {
    const tabs = page.locator('p-tab, .p-tablist');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have filter column', async ({ page }) => {
    const filterCol = page.locator('.filter-column, .filter-container');
    await expect(filterCol.first()).toBeVisible({ timeout: 10000 });
  });
});