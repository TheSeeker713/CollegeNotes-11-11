# Development setup — September 15, 2026

The owner requested all development prerequisites, current stable compatible versions, Sublime Text, and a Zed installation check. This is environment preparation, not Phase 6.4 implementation or a phase acceptance.

## Installed and verified

- Project-local Node 24.21.0 (latest LTS, matching the plan) and npm 12.0.2 (latest stable) under `.local/runtime/node`. The official Node ARM64 archive was checked against its published SHA-256. System Node 26.8.2 remains available separately.
- Workspace dependencies and lockfile updated to compatible stable releases: Vite 8.3.0, Vitest 5.0.1, Fastify 5.12.4, Mammoth 1.12.3, Three.js 0.186.0, matching Three types, Node 24 types 24.13.5 and Testing Library DOM 10.4.2.
- React/React DOM 19.2.8 and TypeScript 6.0.3 retained: current React Three Fiber requires React below 19.3, and typescript-eslint requires TypeScript below 6.1. These are the latest stable versions within those compatible lines. React types remain aligned.
- EPUB.js transitive XML parser overridden to `@xmldom/xmldom` 0.9.12 to resolve reported advisories. The existing bounded EPUB extractor uses JSZip/Saxes; no EPUB reader implementation was added. npm audit reports zero known vulnerabilities after the override.
- PDF/OCR worker assets copied locally. English OCR model downloaded from the revision in `phase6-ocr-model.json`; 4,113,088 bytes and SHA-256 verified.
- Git, Homebrew, Apple Command Line Tools, Python and Google Chrome were already available. SQLite's native Node binding passed an in-memory query.
- Sublime Text stable Build 4200 installed through Homebrew; `subl` available and code signature verified. Zed 1.19.2 was already installed.

No local generative model or future-phase provider SDK was required. The embedding engine is not implemented yet; its model provisioning remains part of Phase 6.4 rather than a prerequisite for building the current code.

## Start development

From this repository in Terminal:

```sh
export PATH="$PWD/.local/runtime/node/bin:$PATH"
export npm_config_cache="$PWD/.local/cache/npm"
npm run build
npm run dev
```

Open http://127.0.0.1:5173 and keep the terminal running. Control-C stops the development processes. The local service uses port 4781. To isolate manual testing from personal data, set `COLLEGENOTES_DATA_DIR` to a directory inside `.local/` before starting.

After dependency changes, use `npm ci` with the project runtime, then `npm run bundle:workers`. Ignored assets must be provisioned separately on another clone. npm 12 reports blocked optional/install scripts; the native SQLite prebuild and real OCR were verified without enabling blanket lifecycle-script execution.

## Existing agent guidance

`AGENTS.md` already exists, along with nine guides under `docs/agents/`: execution, testing, auditing, design, architecture, privacy-and-inputs, recovery, handoff and instruction-loading. The governing scope is `PROJECT-PLAN.md`; current progress and approvals are under `project-state/`. Owner-only UI/UX testing remains in force. No replacement agent rules were needed.

## Verification

Passed: build, types, lint, 25 unit tests, 65 integration tests, 1 synthetic evaluation, 6 planning checks, 44 workflow checks and 6 gate-harness checks. Dependency-tree validation and an isolated service startup/SQLite/FTS5 health check also passed. npm audit reports zero known vulnerabilities. The OCR integration test's old literal checkout name was replaced with a repository-relative expected model path, preserving the exact local path assertion and model checksum validation. Detailed outputs, registry snapshots, original failure and subsequent results are retained privately under `.local/setup/`. No UI/UX tests or visual acceptance are claimed.

Version sources: https://nodejs.org/dist/index.json, https://registry.npmjs.org/, https://www.sublimetext.com/download. Historical phase receipts and plan scope were not rewritten.
