import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@collegenotes/domain': path.join(root, 'packages/domain/src/index.ts'),
      '@collegenotes/ui': path.join(root, 'packages/ui/src/index.ts'),
      '@collegenotes/visuals': path.join(root, 'packages/visuals/src/index.ts'),

    }
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true }
});
