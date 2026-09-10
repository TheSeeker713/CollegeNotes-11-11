# Phase 3 report — CollegeNotes{11:11}

- **Pass:** `PASS-2026-09-09-P3`
- **Authorization:** AUTH-P3 — owner: “implement phase 3. stop at phase 3 completion, and write a full report saved as a .md file in Docs folder.”
- **Phase 2 candidate accepted:** `6eef455680d40a44c23025d6f0b1a246f0f1696f` (ACCEPT-P2)
- **Phase 4:** not authorized. This report ends the Phase 3 pass.

## What Phase 3 is

Phase 3 installs the **pinned local toolchain** and proves the empty product can **build, test, parse synthetic files, and start**. It is not the study UI, import product, tutoring, or audio. Those start at Phase 4.

## Checkpoints (remote `main`)

| Step | Title | SHA |
|---|---|---|
| 3.1 | Install and lock application dependencies | `db8949819b6f1470a291036e7a67461400c62e4e` |
| 3.2 | Configure local test tooling | `057ed16d594bbbf3eade5e2b3d5a26e1f6e72304` |
| 3.3 | Document and provider adapter dependencies | `93a38a7e736ff3ff6116b5b9c4a98aa0073871e2` |
| 3.4 | Reproducible local startup and dependency audit | `e406973f9a2e08514014d90ae022a0c1155c03e7` |

Pinned runtime used for all product commands: **Node v24.21.0** and **npm 12.0.2**, isolated at `.local/runtime/node/` (gitignored). System Node 26 is not used.

## Step 3.1 — install and lock

Workspaces now have the Phase 0 pins (`phase0/installation-manifest.json`). `package-lock.json` is committed. `node_modules/` is not.

| Check | Result |
|---|---|
| CHK-3.1-01 clean reinstall (`npm ci`) | passed |
| CHK-3.1-02 versions match decisions | passed (Node 24.21.0, npm 12.0.2, all 29 non-npm pins) |
| CHK-3.1-03 no unexpected cloud services | passed |
| CHK-3.1-04 no secret staged | passed (`.env.example` only) |
| CHK-3.1-05 web + local-service build | passed |
| CHK-3.1-T01 local theme fonts, no CDN | passed |

SQLite **3.53.4** with **FTS5** probed via `better-sqlite3`. Loopback Fastify listens on `127.0.0.1:4781`. Vite web harness on `5173` / preview `4173`. Default appearance is Botanical Light.

## Step 3.2 — test tooling

Commands: `check:types`, `check:lint`, `test:unit`, `test:integration`, `test:e2e`, `test:accessibility`, `test:evals`, `verify:step`.

| Check | Result |
|---|---|
| CHK-3.2-01 failing fixture fails | passed |
| CHK-3.2-02 empty/skip fail the gate | passed |
| CHK-3.2-03 known passing fixture passes | passed |
| CHK-3.2-04 command failures propagate | passed (exit 2) |
| CHK-3.2-05 synthetic results labeled | passed |
| CHK-3.2-T01 four theme/mode fixtures | passed (10 unit tests) |

Playwright uses **installed Chrome** (`channel: 'chrome'`). No Playwright browser download. E2E and axe harness tests passed.

## Step 3.3 — parsers and providers

Synthetic public fixtures: `tests/fixtures/public/sample.{pdf,png,docx,epub}`. EPUB includes a `<script>` that must be stripped.

| Check | Result |
|---|---|
| CHK-3.3-01 PDF/image/EPUB/DOCX load | passed |
| CHK-3.3-02 workers without CDN | passed (`npm run bundle:workers` copies pdf.js and tesseract workers from `node_modules`; copies are gitignored) |
| CHK-3.3-03 unavailable providers | passed (`not_configured`, no silent fallback) |
| CHK-3.3-04 imported scripts do not execute | passed |

**Not done (by spec):** bulk speech/OCR model downloads. Image “parse” confirms the file and local worker path only.

## Step 3.4 — startup and audit

`npm run dev` / `npm run dev:stop`. Health: `{ ok, service, sqlite, fts5, tutor: unavailable }`. Occupied port → exit 2.

| Check | Result |
|---|---|
| CHK-3.4-01 start / health | passed |
| CHK-3.4-02 occupied port | passed |
| CHK-3.4-03 types/lint/unit/integration | passed |
| CHK-3.4-04 dependency audit | passed: **0 critical**, 1 high triaged (transitive / unused optional; not a Phase 3 blocker) |
| CHK-3.4-T01 local fonts + glass fallback | passed (`reduce-transparency` disables blur) |

## How to run (after clone)

```sh
# 1. Put Node 24.21.0 on PATH (or unpack official darwin-arm64 into .local/runtime/node)
export PATH="$PWD/.local/runtime/node/bin:$PATH"
npm ci
npm run build
npm run bundle:workers
npm run check:types && npm run check:lint
npm run test:unit && npm run test:integration
npm run test:e2e && npm run test:accessibility
npm run dev          # 127.0.0.1:4781 + 127.0.0.1:5173
```

Details: [setup.md](setup.md), [testing.md](testing.md).

## Intentionally not in Phase 3

- Course home, import product, study, PQP, appearance persistence (Phase 4+)
- Real ChatGPT / speech / microphone
- Design images in git (`/Design/` remains gitignored)
- GitHub Actions / hosting
- Phase 4 installation or UI implementation

## Stop

Phase 3 steps 3.1–3.4 are complete. **Do not begin Phase 4** until you explicitly authorize it.
