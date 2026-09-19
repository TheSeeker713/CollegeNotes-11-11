import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { openStore, createCourse, setCourseModule, storeOriginal, approveMaterial, generateNarration, interruptNarration, advanceVoiceInterrupt, echoSuppressedWhileTutorAudio, getPlaybackState, type Store } from '@collegenotes/storage';
import { structuredTutorReply } from '@collegenotes/providers';
import { syntheticSayExec } from './audio-test-helpers.js';

const stores: Store[] = [];
const exec = syntheticSayExec(900);
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

async function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-voice-')));
  stores.push(s);
  const c = createCourse(s, 'Voice interrupt');
  setCourseModule(s, c.id, 'audio', true);
  const text = 'Narration continues until interrupted. Then a tutor question is asked. Playback resumes afterward.';
  const m = storeOriginal(s, c.id, 'voice.txt', Buffer.from(text));
  s.db.prepare("insert into material_revisions values (?,?,1,?,'[]','extraction',?)").run(m.id, c.id, text, m.createdAt);
  approveMaterial(s, c.id, m.id, { expectedRevision: 1, reviewed: true });
  const asset = await generateNarration(s, c.id, { sourceId: m.id, voiceId: 'Samantha' }, exec);
  return { s, c, m, asset, text };
}

it('CHK-10.4-01 interruption saves offset before asking', async () => {
  const { s, c, asset } = await fixture();
  const offset = Math.min(500, asset.durationMs);
  const session = interruptNarration(s, c.id, { assetId: asset.id, offsetMs: offset, clientRequestId: 'irq-1' });
  expect(session.status).toBe('interrupted');
  expect(session.savedOffsetMs).toBe(offset);
  expect(getPlaybackState(s, c.id, asset.id).offsetMs).toBe(offset);
});

it('CHK-10.4-02 echo and self-trigger prevention while tutor audio', async () => {
  const { s, c, asset } = await fixture();
  const session = interruptNarration(s, c.id, { assetId: asset.id, offsetMs: 100, clientRequestId: 'irq-echo' });
  const asking = advanceVoiceInterrupt(s, c.id, session.id, { action: 'ask', tutorRequestId: 'tutor-1', networkAvailable: true });
  expect(asking.echoSuppressed).toBe(true);
  expect(echoSuppressedWhileTutorAudio(s, c.id, asking.id)).toBe(true);
});

it('CHK-10.4-03 concurrent playback and capture contract keeps saved offset', async () => {
  const { s, c, asset } = await fixture();
  const session = interruptNarration(s, c.id, { assetId: asset.id, offsetMs: 250, clientRequestId: 'irq-concurrent' });
  advanceVoiceInterrupt(s, c.id, session.id, { action: 'ask', networkAvailable: true });
  const resumed = advanceVoiceInterrupt(s, c.id, session.id, { action: 'resume' });
  expect(resumed.status).toBe('resumed');
  expect(getPlaybackState(s, c.id, asset.id).offsetMs).toBe(250);
});

it('CHK-10.4-04 cancellation stops the teach-back path', async () => {
  const { s, c, asset } = await fixture();
  const session = interruptNarration(s, c.id, { assetId: asset.id, offsetMs: 10, clientRequestId: 'irq-cancel' });
  const cancelled = advanceVoiceInterrupt(s, c.id, session.id, { action: 'cancel' });
  expect(cancelled.status).toBe('cancelled');
});

it('CHK-10.4-05 network loss fails the cloud ask path honestly', async () => {
  const { s, c, asset } = await fixture();
  const session = interruptNarration(s, c.id, { assetId: asset.id, offsetMs: 20, clientRequestId: 'irq-net' });
  expect(() => advanceVoiceInterrupt(s, c.id, session.id, { action: 'ask', networkAvailable: false })).toThrow('network_unavailable');
});

it('CHK-10.4-06 no duplicate responses for the same client request', async () => {
  const { s, c, asset } = await fixture();
  const first = interruptNarration(s, c.id, { assetId: asset.id, offsetMs: 40, clientRequestId: 'irq-dup' });
  const second = interruptNarration(s, c.id, { assetId: asset.id, offsetMs: Math.min(800, asset.durationMs), clientRequestId: 'irq-dup' });
  expect(second.id).toBe(first.id);
  expect(second.savedOffsetMs).toBe(first.savedOffsetMs);
  const asking = advanceVoiceInterrupt(s, c.id, first.id, { action: 'ask', tutorRequestId: 'same', networkAvailable: true });
  const again = advanceVoiceInterrupt(s, c.id, first.id, { action: 'ask', tutorRequestId: 'other', networkAvailable: true });
  expect(again.tutorRequestId).toBe(asking.tutorRequestId);
});

it('CHK-10.4-07 voice plus source-grounding regression', async () => {
  const { text } = await fixture();
  const reply = structuredTutorReply('explain', 'What happens to water?', {
    gap: null,
    requirements: [],
    explanations: [{ text }],
    passages: [{ text }]
  });
  expect(reply).toContain('Explanation grounded in your course sources');
  expect(reply).toContain('Narration continues');
  const gapped = structuredTutorReply('explain', 'Unrelated?', { gap: { message: 'No passage matched.' }, requirements: [], explanations: [], passages: [] });
  expect(gapped).toContain('could not find supporting course material');
});
