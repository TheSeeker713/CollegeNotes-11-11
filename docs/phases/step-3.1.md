# Step 3.1 — local gate

Pinned Node 24.21.0 / npm 12.0.2 installed in `.local/runtime/node/`. Workspaces receive the Phase 0 direct dependency pins. `package-lock.json` records the transitive tree. 6/6 required checks passed (plus lockfile version match folded into CHK-3.1-02).

- CHK-3.1-01: `npm ci` succeeds
- CHK-3.1-02: runtime and lockfile versions match `phase0/installation-manifest.json`
- CHK-3.1-03: lockfile has no unexpected cloud SDKs
- CHK-3.1-04: `.env.example` only; no secrets staged
- CHK-3.1-05: web Vite build and local-service `tsc` emit
- CHK-3.1-T01: theme tokens/fonts local, no CDN

SQLite 3.53.4 with FTS5 probed in-process. This precommit record requires a successful checkpoint. No Phase 4 work.
