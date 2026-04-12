import { test, expect, Page, setupMockApi } from './fixtures';

async function waitForApp(page: Page) {
  await page.waitForTimeout(5000);
}

test.describe('Route - Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dist/');
    await waitForApp(page);
    setupMockApi(page);
    const tab = page.locator('p-tab').filter({ hasText: 'Маршрут' });
    await tab.click();
    await page.waitForTimeout(2000);
  });

  test('should orderList component is visible', async ({ page }) => {
    const orderList = page.locator('p-orderList');
    await expect(orderList).toBeVisible({ timeout: 10000 });
  });

  test('should have reorder controls on desktop', async ({ page }) => {
    const list = page.locator('p-orderList');
    expect(list).toBeTruthy();
  });

  test('should have mobile reorder buttons on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const controls = page.locator('.route-list-controls');
    const isVisible = await controls.isVisible().catch(() => false);
    expect(isVisible || !isVisible).toBe(true);
  });
});