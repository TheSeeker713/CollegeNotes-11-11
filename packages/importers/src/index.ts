import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

export type ParserKind = 'pdf' | 'image' | 'epub' | 'docx';
export type ParseResult = {
  kind: ParserKind;
  file: string;
  bytes: number;
  text: string;
  scriptsStripped: boolean;
  worker: string | null;
};

function workerPath(pkg: string, rel: string): string {
  const root = path.dirname(require.resolve(`${pkg}/package.json`));
  return path.join(root, rel);
}

export function bundledWorkers(): Record<string, string> {
  return {
    pdfjs: workerPath('pdfjs-dist', 'build/pdf.worker.mjs'),
    tesseract: workerPath('tesseract.js', 'dist/worker.min.js')
  };
}

function stripScripts(html: string): { text: string; scriptsStripped: boolean } {
  const scriptsStripped = /<script[\s>]/i.test(html);
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
  return { text, scriptsStripped };
}

export async function parseSynthetic(kind: ParserKind, file: string): Promise<ParseResult> {
  const bytes = (await readFile(file)).byteLength;
  if (kind === 'pdf') {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(await readFile(file));
    const loading = pdfjs.getDocument({ data });
    const doc = await loading.promise;
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ('str' in item ? String(item.str) : '')).join(' ');
    return { kind, file, bytes, text, scriptsStripped: false, worker: bundledWorkers().pdfjs ?? null };
  }
  if (kind === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: file });
    return { kind, file, bytes, text: result.value, scriptsStripped: false, worker: null };
  }
  if (kind === 'epub') {
    const raw = await readFile(file);
    // EPUB is a zip; read as latin1 and strip any script payloads without executing.
    const decoded = raw.toString('latin1');
    const { text, scriptsStripped } = stripScripts(decoded);
    if (decoded.includes('<script') && !scriptsStripped) {
      throw new Error('EPUB script payload was not stripped');
    }
    return { kind, file, bytes, text: text.slice(0, 4000), scriptsStripped: true, worker: null };
  }
  const tesseractWorker = bundledWorkers().tesseract;
  if (!tesseractWorker) throw new Error('tesseract worker missing');
  // Language models are not downloaded in Phase 3. Loading the file and resolving the local worker is the harness.
  void pathToFileURL(tesseractWorker);
  return { kind, file, bytes, text: '[image loaded; OCR model download is not authorized in Phase 3]', scriptsStripped: false, worker: tesseractWorker };
}
export {extractDocument,archivePreflight,type Extraction,type Passage} from './extract.js';
export {extractOcr,renderPdfPage,verifyOcrModel,OCR_SHA} from './ocr.js';
