/**
 * Grok Build device OAuth protocol adapted from SpaceXAI's Apache-2.0 source.
 * Copyright 2023-2026 SpaceXAI. CollegeNotes modifications: TypeScript transport,
 * Keychain-only persistence, bounded responses, strict destinations and lifecycle isolation.
 * See docs/third-party/grok-build.md and grok-build-LICENSE.txt.
 */
import {setTimeout as delay} from 'node:timers/promises';
import type {CredentialStore,CredentialReference} from './contracts.js';

const ISSUER='https://auth.x.ai';
// Public native-client identifier from upstream config.rs; not a client secret.
export const GROK_CLIENT_ID='b1a00492-073a-47ea-816f-4c329264a828';
export const GROK_SCOPES=['openid','profile','email','offline_access','grok-cli:access','api:access'] as const;
const MAX_BYTES=65536;
export class GrokAccountError extends Error {}
type Tokens={version:1;issuer:typeof ISSUER;clientId:string;accessToken:string;refreshToken:string|null;expiresAt:number};
type Reply={status:number;body:Record<string,unknown>};
export type GrokTransport=(endpoint:'/oauth2/device/code'|'/oauth2/token'|'/oauth2/revoke',form:Record<string,string>,signal:AbortSignal)=>Promise<Reply>;
export type GrokDependencies={transport?:GrokTransport;now?:()=>number;wait?:(ms:number,signal:AbortSignal)=>Promise<void>;onStored?:()=>void;cleanupPending?:boolean};

/** No redirects, inherited credentials, arbitrary URLs or raw provider errors. */
export const grokTransport:GrokTransport=async(endpoint,form,signal)=>{
 try{
  const response=await fetch(ISSUER+endpoint,{method:'POST',redirect:'error',credentials:'omit',cache:'no-store',
   signal:AbortSignal.any([signal,AbortSignal.timeout(20000)]),
   headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json','x-grok-client-surface':'ui','user-agent':'CollegeNotes/0.1'},body:new URLSearchParams(form)});
  if(endpoint==='/oauth2/revoke'&&response.status===200){await response.body?.cancel();return {status:200,body:{}};}
  const reader=response.body?.getReader();if(!reader)throw new Error();
  let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>MAX_BYTES)throw new Error();chunks.push(chunk.value);}}
  finally{await reader.cancel().catch(()=>undefined);}
  const body:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();
  return {status:response.status,body:body as Record<string,unknown>};
 }catch{throw new GrokAccountError(signal.aborted?'grok_login_cancelled':'grok_network_unavailable');}
};
function token(value:unknown):string{
 if(typeof value!=='string'||!value.length||value.length>16000||[...value].some(c=>c.charCodeAt(0)<=32||c.charCodeAt(0)===127))throw new GrokAccountError('grok_invalid_token_response');
 return value;
}
function lifetime(value:unknown,max:number):number{
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value<=0||value>max)throw new GrokAccountError('grok_invalid_expiry');return value;
}
function verificationUrl(value:unknown):string{
 if(typeof value!=='string'||value.length>2048||[...value].some(c=>c.charCodeAt(0)<=32||c.charCodeAt(0)===127))throw new GrokAccountError('grok_invalid_login_url');
 let url:URL;try{url=new URL(value);}catch{throw new GrokAccountError('grok_invalid_login_url');}
 if(url.protocol!=='https:'||!['auth.x.ai','accounts.x.ai','grok.com'].includes(url.hostname)||url.port||url.username||url.password||url.hash)throw new GrokAccountError('grok_invalid_login_url');
 return url.href;
}
function parseTokens(body:Record<string,unknown>,now:number,previous?:Tokens):Tokens{
 if(body.token_type!==undefined&&(typeof body.token_type!=='string'||body.token_type.toLowerCase()!=='bearer'))throw new GrokAccountError('grok_invalid_token_type');
 const value:Tokens={version:1,issuer:ISSUER,clientId:GROK_CLIENT_ID,accessToken:token(body.access_token),refreshToken:body.refresh_token===undefined||body.refresh_token===null?previous?.refreshToken??null:token(body.refresh_token),expiresAt:now+lifetime(body.expires_in,366*86400)*1000};
 // The native store's secret-size limit is intentionally enforced before any write.
 if(Buffer.byteLength(JSON.stringify(value))>8192)throw new GrokAccountError('grok_token_storage_limit');
 return value;
}
function readTokens(raw:string|null):Tokens|null{
 if(raw===null)return null;
 try{const t=JSON.parse(raw) as Tokens;
  if(t.version!==1||t.issuer!==ISSUER||t.clientId!==GROK_CLIENT_ID||!Number.isSafeInteger(t.expiresAt)||t.expiresAt<=0)throw new Error();
  token(t.accessToken);if(t.refreshToken!==null)token(t.refreshToken);return t;
 }catch{throw new GrokAccountError('grok_saved_login_invalid');}
}

/** One account per connection. This class never reads or writes a Grok CLI home. */
export class GrokAccount {
 private readonly reference:CredentialReference;
 private readonly transport:GrokTransport;
 private readonly now:()=>number;
 private readonly wait:(ms:number,signal:AbortSignal)=>Promise<void>;
 private readonly onStored:()=>void;
 private controller:AbortController|null=null;
 private task:Promise<void>|null=null;
 private starting=false;
 private presentation:{authUrl:string;userCode:string}|null=null;
 private stopped=false;
 private error:string|null=null;
 private cleanupPending=false;
 private metadata:{expiresAt:number}|null|undefined=undefined;
 private refresh:Promise<string>|null=null;
 constructor(id:string,private credentials:CredentialStore,deps:GrokDependencies={}){
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))throw new GrokAccountError('invalid_connection_id');
  this.onStored=deps.onStored??(()=>undefined);this.cleanupPending=deps.cleanupPending??false;
  if(this.cleanupPending){this.metadata=null;this.error='grok_credential_cleanup_required';}
  this.reference={store:'macos-keychain',id};this.transport=deps.transport??grokTransport;this.now=deps.now??Date.now;
  this.wait=deps.wait??((ms,signal)=>delay(ms,undefined,{signal}));
 }
 async status(){
  if(this.metadata===undefined&&!this.controller){const saved=readTokens(await this.credentials.read(this.reference));this.metadata=saved?{expiresAt:saved.expiresAt}:null;}
  const connected=Boolean(this.metadata);
  return {connected,method:connected?'grok-oauth':null,plan:null,loginPending:this.starting||Boolean(this.task),
   loginDetails:this.presentation,needsRefresh:connected&&this.metadata!.expiresAt<=this.now()+30000,error:this.error,cleanupPending:this.cleanupPending,remoteRevocation:'available' as const};
 }
 async login(){
  if(this.stopped)throw new GrokAccountError('grok_account_closed');
  if(this.cleanupPending)throw new GrokAccountError('grok_credential_cleanup_required');
  if(this.starting||this.controller)throw new GrokAccountError('login_already_pending');
  this.starting=true;this.error=null;const controller=new AbortController();this.controller=controller;
  try{
   if(readTokens(await this.credentials.read(this.reference)))throw new GrokAccountError('grok_sign_out_before_reconnect');
   if(controller.signal.aborted)throw new GrokAccountError('grok_login_cancelled');
   const reply=await this.transport('/oauth2/device/code',{client_id:GROK_CLIENT_ID,scope:GROK_SCOPES.join(' '),referrer:'grok-build'},controller.signal);
   if(controller.signal.aborted)throw new GrokAccountError('grok_login_cancelled');
   if(reply.status!==200)throw new GrokAccountError(reply.status===404?'grok_device_login_unavailable':'grok_login_rejected');
   const b=reply.body,code=token(b.device_code),url=verificationUrl(b.verification_uri);
   if(typeof b.user_code!=='string'||! /^[A-Za-z0-9-]{4,32}$/.test(b.user_code))throw new GrokAccountError('grok_invalid_user_code');
   const expires=lifetime(b.expires_in,1800),interval=b.interval===undefined?5:lifetime(b.interval,60);
   // Use the plain URL + human-visible code; never expose device_code or token data to the browser.
   this.presentation={authUrl:url,userCode:b.user_code};
   this.task=this.poll(code,interval,this.now()+expires*1000,controller).catch(error=>{
    if(!controller.signal.aborted&&!this.cleanupPending)this.error=error instanceof GrokAccountError?error.message:'grok_credential_store_failed';
   }).finally(()=>{if(this.controller===controller)this.controller=null;this.task=null;this.presentation=null;});
   return {authUrl:url,userCode:b.user_code,expiresIn:expires,consentApp:'Grok Build'};
  }catch(error){if(this.controller===controller)this.controller=null;throw error instanceof GrokAccountError?error:new GrokAccountError('grok_credential_store_failed');}
  finally{this.starting=false;}
 }
 private async poll(code:string,interval:number,deadline:number,controller:AbortController){
  while(!controller.signal.aborted){
   await this.wait(Math.min(interval*1000,Math.max(0,deadline-this.now())),controller.signal);
   if(controller.signal.aborted)return;
   if(this.now()>=deadline)throw new GrokAccountError('grok_login_expired');
   const reply=await this.transport('/oauth2/token',{grant_type:'urn:ietf:params:oauth:grant-type:device_code',device_code:code,client_id:GROK_CLIENT_ID},controller.signal);
   if(controller.signal.aborted)return;
   if(this.now()>=deadline)throw new GrokAccountError('grok_login_expired');
   if(reply.status===200){
    const saved=parseTokens(reply.body,this.now());
    try{await this.credentials.put(this.reference.id,JSON.stringify(saved));}
    catch{await this.clearFailedLogin();throw new GrokAccountError('grok_credential_store_failed');}
    if(controller.signal.aborted){await this.clearFailedLogin();return;}
    try{this.onStored();}catch{await this.clearFailedLogin();throw new GrokAccountError('grok_credential_store_failed');}
    this.metadata={expiresAt:saved.expiresAt};return;
   }
   if(reply.body.error==='authorization_pending')continue;
   if(reply.body.error==='slow_down'){interval+=5;continue;}
   throw new GrokAccountError(reply.body.error==='access_denied'?'grok_login_denied':reply.body.error==='expired_token'?'grok_login_expired':'grok_login_rejected');
  }
 }
 private async clearFailedLogin(){
  this.metadata=null;
  try{await this.credentials.remove(this.reference);this.cleanupPending=false;}
  catch{this.cleanupPending=true;this.error='grok_credential_cleanup_required';throw new GrokAccountError(this.error);}
 }
 async cancel(){this.controller?.abort();await this.task;if(this.cleanupPending)throw new GrokAccountError('grok_credential_cleanup_required');this.error=null;return {cancelled:true};}
 async logout(){
  this.controller?.abort();await this.task;await this.refresh?.catch(()=>undefined);
  await this.credentials.remove(this.reference);this.metadata=null;this.cleanupPending=false;this.error=null;return this.status();
 }
 /** Explicit user action; local sign-out alone does not revoke other provider sessions. */
 async revoke(){
  this.controller?.abort();await this.task;await this.refresh?.catch(()=>undefined);
  const saved=readTokens(await this.credentials.read(this.reference));
  const controller=new AbortController();this.controller=controller;let revoked=true;
  try{
   if(saved)for(const [hint,value] of [['refresh_token',saved.refreshToken],['access_token',saved.accessToken]] as const){
    if(!value)continue;
    const reply=await this.transport('/oauth2/revoke',{client_id:GROK_CLIENT_ID,token:value,token_type_hint:hint},controller.signal);
    if(reply.status!==200)revoked=false;
   }
  }catch{revoked=false;}
  finally{if(this.controller===controller)this.controller=null;}
  await this.credentials.remove(this.reference);this.metadata=null;this.cleanupPending=false;this.error=null;
  return {revoked,localAccessRemoved:true};
 }
 /** Server-only future inference adapter entry point; status polling never refreshes or probes credentials. */
 async accessToken():Promise<string>{
  if(this.stopped||this.starting||this.task||this.cleanupPending||this.controller&&!this.refresh)throw new GrokAccountError('grok_account_unavailable');
  if(this.refresh)return this.refresh;
  this.refresh=this.freshToken().finally(()=>{this.refresh=null;});return this.refresh;
 }
 private async freshToken(){
  const controller=new AbortController();this.controller=controller;
  try{
   const saved=readTokens(await this.credentials.read(this.reference));if(controller.signal.aborted)throw new GrokAccountError('grok_login_cancelled');
   if(!saved)throw new GrokAccountError('grok_sign_in_required');
   if(saved.expiresAt>this.now()+30000)return saved.accessToken;
   if(!saved.refreshToken)throw new GrokAccountError('grok_sign_in_required');
   const reply=await this.transport('/oauth2/token',{grant_type:'refresh_token',refresh_token:saved.refreshToken,client_id:GROK_CLIENT_ID},controller.signal);
   if(controller.signal.aborted)throw new GrokAccountError('grok_login_cancelled');
   if(reply.status!==200)throw new GrokAccountError('grok_sign_in_required');
   const fresh=parseTokens(reply.body,this.now(),saved);await this.credentials.put(this.reference.id,JSON.stringify(fresh));
   if(controller.signal.aborted)throw new GrokAccountError('grok_login_cancelled');
   this.metadata={expiresAt:fresh.expiresAt};return fresh.accessToken;
  }finally{if(this.controller===controller)this.controller=null;}
 }
 stop(){this.stopped=true;this.controller?.abort();}
}
