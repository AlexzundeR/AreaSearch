import { test, expect, Page } from './fixtures';

test('should load app', async ({ page }) => {
  await page.goto('/dist/');
  await page.waitForTimeout(5000);
  
  const body = await page.locator('body').innerHTML();
  expect(body.length).toBeGreaterThan(100);
});