import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import {afterEach,expect,it} from 'vitest';
import {extractDocument,archivePreflight} from '@collegenotes/importers';
import {openStore,createCourse,queueImport,listImportTasks} from '@collegenotes/storage';
import {processImport} from '../../apps/local-service/src/extraction.js';
const dirs:string[]=[];afterEach(()=>{for(const d of dirs.splice(0))fs.rmSync(d,{recursive:true,force:true});});
async function epub(){const z=new JSZip();z.file('mimetype','application/epub+zip');z.file('META-INF/container.xml','<container><rootfile full-path="OEBPS/content.opf"/></container>');z.file('OEBPS/content.opf','<package><manifest><item id="b" href="second.xhtml"/><item id="a" href="first.xhtml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>');z.file('OEBPS/first.xhtml','<html><body><h1>First heading</h1><p>First passage.</p><script>globalThis.compromised=true</script></body></html>');z.file('OEBPS/second.xhtml','<html><body><p>Second passage.</p></body></html>');return z;}
it('CHK-6.2-01 extracts known answers from real PDF DOCX and zipped EPUB',async()=>{
 const pdf=await extractDocument('sample.pdf',fs.readFileSync('tests/fixtures/public/sample.pdf'));expect(pdf.passages[0]?.text).toContain('Speaking with clear examples');
 const doc=await extractDocument('sample.docx',fs.readFileSync('tests/fixtures/public/sample.docx'));expect(doc.passages.map(p=>p.text).join(' ')).toContain('concrete example');
 const result=await extractDocument('book.epub',await(await epub()).generateAsync({type:'nodebuffer',compression:'DEFLATE'}));expect(result.passages.map(p=>p.text)).toEqual(['First heading','First passage.','Second passage.']);
});
it('CHK-6.2-02 preserves DOCX paragraph order and EPUB spine order rather than archive order',async()=>{
 const z=new JSZip();z.file('word/document.xml','<w:document xmlns:w="synthetic"><w:body><w:p><w:r><w:t>Heading</w:t></w:r></w:p><w:p><w:r><w:t>Body &amp; facts</w:t></w:r></w:p></w:body></w:document>');
 expect((await extractDocument('test.docx',await z.generateAsync({type:'nodebuffer'}))).passages.map(p=>p.text)).toEqual(['Heading','Body & facts']);
 const result=await extractDocument('book.epub',await(await epub()).generateAsync({type:'nodebuffer'}));expect(result.passages[2]?.anchor.locator).toBe('OEBPS/second.xhtml#paragraph:1');
});
it('CHK-6.2-03 rejects malformed, traversal and oversized inflated archives',async()=>{
 expect(()=>archivePreflight(Buffer.from('PK invalid'))).toThrow();
 const z=new JSZip();z.file('../escape','bad');expect(()=>archivePreflight(Buffer.from([]))).toThrow();await expect(extractDocument('bad.docx',await z.generateAsync({type:'nodebuffer'}))).rejects.toThrow('unsafe_archive_path');
 const huge=new JSZip();huge.file('word/document.xml','x'.repeat(100000));await expect(extractDocument('bomb.docx',await huge.generateAsync({type:'nodebuffer',compression:'DEFLATE'}))).rejects.toThrow('archive_limits_exceeded');
});
it('CHK-6.2-04 excludes active content and rejects entity declarations/encrypted books',async()=>{
 const z=await epub();const result=await extractDocument('a.epub',await z.generateAsync({type:'nodebuffer'}));expect(JSON.stringify(result)).not.toContain('compromised');expect('compromised'in globalThis).toBe(false);
 z.file('OEBPS/first.xhtml','<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><html><p>&e;</p></html>');await expect(extractDocument('a.epub',await z.generateAsync({type:'nodebuffer'}))).rejects.toThrow('document_declarations_rejected');
 z.file('META-INF/encryption.xml','<encryption/>');await expect(extractDocument('a.epub',await z.generateAsync({type:'nodebuffer'}))).rejects.toThrow('encrypted_epub_unsupported');
});
it('CHK-6.2-05 persists extraction with original page/paragraph anchors through worker process',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cn-extract-'));dirs.push(dir);const s=openStore(dir);try{const c=createCourse(s,'Synthetic');const task=queueImport(s,c.id,'text.txt',Buffer.from('First paragraph.\n\nSecond paragraph.')).task!;await processImport(s,c.id,task.id);expect(listImportTasks(s,c.id)[0]?.status).toBe('completed');const row=s.db.prepare('select text,anchors from material_revisions').get() as {text:string;anchors:string};expect(row.text).toBe('First paragraph.\n\nSecond paragraph.');expect(JSON.parse(row.anchors)).toEqual([{type:'paragraph',locator:'paragraph:1'},{type:'paragraph',locator:'paragraph:2'}]);}finally{s.db.close();}
});
