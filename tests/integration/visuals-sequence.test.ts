import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import {
  APPROVED_VISUAL_ACTIONS,
  GENERIC_SEQUENCE_SOURCES,
  applyVisualAction,
  createProcessSequenceState,
  restoreVisualAidState,
  serializeVisualAidState
} from '@collegenotes/domain';
import {
  applyVisualExperimentAction,
  createCourse,
  createVisualExperiment,
  getVisualExperiment,
  openStore,
  setCourseModule,
  type Store
} from '@collegenotes/storage';
import { sequenceEdges, sequenceNodeLabels } from '@collegenotes/visuals';

const stores: Store[] = [];
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-p12-1-')));
  stores.push(s);
  const c = createCourse(s, 'Visuals sequence course');
  setCourseModule(s, c.id, 'visuals', true);
  return { s, c };
}

it('CHK-12.1-01 state/action fixtures for process sequence', () => {
  const state = createProcessSequenceState();
  expect(state.kind).toBe('process_sequence');
  expect(state.steps.length).toBeGreaterThanOrEqual(3);
  expect(APPROVED_VISUAL_ACTIONS).toContain('step_next');
  const next = applyVisualAction(state, 'step_next');
  expect(next.ok).toBe(true);
  if (next.ok) expect(next.state.kind === 'process_sequence' && next.state.stepIndex).toBe(1);
  const rejected = applyVisualAction(state, 'not_a_real_action');
  expect(rejected.ok).toBe(false);
});

it('CHK-12.1-02 labels and units on sequence nodes', () => {
  const state = createProcessSequenceState();
  const labels = sequenceNodeLabels(state);
  expect(labels.every((n) => n.label && n.units.includes('step'))).toBe(true);
  expect(state.explanation.units).toMatch(/step 1 of/);
  expect(sequenceEdges(state).length).toBeGreaterThan(0);
});

it('CHK-12.1-03 keyboard equivalents are declared for sequence controls', () => {
  const state = createProcessSequenceState();
  const keys = state.keyboard.map((k) => k.key);
  expect(keys).toContain('ArrowRight');
  expect(keys).toContain('ArrowLeft');
  expect(keys).toContain('Home');
  expect(state.keyboard.every((k) => APPROVED_VISUAL_ACTIONS.includes(k.action))).toBe(true);
});

it('CHK-12.1-04 serialize/restore round-trip', () => {
  const { s, c } = fixture();
  const created = createVisualExperiment(s, c.id, { kind: 'process_sequence' });
  applyVisualExperimentAction(s, c.id, created.id, { action: 'step_next' });
  applyVisualExperimentAction(s, c.id, created.id, { action: 'step_next' });
  const advanced = getVisualExperiment(s, c.id, created.id);
  expect(advanced.state.kind === 'process_sequence' && advanced.state.stepIndex).toBe(2);
  const raw = serializeVisualAidState(advanced.state);
  const restored = restoreVisualAidState(raw);
  expect(restored.kind).toBe('process_sequence');
  if (restored.kind === 'process_sequence') {
    expect(restored.stepIndex).toBe(2);
    expect(restored.selectedNodeId).toBe(advanced.state.kind === 'process_sequence' ? advanced.state.selectedNodeId : null);
  }
});

it('CHK-12.1-05 source links present and non-empty', () => {
  const state = createProcessSequenceState();
  expect(state.sources.length).toBeGreaterThan(0);
  expect(GENERIC_SEQUENCE_SOURCES.every((s) => s.url.startsWith('https://'))).toBe(true);
  expect(state.sources.every((s) => s.label && s.url.startsWith('http'))).toBe(true);
});

it('CHK-12.1-06 predictable transitions clamp at ends', () => {
  let state = createProcessSequenceState();
  for (let i = 0; i < 10; i += 1) {
    const result = applyVisualAction(state, 'step_next');
    expect(result.ok).toBe(true);
    if (result.ok) state = result.state as typeof state;
  }
  expect(state.stepIndex).toBe(state.steps.length - 1);
  const prev = applyVisualAction(state, 'step_prev');
  expect(prev.ok).toBe(true);
  if (prev.ok && prev.state.kind === 'process_sequence') expect(prev.state.stepIndex).toBe(state.steps.length - 2);
  const reset = applyVisualAction(state, 'reset');
  expect(reset.ok && reset.state.kind === 'process_sequence' && reset.state.stepIndex).toBe(0);
});
