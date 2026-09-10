# Step 4.2 — local gate

SQLite migrations, courses, originals, appearance and per-course layouts live in a data directory outside Git (default Application Support, tests use temp dirs). 6/6 required checks passed.

- CHK-4.2-01: course/appearance/layout CRUD
- CHK-4.2-02: failed transaction rolls back
- CHK-4.2-03: migrate fresh and existing databases
- CHK-4.2-04: original bytes survive reopen
- CHK-4.2-05: no `collegenotes.sqlite` in the checkout
- CHK-4.2-T01: appearance and layouts stored in SQLite

Prerequisite: Step 4.1 `c86bb6b7bc75dd7a03ddf9042c0dfe45332dc528`. Checkpoint pending. No Phase 5.
