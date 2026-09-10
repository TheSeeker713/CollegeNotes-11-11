# Scaffold and data ownership

[PROJECT-PLAN.md](../../PROJECT-PLAN.md) controls scope; stack records and package manifests are subordinate implementation decisions. The existing installed Phase 3 stack is preserved. Source lives in this repository; personal data lives in the local Application Support directory, and private test evidence remains gitignored.

Domain owns versioned neutral course/material/provider/research/index contracts. Storage owns forward-only SQLite migrations and original-file ownership. Importers own extraction and anchors; providers own capability/authentication boundaries. Learning consumes source versions. UI consumes service summaries, never credentials. Packages must not mutate another domain's tables implicitly.

No real course, imported content or connected account is seeded. See [foundation contracts](foundation-contracts.md) for this repair's boundaries.
