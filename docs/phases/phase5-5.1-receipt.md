# Phase 5.1 engineering checkpoint

Implemented validated course creation, rename/description editing, archive/restore and active-course write guards. Duplicate names retain distinct IDs. Archives preserve sources, notes and layouts. No schema or dependency changes.

Nine non-UI command gates passed: types, lint, build, 25 unit cases, 37 integration cases (including CHK-5.1-01 through 04), one synthetic evaluation, 6 planning checks, 44 workflow cases and 6 gate-harness checks. The initial lint failure is retained privately; the repaired run passed. Evidence and source hashes: `.local/verification/phase5/5.1/report.json`.

Separate source audit confirmed unchanged official plan, impact plan, migration history and lockfile; input validation and course isolation assertions are meaningful. The historical Phase 5 checklist is retained; policy mappings no longer claim satisfaction by unrelated new criteria. No class data seeded. UI acceptance is pending and no UI tests were run.

This commit is the implementation checkpoint; its remote SHA is recorded by the next ordered receipt after push confirmation.
