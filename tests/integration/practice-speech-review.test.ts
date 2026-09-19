import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import {
  createAnnotation,
  createCourse,
  evaluateVisualClaim,
  getOrCreateTranscript,
  importPracticeMedia,
  listAnnotations,
  listPracticeMedia,
  openStore,
  practiceMediaPath,
  setCourseModule,
  updateTranscript,
  type Store
} from '@collegenotes/storage';

const stores: Store[] = [];
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-p11-2-')));
  stores.push(s);
  const c = createCourse(s, 'Speech review course');
  setCourseModule(s, c.id, 'practice', true);
  return { s, c };
}

it('CHK-11.2-01 supported media imports and clear unsupported errors', () => {
  const { s, c } = fixture();
  const wav = importPracticeMedia(s, c.id, {
    filename: 'practice.wav',
    mimeType: 'audio/wav',
    contentBase64: Buffer.from('RIFF....WAVEfmt ').toString('base64'),
    durationMs: 1200
  });
  expect(wav.kind).toBe('audio');
  expect(listPracticeMedia(s, c.id)).toHaveLength(1);
  expect(() => importPracticeMedia(s, c.id, {
    filename: 'notes.exe',
    mimeType: 'application/octet-stream',
    contentBase64: Buffer.from('bad').toString('base64')
  })).toThrow('unsupported_practice_media');
});

it('CHK-11.2-02 seek alignment updates transcript position', () => {
  const { s, c } = fixture();
  const media = importPracticeMedia(s, c.id, {
    filename: 'talk.mp3',
    mimeType: 'audio/mpeg',
    contentBase64: Buffer.from('ID3synthetic').toString('base64')
  });
  const tr = getOrCreateTranscript(s, c.id, media.id, {
    segments: [
      { index: 0, text: 'Hello', startMs: 0, endMs: 500 },
      { index: 1, text: 'world', startMs: 500, endMs: 1000 }
    ],
    rawText: 'Hello world'
  });
  const sought = updateTranscript(s, c.id, tr.id, { seekMs: 750 });
  expect(sought.seekMs).toBe(750);
});

it('CHK-11.2-03 annotations survive edits and store reopen', () => {
  const { s, c } = fixture();
  const media = importPracticeMedia(s, c.id, {
    filename: 'clip.wav',
    mimeType: 'audio/wav',
    contentBase64: Buffer.from('wav-bytes').toString('base64')
  });
  createAnnotation(s, c.id, { mediaId: media.id, offsetMs: 250, body: 'Pause here' });
  const dataDir = s.dataDir;
  s.db.close();
  stores.pop();
  const reopened = openStore(dataDir);
  stores.push(reopened);
  setCourseModule(reopened, c.id, 'practice', true);
  const annotations = listAnnotations(reopened, c.id, media.id);
  expect(annotations).toHaveLength(1);
  expect(annotations[0]?.body).toBe('Pause here');
  expect(annotations[0]?.offsetMs).toBe(250);
});

it('CHK-11.2-04 local-only storage under app data directory', () => {
  const { s, c } = fixture();
  const media = importPracticeMedia(s, c.id, {
    filename: 'local.mp4',
    mimeType: 'video/mp4',
    contentBase64: Buffer.from('ftypisom').toString('base64')
  });
  const absolute = practiceMediaPath(s, c.id, media.id);
  expect(absolute.startsWith(s.dataDir)).toBe(true);
  expect(media.relPath.startsWith('practice/')).toBe(true);
  expect(fs.existsSync(absolute)).toBe(true);
});

it('CHK-11.2-05 transcript correction preserves raw text', () => {
  const { s, c } = fixture();
  const media = importPracticeMedia(s, c.id, {
    filename: 'voice.wav',
    mimeType: 'audio/wav',
    contentBase64: Buffer.from('raw-audio').toString('base64')
  });
  const tr = getOrCreateTranscript(s, c.id, media.id, { rawText: 'orignal wording', segments: [] });
  const corrected = updateTranscript(s, c.id, tr.id, { editedText: 'original wording' });
  expect(corrected.rawText).toBe('orignal wording');
  expect(corrected.editedText).toBe('original wording');
});

it('CHK-11.2-06 refuse false visual-delivery claims from audio alone', () => {
  const { s, c } = fixture();
  const audio = importPracticeMedia(s, c.id, {
    filename: 'voice-only.wav',
    mimeType: 'audio/wav',
    contentBase64: Buffer.from('audio-only').toString('base64')
  });
  const refused = evaluateVisualClaim(s, c.id, audio.id, 'Excellent eye contact and gestures');
  expect(refused.allowed).toBe(false);
  expect(refused.reason).toBe('audio_cannot_prove_visual_delivery');
  const video = importPracticeMedia(s, c.id, {
    filename: 'stage.mp4',
    mimeType: 'video/mp4',
    contentBase64: Buffer.from('video-bytes').toString('base64')
  });
  const allowed = evaluateVisualClaim(s, c.id, video.id, 'Excellent eye contact and gestures');
  expect(allowed.allowed).toBe(true);
  expect(allowed.reason).toBeNull();
});
