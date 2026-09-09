# scripts

Local verification, startup and checkpoint utilities. Run `node scripts/validate-project.mjs` from the repository root to check manifests, requirement mapping, state, approval references and local links. Reports and source hashes go to ignored `.local/verification/project-validation.json`. The equivalent package script is `verify:planning`.

`state-rules.mjs` exports schema-shape, evidence-gate and transition checks. These validate records and do not grant authorization or prove external events. The agent must inspect real outputs and user decisions. Product test commands arrive in Phase 3.

Scaffold only. No application features or installed product dependencies exist.
