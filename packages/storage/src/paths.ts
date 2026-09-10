import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function defaultDataDir(): string {
  if (process.env.COLLEGENOTES_DATA_DIR) return path.resolve(process.env.COLLEGENOTES_DATA_DIR);
  return path.join(os.homedir(), 'Library', 'Application Support', 'CollegeNotes-11-11');
}

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveInside(root: string, rel: string): string {
  if (path.isAbsolute(rel) || rel.includes('\0')) {
    throw Object.assign(new Error('path_rejected'), { code: 'path_rejected' });
  }
  const rootResolved = path.resolve(root);
  const target = path.resolve(rootResolved, rel);
  const relToRoot = path.relative(rootResolved, target);
  if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
    throw Object.assign(new Error('path_rejected'), { code: 'path_rejected' });
  }
  return target;
}
