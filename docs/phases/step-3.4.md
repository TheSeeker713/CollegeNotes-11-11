# Step 3.4 — local gate

Development harness and dependency audit. 5/5 required checks passed.

- CHK-3.4-01: service starts, `/health` returns sqlite+FTS5 and unavailable tutor
- CHK-3.4-02: occupied port exits 2 with a collision message
- CHK-3.4-03: `check:types`, `check:lint`, `test:unit`, `test:integration` pass
- CHK-3.4-04: `npm audit` has 0 critical; 1 high triaged (transitive / unused optional path)
- CHK-3.4-T01: local fonts; `reduce-transparency` glass fallback without GPU

Prerequisite: Step 3.3 `93a38a7e736ff3ff6116b5b9c4a98aa0073871e2`. Checkpoint pending. Do not begin Phase 4.
