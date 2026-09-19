# Phase 9.1 — reusable activity templates

AUTH-P9. CHK-9.1-01 through CHK-9.1-05 are covered by `tests/integration/study-activities.test.ts`: schema rejection, exact approved same-course source anchors, scoring fixtures for six formats, ambiguous/free-text review, correction/trash invalidation and permanent deletion. Templates/rationale/rubric remain separate from attempts. Course export includes prepared activities and embedded provenance.

Non-UI gate passed: types, lint, build, 32 unit, 166 integration, 1 evaluation, 6 planning, 44 workflow and 6 gate-harness checks. Private raw output and tested source hashes: `.local/verification/phase9/9.1/report.json`. The initial failed run is retained: invalid state vocabulary was repaired; two host sandbox-denial tests passed with authorized host execution. No checks were skipped or weakened.

Separate source/evidence audit: reviewed schema bounds, course and module guards, exact source slice validation, transactionality, forward-only migration, source lifecycle triggers, export, ordinary form controls and absence of provider calls. Internal storage→learning workspace reference added; no dependency installed. Design specification: [phase9-design.md](phase9-design.md). Manual UI/UX review remains pending owner-only.

Checkpoint is pending commit/push confirmation; the next step records the verified SHA without a recursive self-hash claim.

Verified origin/main checkpoint: `72fb88b8a5bdc04e503df322d6023199c70e95aa`.
