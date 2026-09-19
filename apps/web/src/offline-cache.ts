import type {Annotation,Course,ReadingDocument,ReadingPosition,StudyActivity,VisualExperimentRecord,NarrationAsset} from '@collegenotes/domain';
export type OfflinePack={schema:2;preparedAt:string;course:Course;documents:Array<{document:ReadingDocument;originalBase64:string;annotations:Annotation[];position:ReadingPosition|null;epub:{chapters:Array<{location:string;title:string;html:string}>;warnings:string[]}|null}>;index:{model:{id:string;version:string;checksum:string};sourceRevisions:Record<string,number>;chunks:Array<{sourceId:string;revision:number;text:string;start:number;end:number;vector:number[]}>};activities:StudyActivity[];narrations:Array<{asset:NarrationAsset;audioBase64:string;checksum:string}>;visuals:VisualExperimentRecord[];manifest:{schema:1;model:{id:string;version:string;checksum:string;verifiedOnThisMac:boolean;bundledInBrowser:boolean};themeModes:string[];resources:Array<{kind:string;id:string;checksum:string}>;capabilities:{browserReading:boolean;browserStudyReview:boolean;browserNarration:boolean;browserVisuals:boolean;localSemanticInference:boolean;freshGenerativeTutor:boolean}}};
const NAME='collegenotes-prepared-reading-v1';
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('courses',{keyPath:'course.id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transaction<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('courses',mode),r=action(tx.objectStore('courses'));tx.oncomplete=()=>{db.close();resolve(r.result);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error??r.error);};});}
async function digest(value:unknown):Promise<string>{
 const data=value instanceof Uint8Array?value:new TextEncoder().encode(JSON.stringify(value));
 const hash=await crypto.subtle.digest('SHA-256',data as BufferSource);
 return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function validPack(pack:OfflinePack):Promise<boolean>{
 if(pack.schema!==2||!pack.manifest||!packMatches(pack,pack.documents.map(d=>({id:d.document.sourceId,revision:d.document.revision,approvedRevision:d.document.revision,trashedAt:null,deletedAt:null,cleanupState:'none'}))))return false;
 const resources=[
  ...pack.documents.map(d=>({kind:'reading',id:d.document.sourceId,value:d})),
  ...pack.activities.map(a=>({kind:'study',id:a.id,value:a})),
  ...pack.narrations.map(n=>({kind:'narration',id:n.asset.id,value:Uint8Array.from(atob(n.audioBase64),char=>char.charCodeAt(0))})),
  ...pack.visuals.map(v=>({kind:'visual',id:v.id,value:v})),
  {kind:'index',id:pack.index.model.version,value:pack.index}
 ];
 if(resources.length!==pack.manifest.resources.length)return false;
 for(const item of resources){const saved=pack.manifest.resources.find(r=>r.kind===item.kind&&r.id===item.id);if(!saved||saved.checksum!==await digest(item.value))return false;}
 return true;
}
export async function cachedCourses():Promise<OfflinePack[]>{
 const rows=await transaction('readonly',s=>s.getAll()) as Array<OfflinePack|{schema:1;course:{id:string}}>;
 const ready:OfflinePack[]=[];
 for(const row of rows){
  try{if(row.schema===2&&await validPack(row)){ready.push(row);continue;}}catch{/* corrupted or incompatible private copy */}
  await removePack(row.course.id);
 }
 return ready;
}
export async function savePack(pack:OfflinePack){await transaction('readwrite',s=>s.put(pack));}
export async function removePack(id:string){await transaction('readwrite',s=>s.delete(id));}
export function packMatches(pack:OfflinePack,sources:Array<{id:string;revision:number;approvedRevision:number|null;trashedAt:string|null;deletedAt:string|null;cleanupState:string}>){return pack.schema===2&&pack.manifest?.model.id===pack.index.model.id&&pack.manifest.model.version===pack.index.model.version&&pack.manifest.model.checksum===pack.index.model.checksum&&pack.documents.every(({document:d})=>sources.some(s=>s.id===d.sourceId&&s.revision===d.revision&&s.approvedRevision===d.revision&&!s.trashedAt&&!s.deletedAt&&s.cleanupState==='none'));}
export async function prepareShell(){
 if(!import.meta.env.PROD)throw new Error('Use the production preview on port 4173 to prepare cold-open app assets. Development mode cannot prepare the app shell.');
 if(!('serviceWorker'in navigator))throw new Error('This browser cannot prepare app assets.');
 const registration=await navigator.serviceWorker.register('/sw.js');await registration.update();
 await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('App shell preparation timed out; retry.')),20000))]);
}
