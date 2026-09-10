import type { SourceDocument } from './entities.js';

export type Material = SourceDocument & {
  kind: 'imported' | 'note'; revision: number; updatedAt: string;
  trashedAt: string | null; deletedAt: string | null;
  cleanupState: 'none' | 'pending' | 'failed' | 'complete';
};
export type SourceAnchor = { type: 'page' | 'paragraph' | 'region' | 'epub'; locator: string };
export type MaterialRevision = { sourceId: string; courseId: string; revision: number; text: string; anchors: SourceAnchor[]; createdAt: string; author: 'user' | 'extraction' };
export type Derivative = { id: string; courseId: string; sourceId: string; sourceRevision: number; kind: 'lexical' | 'embedding' | 'activity' | 'audio'; status: 'ready' | 'stale'; modelVersion: string | null };
export type CourseModule = { courseId: string; moduleId: string; schemaVersion: number; enabled: boolean };
export type ExportRequest = { scope: 'item' | 'selection' | 'course' | 'backup'; courseId: string | null; sourceIds: string[]; includeOriginals: boolean; includeRevisions: boolean; includeDerivatives: boolean; excludeCredentials: true };
export type DeletionRequest = { courseId: string; sourceIds: string[]; mode: 'trash' | 'permanent'; recoverUntil: string | null; backupsDisclosureAcknowledged: boolean; status: 'pending' | 'failed' | 'complete' };
export type EmbeddingIndexMetadata = { id: string; courseId: string; modelId: string; modelVersion: string; weightsChecksum: string; status: 'not_prepared' | 'building' | 'ready' | 'stale' | 'failed'; sourceRevisions: Record<string, number>; rebuildReason: string | null };
export type ResearchSession = { id: string; courseId: string; providerId: string; connectionId: string | null; query: string; createdAt: string; initiatedBy: 'user'; sharedContext: Array<{ sourceId: string; revision: number; category: 'extracted_text' | 'user_note' }>; status: 'draft' | 'running' | 'complete' | 'cancelled' | 'failed'; deletedAt: string | null };
export type ResearchSource = { id: string; sessionId: string; courseId: string; url: string; title: string; publisher: string | null; author: string | null; retrievedAt: string; excerpt: string; claimIds: string[]; conflicts: string[]; uncertainty: string | null; access: 'available' | 'inaccessible' };

/** A stale, trashed, deleted, wrong-course or wrong-model derivative cannot supply context. */
export function derivativeEligible(material: Material, derivative: Derivative, courseId: string, modelVersion?: string): boolean {
  return material.courseId === courseId && derivative.courseId === courseId && derivative.sourceId === material.id &&
    material.trashedAt === null && material.deletedAt === null && material.cleanupState === 'none' &&
    derivative.sourceRevision === material.revision && derivative.status === 'ready' &&
    (derivative.kind !== 'embedding' || (modelVersion !== undefined && derivative.modelVersion === modelVersion));
}
