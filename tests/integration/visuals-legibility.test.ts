import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import {
  VISUAL_PERFORMANCE_BUDGET,
  applyVisualAction,
  createLegibilityInspectorState,
  evaluateLegibility
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
import { detectGraphics, shouldRenderInstructionalLoop, textEquivalent } from '@collegenotes/visuals';

const stores: Store[] = [];
afterEach(() => { for (const s of stores.splice(0)) { s.db.close(); fs.rmSync(s.dataDir, { recursive: true, force: true }); } });

function fixture() {
  const s = openStore(fs.mkdtempSync(path.join(os.tmpdir(), 'cn-p12-3-')));
  stores.push(s);
  const c = createCourse(s, 'Visuals legibility course');
  setCourseModule(s, c.id, 'visuals', true);
  return { s, c };
}

it('CHK-12.3-01 correct manipulation and state for distance/size/contrast', () => {
  const { s, c } = fixture();
  const exp = createVisualExperiment(s, c.id, { kind: 'legibility_inspector', webgl2Available: true });
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'set_audience_distance', payload: { meters: 10 } });
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'set_text_size_pt', payload: { points: 18 } });
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'set_contrast_ratio', payload: { ratio: 3 } });
  const state = getVisualExperiment(s, c.id, exp.id).state;
  expect(state.kind).toBe('legibility_inspector');
  if (state.kind !== 'legibility_inspector') return;
  expect(state.audienceDistanceM).toBe(10);
  expect(state.textSizePt).toBe(18);
  expect(state.contrastRatio).toBe(3);
  const evaled = evaluateLegibility(state.audienceDistanceM, state.textSizePt, state.contrastRatio);
  expect(evaled.contrastOk).toBe(false);
  expect(state.textAlternative).toContain('10.0 m');
});

it('CHK-12.3-02 instructional GPU path is gated distinctly from shell atmosphere', () => {
  const state = createLegibilityInspectorState({ webgl2Available: true });
  expect(state.kind).toBe('legibility_inspector');
  expect(state.active).toBe(false);
  // GPU loop only when explicitly activated — shell glass is separate.
  expect(shouldRenderInstructionalLoop(state)).toBe(false);
  const activated = applyVisualAction(state, 'set_active', { active: true });
  expect(activated.ok && activated.state.kind === 'legibility_inspector' && shouldRenderInstructionalLoop(activated.state)).toBe(true);
});

it('CHK-12.3-03 WebGL2 support detection contract', () => {
  const missing = detectGraphics(null);
  expect(missing.webgl2).toBe(false);
  expect(missing.fallback).toBe('text-2d');
  const fake = {
    getContext(name: string) {
      return name === 'webgl2' ? {} : null;
    }
  };
  expect(detectGraphics(fake).webgl2).toBe(true);
});

it('CHK-12.3-04 context loss and recovery stop then allow restore', () => {
  let state = createLegibilityInspectorState({ webgl2Available: true });
  const active = applyVisualAction(state, 'set_active', { active: true });
  expect(active.ok).toBe(true);
  if (active.ok) state = active.state as typeof state;
  const lost = applyVisualAction(state, 'report_context_lost');
  expect(lost.ok).toBe(true);
  if (lost.ok && lost.state.kind === 'legibility_inspector') {
    expect(lost.state.contextLost).toBe(true);
    expect(lost.state.active).toBe(false);
    expect(shouldRenderInstructionalLoop(lost.state)).toBe(false);
    state = lost.state;
  }
  const restored = applyVisualAction(state, 'report_context_restored');
  expect(restored.ok && restored.state.kind === 'legibility_inspector' && restored.state.contextLost).toBe(false);
});

it('CHK-12.3-05 no-GPU alternative explanation always present', () => {
  const state = createLegibilityInspectorState({ webgl2Available: false });
  expect(state.textAlternative.length).toBeGreaterThan(20);
  expect(textEquivalent(state.explanation.title)).toContain('Text equivalent:');
  expect(state.explanation.body.length).toBeGreaterThan(10);
});

it('CHK-12.3-06 frame-time budget constant is defined for Mac contract tests', () => {
  expect(VISUAL_PERFORMANCE_BUDGET.frameTimeBudgetMs).toBeLessThanOrEqual(16.7);
  expect(VISUAL_PERFORMANCE_BUDGET.frameTimeBudgetMs).toBeGreaterThan(0);
  // Contract: inactive aids must not claim a continuous frame budget.
  const inactive = createLegibilityInspectorState({ webgl2Available: true });
  expect(shouldRenderInstructionalLoop(inactive)).toBe(false);
});

it('CHK-12.3-07 no background render loop when inactive', () => {
  const { s, c } = fixture();
  const exp = createVisualExperiment(s, c.id, { kind: 'legibility_inspector', webgl2Available: true });
  let state = getVisualExperiment(s, c.id, exp.id).state;
  expect(state.kind === 'legibility_inspector' && shouldRenderInstructionalLoop(state)).toBe(false);
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'set_active', payload: { active: true } });
  state = getVisualExperiment(s, c.id, exp.id).state;
  expect(state.kind === 'legibility_inspector' && shouldRenderInstructionalLoop(state)).toBe(true);
  applyVisualExperimentAction(s, c.id, exp.id, { action: 'set_active', payload: { active: false } });
  state = getVisualExperiment(s, c.id, exp.id).state;
  expect(state.kind === 'legibility_inspector' && shouldRenderInstructionalLoop(state)).toBe(false);
});
