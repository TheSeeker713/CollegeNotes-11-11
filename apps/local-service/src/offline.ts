import type {FastifyInstance} from 'fastify';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {exportMaterials,readingDocument,readingAnnotations,readingPosition,requireCourse,preparedIndex,lexicalSearch,courseModules,listActivities,listNarrationAssets,narrationAudioPath,listVisualExperiments,type Store,CourseError} from '@collegenotes/storage';
import {epubReading,verifyEmbeddingModel} from '@collegenotes/importers';
import {LOCAL_MODEL} from './semantic.js';
export function offlineRoutes(app:FastifyInstance,store:Store){
 app.post('/courses/:id/lexical-search',async request=>lexicalSearch(store,(request.params as {id:string}).id,(request.body as {query?:unknown}|null)?.query,LOCAL_MODEL));
 app.post('/courses/:id/offline-pack',async request=>{
 const c=(request.params as {id:string}).id;const ids=(request.body as {sourceIds?:unknown}|null)?.sourceIds;
 const exported=exportMaterials(store,c,ids);verifyEmbeddingModel();const sourceIds=exported.data.sources.map(s=>s.id);const index=preparedIndex(store,c,sourceIds,LOCAL_MODEL);
 const course=requireCourse(store,c,true);const documents=[];
 for(const source of exported.data.sources){documents.push({document:readingDocument(store,c,source.id),originalBase64:source.originalBase64,annotations:readingAnnotations(store,c,source.id),position:readingPosition(store,c,source.id),epub:/\.epub$/i.test(source.filename)?await epubReading(Buffer.from(source.originalBase64,'base64')):null});}
 const enabled=new Set(courseModules(store,c).filter(m=>m.enabled).map(m=>m.moduleId));
 const selected=new Set(sourceIds);
 const activities=enabled.has('study')?listActivities(store,c).filter(a=>a.status==='ready'&&a.sources.every(s=>selected.has(s.sourceId)&&index.sourceRevisions[s.sourceId]===s.revision)):[];
 const narrations=enabled.has('audio')?listNarrationAssets(store,c).filter(a=>a.status==='ready'&&selected.has(a.sourceId)&&index.sourceRevisions[a.sourceId]===a.sourceRevision).map(asset=>{
   const bytes=fs.readFileSync(narrationAudioPath(store,c,asset.id));
   if(bytes.length!==asset.byteLength)throw new CourseError('narration_file_changed_retry',409);
   return {asset,audioBase64:bytes.toString('base64'),checksum:createHash('sha256').update(bytes).digest('hex')};
 }):[];
 const visuals=enabled.has('visuals')?listVisualExperiments(store,c):[];
 // The async EPUB work must not publish a snapshot if source ownership or index changed meanwhile.
 const current=preparedIndex(store,c,sourceIds,LOCAL_MODEL);if(JSON.stringify(current.sourceRevisions)!==JSON.stringify(index.sourceRevisions))throw new CourseError('offline_source_changed_retry',409);
 for(const d of documents)if(readingDocument(store,c,d.document.sourceId).revision!==d.document.revision)throw new CourseError('offline_source_changed_retry',409);
 const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const manifest={schema:1 as const,model:{...LOCAL_MODEL,verifiedOnThisMac:true,bundledInBrowser:false},themeModes:['botanical:light','botanical:dark','brutalist:light','brutalist:dark'],resources:[
   ...documents.map(d=>({kind:'reading',id:d.document.sourceId,checksum:digest(d)})),
   ...activities.map(a=>({kind:'study',id:a.id,checksum:digest(a)})),
   ...narrations.map(n=>({kind:'narration',id:n.asset.id,checksum:n.checksum})),
   ...visuals.map(v=>({kind:'visual',id:v.id,checksum:digest(v)})),
   {kind:'index',id:LOCAL_MODEL.version,checksum:digest(index)}
 ],capabilities:{browserReading:true,browserStudyReview:activities.length>0,browserNarration:narrations.length>0,browserVisuals:visuals.length>0,localSemanticInference:true,freshGenerativeTutor:false}};
 const pack={schema:2 as const,preparedAt:new Date().toISOString(),course,documents,index,activities,narrations,visuals,manifest};if(Buffer.byteLength(JSON.stringify(pack))>100*1024*1024)throw new CourseError('offline_pack_too_large');return pack;
 });
}
