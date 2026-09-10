import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { openStore, createCourse, storeOriginal, setDraft, setCourseModule, exportCourse, deleteCourse, checksum, courseCollection, listCourses, readOriginal, getDraft, setSession, getSession } from '@collegenotes/storage';
import { createService } from '../../apps/local-service/src/index.js';
const dirs: string[] = [];
function fixture() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-transfer-')); dirs.push(dir); return openStore(dir); }
afterEach(() => { vi.restoreAllMocks(); for (const dir of dirs.splice(0)) fs.rmSync(dir,{recursive:true,force:true}); });
it('CHK-5.3-01 exports original bytes, metadata, revisions, notes, modules and checksum', () => {
  const s = fixture(); const a = createCourse(s,'Synthetic export'); const bytes = Buffer.from([0,255,12,1]); const doc = storeOriginal(s,a.id,'bytes.bin',bytes);
  setDraft(s,{key:'note',courseId:a.id,body:'My words'}); setCourseModule(s,a.id,'notes',true);
  s.db.prepare("insert into material_revisions values (?,?,1,'Corrected text','[]','user',?)").run(doc.id,a.id,doc.createdAt);
  const result = exportCourse(s,a.id); const serialized = JSON.parse(JSON.stringify(result));
  expect(serialized.version).toBe(1); expect(serialized.dataChecksum).toBe(checksum(Buffer.from(JSON.stringify(serialized.data))));
  expect(Buffer.from(serialized.data.sources[0].contentBase64,'base64')).toEqual(bytes);
  expect(serialized.data.records.material_revisions[0].text).toBe('Corrected text');
  expect(serialized.data.records.drafts[0].body).toBe('My words'); expect(serialized.data.modules.find((m: {moduleId:string})=>m.moduleId==='notes').enabled).toBe(true);
  expect(JSON.stringify(result)).not.toContain('stored_rel_path'); s.db.close();
});
it('CHK-5.3-02 exports only the selected course without connection records or secrets', () => {
  const s = fixture(); const a = createCourse(s,'A'); const b = createCourse(s,'Private B');
  setDraft(s,{key:'other',courseId:b.id,body:'OTHER_COURSE_SENTINEL'});
  s.db.prepare("insert into provider_definitions(id,payload) values ('synthetic','{}')").run();
  s.db.prepare("insert into connections values ('connection','synthetic',?)").run(JSON.stringify({syntheticSecret:'NEVER_EXPORT_CREDENTIAL'}));
  s.db.prepare("insert into credential_references values ('connection','macos-keychain','OPAQUE_SECRET_REFERENCE')").run();
  const json = JSON.stringify(exportCourse(s,a.id));
  for (const sentinel of ['OTHER_COURSE_SENTINEL','NEVER_EXPORT_CREDENTIAL','OPAQUE_SECRET_REFERENCE',b.id]) expect(json).not.toContain(sentinel);
  s.db.close();
});
it('CHK-5.3-03 requires exact confirmation and backup acknowledgement over HTTP', async () => {
  const s = fixture(); const a = createCourse(s,'Delete me'); const app = createService(s);
  for (const payload of [{},{confirmation:'wrong',backupsAcknowledged:true},{confirmation:a.name},{confirmation:a.name,backupsAcknowledged:'true'}]) {
    expect((await app.inject({method:'DELETE',url:`/courses/${a.id}`,payload})).statusCode).toBe(400);
    expect(courseCollection(s)).toHaveLength(1);
  }
  expect((await app.inject({method:'GET',url:`/courses/${a.id}/export`})).headers['content-disposition']).toContain('attachment');
  expect((await app.inject({method:'DELETE',url:`/courses/${a.id}`,payload:{confirmation:a.name,backupsAcknowledged:true}})).statusCode).toBe(200);
  expect(courseCollection(s)).toHaveLength(0); await app.close(); s.db.close();
});
it('CHK-5.3-04 deletes linked records/files and keeps other course and connection data', () => {
  const s = fixture(); const a = createCourse(s,'A'); const b = createCourse(s,'B');
  const doc = storeOriginal(s,a.id,'a.txt',Buffer.from('A')); const other = storeOriginal(s,b.id,'b.txt',Buffer.from('B'));
  setDraft(s,{key:'a',courseId:a.id,body:'A'}); setDraft(s,{key:'b',courseId:b.id,body:'B'}); setCourseModule(s,a.id,'notes',true);
  s.db.prepare("insert into material_revisions values (?,?,1,'A','[]','user',?)").run(doc.id,a.id,doc.createdAt);
  s.db.prepare("insert into derivatives values ('d',?,?,1,'lexical','ready',null)").run(a.id,doc.id);
  s.db.prepare("insert into embedding_indexes values ('e',?,'m','1','checksum','ready','{}',null)").run(a.id);
  s.db.prepare("insert into research_sessions values ('r',?,'synthetic',null,'Query',?,'user','{}','complete',null)").run(a.id,doc.createdAt);
  s.db.prepare("insert into research_sources values ('rs','r',?,'https://example.org','Example',null,null,?,'Excerpt','[]','[]',null,'available')").run(a.id,doc.createdAt);
  setSession(s,{courseId:a.id,routeHash:`#/courses/${a.id}`,task:'home',notice:null});
  deleteCourse(s,a.id,{confirmation:'A',backupsAcknowledged:true});
  for (const table of ['material_revisions','derivatives','embedding_indexes','research_sessions','research_sources','course_modules','jobs','lifecycle_operations']) expect(s.db.prepare(`select count(*) as n from ${table} where course_id=?`).get(a.id)).toEqual({n:0});
  expect(fs.existsSync(path.join(s.dataDir,doc.storedRelPath))).toBe(false); expect(readOriginal(s,other).toString()).toBe('B'); expect(getDraft(s,'b')?.body).toBe('B');
  expect(getSession(s).courseId).not.toBe(a.id); expect(s.db.pragma('foreign_key_check')).toEqual([]); s.db.close();
});
it('CHK-5.3-05 interrupted deletion stays hidden from active work and retries after restart', () => {
  let s = fixture(); const dir = s.dataDir; const a = createCourse(s,'A');
  storeOriginal(s,a.id,'a.txt',Buffer.from('A')); storeOriginal(s,a.id,'b.txt',Buffer.from('B'));
  const unlink = fs.unlinkSync.bind(fs); let count = 0;
  const spy = vi.spyOn(fs,'unlinkSync').mockImplementation(file => { if (++count === 2) throw new Error('Synthetic filesystem failure'); unlink(file); });
  expect(() => deleteCourse(s,a.id,{confirmation:'A',backupsAcknowledged:true})).toThrow('deletion_incomplete_retry');
  expect(listCourses(s)).toHaveLength(0); expect(courseCollection(s)[0]?.trashedAt).toBeTruthy();
  expect(() => setDraft(s,{key:'late',courseId:a.id,body:'late'})).toThrow('course_unavailable');
  spy.mockRestore(); s.db.close(); s = openStore(dir);
  expect(deleteCourse(s,a.id,{confirmation:'A',backupsAcknowledged:true}).deleted).toBe(true); expect(courseCollection(s)).toHaveLength(0); s.db.close();
});
it('rejects checksum corruption, traversal and symlink originals before export or deletion', () => {
  const s = fixture(); const a = createCourse(s,'A'); const doc = storeOriginal(s,a.id,'a.txt',Buffer.from('A'));
  const confirm = {confirmation:'A',backupsAcknowledged:true}; const file = path.join(s.dataDir,doc.storedRelPath);
  fs.writeFileSync(file,'Changed'); expect(() => exportCourse(s,a.id)).toThrow('original_checksum_mismatch'); expect(() => deleteCourse(s,a.id,confirm)).toThrow('original_checksum_mismatch');
  s.db.prepare('update source_documents set stored_rel_path=? where id=?').run('../outside',doc.id);
  expect(() => deleteCourse(s,a.id,confirm)).toThrow('unsafe_original_path');
  s.db.prepare('update source_documents set stored_rel_path=? where id=?').run(doc.storedRelPath,doc.id);
  fs.unlinkSync(file); fs.symlinkSync(path.join(s.dataDir,'app.sqlite'),file);
  expect(() => exportCourse(s,a.id)).toThrow('unsafe_original_path'); expect(listCourses(s)).toHaveLength(1); s.db.close();
});
