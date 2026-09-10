# Phase 5.3 engineering checkpoint

Previous checkpoint 5.2: `b0ecb619604a6ac9f134359cc4c7b951e530d7f8`, pushed and independently confirmed on origin/main.

Course JSON exports include versioned metadata, original bytes/checksums, revisions, drafts, module choices, layouts, and existing derived/research records. Export queries are course-scoped and exclude connection tables, credential references and local original-file paths. The envelope includes a SHA-256 over its data object. Restore/import of this portable format belongs to Phase 13 and is not claimed here. Export currently buffers the course in memory; large-course streaming/performance remains a portability-phase concern.

Permanent deletion requires an exact course name and acknowledgement that separate backups remain. It validates all originals before mutation, hides the course during cleanup, deletes only owned paths and linked records, and leaves failed cleanup visible for explicit retry after restart. Archive is the reversible alternative. No secure-erasure guarantee is made for SQLite free pages, WAL, storage snapshots or separate backups.

All nine non-UI command gates passed: 25 unit, 47 integration, one synthetic evaluation, 6 planning, 44 workflow and 6 gate-harness cases, plus types/lint/build. CHK-5.3-01 through 05 and additional corrupt-checksum/path/symlink controls pass. Initial lint failure is retained. Evidence: `.local/verification/phase5/5.3/report.json`; source hashes matched.

Separate source audit reviewed preflight ordering, retry state, SQL foreign-key deletion order, path ownership, export allowlist and negative controls. No schema/dependency changes or UI tests. Owner review remains pending.
