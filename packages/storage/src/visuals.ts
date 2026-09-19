import {
  VISUAL_AID_KINDS,
  applyVisualAction,
  createVisualAidState,
  createId,
  parseTutorVisualAction,
  restoreVisualAidState,
  serializeVisualAidState,
  visualsPolicyScan,
  type ApprovedVisualAction,
  type VisualAidExportRecord,
  type VisualAidKind,
  type VisualAidState,
  type VisualExperimentRecord
} from '@collegenotes/domain';
import type { Store } from './database.js';
import { CourseError, moduleEnabled, requireCourse } from './courses.js';

export function requireVisuals(store: Store, courseId: string, write = false) {
  requireCourse(store, courseId, write);
  if (!moduleEnabled(store, courseId, 'visuals')) throw new CourseError('visuals_module_disabled', 409);
}

function rowExperiment(r: {
  id: string;
  course_id: string;
  kind: string;
  title: string;
  state_json: string;
  prediction: string | null;
  created_at: string;
  updated_at: string;
}): VisualExperimentRecord {
  return {
    id: r.id,
    courseId: r.course_id,
    kind: r.kind as VisualAidKind,
    title: r.title,
    state: restoreVisualAidState(r.state_json),
    prediction: r.prediction,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

export function listVisualExperiments(store: Store, courseId: string): VisualExperimentRecord[] {
  requireVisuals(store, courseId);
  const rows = store.db.prepare(
    'select * from visual_experiments where course_id=? order by created_at,id'
  ).all(courseId) as Parameters<typeof rowExperiment>[0][];
  return rows.map(rowExperiment);
}

export function getVisualExperiment(store: Store, courseId: string, id: string): VisualExperimentRecord {
  requireVisuals(store, courseId);
  const row = store.db.prepare(
    'select * from visual_experiments where course_id=? and id=?'
  ).get(courseId, id) as Parameters<typeof rowExperiment>[0] | undefined;
  if (!row) throw new CourseError('visual_experiment_unavailable', 404);
  return rowExperiment(row);
}

function persistState(store: Store, courseId: string, id: string, state: VisualAidState, prediction: string | null) {
  const now = new Date().toISOString();
  store.db.prepare(
    'update visual_experiments set state_json=?, prediction=?, updated_at=? where course_id=? and id=?'
  ).run(serializeVisualAidState(state), prediction, now, courseId, id);
}

export function createVisualExperiment(
  store: Store,
  courseId: string,
  input: unknown
): VisualExperimentRecord {
  requireVisuals(store, courseId, true);
  if (!input || typeof input !== 'object') throw new CourseError('invalid_visual_experiment');
  const body = input as Record<string, unknown>;
  const kind = body.kind;
  if (!VISUAL_AID_KINDS.includes(kind as VisualAidKind)) throw new CourseError('invalid_visual_kind');
  const title = typeof body.title === 'string' && body.title.trim() && !body.title.includes('\0') && body.title.length <= 200
    ? body.title.trim()
    : defaultTitle(kind as VisualAidKind);
  const reducedMotion = Boolean(body.reducedMotion);
  let state = createVisualAidState(kind as VisualAidKind, reducedMotion);
  if (body.state !== undefined) {
    try {
      state = restoreVisualAidState(body.state);
      if (state.kind !== kind) throw new Error('kind_mismatch');
    } catch {
      throw new CourseError('invalid_visual_state');
    }
  }
  if (kind === 'legibility_inspector' && state.kind === 'legibility_inspector' && typeof body.webgl2Available === 'boolean') {
    state = { ...state, webgl2Available: body.webgl2Available };
  }
  const scanHits = visualsPolicyScan(`${title} ${serializeVisualAidState(state)}`);
  if (scanHits.length) throw new CourseError('visuals_policy_violation');
  const id = createId('vexp');
  const now = new Date().toISOString();
  store.db.prepare(
    'insert into visual_experiments(id,course_id,kind,title,state_json,prediction,created_at,updated_at) values (?,?,?,?,?,?,?,?)'
  ).run(id, courseId, kind, title, serializeVisualAidState(state), null, now, now);
  return getVisualExperiment(store, courseId, id);
}

function defaultTitle(kind: VisualAidKind): string {
  if (kind === 'process_sequence') return 'Process sequence';
  if (kind === 'coordinated_exploration') return 'Coordinated exploration';
  return 'Audience-view legibility inspector';
}

export function applyVisualExperimentAction(
  store: Store,
  courseId: string,
  id: string,
  input: unknown
): { experiment: VisualExperimentRecord; narration: string } {
  requireVisuals(store, courseId, true);
  const current = getVisualExperiment(store, courseId, id);
  if (!input || typeof input !== 'object') throw new CourseError('invalid_visual_action');
  const body = input as Record<string, unknown>;
  if (body.code !== undefined || body.script !== undefined || body.eval !== undefined || body.generatedCode !== undefined) {
    throw new CourseError('arbitrary_code_rejected');
  }
  const result = applyVisualAction(current.state, body.action, body.payload as Record<string, unknown> | undefined);
  if (!result.ok) throw new CourseError(result.error);
  const prediction = result.state.kind === 'coordinated_exploration' ? result.state.prediction : current.prediction;
  persistState(store, courseId, id, result.state, prediction);
  return { experiment: getVisualExperiment(store, courseId, id), narration: result.narration };
}

export function restoreVisualExperiment(
  store: Store,
  courseId: string,
  id: string,
  input: unknown
): VisualExperimentRecord {
  requireVisuals(store, courseId, true);
  getVisualExperiment(store, courseId, id);
  if (!input || typeof input !== 'object') throw new CourseError('invalid_visual_state');
  const body = input as Record<string, unknown>;
  let state: VisualAidState;
  try {
    state = restoreVisualAidState(body.state ?? body);
  } catch {
    throw new CourseError('invalid_visual_state');
  }
  const prediction = typeof body.prediction === 'string' ? body.prediction : (state.kind === 'coordinated_exploration' ? state.prediction : null);
  persistState(store, courseId, id, state, prediction);
  return getVisualExperiment(store, courseId, id);
}

export function applyTutorVisualAction(
  store: Store,
  courseId: string,
  input: unknown
): { experiment: VisualExperimentRecord; narration: string } {
  requireVisuals(store, courseId, true);
  if (!moduleEnabled(store, courseId, 'tutoring')) throw new CourseError('tutoring_module_disabled', 409);
  let parsed;
  try {
    parsed = parseTutorVisualAction(input);
  } catch (e) {
    throw new CourseError(e instanceof Error ? e.message : 'invalid_tutor_visual_action');
  }
  return applyVisualExperimentAction(store, courseId, parsed.experimentId, {
    action: parsed.action,
    payload: parsed.payload
  });
}

export function narrationForVisualExperiment(store: Store, courseId: string, id: string): { narration: string; state: VisualAidState } {
  const experiment = getVisualExperiment(store, courseId, id);
  const units = experiment.state.explanation.units ? ` (${experiment.state.explanation.units})` : '';
  return {
    narration: `${experiment.state.explanation.title}. ${experiment.state.explanation.body}${units}`,
    state: experiment.state
  };
}

export function exportVisualRecords(store: Store, courseId: string): VisualAidExportRecord {
  requireVisuals(store, courseId);
  return {
    format: 'collegenotes-visuals',
    schemaVersion: 1,
    courseId,
    experiments: listVisualExperiments(store, courseId),
    exportedAt: new Date().toISOString()
  };
}

/** Contract helper: apply many transitions without exceeding the performance budget count. */
export function measureVisualTransitionBudget(
  kind: VisualAidKind,
  actions: Array<{ action: ApprovedVisualAction; payload?: Record<string, unknown> }>,
  budget: number
): { ok: boolean; transitions: number; final: VisualAidState } {
  let state = createVisualAidState(kind);
  let transitions = 0;
  for (const step of actions) {
    if (transitions >= budget) return { ok: false, transitions, final: state };
    const result = applyVisualAction(state, step.action, step.payload);
    if (!result.ok) return { ok: false, transitions, final: state };
    state = result.state;
    transitions += 1;
  }
  return { ok: true, transitions, final: state };
}
