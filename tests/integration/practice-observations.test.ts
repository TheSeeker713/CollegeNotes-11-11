import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import {
  SYNTHETIC_FEEDBACK_FIXTURES,
  countWords,
  isActualQuestion,
  parseObservationInput
} from '@collegenotes/domain';
import {
  createCourse,
  createObservation,
  listObservations,
  openStore,
  practicePolicyScan,
  setCourseModule,
  updateObservation,
  wordCountFeedback,
  type Store
} from '@collegenotes/storage';

const stores: Store[] = [];
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-p11-1-')));
  stores.push(s);
  const c = createCourse(s, 'Synthetic practice course');
  setCourseModule(s, c.id, 'practice', true);
  return { s, c };
}

it('CHK-11.1-01 category/rationale fixtures accept praise, question, polish without curriculum text', () => {
  const { s, c } = fixture();
  for (const f of SYNTHETIC_FEEDBACK_FIXTURES) {
    const o = createObservation(s, c.id, { ...f, status: 'submitted' });
    expect(o.category).toBe(f.category);
    expect(o.body).toBe(f.body);
    expect(o.rationale).toBe(f.rationale);
    expect(o.body.toLowerCase()).not.toMatch(/comm\s*110/);
  }
  expect(listObservations(s, c.id)).toHaveLength(3);
});

it('CHK-11.1-02 question category requires an actual interrogative when submitted', () => {
  expect(isActualQuestion('How does this connect?')).toBe(true);
  expect(isActualQuestion('What changed in the second point')).toBe(true);
  expect(isActualQuestion('Clear opening statement.')).toBe(false);
  expect(() => parseObservationInput({ category: 'question', body: 'Needs more energy.', status: 'submitted' })).toThrow('question_requires_interrogative');
  const { s, c } = fixture();
  expect(() => createObservation(s, c.id, { category: 'question', body: 'Needs more energy.', status: 'submitted' })).toThrow('question_requires_interrogative');
  const draft = createObservation(s, c.id, { category: 'question', body: 'Needs more energy.', status: 'draft' });
  expect(draft.status).toBe('draft');
  expect(() => updateObservation(s, c.id, draft.id, { body: 'Why was the transition skipped?', status: 'submitted' })).not.toThrow();
});

it('CHK-11.1-03 word-count feedback without invented maximum', () => {
  const text = 'One two three four five';
  expect(countWords(text)).toBe(5);
  const feedback = wordCountFeedback(text);
  expect(feedback.wordCount).toBe(5);
  expect(feedback.maximum).toBeNull();
  expect(feedback.note.toLowerCase()).toContain('no maximum');
});

it('CHK-11.1-04 original writing preserved exactly', () => {
  const { s, c } = fixture();
  const body = '  Keep my   spacing & punctuation!!  ';
  const o = createObservation(s, c.id, { category: 'polish', body, rationale: 'mine', status: 'submitted' });
  expect(o.body).toBe(body);
  expect(listObservations(s, c.id)[0]?.body).toBe(body);
});

it('CHK-11.1-05 policy boundaries: no class-specific content in practice domain/storage sources', () => {
  const root = path.resolve(process.cwd());
  const scan = practicePolicyScan([
    path.join(root, 'packages/domain/src/practice.ts'),
    path.join(root, 'packages/storage/src/practice.ts'),
    path.join(root, 'apps/web/src/PracticeWorkspace.tsx')
  ]);
  expect(scan.ok).toBe(true);
  expect(scan.hits).toEqual([]);
  const { s, c } = fixture();
  setCourseModule(s, c.id, 'practice', false);
  expect(() => listObservations(s, c.id)).toThrow('practice_module_disabled');
});
