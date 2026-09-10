# Testing

Required check IDs and obligations are fixed in each phase manifest. The denominator is every required case, not discovered passing cases. Empty discovery, duplicates, missing IDs, skips, cancellations, failed/time-out cases and unresolved flakiness fail the gate. Retain raw outputs and the failed run when retrying. A new passing run supersedes evidence only for the same obligation and source.

Before installed tooling exists, use actual filesystem/configuration checks, source comparisons, document consistency, state validation and design audits. These are not application tests. Phase 3 implements check:types, check:lint, test:unit, test:integration, test:e2e, test:accessibility, test:evals, build and verify:step equivalents using the pinned dependencies.

Production checks cover meaningful success and failure behavior: source fidelity, correction invalidation, wrong-course retrieval, permission/path errors, interruption, restart, offline, actual account limits and real audio/GPU where applicable. Run affected regressions plus integrated phase cases. Use synthetic public fixtures with expected outcomes; keep private course/microphone material local.

A mocked provider checks handling only. A static image checks composition only. A screenshot does not establish persistence; a saved toast does not establish durable storage. Semantic AI cases use a versioned rubric, source set and documented unknowns. Critical deterministic rules need negative controls. Coverage is supplementary, never a replacement for acceptance.

Results record commands, exit codes, case IDs, actual counts, source fingerprint, environment, timestamp, artifacts and audit findings. Recompute hashes and inspect raw evidence; do not trust an authored pass field alone. No product verification command should silently succeed without implementing its intended checks.

## Current repair pass

[PROJECT-PLAN.md](../../PROJECT-PLAN.md) is the sole scope authority. AUTH-REPAIR-0-4 and AUTH-REPAIR-PUSH authorize the bounded repairs through Phase 4 and existing-repository pushes. Older pass restrictions are historical. UI/UX testing and rendered-design review belong exclusively to the owner; agents perform source audits and non-UI engineering checks. Manual acceptance remains pending through the repair implementation. Phase 5 needs the owner's green light. See [repair manifest](../phases/repair-0-4.json).
