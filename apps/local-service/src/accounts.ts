import path from 'node:path';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import type {FastifyInstance,FastifyRequest} from 'fastify';
import {CodexAccount, MacKeychain, type CredentialStore, PROVIDERS, connectionSetup, connectionSummary, type Connection} from '@collegenotes/providers';
import {CourseError,saveProviderDefinition,saveConnection,listConnections,getConnection,deleteConnectionConfiguration,type Store} from '@collegenotes/storage';
type AccountPort=Pick<CodexAccount,'status'|'login'|'cancel'|'logout'|'stop'>;
export function accountRoutes(app:FastifyInstance,store:Store,makeAccount:(directory:string)=>AccountPort=directory=>new CodexAccount(directory),credentials:CredentialStore=new MacKeychain()){
 for(const p of PROVIDERS)saveProviderDefinition(store,p);
 const accounts=new Map<string,AccountPort>();let signingIn:string|null=null;
 let writes:Promise<unknown>=Promise.resolve();
 const mutation=(handler:(req:FastifyRequest)=>Promise<unknown>)=>(req:FastifyRequest)=>{const next=writes.catch(()=>undefined).then(()=>handler(req));writes=next;return next;};
 const get=(id:string)=>{const c=getConnection(store,id);if(!c)throw new CourseError('connection_not_found',404);return c;};
 const account=(id:string)=>{const c=get(id);if(c.providerId!=='openai'||c.authMethod!=='oauth')throw new CourseError('account_route_unavailable',409);let a=accounts.get(id);if(!a){a=makeAccount(path.join(store.dataDir,'accounts',id));accounts.set(id,a);}return a;};
 const preferences=()=>store.db.prepare('select onboarding_dismissed as onboardingDismissed,selected_connection_id as selectedConnectionId from ai_preferences where id=1').get();
 app.addHook('onClose',async()=>{for(const a of accounts.values())a.stop();});
 app.get('/ai-connections',async()=>({connections:listConnections(store).map(connectionSummary),providers:PROVIDERS,preferences:preferences()}));
 app.post('/ai-connections',mutation(async req=>{
  if(listConnections(store).length>=50)throw new CourseError('connection_limit',409);
  let setup;try{setup=connectionSetup(req.body);}catch{throw new CourseError('invalid_connection_setup',400);}
  const c:Connection={schemaVersion:1,id:randomUUID(),...setup,credential:null,enabled:false,capabilities:{},health:'untested',billing:'unknown',usageLimit:null,revocation:'not_requested'};
  saveConnection(store,c);return connectionSummary(c);
 }));
 app.put('/ai-connections/preferences',mutation(async req=>{
  const body=req.body as {selectedConnectionId?:unknown;onboardingDismissed?:unknown}|null;
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['selectedConnectionId','onboardingDismissed'].includes(k)))throw new CourseError('invalid_preferences',400);
  if(body.onboardingDismissed!==undefined&&typeof body.onboardingDismissed!=='boolean')throw new CourseError('invalid_preferences',400);
  if(body.selectedConnectionId!==undefined){if(body.selectedConnectionId!==null){if(typeof body.selectedConnectionId!=='string')throw new CourseError('invalid_connection',400);get(body.selectedConnectionId);}store.db.prepare('update ai_preferences set selected_connection_id=? where id=1').run(body.selectedConnectionId);}
  if(body.onboardingDismissed!==undefined){if(typeof body.onboardingDismissed!=='boolean')throw new CourseError('invalid_preferences',400);store.db.prepare('update ai_preferences set onboarding_dismissed=? where id=1').run(body.onboardingDismissed?1:0);}
  return preferences();
 }));
 app.post('/ai-connections/:id/credential',mutation(async req=>{
  const id=(req.params as {id:string}).id,c=get(id),body=req.body as {secret?:unknown}|null;
  if(c.authMethod!=='apiKey'||!body||Object.keys(body).some(k=>k!=='secret')||typeof body.secret!=='string'||!body.secret.trim()||Buffer.byteLength(body.secret)>8192)throw new CourseError('invalid_credential',400);
  // Persist cleanup intent first so a crash cannot orphan a Keychain item.
  const reference={store:'macos-keychain' as const,id};
  saveConnection(store,{...c,credential:reference,enabled:false,health:'cleanup_pending'});
  try{await credentials.put(id,body.secret);saveConnection(store,{...c,credential:reference,enabled:false,health:'untested'});}
  finally{body.secret='';}
  return {saved:true};
 }));
 app.put('/ai-connections/:id',mutation(async req=>{
  const id=(req.params as {id:string}).id,c=get(id),body=req.body as {label?:unknown;enabled?:unknown}|null;
  if(!body||Object.keys(body).some(k=>!['label','enabled'].includes(k)))throw new CourseError('invalid_connection_update',400);
  if(body.label!==undefined){if(typeof body.label!=='string'||!body.label.trim()||body.label.length>80)throw new CourseError('invalid_label',400);c.label=body.label.trim();}
  if(body.enabled!==undefined){if(typeof body.enabled!=='boolean')throw new CourseError('invalid_connection_update',400);if(body.enabled)throw new CourseError('inference_adapter_not_ready',409);c.enabled=false;}
  saveConnection(store,c);return connectionSummary(c);
 }));
 app.get('/ai-connections/:id/account',async req=>{const id=(req.params as {id:string}).id;const status=await account(id).status();if(signingIn===id&&!status.loginPending)signingIn=null;return status;});
 app.post('/ai-connections/:id/login',mutation(async req=>{
  const id=(req.params as {id:string}).id,a=account(id);if(signingIn)throw new CourseError('another_sign_in_pending',409);signingIn=id;
  saveConnection(store,{...get(id),enabled:false,revocation:'not_requested'});
  try{return await a.login();}catch(e){signingIn=null;throw e;}
 }));
 app.post('/ai-connections/:id/cancel',mutation(async req=>{const id=(req.params as {id:string}).id;const result=await account(id).cancel();if(signingIn===id)signingIn=null;return result;}));
 app.post('/ai-connections/:id/disconnect',mutation(async req=>{
  const id=(req.params as {id:string}).id,c=get(id);
  if(c.authMethod==='oauth'&&c.providerId==='openai')await account(id).logout();
  if(c.credential)await credentials.remove(c.credential);
  saveConnection(store,{...c,credential:null,enabled:false,health:'untested',revocation:'complete'});
  accounts.get(id)?.stop();accounts.delete(id);if(signingIn===id)signingIn=null;return {disconnected:true};
 }));
 app.delete('/ai-connections/:id',mutation(async req=>{
  const id=(req.params as {id:string}).id,c=get(id);
  // Login status is not inferred from configuration; vendor logout must finish before removal.
  if(c.authMethod==='oauth'&&c.providerId==='openai'&&c.revocation!=='complete'&&(accounts.has(id)||fs.existsSync(path.join(store.dataDir,'accounts',id))))await account(id).logout();
  if(c.credential){await credentials.remove(c.credential);saveConnection(store,{...c,credential:null,enabled:false,health:'untested'});}
  deleteConnectionConfiguration(store,id);accounts.get(id)?.stop();accounts.delete(id);if(signingIn===id)signingIn=null;return {removed:true};
 }));
}
