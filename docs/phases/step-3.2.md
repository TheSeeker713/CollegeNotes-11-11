# Step 3.2 — local gate

Verification system: Vitest unit/integration/evals, Playwright e2e/accessibility, ESLint, TypeScript. 6/6 required checks passed.

- CHK-3.2-01: intentionally failing harness fixture exits nonzero
- CHK-3.2-02: empty and skipped harnesses are rejected by the gate
- CHK-3.2-03: known passing harness fixture passes
- CHK-3.2-04: command exit 2 is propagated
- CHK-3.2-05: eval results labeled synthetic
- CHK-3.2-T01: unit discovery covers all four theme/mode combinations and default/saved preference fixtures

Prerequisite: Step 3.1 `db8949819b6f1470a291036e7a67461400c62e4e`. Checkpoint pending. No Phase 4.
