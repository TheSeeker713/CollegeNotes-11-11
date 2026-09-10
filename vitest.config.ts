import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));
const alias = {
  '@collegenotes/domain': path.join(root, 'packages/domain/src/index.ts'),
  '@collegenotes/ui': path.join(root, 'packages/ui/src/index.ts'),
  '@collegenotes/learning': path.join(root, 'packages/learning/src/index.ts'),
  '@collegenotes/visuals': path.join(root, 'packages/visuals/src/index.ts'),
  '@collegenotes/storage': path.join(root, 'packages/storage/src/index.ts'),
  '@collegenotes/providers': path.join(root, 'packages/providers/src/index.ts'),
  '@collegenotes/importers': path.join(root, 'packages/importers/src/index.ts')
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node'
        }
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node'
        }
      },
      {
        resolve: { alias },
        test: {
          name: 'evals',
          include: ['tests/evals/**/*.eval.ts'],
          environment: 'node'
        }
      }
    ]
  }
});
