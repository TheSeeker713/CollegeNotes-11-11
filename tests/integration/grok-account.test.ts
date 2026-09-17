import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Fastify from 'fastify';
import {openStore,listConnections,exportConnectionSettings} from '@collegenotes/storage';
import {accountRoutes} from '../../apps/local-service/src/accounts.js';
import {randomUUID} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {GrokAccount,GROK_CLIENT_ID,GROK_SCOPES,grokTransport,type GrokTransport,type CredentialStore} from '@collegenotes/providers';

// No network or native Keychain: opaque strings exercise a simulated OAuth protocol only.
const accounts:GrokAccount[]=[];
afterEach(async()=>{for(const a of accounts.splice(0)){await a.cancel();a.stop();}vi.unstubAllGlobals();});
function fixture(options:{device?:Record<string,unknown>;polls?:Array<{status:number;body:Record<string,unknown>}>;put?:()=>Promise<void>}={}){
 const values=new Map<string,string>(),calls:Array<{endpoint:string;form:Record<string,string>}>=[],waits:number[]=[];
 const steps:Array<()=>void>=[];let clock=1000000;
 const credentials:CredentialStore={put:async(id,value)=>{await options.put?.();values.set(id,value);return {store:'macos-keychain',id};},read:async ref=>values.get(ref.id)??null,remove:async ref=>{values.delete(ref.id);}};
 const polls=[...(options.polls??[{status:200,body:{access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600,token_type:'Bearer'}}])];
 const transport:GrokTransport=async(endpoint,form)=>{calls.push({endpoint,form});if(endpoint==='/oauth2/device/code')return {status:200,body:{device_code:'synthetic-device-secret',user_code:'ABCD-EFGH',verification_uri:'https://auth.x.ai/device',expires_in:600,interval:5,...options.device}};return polls.shift()??{status:400,body:{error:'authorization_pending'}};};
 const deps={transport,now:()=>clock,wait:(ms:number,signal:AbortSignal)=>new Promise<void>((resolve,reject)=>{waits.push(ms);const abort=()=>reject(new Error('synthetic-abort'));signal.addEventListener('abort',abort,{once:true});steps.push(()=>{signal.removeEventListener('abort',abort);clock+=ms;resolve();});})};
 function account(id=randomUUID(),extra:Partial<import('@collegenotes/providers').GrokDependencies>={}){const a=new GrokAccount(id,credentials,{...deps,...extra});accounts.push(a);return {a,id};}
 async function tick(){steps.shift()?.();for(let i=0;i<15;i++)await Promise.resolve();}
 return {account,credentials,values,calls,waits,polls,tick,advance:(ms:number)=>{clock+=ms;}};
}
it('uses the documented public client and only exposes the user code; restores from protected storage without probing xAI',async()=>{
 const f=fixture(),{a,id}=f.account();expect((await a.status()).connected).toBe(false);expect(f.calls).toEqual([]);
 const start=await a.login();expect(start).toMatchObject({authUrl:'https://auth.x.ai/device',userCode:'ABCD-EFGH',consentApp:'Grok Build'});
 expect(JSON.stringify(start)).not.toContain('synthetic-device-secret');expect(f.calls[0]?.form).toMatchObject({client_id:GROK_CLIENT_ID,scope:GROK_SCOPES.join(' ')});
 expect((await a.status()).loginDetails?.userCode).toBe('ABCD-EFGH');await f.tick();
 expect(await a.status()).toMatchObject({connected:true,loginPending:false,loginDetails:null});
 expect(JSON.stringify(await a.status())).not.toContain('synthetic-access');expect(f.values.has(id)).toBe(true);
 const calls=f.calls.length;const restored=f.account(id).a;expect((await restored.status()).connected).toBe(true);expect(await restored.accessToken()).toBe('synthetic-access');expect(f.calls).toHaveLength(calls);
});
it('keeps two accounts separate and local sign-out removes only its own Keychain entry',async()=>{
 const f=fixture(),one=f.account(),two=f.account();await one.a.login();await f.tick();
 f.polls.push({status:200,body:{access_token:'second-access',refresh_token:'second-refresh',expires_in:3600}});
 await two.a.login();await f.tick();expect(f.values.size).toBe(2);
 await one.a.logout();expect(f.values.has(one.id)).toBe(false);expect(f.values.has(two.id)).toBe(true);expect(await two.a.accessToken()).toBe('second-access');
});
it('handles authorization_pending and slow_down without polling early or extending the server deadline',async()=>{
 const f=fixture({polls:[{status:400,body:{error:'authorization_pending'}},{status:400,body:{error:'slow_down'}},{status:200,body:{access_token:'done',expires_in:3600}}]}),{a}=f.account();await a.login();expect(f.calls).toHaveLength(1);
 await f.tick();await f.tick();await f.tick();expect(f.waits).toEqual([5000,5000,10000]);expect((await a.status()).connected).toBe(true);
 const expired=fixture({device:{expires_in:1}}),b=expired.account().a;await b.login();await expired.tick();expect(await b.status()).toMatchObject({connected:false,error:'grok_login_expired'});expect(expired.calls).toHaveLength(1);
});
it.each(['access_denied','expired_token','unknown_secret_detail'])('redacts failed provider response %s',async error=>{
 const f=fixture({polls:[{status:400,body:{error,error_description:'secret-provider-diagnostic'}}]}),{a}=f.account();await a.login();await f.tick();
 const s=await a.status();expect(s.connected).toBe(false);expect(s.loginPending).toBe(false);expect(s.error).toBeTruthy();expect(JSON.stringify(s)).not.toContain('secret-provider-diagnostic');expect(f.values.size).toBe(0);
});
it.each(['http://auth.x.ai/device','https://auth.x.ai.evil.invalid/device','https://user:password@auth.x.ai/device','javascript:alert(1)','https://auth.x.ai:444/device'])('rejects untrusted verification destination %s',async verification_uri=>{
 const f=fixture({device:{verification_uri}}),{a}=f.account();await expect(a.login()).rejects.toThrow('grok_invalid_login_url');expect(f.calls).toHaveLength(1);expect(f.values.size).toBe(0);
});
it('rejects malformed device response and overlapping sign-in',async()=>{
 const invalid=fixture({device:{user_code:'bad\ncode'}});await expect(invalid.account().a.login()).rejects.toThrow('grok_invalid_user_code');
 const f=fixture(),{a}=f.account();await a.login();await expect(a.login()).rejects.toThrow('login_already_pending');await a.cancel();await f.tick();expect(f.values.size).toBe(0);expect((await a.status()).loginPending).toBe(false);
});
it('cancel during credential save waits for cleanup and cannot revive a disconnected account',async()=>{
 let resolve!:()=>void;const pending=new Promise<void>(r=>{resolve=r;});const f=fixture({put:()=>pending}),{a}=f.account();await a.login();await f.tick();const cancelled=a.cancel();resolve();await cancelled;expect(f.values.size).toBe(0);expect((await a.status()).connected).toBe(false);
});
it('Keychain write failure is a failure, not a successful or plaintext login',async()=>{
 const f=fixture({put:async()=>{throw new Error('private-native-store-message');}}),{a}=f.account();await a.login();await f.tick();expect(await a.status()).toMatchObject({connected:false,error:'grok_credential_store_failed'});expect(f.values.size).toBe(0);
});
it('refreshes once for concurrent callers and persists a rotated refresh token',async()=>{
 const f=fixture(),{a,id}=f.account();await a.login();await f.tick();f.advance(3600000);
 const before=f.calls.length;expect((await a.status()).needsRefresh).toBe(true);expect(f.calls).toHaveLength(before);
 f.polls.push({status:200,body:{access_token:'rotated-access',refresh_token:'rotated-refresh',expires_in:3600}});
 expect(await Promise.all([a.accessToken(),a.accessToken()])).toEqual(['rotated-access','rotated-access']);expect(f.calls).toHaveLength(before+1);expect(JSON.parse(f.values.get(id)!).refreshToken).toBe('rotated-refresh');
});
it('rejects an expired session on refresh denial without API fallback',async()=>{
 const f=fixture(),{a}=f.account();await a.login();await f.tick();f.advance(3600000);f.polls.push({status:400,body:{error:'invalid_grant',error_description:'private'}});
 await expect(a.accessToken()).rejects.toThrow('grok_sign_in_required');expect(f.calls.at(-1)?.form.grant_type).toBe('refresh_token');await a.logout();expect(f.values.size).toBe(0);
});
it('production HTTP boundary pins destination, rejects redirects and bounds response data without network',async()=>{
 const mock=vi.fn(async()=>new Response(JSON.stringify({error:'authorization_pending'}),{status:400}));vi.stubGlobal('fetch',mock);
 const controller=new AbortController();expect((await grokTransport('/oauth2/token',{client_id:GROK_CLIENT_ID},controller.signal)).status).toBe(400);
 expect(mock.mock.calls[0]).toMatchObject(['https://auth.x.ai/oauth2/token',{redirect:'error',credentials:'omit',cache:'no-store'}]);
 mock.mockImplementation(async()=>new Response('x'.repeat(65537)));await expect(grokTransport('/oauth2/token',{},controller.signal)).rejects.toThrow('grok_network_unavailable');
});
it.each([{expires_in:0},{expires_in:NaN},{access_token:'bad\nheader'},{token_type:'Basic'},{access_token:'x'.repeat(10000)}])('rejects malformed token payload without saving it (%j)',async patch=>{
 const f=fixture({polls:[{status:200,body:{access_token:'synthetic',expires_in:3600,...patch}}]}),{a}=f.account();await a.login();await f.tick();expect((await a.status()).connected).toBe(false);expect(f.values.size).toBe(0);
});

it('explicit revocation sends only this account tokens to xAI then clears local storage',async()=>{
 const f=fixture(),{a,id}=f.account();await a.login();await f.tick();f.polls.push({status:200,body:{}},{status:200,body:{}});
 expect(await a.revoke()).toEqual({revoked:true,localAccessRemoved:true});expect(f.values.has(id)).toBe(false);
 const calls=f.calls.filter(c=>c.endpoint==='/oauth2/revoke');expect(calls.map(c=>c.form.token_type_hint)).toEqual(['refresh_token','access_token']);expect(calls.every(c=>c.form.client_id===GROK_CLIENT_ID)).toBe(true);
});
it('failed remote revocation still clears local access and reports that remote revocation is unconfirmed',async()=>{
 const f=fixture(),{a}=f.account();await a.login();await f.tick();f.polls.push({status:503,body:{}},{status:503,body:{}});
 expect(await a.revoke()).toEqual({revoked:false,localAccessRemoved:true});expect(f.values.size).toBe(0);expect((await a.status()).connected).toBe(false);
});
it('revocation accepts the standard empty success response without parsing a token body',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:200})));
 expect(await grokTransport('/oauth2/revoke',{token:'synthetic-only'},new AbortController().signal)).toEqual({status:200,body:{}});
});

it('cancellation cleanup failure stays unavailable and preserves a retryable local removal path',async()=>{
 let finish!:()=>void;const held=new Map<string,string>();let removalFails=true;
 let release!:()=>void;const waitGate=new Promise<void>(r=>{release=r;});
 const credentials:CredentialStore={put:async(id,secret)=>{held.set(id,secret);await new Promise<void>(r=>{finish=r;});return {store:'macos-keychain',id};},read:async ref=>held.get(ref.id)??null,remove:async ref=>{if(removalFails)throw new Error('synthetic-cleanup');held.delete(ref.id);}};
 const a=new GrokAccount(randomUUID(),credentials,{wait:()=>waitGate,transport:async endpoint=>endpoint==='/oauth2/device/code'?{status:200,body:{device_code:'private-device',verification_uri:'https://auth.x.ai/device',user_code:'AAAA-BBBB',expires_in:600}}:{status:200,body:{access_token:'private-synthetic',expires_in:3600}}});accounts.push(a);
 await a.login();release();for(let i=0;i<10;i++)await Promise.resolve();const cancelled=a.cancel();finish();await expect(cancelled).rejects.toThrow('grok_credential_cleanup_required');
 expect(await a.status()).toMatchObject({connected:false,cleanupPending:true});await expect(a.accessToken()).rejects.toThrow('grok_account_unavailable');
 removalFails=false;await a.logout();expect(held.size).toBe(0);
});

it('local-service routes connect, restore, select and revoke Grok without exporting credentials or touching CLI storage',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-grok-route-')),store=openStore(dir),app=Fastify(),f=fixture();
 accountRoutes(app,store,()=>{throw new Error('OpenAI must not start');},f.credentials,(id,onStored,cleanupPending)=>f.account(id,{onStored,cleanupPending}).a);
 try{
  const id=(await app.inject({method:'POST',url:'/ai-connections',payload:{providerId:'xai',authMethod:'oauth',label:'Personal Grok'}})).json().id as string;
  expect((await app.inject(`/ai-connections/${id}/account`)).json().connected).toBe(false);expect(f.calls).toHaveLength(0);
  const started=await app.inject({method:'POST',url:`/ai-connections/${id}/login`});expect(started.statusCode).toBe(200);expect(started.json().userCode).toBe('ABCD-EFGH');
  expect(listConnections(store)[0]?.credential).toEqual({store:'macos-keychain',id});await f.tick();
  expect((await app.inject(`/ai-connections/${id}/account`)).json().connected).toBe(true);expect(listConnections(store)[0]?.health).toBe('untested');
  expect((await app.inject({method:'PUT',url:'/ai-connections/preferences',payload:{selectedConnectionId:id}})).statusCode).toBe(200);
  for(const metadata of [JSON.stringify(exportConnectionSettings(store)),(await app.inject('/ai-connections')).body]){expect(metadata).not.toContain('synthetic-access');expect(metadata).not.toContain('synthetic-refresh');expect(metadata).not.toContain('synthetic-device-secret');}
  f.polls.push({status:200,body:{}},{status:200,body:{}});
  expect((await app.inject({method:'POST',url:`/ai-connections/${id}/revoke`})).json()).toEqual({revoked:true,localAccessRemoved:true});expect(f.values.size).toBe(0);expect(listConnections(store)[0]?.revocation).toBe('complete');
  expect((await app.inject({method:'DELETE',url:`/ai-connections/${id}`})).statusCode).toBe(200);expect(listConnections(store)).toEqual([]);
  expect(fs.existsSync(path.join(dir,'accounts'))).toBe(false);expect(fs.existsSync(path.join(dir,'auth.json'))).toBe(false);
 }finally{await app.close();store.db.close();fs.rmSync(dir,{recursive:true,force:true});}
});

it('restart with an incomplete credential save requires cleanup rather than reviving the saved session',async()=>{
 const f=fixture(),{a,id}=f.account();await a.login();await f.tick();
 const interrupted=f.account(id,{cleanupPending:true}).a;
 expect(await interrupted.status()).toMatchObject({connected:false,cleanupPending:true});
 await expect(interrupted.login()).rejects.toThrow('grok_credential_cleanup_required');await expect(interrupted.accessToken()).rejects.toThrow('grok_account_unavailable');
 await interrupted.logout();expect(f.values.size).toBe(0);
});
it('failure to commit successful login metadata clears the just-saved credential',async()=>{
 const f=fixture(),{a}=f.account(undefined,{onStored:()=>{throw new Error('synthetic-database-failure');}});await a.login();await f.tick();expect(f.values.size).toBe(0);expect((await a.status()).connected).toBe(false);
});

it('refresh preserves the existing refresh token when the provider omits rotation',async()=>{
 const f=fixture(),{a,id}=f.account();await a.login();await f.tick();f.advance(3600000);
 f.polls.push({status:200,body:{access_token:'renewed',refresh_token:null,expires_in:3600}});
 expect(await a.accessToken()).toBe('renewed');expect(JSON.parse(f.values.get(id)!).refreshToken).toBe('synthetic-refresh');
});
