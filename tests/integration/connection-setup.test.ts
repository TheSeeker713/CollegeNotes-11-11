import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {afterEach,expect,it} from 'vitest';
import {openStore,listConnections,exportConnectionSettings} from '@collegenotes/storage';
import {connectionSetup,PROVIDERS} from '@collegenotes/providers';
import Fastify from 'fastify';
import {accountRoutes} from '../../apps/local-service/src/accounts.js';
import {createService} from '../../apps/local-service/src/index.js';
const cleanup:Array<()=>Promise<void>>=[];afterEach(async()=>{for(const fn of cleanup.splice(0))await fn();});
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-byo-')),store=openStore(dir),app=createService(store);cleanup.push(async()=>{await app.close();store.db.close();fs.rmSync(dir,{recursive:true,force:true});});return {app,store};}
it('only OpenAI and xAI offer optional account sign-in, and local endpoints are explicit',()=>{
 expect(PROVIDERS.filter(p=>p.auth.some(a=>a.method==='oauth')).map(p=>p.id)).toEqual(['openai','xai']);
 expect(connectionSetup({providerId:'local',label:'Own model',authMethod:'apiKey',endpoint:'http://127.0.0.1:11434/v1',modelId:'my-model'}).endpoint).toBe('http://127.0.0.1:11434/v1');
 for(const endpoint of ['http://example.com','file:///private','https://user:pass@example.com','https://example.com?key=secret','https://example.com#secret'])expect(()=>connectionSetup({providerId:'local',label:'Own',authMethod:'apiKey',endpoint})).toThrow();
 expect(()=>connectionSetup({providerId:'google',label:'Own',authMethod:'oauth'})).toThrow();
 expect(()=>connectionSetup({providerId:'local',label:'Own',authMethod:'apiKey',endpoint:'http://localhost:1234',apiKey:'synthetic-forbidden-field'})).toThrow('unexpected_connection_field');
});
it('multiple named accounts remain isolated, selection is explicit and local configuration sends no request',async()=>{
 const {app,store}=fixture();const add=(body:object)=>app.inject({method:'POST',url:'/ai-connections',payload:body});
 const a=await add({providerId:'xai',label:'Personal',authMethod:'oauth'}),b=await add({providerId:'xai',label:'School',authMethod:'oauth'});
 expect(a.statusCode).toBe(200);expect(b.statusCode).toBe(200);expect(a.json().id).not.toBe(b.json().id);
 const local=await add({providerId:'local',label:'Offline model',authMethod:'apiKey',endpoint:'http://127.0.0.1:1/v1',modelId:'synthetic'});expect(local.statusCode).toBe(200);
 const initial=(await app.inject('/ai-connections')).json();expect(initial.preferences).toEqual({onboardingDismissed:0,selectedConnectionId:null});expect(initial.connections).toHaveLength(3);
 expect((await app.inject({method:'PUT',url:'/ai-connections/preferences',payload:{selectedConnectionId:a.json().id,onboardingDismissed:true}})).statusCode).toBe(200);
 expect((await app.inject({method:'POST',url:`/ai-connections/${a.json().id}/login`})).statusCode).toBe(409);
 expect((await app.inject({method:'PUT',url:`/ai-connections/${b.json().id}`,payload:{label:'School account'}})).statusCode).toBe(200);
 expect((await app.inject({method:'DELETE',url:`/ai-connections/${a.json().id}`})).statusCode).toBe(200);
 const result=(await app.inject('/ai-connections')).json();expect(result.preferences.selectedConnectionId).toBe(null);expect(result.connections.map((c:{label:string})=>c.label)).toContain('School account');
 expect(listConnections(store).every(c=>!c.enabled&&!c.credential)).toBe(true);
 expect(JSON.stringify(exportConnectionSettings(store))).not.toContain('credential');
});
it('rejects secret fields, unsupported sign-in and unknown selection without creating profiles',async()=>{
 const {app,store}=fixture();
 for(const payload of [{providerId:'anthropic',label:'Wrong',authMethod:'oauth'},{providerId:'openai',label:'Wrong',authMethod:'apiKey',apiKey:'synthetic-rejected'}])expect((await app.inject({method:'POST',url:'/ai-connections',payload})).statusCode).toBe(400);
 expect((await app.inject({method:'PUT',url:'/ai-connections/preferences',payload:{selectedConnectionId:'../../other-account'}})).statusCode).toBe(404);
 expect((await app.inject({method:'PUT',url:'/ai-connections/preferences',payload:{selectedConnectionId:null,onboardingDismissed:'invalid'}})).statusCode).toBe(400);
 expect(listConnections(store)).toEqual([]);
});

it('synthetic account sessions use separate homes and removal signs out only the selected account',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-byo-isolation-')),store=openStore(dir),app=Fastify();
 cleanup.push(async()=>{await app.close();store.db.close();fs.rmSync(dir,{recursive:true,force:true});});
 const ports=new Map<string,{signed:boolean;stopped:boolean}>();
 accountRoutes(app,store,directory=>{const state={signed:false,stopped:false};ports.set(directory,state);return {
  status:async()=>({connected:state.signed,method:state.signed?'chatgpt':null,plan:null,loginPending:false}),
  login:async()=>{state.signed=true;return {authUrl:'https://auth.openai.com/authorize?synthetic=true'};},
  cancel:async()=>({cancelled:true}),logout:async()=>{state.signed=false;return {connected:false,method:null,plan:null,loginPending:false};},stop:()=>{state.stopped=true;}
 };});
 const add=async(label:string)=>(await app.inject({method:'POST',url:'/ai-connections',payload:{providerId:'openai',authMethod:'oauth',label}})).json().id as string;
 const a=await add('Personal'),b=await add('School');
 for(const id of [a,b]){expect((await app.inject({method:'POST',url:`/ai-connections/${id}/login`})).statusCode).toBe(200);expect((await app.inject(`/ai-connections/${id}/account`)).json().connected).toBe(true);}
 expect(ports.size).toBe(2);
 expect((await app.inject({method:'POST',url:`/ai-connections/${a}/disconnect`})).statusCode).toBe(200);
 expect((await app.inject({method:'POST',url:`/ai-connections/${a}/login`})).statusCode).toBe(200);
 expect((await app.inject(`/ai-connections/${a}/account`)).json().connected).toBe(true);
 expect((await app.inject({method:'DELETE',url:`/ai-connections/${a}`})).statusCode).toBe(200);
 expect(ports.get(path.join(dir,'accounts',a))).toEqual({signed:false,stopped:true});
 expect(ports.get(path.join(dir,'accounts',b))).toEqual({signed:true,stopped:false});
 expect(listConnections(store).map(c=>c.id)).toEqual([b]);
});

it('synthetic credential-store contract keeps secrets out of metadata and retains cleanup intent on failure',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-byo-credential-')),store=openStore(dir),app=Fastify();
 cleanup.push(async()=>{await app.close();store.db.close();fs.rmSync(dir,{recursive:true,force:true});});
 let failPut=false,failRemove=false;const held=new Set<string>();
 // This fake never touches Keychain or a provider; marker is not an API key.
 accountRoutes(app,store,()=>{throw new Error('unexpected_account_start');},{
  put:async id=>{held.add(id);if(failPut)throw new Error('synthetic-storage-failure');return {store:'macos-keychain',id};},
  read:async()=>null,remove:async ref=>{if(failRemove)throw new Error('synthetic-cleanup-failure');held.delete(ref.id);}
 });
 const id=(await app.inject({method:'POST',url:'/ai-connections',payload:{providerId:'anthropic',label:'Own API',authMethod:'apiKey'}})).json().id;
 const save=()=>app.inject({method:'POST',url:`/ai-connections/${id}/credential`,payload:{secret:'opaque-synthetic-contract-marker'}});
 failPut=true;expect((await save()).statusCode).toBe(500);expect(listConnections(store)[0]?.health).toBe('cleanup_pending');
 failPut=false;expect((await save()).statusCode).toBe(200);
 const response=(await app.inject('/ai-connections')).json();expect(response.connections[0].configured).toBe(true);expect(JSON.stringify(response)).not.toContain('opaque-synthetic-contract-marker');expect(JSON.stringify(exportConnectionSettings(store))).not.toContain('opaque-synthetic-contract-marker');
 failRemove=true;expect((await app.inject({method:'DELETE',url:`/ai-connections/${id}`})).statusCode).toBe(500);expect(listConnections(store)).toHaveLength(1);
 failRemove=false;expect((await app.inject({method:'DELETE',url:`/ai-connections/${id}`})).statusCode).toBe(200);expect(held.size).toBe(0);expect(listConnections(store)).toEqual([]);
});
