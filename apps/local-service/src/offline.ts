import type {FastifyInstance} from 'fastify';
import {exportMaterials,readingDocument,readingAnnotations,readingPosition,requireCourse,preparedIndex,lexicalSearch,type Store,CourseError} from '@collegenotes/storage';
import {epubReading,verifyEmbeddingModel} from '@collegenotes/importers';
import {LOCAL_MODEL} from './semantic.js';
export function offlineRoutes(app:FastifyInstance,store:Store){
 app.post('/courses/:id/lexical-search',async request=>lexicalSearch(store,(request.params as {id:string}).id,(request.body as {query?:unknown}|null)?.query,LOCAL_MODEL));
 app.post('/courses/:id/offline-pack',async request=>{
 const c=(request.params as {id:string}).id;const ids=(request.body as {sourceIds?:unknown}|null)?.sourceIds;
 const exported=exportMaterials(store,c,ids);verifyEmbeddingModel();const sourceIds=exported.data.sources.map(s=>s.id);const index=preparedIndex(store,c,sourceIds,LOCAL_MODEL);
 const course=requireCourse(store,c,true);const documents=[];
 for(const source of exported.data.sources){documents.push({document:readingDocument(store,c,source.id),originalBase64:source.originalBase64,annotations:readingAnnotations(store,c,source.id),position:readingPosition(store,c,source.id),epub:/\.epub$/i.test(source.filename)?await epubReading(Buffer.from(source.originalBase64,'base64')):null});}
 // The async EPUB work must not publish a snapshot if source ownership or index changed meanwhile.
 const current=preparedIndex(store,c,sourceIds,LOCAL_MODEL);if(JSON.stringify(current.sourceRevisions)!==JSON.stringify(index.sourceRevisions))throw new CourseError('offline_source_changed_retry',409);
 for(const d of documents)if(readingDocument(store,c,d.document.sourceId).revision!==d.document.revision)throw new CourseError('offline_source_changed_retry',409);
 const pack={schema:1 as const,preparedAt:new Date().toISOString(),course,documents,index};if(Buffer.byteLength(JSON.stringify(pack))>100*1024*1024)throw new CourseError('offline_pack_too_large');return pack;
 });
}
