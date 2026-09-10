import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/harness/**/*.test.ts'],
    passWithNoTests: false
  }
});
