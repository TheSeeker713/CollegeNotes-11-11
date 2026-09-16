# Local development setup

[PROJECT-PLAN.md](../PROJECT-PLAN.md) controls scope. Existing pinned runtime: Node 24.21.0 and npm 12.0.2 under `.local/runtime/node/`. This checkout was provisioned on September 15, 2026; see [development setup record](development-setup-2026-09-15.md). Fresh clones do not include the ignored runtime, dependencies, worker copies or OCR model.

From the CollegeNotes repository:

```sh
export PATH="$PWD/.local/runtime/node/bin:$PATH"
npm run build
npm run dev
```

Keep the terminal running and open http://127.0.0.1:5173 in your browser. The launcher runs Vite against apps/web and the compiled loopback service on port 4781. It never connects an AI account. Package runtime exports resolve compiled JavaScript; types and test aliases resolve source.

The current browser client uses port 4781. If occupied, stop the conflicting CollegeNotes instance; setting another service port alone does not reconfigure this client. Stop this launch with Control-C. The legacy dev:stop helper exists but should not be used against stale PID files.

For isolated manual review, set COLLEGENOTES_DATA_DIR to a new temporary directory before starting. This preserves the normal Application Support database. Detailed manual tasks are delivered with the Phase 4 repair production report. Authoritative personal data and private logs remain outside Git. No credentials or private course material are needed for review.

## Phase 6 model assets and review

The verified English OCR and MiniLM assets live under `.local/models/` in this checkout. `npm run setup:models` checks installed checksums. On a new checkout, `npm run setup:models -- --confirm-download` explicitly downloads the pinned assets after the owner approves; there is no runtime download fallback. Combined model assets are about 27.8 MB. Use `npm run bundle:workers` after installing dependencies. The [Phase 6 report](phase-6-production-report.md) describes the pipeline and [manual review guide](phase-6-manual-tests.md) covers owner testing.

Before Phase 8, alert the owner to connect the MyceliaOS external SSD and verify the designated local-AI directory. Existing Phase 6 assets are not moved automatically.
