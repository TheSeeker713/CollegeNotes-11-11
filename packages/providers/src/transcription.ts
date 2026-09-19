import { createHash } from 'node:crypto';
import type { RecognitionTranscript } from '@collegenotes/domain';
import { applyTermCorrections } from '@collegenotes/domain';

/** Offline synthetic STT. Never downloads models; returns editable transcripts for contracts. */
export type TranscriptionRequest = {
  courseId: string;
  audioHint?: string;
  expectedText?: string;
  terms?: Array<{ from: string; to: string }>;
};

export type TranscriptionResult = {
  providerId: 'local';
  modelId: 'synthetic-stt';
  rawText: string;
  editedText: string;
  costUsd: 0;
  downloadedBytes: 0;
};

export function synthesizeOfflineTranscript(input: TranscriptionRequest): TranscriptionResult {
  const raw = (input.expectedText ?? input.audioHint ?? '').trim() || 'synthetic recognition placeholder';
  if (raw.length > 20_000 || raw.includes('\0')) throw new Error('invalid_recognition_text');
  const edited = applyTermCorrections(raw, input.terms ?? []);
  return { providerId: 'local', modelId: 'synthetic-stt', rawText: raw, editedText: edited, costUsd: 0, downloadedBytes: 0 };
}

export function recognitionFingerprint(courseId: string, rawText: string): string {
  return createHash('sha256').update(`${courseId}\0${rawText}`).digest('hex').slice(0, 24);
}

export function draftRecognition(courseId: string, result: TranscriptionResult, id: string, now = new Date().toISOString()): RecognitionTranscript {
  return {
    id,
    courseId,
    rawText: result.rawText,
    editedText: result.editedText,
    terms: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now
  };
}
