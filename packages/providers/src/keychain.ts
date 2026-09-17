import {spawn} from 'node:child_process';
import path from 'node:path';
import type {CredentialReference,CredentialStore} from './contracts.js';
/** Only the CollegeNotes namespace is accessible to the native helper. No shell or environment secrets. */
export class MacKeychain implements CredentialStore {
 constructor(private executable=path.resolve('.local/runtime/credential-store')){}
 private async operation(operation:'put'|'read'|'remove',id:string,secret?:string):Promise<{secret?:string|null}>{
  if(!/^[a-f0-9-]{36}$/i.test(id)||secret!==undefined&&(!secret.length||Buffer.byteLength(secret)>8192))throw new Error('invalid_credential');
  return new Promise((resolve,reject)=>{
   const env:Record<string,string>={};for(const key of ['HOME','PATH','TMPDIR'])if(process.env[key])env[key]=process.env[key]!;
   const child=spawn(this.executable,[],{env,stdio:'pipe'});let output='',settled=false;
   const finish=(value?:{secret?:string|null})=>{if(settled)return;settled=true;clearTimeout(timer);if(value)resolve(value);else reject(new Error('credential_store_unavailable'));};
   const timer=setTimeout(()=>{child.kill();finish();},60000);
   child.stdout.on('data',(data:Buffer)=>{output+=data.toString();if(output.length>16384){child.kill();finish();}});
   child.stderr.resume();child.on('error',()=>finish());child.stdin.on('error',()=>finish());
   child.on('exit',code=>{if(code!==0){finish();return;}try{const r=JSON.parse(output) as {ok?:boolean;secret?:unknown};if(r.ok!==true||r.secret!==undefined&&r.secret!==null&&typeof r.secret!=='string'){finish();return;}finish({secret:r.secret as string|null|undefined});}catch{finish();}finally{output='';}});
   child.stdin.end(JSON.stringify({operation,id,...(secret!==undefined?{secret}:{})}));
  });
 }
 async put(id:string,secret:string):Promise<CredentialReference>{await this.operation('put',id,secret);return {store:'macos-keychain',id};}
 async read(reference:CredentialReference){if(reference.store!=='macos-keychain')throw new Error('invalid_credential_store');return (await this.operation('read',reference.id)).secret??null;}
 async remove(reference:CredentialReference){if(reference.store!=='macos-keychain')throw new Error('invalid_credential_store');await this.operation('remove',reference.id);}
}
