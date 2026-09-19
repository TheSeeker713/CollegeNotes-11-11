/** Course-neutral presentation practice contracts. No class-specific curriculum is embedded. */

export const FEEDBACK_CATEGORIES = ['praise', 'question', 'polish'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const PRACTICE_MEDIA_KINDS = ['audio', 'video'] as const;
export type PracticeMediaKind = (typeof PRACTICE_MEDIA_KINDS)[number];

export const SUPPORTED_PRACTICE_MIME: Record<string, PracticeMediaKind> = {
  'audio/wav': 'audio',
  'audio/wave': 'audio',
  'audio/x-wav': 'audio',
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
  'audio/mp4': 'audio',
  'audio/aac': 'audio',
  'audio/ogg': 'audio',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video'
};

export const SUPPORTED_PRACTICE_EXTENSIONS: Record<string, PracticeMediaKind> = {
  '.wav': 'audio',
  '.mp3': 'audio',
  '.m4a': 'audio',
  '.aac': 'audio',
  '.ogg': 'audio',
  '.mp4': 'video',
  '.webm': 'video',
  '.mov': 'video'
};

export type PracticeObservation = {
  id: string;
  courseId: string;
  category: FeedbackCategory;
  body: string;
  wordCount: number;
  rationale: string;
  mediaId: string | null;
  timestampMs: number | null;
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;
};

export type PracticeMedia = {
  id: string;
  courseId: string;
  filename: string;
  mimeType: string;
  kind: PracticeMediaKind;
  relPath: string;
  durationMs: number | null;
  byteLength: number;
  createdAt: string;
};

export type PracticeTranscriptSegment = {
  index: number;
  text: string;
  startMs: number;
  endMs: number;
};

export type PracticeTranscript = {
  id: string;
  courseId: string;
  mediaId: string;
  segments: PracticeTranscriptSegment[];
  rawText: string;
  editedText: string;
  seekMs: number;
  createdAt: string;
  updatedAt: string;
};

export type PracticeAnnotation = {
  id: string;
  courseId: string;
  mediaId: string;
  offsetMs: number;
  body: string;
  observationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PracticeCueCard = {
  id: string;
  courseId: string;
  order: number;
  title: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PracticeRehearsal = {
  id: string;
  courseId: string;
  status: 'idle' | 'recording' | 'stopped' | 'cancelled';
  startedAt: string | null;
  endedAt: string | null;
  elapsedMs: number;
  cueIndex: number;
  mediaId: string | null;
  /** Null means the course did not supply a speech duration — never invent one. */
  configuredDurationMs: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PracticeChecklistItem = {
  id: string;
  courseId: string;
  label: string;
  done: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type PracticeHistoryEntry = {
  id: string;
  courseId: string;
  kind: 'observation' | 'rehearsal' | 'checklist';
  refId: string;
  summary: string;
  practiceStatus: 'draft' | 'complete' | 'cancelled';
  /** Only present when the user supplied assignment status; never invented. */
  assignmentStatus: string | null;
  createdAt: string;
};

export type PracticeSlideInspection = {
  width: number;
  height: number;
  fontSizePx: number;
  lineCount: number;
  maxCharsPerLine: number;
  clipped: boolean;
  reflowNeeded: boolean;
  notes: string;
};

export type PracticeExportRecord = {
  format: 'collegenotes-practice';
  schemaVersion: 1;
  courseId: string;
  observations: PracticeObservation[];
  cues: PracticeCueCard[];
  rehearsals: PracticeRehearsal[];
  checklist: PracticeChecklistItem[];
  history: PracticeHistoryEntry[];
  transcripts: PracticeTranscript[];
  annotations: PracticeAnnotation[];
};

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === 'string' && (FEEDBACK_CATEGORIES as readonly string[]).includes(value);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Question category requires a real question mark or clear interrogative form. */
export function isActualQuestion(text: string): boolean {
  const body = text.trim();
  if (!body) return false;
  if (body.includes('?')) return true;
  return /^(who|what|when|where|why|how|which|whose|whom|is|are|was|were|do|does|did|can|could|would|should|will|may|might)\b/i.test(body);
}

export function resolvePracticeMediaKind(filename: string, mimeType?: string): PracticeMediaKind | null {
  const mime = (mimeType ?? '').toLowerCase().trim();
  if (mime && SUPPORTED_PRACTICE_MIME[mime]) return SUPPORTED_PRACTICE_MIME[mime]!;
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0) return null;
  return SUPPORTED_PRACTICE_EXTENSIONS[lower.slice(dot)] ?? null;
}

/**
 * Audio alone cannot prove visual delivery (eye contact, gesture, slide pointing).
 * Returns a refusal reason when a claim is unsupported for the media kind.
 */
export function refuseVisualDeliveryClaim(kind: PracticeMediaKind, claim: string): string | null {
  const text = claim.trim().toLowerCase();
  if (!text) return null;
  const visualSignals = [
    'eye contact',
    'gesture',
    'gestures',
    'body language',
    'posture',
    'facial expression',
    'slide pointing',
    'visual delivery',
    'looked at the audience',
    'hand movement'
  ];
  if (kind === 'audio' && visualSignals.some((s) => text.includes(s))) {
    return 'audio_cannot_prove_visual_delivery';
  }
  return null;
}

export function inspectSlideReadability(input: {
  width: number;
  height: number;
  fontSizePx: number;
  lineCount: number;
  maxCharsPerLine: number;
  content: string;
}): PracticeSlideInspection {
  const width = Math.max(1, Math.floor(input.width));
  const height = Math.max(1, Math.floor(input.height));
  const fontSizePx = Math.max(1, Math.floor(input.fontSizePx));
  const lineCount = Math.max(0, Math.floor(input.lineCount));
  const maxCharsPerLine = Math.max(1, Math.floor(input.maxCharsPerLine));
  const content = input.content;
  const approxCharsFit = Math.floor(width / Math.max(1, fontSizePx * 0.55));
  const approxLinesFit = Math.floor(height / Math.max(1, fontSizePx * 1.35));
  const clipped = maxCharsPerLine > approxCharsFit || lineCount > approxLinesFit || content.length > approxCharsFit * approxLinesFit;
  const reflowNeeded = clipped || maxCharsPerLine > 48 || fontSizePx < 14;
  return {
    width,
    height,
    fontSizePx,
    lineCount,
    maxCharsPerLine,
    clipped,
    reflowNeeded,
    notes: content
  };
}

export type ObservationInput = {
  category: FeedbackCategory;
  body: string;
  rationale?: string;
  mediaId?: string | null;
  timestampMs?: number | null;
  status?: 'draft' | 'submitted';
};

export function parseObservationInput(input: unknown): ObservationInput {
  if (!input || typeof input !== 'object') throw new Error('invalid_observation');
  const body = input as Record<string, unknown>;
  if (!isFeedbackCategory(body.category)) throw new Error('invalid_feedback_category');
  if (typeof body.body !== 'string' || body.body.includes('\0') || body.body.length > 20000) throw new Error('invalid_observation_body');
  const rationale = body.rationale === undefined || body.rationale === null ? '' : body.rationale;
  if (typeof rationale !== 'string' || rationale.includes('\0') || rationale.length > 10000) throw new Error('invalid_observation_rationale');
  const status = body.status === undefined ? 'draft' : body.status;
  if (status !== 'draft' && status !== 'submitted') throw new Error('invalid_observation_status');
  if (status === 'submitted' && body.category === 'question' && !isActualQuestion(body.body)) {
    throw new Error('question_requires_interrogative');
  }
  if (status === 'submitted' && !body.body.trim()) throw new Error('observation_body_required');
  let mediaId: string | null = null;
  if (body.mediaId !== undefined && body.mediaId !== null) {
    if (typeof body.mediaId !== 'string' || !body.mediaId.trim()) throw new Error('invalid_media_id');
    mediaId = body.mediaId;
  }
  let timestampMs: number | null = null;
  if (body.timestampMs !== undefined && body.timestampMs !== null) {
    const n = Number(body.timestampMs);
    if (!Number.isFinite(n) || n < 0) throw new Error('invalid_timestamp_ms');
    timestampMs = Math.floor(n);
  }
  return { category: body.category, body: body.body, rationale, mediaId, timestampMs, status };
}

/** Category/rationale fixtures for synthetic tests — no course curriculum text. */
export const SYNTHETIC_FEEDBACK_FIXTURES: Array<{ category: FeedbackCategory; body: string; rationale: string }> = [
  { category: 'praise', body: 'Clear opening that stated the topic in the first sentence.', rationale: 'Opening clarity' },
  { category: 'question', body: 'How does this example connect to the earlier claim?', rationale: 'Need a clarifying question' },
  { category: 'polish', body: 'Tighten the transition between the second and third points.', rationale: 'Flow polish' }
];
