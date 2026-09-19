/** Versioned, provider-neutral prepared learning content. No executable model output. */
export const ACTIVITY_KINDS = ['classification', 'ordering', 'recall', 'multiple_choice', 'evidence_matching', 'prediction'] as const;
export type ActivityKind = typeof ACTIVITY_KINDS[number];
export type StudySource = { sourceId: string; revision: number; start: number; end: number; quote: string };
export type ActivityTemplate = {
  schemaVersion: 1; kind: ActivityKind; title: string; prompt: string;
  items: string[]; choices: string[]; answer: string[]; rationale: string;
  rubric: string[]; hints: string[]; sources: StudySource[];
  provenance: { kind: 'user' | 'model'; providerId: string | null; modelId: string | null };
  needsReview: boolean;
};
export type StudyActivity = ActivityTemplate & { id: string; courseId: string; status: 'ready' | 'stale'; createdAt: string };
export type StudyFeedback = { outcome: 'correct' | 'incorrect' | 'needs_review'; score: number | null; message: string; rubric: string[]; authoritativeGrade: false };

export type StudyAttempt = {
  id: string; courseId: string; activityId: string; response: string[]; teachBack: string;
  hintCount: number; revealed: boolean; status: 'draft' | 'submitted'; feedback: StudyFeedback | null;
  version: number; createdAt: string; submittedAt: string | null;
};
export type AttemptView = {
  attempt: StudyAttempt;
  activity: Omit<StudyActivity, 'answer' | 'rationale' | 'hints'>;
  visibleHints: string[]; hintTotal: number;
  solution: { answer: string[]; rationale: string } | null;
};

export type ReviewItem = { activityId: string; title: string; dueAt: string; intervalDays: number; canUndo: boolean };
export type StudyProgress = {
 dailyLimit: number; due: ReviewItem[]; dueTotal: number; remainingToday: number;
 history: StudyAttempt[]; submitted: number; correctUnaided: number; assisted: number; needsReview: number;
 currentActivities: number; staleActivities: number; explanation: string;
};
