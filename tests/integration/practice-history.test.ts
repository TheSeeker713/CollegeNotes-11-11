import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { COURSE_MODULES, THEME_VARIANTS } from '@collegenotes/domain';
import { VARIANTS, tokensFor } from '@collegenotes/ui';
import {
  advanceRehearsal,
  createChecklistItem,
  createCourse,
  createCueCard,
  createObservation,
  createRehearsal,
  exportCourse,
  exportPracticeRecords,
  listPracticeHistory,
  openStore,
  setAppearance,
  setAssignmentStatus,
  setCourseModule,
  updateChecklistItem,
  type Store
} from '@collegenotes/storage';

const stores: Store[] = [];
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-p11-4-')));
  stores.push(s);
  const c = createCourse(s, 'Practice history course');
  setCourseModule(s, c.id, 'practice', true);
  return { s, c };
}

it('CHK-11.4-01 requirement traceability across checklist, rehearsal, observations', () => {
  const { s, c } = fixture();
  const item = createChecklistItem(s, c.id, { label: 'Review imported outline' });
  const observation = createObservation(s, c.id, { category: 'praise', body: 'Solid opening.', status: 'submitted' });
  const rehearsal = createRehearsal(s, c.id, {});
  advanceRehearsal(s, c.id, rehearsal.id, { action: 'start' });
  advanceRehearsal(s, c.id, rehearsal.id, { action: 'stop', elapsedMs: 4000 });
  updateChecklistItem(s, c.id, item.id, { done: true });
  const history = listPracticeHistory(s, c.id);
  expect(history.some((h) => h.kind === 'checklist' && h.refId === item.id)).toBe(true);
  expect(history.some((h) => h.kind === 'observation' && h.refId === observation.id)).toBe(true);
  expect(history.some((h) => h.kind === 'rehearsal' && h.refId === rehearsal.id)).toBe(true);
});

it('CHK-11.4-02 exports match user content faithfully', () => {
  const { s, c } = fixture();
  const body = 'Export this exact sentence.';
  const notes = 'Cue notes stay verbatim.';
  createObservation(s, c.id, { category: 'polish', body, status: 'submitted' });
  createCueCard(s, c.id, { title: 'Close', notes });
  const exported = exportPracticeRecords(s, c.id);
  expect(exported.format).toBe('collegenotes-practice');
  expect(exported.observations[0]?.body).toBe(body);
  expect(exported.cues[0]?.notes).toBe(notes);
  const courseExport = exportCourse(s, c.id);
  expect(courseExport.data.records.practice_observations).toHaveLength(1);
  expect(courseExport.data.records.practice_cue_cards).toHaveLength(1);
});

it('CHK-11.4-03 distinct practice vs assignment status without inventing assignments', () => {
  const { s, c } = fixture();
  createObservation(s, c.id, { category: 'praise', body: 'Nice pace.', status: 'submitted' });
  const history = listPracticeHistory(s, c.id);
  expect(history[0]?.assignmentStatus).toBeNull();
  expect(history[0]?.practiceStatus).toBe('complete');
  const updated = setAssignmentStatus(s, c.id, history[0]!.id, 'user-marked-done');
  expect(updated.assignmentStatus).toBe('user-marked-done');
  const cleared = setAssignmentStatus(s, c.id, history[0]!.id, null);
  expect(cleared.assignmentStatus).toBeNull();
});

it('CHK-11.4-04 complete module regression including availability and theme tokens', () => {
  expect(COURSE_MODULES.find((m) => m.id === 'practice')?.available).toBe(true);
  for (const key of THEME_VARIANTS) {
    const [theme, mode] = key.split('-') as ['botanical' | 'brutalist', 'light' | 'dark'];
    const tokens = tokensFor({ theme, mode, density: 'comfortable', reduceMotion: false, reduceTransparency: false });
    expect(tokens.practice).toBeTruthy();
    expect(VARIANTS[key].practice).toBe(tokens.practice);
  }
  const { s, c } = fixture();
  for (const [theme, mode] of [['botanical', 'light'], ['botanical', 'dark'], ['brutalist', 'light'], ['brutalist', 'dark']] as const) {
    setAppearance(s, { theme, mode, density: 'comfortable', reduceMotion: false, reduceTransparency: false });
    const o = createObservation(s, c.id, { category: 'question', body: `Does theme ${theme}-${mode} keep writing?`, status: 'submitted' });
    expect(o.body).toContain(`${theme}-${mode}`);
  }
});

it('CHK-11.4-05 full phase audit: practice tables export and module disable retains data', () => {
  const { s, c } = fixture();
  createChecklistItem(s, c.id, { label: 'Bring slides' });
  createObservation(s, c.id, { category: 'polish', body: 'Shorten ending.', status: 'submitted' });
  const before = exportPracticeRecords(s, c.id);
  expect(before.checklist).toHaveLength(1);
  expect(before.observations).toHaveLength(1);
  setCourseModule(s, c.id, 'practice', false);
  expect(() => exportPracticeRecords(s, c.id)).toThrow('practice_module_disabled');
  setCourseModule(s, c.id, 'practice', true);
  const after = exportPracticeRecords(s, c.id);
  expect(after.observations[0]?.body).toBe('Shorten ending.');
  expect(after.checklist[0]?.label).toBe('Bring slides');
});
