import {spawn,type ChildProcessWithoutNullStreams} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
export class AccountError extends Error {}
/** Private app-server process. Only authentication RPCs are exposed; no shell, tools or threads. */
export class CodexAccount {
 private child:ChildProcessWithoutNullStreams|null=null;
 private nextId=1;
 private ready:Promise<void>|null=null;
 private pending=new Map<number,{resolve:(v:unknown)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 private loginId:string|null=null;
 private startingLogin=false;
 constructor(private directory:string,private executable='codex'){}
 private start(){
  if(this.ready)return this.ready;
  fs.mkdirSync(this.directory,{recursive:true,mode:0o700});
  if(fs.existsSync(path.join(this.directory,'auth.json')))throw new AccountError('unexpected_plaintext_auth_file');
  const env:Record<string,string>={};for(const key of ['PATH','HOME','USER','LOGNAME','TMPDIR','LANG'])if(process.env[key])env[key]=process.env[key]!;
  // A dedicated vendor-supported home isolates CollegeNotes sign-out from the owner's coding session.
  env.CODEX_HOME=this.directory;env.RUST_LOG='off';
  const child=spawn(this.executable,['-c','cli_auth_credentials_store="keyring"','-c','analytics.enabled=false','app-server','--stdio'],{env,cwd:this.directory,stdio:'pipe'});this.child=child;
  let buffer='';child.stdout.on('data',(data:Buffer)=>{buffer+=data.toString();if(buffer.length>1024*1024){this.stop();return;}let newline;while((newline=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);let m:Record<string,unknown>;try{m=JSON.parse(line);}catch{continue;}
   if(typeof m.id==='number'&&this.pending.has(m.id)){const p=this.pending.get(m.id)!;clearTimeout(p.timer);this.pending.delete(m.id);if(m.error)p.reject(new AccountError('account_operation_failed'));else p.resolve(m.result);}
   else if(m.method==='account/login/completed')this.loginId=null;
   else if(m.id!==undefined&&m.method)child.stdin.write(JSON.stringify({id:m.id,error:{code:-32601,message:'Operation not available'}})+'\n');
  }});
  child.stderr.resume();child.on('error',()=>this.stop());child.on('exit',()=>{if(this.child===child)this.stop();});
  this.ready=this.rpc('initialize',{clientInfo:{name:'collegenotes',version:'0.1.0',title:'CollegeNotes'},capabilities:{experimentalApi:false}}).then(()=>{child.stdin.write(JSON.stringify({method:'initialized'})+'\n');}).catch(error=>{this.stop();throw error;});return this.ready;
 }
 private rpc(method:string,params:unknown={}):Promise<unknown>{return new Promise((resolve,reject)=>{const child=this.child;if(!child){reject(new AccountError('account_service_unavailable'));return;}const id=this.nextId++;const timer=setTimeout(()=>{this.pending.delete(id);reject(new AccountError('account_operation_timeout'));},30000);this.pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({id,method,params})+'\n');});}
 async status(){await this.start();const r=await this.rpc('account/read',{refreshToken:false}) as {account?:{type?:string;planType?:string}|null};return {connected:r.account?.type==='chatgpt',method:r.account?.type??null,plan:r.account?.planType??null,loginPending:Boolean(this.loginId)||this.startingLogin};}
 async login(){
  if(this.startingLogin||this.loginId)throw new AccountError('login_already_pending');
  this.startingLogin=true;
  try{await this.start();const r=await this.rpc('account/login/start',{type:'chatgpt'}) as {loginId?:string;authUrl?:string};
   if(!r.loginId||!r.authUrl)throw new AccountError('invalid_login_response');
   this.loginId=r.loginId;
   const url=new URL(r.authUrl);if(url.protocol!=='https:'||url.username||url.password||!['auth.openai.com','chatgpt.com','auth0.openai.com'].includes(url.hostname)){await this.cancel();throw new AccountError('invalid_login_url');}
   return {authUrl:url.href};
  }finally{this.startingLogin=false;}
 }

 async cancel(){await this.start();if(this.loginId)await this.rpc('account/login/cancel',{loginId:this.loginId});this.loginId=null;return {cancelled:true};}
 async logout(){await this.start();await this.cancel();await this.rpc('account/logout');return this.status();}
 async limits(){await this.start();const r=await this.rpc('account/rateLimits/read') as {rateLimits?:unknown};return {rateLimits:r.rateLimits??null};}
 stop(){const child=this.child;this.child=null;this.ready=null;this.loginId=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new AccountError('account_service_unavailable'));}this.pending.clear();child?.kill('SIGTERM');}
}
