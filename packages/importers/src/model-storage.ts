import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
export function externalModelDirectory(volume:string,modelsDir:string):string{
 if(!path.isAbsolute(volume)||!path.isAbsolute(modelsDir)||!fs.existsSync(volume)||!fs.existsSync(modelsDir))throw new Error('external_ai_drive_unavailable');
 const actualVolume=fs.realpathSync(volume),actualDir=fs.realpathSync(modelsDir),relative=path.relative(actualVolume,actualDir);
 if(actualVolume!==path.resolve(volume)||!relative||relative.startsWith('..')||path.isAbsolute(relative)||fs.statSync(actualVolume).dev===fs.statSync(path.dirname(actualVolume)).dev)throw new Error('external_ai_drive_unavailable');
 return actualDir;
}
export function modelStorageDirectory():string{
 // An explicit developer override is deliberate configuration, never an automatic fallback.
 if(process.env.COLLEGENOTES_MODELS_DIR)return path.resolve(process.env.COLLEGENOTES_MODELS_DIR);
 const file=path.join(root,'.local/models-location.json');if(!fs.existsSync(file))throw new Error('external_ai_storage_setup_required');
 const config=JSON.parse(fs.readFileSync(file,'utf8')) as {version:number;volume:string;modelsDir:string;externalRequired:boolean};
 if(config.version!==1||config.externalRequired!==true||typeof config.volume!=='string'||typeof config.modelsDir!=='string')throw new Error('invalid_model_storage_configuration');
 return externalModelDirectory(config.volume,config.modelsDir);
}
