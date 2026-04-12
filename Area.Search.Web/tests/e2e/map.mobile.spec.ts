import { test, expect, Page } from './fixtures';

test('should set mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/dist/');
  await page.waitForTimeout(5000);
  
  const size = page.viewportSize();
  expect(size?.width).toBe(375);
  expect(size?.height).toBe(667);
});

test('should set desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/dist/');
  await page.waitForTimeout(5000);
  
  const size = page.viewportSize();
  expect(size?.width).toBe(1200);
  expect(size?.height).toBe(800);
});