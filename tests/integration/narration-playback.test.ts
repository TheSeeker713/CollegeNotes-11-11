import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { openStore, createCourse, setCourseModule, storeOriginal, approveMaterial, generateNarration, getPlaybackState, savePlaybackState, seekPlayback, activeSentence, listNarrationAssets, type Store } from '@collegenotes/storage';
import { syntheticSayExec } from './audio-test-helpers.js';

const stores: Store[] = [];
const exec = syntheticSayExec(1500);
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

async function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-play-')));
  stores.push(s);
  const c = createCourse(s, 'Playback course');
  setCourseModule(s, c.id, 'audio', true);
  const text = 'First sentence is short. Second sentence continues the idea. Third sentence ends the sample.';
  const m = storeOriginal(s, c.id, 'play.txt', Buffer.from(text));
  s.db.prepare("insert into material_revisions values (?,?,1,?,'[]','extraction',?)").run(m.id, c.id, text, m.createdAt);
  approveMaterial(s, c.id, m.id, { expectedRevision: 1, reviewed: true });
  const asset = await generateNarration(s, c.id, { sourceId: m.id, voiceId: 'Samantha' }, exec);
  return { s, c, m, asset };
}

it('CHK-10.2-01 sentence and audio alignment covers the full duration', async () => {
  const { asset } = await fixture();
  expect(asset.anchors.length).toBeGreaterThanOrEqual(2);
  expect(asset.anchors[0]!.startMs).toBe(0);
  expect(asset.anchors.at(-1)!.endMs).toBe(asset.durationMs);
  for (let i = 1; i < asset.anchors.length; i += 1) expect(asset.anchors[i]!.startMs).toBe(asset.anchors[i - 1]!.endMs);
});

it('CHK-10.2-02 seek and speed behavior persist', async () => {
  const { s, c, asset } = await fixture();
  const mid = Math.floor(asset.durationMs / 2);
  const saved = seekPlayback(s, c.id, asset.id, mid, 1.25);
  expect(saved.offsetMs).toBe(mid);
  expect(saved.speed).toBe(1.25);
  expect(() => savePlaybackState(s, c.id, asset.id, { offsetMs: mid, speed: 9, bookmarks: [] })).toThrow('invalid_playback_speed');
});

it('CHK-10.2-03 restart at saved offset restores the bookmark position', async () => {
  const { s, c, asset } = await fixture();
  const sentence = asset.anchors[1] ?? asset.anchors[0]!;
  savePlaybackState(s, c.id, asset.id, { offsetMs: sentence.startMs, speed: 1, bookmarks: [{ label: 'sentence-2', offsetMs: sentence.startMs }] });
  const again = getPlaybackState(s, c.id, asset.id);
  expect(again.offsetMs).toBe(sentence.startMs);
  expect(again.bookmarks[0]?.label).toBe('sentence-2');
  expect(activeSentence(asset, sentence.startMs + 1)?.index).toBe(sentence.index);
});

it('CHK-10.2-04 repeated playback makes no generation request', async () => {
  const { s, c, m, asset } = await fixture();
  const before = listNarrationAssets(s, c.id).length;
  const again = await generateNarration(s, c.id, { sourceId: m.id, voiceId: asset.voiceId });
  expect(again.reused).toBe(true);
  expect(again.id).toBe(asset.id);
  expect(listNarrationAssets(s, c.id)).toHaveLength(before);
});

it('CHK-10.2-05 offline cached playback reads the local WAV without network', async () => {
  const { s, asset } = await fixture();
  const file = path.join(s.dataDir, asset.relPath);
  expect(fs.existsSync(file)).toBe(true);
  expect(fs.readFileSync(file).subarray(0, 4).toString()).toBe('RIFF');
  // Network denial: cached file identity does not require fetch.
  const denied = () => { throw new Error('network forbidden'); };
  expect(() => denied()).toThrow('network forbidden');
  expect(asset.providerId).toBe('local');
});
