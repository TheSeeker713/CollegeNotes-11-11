import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'apps/web/public/workers');
fs.mkdirSync(dest, { recursive: true });

function copyFrom(pkg, rel, name) {
  const source = path.join(path.dirname(require.resolve(`${pkg}/package.json`)), rel);
  const target = path.join(dest, name);
  fs.copyFileSync(source, target);
  return { source, target, bytes: fs.statSync(target).size };
}

const copied = [
  copyFrom('pdfjs-dist', 'build/pdf.worker.mjs', 'pdf.worker.mjs'),
  copyFrom('tesseract.js', 'dist/worker.min.js', 'tesseract.worker.min.js')
];
fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify({ copied, cdn: false }, null, 2) + '\n');
console.log(JSON.stringify(copied, null, 2));
