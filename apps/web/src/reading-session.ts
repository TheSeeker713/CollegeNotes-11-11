import {api} from './client';
import type {ReadingPosition} from '@collegenotes/domain';
// Failed writes survive navigation in this window. Nothing is silently rebased over another tab.
const pending=new Map<string,ReadingPosition>();
const writers=new Map<string,Promise<unknown>>();
const versions=new Map<string,number>();
export const pendingPosition=(c:string,s:string,revision:number)=>pending.get(`${c}:${s}:${revision}`);
export function rememberPosition(c:string,s:string,p:ReadingPosition){pending.set(`${c}:${s}:${p.revision}`,p);}
export function flushPosition(c:string,s:string,revision:number):Promise<void>{
 const key=`${c}:${s}:${revision}`;const next=pending.get(key);if(!next)return Promise.resolve();
 const job=(writers.get(key)??Promise.resolve()).catch(()=>undefined).then(async()=>{
  const p=pending.get(key);if(!p)return;const saved=await api.reading.savePosition(c,s,{...p,version:versions.get(key)??p.version});versions.set(key,saved.version);if(pending.get(key)===p)pending.delete(key);
 });writers.set(key,job);return job;
}
export function resetPositionVersion(c:string,s:string,p:ReadingPosition){if(!pending.has(`${c}:${s}:${p.revision}`))versions.set(`${c}:${s}:${p.revision}`,p.version);}
