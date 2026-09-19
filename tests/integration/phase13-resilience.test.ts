import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {afterEach,expect,it,vi} from 'vitest';
import {createService} from '../../apps/local-service/src/index.js';
import {LOCAL_MODEL} from '../../apps/local-service/src/semantic.js';
import {syntheticSayExec} from './audio-test-helpers.js';
import {openStore,createCourse,setCourseModule,storeOriginal,queueImport,readingDocument,approveMaterial,beginIndex,finishIndex,createActivity,createVisualExperiment,generateNarration,createPortableBackup,restorePortableBackup,previewPortableBackup,type Store} from '@collegenotes/storage';
import type {ActivityTemplate} from '@collegenotes/domain';

const stores:Store[]=[];
afterEach(()=>{vi.restoreAllMocks();for(const store of stores.splice(0)){if(store.db.open)store.db.close();fs.rmSync(store.dataDir,{recursive:true,force:true});}});
function makeStore(){const base=path.join(process.cwd(),'.local','tests');fs.mkdirSync(base,{recursive:true});const store=openStore(fs.mkdtempSync(path.join(base,'cn-p13-resilience-')));stores.push(store);return store;}
function readySource(store:Store,courseId:string,text:string){
  const source=storeOriginal(store,courseId,'synthetic.txt',Buffer.from(text));
  store.db.prepare("insert into material_revisions values (?,?,1,?,'[]','user',?)").run(source.id,courseId,text,source.createdAt);
  approveMaterial(store,courseId,source.id,{expectedRevision:1,reviewed:true});
  return source;
}
function build(store:Store,courseId:string){const snapshot=beginIndex(store,courseId,LOCAL_MODEL);finishIndex(store,snapshot,snapshot.chunks.map(()=>Array.from({length:384},(_,i)=>i===0?1:0)));}

it('CHK-13.4-01/02 measures a combined import/reading workload and recovers interrupted work',async()=>{
  const store=makeStore(),course=createCourse(store,'Synthetic combined workload');
  const source=readySource(store,course.id,'Known reading text remains intact.');
  const started=performance.now();
  const imports=Array.from({length:12},(_,i)=>queueImport(store,course.id,`queued-${i}.txt`,Buffer.from(`Synthetic source ${i} has distinct content.`)));
  expect(readingDocument(store,course.id,source.id).text).toBe('Known reading text remains intact.');
  expect(imports.every(row=>row.task?.status==='queued')).toBe(true);
  store.db.prepare("update import_tasks set status='running' where id=?").run(imports[0]!.task!.id);
  const app=createService(store);
  try{expect(store.db.prepare('select status from import_tasks where id=?').get(imports[0]!.task!.id)).toEqual({status:'failed'});}
  finally{await app.close();}
  expect(performance.now()-started).toBeLessThan(15000);
  expect(fs.readFileSync(path.join(store.dataDir,source.storedRelPath)).toString()).toBe('Known reading text remains intact.');
});

it('CHK-13.4-03/04 fails closed for unavailable providers and speech, and rejects alien origins',async()=>{
  const store=makeStore(),course=createCourse(store,'Synthetic boundaries');
  const app=createService(store),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('network forbidden');});
  try{
    const research=await app.inject({method:'POST',url:`/courses/${course.id}/research/sessions`,payload:{query:'test',acknowledgeTransmission:true}});
    expect(research.json().error).toBe('research_adapter_unavailable');
    const tutor=await app.inject({method:'POST',url:`/courses/${course.id}/tutor/sessions`,payload:{offline:false}});
    expect(tutor.json().error).toBe('tutor_adapter_unavailable');
    const speech=await app.inject({method:'POST',url:`/courses/${course.id}/audio/recognition`,payload:{expectedText:'fabricated'}});
    expect(speech.json().error).toBe('speech_recognition_unavailable');
    expect((await app.inject({method:'GET',url:'/courses',headers:{origin:'https://alien.example'}})).statusCode).toBe(403);
    expect(store.db.prepare('select count(*) as n from research_sessions').get()).toEqual({n:0});
    expect(store.db.prepare('select count(*) as n from tutor_sessions').get()).toEqual({n:0});
    expect(store.db.prepare('select count(*) as n from recognition_transcripts').get()).toEqual({n:0});
    expect(fetch).not.toHaveBeenCalled();
  }finally{await app.close();}
});

it('CHK-13.4-02 low disk simulation rolls back restore without changing an existing course',()=>{
  const source=makeStore(),course=createCourse(source,'Synthetic backup'),target=makeStore(),existing=createCourse(target,'Existing');
  readySource(source,course.id,'Source-grounded text.');
  const backup=createPortableBackup(source,course.id);
  const write=fs.writeFileSync.bind(fs);
  vi.spyOn(fs,'writeFileSync').mockImplementation((file,...args)=>{if(String(file).includes('.restore-'))throw Object.assign(new Error('Disk full'),{code:'ENOSPC'});return write(file,...args);});
  expect(()=>restorePortableBackup(target,backup)).toThrow('restore_failed_retry');
  expect(target.db.prepare('select id from courses').all()).toEqual([{id:existing.id}]);
  expect(previewPortableBackup(target,backup).canRestore).toBe(true);
});

it('CHK-13.4-04/06 restores source-linked study, narration and visuals, then rebuilds the offline index',async()=>{
  const sourceStore=makeStore(),course=createCourse(sourceStore,'Synthetic integrated pack'),target=makeStore();
  for(const module of ['reading','study','audio','visuals'])setCourseModule(sourceStore,course.id,module,true);
  const text='The synthetic process begins with a source and ends with a review.';
  const source=readySource(sourceStore,course.id,text);build(sourceStore,course.id);
  const template:ActivityTemplate={schemaVersion:1,kind:'recall',title:'Process review',prompt:'What begins the process?',items:[],choices:[],answer:['a source'],rationale:'The source says so.',rubric:['Name the source.'],hints:['Read the beginning.'],sources:[{sourceId:source.id,revision:1,start:0,end:text.length,quote:text}],provenance:{kind:'user',providerId:null,modelId:null},needsReview:false};
  const activity=createActivity(sourceStore,course.id,template);
  const visual=createVisualExperiment(sourceStore,course.id,{kind:'process_sequence'});
  const narration=await generateNarration(sourceStore,course.id,{sourceId:source.id,voiceId:'Samantha'},syntheticSayExec());
  const backup=createPortableBackup(sourceStore,course.id);restorePortableBackup(target,backup);
  const app=createService(target);
  try{
    expect((await app.inject({method:'POST',url:`/courses/${course.id}/offline-pack`,payload:{sourceIds:[source.id]}})).statusCode).toBe(409);
    build(target,course.id);
    const response=await app.inject({method:'POST',url:`/courses/${course.id}/offline-pack`,payload:{sourceIds:[source.id]}});
    expect(response.statusCode).toBe(200);
    const pack=response.json();
    expect(pack.activities.map((row:{id:string})=>row.id)).toContain(activity.id);
    expect(pack.narrations.map((row:{asset:{id:string}})=>row.asset.id)).toContain(narration.id);
    expect(pack.visuals.map((row:{id:string})=>row.id)).toContain(visual.id);
    expect(pack.documents[0].document.text).toBe(text);
  }finally{await app.close();}
});
