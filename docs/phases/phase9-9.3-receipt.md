# Phase 9.3 — review scheduling and progress

AUTH-P9. CHK-9.3-01 through CHK-9.3-05 are separately asserted in `study-review.test.ts`: UTC midnight/leap/DST boundaries, missed days and workload, repeat/idempotent attempts, reset/undo and no reading-derived mastery. Unassisted correct objective responses expand intervals to at most 60 days; errors, hints and unassessed explanations return in one day. Dates use elapsed UTC days explicitly. Attempt counts are not a grade or mastery claim.

Gate passed: types, lint, build, 32 unit, 177 integration, 1 evaluation, 6 planning, 44 workflow, 6 gate-harness checks. Evidence/source hashes: `.local/verification/phase9/9.3/report.json`.

Separate audit reviewed schedule/attempt atomicity, idempotence, workload bounds, stable UTC ordering, reset snapshots, later-attempt undo invalidation, course-scoped export and cascade deletion. Appearance is independent of scheduling. Review UI and history are implemented; owner UI/UX acceptance remains pending.

Prior verified checkpoint: `862483547c9adf5a31b7f55e2100bee02db2afe7`. This checkpoint awaits commit/push confirmation.
