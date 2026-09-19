import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import {
  VISUAL_PERFORMANCE_BUDGET,
  applyVisualAction,
  createCoordinatedExplorationState
} from '@collegenotes/domain';
import {
  applyVisualExperimentAction,
  createCourse,
  createVisualExperiment,
  getVisualExperiment,
  measureVisualTransitionBudget,
  openStore,
  setCourseModule,
  type Store
} from '@collegenotes/storage';
import { explorationSyncSnapshot } from '@collegenotes/visuals';

const stores: Store[] = [];
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-p12-2-')));
  stores.push(s);
  const c = createCourse(s, 'Visuals exploration course');
  setCourseModule(s, c.id, 'visuals', true);
  return { s, c };
}

it('CHK-12.2-01 synchronized linked views after scrub and annotation select', () => {
  const { s, c } = fixture();
  const exp = createVisualExperiment(s, c.id, { kind: 'coordinated_exploration' });
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'scrub', payload: { index: 2 } });
  const afterScrub = getVisualExperiment(s, c.id, exp.id);
  expect(afterScrub.state.kind).toBe('coordinated_exploration');
  if (afterScrub.state.kind !== 'coordinated_exploration') return;
  const snap = explorationSyncSnapshot(afterScrub.state);
  expect(snap.processIndex).toBe(2);
  expect(snap.annotationId).toBeTruthy();
  applyVisualExperimentAction(s, c.id, exp.id, {
    action: 'select_annotation',
    payload: { annotationId: afterScrub.state.annotations[0]!.id }
  });
  const afterAnn = getVisualExperiment(s, c.id, exp.id);
  if (afterAnn.state.kind !== 'coordinated_exploration') throw new Error('kind');
  expect(afterAnn.state.processIndex).toBe(afterAnn.state.annotations[0]!.processIndex);
  expect(explorationSyncSnapshot(afterAnn.state).linkedView).toBe(afterAnn.state.linkedView);
});

it('CHK-12.2-02 correct outcome after prediction and compare', () => {
  const { s, c } = fixture();
  const exp = createVisualExperiment(s, c.id, { kind: 'coordinated_exploration' });
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'predict', payload: { text: 'Final relationship holds.' } });
  const compared = applyVisualExperimentAction(s, c.id, exp.id, { action: 'compare' });
  expect(compared.experiment.state.kind).toBe('coordinated_exploration');
  if (compared.experiment.state.kind !== 'coordinated_exploration') return;
  expect(compared.experiment.state.comparison).toContain('Prediction:');
  expect(compared.experiment.state.comparison).toContain('Outcome:');
  expect(compared.experiment.state.linkedView).toBe('detail');
});

it('CHK-12.2-03 no motion-required comprehension — paused by default with full explanation', () => {
  const state = createCoordinatedExplorationState(true);
  expect(state.paused).toBe(true);
  expect(state.reducedMotion).toBe(true);
  expect(state.explanation.body.length).toBeGreaterThan(10);
  const playing = applyVisualAction(state, 'play');
  expect(playing.ok).toBe(true);
  const pausedAgain = applyVisualAction(playing.ok ? playing.state : state, 'pause');
  expect(pausedAgain.ok && pausedAgain.state.kind === 'coordinated_exploration' && pausedAgain.state.paused).toBe(true);
});

it('CHK-12.2-04 pause and scrub controls', () => {
  let state = createCoordinatedExplorationState();
  const scrubbed = applyVisualAction(state, 'scrub', { delta: 1 });
  expect(scrubbed.ok).toBe(true);
  if (scrubbed.ok && scrubbed.state.kind === 'coordinated_exploration') {
    expect(scrubbed.state.processIndex).toBe(1);
    state = scrubbed.state;
  }
  const paused = applyVisualAction(state, 'pause');
  expect(paused.ok && paused.state.kind === 'coordinated_exploration' && paused.state.paused).toBe(true);
});

it('CHK-12.2-05 performance budget contract for linked-view sync ops', () => {
  const actions = Array.from({ length: 200 }, (_, i) => ({
    action: 'scrub' as const,
    payload: { index: i % 4 }
  }));
  const measured = measureVisualTransitionBudget('coordinated_exploration', actions, VISUAL_PERFORMANCE_BUDGET.maxLinkedViewSyncOps);
  expect(measured.ok).toBe(true);
  expect(measured.transitions).toBe(200);
  expect(measured.transitions).toBeLessThanOrEqual(VISUAL_PERFORMANCE_BUDGET.maxLinkedViewSyncOps);
});

it('CHK-12.2-06 interaction produces a learning-relevant change', () => {
  const { s, c } = fixture();
  const exp = createVisualExperiment(s, c.id, { kind: 'coordinated_exploration' });
  const before = getVisualExperiment(s, c.id, exp.id);
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'predict', payload: { text: 'Midpoint relationship differs.' } });
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'compare' });
  const after = getVisualExperiment(s, c.id, exp.id);
  expect(before.state.kind).toBe('coordinated_exploration');
  expect(after.state.kind).toBe('coordinated_exploration');
  if (before.state.kind !== 'coordinated_exploration' || after.state.kind !== 'coordinated_exploration') return;
  expect(after.prediction).toBe('Midpoint relationship differs.');
  expect(after.state.comparison).not.toBe(before.state.comparison);
  expect(after.state.explanation.body).toBeTruthy();
});
