import type {Annotation,Course,ReadingDocument,ReadingPosition} from '@collegenotes/domain';
export type OfflinePack={schema:1;preparedAt:string;course:Course;documents:Array<{document:ReadingDocument;originalBase64:string;annotations:Annotation[];position:ReadingPosition|null;epub:{chapters:Array<{location:string;title:string;html:string}>;warnings:string[]}|null}>;index:{model:{id:string;version:string;checksum:string};sourceRevisions:Record<string,number>;chunks:Array<{sourceId:string;revision:number;text:string;start:number;end:number;vector:number[]}>}};
const NAME='collegenotes-prepared-reading-v1';
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('courses',{keyPath:'course.id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transaction<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('courses',mode),r=action(tx.objectStore('courses'));tx.oncomplete=()=>{db.close();resolve(r.result);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error??r.error);};});}
export const cachedCourses=()=>transaction('readonly',s=>s.getAll()) as Promise<OfflinePack[]>;
export async function savePack(pack:OfflinePack){await transaction('readwrite',s=>s.put(pack));}
export async function removePack(id:string){await transaction('readwrite',s=>s.delete(id));}
export function packMatches(pack:OfflinePack,sources:Array<{id:string;revision:number;approvedRevision:number|null;trashedAt:string|null;deletedAt:string|null;cleanupState:string}>){return pack.documents.every(({document:d})=>sources.some(s=>s.id===d.sourceId&&s.revision===d.revision&&s.approvedRevision===d.revision&&!s.trashedAt&&!s.deletedAt&&s.cleanupState==='none'));}
export async function prepareShell(){
 if(!import.meta.env.PROD)throw new Error('Use the production preview on port 4173 to prepare cold-open app assets. Development mode cannot prepare the app shell.');
 if(!('serviceWorker'in navigator))throw new Error('This browser cannot prepare app assets.');
 const registration=await navigator.serviceWorker.register('/sw.js');await registration.update();
 await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('App shell preparation timed out; retry.')),20000))]);
}
