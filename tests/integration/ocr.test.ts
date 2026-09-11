import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {afterEach,expect,it} from 'vitest';
import {extractDocument,extractOcr,verifyOcrModel} from '@collegenotes/importers';
import {openStore,createCourse,queueImport,changeImportTask,listImportTasks} from '@collegenotes/storage';
import {processImport} from '../../apps/local-service/src/extraction.js';
const dirs:string[]=[];afterEach(()=>{for(const d of dirs.splice(0))fs.rmSync(d,{recursive:true,force:true});});
function picture(text:string){const c=createCanvas(1000,180),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1000,180);ctx.fillStyle='black';ctx.font='48px Arial';ctx.fillText(text,35,100);return c;}
function scannedPdf(){
 const images=[picture('First page 42'),picture('Second page 17')].map(c=>c.toBuffer('image/jpeg'));
 const objects:Buffer[]=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>')];
 images.forEach((image,i)=>{const page=3+i*3;objects.push(Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 90] /Resources << /XObject << /Im ${page+2} 0 R >> >> /Contents ${page+1} 0 R >>`));const ops=Buffer.from('q 500 0 0 90 0 0 cm /Im Do Q');objects.push(Buffer.concat([Buffer.from(`<< /Length ${ops.length} >>\nstream\n`),ops,Buffer.from('\nendstream')]));objects.push(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1000 /Height 180 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),image,Buffer.from('\nendstream')]));});
 const parts=[Buffer.from('%PDF-1.4\n')],offsets=[0];let length=parts[0]!.length;objects.forEach((obj,i)=>{offsets.push(length);const b=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),obj,Buffer.from('\nendobj\n')]);parts.push(b);length+=b.length;});parts.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`));return Buffer.concat(parts);
}
it('CHK-6.3-01 low-content images carry handwriting and low-resolution limitations',async()=>{
 const result=await extractOcr(picture('').toBuffer('image/png'));expect(result.warnings.join(' ')).toMatch(/handwriting.*small text/);expect(result.warnings.join(' ')).toContain('requires user review');
},20000);
it('CHK-6.3-02 OCR numeric facts match a known raster fixture with review still required',async()=>{
 const result=await extractDocument('numbers.png',picture('Study 42 pages in 17 days').toBuffer('image/png'));const text=result.passages.map(p=>p.text).join(' ');expect(text).toContain('42');expect(text).toContain('17');expect(result.passages[0]?.anchor.type).toBe('region');expect(result.warnings.join(' ')).toContain('requires user review');
},20000);
it('CHK-6.3-03 scanned PDF preserves page order and page-specific region anchors',async()=>{
 const result=await extractDocument('scan.pdf',scannedPdf());expect(result.passages.map(p=>p.text).join(' ')).toMatch(/First page 42.*Second page 17/);expect(result.passages[0]?.anchor.locator).toMatch(/^page:1:rect:/);expect(result.passages.at(-1)?.anchor.locator).toMatch(/^page:2:rect:/);
},30000);
it('CHK-6.3-04 uses a checksum-verified local English model with no download fallback',()=>{
 const dir=verifyOcrModel();expect(dir).toContain('/CollegeNotes/.local/models/tesseract');expect(fs.existsSync(path.join(dir,'eng.traineddata'))).toBe(true);
});
it('CHK-6.3-05 cancels a real OCR worker, preserves original and retries successfully',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-ocr-'));dirs.push(dir);const s=openStore(dir);try{const c=createCourse(s,'Synthetic');const task=queueImport(s,c.id,'scan.png',picture('Retry 42').toBuffer('image/png')).task!;const running=processImport(s,c.id,task.id);changeImportTask(s,c.id,task.id,'cancel');await running;expect(listImportTasks(s,c.id)[0]?.status).toBe('cancelled');expect(s.db.prepare('select count(*) as n from material_revisions').get()).toEqual({n:0});changeImportTask(s,c.id,task.id,'retry');await processImport(s,c.id,task.id);expect(listImportTasks(s,c.id)[0]?.status).toBe('completed');}finally{s.db.close();}
},30000);
it('CHK-6.3-06 high confidence never marks OCR as verified',async()=>{
 const result=await extractOcr(picture('Clear text 123').toBuffer('image/png'));expect(result.warnings.some(w=>w.includes('requires user review'))).toBe(true);expect(result).not.toHaveProperty('approved');
},20000);
