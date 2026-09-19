import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import type {
  CoordinatedExplorationState,
  LegibilityInspectorState,
  ProcessSequenceState,
  VisualAidKind,
  VisualExperimentRecord
} from '@collegenotes/domain';
import { LegibilityAidView, explorationSyncSnapshot, sequenceEdges, sequenceNodeLabels } from '@collegenotes/visuals';
import { api } from './client';

type Props = { courseId: string };

export function VisualsWorkspace({ courseId }: Props) {
  const [experiments, setExperiments] = useState<VisualExperimentRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [narration, setNarration] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [predictionDraft, setPredictionDraft] = useState('');
  const [exportJson, setExportJson] = useState<string | null>(null);

  const active = experiments.find((e) => e.id === activeId) ?? experiments[0] ?? null;

  const refresh = useCallback(async () => {
    const list = await api.visuals.experiments(courseId);
    setExperiments(list);
    setActiveId((prev) => (prev && list.some((e) => e.id === prev) ? prev : list[0]?.id ?? null));
  }, [courseId]);

  useEffect(() => {
    void refresh().catch((e) => setNotice(e instanceof Error ? e.message : 'Failed to load visuals'));
  }, [refresh]);

  async function createAid(kind: VisualAidKind) {
    setNotice(null);
    try {
      const created = await api.visuals.createExperiment(courseId, {
        kind,
        webgl2Available: kind === 'legibility_inspector'
      });
      await refresh();
      setActiveId(created.id);
      setNarration(`${created.state.explanation.title}. ${created.state.explanation.body}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function runAction(action: string, payload?: Record<string, unknown>) {
    if (!active) return;
    setNotice(null);
    try {
      const result = await api.visuals.action(courseId, active.id, { action, payload });
      setNarration(result.narration);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Action rejected');
    }
  }

  async function onKeyDown(e: KeyboardEvent) {
    if (!active) return;
    const binding = active.state.keyboard.find((k) => k.key === e.key || (k.key === ' ' && e.key === ' '));
    if (!binding) return;
    e.preventDefault();
    const payload =
      binding.action === 'scrub'
        ? { delta: e.key === 'ArrowLeft' ? -1 : 1 }
        : binding.action === 'set_audience_distance'
          ? { delta: e.key === 'ArrowUp' ? 0.5 : -0.5 }
          : binding.action === 'set_text_size_pt'
            ? { delta: e.key === ']' ? 2 : -2 }
            : binding.action === 'set_contrast_ratio'
              ? { delta: e.key === '+' || e.key === '=' ? 0.5 : -0.5 }
              : binding.action === 'pause'
                ? undefined
                : binding.action === 'predict'
                  ? { text: predictionDraft || 'Learner prediction' }
                  : undefined;
    if (binding.action === 'pause' && active.state.kind === 'coordinated_exploration') {
      await runAction(active.state.paused ? 'play' : 'pause');
      return;
    }
    await runAction(binding.action, payload);
  }

  async function exportRecords() {
    try {
      const exported = await api.visuals.export(courseId);
      setExportJson(JSON.stringify(exported, null, 2));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Export failed');
    }
  }

  const sequence = active?.state.kind === 'process_sequence' ? (active.state as ProcessSequenceState) : null;
  const exploration = active?.state.kind === 'coordinated_exploration' ? (active.state as CoordinatedExplorationState) : null;
  const legibility = active?.state.kind === 'legibility_inspector' ? (active.state as LegibilityInspectorState) : null;

  return (
    <section className="glass glass-card" data-card="visuals" tabIndex={0} onKeyDown={(e) => void onKeyDown(e)}>
      <h1>Subject visuals</h1>
      <p>Optional course-neutral instructional aids. Background links explain the aid, but are not evidence from your imported course material. Decorative shell glass is separate from these experiments.</p>
      {notice ? <p role="status">{notice}</p> : null}
      <div>
        <button type="button" onClick={() => void createAid('process_sequence')}>Start process sequence</button>
        <button type="button" onClick={() => void createAid('coordinated_exploration')}>Start coordinated exploration</button>
        <button type="button" onClick={() => void createAid('legibility_inspector')}>Start legibility inspector</button>
      </div>
      {experiments.length > 1 ? (
        <label>
          Active experiment
          <select value={active?.id ?? ''} onChange={(e) => setActiveId(e.target.value)}>
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>{exp.title} ({exp.kind})</option>
            ))}
          </select>
        </label>
      ) : null}

      {sequence ? (
        <div data-aid="process_sequence">
          <h2>Process sequence</h2>
          <p aria-live="polite">{sequence.explanation.body} ({sequence.explanation.units})</p>
          <ol>
            {sequenceNodeLabels(sequence).map((node) => (
              <li key={node.id}>
                <button type="button" aria-current={node.selected ? 'step' : undefined} onClick={() => void runAction('select_node', { nodeId: node.id })}>
                  {node.label} · {node.units}
                </button>
              </li>
            ))}
          </ol>
          <p>Edges: {sequenceEdges(sequence).map((e) => `${e.from}→${e.to}`).join(', ')}</p>
          <button type="button" onClick={() => void runAction('step_prev')}>Previous</button>
          <button type="button" onClick={() => void runAction('step_next')}>Next</button>
          <button type="button" onClick={() => void runAction('reset')}>Reset</button>
          <ul>
            {sequence.sources.map((s) => (
              <li key={s.id}><a href={s.url} rel="noreferrer">{s.label}</a></li>
            ))}
          </ul>
        </div>
      ) : null}

      {exploration ? (
        <div data-aid="coordinated_exploration">
          <h2>Coordinated exploration</h2>
          <p aria-live="polite">{exploration.explanation.body}</p>
          <p>Synced views: {JSON.stringify(explorationSyncSnapshot(exploration))}</p>
          <label>
            Process scrub
            <input
              type="range"
              min={0}
              max={exploration.processLength - 1}
              value={exploration.processIndex}
              onChange={(e) => void runAction('scrub', { index: Number(e.target.value) })}
            />
          </label>
          <button type="button" onClick={() => void runAction(exploration.paused ? 'play' : 'pause')}>
            {exploration.paused ? 'Play' : 'Pause'}
          </button>
          <div>
            {exploration.annotations.map((ann) => (
              <button key={ann.id} type="button" onClick={() => void runAction('select_annotation', { annotationId: ann.id })}>
                {ann.label}
              </button>
            ))}
          </div>
          <label>
            Prediction
            <input value={predictionDraft} onChange={(e) => setPredictionDraft(e.target.value)} />
          </label>
          <button type="button" onClick={() => void runAction('predict', { text: predictionDraft })}>Save prediction</button>
          <button type="button" onClick={() => void runAction('compare')}>Compare</button>
          {exploration.comparison ? <p>{exploration.comparison}</p> : null}
          <button type="button" onClick={() => void runAction('select_node', { linkedView: 'overview' })}>Overview</button>
          <button type="button" onClick={() => void runAction('select_node', { linkedView: 'detail' })}>Detail</button>
          <button type="button" onClick={() => void runAction('select_node', { linkedView: 'timeline' })}>Timeline</button>
        </div>
      ) : null}

      {legibility ? (
        <div data-aid="legibility_inspector">
          <h2>Audience-view legibility inspector</h2>
          <LegibilityAidView
            state={legibility}
            onContextLost={() => void runAction('report_context_lost')}
            onContextRestored={() => void runAction('report_context_restored')}
          />
          <label>
            Distance (m)
            <input
              type="range"
              min={0.5}
              max={30}
              step={0.5}
              value={legibility.audienceDistanceM}
              onChange={(e) => void runAction('set_audience_distance', { meters: Number(e.target.value) })}
            />
          </label>
          <label>
            Text size (pt)
            <input
              type="range"
              min={8}
              max={96}
              step={1}
              value={legibility.textSizePt}
              onChange={(e) => void runAction('set_text_size_pt', { points: Number(e.target.value) })}
            />
          </label>
          <label>
            Contrast ratio
            <input
              type="range"
              min={1}
              max={21}
              step={0.1}
              value={legibility.contrastRatio}
              onChange={(e) => void runAction('set_contrast_ratio', { ratio: Number(e.target.value) })}
            />
          </label>
          <button type="button" onClick={() => void runAction('set_active', { active: !legibility.active })}>
            {legibility.active ? 'Stop rendering' : 'Activate rendering'}
          </button>
          <button type="button" onClick={() => void runAction('reset')}>Reset</button>
        </div>
      ) : null}

      {narration ? <p aria-live="polite"><strong>Narration:</strong> {narration}</p> : null}
      <button type="button" onClick={() => void exportRecords()}>Export visual experiments</button>
      {exportJson ? <pre>{exportJson}</pre> : null}
    </section>
  );
}
