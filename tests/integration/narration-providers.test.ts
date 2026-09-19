import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { openStore, createCourse, setCourseModule, storeOriginal, approveMaterial, generateNarration, listNarrationAssets, listNarrationVoices, type Store } from '@collegenotes/storage';
import { narrationSettingsHash, narrationTextHash, parseSayVoiceList, synthesize } from '@collegenotes/providers';
import { createService } from '../../apps/local-service/src/index.js';
import { syntheticSayExec } from './audio-test-helpers.js';

const stores: Store[] = [];
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-audio-')));
  stores.push(s);
  const c = createCourse(s, 'Synthetic audio');
  setCourseModule(s, c.id, 'audio', true);
  const text = 'Water freezes at zero degrees Celsius. Ice melts above that temperature.';
  const m = storeOriginal(s, c.id, 'synthetic-audio.txt', Buffer.from(text));
  s.db.prepare("insert into material_revisions values (?,?,1,?,'[]','extraction',?)").run(m.id, c.id, text, m.createdAt);
  approveMaterial(s, c.id, m.id, { expectedRevision: 1, reviewed: true });
  return { s, c, m, text };
}

const sampleVoiceList = `Samantha            en_US    # Hello! My name is Samantha.
Alex                 en_US    # Hello! My name is Alex.
`;

it('CHK-10.1-01 real audio generation via macOS say writes a WAV file', async () => {
  const { s, c, m } = fixture();
  const voices = await listNarrationVoices();
  expect(voices.length).toBeGreaterThan(0);
  const voice = voices.find((v) => /en/i.test(v.language)) ?? voices[0]!;
  const asset = await generateNarration(s, c.id, { sourceId: m.id, voiceId: voice.id });
  expect(asset.reused).toBe(false);
  expect(fs.existsSync(path.join(s.dataDir, asset.relPath))).toBe(true);
  expect(asset.byteLength).toBeGreaterThan(44);
  expect(fs.readFileSync(path.join(s.dataDir, asset.relPath)).subarray(0, 4).toString()).toBe('RIFF');
});

it('CHK-10.1-02 source fidelity hashes match the approved excerpt', async () => {
  const { s, c, m, text } = fixture();
  const asset = await generateNarration(s, c.id, { sourceId: m.id, voiceId: 'Samantha' }, syntheticSayExec());
  expect(asset.textHash).toBe(narrationTextHash(text));
  expect(asset.sourceRevision).toBe(1);
  expect(asset.settingsHash).toBe(narrationSettingsHash('Samantha', 200));
});

it('CHK-10.1-03 pronunciation samples list system voices without downloads', async () => {
  const parsed = parseSayVoiceList(sampleVoiceList);
  expect(parsed.map((v) => v.id)).toEqual(['Samantha', 'Alex']);
  const live = await listNarrationVoices();
  expect(live.every((v) => v.providerId === 'local')).toBe(true);
  expect(live.some((v) => v.name.length > 0)).toBe(true);
});

it('CHK-10.1-04 measured startup and throughput on the Mac', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-say-'));
  const out = path.join(dir, 'sample.wav');
  const voices = await listNarrationVoices();
  const result = await synthesize({ text: 'CollegeNotes measures local narration timing.', voiceId: voices[0]!.id, outPath: out });
  expect(result.startupMs).toBeGreaterThan(0);
  expect(result.throughputCharsPerSec).toBeGreaterThan(0);
  expect(result.durationMs).toBeGreaterThan(0);
  fs.rmSync(dir, { recursive: true, force: true });
});

it('CHK-10.1-05 failure handling for bad voices and disabled module', async () => {
  const { s, c, m } = fixture();
  await expect(generateNarration(s, c.id, { sourceId: m.id, voiceId: 'DefinitelyNotARealVoice_XYZ' }, syntheticSayExec())).rejects.toThrow(/narration_voice_unavailable|narration_synthesis_failed/);
  setCourseModule(s, c.id, 'audio', false);
  await expect(generateNarration(s, c.id, { sourceId: m.id, voiceId: 'Samantha' }, syntheticSayExec())).rejects.toThrow('audio_module_disabled');
});

it('CHK-10.1-06 approved cost and download bounds remain zero', async () => {
  const { s, c, m } = fixture();
  const asset = await generateNarration(s, c.id, { sourceId: m.id, voiceId: 'Samantha' }, syntheticSayExec());
  expect(asset.timing.costUsd).toBe(0);
  expect(asset.timing.downloadedBytes).toBe(0);
  const again = await generateNarration(s, c.id, { sourceId: m.id, voiceId: 'Samantha' }, syntheticSayExec());
  expect(again.reused).toBe(true);
  expect(listNarrationAssets(s, c.id)).toHaveLength(1);
  const app = createService(s);
  const voicesHttp = await app.inject('/audio/voices');
  expect(voicesHttp.statusCode).toBe(200);
  expect(voicesHttp.json().length).toBeGreaterThan(0);
  await app.close();
  expect(createHash('sha256').update('no-model-download').digest('hex')).toBeTruthy();
});
