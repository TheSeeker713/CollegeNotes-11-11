import path from 'node:path';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import type {FastifyInstance,FastifyRequest} from 'fastify';
import {CodexAccount, GrokAccount, MacKeychain, type CredentialStore, PROVIDERS, connectionSetup, connectionSummary, type Connection} from '@collegenotes/providers';
import {CourseError,configureConnection,selectCapability,selectedCapabilities,setProviderEnabled,listProviderDefinitions,exportConnectionSettings,updateEndpoint,saveProviderDefinition,saveConnection,listConnections,getConnection,deleteConnectionConfiguration,type Store} from '@collegenotes/storage';
type AccountPort=Pick<CodexAccount,'status'|'login'|'cancel'|'logout'|'stop'> & {revoke?:()=>Promise<{revoked:boolean;localAccessRemoved:boolean}>};
export function accountRoutes(app:FastifyInstance,store:Store,makeAccount:(directory:string)=>AccountPort=directory=>new CodexAccount(directory),credentials:CredentialStore=new MacKeychain(),makeGrok?:((id:string,onStored:()=>void,cleanupPending:boolean)=>AccountPort)){
 for(const p of PROVIDERS)saveProviderDefinition(store,p);
 const accounts=new Map<string,AccountPort>();let signingIn:string|null=null;
 let writes:Promise<unknown>=Promise.resolve();
 const mutation=(handler:(req:FastifyRequest)=>Promise<unknown>)=>(req:FastifyRequest)=>{const next=writes.catch(()=>undefined).then(()=>handler(req));writes=next;return next;};
 const get=(id:string)=>{const c=getConnection(store,id);if(!c)throw new CourseError('connection_not_found',404);return c;};
 const account=(id:string)=>{const c=get(id);if(!['openai','xai'].includes(c.providerId)||c.authMethod!=='oauth')throw new CourseError('account_route_unavailable',409);let a=accounts.get(id);if(!a){const stored=()=>saveConnection(store,{...get(id),health:'untested'});a=c.providerId==='xai'?(makeGrok?.(id,stored,c.health==='cleanup_pending')??new GrokAccount(id,credentials,{onStored:stored,cleanupPending:c.health==='cleanup_pending'})):makeAccount(path.join(store.dataDir,'accounts',id));accounts.set(id,a);}return a;};
 const preferences=()=>store.db.prepare('select onboarding_dismissed as onboardingDismissed,selected_connection_id as selectedConnectionId from ai_preferences where id=1').get();
 app.addHook('onClose',async()=>{await Promise.allSettled([...accounts.values()].map(async a=>{try{await a.cancel();}finally{a.stop();}}));});
 app.get('/ai-connections',async()=>({connections:listConnections(store).map(connectionSummary),providers:listProviderDefinitions(store),preferences:preferences(),assignments:selectedCapabilities(store)}));
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
 app.get('/ai-connections/export',async()=>exportConnectionSettings(store));
 app.put('/ai-connections/:id/settings',mutation(async req=>connectionSummary(configureConnection(store,(req.params as {id:string}).id,req.body))));
 app.put('/ai-connections/:id/endpoint',mutation(async req=>{updateEndpoint(store,(req.params as {id:string}).id,(req.body as {endpoint?:unknown})?.endpoint);return {saved:true};}));
 app.put('/ai-defaults/:capability',mutation(async req=>{selectCapability(store,(req.params as {capability:string}).capability,(req.body as {connectionId?:unknown})?.connectionId);return selectedCapabilities(store);}));
 app.put('/ai-providers/:id',mutation(async req=>{const enabled=(req.body as {enabled?:unknown})?.enabled;if(typeof enabled!=='boolean')throw new CourseError('invalid_provider');setProviderEnabled(store,(req.params as {id:string}).id,enabled);return {saved:true};}));
 app.put('/ai-connections/:id',mutation(async req=>{
  const id=(req.params as {id:string}).id,c=get(id),body=req.body as {label?:unknown;enabled?:unknown}|null;
  if(!body||Object.keys(body).some(k=>!['label','enabled'].includes(k)))throw new CourseError('invalid_connection_update',400);
  if(body.label!==undefined){if(typeof body.label!=='string'||!body.label.trim()||body.label.length>80)throw new CourseError('invalid_label',400);c.label=body.label.trim();}
  if(body.enabled!==undefined){if(typeof body.enabled!=='boolean')throw new CourseError('invalid_connection_update',400);if(body.enabled&&c.health==='cleanup_pending')throw new CourseError('credential_cleanup_required',409);c.enabled=body.enabled;if(body.enabled&&c.credential)c.health='ready';if(!body.enabled)c.health=c.health==='cleanup_pending'?c.health:'untested';}
  saveConnection(store,c);return connectionSummary(c);
 }));
 app.get('/ai-connections/:id/account',async req=>{const id=(req.params as {id:string}).id;const c=get(id);if(c.providerId==='xai'&&c.authMethod==='oauth'&&!c.credential)return {connected:false,method:null,plan:null,loginPending:false};const status=await account(id).status();if(signingIn===id&&!status.loginPending)signingIn=null;return status;});
 app.post('/ai-connections/:id/login',mutation(async req=>{
  const id=(req.params as {id:string}).id,a=account(id);if(signingIn&&!(await account(signingIn).status()).loginPending)signingIn=null;if(signingIn)throw new CourseError('another_sign_in_pending',409);signingIn=id;
  const c=get(id);saveConnection(store,{...c,credential:c.providerId==='xai'?{store:'macos-keychain',id}:c.credential,health:c.providerId==='xai'?'cleanup_pending':c.health,enabled:false,revocation:'not_requested'});
  try{return await a.login();}catch(e){signingIn=null;throw e;}
 }));
 app.post('/ai-connections/:id/cancel',mutation(async req=>{const id=(req.params as {id:string}).id;const a=account(id),result=await a.cancel(),c=get(id);if(c.providerId==='xai'){const status=await a.status();if(!status.connected&&!('cleanupPending' in status&&status.cleanupPending))saveConnection(store,{...c,credential:null,health:'untested'});}if(signingIn===id)signingIn=null;return result;}));
 app.post('/ai-connections/:id/revoke',mutation(async req=>{
  const id=(req.params as {id:string}).id,c=get(id),a=account(id);
  if(!a.revoke)throw new CourseError('revocation_unavailable',409);
  const result=await a.revoke();
  saveConnection(store,{...c,credential:null,enabled:false,health:'untested',revocation:result.revoked?'complete':'pending'});
  a.stop();accounts.delete(id);if(signingIn===id)signingIn=null;return result;
 }));
 app.post('/ai-connections/:id/disconnect',mutation(async req=>{
  const id=(req.params as {id:string}).id,c=get(id);
  if(c.authMethod==='oauth')await account(id).logout();
  else if(c.credential)await credentials.remove(c.credential);
  saveConnection(store,{...c,credential:null,enabled:false,health:'untested',revocation:c.providerId==='xai'&&c.authMethod==='oauth'?'not_requested':'complete'});
  accounts.get(id)?.stop();accounts.delete(id);if(signingIn===id)signingIn=null;return {disconnected:true};
 }));
 app.delete('/ai-connections/:id',mutation(async req=>{
  const id=(req.params as {id:string}).id,c=get(id);
  // Login status is not inferred from configuration; vendor logout must finish before removal.
  if(c.authMethod==='oauth'&&(c.credential||accounts.has(id)||c.providerId==='openai'&&fs.existsSync(path.join(store.dataDir,'accounts',id))))await account(id).logout();
  if(c.credential){if(c.authMethod!=='oauth')await credentials.remove(c.credential);saveConnection(store,{...c,credential:null,enabled:false,health:'untested'});}
  deleteConnectionConfiguration(store,id);accounts.get(id)?.stop();accounts.delete(id);if(signingIn===id)signingIn=null;return {removed:true};
 }));
}
