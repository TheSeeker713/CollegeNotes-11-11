import fs from 'node:fs';
import path from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {createService} from '../../apps/local-service/src/index.js';
import {LOCAL_MODEL} from '../../apps/local-service/src/semantic.js';
import {syntheticSayExec} from './audio-test-helpers.js';
import {openStore,createCourse,setCourseModule,storeOriginal,approveMaterial,beginIndex,finishIndex,createActivity,createVisualExperiment,generateNarration,correctMaterial,type Store} from '@collegenotes/storage';
import {embedTexts} from '@collegenotes/importers';
import type {ActivityTemplate} from '@collegenotes/domain';

const stores:Store[]=[];
afterEach(()=>{vi.restoreAllMocks();for(const s of stores.splice(0)){s.db.close();fs.rmSync(s.dataDir,{recursive:true,force:true});}});
async function fixture(){
  const root=path.join(process.cwd(),'.local','tests');fs.mkdirSync(root,{recursive:true});
  const s=openStore(fs.mkdtempSync(path.join(root,'cn-p13-offline-')));stores.push(s);
  const c=createCourse(s,'Synthetic offline pack');
  for(const module of ['reading','study','audio','visuals'])setCourseModule(s,c.id,module,true);
  const text='Water freezes at zero degrees Celsius under standard conditions.';
  const source=storeOriginal(s,c.id,'source.txt',Buffer.from(text));
  s.db.prepare("insert into material_revisions values (?,?,1,?,'[]','extraction',?)").run(source.id,c.id,text,source.createdAt);
  approveMaterial(s,c.id,source.id,{expectedRevision:1,reviewed:true});
  const snapshot=beginIndex(s,c.id,LOCAL_MODEL);
  finishIndex(s,snapshot,snapshot.chunks.map(()=>Array.from({length:384},(_,i)=>i===0?1:0)));
  const template:ActivityTemplate={schemaVersion:1,kind:'multiple_choice',title:'Freezing',prompt:'Which temperature?',items:[],choices:['zero','one hundred'],answer:['zero'],rationale:'The source states zero.',rubric:['Identify the temperature.'],hints:['Use Celsius.'],sources:[{sourceId:source.id,revision:1,start:0,end:text.length,quote:text}],provenance:{kind:'user',providerId:null,modelId:null},needsReview:false};
  const activity=createActivity(s,c.id,template);
  const visual=createVisualExperiment(s,c.id,{kind:'process_sequence'});
  const audio=await generateNarration(s,c.id,{sourceId:source.id,voiceId:'Samantha'},syntheticSayExec());
  const app=createService(s);
  const pack=async()=>app.inject({method:'POST',url:`/courses/${c.id}/offline-pack`,payload:{sourceIds:[source.id]}});
  return {s,c,source,activity,visual,audio,app,pack};
}

it('CHK-13.1-01/02 prepares a self-contained cold-open pack with every claimed resource',async()=>{
  const {source,activity,visual,audio,app,pack}=await fixture();
  try{
    const response=await pack();expect(response.statusCode).toBe(200);
    const data=response.json();expect(data.schema).toBe(2);
    expect(data.documents[0].document.sourceId).toBe(source.id);
    expect(data.activities.map((a:{id:string})=>a.id)).toContain(activity.id);
    expect(data.visuals.map((v:{id:string})=>v.id)).toContain(visual.id);
    expect(data.narrations[0].asset.id).toBe(audio.id);
    expect(Buffer.from(data.narrations[0].audioBase64,'base64').subarray(0,4).toString()).toBe('RIFF');
    expect(data.manifest.resources.map((r:{kind:string})=>r.kind)).toEqual(expect.arrayContaining(['reading','study','narration','visual','index']));
    expect(data.manifest.themeModes).toHaveLength(4);
    expect(data.manifest.model).toMatchObject({...LOCAL_MODEL,verifiedOnThisMac:true,bundledInBrowser:false});
    expect(JSON.stringify(data)).not.toContain('stored_rel_path');
  }finally{await app.close();}
});

it('CHK-13.1-03 rejects changed or mismatched index readiness',async()=>{
  const {s,c,source,app,pack}=await fixture();
  try{
    expect((await pack()).statusCode).toBe(200);
    correctMaterial(s,c.id,source.id,{expectedRevision:1,text:'Changed source'});
    expect((await pack()).statusCode).toBe(409);
    expect((await pack()).json().error).toMatch(/index_rebuild_required|approve_selected_sources_and_rebuild/);
  }finally{await app.close();}
});

it('CHK-13.1-04 separates fresh local embedding inference from unavailable generative tutoring',async()=>{
  const {app,pack}=await fixture();
  try{
    const data=(await pack()).json();
    expect(data.manifest.capabilities.localSemanticInference).toBe(true);
    expect(data.manifest.capabilities.freshGenerativeTutor).toBe(false);
    const [fresh]=await embedTexts(['freezing point']);
    expect(fresh).toHaveLength(384);
    expect(data.index.chunks[0].vector).toHaveLength(384);
  }finally{await app.close();}
});

it('CHK-13.1-05 prepares without a remote fetch dependency',async()=>{
  const {app,pack}=await fixture();
  try{
    const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('network forbidden');});
    expect((await pack()).statusCode).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  }finally{await app.close();}
});
