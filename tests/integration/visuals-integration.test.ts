import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { COURSE_MODULES, THEME_VARIANTS, visualsPolicyScan } from '@collegenotes/domain';
import { VARIANTS, tokensFor } from '@collegenotes/ui';
import {
  applyTutorVisualAction,
  applyVisualExperimentAction,
  createCourse,
  createVisualExperiment,
  exportCourse,
  exportVisualRecords,
  getVisualExperiment,
  listVisualExperiments,
  narrationForVisualExperiment,
  openStore,
  restoreVisualExperiment,
  setAppearance,
  setCourseModule,
  CourseError,
  type Store
} from '@collegenotes/storage';

const stores: Store[] = [];
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-p12-4-')));
  stores.push(s);
  const c = createCourse(s, 'Visuals tutor course');
  setCourseModule(s, c.id, 'visuals', true);
  setCourseModule(s, c.id, 'tutoring', true);
  return { s, c };
}

it('CHK-12.4-01 invalid tutor actions are rejected', () => {
  const { s, c } = fixture();
  const exp = createVisualExperiment(s, c.id, { kind: 'process_sequence' });
  expect(() => applyTutorVisualAction(s, c.id, { experimentId: exp.id, action: 'explode' })).toThrow(CourseError);
  expect(() => applyVisualExperimentAction(s, c.id, exp.id, { action: 'explode' })).toThrow(CourseError);
});

it('CHK-12.4-02 arbitrary generated code execution is rejected', () => {
  const { s, c } = fixture();
  const exp = createVisualExperiment(s, c.id, { kind: 'process_sequence' });
  expect(() => applyTutorVisualAction(s, c.id, {
    experimentId: exp.id,
    action: 'step_next',
    generatedCode: 'process.exit(0)'
  })).toThrow(/arbitrary_code_rejected/);
  expect(() => applyVisualExperimentAction(s, c.id, exp.id, {
    action: 'step_next',
    script: 'alert(1)'
  })).toThrow(/arbitrary_code_rejected/);
});

it('CHK-12.4-03 narration describes actual state after approved action', () => {
  const { s, c } = fixture();
  const exp = createVisualExperiment(s, c.id, { kind: 'process_sequence' });
  const result = applyTutorVisualAction(s, c.id, { experimentId: exp.id, action: 'step_next' });
  expect(result.narration).toContain(result.experiment.state.explanation.title);
  const narrated = narrationForVisualExperiment(s, c.id, exp.id);
  expect(narrated.narration).toContain(narrated.state.explanation.body);
  if (narrated.state.kind === 'process_sequence') expect(narrated.state.stepIndex).toBe(1);
});

it('CHK-12.4-04 restart restores saved experiment interaction state', () => {
  const { s, c } = fixture();
  const exp = createVisualExperiment(s, c.id, { kind: 'coordinated_exploration' });
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'predict', payload: { text: 'Saved prediction' } });
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'scrub', payload: { index: 3 } });
  const saved = getVisualExperiment(s, c.id, exp.id);
  // Simulate restart by restoring serialized learner state.
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'reset' });
  const restored = restoreVisualExperiment(s, c.id, exp.id, { state: saved.state, prediction: saved.prediction });
  expect(restored.prediction).toBe('Saved prediction');
  expect(restored.state.kind === 'coordinated_exploration' && restored.state.processIndex).toBe(3);
});

it('CHK-12.4-05 integrated theme tokens and module availability across four combos', () => {
  expect(COURSE_MODULES.find((m) => m.id === 'visuals')?.available).toBe(true);
  for (const key of THEME_VARIANTS) {
    const [theme, mode] = key.split('-') as ['botanical' | 'brutalist', 'light' | 'dark'];
    const tokens = tokensFor({ theme, mode, density: 'comfortable', reduceMotion: false, reduceTransparency: false });
    expect(tokens.visuals).toBeTruthy();
    expect(VARIANTS[key].visuals).toBe(tokens.visuals);
  }
  const { s, c } = fixture();
  const exp = createVisualExperiment(s, c.id, { kind: 'legibility_inspector' });
  for (const [theme, mode] of [['botanical', 'light'], ['botanical', 'dark'], ['brutalist', 'light'], ['brutalist', 'dark']] as const) {
    setAppearance(s, { theme, mode, density: 'comfortable', reduceMotion: true, reduceTransparency: true });
    applyVisualExperimentAction(s, c.id, exp.id, { action: 'set_text_size_pt', payload: { points: 28 } });
    const state = getVisualExperiment(s, c.id, exp.id).state;
    expect(state.kind === 'legibility_inspector' && state.textSizePt).toBe(28);
    expect(state.kind === 'legibility_inspector' && state.textAlternative).toBeTruthy();
  }
});

it('CHK-12.4-06 phase audit: export, policy scan, disable retains data', () => {
  const { s, c } = fixture();
  createVisualExperiment(s, c.id, { kind: 'process_sequence', title: 'Generic process' });
  createVisualExperiment(s, c.id, { kind: 'legibility_inspector' });
  expect(visualsPolicyScan('generic process diagram')).toEqual([]);
  expect(visualsPolicyScan('COMM 110 syllabus pack')).toContain('comm 110');
  const exported = exportVisualRecords(s, c.id);
  expect(exported.format).toBe('collegenotes-visuals');
  expect(exported.experiments).toHaveLength(2);
  const courseExport = exportCourse(s, c.id);
  expect(courseExport.data.records.visual_experiments).toHaveLength(2);
  setCourseModule(s, c.id, 'visuals', false);
  expect(() => listVisualExperiments(s, c.id)).toThrow(/visuals_module_disabled/);
  setCourseModule(s, c.id, 'visuals', true);
  expect(listVisualExperiments(s, c.id)).toHaveLength(2);
});
