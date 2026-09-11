import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach,expect,it} from 'vitest';
import {openStore,createCourse,queueImport,changeImportTask,recoverImportTasks,listImportTasks,MAX_IMPORT_BYTES,validateImport,archiveCourse,readOriginal} from '@collegenotes/storage';
const stores:ReturnType<typeof openStore>[]=[];const dirs:string[]=[];
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-import-'));dirs.push(dir);const s=openStore(dir);stores.push(s);return s;}
afterEach(()=>{for(const s of stores.splice(0))if(s.db.open)s.db.close();for(const d of dirs.splice(0))fs.rmSync(d,{recursive:true,force:true});});
it('CHK-6.1-01 repeated imports preserve each batch item and course identity',()=>{
 const s=fixture();const a=createCourse(s,'A'),b=createCourse(s,'B');
 for(let i=0;i<3;i++)queueImport(s,a.id,`file${i}.txt`,Buffer.from(`Text ${i}`));
 queueImport(s,b.id,'file.txt',Buffer.from('Text 0'));expect(listImportTasks(s,a.id)).toHaveLength(3);expect(listImportTasks(s,b.id)).toHaveLength(1);
 expect(()=>archiveCourse(s,a.id,true)).toThrow('course_busy');
});
it('CHK-6.1-02 exact duplicates reuse identity and changed bytes remain separate',()=>{
 const s=fixture();const a=createCourse(s,'A');const first=queueImport(s,a.id,'same.txt',Buffer.from('first'));
 expect(queueImport(s,a.id,'same.txt',Buffer.from('first'))).toMatchObject({duplicate:true,sourceId:first.sourceId});
 expect(queueImport(s,a.id,'same.txt',Buffer.from('changed')).sourceId).not.toBe(first.sourceId);expect(listImportTasks(s,a.id)).toHaveLength(2);
});
it('CHK-6.1-03 cancellation and interrupted recovery retain originals and allow explicit retry',()=>{
 let s=fixture();const a=createCourse(s,'A');const first=queueImport(s,a.id,'a.txt',Buffer.from('keep'));
 expect(changeImportTask(s,a.id,first.task!.id,'cancel').status).toBe('cancelled');
 expect(changeImportTask(s,a.id,first.task!.id,'retry').status).toBe('queued');
 s.db.prepare("update import_tasks set status='running'").run();const dir=s.dataDir;s.db.close();s=openStore(dir);stores.push(s);recoverImportTasks(s);
 expect(listImportTasks(s,a.id)[0]).toMatchObject({status:'failed',error:'interrupted_retry_available'});expect(changeImportTask(s,a.id,first.task!.id,'retry').status).toBe('queued');
 expect(s.db.prepare('select count(*) as n from source_documents').get()).toEqual({n:1});
});
it('CHK-6.1-04 rejects unsupported, oversized, corrupt signatures, traversal and invalid UTF-8',()=>{
 for(const [name,bytes] of [['bad.exe',Buffer.from('x')],['bad.pdf',Buffer.from('wrong')],['bad.png',Buffer.from('wrong')],['bad.docx',Buffer.from('wrong')],['bad.epub',Buffer.from('wrong')],['../bad.txt',Buffer.from('x')],['bad.txt',Buffer.from([255])],['empty.txt',Buffer.alloc(0)],['large.txt',Buffer.alloc(MAX_IMPORT_BYTES+1)]] as const)expect(()=>validateImport(name,bytes)).toThrow();
});
it('CHK-6.1-05 originals remain byte-identical through cancellation, retry and rejection',()=>{
 const s=fixture();const a=createCourse(s,'A');const bytes=Buffer.from('Original\nUnicode: café');const first=queueImport(s,a.id,'a.txt',bytes);
 const row=s.db.prepare('select id,course_id as courseId,filename,checksum,byte_length as byteLength,stored_rel_path as storedRelPath,created_at as createdAt from source_documents where id=?').get(first.sourceId) as Parameters<typeof readOriginal>[1];
 changeImportTask(s,a.id,first.task!.id,'cancel');changeImportTask(s,a.id,first.task!.id,'retry');expect(readOriginal(s,row)).toEqual(bytes);
 expect(()=>queueImport(s,'other','a.txt',bytes)).toThrow('course_unavailable');expect(readOriginal(s,row)).toEqual(bytes);
});
