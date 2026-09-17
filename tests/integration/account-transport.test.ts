import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {afterEach,expect,it} from 'vitest';
import {CodexAccount} from '@collegenotes/providers';
const dirs:string[]=[];afterEach(()=>{for(const dir of dirs.splice(0))fs.rmSync(dir,{recursive:true,force:true});});
function dir(){const p=fs.mkdtempSync(path.join(os.tmpdir(),'cn-account-'));dirs.push(p);return p;}
it('account bridge rejects plaintext authentication cache before launching vendor process',async()=>{const home=dir();fs.writeFileSync(path.join(home,'auth.json'),'synthetic-not-a-real-token');const account=new CodexAccount(home);await expect(account.status()).rejects.toThrow('unexpected_plaintext_auth_file');account.stop();});
it('missing app-server executable fails without falling back to a shared account or API key',async()=>{const account=new CodexAccount(dir(),'/nonexistent/synthetic-codex');await expect(account.status()).rejects.toThrow('account_service_unavailable');account.stop();});
it('synthetic stdio protocol isolates auth, validates URLs and handles logout without exposing account identity',async()=>{
 const home=dir(),executable=path.join(home,'synthetic-app-server');fs.writeFileSync(executable,`#!${process.execPath}
import readline from 'node:readline';let signed=false;readline.createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);if(!m.id)return;let result={};if(m.method==='account/read')result={account:signed?{type:'chatgpt',email:'private-synthetic@example.invalid',planType:'synthetic'}:null};if(m.method==='account/login/start'){signed=true;result={loginId:'synthetic',authUrl:'https://auth.openai.com/authorize?synthetic=true'};}if(m.method==='account/logout')signed=false;if(m.method==='account/rateLimits/read')result={rateLimits:{primary:{usedPercent:0}}};console.log(JSON.stringify({id:m.id,result}));});`,{mode:0o700});
 const account=new CodexAccount(path.join(home,'isolated'),executable);try{expect(await account.status()).toMatchObject({connected:false});expect(await account.login()).toEqual({authUrl:'https://auth.openai.com/authorize?synthetic=true'});const status=await account.status();expect(status.connected).toBe(true);expect(JSON.stringify(status)).not.toContain('private-synthetic');expect(await account.logout()).toMatchObject({connected:false});expect(fs.existsSync(path.join(home,'isolated/auth.json'))).toBe(false);}finally{account.stop();}
});
it('refuses to confirm logout when the synthetic vendor still reports local access',async()=>{
 const home=dir(),executable=path.join(home,'synthetic-app-server');fs.writeFileSync(executable,`#!${process.execPath}
import readline from 'node:readline';readline.createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);if(m.id)console.log(JSON.stringify({id:m.id,result:m.method==='account/read'?{account:{type:'chatgpt'}}:{}}));});`,{mode:0o700});
 const account=new CodexAccount(path.join(home,'isolated'),executable);try{await expect(account.logout()).rejects.toThrow('account_logout_unconfirmed');}finally{account.stop();}
});
