import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('shell has no serious axe violations on home and settings', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const home = await new AxeBuilder({ page }).analyze();
  expect(home.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(home.violations, null, 2)).toEqual([]);
  await page.getByRole('link', { name: 'Settings' }).click();
  const settings = await new AxeBuilder({ page }).analyze();
  expect(settings.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(settings.violations, null, 2)).toEqual([]);
});
