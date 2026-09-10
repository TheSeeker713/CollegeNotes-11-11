import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { courseModules, setCourseModule, openStore, createCourse, courseCollection, editCourse, archiveCourse, setDraft, getDraft, storeOriginal, readOriginal, setLayout, getLayout, listCourses } from '@collegenotes/storage';
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

describe('Phase 5.2 course modules', () => {
  it('CHK-5.2-01 starts with all modules disabled and no material', () => {
    const s = fixture(); const a = createCourse(s, 'Synthetic');
    expect(courseModules(s, a.id)).toHaveLength(8); expect(courseModules(s, a.id).every(m => !m.enabled)).toBe(true);
    expect(s.db.prepare('select count(*) as n from source_documents').get()).toEqual({n:0}); s.db.close();
  });
  it('CHK-5.2-02 persists module choices independently after restart', () => {
    let s = fixture(); const dir = s.dataDir; const a = createCourse(s, 'A'); const b = createCourse(s, 'B');
    setCourseModule(s, a.id, 'notes', true); s.db.close(); s = openStore(dir);
    expect(courseModules(s, a.id).find(m => m.moduleId === 'notes')?.enabled).toBe(true);
    expect(courseModules(s, b.id).every(m => !m.enabled)).toBe(true); s.db.close();
  });
  it('CHK-5.2-03 rejects invalid IDs/values through service and repository', async () => {
    const s = fixture(); const a = createCourse(s, 'A'); const app = createService(s);
    expect(() => setCourseModule(s,a.id,'unknown',true)).toThrow('invalid_module');
    for (const enabled of [1,'true',null]) expect((await app.inject({method:'PUT',url:`/courses/${a.id}/modules/notes`,payload:{enabled}})).statusCode).toBe(400);
    expect((await app.inject({method:'PUT',url:`/courses/${a.id}/modules/notes`,payload:{enabled:true}})).statusCode).toBe(200);
    archiveCourse(s,a.id,true); expect(() => setCourseModule(s,a.id,'notes',false)).toThrow('course_unavailable');
    await app.close(); s.db.close();
  });
  it('CHK-5.2-04 disabling preserves notes/layouts and leaves providers alone', () => {
    const s = fixture(); const a = createCourse(s,'A'); setCourseModule(s,a.id,'notes',true);
    setDraft(s,{key:'note',courseId:a.id,body:'Keep'}); setCourseModule(s,a.id,'notes',false);
    setCourseModule(s,a.id,'tutoring',true); expect(getDraft(s,'note')?.body).toBe('Keep');
    expect(s.db.prepare('select count(*) as n from connections').get()).toEqual({n:0});
    expect(s.db.prepare('select count(*) as n from capability_assignments').get()).toEqual({n:0}); s.db.close();
  });
});
