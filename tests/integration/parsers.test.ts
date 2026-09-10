import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { bundledWorkers, parseSynthetic } from '@collegenotes/importers';

const fixtures = path.resolve('tests/fixtures/public');

describe('parser harness', () => {
  it('resolves worker files from local node_modules, not a CDN', () => {
    const workers = bundledWorkers();
    expect(fs.existsSync(workers.pdfjs ?? '')).toBe(true);
    expect(fs.existsSync(workers.tesseract ?? '')).toBe(true);
    expect(workers.pdfjs).not.toMatch(/^https?:/);
    expect(workers.tesseract).not.toMatch(/^https?:/);
  });

  it('loads synthetic PDF text', async () => {
    const result = await parseSynthetic('pdf', path.join(fixtures, 'sample.pdf'));
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.text.toLowerCase()).toContain('speaking');
  });

  it('loads synthetic DOCX text', async () => {
    const result = await parseSynthetic('docx', path.join(fixtures, 'sample.docx'));
    expect(result.text).toContain('concrete example');
  });

  it('loads EPUB without executing scripts', async () => {
    const result = await parseSynthetic('epub', path.join(fixtures, 'sample.epub'));
    expect(result.scriptsStripped).toBe(true);
    expect(result.text).toContain('Synthetic EPUB passage');
    expect(result.text).not.toContain('window.__executed');
  });

  it('loads a synthetic image file and local worker without fetching models', async () => {
    const result = await parseSynthetic('image', path.join(fixtures, 'sample.png'));
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.worker && fs.existsSync(result.worker)).toBe(true);
  });
});
