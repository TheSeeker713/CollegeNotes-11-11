import { expect, test } from '@playwright/test';

test('keyboard can reach skip link and settings, and appearance persists', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Dark mode' }).check();
  await page.getByLabel('Theme').selectOption('brutalist');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'brutalist');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'brutalist');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
});

test('narrow menu is available below 768px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
});

test('invalid hash recovers without inventing course material', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/#/ocean/campus');
  await expect(page.getByRole('heading', { name: 'Add your first course' })).toBeVisible();
  await expect(page.getByText('Nothing recorded yet', { exact: false })).toHaveCount(0);
});
