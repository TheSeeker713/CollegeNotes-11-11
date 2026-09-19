import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {createService} from '../../apps/local-service/src/index.js';
import {openStore,createCourse,setCourseModule,storeOriginal,importPracticeMedia,createPortableBackup,previewPortableBackup,restorePortableBackup,setAppearance,getAppearance,setLayout,getLayout,type Store} from '@collegenotes/storage';
import {DEFAULT_APPEARANCE,THEME_VARIANTS,type ThemeId,type ModeId} from '@collegenotes/domain';

const stores:Store[]=[];
afterEach(()=>{vi.restoreAllMocks();for(const store of stores.splice(0)){store.db.close();fs.rmSync(store.dataDir,{recursive:true,force:true});}});
function makeStore(){const base=path.join(process.cwd(),'.local','tests');fs.mkdirSync(base,{recursive:true});const store=openStore(fs.mkdtempSync(path.join(base,'cn-p13-backup-')));stores.push(store);return store;}
function fixture(){
  const source=makeStore(),course=createCourse(source,'Synthetic portable course');
  setCourseModule(source,course.id,'reading',true);
  const original=storeOriginal(source,course.id,'notes.txt',Buffer.from('Synthetic, private notes.'));
  source.db.prepare("insert into material_revisions values (?,?,1,?,'[]','user',?)").run(original.id,course.id,'Synthetic, private notes.',course.createdAt);
  source.db.prepare("insert into reading_annotations(id,course_id,source_id,revision,kind,start_offset,end_offset,quote,note,created_at,updated_at) values ('annotation_p13',?,?,1,'note',0,9,'Synthetic','Owner note',?,?)").run(course.id,original.id,course.createdAt,course.createdAt);
  setLayout(source,course.id,{order:['notes','source','study','listen'],pinned:['notes']});
  setAppearance(source,{...DEFAULT_APPEARANCE,theme:'brutalist',mode:'dark'});
  return {source,course,original};
}

it('CHK-13.2-01 restores an intact course with original bytes, modules, layout and optional appearance',()=>{
  const {source,course,original}=fixture(),target=makeStore();
  const backup=createPortableBackup(source,course.id,{includePreferences:true});
  expect(previewPortableBackup(target,backup)).toMatchObject({canRestore:true,sourceCount:1,appearanceAvailable:true});
  expect(restorePortableBackup(target,backup)).toMatchObject({restored:true,preferencesRestored:false});
  const restored=target.db.prepare('select stored_rel_path from source_documents where id=?').get(original.id) as {stored_rel_path:string};
  expect(fs.readFileSync(path.join(target.dataDir,restored.stored_rel_path))).toEqual(Buffer.from('Synthetic, private notes.'));
  expect(getLayout(target,course.id).pinned).toEqual(['notes']);
  expect(target.db.prepare('select note from reading_annotations where course_id=?').get(course.id)).toEqual({note:'Owner note'});
  expect(target.db.prepare('select enabled from course_modules where course_id=? and module_id=?').get(course.id,'reading')).toEqual({enabled:1});
  expect(getAppearance(target)).toEqual(DEFAULT_APPEARANCE);
  const second=makeStore();restorePortableBackup(second,backup,{restorePreferences:true});
  expect(getAppearance(second)).toMatchObject({theme:'brutalist',mode:'dark'});
});

it('backup keeps media bytes when selected and omits them when excluded',()=>{
  const {source,course,original}=fixture(),target=makeStore();
  setCourseModule(source,course.id,'practice',true);
  const media=importPracticeMedia(source,course.id,{filename:'synthetic.wav',contentBase64:Buffer.from('synthetic practice audio').toString('base64')});
  const included=createPortableBackup(source,course.id);
  expect(included.data.courseExport.data.files).toEqual(expect.arrayContaining([expect.objectContaining({id:media.id,contentBase64:Buffer.from('synthetic practice audio').toString('base64')})]));
  restorePortableBackup(target,included);
  const row=target.db.prepare('select rel_path from practice_media where id=?').get(media.id) as {rel_path:string};
  expect(fs.readFileSync(path.join(target.dataDir,row.rel_path))).toEqual(Buffer.from('synthetic practice audio'));
  const excluded=createPortableBackup(source,course.id,{includeMedia:false});
  expect(excluded.data.courseExport.data.files).toEqual([]);
  expect(excluded.data.courseExport.data.records.practice_media).toEqual([]);
  expect(excluded.data.courseExport.data.sources[0]?.id).toBe(original.id);
});

it('unknown backed-up theme falls back safely only when appearance restore is selected',()=>{
  const {source,course}=fixture(),target=makeStore();
  const backup=createPortableBackup(source,course.id,{includePreferences:true});
  const changed=structuredClone(backup) as unknown as {data:{appearance:{theme:string;mode:string}};dataChecksum:string};
  changed.data.appearance.theme='unknown-future-theme';
  changed.dataChecksum=createHash('sha256').update(JSON.stringify(changed.data)).digest('hex');
  restorePortableBackup(target,changed,{restorePreferences:true});
  expect(getAppearance(target)).toMatchObject({theme:'botanical',mode:'dark'});
});

it('all four appearance combinations survive an explicit backup preferences restore',()=>{
  const {source,course}=fixture();
  for(const variant of THEME_VARIANTS){
    const [theme,mode]=variant.split('-') as [ThemeId,ModeId];
    setAppearance(source,{...DEFAULT_APPEARANCE,theme,mode,reduceMotion:true,reduceTransparency:true});
    const target=makeStore();
    restorePortableBackup(target,createPortableBackup(source,course.id,{includePreferences:true}),{restorePreferences:true});
    expect(getAppearance(target)).toEqual({...DEFAULT_APPEARANCE,theme,mode,reduceMotion:true,reduceTransparency:true});
  }
});

it('CHK-13.2-02/04 rejects corruption and unsupported versions without writing',()=>{
  const {source,course}=fixture(),target=makeStore();
  const backup=createPortableBackup(source,course.id);
  const corrupt=structuredClone(backup);corrupt.data.courseExport.data.sources[0]!.filename='tampered';
  expect(()=>previewPortableBackup(target,corrupt)).toThrow('backup_corrupt');
  expect(()=>restorePortableBackup(target,corrupt)).toThrow('backup_corrupt');
  expect(()=>previewPortableBackup(target,{...backup,version:99})).toThrow('backup_version_unsupported');
  expect(target.db.prepare('select count(*) as n from courses').get()).toEqual({n:0});
});

it('preview rejects a checksum-valid backup with malformed record shape',()=>{
  const {source,course}=fixture(),target=makeStore();
  const backup=createPortableBackup(source,course.id);
  const changed=structuredClone(backup) as unknown as {data:{courseExport:{data:{records:{reading_annotations:Array<Record<string,unknown>>}};dataChecksum:string}};dataChecksum:string};
  changed.data.courseExport.data.records.reading_annotations[0]!.unexpected='not a storage column';
  const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
  changed.data.courseExport.dataChecksum=hash(JSON.stringify(changed.data.courseExport.data));
  changed.dataChecksum=hash(JSON.stringify(changed.data));
  expect(()=>previewPortableBackup(target,changed)).toThrow('backup_version_unsupported');
  expect(target.db.prepare('select count(*) as n from courses').get()).toEqual({n:0});
});

it('CHK-13.2-03 rolls back database and copied files on interrupted restore',()=>{
  const {source,course}=fixture(),target=makeStore(),existing=createCourse(target,'Keep this course');
  const backup=createPortableBackup(source,course.id);
  const rename=fs.renameSync;
  vi.spyOn(fs,'renameSync').mockImplementation((...args)=>{if(String(args[0]).includes('.restore-'))throw new Error('synthetic interruption');return rename(...args);});
  expect(()=>restorePortableBackup(target,backup)).toThrow('restore_failed_retry');
  expect(target.db.prepare('select id from courses order by id').all()).toEqual([{id:existing.id}]);
  expect(fs.readdirSync(path.join(target.dataDir,'originals'))).toEqual([]);
});

it('CHK-13.2-05 rejects traversal even if an attacker recomputes checksums',()=>{
  const {source,course}=fixture(),target=makeStore();
  const backup=createPortableBackup(source,course.id);
  const forged=structuredClone(backup) as unknown as {data:{courseExport:{data:{records:Record<string,unknown>};dataChecksum:string}};dataChecksum:string};
  forged.data.courseExport.data.records.narration_assets=[{id:'asset_unsafe',course_id:course.id,rel_path:'../../outside.wav',byte_length:1}];
  const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
  forged.data.courseExport.dataChecksum=hash(JSON.stringify(forged.data.courseExport.data));
  forged.dataChecksum=hash(JSON.stringify(forged.data));
  expect(()=>previewPortableBackup(target,forged)).toThrow('backup_path_rejected');
});

it('backup service previews before restore and reports conflicts',async()=>{
  const {source,course}=fixture(),target=makeStore();
  const backup=createPortableBackup(source,course.id);
  const app=createService(target);
  try{
    const preview=await app.inject({method:'POST',url:'/backup/preview',payload:backup});expect(preview.statusCode).toBe(200);
    const restored=await app.inject({method:'POST',url:'/backup/restore',payload:{backup}});expect(restored.statusCode).toBe(200);
    expect((await app.inject({method:'POST',url:'/backup/preview',payload:backup})).json().conflicts).toContain('course_id_exists');
  }finally{await app.close();}
});
