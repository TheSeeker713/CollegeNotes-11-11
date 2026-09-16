import type {FastifyInstance} from 'fastify';
import {lastReadingSource,readingAnnotations,addAnnotation,changeAnnotation,readingPosition,saveReadingPosition,readingDocument,requireMaterial,readOriginal,checksum,CourseError,type Store} from '@collegenotes/storage';
import {epubReading} from '@collegenotes/importers';
export function readingRoutes(app:FastifyInstance,store:Store){
 app.get('/courses/:courseId/reading-session',async request=>lastReadingSource(store,(request.params as {courseId:string}).courseId));
 const ids=(params:unknown)=>params as {courseId:string;sourceId:string;id:string};
 app.get('/courses/:courseId/reading/:sourceId/annotations',async request=>{const p=ids(request.params);return readingAnnotations(store,p.courseId,p.sourceId);});
 app.post('/courses/:courseId/reading/:sourceId/annotations',async request=>{const p=ids(request.params);return addAnnotation(store,p.courseId,p.sourceId,request.body);});
 app.put('/courses/:courseId/reading/:sourceId/annotations/:id',async request=>{const p=ids(request.params);return changeAnnotation(store,p.courseId,p.sourceId,p.id,request.body);});
 app.delete('/courses/:courseId/reading/:sourceId/annotations/:id',async request=>{const p=ids(request.params);return changeAnnotation(store,p.courseId,p.sourceId,p.id,request.body,true);});
 app.get('/courses/:courseId/reading/:sourceId/position',async request=>{const p=ids(request.params);const r=(request.query as {revision?:string}).revision;if(r&&(!/^\d+$/.test(r)||Number(r)<1))throw new CourseError('invalid_revision');return readingPosition(store,p.courseId,p.sourceId,r?Number(r):undefined);});
 app.put('/courses/:courseId/reading/:sourceId/position',async request=>{const p=ids(request.params);return saveReadingPosition(store,p.courseId,p.sourceId,request.body);});
 app.get('/courses/:courseId/reading/:sourceId',async request=>{const {courseId,sourceId}=request.params as {courseId:string;sourceId:string};const {revision}=request.query as {revision?:string};if(revision&&(!/^\d+$/.test(revision)||Number(revision)<1))throw new CourseError('invalid_revision');return readingDocument(store,courseId,sourceId,revision?Number(revision):undefined);});
 app.get('/courses/:courseId/reading/:sourceId/epub',async request=>{const {courseId,sourceId}=request.params as {courseId:string;sourceId:string};readingDocument(store,courseId,sourceId);const m=requireMaterial(store,courseId,sourceId);if(!/\.epub$/i.test(m.filename))throw new CourseError('not_epub');const bytes=readOriginal(store,m);if(checksum(bytes)!==m.checksum)throw new CourseError('original_checksum_mismatch',409);try{return await epubReading(bytes);}catch{throw new CourseError('epub_reading_unavailable',422);}});
}
