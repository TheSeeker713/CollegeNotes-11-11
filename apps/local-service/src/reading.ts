import type {FastifyInstance} from 'fastify';
import {readingDocument,requireMaterial,readOriginal,checksum,CourseError,type Store} from '@collegenotes/storage';
import {epubReading} from '@collegenotes/importers';
export function readingRoutes(app:FastifyInstance,store:Store){
 app.get('/courses/:courseId/reading/:sourceId',async request=>{const {courseId,sourceId}=request.params as {courseId:string;sourceId:string};const {revision}=request.query as {revision?:string};if(revision&&(!/^\d+$/.test(revision)||Number(revision)<1))throw new CourseError('invalid_revision');return readingDocument(store,courseId,sourceId,revision?Number(revision):undefined);});
 app.get('/courses/:courseId/reading/:sourceId/epub',async request=>{const {courseId,sourceId}=request.params as {courseId:string;sourceId:string};readingDocument(store,courseId,sourceId);const m=requireMaterial(store,courseId,sourceId);if(!/\.epub$/i.test(m.filename))throw new CourseError('not_epub');const bytes=readOriginal(store,m);if(checksum(bytes)!==m.checksum)throw new CourseError('original_checksum_mismatch',409);try{return await epubReading(bytes);}catch{throw new CourseError('epub_reading_unavailable',422);}});
}
