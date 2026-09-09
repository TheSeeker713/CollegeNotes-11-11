# Architecture and data flow

Chrome → loopback Fastify companion → versioned domain/storage interfaces → authoritative SQLite database plus immutable original files in separate user-local application data. Browser IndexedDB/cache stores rebuildable prepared views, not the only copy of learning data. Service worker serves prepared shell/assets; distinguish browser-only cached availability from full local-service availability.

Import flow: course-scoped input → checksum/original preservation → background parser/OCR job → source anchors and extraction revision → user correction/verification → retrieval and structured study data. Failures retain originals; jobs cancel/retry without duplicate work. SQLite transactions commit metadata consistently with staged file moves and crash recovery. OCR/rendering cannot block the UI/service event loop.

Tutor flow: explicit user action → selected-course FTS5 retrieval → bounded passages/anchors plus course policy → provider adapter → schema-validated output → source-grounding checks → labeled explanation/activity. Incoming documents are data, never commands. Deny arbitrary tool execution, shell/file mutations and inherited integrations in the tutor process; use restricted process/workspace credentials and a tool allowlist. Prove isolation with negative cases in Phase 8; a read-only sandbox alone does not mean no command execution. The app validates actions before invoking a module.

Audio flow: verified extracted text → narration adapter → audio asset keyed by source revision/voice/settings → local playback and sentence anchors. Microphone requires explicit start/stop; recognition remains editable; spoken questions use the same tutor boundary. Interruption stores and restores passage/audio position. Offline capabilities are enumerated in providers.md; unprepared work remains unavailable or queued, never falsely completed.

Entities: Course, Term, Requirement, SourceDocument, SourceVersion, SourceAnchor, ExtractionRevision, Annotation, StudyActivity, Attempt, ReviewSchedule, StudySession, AudioAsset, Recording, ProviderConfiguration, OfflinePack, ModuleRegistration. IDs and schemas are versioned; cross-course access is explicit. Corrections mark dependent derivatives stale. Conflicting announcements retain both versions for user resolution.

Modules consume domain interfaces; they cannot mutate another module's tables. Save exact drafts/positions/actions independently of narration and 3D. A visual aid declares inputs, correct state/calculation, conventional and keyboard controls, source evidence, serializable state and non-graphics alternative. Ordinary text remains outside canvases.

Security boundaries: bind loopback, validate Origin/Host and per-session request authority, reject path traversal and symlink escapes, constrain archives/resource sizes, disable EPUB active content and remote resource fetches, avoid unsanitized DOCX HTML. Credentials remain in approved local credential storage, never Git/browser/logs. Public repository excludes course data and detailed environment evidence.

Backups export a versioned manifest, records, originals, source versions and chosen audio/media with checksums; exclude credentials and optionally large models. Restore previews conflicts, validates paths/hashes/schema, stages changes and preserves existing data on interruption. Git is not a private-data backup.
