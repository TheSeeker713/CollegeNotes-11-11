/** Narration, listening and voice contracts. Audio files stay on the local data directory. */

export type VoiceProfile = {
  id: string;
  name: string;
  language: string;
  locale: string | null;
  quality: 'compact' | 'enhanced' | 'premium' | 'unknown';
  providerId: string;
};

export type SentenceAnchor = {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  startMs: number;
  endMs: number;
};

export type NarrationSettings = {
  voiceId: string;
  rate: number;
  sampleRate: 22050;
  format: 'LEF32@22050';
};

export type NarrationAsset = {
  id: string;
  courseId: string;
  sourceId: string;
  sourceRevision: number;
  voiceId: string;
  settingsHash: string;
  textHash: string;
  relPath: string;
  durationMs: number;
  byteLength: number;
  anchors: SentenceAnchor[];
  providerId: string;
  status: 'ready' | 'stale' | 'failed';
  createdAt: string;
};

export type NarrationPlaybackState = {
  courseId: string;
  assetId: string;
  offsetMs: number;
  speed: number;
  bookmarks: Array<{ label: string; offsetMs: number }>;
  updatedAt: string;
};

export type MicPermission = 'unknown' | 'granted' | 'denied' | 'revoked' | 'missing_device';

export type RecognitionTranscript = {
  id: string;
  courseId: string;
  rawText: string;
  editedText: string;
  terms: Array<{ from: string; to: string }>;
  status: 'draft' | 'final';
  createdAt: string;
  updatedAt: string;
};

export type VoiceInterruptSession = {
  id: string;
  courseId: string;
  assetId: string;
  savedOffsetMs: number;
  tutorRequestId: string | null;
  echoSuppressed: boolean;
  status: 'interrupted' | 'asking' | 'resumed' | 'cancelled' | 'failed';
  createdAt: string;
  updatedAt: string;
};

export function splitSentences(text: string): Array<{ text: string; charStart: number; charEnd: number }> {
  const results: Array<{ text: string; charStart: number; charEnd: number }> = [];
  const pattern = /[^.!?…]+[.!?…]+|[^.!?…]+$/g;
  for (const match of text.matchAll(pattern)) {
    const raw = match[0] ?? '';
    const leading = raw.match(/^\s*/)?.[0].length ?? 0;
    const trailing = raw.match(/\s*$/)?.[0].length ?? 0;
    const charStart = (match.index ?? 0) + leading;
    const charEnd = (match.index ?? 0) + raw.length - trailing;
    const slice = text.slice(charStart, charEnd);
    if (slice.trim()) results.push({ text: slice, charStart, charEnd });
  }
  if (!results.length && text.trim()) results.push({ text: text.trim(), charStart: text.search(/\S/), charEnd: text.length });
  return results;
}

export function estimateSentenceTiming(sentences: Array<{ text: string; charStart: number; charEnd: number }>, durationMs: number): SentenceAnchor[] {
  const weights = sentences.map((s) => Math.max(1, s.text.replace(/\s+/g, ' ').trim().length));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let cursor = 0;
  return sentences.map((s, index) => {
    const share = Math.max(1, Math.round((weights[index]! / total) * durationMs));
    const startMs = cursor;
    const endMs = index === sentences.length - 1 ? durationMs : Math.min(durationMs, cursor + share);
    cursor = endMs;
    return { index, text: s.text, charStart: s.charStart, charEnd: s.charEnd, startMs, endMs };
  });
}

export function applyTermCorrections(text: string, terms: Array<{ from: string; to: string }>): string {
  let next = text;
  for (const term of terms) {
    if (!term.from.trim()) continue;
    const escaped = term.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), term.to);
  }
  return next;
}
