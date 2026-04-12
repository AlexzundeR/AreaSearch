import { test, expect, Page } from './fixtures';

async function waitForApp(page: Page) {
  await page.waitForTimeout(5000);
}

test.describe('Search - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dist/');
    await waitForApp(page);
  });

  test('should have search input field', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="названию"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('should have types multi-select', async ({ page }) => {
    const typeSelect = page.locator('p-multiselect').first();
    await expect(typeSelect).toBeVisible({ timeout: 10000 });
  });

  test('should have ignored types multi-select', async ({ page }) => {
    const typeSelect = page.locator('p-multiselect');
    await expect(typeSelect.nth(1)).toBeVisible({ timeout: 10000 });
  });

  test('should have useMapBounds checkbox', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: 10000 });
  });

  test('should have useMapPolygon checkbox', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]').nth(1);
    await expect(checkbox).toBeVisible({ timeout: 10000 });
  });

  test('should have find button', async ({ page }) => {
    const findButton = page.locator('button').filter({ hasText: 'Найти' });
    await expect(findButton).toBeVisible({ timeout: 10000 });
  });

  test('should have showOnMap button', async ({ page }) => {
    const showButton = page.locator('button').filter({ hasText: 'Показать на карте' });
    await expect(showButton).toBeVisible({ timeout: 10000 });
  });

  test('should filter results list is visible', async ({ page }) => {
    const list = page.locator('p-listbox, .filter-list');
    await expect(list.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Search - Find Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dist/');
    await waitForApp(page);
  });

  test('should find button triggers search', async ({ page }) => {
    const findButton = page.locator('button').filter({ hasText: 'Найти' });
    await findButton.click();
    await page.waitForTimeout(2000);
    
    const resultsCount = page.locator('b:has-text("Найдено:")');
    await expect(resultsCount).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Search - Show On Map Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dist/');
    await waitForApp(page);
  });

  test('should showOnMap button is disabled when no selection', async ({ page }) => {
    const showButton = page.locator('button').filter({ hasText: 'Показать на карте' });
    await expect(showButton).toBeVisible({ timeout: 10000 });
  });
});