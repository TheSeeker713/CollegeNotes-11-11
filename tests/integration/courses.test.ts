import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openStore, createCourse, courseCollection, editCourse, archiveCourse, setDraft, getDraft, storeOriginal, readOriginal, setLayout, getLayout, listCourses } from '@collegenotes/storage';
import { createService } from '../../apps/local-service/src/index.js';
const dirs: string[] = [];
function fixture() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-course-')); dirs.push(dir); return openStore(dir); }
afterEach(() => { for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });
describe('Phase 5.1 course collection', () => {
  it('CHK-5.1-01 starts empty and edits only the selected course', () => {
    const s = fixture(); expect(courseCollection(s)).toEqual([]);
    const a = createCourse(s, 'Synthetic A'); const b = createCourse(s, 'Synthetic B');
    expect(editCourse(s, a.id, { name: 'Renamed', description: 'User writing' }).description).toBe('User writing');
    expect(courseCollection(s).find(c => c.id === b.id)?.name).toBe('Synthetic B'); s.db.close();
  });
  it('CHK-5.1-02 archive/restore preserve originals, notes and layouts after restart', () => {
    let s = fixture(); const dir = s.dataDir; const a = createCourse(s, 'Synthetic');
    const doc = storeOriginal(s, a.id, 'example.txt', Buffer.from('Original'));
    setDraft(s, { key: `note:${a.id}`, courseId: a.id, body: 'Keep my writing' });
    setLayout(s, a.id, { order: ['notes','source','study','listen'], pinned: ['notes'] });
    archiveCourse(s, a.id, true); expect(listCourses(s)).toEqual([]); s.db.close(); s = openStore(dir);
    expect(courseCollection(s)[0]?.archivedAt).toBeTruthy(); archiveCourse(s, a.id, false);
    expect(readOriginal(s, doc).toString()).toBe('Original'); expect(getDraft(s, `note:${a.id}`)?.body).toBe('Keep my writing');
    expect(getLayout(s, a.id).pinned).toEqual(['notes']); expect(listCourses(s)).toHaveLength(1); s.db.close();
  });
  it('CHK-5.1-03 duplicate names remain distinct', () => {
    const s = fixture(); const a = createCourse(s, 'Same'); const b = createCourse(s, 'Same');
    expect(a.id).not.toBe(b.id); archiveCourse(s, a.id, true); expect(listCourses(s).map(c => c.id)).toEqual([b.id]); s.db.close();
  });
  it('CHK-5.1-04 validates input and rejects writes to archived/missing courses', async () => {
    const s = fixture(); const app = createService(s); const a = createCourse(s, 'Synthetic'); archiveCourse(s, a.id, true);
    for (const body of [{name:''},{name:3},{name:'x',description:3},{name:'x'.repeat(201)}]) {
      expect((await app.inject({method:'POST',url:'/courses',payload:body})).statusCode).toBe(400);
    }
    expect((await app.inject({method:'PUT',url:'/courses/missing',payload:{name:'X'}})).statusCode).toBe(404);
    expect((await app.inject({method:'PUT',url:`/courses/${a.id}/layout`,payload:{}})).statusCode).toBe(404);
    expect(() => setDraft(s,{key:'x',courseId:a.id,body:'bad'})).toThrow('course_unavailable');
    const created = (await app.inject({method:'POST',url:'/courses',payload:{name:' New ',description:'Text'}})).json();
    expect(created.name).toBe('New'); expect(created.description).toBe('Text');
    await app.close(); s.db.close();
  });
});
