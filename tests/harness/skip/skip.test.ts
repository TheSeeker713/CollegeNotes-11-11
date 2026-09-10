import { expect, test } from 'vitest';
test.skip('skipped fixture must fail the required gate', () => {
  expect(true).toBe(true);
});
