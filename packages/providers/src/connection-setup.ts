import type {AuthMethod, Connection} from './contracts.js';
import {PROVIDERS} from './contracts.js';
export function connectionSetup(input:unknown):{providerId:string;label:string;authMethod:AuthMethod;endpoint:string|null;modelId:string|null}{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('invalid_connection');
 const v=input as Record<string,unknown>;
 if(Object.keys(v).some(k=>!['providerId','label','authMethod','endpoint','modelId'].includes(k)))throw new Error('unexpected_connection_field');
 const provider=PROVIDERS.find(p=>p.id===v.providerId);
 if(!provider||!provider.auth.some(a=>a.method===v.authMethod))throw new Error('unsupported_connection_method');
 if(typeof v.label!=='string'||!v.label.trim()||v.label.length>80)throw new Error('connection_label_required');
 const modelId=v.modelId===undefined||v.modelId===null||v.modelId===''?null:v.modelId;
 if(modelId!==null&&(typeof modelId!=='string'||modelId.length>150||!/^[a-zA-Z0-9_.:/@-]+$/.test(modelId)))throw new Error('invalid_model');
 let endpoint:string|null=null;
 if(v.endpoint!==undefined&&v.endpoint!==null&&v.endpoint!==''){
  if(typeof v.endpoint!=='string'||v.endpoint.length>512)throw new Error('invalid_endpoint');
  const u=new URL(v.endpoint);
  const local=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
  if((u.protocol!=='https:'&&!(u.protocol==='http:'&&local))||u.username||u.password||u.search||u.hash)throw new Error('invalid_endpoint');
  endpoint=u.href.replace(/\/$/,'');
 }
 if(v.authMethod==='oauth'&&(endpoint||modelId))throw new Error('oauth_endpoint_not_configurable');
 if(provider.id==='local'&&!endpoint)throw new Error('local_endpoint_required');
 return {providerId:provider.id,label:v.label.trim(),authMethod:v.authMethod as AuthMethod,endpoint,modelId:modelId as string|null};
}
export type ConnectionSetup = ReturnType<typeof connectionSetup>;
export type SavedConnection = Omit<Connection,'credential'> & {endpoint?:string|null;modelId?:string|null};
