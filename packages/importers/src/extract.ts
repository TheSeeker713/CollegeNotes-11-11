import path from 'node:path';
import JSZip from 'jszip';
import {SaxesParser} from 'saxes';
export type Passage={text:string;anchor:{type:'page'|'paragraph'|'region'|'epub';locator:string}};
export type Extraction={passages:Passage[];warnings:string[];method:string};
const LIMIT=80*1024*1024;
export function archivePreflight(bytes:Buffer):void {
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw new Error('invalid_archive');
 const count=bytes.readUInt16LE(end+10);let offset=bytes.readUInt32LE(end+16),total=0;
 if(bytes.readUInt16LE(end+4)||bytes.readUInt16LE(end+6)||count>2000||count===65535)throw new Error('unsupported_archive');
 const names=new Set<string>();
 for(let i=0;i<count;i++){
  if(offset+46>bytes.length||bytes.readUInt32LE(offset)!==0x02014b50)throw new Error('invalid_archive');
  const flags=bytes.readUInt16LE(offset+8),method=bytes.readUInt16LE(offset+10),compressed=bytes.readUInt32LE(offset+20),size=bytes.readUInt32LE(offset+24),n=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32);
  const name=bytes.subarray(offset+46,offset+46+n).toString('utf8');total+=size;
  if(flags&1||![0,8].includes(method)||size>16*1024*1024||total>LIMIT||size/Math.max(1,compressed)>250)throw new Error('archive_limits_exceeded');
  if(!name||name.startsWith('/')||name.includes('\\')||name.includes('\0')||name.split('/').includes('..')||/^[A-Za-z]:/.test(name)||names.has(name))throw new Error('unsafe_archive_path');
  names.add(name);offset+=46+n+extra+comment;if(offset>bytes.length)throw new Error('invalid_archive');
 }
}
function xml(text:string,open:(name:string,attrs:Record<string,string>)=>void,close:(name:string)=>void,onText:(text:string)=>void){
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('document_declarations_rejected');
 const parser=new SaxesParser({xmlns:false});parser.on('opentag',tag=>open(tag.name,tag.attributes as Record<string,string>));parser.on('closetag',tag=>close(tag.name));parser.on('text',onText);parser.on('cdata',onText);parser.write(text).close();
}
async function readEntry(zip:JSZip,name:string):Promise<string>{const entry=zip.file(name);if(!entry)throw new Error('document_part_missing');return entry.async('string');}
function paragraphs(text:string,kind:'docx'|'epub',location:string):Passage[]{
 const result:Passage[]=[];let current='',depth=0,skip=0,inText=false;
 const block=(name:string)=>kind==='docx'?name==='w:p':/^(?:p|h[1-6]|li|div|blockquote|td)$/.test(name.replace(/^.*:/,''));
 xml(text,(name)=>{const local=name.replace(/^.*:/,'');if(skip){skip++;return;}if(['script','style','iframe','object'].includes(local)){skip=1;return;}if(block(name)){if(depth===0)current='';depth++;}if(name==='w:t')inText=true;if(name==='w:tab'||local==='br')current+=' ';},name=>{if(skip){skip--;return;}if(name==='w:t')inText=false;if(block(name)&&depth){depth--;if(!depth&&current.trim())result.push({text:current.trim(),anchor:{type:kind==='docx'?'paragraph':'epub',locator:kind==='docx'?`paragraph:${result.length+1}`:`${location}#paragraph:${result.length+1}`}});}},value=>{if(!skip&&depth&&(kind==='epub'||inText))current+=value;});
 return result;
}
export async function extractDocument(filename:string,bytes:Buffer):Promise<Extraction>{
 const ext=path.extname(filename).toLowerCase();let passages:Passage[]=[];const warnings:string[]=[];
 if(ext==='.txt'||ext==='.md')passages=new TextDecoder('utf-8',{fatal:true}).decode(bytes).split(/\n\s*\n/).filter(t=>t.trim()).map((text,i)=>({text,anchor:{type:'paragraph',locator:`paragraph:${i+1}`}}));
 else if(ext==='.pdf'){
  const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');const loading=pdf.getDocument({data:new Uint8Array(bytes),enableXfa:false,useSystemFonts:false,disableFontFace:true});
  try{const doc=await loading.promise;if(doc.numPages>250)throw new Error('page_limit_exceeded');for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n);const content=await page.getTextContent();const text=content.items.map(item=>'str'in item?item.str+('hasEOL'in item&&item.hasEOL?'\n':' '):'').join('').trim();if(text)passages.push({text,anchor:{type:'page',locator:`page:${n}`}});else warnings.push(`page:${n}:ocr_required`);page.cleanup();}}finally{await loading.destroy();}
  warnings.push('Review reading order for columns, formulas and tables.');
 }else if(ext==='.docx'||ext==='.epub'){
  archivePreflight(bytes);const zip=await JSZip.loadAsync(bytes);
  if(ext==='.docx'){passages=paragraphs(await readEntry(zip,'word/document.xml'),'docx','');warnings.push('Main document paragraphs only. Review tables, equations, footnotes and text boxes against the original.');}
  else{
   if((await readEntry(zip,'mimetype')).trim()!=='application/epub+zip')throw new Error('invalid_epub');
   if(zip.file('META-INF/encryption.xml'))throw new Error('encrypted_epub_unsupported');
   let root='';xml(await readEntry(zip,'META-INF/container.xml'),(n,a)=>{if(n.replace(/^.*:/,'')==='rootfile')root=a['full-path']??'';},()=>{},()=>{});
   if(!root||root.startsWith('/')||root.split('/').includes('..'))throw new Error('invalid_epub_package');
   const manifest=new Map<string,string>(),spine:string[]=[];
   xml(await readEntry(zip,root),(n,a)=>{const local=n.replace(/^.*:/,'');if(local==='item'&&a.id&&a.href)manifest.set(a.id,a.href);if(local==='itemref'&&a.idref)spine.push(a.idref);},()=>{},()=>{});
   if(!spine.length)throw new Error('empty_epub_spine');
   for(const id of spine){const href=manifest.get(id);if(!href||/^[a-z]+:|^\//i.test(href))throw new Error('external_epub_resource_rejected');const entry=path.posix.normalize(path.posix.join(path.posix.dirname(root),decodeURIComponent(href.split('#')[0]!)));if(entry.startsWith('../'))throw new Error('unsafe_epub_resource');passages.push(...paragraphs(await readEntry(zip,entry),'epub',entry));}
   warnings.push('Scripts, styles and active objects are excluded. Verify complex layouts against your original.');
  }
 }else throw new Error('ocr_required');
 if(passages.reduce((n,p)=>n+p.text.length,0)>2_000_000)throw new Error('extracted_text_limit');
 return {passages,warnings,method:ext.slice(1)};
}
