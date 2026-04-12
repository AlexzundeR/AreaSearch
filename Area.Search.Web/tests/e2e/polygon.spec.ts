import { test, expect, Page, setupMockApi, mockGoogleMaps } from './fixtures';

async function waitForApp(page: Page) {
  await page.waitForTimeout(5000);
}

test.describe('Polygon (TerraDraw)', () => {
  test.beforeEach(async ({ page }) => {
    mockGoogleMaps(page);
    await page.goto('/dist/');
    await waitForApp(page);
    setupMockApi(page);
  });

  test('should have polygon draw button', async ({ page }) => {
    const drawButton = page.locator('button[title*="полигон"]').first();
    await expect(drawButton).toBeVisible({ timeout: 10000 });
  });

  test('should have polygon delete button', async ({ page }) => {
    const deleteButton = page.locator('button[title*="Удалить полигон"]');
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Polygon - Use in Filter', () => {
  test.beforeEach(async ({ page }) => {
    mockGoogleMaps(page);
    await page.goto('/dist/');
    await waitForApp(page);
    setupMockApi(page);
  });

  test('should useMapPolygon checkbox work', async ({ page }) => {
    const checkbox = page.locator('input#useMapPolygon');
    await checkbox.check();
    await page.waitForTimeout(500);
    
    const findButton = page.locator('button').filter({ hasText: 'Найти' });
    await findButton.click();
    await page.waitForTimeout(2000);
    
    const resultsCount = page.locator('b:has-text("Найдено:")');
    await expect(resultsCount).toBeVisible({ timeout: 10000 });
  });
});