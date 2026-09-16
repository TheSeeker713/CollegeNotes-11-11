# Phase 7 — Reading and offline learning

September 16, 2026 · CollegeNotes{11:11}

## Delivery status

Phase 7 engineering implementation is complete after its ordered verification and repository checkpoints. The final implementation SHA and independently verified remote receipt are recorded in [final receipt](phases/phase7-final-receipt.md). This is not owner acceptance of the interface.

The owner authorized Phase 7 and explicitly deferred manual user testing until after Phase 8 completion. No browser, screenshot, accessibility or usability tests were run by the agent. Earlier unresolved visual feedback remains pending. Phase 8 is not authorized by this delivery and has not started.

## What this phase delivers

### Original and reflowed reading — 7.1

- A course Reading workspace, available through the enabled Reading module, with source selection and a course-home shortcut.
- Original PDF/image pages and a safe EPUB chapter rendition alongside paginated reflowed extraction.
- Page/chapter references where extraction provides exact mapping. Corrected revisions explicitly disclose that original alignment may no longer be exact.
- Passage navigation, source-location labels, Markdown heading navigation, literal source search, bounded results and exact character offsets.
- Original files remain unchanged and downloadable. PDF/image pixels are not recolored by either application theme.
- Extraction warnings explicitly identify potentially missing tables, figures, equations and layout. EPUB scripts, publisher styles, active objects, MathML and SVG are excluded; missing images are labeled. Safe EPUB rendering is not a claim of publisher-layout fidelity.

### Annotations and resumption — 7.2

- Highlights, notes and bookmarks anchored to source ID, immutable revision, exact UTF-16 range and verified quote.
- Mouse/keyboard text selection plus explicit start/end controls as a keyboard alternative. Repeated phrases are distinguished by offsets.
- Saved highlights in reflowed text; notes can be edited or deleted. Jumping to an annotation loads its exact historical revision.
- Saved source, revision, passage offset, reading mode, page/chapter, outer scroll position, EPUB inner scroll position, selection and unfinished annotation draft.
- Automatic course reading resumption. A later correction does not silently move existing annotations or replace an older revision's draft.
- Optimistic versions prevent conflicting tabs from silently overwriting saved work. Failed writes remain in the current window, with a close warning and explicit retry. Failed writes are not crash-safe until the service confirms a save.
- Item/selection/course exports include reading records. Source/course permanent deletion cascades annotations and saved positions. Module disablement preserves them.

### Prepared offline reading — 7.3

- Explicit preparation of selected approved sources stores a private browser copy of reflowed text, unchanged originals, annotation snapshots, saved position and a versioned vector index.
- Production app assets, including both themes and both modes, are cached by a versioned service worker. No runtime CDN is required.
- With the loopback service running, reading, annotations, lexical search and local MiniLM semantic retrieval operate without internet access.
- Without that service, the prepared browser library provides clearly labeled read-only snapshots, lexical saved-text search, original/reflowed viewing, saved annotation inspection and original downloads. Semantic inference, annotation saving and cloud features are explicitly unavailable in this state.
- Reconnection verifies active course/source ownership and revisions before returning to live use. Source changes and deletions invalidate this browser's saved pack. If cache cleanup fails after a local change succeeds, the app reports that separate cleanup problem without falsely reporting the local save as failed.
- Model/index mismatch, stale indexes, unapproved selections, unavailable content and missing local model assets receive explicit errors or readiness messages.

### Reading controls and integrated review — 7.4

- Persisted zoom, density, line spacing, reading focus, source-context visibility and reduced-motion controls, available in live and browser-only reading.
- Theme-token selection and highlight colors; faithful original imagery; wrapping layout and semantic labeled controls.
- Separate saved state for each source revision. Database migrations 12 and 13 preserve existing material and upgrade earlier reading records without dropping drafts.
- Serialized saves retain newer edits made while an earlier request is in flight. Source reconciliation identifies newer revisions and removes unavailable sources from live reading.
- Source audit repairs include safe EPUB output bounds, separate EPUB/outer scroll positions, generation protection for annotation operations, exact annotation jumps, deterministic last-session ordering and the missing HTML shell-cache entry caught by the offline test.

## Verification evidence

All nine engineering gates passed on the final tested implementation:

- TypeScript checks, ESLint and production builds.
- 25 unit tests, 111 integration tests and 1 synthetic evaluation.
- 6 planning checks, 44 workflow checks and 6 gate-harness checks.
- Zero failed, skipped or canceled cases in the passing run.
- Dependency audit: zero known vulnerabilities. No dependencies were added or upgraded for this phase.

The evaluation is synthetic and is not evidence of a real cloud provider connection. Real pinned MiniLM inference is exercised separately, including a macOS process with all network access denied. The integrated disconnected check reads a source, runs lexical search and actual local embedding/vector retrieval, and saves an annotation under that same network-denial policy.

The shell-cache check executes the generated worker in a non-browser harness with network fetch denied. It verifies cached navigation/assets and exclusion of loopback API requests. It does not substitute for the owner's real browser cold-open test.

A storage responsiveness diagnostic used 3 synthetic courses, 100 documents and 10,000 source passages, with 100 actions in each of 3 runs. The final measured p95 values are recorded in the final receipt. All were below 200 ms. This is storage/domain timing, not the agreed P-INTERACT input-to-next-painted-result benchmark. The full browser workload, including 1,000 learning attempts and visual timing, remains pending; it has not been claimed as passed.

Detailed logs, all samples and source hashes remain private under `.local/verification/phase7/` and `.local/phase7/`. Failed runs were preserved before successful reruns. Public step receipts describe evidence scope and ordered checkpoints without publishing local/private data.

## Scope and operating limits

- Production offline preparation uses the local preview at `http://127.0.0.1:4173`. Development mode on port 5173 explicitly declines to prepare cold-open shell assets.
- Browser snapshots are additional private copies in that browser profile. Other browsers, exported files and backups are separate copies. Browser storage may be evicted; the app requests persistence and reports the result. A saved pack is not a backup guarantee.
- Preparation is bounded to 50 sources and 100 MiB per pack, subject to the existing export/original limits and browser quota. EPUB rendition output is bounded to 16 MiB per chapter and 40 MiB per book; the existing archive safety limits still apply.
- Reflowed passages are bounded to 4,000 UTF-16 code units; source search displays at most 100 matches. EPUB chapters and PDF pages retain original location controls. Oversized/unavailable content is not silently presented as complete.
- No generative LLM, model download, cloud request, account sign-in, paid service or provider installation was added. Phase 6's already-approved OCR and MiniLM assets are reused in their existing location.
- This remains the local-browser development application. Normal standalone macOS packaging is a later phase.

## Manual testing and next boundary

The [manual guide](phase-7-manual-tests.md) is saved for use **after Phase 8 completion**, as requested. It covers desktop windows, 200% zoom, four theme/mode combinations, VoiceOver/keyboard use, exact restoration, concurrent edits, offline cold-open, cache cleanup and end-to-end performance. None of these manual checks is marked passed.

Next authorized action at this boundary is owner review of this report or an explicit Phase 8 instruction. Before any Phase 8 local-AI setup, the agent must alert the owner to plug in the **MyceliaOS external SSD**, then verify its mounted volume and designated model directory. There is no silent internal-disk fallback and no implicit permission to download a generative model.
