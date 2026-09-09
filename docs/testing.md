# Local verification guide

Available now: `node scripts/validate-project.mjs` checks planning files, manifest/mapping consistency, state and references; `node scripts/rehearse-workflow.mjs` runs 42 explicitly synthetic workflow cases against the state/evidence rules. Both exit nonzero on failure and save actual results under ignored .local/verification/.

The synthetic run exercises positive and negative gates, missing/skipped/flaky results, stale source, wrong evidence kind, failed push, invalid transitions, phase boundaries, closed-pass reuse and malformed state. It does not test reading, OCR, storage, accounts, audio or a running UI. An expected rejection counts as a passing negative case only when the real rule returns rejection.

Before trusting a report, compare its command, time, case count and source hashes to current files. Investigate failed output and preserve it; rerun only after a repair. Inspect the record against the actual command execution. No authored JSON can replace a real run.

Phase 3 adds real type/lint/build/unit/integration/e2e/accessibility/evaluation tools and required case discovery. Production manifests must expand check clauses into runnable meaningful assertions and retain all required failure paths. See [testing rules](agents/testing.md) and [audit rules](agents/auditing.md).
