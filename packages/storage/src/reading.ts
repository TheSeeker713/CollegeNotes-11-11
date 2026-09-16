import {readingLocations,type ReadingAnchor,type ReadingDocument} from '@collegenotes/domain';
import {materialDetail} from './material-lifecycle.js';
import {CourseError,requireCourse} from './courses.js';
import type {Store} from './database.js';
export function readingDocument(store:Store,courseId:string,sourceId:string,revision?:number):ReadingDocument{
 requireCourse(store,courseId,true);const detail=materialDetail(store,courseId,sourceId);const r=detail.revisions.find(r=>r.revision===(revision??detail.material.revision));if(!r)throw new CourseError('reading_revision_unavailable',404);
 const anchors=JSON.parse(r.anchors) as ReadingAnchor[];const exact=r.author==='extraction';return {sourceId,courseId,filename:detail.material.filename,revision:r.revision,text:r.text,locations:readingLocations(r.text,anchors,exact),exactOriginalMapping:exact,warnings:['Reflowed extraction may omit tables, figures, equations or layout. Check the original.',...(exact?[]:['Corrected text has revision-specific offsets; original page alignment is not guaranteed.'])]};
}
