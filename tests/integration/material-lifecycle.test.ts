import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import Database from 'better-sqlite3';
import {MIGRATIONS} from '../../packages/storage/src/migrations.js';
import {openStore,createCourse,storeOriginal,readOriginal,correctMaterial,approveMaterial,materialDetail,materialCollection,trashMaterial,deleteMaterial,exportMaterials,exportCourse,deleteCourse,beginIndex,finishIndex,indexStatus,semanticSearch,recoverIndexes,cancelIndex,archiveCourse,queueImport,changeImportTask,type Store} from '@collegenotes/storage';
import {createService} from '../../apps/local-service/src/index.js';
const stores:Store[]=[];const dirs:string[]=[];
afterEach(()=>{vi.restoreAllMocks();for(const s of stores.splice(0))if(s.db.open)s.db.close();for(const d of dirs.splice(0))fs.rmSync(d,{recursive:true,force:true});});
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-phase64-'));dirs.push(dir);const s=openStore(dir);stores.push(s);return s;}
function source(s:Store,courseId:string,text='Plants use sunlight to make energy.'){
 const m=storeOriginal(s,courseId,'synthetic.txt',Buffer.from(text));
 s.db.prepare("insert into material_revisions values (?,?,1,?,?,'extraction',?)").run(m.id,courseId,text,JSON.stringify([{type:'paragraph',locator:'paragraph:1'}]),m.createdAt);return m;
}
const model={id:'synthetic-index-contract',version:'v1',checksum:'synthetic'};
const vector=Array.from({length:384},(_,i)=>i===0?1:0);
function approve(s:Store,c:string,id:string,revision=1){approveMaterial(s,c,id,{expectedRevision:revision,reviewed:true});}
function build(s:Store,c:string){const snapshot=beginIndex(s,c,model);finishIndex(s,snapshot,snapshot.chunks.map(()=>vector));return snapshot;}
it('CHK-6.4-01 corrections and explicit approval survive restart without changing originals',()=>{
 let s=fixture();const c=createCourse(s,'Synthetic biology');const m=source(s,c.id);const original=readOriginal(s,m);
 correctMaterial(s,c.id,m.id,{text:'Plants convert sunlight into chemical energy.',expectedRevision:1});
 expect(materialDetail(s,c.id,m.id).material.approvedRevision).toBe(null);approve(s,c.id,m.id,2);
 const dir=s.dataDir;s.db.close();s=openStore(dir);stores.push(s);
 const d=materialDetail(s,c.id,m.id);expect(d.material.revision).toBe(2);expect(d.material.approvedRevision).toBe(2);expect(d.revisions[0]?.text).toContain('chemical energy');expect(readOriginal(s,m)).toEqual(original);
});
it('CHK-6.4-02 keeps old text, authors, anchors and exact version identity',()=>{
 const s=fixture(),c=createCourse(s,'A'),m=source(s,c.id,'Original 42');correctMaterial(s,c.id,m.id,{text:'Corrected 43',expectedRevision:1});
 const d=materialDetail(s,c.id,m.id);expect(d.revisions.map(r=>[r.revision,r.author,r.text])).toEqual([[2,'user','Corrected 43'],[1,'extraction','Original 42']]);expect(d.revisions[0]?.anchors).toBe(d.revisions[1]?.anchors);
 expect(()=>correctMaterial(s,c.id,m.id,{text:'Stale overwrite',expectedRevision:1})).toThrow('revision_conflict');expect(()=>approve(s,c.id,m.id,1)).toThrow('revision_conflict');
});
it('CHK-6.4-03 invalidates affected vectors, lexical chunks and activities, then rebuilds approved corrections',()=>{
 const s=fixture(),c=createCourse(s,'A'),m=source(s,c.id);approve(s,c.id,m.id);build(s,c.id);
 s.db.prepare("insert into derivatives values ('activity',?,?,1,'activity','ready',null)").run(c.id,m.id);
 correctMaterial(s,c.id,m.id,{text:'Corrected photosynthesis explanation.',expectedRevision:1});
 expect(indexStatus(s,c.id)?.status).toBe('stale');expect(s.db.prepare('select count(*) as n from semantic_chunks').get()).toEqual({n:0});expect(s.db.prepare('select count(*) as n from material_fts').get()).toEqual({n:0});expect(s.db.prepare("select status from derivatives where id='activity'").get()).toEqual({status:'stale'});
 expect(()=>semanticSearch(s,c.id,vector,model)).toThrow('index_rebuild_required');build(s,c.id);expect(semanticSearch(s,c.id,vector,model)).toEqual([]);
 approve(s,c.id,m.id,2);build(s,c.id);expect(semanticSearch(s,c.id,vector,model)[0]?.revision).toBe(2);expect(semanticSearch(s,c.id,vector,model)[0]?.text).toContain('Corrected');
});
it('CHK-6.4-04 retains unrelated sources, vectors, activity readiness and another course',()=>{
 const s=fixture(),a=createCourse(s,'A'),b=createCourse(s,'B'),m=source(s,a.id),other=source(s,a.id,'Unchanged'),foreign=source(s,b.id,'Private elsewhere');
 for(const [c,id] of [[a.id,m.id],[a.id,other.id],[b.id,foreign.id]])approve(s,c!,id!);build(s,a.id);build(s,b.id);
 s.db.prepare("insert into derivatives values ('unaffected',?,?,1,'activity','ready',null)").run(a.id,other.id);
 const before=s.db.prepare('select vector from semantic_chunks where source_id=?').get(other.id);
 correctMaterial(s,a.id,m.id,{text:'Changed',expectedRevision:1});expect(s.db.prepare('select vector from semantic_chunks where source_id=?').get(other.id)).toEqual(before);expect(indexStatus(s,b.id)?.status).toBe('ready');expect(s.db.prepare("select status from derivatives where id='unaffected'").get()).toEqual({status:'ready'});expect(readOriginal(s,foreign).toString()).toBe('Private elsewhere');
});
it('CHK-6.4-05 excludes unapproved, wrong-course, archived, trashed and deleted sources',()=>{
 const s=fixture(),a=createCourse(s,'A'),b=createCourse(s,'B'),m=source(s,a.id),foreign=source(s,b.id,'Secret');source(s,a.id,'Unapproved');approve(s,a.id,m.id);approve(s,b.id,foreign.id);build(s,a.id);
 expect(semanticSearch(s,a.id,vector,model).map(r=>r.sourceId)).toEqual([m.id]);expect(()=>materialDetail(s,a.id,foreign.id)).toThrow('material_unavailable');
 archiveCourse(s,a.id,true);expect(()=>semanticSearch(s,a.id,vector,model)).toThrow('course_unavailable');archiveCourse(s,a.id,false);
 trashMaterial(s,a.id,m.id);build(s,a.id);expect(semanticSearch(s,a.id,vector,model)).toEqual([]);trashMaterial(s,a.id,m.id,true);build(s,a.id);expect(semanticSearch(s,a.id,vector,model)).toHaveLength(1);
 deleteMaterial(s,a.id,m.id,{confirmation:m.filename,backupsAcknowledged:true});build(s,a.id);expect(semanticSearch(s,a.id,vector,model)).toEqual([]);expect(readOriginal(s,foreign).toString()).toBe('Secret');
});
it('exports individual and selected originals, corrections and anchors without local paths or secrets',()=>{
 const s=fixture(),c=createCourse(s,'A'),m=source(s,c.id,'Exact original'),n=source(s,c.id,'Second original');correctMaterial(s,c.id,m.id,{text:'Correction',expectedRevision:1});
 const out=exportMaterials(s,c.id,[m.id,n.id]);expect(out.data.sources).toHaveLength(2);expect(Buffer.from(out.data.sources[0]!.originalBase64,'base64')).toEqual(readOriginal(s,m));expect(out.data.sources[0]?.revisions).toHaveLength(2);expect(JSON.stringify(out)).not.toContain('storedRelPath');expect(JSON.stringify(out)).not.toContain(s.dataDir);
 expect(exportMaterials(s,c.id,[m.id]).data.sources).toHaveLength(1);expect(()=>exportMaterials(s,c.id,[m.id,m.id])).toThrow('invalid_selection');
 fs.writeFileSync(path.join(s.dataDir,m.storedRelPath),'tampered');expect(()=>exportMaterials(s,c.id,[m.id])).toThrow('original_checksum_mismatch');
});
it('permanent deletion requires confirmation, purges derivatives, and retries an interrupted cleanup after restart',()=>{
 let s=fixture();const c=createCourse(s,'A'),m=source(s,c.id);approve(s,c.id,m.id);build(s,c.id);
 expect(()=>deleteMaterial(s,c.id,m.id,{})).toThrow('deletion_confirmation_required');
 const spy=vi.spyOn(fs,'unlinkSync').mockImplementation(()=>{throw new Error('synthetic disk failure');});expect(()=>deleteMaterial(s,c.id,m.id,{confirmation:m.filename,backupsAcknowledged:true})).toThrow('deletion_incomplete_retry');spy.mockRestore();
 expect(materialCollection(s,c.id)[0]?.cleanupState).toBe('failed');expect(()=>materialDetail(s,c.id,m.id)).toThrow('material_unavailable');
 const dir=s.dataDir;s.db.close();s=openStore(dir);stores.push(s);deleteMaterial(s,c.id,m.id,{confirmation:m.filename,backupsAcknowledged:true});
 expect(materialCollection(s,c.id)).toEqual([]);expect(indexStatus(s,c.id)?.sourceRevisions).not.toContain(m.id);expect(fs.existsSync(path.join(s.dataDir,m.storedRelPath))).toBe(false);for(const table of ['material_revisions','derivatives','semantic_chunks','material_fts'])expect(s.db.prepare(`select count(*) as n from ${table}`).get()).toEqual({n:0});expect(s.db.pragma('foreign_key_check')).toEqual([]);
});
it('blocks unsafe original paths and does not silently remove missing originals before confirmed deletion',()=>{
 const s=fixture(),c=createCourse(s,'A'),m=source(s,c.id);s.db.prepare('update source_documents set stored_rel_path=? where id=?').run('../outside.txt',m.id);
 expect(()=>deleteMaterial(s,c.id,m.id,{confirmation:m.filename,backupsAcknowledged:true})).toThrow('unsafe_original_path');expect(fs.existsSync(path.join(s.dataDir,m.storedRelPath))).toBe(true);
 s.db.prepare('update source_documents set stored_rel_path=? where id=?').run(m.storedRelPath,m.id);fs.unlinkSync(path.join(s.dataDir,m.storedRelPath));expect(()=>deleteMaterial(s,c.id,m.id,{confirmation:m.filename,backupsAcknowledged:true})).toThrow('original_missing');
});
it('rejects publishing snapshots after correction, cancellation, or a newer build generation',()=>{
 const s=fixture(),c=createCourse(s,'A'),m=source(s,c.id);approve(s,c.id,m.id);const first=beginIndex(s,c.id,model);correctMaterial(s,c.id,m.id,{text:'New content',expectedRevision:1});expect(()=>finishIndex(s,first,[vector])).toThrow('index_source_changed_retry');
 approve(s,c.id,m.id,2);const second=beginIndex(s,c.id,model);cancelIndex(s,c.id);const third=beginIndex(s,c.id,model);expect(()=>finishIndex(s,second,[vector])).toThrow('index_source_changed_retry');finishIndex(s,third,[vector]);expect(indexStatus(s,c.id)?.status).toBe('ready');
});
it('model changes invalidate old chunks and interrupted builds recover for an explicit retry',()=>{
 const s=fixture(),c=createCourse(s,'A'),m=source(s,c.id);approve(s,c.id,m.id);build(s,c.id);
 const changed={...model,version:'v2',checksum:'new'};const snapshot=beginIndex(s,c.id,changed);expect(s.db.prepare('select count(*) as n from semantic_chunks').get()).toEqual({n:0});expect(()=>semanticSearch(s,c.id,vector,model)).toThrow('index_rebuild_required');
 recoverIndexes(s);expect(indexStatus(s,c.id)?.rebuildReason).toBe('interrupted_retry_available');expect(()=>finishIndex(s,snapshot,[vector])).toThrow('index_source_changed_retry');const retry=beginIndex(s,c.id,changed);finishIndex(s,retry,[vector]);expect(semanticSearch(s,c.id,vector,changed)).toHaveLength(1);expect(()=>semanticSearch(s,c.id,vector,model)).toThrow('index_rebuild_required');
});
it('course export includes actual chunks and course deletion removes the new index tables',()=>{
 const s=fixture(),c=createCourse(s,'A'),m=source(s,c.id);approve(s,c.id,m.id);build(s,c.id);const out=exportCourse(s,c.id);expect(out.data.records.semantic_chunks).toHaveLength(1);deleteCourse(s,c.id,{confirmation:'A',backupsAcknowledged:true});expect(s.db.prepare('select count(*) as n from semantic_chunks').get()).toEqual({n:0});expect(s.db.prepare('select count(*) as n from material_fts').get()).toEqual({n:0});
});
it('material API preserves course boundaries, requires review, and rejects hostile origins',async()=>{
 const s=fixture(),a=createCourse(s,'A'),b=createCourse(s,'B'),m=source(s,a.id);const app=createService(s);const headers={host:'127.0.0.1',origin:'http://127.0.0.1:5173','x-cn-client':'collegenotes-web'};
 const base=`/courses/${a.id}/materials/${m.id}`;
 expect((await app.inject({method:'POST',url:base+'/approve',headers,payload:{expectedRevision:1,reviewed:false}})).statusCode).toBe(400);
 expect((await app.inject({method:'PUT',url:`/courses/${b.id}/materials/${m.id}`,headers,payload:{text:'wrong course',expectedRevision:1}})).statusCode).toBe(404);
 expect((await app.inject({method:'PUT',url:base,headers:{...headers,origin:'https://evil.example'},payload:{text:'hostile',expectedRevision:1}})).statusCode).toBe(403);
 expect((await app.inject({method:'PUT',url:base,headers,payload:{text:'Valid edit',expectedRevision:1}})).statusCode).toBe(200);
 expect((await app.inject({method:'POST',url:base+'/approve',headers,payload:{expectedRevision:2,reviewed:true}})).statusCode).toBe(200);
 const detail=await app.inject({url:base,headers});expect(detail.body).not.toContain(s.dataDir);expect(detail.body).not.toContain('storedRelPath');await app.close();
});

it('trashed queued imports cannot restart until restored',()=>{
 const s=fixture(),c=createCourse(s,'A');const queued=queueImport(s,c.id,'queued.txt',Buffer.from('Synthetic queued import'));
 trashMaterial(s,c.id,queued.sourceId);expect(()=>changeImportTask(s,c.id,queued.task!.id,'retry')).toThrow('material_unavailable');
 trashMaterial(s,c.id,queued.sourceId,true);expect(changeImportTask(s,c.id,queued.task!.id,'retry').status).toBe('queued');
});
it('index bounds and vector validation reject invalid work without claiming readiness',()=>{
 const s=fixture(),c=createCourse(s,'A'),m=source(s,c.id);approve(s,c.id,m.id);const snapshot=beginIndex(s,c.id,model);
 expect(()=>beginIndex(s,c.id,model)).toThrow('index_busy');expect(()=>finishIndex(s,snapshot,[Array(384).fill(0)])).toThrow('invalid_embedding_vectors');
 expect(()=>archiveCourse(s,c.id,true)).toThrow('course_busy');finishIndex(s,snapshot,[vector]);expect(()=>semanticSearch(s,c.id,[NaN],model)).toThrow('invalid_search');
});
it('same-model rebuild preserves unaffected stored chunks until atomic publication',()=>{
 const s=fixture(),c=createCourse(s,'A'),m=source(s,c.id);approve(s,c.id,m.id);build(s,c.id);const before=s.db.prepare('select * from semantic_chunks').all();
 const snapshot=beginIndex(s,c.id,model);expect(s.db.prepare('select * from semantic_chunks').all()).toEqual(before);finishIndex(s,snapshot,[vector]);expect(indexStatus(s,c.id)?.status).toBe('ready');
});

it('migration 11 preserves preexisting Phase 6.3 material and requires explicit approval',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-upgrade-'));dirs.push(dir);fs.mkdirSync(path.join(dir,'originals'));
 const db=new Database(path.join(dir,'collegenotes.sqlite'));
 for(const [i,sql] of MIGRATIONS.slice(0,10).entries()){db.exec(sql);db.prepare('insert into schema_migrations values (?,?)').run(i+1,'synthetic');}
 db.prepare("insert into courses(id,name,created_at) values ('legacy-course','Synthetic legacy','synthetic')").run();
 db.prepare("insert into source_documents(id,course_id,filename,checksum,byte_length,stored_rel_path,created_at) values ('legacy-source','legacy-course','legacy.txt','synthetic',6,'originals/legacy-source_legacy.txt','synthetic')").run();
 db.prepare("insert into material_revisions values ('legacy-source','legacy-course',1,'Legacy','[]','extraction','synthetic')").run();db.close();
 const s=openStore(dir);stores.push(s);expect(materialDetail(s,'legacy-course','legacy-source').revisions[0]?.text).toBe('Legacy');expect(materialDetail(s,'legacy-course','legacy-source').material.approvedRevision).toBe(null);expect(s.db.prepare('select count(*) as n from schema_migrations').get()).toEqual({n:MIGRATIONS.length});
});
