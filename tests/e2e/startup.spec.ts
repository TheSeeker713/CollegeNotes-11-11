import { expect, test } from '@playwright/test';

test('empty workspace offers add-first-course and botanical light default', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Add your first course' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'botanical');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
});
