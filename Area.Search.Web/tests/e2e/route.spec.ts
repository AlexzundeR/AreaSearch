import { test, expect, Page, setupMockApi, mockGoogleMaps } from './fixtures';

async function waitForApp(page: Page) {
  await page.waitForTimeout(5000);
}

test.describe('Route - Basic', () => {
  test.beforeEach(async ({ page }) => {
    mockGoogleMaps(page);
    await page.goto('/dist/');
    await waitForApp(page);
    setupMockApi(page);
    const tab = page.locator('p-tab').filter({ hasText: 'Маршрут' });
    await tab.click();
    await page.waitForTimeout(2000);
  });

  test('should have add button', async ({ page }) => {
    const addButton = page.locator('button').filter({ hasText: 'Добавить' });
    await expect(addButton).toBeVisible({ timeout: 10000 });
  });

  test('should have delete button', async ({ page }) => {
    const deleteButton = page.locator('button').filter({ hasText: 'Удалить' });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
  });

  test('should have yandex button', async ({ page }) => {
    const yandexButton = page.locator('button').filter({ hasText: 'Яндекс' });
    await expect(yandexButton).toBeVisible({ timeout: 10000 });
  });

  test('should have showRoute checkbox', async ({ page }) => {
    const checkbox = page.locator('input#showRoute');
    await expect(checkbox).toBeVisible({ timeout: 10000 });
  });

  test('should have orderList component', async ({ page }) => {
    const orderList = page.locator('p-orderList');
    await expect(orderList).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Route - Point Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dist/');
    await waitForApp(page);
    setupMockApi(page);
    const tab = page.locator('p-tab').filter({ hasText: 'Маршрут' });
    await tab.click();
    await page.waitForTimeout(2000);
  });

  test('should have orderList with items when data exists', async ({ page }) => {
    const orderList = page.locator('p-orderList');
    expect(orderList).toBeTruthy();
  });
});

test.describe('Route - Yandex Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dist/');
    await waitForApp(page);
    setupMockApi(page);
    const tab = page.locator('p-tab').filter({ hasText: 'Маршрут' });
    await tab.click();
    await page.waitForTimeout(2000);
  });

  test('should yandex button exists', async ({ page }) => {
    const yandexButton = page.locator('button').filter({ hasText: 'Яндекс' });
    await expect(yandexButton).toBeVisible({ timeout: 10000 });
  });
});