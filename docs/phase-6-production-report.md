# Phase 6 — material lifecycle and local embeddings

September 16, 2026. Engineering verification complete; implementation checkpoint pending. The final receipt will identify the verified remote commit. Owner UI/UX and accessibility acceptance remain pending. Phase 7 is not authorized or started.

## Delivered behavior

Phase 6 now covers repeatable local imports, immutable originals, bounded native extraction/OCR, versioned text correction and note editing, explicit approval, item/selection exports, recoverable trash, confirmed permanent deletion, and a local semantic/lexical content pipeline.

The earlier import/extraction/OCR work is preserved. OCR checkpoint reconciliation and the requested compatible development setup were committed and remotely verified as `50adb7cfa88ce1196e26842feeccf6ec7048a8e1`. The original OCR implementation is `2b67c646d1d396b412af20635782371340db621b`.

### Review and ownership

Each correction creates a new revision without altering the imported file. Earlier text, original anchors, authors and timestamps remain available. Optimistic revision checks prevent stale overwrites. Approval is an explicit owner action on an exact saved revision; saving a correction clears approval. Initial extractions remain unapproved, including high-confidence OCR.

The review panel presents original image/PDF pixels beside the correction editor. Other formats show the initial extraction and an original download, without claiming the extraction is the original document. New extraction anchors include character ranges. Corrected revisions preserve original source references but do not claim that edited text has exact original-region alignment. Index chunks record exact offsets within their own revision.

In-memory correction/note drafts survive navigation and theme changes, and browser close/reload warns about unsaved work. They are not persisted in browser storage; save before quitting. A revision conflict retains the draft and requires an explicit comparison/rebase or discard.

### Export, trash and deletion

Item/selection exports contain verified original bytes/checksums and full text/anchor history, excluding filesystem paths and credentials. Selection exports are bounded to 50 items and 100 MiB of original bytes. Course export includes actual semantic chunks as well as existing metadata.

Trash is recoverable and retained until explicit permanent deletion. Trashed/deleted sources cannot supply retrieval context. Permanent deletion requires the exact filename plus acknowledgement that independent backups remain. Cleanup invalidates retrieval before filesystem work; interruption leaves a hidden retryable record. Successful cleanup removes the owned original, revisions, derivative metadata, semantic/lexical chunks and associated import work. Course deletion also handles the new tables. Separate backups and SQLite/filesystem remnants are not claimed securely erased.

### Local model and indexes

English `Xenova/all-MiniLM-L6-v2`, pinned revision `751bff37182d3f1213fa05d7196b954e230abad9`, runs through CPU-only ONNX Runtime 1.30.0 with Tokenizers 0.2.0. Every model/tokenizer file is verified against its pinned byte count and SHA-256 before use. The quantized model is 22,972,370 bytes; model plus tokenizer/config files total 23,685,172 bytes. Including English OCR, model assets total 27,798,260 bytes, below the approved 50 MB budget. No generative LLM was downloaded.

Inference reads only local files. Runtime telemetry is disabled in the main environment before native worker initialization. Missing/corrupt assets fail without a network fallback. The explicit model installer checks pinned assets and requires `--confirm-download` for missing downloads; the application never invokes it automatically. Its source is `scripts/install-phase6-models.mjs`.

The pipeline produces 384-dimensional mean-pooled, L2-normalized embeddings, stored with source/course/revision/model identity. Text chunks use 240 UTF-16 code units with 32-unit overlap, and the tokenizer rejects more than 256 tokens rather than silently truncating. A course build is bounded to 10,000 chunks, uses a background worker and publishes atomically only if the approved-source snapshot still matches. The model identity includes weights, tokenizer assets and pipeline version. Model changes invalidate prior vectors.

Corrections invalidate affected chunks and mark source-linked activities/audio stale; unaffected source content and other courses are retained. Rebuild regenerates lexical and semantic derivatives from approved revisions. Future activity/audio engines are not implemented or falsely marked rebuilt. Interrupted/cancelled/failed builds expose explicit retry states and cannot publish partial or superseded results. Retrieval checks course availability, model identity, approval, current source revision and deletion status again at query time.

The Phase 6 UI exposes index readiness/rebuild/cancel. Backend semantic retrieval is verified using real model output and known-answer synthetic paraphrases. Full reading/search UI remains Phase 7.

## Verification and audit

Detailed source fingerprints, command output, failed attempts and passing results are kept privately under `.local/verification/phase6/6.4/` and `.local/phase6/`. All nine engineering gates passed: types, lint, build, 25 unit tests, 88 integration tests, 1 synthetic evaluation, 6 planning checks, 44 workflow checks and 6 gate-harness checks. npm audit reports zero known vulnerabilities. The final receipt identifies the verified remote commit. Tests cover original preservation, revision conflicts/history, approvals, derivative invalidation, unaffected sources, exports, deletion/recovery, path protection, schema migration, source/model version changes, cancellation, interruption, cross-course isolation and real semantic ranking. Native PDF/DOCX/EPUB/OCR regressions remain in the full suite.

Real local inference is additionally tested in a macOS subprocess with all network access denied. Native telemetry remains disabled; no private course data is used. The nested network-denial sandbox requires running the verification process outside the agent's enclosing sandbox; the test itself runs under the stricter no-network policy. No browser/UI/UX tests were run.

The source audit checks append-only migration 11, source ownership and export paths, approval/revision filters, atomic publication, fail-closed model checks, generation-token races, and non-rendering handling of imported text. Initial test/lint failures were retained and repaired, not removed from the required checks.

## Owner review and remaining scope

Use [the manual review guide](phase-6-manual-tests.md). Earlier Phase 4/5 visual concerns remain unresolved until your review; proceeding with Phase 6 does not create visual acceptance. Performance on large real libraries and full portability/backup restoration are later-phase acceptance work. English OCR and general English semantic similarity are limited tools; neither validates facts or guarantees handwritten/formula extraction.

At your direction, `AGENTS.md`, the official plan, Phase 8 entry gate and current state now require an alert to plug in the **MyceliaOS external SSD** before Phase 8 local-AI setup. That future setup must verify the mounted location and model directory; no silent internal-disk fallback. Existing bounded Phase 6 assets remain in the already-authorized local model folder pending that storage reconciliation. Phase 8 and any local generative-model download still require their own authorization.

Primary implementation references: [MiniLM model](https://huggingface.co/Xenova/all-MiniLM-L6-v2), [Tokenizers.js](https://github.com/huggingface/tokenizers.js), and [ONNX Runtime telemetry controls](https://github.com/microsoft/onnxruntime/blob/main/docs/Privacy.md).
