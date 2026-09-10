import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE } from '@collegenotes/domain';
import {
  checkoutHasNoPrivateDb,
  createCourse,
  getAppearance,
  getLayout,
  migrate,
  openStore,
  readOriginal,
  runInTransaction,
  setAppearance,
  setLayout,
  storeOriginal
} from '@collegenotes/storage';
import Database from 'better-sqlite3';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cn-store-'));
}

describe('storage', () => {
  it('creates, reads and updates courses and appearance', () => {
    const store = openStore(tmp());
    const course = createCourse(store, 'COMM 110');
    expect(course.name).toBe('COMM 110');
    expect(getAppearance(store)).toEqual(DEFAULT_APPEARANCE);
    setAppearance(store, { ...DEFAULT_APPEARANCE, theme: 'brutalist', mode: 'dark' });
    expect(getAppearance(store).theme).toBe('brutalist');
    const layout = setLayout(store, course.id, { order: ['notes', 'source', 'study', 'listen'], pinned: ['notes'] });
    expect(getLayout(store, course.id).pinned).toEqual(['notes']);
    expect(layout.order[0]).toBe('notes');
  });

  it('rolls back a failed transaction', () => {
    const store = openStore(tmp());
    createCourse(store, 'Keep');
    expect(() => runInTransaction(store, () => {
      createCourse(store, 'Temp');
      throw new Error('boom');
    })).toThrow('boom');
    expect(store.db.prepare('select count(*) as n from courses').get() as { n: number }).toEqual({ n: 1 });
  });

  it('migrates a fresh and an existing database', () => {
    const dir = tmp();
    const first = openStore(dir);
    const v1 = migrate(first.db);
    first.db.close();
    const second = openStore(dir);
    expect(migrate(second.db)).toBe(v1);
    const empty = new Database(':memory:');
    expect(migrate(empty)).toBeGreaterThan(0);
  });

  it('keeps original file bytes after reopen', () => {
    const dir = tmp();
    const store = openStore(dir);
    const course = createCourse(store, 'Files');
    const doc = storeOriginal(store, course.id, 'page.png', Buffer.from('hello-original'));
    store.db.close();
    const again = openStore(dir);
    expect(readOriginal(again, doc).toString()).toBe('hello-original');
  });

  it('does not keep the authoritative database in the git checkout', () => {
    expect(checkoutHasNoPrivateDb(process.cwd())).toBe(true);
  });
});
