# Step 3.3 — local gate

Parser harness and provider stubs. 4/4 required checks passed.

- CHK-3.3-01: synthetic PDF, PNG, DOCX, EPUB load
- CHK-3.3-02: pdf.js and tesseract workers copied from `node_modules` by `scripts/bundle-workers.mjs` (not committed; no CDN)
- CHK-3.3-03: tutor/narration/recognition return `not_configured` / unavailable
- CHK-3.3-04: EPUB `<script>` is stripped and not executed

OCR language models are not downloaded. Prerequisite: Step 3.2 `057ed16d594bbbf3eade5e2b3d5a26e1f6e72304`. No Phase 4.
