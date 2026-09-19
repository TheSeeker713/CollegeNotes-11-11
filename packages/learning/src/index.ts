import { ACTIVITY_KINDS, createId, type ActivityTemplate, type StudyFeedback } from '@collegenotes/domain';
export type Attempt = { id: string; activityId: string; draft: string; submitted: boolean };
export function newAttempt(activityId: string): Attempt {
  return { id: createId('att'), activityId, draft: '', submitted: false };
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid_activity');
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 10000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\0')) throw Error('invalid_activity_text');
  return value;
}
function strings(value: unknown, min: number, max = 30): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw Error('invalid_activity_list');
  return value.map(v => text(v, 2000));
}
export function parseActivity(value: unknown): ActivityTemplate {
  const v = record(value);
  if (v.schemaVersion !== 1 || !ACTIVITY_KINDS.includes(v.kind as ActivityTemplate['kind']) || typeof v.needsReview !== 'boolean') throw Error('invalid_activity_schema');
  const kind = v.kind as ActivityTemplate['kind'];
  const items = strings(v.items, 0), choices = strings(v.choices, 0), answer = strings(v.answer, 1);
  if (new Set(items).size !== items.length || new Set(choices).size !== choices.length) throw Error('duplicate_activity_options');
  if (kind === 'multiple_choice' && (items.length || choices.length < 2 || answer.length !== 1 || !choices.includes(answer[0]!))) throw Error('invalid_choice_answer');
  if (kind === 'ordering' && (items.length < 2 || choices.length || answer.length !== items.length || new Set(answer).size !== items.length || answer.some(a => !items.includes(a)))) throw Error('invalid_order_answer');
  if (['classification', 'evidence_matching'].includes(kind) && (items.length < 1 || choices.length < 2 || answer.length !== items.length || answer.some(a => !choices.includes(a)))) throw Error('invalid_matching_answer');
  if (['recall', 'prediction'].includes(kind) && (items.length || choices.length || answer.length !== 1)) throw Error('invalid_text_answer');
  if (!Array.isArray(v.sources) || !v.sources.length || v.sources.length > 10) throw Error('activity_sources_required');
  const sources = v.sources.map(raw => {
    const s = record(raw);
    if (!Number.isSafeInteger(s.revision) || Number(s.revision) < 1 || !Number.isSafeInteger(s.start) || !Number.isSafeInteger(s.end) || Number(s.start) < 0 || Number(s.end) <= Number(s.start)) throw Error('invalid_activity_anchor');
    return { sourceId: text(s.sourceId, 200), revision: Number(s.revision), start: Number(s.start), end: Number(s.end), quote: text(s.quote, 20000) };
  });
  const p = record(v.provenance);
  if (p.kind !== 'user' && p.kind !== 'model') throw Error('invalid_activity_provenance');
  const provenance: ActivityTemplate['provenance'] = p.kind === 'user' ? { kind: 'user', providerId: null, modelId: null } : { kind: 'model', providerId: text(p.providerId, 200), modelId: text(p.modelId, 200) };
  return { schemaVersion: 1, kind, title: text(v.title, 200), prompt: text(v.prompt), items, choices, answer,
    rationale: text(v.rationale), rubric: strings(v.rubric, 1, 10), hints: strings(v.hints, 0, 5), sources, provenance, needsReview: v.needsReview };
}
export function scoreActivity(activity: ActivityTemplate, response: string[]): StudyFeedback {
  if (!Array.isArray(response) || response.length !== activity.answer.length || response.some(r => typeof r !== 'string' || !r.trim() || r.length > 10000)) throw Error('invalid_study_response');
  const manual = activity.needsReview || activity.kind === 'prediction' || activity.kind === 'recall';
  if (manual) return { outcome: 'needs_review', score: null, message: 'Compare your explanation with the rubric and source. This is not an authoritative grade.', rubric: activity.rubric, authoritativeGrade: false };
  const score = response.filter((r, i) => r === activity.answer[i]).length / activity.answer.length;
  return { outcome: score === 1 ? 'correct' : 'incorrect', score, message: score === 1 ? 'Matches the prepared answer.' : 'Review the rationale and try a fresh attempt.', rubric: activity.rubric, authoritativeGrade: false };
}

/** UTC elapsed-day spacing avoids DST/nonexistent local-time ambiguity. */
export function nextReview(now: string, previousDays: number, feedback: StudyFeedback, assisted: boolean) {
  const time = Date.parse(now);
  if (!Number.isFinite(time) || !Number.isInteger(previousDays) || previousDays < 0) throw Error('invalid_review_clock');
  const intervalDays = feedback.outcome === 'correct' && !assisted ? Math.min(60, Math.max(1, previousDays * 2)) : 1;
  return { intervalDays, dueAt: new Date(time + intervalDays * 86400000).toISOString() };
}
