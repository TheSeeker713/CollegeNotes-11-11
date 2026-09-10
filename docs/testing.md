# Local verification — Phase 3

Planning checks still run:

- `npm run verify:planning` — manifests, state, approvals, links
- `npm run test:workflow` — 44 synthetic authorization/evidence cases

Product commands (pinned toolchain):

| Command | Purpose |
|---|---|
| `npm run check:types` | TypeScript project build |
| `npm run check:lint` | ESLint |
| `npm run test:unit` | Vitest unit project |
| `npm run test:integration` | Service health and parser harness |
| `npm run test:e2e` | Playwright against Vite preview, Chrome channel |
| `npm run test:accessibility` | axe on the harness |
| `npm run test:evals` | Labeled synthetic eval fixture |
| `npm run verify:step` | Gate: failing fixture fails, empty/skip fail, pass passes, nonzero exit propagates |
| `npm run build` | Web + local-service |

Playwright uses the installed Chrome channel (`channel: 'chrome'`). No Playwright browser download is authorized. Results under `.local/verification/` are private.
