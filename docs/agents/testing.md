# Testing

Required check IDs and obligations are fixed in each phase manifest. The denominator is every required case, not discovered passing cases. Empty discovery, duplicates, missing IDs, skips, cancellations, failed/time-out cases and unresolved flakiness fail the gate. Retain raw outputs and the failed run when retrying. A new passing run supersedes evidence only for the same obligation and source.

Before installed tooling exists, use actual filesystem/configuration checks, source comparisons, document consistency, state validation and design audits. These are not application tests. Phase 3 implements check:types, check:lint, test:unit, test:integration, test:e2e, test:accessibility, test:evals, build and verify:step equivalents using the pinned dependencies.

Production checks cover meaningful success and failure behavior: source fidelity, correction invalidation, wrong-course retrieval, permission/path errors, interruption, restart, offline, actual account limits and real audio/GPU where applicable. Run affected regressions plus integrated phase cases. Use synthetic public fixtures with expected outcomes; keep private course/microphone material local.

A mocked provider checks handling only. A static image checks composition only. A screenshot does not establish persistence; a saved toast does not establish durable storage. Semantic AI cases use a versioned rubric, source set and documented unknowns. Critical deterministic rules need negative controls. Coverage is supplementary, never a replacement for acceptance.

Results record commands, exit codes, case IDs, actual counts, source fingerprint, environment, timestamp, artifacts and audit findings. Recompute hashes and inspect raw evidence; do not trust an authored pass field alone. No product verification command should silently succeed without implementing its intended checks.

## Current recovery pass

AUTH-P2-FINISH supersedes the old missing-image handoff. The 111 supplied assets are sufficient reference material; inspect and retain them, and reconcile their inconsistencies in the canonical four-variant design/prototype. No new generation round is required. The original bounded pass stays historical. Follow current state, ordered revised-step checkpoints and final candidate review; do not invent acceptance or begin Phase 3 installation.
