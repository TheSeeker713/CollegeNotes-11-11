import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {afterEach,expect,it,vi} from 'vitest';
import {openStore,createCourse,storeOriginal,approveMaterial,correctMaterial,indexStatus,materialDetail,readOriginal,cancelIndex,type Store} from '@collegenotes/storage';
import {verifyEmbeddingModel,EMBEDDING_MANIFEST,EMBEDDING_VERSION} from '@collegenotes/importers';
import {rebuildIndex,searchIndex,embeddingWorker} from '../../apps/local-service/src/semantic.js';
const stores:Store[]=[];const dirs:string[]=[];
afterEach(()=>{vi.unstubAllEnvs();for(const s of stores.splice(0))if(s.db.open)s.db.close();for(const d of dirs.splice(0))fs.rmSync(d,{recursive:true,force:true});});
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-semantic-'));dirs.push(dir);const s=openStore(dir);stores.push(s);return s;}
function source(s:Store,c:string,text:string,approved=true){const m=storeOriginal(s,c,'synthetic.txt',Buffer.from(text));s.db.prepare("insert into material_revisions values (?,?,1,?,'[]','extraction',?)").run(m.id,c,text,m.createdAt);if(approved)approveMaterial(s,c,m.id,{expectedRevision:1,reviewed:true});return m;}
it('CHK-6.4-05 real pinned local embeddings rank paraphrases, preserve model metadata and exclude another course',async()=>{
 const s=fixture(),c=createCourse(s,'Synthetic biology'),other=createCourse(s,'Other course');
 const plant=source(s,c.id,'Plants capture sunlight and convert it into chemical energy through photosynthesis.');source(s,c.id,'A triangle has three edges and the angles sum to one hundred eighty degrees.');source(s,c.id,'The mitochondrion is a cellular organelle responsible for respiration.');source(s,c.id,'Unapproved private statement',false);const foreign=source(s,other.id,'Plants capture sunlight and convert it into chemical energy through photosynthesis.');
 await rebuildIndex(s,c.id);const results=await searchIndex(s,c.id,'How do leaves turn light into food?');expect(results[0]?.sourceId).toBe(plant.id);expect(results).toHaveLength(3);expect(results[0]!.score).toBeGreaterThan(results[1]!.score);expect(results.every(r=>r.sourceId!==foreign.id)).toBe(true);
 const status=indexStatus(s,c.id)!;expect(status.status).toBe('ready');expect(status.modelVersion).toBe(EMBEDDING_VERSION);expect(status.modelId).toBe(EMBEDDING_MANIFEST.id);expect(status.weightsChecksum).toMatch(/^[a-f0-9]{64}$/);
 const lexical=s.db.prepare("select source_id from material_fts where material_fts match 'photosynthesis' and course_id=?").all(c.id);expect(lexical).toEqual([{source_id:plant.id}]);
},30000);
it('CHK-6.4-03 real correction/rebuild removes old semantics and preserves original bytes',async()=>{
 const s=fixture(),c=createCourse(s,'Synthetic');const m=source(s,c.id,'Dogs bark loudly and wag their tails.');const original=readOriginal(s,m);await rebuildIndex(s,c.id);
 correctMaterial(s,c.id,m.id,{text:'Photosynthesis transforms sunlight into chemical energy in plants.',expectedRevision:1});await expect(searchIndex(s,c.id,'What do dogs do?')).rejects.toThrow('index_rebuild_required');
 approveMaterial(s,c.id,m.id,{expectedRevision:2,reviewed:true});await rebuildIndex(s,c.id);const result=await searchIndex(s,c.id,'How do plants obtain energy?');expect(result[0]?.revision).toBe(2);expect(result[0]?.text).not.toContain('Dogs');expect(materialDetail(s,c.id,m.id).revisions).toHaveLength(2);expect(readOriginal(s,m)).toEqual(original);
},30000);
it('CHK-6.4-05 inference succeeds with macOS denying all network access and runtime telemetry disabled',()=>{
 expect(process.platform).toBe('darwin');
 const code=`import {embedTexts} from './packages/importers/dist/embeddings.js'; globalThis.fetch=()=>{throw Error('network forbidden')}; const v=await embedTexts(['A dog plays outside.','A puppy runs in a field.']); console.log(JSON.stringify({dimensions:v[0].length,similarity:v[0].reduce((s,n,i)=>s+n*v[1][i],0),telemetry:process.env.ORT_DISABLE_TELEMETRY}));`;
 const out=execFileSync('/usr/bin/sandbox-exec',['-p','(version 1) (allow default) (deny network*)',process.execPath,'--input-type=module','-e',code],{cwd:process.cwd(),encoding:'utf8',timeout:30000});
 const result=JSON.parse(out);expect(result.dimensions).toBe(384);expect(result.similarity).toBeGreaterThan(.3);expect(result.telemetry).toBe('1');
},35000);
it('missing or corrupted pinned model files fail without downloading replacement assets',()=>{
 const originalDir=verifyEmbeddingModel();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-model-missing-'));dirs.push(dir);vi.stubEnv('COLLEGENOTES_MODELS_DIR',dir);
 expect(()=>verifyEmbeddingModel()).toThrow('embedding_model_missing');fs.mkdirSync(path.join(dir,'minilm'));fs.copyFileSync(path.join(originalDir,'config.json'),path.join(dir,'minilm/config.json'));fs.appendFileSync(path.join(dir,'minilm/config.json'),' ');expect(()=>verifyEmbeddingModel()).toThrow('embedding_model_checksum_mismatch');
});
it('cancels a real worker without publishing partial chunks and permits a clean retry',async()=>{
 const s=fixture(),c=createCourse(s,'Synthetic'),m=source(s,c.id,'Plants convert sunlight into energy. '.repeat(20));
 const running=rebuildIndex(s,c.id);cancelIndex(s,c.id);await expect(running).rejects.toThrow();expect(indexStatus(s,c.id)?.status).toBe('stale');expect(s.db.prepare('select count(*) as n from semantic_chunks').get()).toEqual({n:0});expect(readOriginal(s,m).length).toBeGreaterThan(0);
 await rebuildIndex(s,c.id);expect(indexStatus(s,c.id)?.status).toBe('ready');
},30000);
it('changed source during an actual worker build cannot publish stale results',async()=>{
 const s=fixture(),c=createCourse(s,'Synthetic'),m=source(s,c.id,'The sun provides energy to plants. '.repeat(15));
 const running=rebuildIndex(s,c.id);correctMaterial(s,c.id,m.id,{text:'Updated source requiring review',expectedRevision:1});await expect(running).rejects.toThrow();expect(indexStatus(s,c.id)?.status).toBe('stale');expect(s.db.prepare('select count(*) as n from semantic_chunks').get()).toEqual({n:0});
},30000);
it('bounds inference inputs before allocating native model work',async()=>{
 await expect(embeddingWorker(['x'.repeat(241)])).rejects.toThrow('embedding_input_bounds');
});
