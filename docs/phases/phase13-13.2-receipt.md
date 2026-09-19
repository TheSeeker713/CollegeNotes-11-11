# Phase 13.2 — portable backup and safe restore

AUTH-P13 / PASS-2026-09-19-P13. A versioned JSON backup contains the course, source bytes and revisions, course module choices, card layout, annotations, attempts and other course-scoped records. Media is included by default and can be excluded; external AI models and all connection credentials are excluded. Appearance preferences are an optional backup section and are restored only by a separate explicit choice. Restored embedding indexes are marked stale until the local model is verified and the index is rebuilt.

Restore previews the course and conflicts after checking format version, nested checksums, every source/media byte checksum, course ownership and file paths. An existing ID blocks restore. The implementation stages files and uses a database transaction; an interrupted move rolls back inserted rows and removes copied files. It never replaces an existing course. Unknown theme IDs are normalized by the domain appearance parser.

CHK-13.2-01 through CHK-13.2-05 executed in `tests/integration/phase13-backup.test.ts`. The clean restore compares original and media bytes, annotation, module selection, layout and appearance policy. Other cases cover tampering, unsupported version, interruption, path traversal and conflict preview. Source audit checked table scoping, credential exclusion, symlink-aware path resolution and no arbitrary executable content. No UI/UX test or live provider request was performed.

Non-UI gate: types, lint, build, 32 unit, 270 integration, 2 evaluation, 6 planning and 44 workflow checks passed. The first integration attempt could not invoke nested macOS `sandbox-exec` inside the tool sandbox; the unchanged suite passed outside that wrapper. Owner-only rendered review remains pending.

Checkpoint remote SHA is recorded in `project-state/current.json` after push confirmation.
