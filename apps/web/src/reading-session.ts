import {api} from './client';
import type {ReadingPosition} from '@collegenotes/domain';
// Failed writes survive navigation in this window. Nothing is silently rebased over another tab.
const pending=new Map<string,ReadingPosition>();
const writers=new Map<string,Promise<unknown>>();
const versions=new Map<string,number>();
export const pendingPosition=(c:string,s:string)=>pending.get(`${c}:${s}`);
export function rememberPosition(c:string,s:string,p:ReadingPosition){pending.set(`${c}:${s}`,p);}
export function flushPosition(c:string,s:string):Promise<void>{
 const key=`${c}:${s}`;const next=pending.get(key);if(!next)return Promise.resolve();
 const job=(writers.get(key)??Promise.resolve()).catch(()=>undefined).then(async()=>{
  const p=pending.get(key);if(!p)return;const saved=await api.reading.savePosition(c,s,{...p,version:versions.get(key)??p.version});versions.set(key,saved.version);if(pending.get(key)===p)pending.delete(key);
 });writers.set(key,job);return job;
}
export function resetPositionVersion(c:string,s:string,p:ReadingPosition){if(!pending.has(`${c}:${s}`))versions.set(`${c}:${s}`,p.version);}
