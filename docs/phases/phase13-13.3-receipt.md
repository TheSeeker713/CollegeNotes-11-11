# Phase 13.3 — module extension and course isolation

AUTH-P13 / PASS-2026-09-19-P13. A trusted, data-only `ModuleRegistry` accepts a narrowly validated optional descriptor. Storage helpers enable or disable a registered module for one course and reject a stored schema-version mismatch. The synthetic fixture registers a case-note descriptor only in test code; it does not seed a real course or add a new user-facing product module. Existing application modules were not changed. The [extension guide](../architecture/module-extension-guide.md) describes how an owner-approved future subject module can be added.

CHK-13.3-01 through CHK-13.3-05 passed in `tests/integration/phase13-module-extension.test.ts`: registration/version rejection, disable/re-enable with retained owner text, course-scoped lexical retrieval, database reopen/migration preservation, and rejection of callback-bearing descriptors. Backup now preserves raw course-module rows so a future trusted app update can recover data for a module unknown to the current UI. No arbitrary plugin execution or imported-material authority was introduced.

Non-UI gate: types, lint, build, 32 unit, 273 integration, 2 evaluation, 6 planning and 44 workflow checks passed. Source audit reviewed course scoping, registry input validation, backup records and public candidate files; no credential/private data was added. No agent UI/UX test was run.

Checkpoint remote SHA is recorded in `project-state/current.json` after push confirmation.
