/** Course-neutral visual-aid contracts. No class-specific curriculum is embedded. */

export const VISUAL_AID_SCHEMA_VERSION = 1 as const;

export const VISUAL_AID_KINDS = ['process_sequence', 'coordinated_exploration', 'legibility_inspector'] as const;
export type VisualAidKind = (typeof VISUAL_AID_KINDS)[number];

/** Tutor and UI may only invoke these approved actions — never arbitrary code. */
export const APPROVED_VISUAL_ACTIONS = [
  'step_next',
  'step_prev',
  'select_node',
  'select_annotation',
  'scrub',
  'pause',
  'play',
  'predict',
  'compare',
  'clear_prediction',
  'set_audience_distance',
  'set_text_size_pt',
  'set_contrast_ratio',
  'set_camera_yaw',
  'set_active',
  'report_context_lost',
  'report_context_restored',
  'reset',
  'set_reduced_motion'
] as const;
export type ApprovedVisualAction = (typeof APPROVED_VISUAL_ACTIONS)[number];

export function isApprovedVisualAction(value: unknown): value is ApprovedVisualAction {
  return typeof value === 'string' && (APPROVED_VISUAL_ACTIONS as readonly string[]).includes(value);
}

export type VisualAidSource = {
  id: string;
  label: string;
  url: string;
};

export type VisualAidExplanation = {
  title: string;
  body: string;
  /** Human-readable units for the current step or measurement, when applicable. */
  units: string | null;
};

export type VisualKeyboardBinding = {
  key: string;
  action: ApprovedVisualAction;
  label: string;
};

/** Contract performance budgets for non-UI verification (milliseconds / node counts). */
export const VISUAL_PERFORMANCE_BUDGET = {
  /** Max synthetic state transitions evaluated in a contract suite. */
  maxStateTransitions: 10_000,
  /** Target frame-time budget for instructional WebGL aids on this Mac (ms). */
  frameTimeBudgetMs: 16.7,
  /** Max linked-view sync operations before budget failure in contract tests. */
  maxLinkedViewSyncOps: 5_000
} as const;

export type ProcessSequenceStep = {
  id: string;
  label: string;
  detail: string;
  /** Optional relationship target for sequence edges. */
  relatesTo: string | null;
};

export type ProcessSequenceState = {
  schemaVersion: typeof VISUAL_AID_SCHEMA_VERSION;
  kind: 'process_sequence';
  stepIndex: number;
  steps: ProcessSequenceStep[];
  selectedNodeId: string | null;
  reducedMotion: boolean;
  explanation: VisualAidExplanation;
  sources: VisualAidSource[];
  keyboard: VisualKeyboardBinding[];
};

export type ExplorationAnnotation = {
  id: string;
  label: string;
  detail: string;
  processIndex: number;
};

export type CoordinatedExplorationState = {
  schemaVersion: typeof VISUAL_AID_SCHEMA_VERSION;
  kind: 'coordinated_exploration';
  processIndex: number;
  processLength: number;
  paused: boolean;
  selectedAnnotationId: string | null;
  annotations: ExplorationAnnotation[];
  linkedView: 'overview' | 'detail' | 'timeline';
  prediction: string | null;
  comparison: string | null;
  /** 0–1 hierarchy cue only — never required for comprehension. */
  depthHint: number;
  reducedMotion: boolean;
  explanation: VisualAidExplanation;
  sources: VisualAidSource[];
  keyboard: VisualKeyboardBinding[];
};

export type LegibilityInspectorState = {
  schemaVersion: typeof VISUAL_AID_SCHEMA_VERSION;
  kind: 'legibility_inspector';
  audienceDistanceM: number;
  textSizePt: number;
  contrastRatio: number;
  cameraYaw: number;
  /** When false, instructional WebGL must not keep a background render loop. */
  active: boolean;
  webgl2Available: boolean;
  contextLost: boolean;
  reducedMotion: boolean;
  explanation: VisualAidExplanation;
  sources: VisualAidSource[];
  keyboard: VisualKeyboardBinding[];
  /** Readable no-GPU summary always available. */
  textAlternative: string;
};

export type VisualAidState = ProcessSequenceState | CoordinatedExplorationState | LegibilityInspectorState;

export type VisualExperimentRecord = {
  id: string;
  courseId: string;
  kind: VisualAidKind;
  title: string;
  state: VisualAidState;
  prediction: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VisualAidExportRecord = {
  format: 'collegenotes-visuals';
  schemaVersion: typeof VISUAL_AID_SCHEMA_VERSION;
  courseId: string;
  experiments: VisualExperimentRecord[];
  exportedAt: string;
};

export type VisualActionRequest = {
  action: ApprovedVisualAction;
  payload?: Record<string, unknown>;
};

export type VisualActionResult =
  | { ok: true; state: VisualAidState; narration: string }
  | { ok: false; error: string; state: VisualAidState };

export type VisualTutorActionRequest = {
  experimentId: string;
  action: ApprovedVisualAction;
  payload?: Record<string, unknown>;
};

export const GENERIC_PROCESS_STEPS: ProcessSequenceStep[] = [
  { id: 'step-observe', label: 'Observe', detail: 'Identify the starting condition of a process.', relatesTo: 'step-relate' },
  { id: 'step-relate', label: 'Relate', detail: 'Connect each stage to the next with an explicit relationship.', relatesTo: 'step-sequence' },
  { id: 'step-sequence', label: 'Sequence', detail: 'Order the stages so the outcome follows from prior steps.', relatesTo: 'step-check' },
  { id: 'step-check', label: 'Check', detail: 'Verify the final outcome against the stated relationship.', relatesTo: null }
];

export const GENERIC_SEQUENCE_SOURCES: VisualAidSource[] = [
  {
    id: 'src-process-overview',
    label: 'Process and sequence learning (generic overview)',
    url: 'https://en.wikipedia.org/wiki/Process_theory'
  },
  {
    id: 'src-diagram-literacy',
    label: 'Diagram literacy for learners (generic overview)',
    url: 'https://en.wikipedia.org/wiki/Diagram'
  }
];

export const GENERIC_EXPLORATION_ANNOTATIONS: ExplorationAnnotation[] = [
  { id: 'ann-start', label: 'Start condition', detail: 'What is true before the process begins?', processIndex: 0 },
  { id: 'ann-mid', label: 'Midpoint check', detail: 'Which relationship must hold halfway through?', processIndex: 2 },
  { id: 'ann-end', label: 'Expected outcome', detail: 'What should be true when the sequence completes?', processIndex: 3 }
];

export const GENERIC_EXPLORATION_SOURCES: VisualAidSource[] = [
  {
    id: 'src-linked-views',
    label: 'Multiple coordinated representations (generic)',
    url: 'https://en.wikipedia.org/wiki/Multiple_representations'
  }
];

export const GENERIC_LEGIBILITY_SOURCES: VisualAidSource[] = [
  {
    id: 'src-contrast',
    label: 'Contrast and legibility (generic overview)',
    url: 'https://en.wikipedia.org/wiki/Contrast_(vision)'
  },
  {
    id: 'src-typography',
    label: 'Typography size and viewing distance (generic)',
    url: 'https://en.wikipedia.org/wiki/Typeface'
  }
];

const SEQUENCE_KEYBOARD: VisualKeyboardBinding[] = [
  { key: 'ArrowRight', action: 'step_next', label: 'Next step' },
  { key: 'ArrowLeft', action: 'step_prev', label: 'Previous step' },
  { key: 'Home', action: 'reset', label: 'Reset sequence' },
  { key: 'r', action: 'set_reduced_motion', label: 'Toggle reduced motion preference for this aid' }
];

const EXPLORATION_KEYBOARD: VisualKeyboardBinding[] = [
  { key: 'ArrowRight', action: 'scrub', label: 'Advance process scrub' },
  { key: 'ArrowLeft', action: 'scrub', label: 'Rewind process scrub' },
  { key: ' ', action: 'pause', label: 'Pause or resume' },
  { key: 'p', action: 'predict', label: 'Record a prediction' },
  { key: 'c', action: 'compare', label: 'Compare prediction to outcome' },
  { key: 'Home', action: 'reset', label: 'Reset exploration' }
];

const LEGIBILITY_KEYBOARD: VisualKeyboardBinding[] = [
  { key: 'ArrowUp', action: 'set_audience_distance', label: 'Increase audience distance' },
  { key: 'ArrowDown', action: 'set_audience_distance', label: 'Decrease audience distance' },
  { key: '[', action: 'set_text_size_pt', label: 'Decrease text size' },
  { key: ']', action: 'set_text_size_pt', label: 'Increase text size' },
  { key: '+', action: 'set_contrast_ratio', label: 'Increase contrast' },
  { key: '-', action: 'set_contrast_ratio', label: 'Decrease contrast' },
  { key: 'Home', action: 'reset', label: 'Reset inspector' }
];

function sequenceExplanation(stepIndex: number, steps: ProcessSequenceStep[]): VisualAidExplanation {
  const step = steps[stepIndex] ?? steps[0]!;
  return {
    title: step.label,
    body: step.detail,
    units: `step ${stepIndex + 1} of ${steps.length}`
  };
}

export function createProcessSequenceState(reducedMotion = false): ProcessSequenceState {
  const steps = GENERIC_PROCESS_STEPS.map((s) => ({ ...s }));
  return {
    schemaVersion: VISUAL_AID_SCHEMA_VERSION,
    kind: 'process_sequence',
    stepIndex: 0,
    steps,
    selectedNodeId: steps[0]!.id,
    reducedMotion,
    explanation: sequenceExplanation(0, steps),
    sources: GENERIC_SEQUENCE_SOURCES.map((s) => ({ ...s })),
    keyboard: SEQUENCE_KEYBOARD.map((k) => ({ ...k }))
  };
}

function explorationExplanation(state: Omit<CoordinatedExplorationState, 'explanation'>): VisualAidExplanation {
  const ann = state.annotations.find((a) => a.id === state.selectedAnnotationId);
  const phase = `process index ${state.processIndex} of ${Math.max(0, state.processLength - 1)}`;
  if (ann) {
    return { title: ann.label, body: ann.detail, units: phase };
  }
  return {
    title: state.linkedView === 'timeline' ? 'Timeline view' : state.linkedView === 'detail' ? 'Detail view' : 'Overview',
    body: state.paused
      ? 'Process is paused. Scrub or resume; motion is not required to understand the relationships.'
      : 'Linked views stay synchronized as you scrub the process.',
    units: phase
  };
}

export function createCoordinatedExplorationState(reducedMotion = false): CoordinatedExplorationState {
  const annotations = GENERIC_EXPLORATION_ANNOTATIONS.map((a) => ({ ...a }));
  const base: Omit<CoordinatedExplorationState, 'explanation'> = {
    schemaVersion: VISUAL_AID_SCHEMA_VERSION,
    kind: 'coordinated_exploration',
    processIndex: 0,
    processLength: GENERIC_PROCESS_STEPS.length,
    paused: true,
    selectedAnnotationId: annotations[0]!.id,
    annotations,
    linkedView: 'overview',
    prediction: null,
    comparison: null,
    depthHint: 0.25,
    reducedMotion,
    sources: GENERIC_EXPLORATION_SOURCES.map((s) => ({ ...s })),
    keyboard: EXPLORATION_KEYBOARD.map((k) => ({ ...k }))
  };
  return { ...base, explanation: explorationExplanation(base) };
}

export function evaluateLegibility(audienceDistanceM: number, textSizePt: number, contrastRatio: number): {
  readableAtDistance: boolean;
  contrastOk: boolean;
  summary: string;
  textAlternative: string;
} {
  const distance = Math.max(0.5, Math.min(30, audienceDistanceM));
  const size = Math.max(8, Math.min(96, textSizePt));
  const contrast = Math.max(1, Math.min(21, contrastRatio));
  // Approximate: larger type and closer distance improve legibility; WCAG-ish contrast floor at 4.5.
  const sizeAtDistance = size / Math.max(1, distance / 2);
  const readableAtDistance = sizeAtDistance >= 12;
  const contrastOk = contrast >= 4.5;
  const summary = readableAtDistance && contrastOk
    ? 'Text meets the generic distance and contrast legibility thresholds for this inspector.'
    : !readableAtDistance && !contrastOk
      ? 'Increase text size or reduce distance, and raise contrast above 4.5:1.'
      : !readableAtDistance
        ? 'Text is likely hard to read at this audience distance; increase size or move closer.'
        : 'Contrast is below 4.5:1; raise contrast for clearer reading.';
  const textAlternative =
    `Audience distance ${distance.toFixed(1)} m; text ${size.toFixed(0)} pt; contrast ${contrast.toFixed(1)}:1. ` +
    `${readableAtDistance ? 'Distance/size OK.' : 'Distance/size needs adjustment.'} ` +
    `${contrastOk ? 'Contrast OK.' : 'Contrast needs adjustment.'}`;
  return { readableAtDistance, contrastOk, summary, textAlternative };
}

function legibilityExplanation(
  audienceDistanceM: number,
  textSizePt: number,
  contrastRatio: number
): { explanation: VisualAidExplanation; textAlternative: string } {
  const result = evaluateLegibility(audienceDistanceM, textSizePt, contrastRatio);
  return {
    explanation: {
      title: 'Audience-view legibility',
      body: result.summary,
      units: `${audienceDistanceM.toFixed(1)} m · ${textSizePt.toFixed(0)} pt · ${contrastRatio.toFixed(1)}:1`
    },
    textAlternative: result.textAlternative
  };
}

export function createLegibilityInspectorState(
  options: { reducedMotion?: boolean; webgl2Available?: boolean } = {}
): LegibilityInspectorState {
  const audienceDistanceM = 5;
  const textSizePt = 24;
  const contrastRatio = 7;
  const { explanation, textAlternative } = legibilityExplanation(audienceDistanceM, textSizePt, contrastRatio);
  return {
    schemaVersion: VISUAL_AID_SCHEMA_VERSION,
    kind: 'legibility_inspector',
    audienceDistanceM,
    textSizePt,
    contrastRatio,
    cameraYaw: 0,
    active: false,
    webgl2Available: options.webgl2Available ?? false,
    contextLost: false,
    reducedMotion: options.reducedMotion ?? false,
    explanation,
    sources: GENERIC_LEGIBILITY_SOURCES.map((s) => ({ ...s })),
    keyboard: LEGIBILITY_KEYBOARD.map((k) => ({ ...k })),
    textAlternative
  };
}

export function createVisualAidState(kind: VisualAidKind, reducedMotion = false): VisualAidState {
  if (kind === 'process_sequence') return createProcessSequenceState(reducedMotion);
  if (kind === 'coordinated_exploration') return createCoordinatedExplorationState(reducedMotion);
  return createLegibilityInspectorState({ reducedMotion });
}

export function serializeVisualAidState(state: VisualAidState): string {
  return JSON.stringify(state);
}

export function restoreVisualAidState(raw: unknown): VisualAidState {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid_visual_state');
  const body = parsed as Record<string, unknown>;
  if (body.schemaVersion !== VISUAL_AID_SCHEMA_VERSION) throw new Error('unsupported_visual_schema');
  if (!VISUAL_AID_KINDS.includes(body.kind as VisualAidKind)) throw new Error('invalid_visual_kind');
  const kind = body.kind as VisualAidKind;
  // Re-apply through constructors + action restore for safety.
  if (kind === 'process_sequence') {
    const base = createProcessSequenceState(Boolean(body.reducedMotion));
    const stepIndex = typeof body.stepIndex === 'number' ? Math.max(0, Math.min(base.steps.length - 1, Math.floor(body.stepIndex))) : 0;
    const selectedNodeId = typeof body.selectedNodeId === 'string' ? body.selectedNodeId : base.steps[stepIndex]!.id;
    const next = { ...base, stepIndex, selectedNodeId, reducedMotion: Boolean(body.reducedMotion) };
    next.explanation = sequenceExplanation(next.stepIndex, next.steps);
    return next;
  }
  if (kind === 'coordinated_exploration') {
    const base = createCoordinatedExplorationState(Boolean(body.reducedMotion));
    const processIndex = typeof body.processIndex === 'number'
      ? Math.max(0, Math.min(base.processLength - 1, Math.floor(body.processIndex)))
      : 0;
    const linkedView = body.linkedView === 'detail' || body.linkedView === 'timeline' || body.linkedView === 'overview'
      ? body.linkedView
      : 'overview';
    const selectedAnnotationId = typeof body.selectedAnnotationId === 'string' ? body.selectedAnnotationId : base.selectedAnnotationId;
    const prediction = typeof body.prediction === 'string' ? body.prediction : null;
    const comparison = typeof body.comparison === 'string' ? body.comparison : null;
    const depthHint = typeof body.depthHint === 'number' ? Math.max(0, Math.min(1, body.depthHint)) : base.depthHint;
    const paused = body.paused !== false;
    const next: Omit<CoordinatedExplorationState, 'explanation'> = {
      ...base,
      processIndex,
      linkedView,
      selectedAnnotationId,
      prediction,
      comparison,
      depthHint,
      paused,
      reducedMotion: Boolean(body.reducedMotion)
    };
    return { ...next, explanation: explorationExplanation(next) };
  }
  const audienceDistanceM = typeof body.audienceDistanceM === 'number' ? body.audienceDistanceM : 5;
  const textSizePt = typeof body.textSizePt === 'number' ? body.textSizePt : 24;
  const contrastRatio = typeof body.contrastRatio === 'number' ? body.contrastRatio : 7;
  const { explanation, textAlternative } = legibilityExplanation(audienceDistanceM, textSizePt, contrastRatio);
  return {
    ...createLegibilityInspectorState({
      reducedMotion: Boolean(body.reducedMotion),
      webgl2Available: Boolean(body.webgl2Available)
    }),
    audienceDistanceM: Math.max(0.5, Math.min(30, audienceDistanceM)),
    textSizePt: Math.max(8, Math.min(96, textSizePt)),
    contrastRatio: Math.max(1, Math.min(21, contrastRatio)),
    cameraYaw: typeof body.cameraYaw === 'number' ? body.cameraYaw : 0,
    active: Boolean(body.active),
    contextLost: Boolean(body.contextLost),
    explanation,
    textAlternative
  };
}

function narrationFor(state: VisualAidState): string {
  return `${state.explanation.title}. ${state.explanation.body}` +
    (state.explanation.units ? ` (${state.explanation.units})` : '');
}

function applyProcessSequence(state: ProcessSequenceState, action: ApprovedVisualAction, payload?: Record<string, unknown>): VisualActionResult {
  const next = { ...state, steps: state.steps.map((s) => ({ ...s })) };
  switch (action) {
    case 'step_next': {
      const from = next.stepIndex;
      next.stepIndex = Math.min(next.steps.length - 1, next.stepIndex + 1);
      next.selectedNodeId = next.steps[next.stepIndex]!.id;
      next.explanation = sequenceExplanation(next.stepIndex, next.steps);
      if (from === next.stepIndex && from === next.steps.length - 1) {
        return { ok: true, state: next, narration: narrationFor(next) };
      }
      return { ok: true, state: next, narration: narrationFor(next) };
    }
    case 'step_prev': {
      next.stepIndex = Math.max(0, next.stepIndex - 1);
      next.selectedNodeId = next.steps[next.stepIndex]!.id;
      next.explanation = sequenceExplanation(next.stepIndex, next.steps);
      return { ok: true, state: next, narration: narrationFor(next) };
    }
    case 'select_node': {
      const id = typeof payload?.nodeId === 'string' ? payload.nodeId : null;
      const idx = next.steps.findIndex((s) => s.id === id);
      if (idx < 0) return { ok: false, error: 'unknown_node', state };
      next.stepIndex = idx;
      next.selectedNodeId = id;
      next.explanation = sequenceExplanation(next.stepIndex, next.steps);
      return { ok: true, state: next, narration: narrationFor(next) };
    }
    case 'set_reduced_motion': {
      next.reducedMotion = typeof payload?.enabled === 'boolean' ? payload.enabled : !next.reducedMotion;
      return { ok: true, state: next, narration: narrationFor(next) };
    }
    case 'reset': {
      const reset = createProcessSequenceState(next.reducedMotion);
      return { ok: true, state: reset, narration: narrationFor(reset) };
    }
    default:
      return { ok: false, error: 'action_not_supported_for_aid', state };
  }
}

function applyExploration(state: CoordinatedExplorationState, action: ApprovedVisualAction, payload?: Record<string, unknown>): VisualActionResult {
  const draft: Omit<CoordinatedExplorationState, 'explanation'> = {
    ...state,
    annotations: state.annotations.map((a) => ({ ...a }))
  };
  switch (action) {
    case 'scrub': {
      const delta = typeof payload?.delta === 'number' ? Math.trunc(payload.delta) : 1;
      const absolute = typeof payload?.index === 'number' ? Math.floor(payload.index) : null;
      draft.processIndex = absolute !== null
        ? Math.max(0, Math.min(draft.processLength - 1, absolute))
        : Math.max(0, Math.min(draft.processLength - 1, draft.processIndex + delta));
      draft.depthHint = draft.processIndex / Math.max(1, draft.processLength - 1);
      const matching = draft.annotations.find((a) => a.processIndex === draft.processIndex);
      if (matching) draft.selectedAnnotationId = matching.id;
      break;
    }
    case 'pause': {
      draft.paused = true;
      break;
    }
    case 'play': {
      draft.paused = false;
      break;
    }
    case 'select_annotation': {
      const id = typeof payload?.annotationId === 'string' ? payload.annotationId : null;
      const ann = draft.annotations.find((a) => a.id === id);
      if (!ann) return { ok: false, error: 'unknown_annotation', state };
      draft.selectedAnnotationId = ann.id;
      draft.processIndex = ann.processIndex;
      draft.depthHint = draft.processIndex / Math.max(1, draft.processLength - 1);
      break;
    }
    case 'predict': {
      const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
      if (!text || text.includes('\0') || text.length > 2000) return { ok: false, error: 'invalid_prediction', state };
      draft.prediction = text;
      draft.comparison = null;
      break;
    }
    case 'compare': {
      if (!draft.prediction) return { ok: false, error: 'prediction_required', state };
      const outcome = draft.annotations.find((a) => a.processIndex === draft.processLength - 1)?.detail
        ?? draft.annotations[draft.annotations.length - 1]?.detail
        ?? 'Expected outcome is the final process relationship.';
      draft.comparison = `Prediction: ${draft.prediction} | Outcome: ${outcome}`;
      draft.linkedView = 'detail';
      break;
    }
    case 'clear_prediction': {
      draft.prediction = null;
      draft.comparison = null;
      break;
    }
    case 'select_node': {
      const view = payload?.linkedView;
      if (view === 'overview' || view === 'detail' || view === 'timeline') {
        draft.linkedView = view;
        break;
      }
      return { ok: false, error: 'invalid_linked_view', state };
    }
    case 'set_reduced_motion': {
      draft.reducedMotion = typeof payload?.enabled === 'boolean' ? payload.enabled : !draft.reducedMotion;
      if (draft.reducedMotion) draft.paused = true;
      break;
    }
    case 'reset': {
      const reset = createCoordinatedExplorationState(draft.reducedMotion);
      return { ok: true, state: reset, narration: narrationFor(reset) };
    }
    default:
      return { ok: false, error: 'action_not_supported_for_aid', state };
  }
  const next = { ...draft, explanation: explorationExplanation(draft) };
  return { ok: true, state: next, narration: narrationFor(next) };
}

function applyLegibility(state: LegibilityInspectorState, action: ApprovedVisualAction, payload?: Record<string, unknown>): VisualActionResult {
  const next = { ...state };
  switch (action) {
    case 'set_audience_distance': {
      const delta = typeof payload?.delta === 'number' ? payload.delta : 0.5;
      const absolute = typeof payload?.meters === 'number' ? payload.meters : null;
      next.audienceDistanceM = Math.max(0.5, Math.min(30, absolute ?? next.audienceDistanceM + delta));
      break;
    }
    case 'set_text_size_pt': {
      const delta = typeof payload?.delta === 'number' ? payload.delta : 2;
      const absolute = typeof payload?.points === 'number' ? payload.points : null;
      next.textSizePt = Math.max(8, Math.min(96, absolute ?? next.textSizePt + delta));
      break;
    }
    case 'set_contrast_ratio': {
      const delta = typeof payload?.delta === 'number' ? payload.delta : 0.5;
      const absolute = typeof payload?.ratio === 'number' ? payload.ratio : null;
      next.contrastRatio = Math.max(1, Math.min(21, absolute ?? next.contrastRatio + delta));
      break;
    }
    case 'set_camera_yaw': {
      const yaw = typeof payload?.yaw === 'number' ? payload.yaw : next.cameraYaw;
      next.cameraYaw = ((yaw % 360) + 360) % 360;
      break;
    }
    case 'set_active': {
      next.active = Boolean(payload?.active);
      break;
    }
    case 'report_context_lost': {
      next.contextLost = true;
      next.active = false;
      break;
    }
    case 'report_context_restored': {
      next.contextLost = false;
      break;
    }
    case 'set_reduced_motion': {
      next.reducedMotion = typeof payload?.enabled === 'boolean' ? payload.enabled : !next.reducedMotion;
      break;
    }
    case 'reset': {
      const reset = createLegibilityInspectorState({
        reducedMotion: next.reducedMotion,
        webgl2Available: next.webgl2Available
      });
      return { ok: true, state: reset, narration: narrationFor(reset) };
    }
    default:
      return { ok: false, error: 'action_not_supported_for_aid', state };
  }
  const { explanation, textAlternative } = legibilityExplanation(
    next.audienceDistanceM,
    next.textSizePt,
    next.contrastRatio
  );
  next.explanation = explanation;
  next.textAlternative = textAlternative;
  return { ok: true, state: next, narration: narrationFor(next) };
}

/**
 * Apply an approved visual-aid action. Invalid or unsupported actions are rejected
 * without mutating authoritative state. Never executes generated code.
 */
export function applyVisualAction(
  state: VisualAidState,
  action: unknown,
  payload?: Record<string, unknown>
): VisualActionResult {
  if (!isApprovedVisualAction(action)) {
    return { ok: false, error: 'invalid_visual_action', state };
  }
  if (state.kind === 'process_sequence') return applyProcessSequence(state, action, payload);
  if (state.kind === 'coordinated_exploration') return applyExploration(state, action, payload);
  return applyLegibility(state, action, payload);
}

/** Reject tutor payloads that attempt code execution or unapproved actions. */
export function parseTutorVisualAction(input: unknown): VisualTutorActionRequest {
  if (!input || typeof input !== 'object') throw new Error('invalid_tutor_visual_action');
  const body = input as Record<string, unknown>;
  if (typeof body.experimentId !== 'string' || !body.experimentId.trim()) throw new Error('invalid_experiment_id');
  if (!isApprovedVisualAction(body.action)) throw new Error('invalid_visual_action');
  if (body.code !== undefined || body.script !== undefined || body.eval !== undefined || body.generatedCode !== undefined) {
    throw new Error('arbitrary_code_rejected');
  }
  const payload = body.payload === undefined ? undefined : body.payload;
  if (payload !== undefined && (typeof payload !== 'object' || payload === null || Array.isArray(payload))) {
    throw new Error('invalid_action_payload');
  }
  return {
    experimentId: body.experimentId,
    action: body.action,
    payload: payload as Record<string, unknown> | undefined
  };
}

export function visualsPolicyScan(text: string): string[] {
  const hits: string[] = [];
  const lower = text.toLowerCase();
  for (const banned of ['comm 110', 'comm110', 'syllabus', 'assignment rubric', 'pqp curriculum']) {
    if (lower.includes(banned)) hits.push(banned);
  }
  return hits;
}
