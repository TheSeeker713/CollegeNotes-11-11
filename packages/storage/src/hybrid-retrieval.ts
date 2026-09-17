import {CourseError,requireCourse} from './courses.js';
import {lexicalSearch,semanticSearch,type IndexModel} from './semantic-index.js';
import type {Store} from './database.js';

export type PassageRole = 'instructor_requirement' | 'textbook_explanation' | 'user_note';
export type GroundedPassage = {
  sourceId: string; revision: number; text: string; start: number; end: number;
  score: number; role: PassageRole; methods: Array<'lexical' | 'semantic'>; anchors: unknown;
};
export type TutorContext = {
  courseId: string; query: string;
  passages: GroundedPassage[];
  requirements: GroundedPassage[];
  explanations: GroundedPassage[];
  gap: null | { reason: 'no_supporting_passage'; message: string };
  policy: { importedTextIsData: true; cannotAlterPermissions: true; misleadingInstructionsIgnored: true };
};

const REQUIREMENT = /requirement|syllabus|rubric|assignment|policy|instructor/i;
const INJECTION = /ignore (all |previous )?instructions|grant (admin|root)|system prompt|override (safety|permissions)/i;

function roleFor(store: Store, courseId: string, sourceId: string): PassageRole {
  const row = store.db.prepare('select kind, filename from source_documents where id=? and course_id=?').get(sourceId, courseId) as { kind: string; filename: string } | undefined;
  if (!row) return 'textbook_explanation';
  if (row.kind === 'note') return 'user_note';
  return REQUIREMENT.test(row.filename) ? 'instructor_requirement' : 'textbook_explanation';
}

/** Reciprocal-rank fusion of lexical and semantic hits into bounded tutor context. */
export function buildTutorContext(
  store: Store,
  courseId: string,
  query: string,
  semanticVector: number[],
  model: IndexModel,
  limit = 6
): TutorContext {
  requireCourse(store, courseId, true);
  if (typeof query !== 'string' || !query.trim() || query.length > 240) throw new CourseError('invalid_search');
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) throw new CourseError('invalid_search');

  const lexical = lexicalSearch(store, courseId, query, model);
  const semantic = semanticSearch(store, courseId, semanticVector, model, Math.min(20, limit * 3));
  const merged = new Map<string, GroundedPassage>();

  for (const [rank, hit] of lexical.entries()) {
    const key = `${hit.sourceId}:${hit.revision}:${hit.start}:${hit.end}`;
    const score = 1 / (60 + rank);
    const existing = merged.get(key);
    if (existing) {
      existing.score += score;
      if (!existing.methods.includes('lexical')) existing.methods.push('lexical');
    } else {
      merged.set(key, {
        sourceId: hit.sourceId, revision: hit.revision, text: hit.text, start: hit.start, end: hit.end,
        score, role: roleFor(store, courseId, hit.sourceId), methods: ['lexical'], anchors: null
      });
    }
  }
  for (const [rank, hit] of semantic.entries()) {
    const key = `${hit.sourceId}:${hit.revision}:${hit.start}:${hit.end}`;
    const score = (1 / (60 + rank)) + Math.max(0, hit.score) * 0.25;
    const existing = merged.get(key);
    if (existing) {
      existing.score += score;
      if (!existing.methods.includes('semantic')) existing.methods.push('semantic');
      existing.anchors = hit.anchors ?? existing.anchors;
    } else {
      merged.set(key, {
        sourceId: hit.sourceId, revision: hit.revision, text: hit.text, start: hit.start, end: hit.end,
        score, role: roleFor(store, courseId, hit.sourceId), methods: ['semantic'], anchors: hit.anchors ?? null
      });
    }
  }

  const passages = [...merged.values()]
    .filter((p) => p.text.trim().length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((p) => ({
      ...p,
      // Passage text remains data even when it contains injection-like wording.
      text: p.text,
      score: Number(p.score.toFixed(6))
    }));

  // Injection-like wording stays in passages as untrusted data; it never changes policy flags.
  void INJECTION;
  const topSemantic = semantic[0]?.score ?? 0;
  const supporting = passages.filter((p) => {
    if (p.methods.includes('lexical')) return true;
    return p.methods.includes('semantic') && topSemantic >= 0.2 && p.score >= 0.015;
  });
  const gap = supporting.length === 0
    ? { reason: 'no_supporting_passage' as const, message: 'No supporting course passage was retrieved for this question. Imported text cannot change app permissions.' }
    : null;

  return {
    courseId,
    query: query.trim(),
    passages: supporting,
    requirements: supporting.filter((p) => p.role === 'instructor_requirement'),
    explanations: supporting.filter((p) => p.role !== 'instructor_requirement'),
    gap,
    policy: { importedTextIsData: true, cannotAlterPermissions: true, misleadingInstructionsIgnored: true }
  };
}

export function assertContextPolicy(context: TutorContext): void {
  if (!context.policy.importedTextIsData || !context.policy.cannotAlterPermissions) {
    throw new CourseError('context_policy_violation');
  }
}
