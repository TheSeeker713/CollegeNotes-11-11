import fs from 'node:fs';
import path from 'node:path';
import {afterEach,expect,it} from 'vitest';
import {ModuleRegistry} from '@collegenotes/domain';
import {openStore,createCourse,setRegisteredCourseModule,registeredModuleEnabled,setDraft,getDraft,storeOriginal,approveMaterial,beginIndex,finishIndex,lexicalSearch,createPortableBackup,restorePortableBackup,type Store} from '@collegenotes/storage';

const stores:Store[]=[];
afterEach(()=>{for(const store of stores.splice(0)){if(store.db.open)store.db.close();fs.rmSync(store.dataDir,{recursive:true,force:true});}});
function fixture(){const root=path.join(process.cwd(),'.local','tests');fs.mkdirSync(root,{recursive:true});const store=openStore(fs.mkdtempSync(path.join(root,'cn-p13-module-')));stores.push(store);const first=createCourse(store,'Synthetic first course'),second=createCourse(store,'Synthetic second course');const registry=new ModuleRegistry();registry.register({id:'synthetic_case_notes',label:'Case notes',description:'Test-only data descriptor for a second course.',schemaVersion:1,capabilities:['localNotes','sourceTemplates']});return {store,first,second,registry};}
function indexedSource(store:Store,courseId:string,text:string){
  const source=storeOriginal(store,courseId,'synthetic.txt',Buffer.from(text));
  store.db.prepare("insert into material_revisions values (?,?,1,?,'[]','user',?)").run(source.id,courseId,text,source.createdAt);
  approveMaterial(store,courseId,source.id,{expectedRevision:1,reviewed:true});
  const model={id:'synthetic',version:'1',checksum:'fixture'},snapshot=beginIndex(store,courseId,model);
  finishIndex(store,snapshot,snapshot.chunks.map(()=>Array.from({length:384},(_,i)=>i===0?1:0)));
  return {source,model};
}

it('CHK-13.3-01/05 registers a data-only optional module and rejects incompatible or executable descriptors',()=>{
  const {store,first,second,registry}=fixture();
  expect(setRegisteredCourseModule(store,second.id,registry,'synthetic_case_notes',true).enabled).toBe(true);
  expect(registeredModuleEnabled(store,first.id,registry,'synthetic_case_notes')).toBe(false);
  expect(()=>registry.register({id:'synthetic_bad',label:'Bad',description:'',schemaVersion:2,capabilities:[]})).toThrow('invalid_module_definition');
  expect(()=>registry.register({id:'synthetic_code',label:'Code',description:'',schemaVersion:1,capabilities:[],run:()=>{throw Error('must not execute');}})).toThrow('invalid_module_definition');
  store.db.prepare("update course_modules set schema_version=2 where course_id=? and module_id='synthetic_case_notes'").run(second.id);
  expect(()=>setRegisteredCourseModule(store,second.id,registry,'synthetic_case_notes',true)).toThrow('module_version_mismatch');
});

it('CHK-13.3-02/04 disable and re-enable preserve second-course data across migration reopen',()=>{
  const {store,first,second,registry}=fixture();
  setRegisteredCourseModule(store,second.id,registry,'synthetic_case_notes',true);
  setDraft(store,{key:'synthetic_case_note',courseId:second.id,body:'Owner-authored synthetic fixture'});
  setRegisteredCourseModule(store,second.id,registry,'synthetic_case_notes',false);
  expect(registeredModuleEnabled(store,second.id,registry,'synthetic_case_notes')).toBe(false);
  const dir=store.dataDir;store.db.close();const reopened=openStore(dir);stores.push(reopened);
  expect(reopened.db.prepare('select name from courses where id=?').get(first.id)).toEqual({name:first.name});
  expect(registeredModuleEnabled(reopened,second.id,registry,'synthetic_case_notes')).toBe(false);
  expect(getDraft(reopened,'synthetic_case_note')?.body).toBe('Owner-authored synthetic fixture');
  setRegisteredCourseModule(reopened,second.id,registry,'synthetic_case_notes',true);
  expect(registeredModuleEnabled(reopened,second.id,registry,'synthetic_case_notes')).toBe(true);
  const backup=createPortableBackup(reopened,second.id),target=openStore(fs.mkdtempSync(path.join(path.join(process.cwd(),'.local','tests'),'cn-p13-module-')));stores.push(target);
  restorePortableBackup(target,backup);
  expect(registeredModuleEnabled(target,second.id,registry,'synthetic_case_notes')).toBe(true);
  expect(getDraft(target,'synthetic_case_note')?.body).toBe('Owner-authored synthetic fixture');
});

it('CHK-13.3-03 keeps lexical retrieval scoped to the selected course',()=>{
  const {store,first,second}=fixture();
  const one=indexedSource(store,first.id,'Gravity affects falling objects.');
  const two=indexedSource(store,second.id,'Inventory counts physical products.');
  expect(lexicalSearch(store,first.id,'inventory',one.model)).toEqual([]);
  expect(lexicalSearch(store,second.id,'inventory',two.model).map(row=>row.sourceId)).toEqual([two.source.id]);
  expect(lexicalSearch(store,second.id,'gravity',two.model)).toEqual([]);
});
