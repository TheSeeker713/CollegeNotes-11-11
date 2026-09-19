import fs from 'node:fs';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { openStore, createCourse, storeOriginal, setDraft, setCourseModule, importPracticeMedia, exportCourse, deleteCourse, checksum, courseCollection, listCourses, readOriginal, getDraft, setSession, getSession } from '@collegenotes/storage';
import { createService } from '../../apps/local-service/src/index.js';
const dirs: string[] = [];
function fixture() { const root = path.join(process.cwd(), '.local', 'tests'); fs.mkdirSync(root, { recursive: true }); const dir = fs.mkdtempSync(path.join(root, 'cn-transfer-')); dirs.push(dir); return openStore(dir); }
afterEach(() => { vi.restoreAllMocks(); for (const dir of dirs.splice(0)) fs.rmSync(dir,{recursive:true,force:true}); });
function addNarration(s: ReturnType<typeof fixture>, courseId: string, sourceId: string) {
  const id = 'narration-audit';
  const relPath = path.join('narration', courseId, `${id}.wav`);
  const file = path.join(s.dataDir, relPath);
  const bytes = Buffer.from('RIFF-synthetic-narration');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  s.db.prepare(`insert into narration_assets(id,course_id,source_id,source_revision,voice_id,settings_hash,text_hash,rel_path,duration_ms,byte_length,anchors_json,provider_id,status,created_at)
    values (?,?,?,1,'Synthetic','settings','text',?,1000,?,'[]','local','ready',?)`).run(id, courseId, sourceId, relPath, bytes.length, new Date().toISOString());
  return { id, file, bytes };
}
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
it('exports later-phase tutor, claim, study provenance and both media payloads without cross-course data', () => {
  const s = fixture(); const a = createCourse(s, 'A'); const b = createCourse(s, 'B');
  setCourseModule(s, a.id, 'practice', true); setCourseModule(s, b.id, 'practice', true);
  const source = storeOriginal(s, a.id, 'source.txt', Buffer.from('source'));
  const narration = addNarration(s, a.id, source.id);
  const media = importPracticeMedia(s, a.id, { filename: 'sample.wav', contentBase64: Buffer.from('synthetic practice audio').toString('base64') });
  importPracticeMedia(s, b.id, { filename: 'other.wav', contentBase64: Buffer.from('OTHER_COURSE_MEDIA').toString('base64') });
  const now = new Date().toISOString();
  s.db.prepare("insert into tutor_sessions(id,course_id,status,offline,unfinished_question,context_json,created_at,updated_at) values ('tutor-audit',?,'active',1,'question','null',?,?)").run(a.id,now,now);
  s.db.prepare("insert into tutor_turns(id,session_id,course_id,client_request_id,action,request_json,response_json,created_at) values ('turn-audit','tutor-audit',?,'request','explain','{}','{}',?)").run(a.id,now);
  s.db.prepare("insert into research_sessions(id,course_id,provider_id,query,created_at,initiated_by,shared_context,status) values ('research-audit',?,'synthetic','question',?,'user','[]','complete')").run(a.id,now);
  s.db.prepare("insert into research_claims(id,session_id,course_id,statement,supported,source_ids) values ('claim-audit','research-audit',?,'claim',0,'[]')").run(a.id);
  s.db.prepare("insert into study_activities(id,course_id,payload,status,created_at) values ('activity-audit',?,'{}','ready',?)").run(a.id,now);
  s.db.prepare("insert into study_sources(activity_id,source_id,revision) values ('activity-audit',?,1)").run(source.id);
  const exported = exportCourse(s, a.id);
  expect(exported.data.records.tutor_sessions).toHaveLength(1);
  expect(exported.data.records.tutor_turns).toHaveLength(1);
  expect(exported.data.records.research_claims).toHaveLength(1);
  expect(exported.data.records.study_sources).toHaveLength(1);
  expect(exported.data.files).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'narration', id: narration.id, contentBase64: narration.bytes.toString('base64') }),
    expect.objectContaining({ kind: 'practice', id: media.id, contentBase64: Buffer.from('synthetic practice audio').toString('base64') })
  ]));
  expect(exported.dataChecksum).toBe(checksum(Buffer.from(JSON.stringify(exported.data))));
  expect(JSON.stringify(exported)).not.toContain('OTHER_COURSE_MEDIA');
  s.db.close();
});
it('deletes tutor history, narration and practice files, including interrupted orphan files', () => {
  const s = fixture(); const a = createCourse(s, 'A'); const b = createCourse(s, 'B');
  setCourseModule(s, a.id, 'practice', true); setCourseModule(s, b.id, 'practice', true);
  const source = storeOriginal(s, a.id, 'source.txt', Buffer.from('source'));
  const narration = addNarration(s, a.id, source.id);
  const media = importPracticeMedia(s, a.id, { filename: 'sample.wav', contentBase64: Buffer.from('synthetic practice audio').toString('base64') });
  const other = importPracticeMedia(s, b.id, { filename: 'other.wav', contentBase64: Buffer.from('other audio').toString('base64') });
  const orphan = path.join(s.dataDir, 'practice', a.id, 'orphan.wav'); fs.writeFileSync(orphan, 'orphan');
  const now = new Date().toISOString();
  s.db.prepare("insert into tutor_sessions(id,course_id,status,offline,unfinished_question,context_json,created_at,updated_at) values ('tutor-audit',?,'active',1,'','null',?,?)").run(a.id,now,now);
  s.db.prepare("insert into tutor_turns(id,session_id,course_id,client_request_id,action,request_json,response_json,created_at) values ('turn-audit','tutor-audit',?,'request','explain','{}','{}',?)").run(a.id,now);
  expect(deleteCourse(s, a.id, { confirmation: a.name, backupsAcknowledged: true }).deleted).toBe(true);
  for (const file of [path.join(s.dataDir, source.storedRelPath), narration.file, path.join(s.dataDir, media.relPath), orphan]) expect(fs.existsSync(file)).toBe(false);
  expect(s.db.prepare("select count(*) as n from tutor_sessions where course_id=?").get(a.id)).toEqual({ n: 0 });
  expect(s.db.prepare("select count(*) as n from tutor_turns where course_id=?").get(a.id)).toEqual({ n: 0 });
  expect(fs.existsSync(path.join(s.dataDir, other.relPath))).toBe(true);
  expect(s.db.pragma('foreign_key_check')).toEqual([]);
  s.db.close();
});
it('retries an interrupted media deletion without losing another course', () => {
  let s = fixture(); const dir = s.dataDir; const a = createCourse(s, 'A'); const b = createCourse(s, 'B');
  setCourseModule(s, a.id, 'practice', true); setCourseModule(s, b.id, 'practice', true);
  const source = storeOriginal(s, a.id, 'source.txt', Buffer.from('source'));
  const media = importPracticeMedia(s, a.id, { filename: 'sample.wav', contentBase64: Buffer.from('synthetic practice audio').toString('base64') });
  const other = importPracticeMedia(s, b.id, { filename: 'other.wav', contentBase64: Buffer.from('other audio').toString('base64') });
  const unlink = fs.unlinkSync.bind(fs);
  const spy = vi.spyOn(fs, 'unlinkSync').mockImplementation((file) => {
    if (file === path.join(dir, media.relPath)) throw new Error('Synthetic interrupted media deletion');
    unlink(file);
  });
  expect(() => deleteCourse(s, a.id, { confirmation: a.name, backupsAcknowledged: true })).toThrow('deletion_incomplete_retry');
  expect(listCourses(s).some((course) => course.id === a.id)).toBe(false);
  expect(fs.existsSync(path.join(dir, source.storedRelPath))).toBe(false);
  expect(fs.existsSync(path.join(dir, media.relPath))).toBe(true);
  spy.mockRestore(); s.db.close(); s = openStore(dir);
  expect(deleteCourse(s, a.id, { confirmation: a.name, backupsAcknowledged: true }).deleted).toBe(true);
  expect(fs.existsSync(path.join(dir, media.relPath))).toBe(false);
  expect(fs.existsSync(path.join(dir, other.relPath))).toBe(true);
  s.db.close();
});
it('rejects a symlink in course media before deleting any original', () => {
  const s = fixture(); const a = createCourse(s, 'A'); const b = createCourse(s, 'B');
  const source = storeOriginal(s, a.id, 'source.txt', Buffer.from('source'));
  const other = storeOriginal(s, b.id, 'other.txt', Buffer.from('other'));
  const dir = path.join(s.dataDir, 'practice', a.id); fs.mkdirSync(dir, { recursive: true });
  fs.symlinkSync(path.join(s.dataDir, other.storedRelPath), path.join(dir, 'link.wav'));
  expect(() => deleteCourse(s, a.id, { confirmation: a.name, backupsAcknowledged: true })).toThrow('unsafe_media_path');
  expect(fs.existsSync(path.join(s.dataDir, source.storedRelPath))).toBe(true);
  expect(fs.existsSync(path.join(s.dataDir, other.storedRelPath))).toBe(true);
  expect(courseCollection(s).find((c) => c.id === a.id)?.trashedAt).toBeNull();
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
