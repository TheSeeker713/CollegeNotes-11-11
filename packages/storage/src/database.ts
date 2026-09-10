import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { defaultDataDir, ensureDir } from './paths.js';
import { migrate } from './migrations.js';

export type Store = {
  db: Database.Database;
  dataDir: string;
  originalsDir: string;
};

export function openStore(dataDir = defaultDataDir()): Store {
  const root = ensureDir(dataDir);
  const originalsDir = ensureDir(path.join(root, 'originals'));
  const db = new Database(path.join(root, 'collegenotes.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  try { migrate(db); } catch (error) { db.close(); throw error; }
  return { db, dataDir: root, originalsDir };
}

export function isInsideGitCheckout(dataDir: string, checkoutRoot: string): boolean {
  const rel = path.relative(path.resolve(checkoutRoot), path.resolve(dataDir));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export function checkoutHasNoPrivateDb(checkoutRoot: string): boolean {
  return !fs.existsSync(path.join(checkoutRoot, 'collegenotes.sqlite'));
}
