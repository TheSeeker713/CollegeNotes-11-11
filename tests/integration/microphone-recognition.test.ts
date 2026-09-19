import { expect, it } from 'vitest';
import { applyTermCorrections } from '@collegenotes/domain';
import { MicController, createMockMicDeps, synthesizeOfflineTranscript } from '@collegenotes/providers';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';
import { openStore, createCourse, setCourseModule, createRecognitionTranscript, updateRecognitionTranscript, type Store } from '@collegenotes/storage';

const stores: Store[] = [];
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

function audioCourse() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-mic-')));
  stores.push(s);
  const c = createCourse(s, 'Mic course');
  setCourseModule(s, c.id, 'audio', true);
  return { s, c };
}

it('CHK-10.3-01 grant deny and revoke transitions', async () => {
  const deps = createMockMicDeps('unknown');
  const mic = new MicController(deps);
  expect((await mic.start()).permission).toBe('granted');
  await mic.stop();
  deps.setPermission('denied');
  expect((await mic.start()).capture).toBe('idle');
  expect(await mic.revoke()).toBe('revoked');
  expect(mic.isCapturing()).toBe(false);
});

it('CHK-10.3-02 missing device blocks capture', async () => {
  const deps = createMockMicDeps('granted', []);
  const mic = new MicController(deps);
  const result = await mic.start();
  expect(result.permission).toBe('missing_device');
  expect(result.capture).toBe('idle');
  expect(deps.captureStarted).toBe(0);
});

it('CHK-10.3-03 no permission popup loop on repeated denied starts', async () => {
  const deps = createMockMicDeps('denied');
  const mic = new MicController(deps);
  await mic.start();
  await mic.start();
  await mic.start();
  expect(mic.promptsIssued()).toBe(0);
});

it('CHK-10.3-04 stop releases capture', async () => {
  const deps = createMockMicDeps('granted');
  const mic = new MicController(deps);
  await mic.start();
  expect(deps.captureStarted).toBe(1);
  await mic.stop();
  expect(deps.captureStopped).toBe(1);
  expect(mic.isCapturing()).toBe(false);
});

it('CHK-10.3-05 technical term correction helper', () => {
  expect(applyTermCorrections('The mitochonria is noted', [{ from: 'mitochonria', to: 'mitochondria' }])).toBe('The mitochondria is noted');
  const { s, c } = audioCourse();
  const draft = createRecognitionTranscript(s, c.id, { expectedText: 'The mitochonria produces ATP.', terms: [{ from: 'mitochonria', to: 'mitochondria' }] });
  expect(draft.editedText).toContain('mitochondria');
  const saved = updateRecognitionTranscript(s, c.id, draft.id, { editedText: draft.editedText, terms: draft.terms, status: 'final' });
  expect(saved.status).toBe('final');
});

it('CHK-10.3-06 synthetic offline recognition without model download', () => {
  const result = synthesizeOfflineTranscript({ courseId: 'course_x', expectedText: 'Synthetic offline recognition.', terms: [] });
  expect(result.providerId).toBe('local');
  expect(result.modelId).toBe('synthetic-stt');
  expect(result.costUsd).toBe(0);
  expect(result.downloadedBytes).toBe(0);
  const { s, c } = audioCourse();
  const row = createRecognitionTranscript(s, c.id, { expectedText: 'Offline recognition contract.' });
  expect(row.rawText).toContain('Offline recognition');
});
