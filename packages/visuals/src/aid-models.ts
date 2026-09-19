import type { ProcessSequenceState, CoordinatedExplorationState } from '@collegenotes/domain';

/** Pure 2D sequence diagram model — labels and units come from authoritative state. */
export function sequenceNodeLabels(state: ProcessSequenceState): Array<{ id: string; label: string; selected: boolean; units: string }> {
  return state.steps.map((step, index) => ({
    id: step.id,
    label: step.label,
    selected: state.selectedNodeId === step.id || state.stepIndex === index,
    units: `step ${index + 1} of ${state.steps.length}`
  }));
}

export function sequenceEdges(state: ProcessSequenceState): Array<{ from: string; to: string }> {
  return state.steps
    .filter((s) => s.relatesTo)
    .map((s) => ({ from: s.id, to: s.relatesTo! }));
}

export function explorationSyncSnapshot(state: CoordinatedExplorationState): {
  processIndex: number;
  linkedView: CoordinatedExplorationState['linkedView'];
  annotationId: string | null;
  paused: boolean;
  depthHint: number;
} {
  return {
    processIndex: state.processIndex,
    linkedView: state.linkedView,
    annotationId: state.selectedAnnotationId,
    paused: state.paused,
    depthHint: state.depthHint
  };
}
