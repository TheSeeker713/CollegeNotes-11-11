import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { inspectSlideReadability } from '@collegenotes/domain';
import {
  advanceRehearsal,
  createCourse,
  createCueCard,
  createRehearsal,
  inspectPracticeSlide,
  listCueCards,
  openStore,
  practiceTutorQuestionHook,
  setCourseModule,
  updateCueCard,
  type Store
} from '@collegenotes/storage';

const stores: Store[] = [];
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-p11-3-')));
  stores.push(s);
  const c = createCourse(s, 'Rehearsal course');
  setCourseModule(s, c.id, 'practice', true);
  return { s, c };
}

it('CHK-11.3-01 accurate timer advances elapsed ms while recording', () => {
  const { s, c } = fixture();
  const r = createRehearsal(s, c.id, {});
  advanceRehearsal(s, c.id, r.id, { action: 'start' });
  const ticked = advanceRehearsal(s, c.id, r.id, { action: 'tick', elapsedMs: 1500 });
  expect(ticked.status).toBe('recording');
  expect(ticked.elapsedMs).toBe(1500);
});

it('CHK-11.3-02 start/stop/cancel recording lifecycle', () => {
  const { s, c } = fixture();
  const r = createRehearsal(s, c.id, {});
  expect(advanceRehearsal(s, c.id, r.id, { action: 'start' }).status).toBe('recording');
  expect(advanceRehearsal(s, c.id, r.id, { action: 'stop', elapsedMs: 2000 }).status).toBe('stopped');
  const cancelled = createRehearsal(s, c.id, {});
  advanceRehearsal(s, c.id, cancelled.id, { action: 'start' });
  expect(advanceRehearsal(s, c.id, cancelled.id, { action: 'cancel' }).status).toBe('cancelled');
});

it('CHK-11.3-03 cue progression is adjustable', () => {
  const { s, c } = fixture();
  createCueCard(s, c.id, { title: 'Open', notes: 'Breathe' });
  createCueCard(s, c.id, { title: 'Close', notes: 'Thank you' });
  const r = createRehearsal(s, c.id, {});
  expect(advanceRehearsal(s, c.id, r.id, { action: 'set_cue', cueIndex: 1 }).cueIndex).toBe(1);
  expect(listCueCards(s, c.id)).toHaveLength(2);
});

it('CHK-11.3-04 clipping/reflow checks for slide readability', () => {
  const cramped = inspectSlideReadability({
    width: 320,
    height: 180,
    fontSizePx: 24,
    lineCount: 20,
    maxCharsPerLine: 80,
    content: 'x'.repeat(2000)
  });
  expect(cramped.clipped).toBe(true);
  expect(cramped.reflowNeeded).toBe(true);
  const ok = inspectPracticeSlide({
    width: 1280,
    height: 720,
    fontSizePx: 28,
    lineCount: 4,
    maxCharsPerLine: 24,
    content: 'Short readable slide'
  });
  expect(ok.clipped).toBe(false);
});

it('CHK-11.3-05 cue notes are never rewritten', () => {
  const { s, c } = fixture();
  const notes = 'Keep  my   exact   spacing\nand line breaks.';
  const cue = createCueCard(s, c.id, { title: 'Bridge', notes });
  expect(cue.notes).toBe(notes);
  const updated = updateCueCard(s, c.id, cue.id, { title: 'Bridge 2' });
  expect(updated.notes).toBe(notes);
});

it('CHK-11.3-06 missing speech duration stays unconfigured; tutor hook respects tutoring module', () => {
  const { s, c } = fixture();
  const r = createRehearsal(s, c.id, {});
  expect(r.configuredDurationMs).toBeNull();
  const withDuration = createRehearsal(s, c.id, { configuredDurationMs: 300000 });
  expect(withDuration.configuredDurationMs).toBe(300000);
  expect(practiceTutorQuestionHook(s, c.id, 'opening clarity').allowed).toBe(false);
  setCourseModule(s, c.id, 'tutoring', true);
  const hook = practiceTutorQuestionHook(s, c.id, 'opening clarity');
  expect(hook.allowed).toBe(true);
  expect(hook.prompt).toContain('opening clarity');
});
