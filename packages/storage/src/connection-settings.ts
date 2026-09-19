import {CAPABILITIES,PROVIDERS,connectionSetup,type Connection,type Capability} from '@collegenotes/providers';
import {getConnection,saveConnection,listProviderDefinitions} from './foundation.js';
import {CourseError} from './courses.js';
import type {Store} from './database.js';
export function configureConnection(store:Store,id:string,input:unknown){
 const c=getConnection(store,id);if(!c)throw new CourseError('connection_not_found',404);
 if(!input||typeof input!=='object'||Array.isArray(input))throw new CourseError('invalid_connection_settings');
 const v=input as Record<string,unknown>;
 if(Object.keys(v).some(k=>!['modelId','billing','ceiling','capabilities'].includes(k)))throw new CourseError('invalid_connection_settings');
 const model=v.modelId;
 if(typeof model!=='string'||! /^[a-zA-Z0-9_.:/@-]{1,150}$/.test(model))throw new CourseError('model_required');
 if(!['unknown','subscription','free_allowance','metered_api'].includes(v.billing as string))throw new CourseError('billing_required');
 if(c.authMethod==='apiKey'&&c.providerId!=='local'&&v.billing==='subscription')throw new CourseError('api_does_not_use_subscription');
 if(v.ceiling!==null&&(typeof v.ceiling!=='number'||!Number.isFinite(v.ceiling)||v.ceiling<0||v.ceiling>10000))throw new CourseError('invalid_usage_limit');
 if(!Array.isArray(v.capabilities)||v.capabilities.some(x=>!CAPABILITIES.includes(x)||!PROVIDERS.find(p=>p.id===c.providerId)!.capabilities.includes(x)))throw new CourseError('invalid_capabilities');
 if(v.capabilities.some(x=>!['tutor','research','narration','transcription'].includes(x)))throw new CourseError('capability_not_implemented');
 const updated:Connection={...c,modelId:model,billing:v.billing as Connection['billing'],usageLimit:v.ceiling===null?null:{currency:'USD',ceiling:v.ceiling as number,spent:c.usageLimit?.spent??0},capabilities:Object.fromEntries(v.capabilities.map((cap:Capability)=>[cap,{enabled:true,modelId:model}]))};
 saveConnection(store,updated);return updated;
}
export function selectCapability(store:Store,capability:unknown,id:unknown){
 if(typeof capability!=='string'||!['tutor','research','narration','transcription'].includes(capability))throw new CourseError('capability_not_implemented');
 if(id===null){store.db.prepare('delete from capability_assignments where capability=?').run(capability);return;}
 if(typeof id!=='string')throw new CourseError('invalid_connection');
 const c=getConnection(store,id),p=listProviderDefinitions(store).find(p=>p.id===c?.providerId);
 if(!c?.enabled||!p?.enabled||!c.capabilities[capability as Capability]?.enabled||!c.modelId||c.health==='cleanup_pending')throw new CourseError('connection_unavailable',409);
 store.db.prepare('insert into capability_assignments(capability,connection_id,model_id) values(?,?,?) on conflict(capability) do update set connection_id=excluded.connection_id,model_id=excluded.model_id').run(capability,id,c.modelId);
}
export function selectedCapabilities(store:Store){return store.db.prepare('select capability,connection_id as connectionId,model_id as modelId from capability_assignments').all() as Array<{capability:Capability;connectionId:string;modelId:string}>;}
export function localEndpoint(c:Connection){if(c.providerId!=='local'||!c.endpoint)return false;const u=new URL(c.endpoint);return ['localhost','127.0.0.1','[::1]'].includes(u.hostname);}
export function updateEndpoint(store:Store,id:string,endpoint:unknown){
 const c=getConnection(store,id);if(!c||c.authMethod!=='apiKey')throw new CourseError('invalid_connection');
 let setup;try{setup=connectionSetup({providerId:c.providerId,label:c.label,authMethod:c.authMethod,endpoint,modelId:c.modelId});}catch{throw new CourseError('invalid_endpoint');}
 if(c.credential&&setup.endpoint!==c.endpoint)throw new CourseError('disconnect_before_endpoint_change',409);
 saveConnection(store,{...c,endpoint:setup.endpoint,enabled:false});
}
