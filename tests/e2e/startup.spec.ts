import { expect, test } from '@playwright/test';

test('web harness renders default botanical light', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Continue where you stopped.' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'botanical');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
});
