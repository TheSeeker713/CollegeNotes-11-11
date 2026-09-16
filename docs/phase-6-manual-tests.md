# Phase 6 — owner manual review

September 16, 2026. UI/UX, visual accessibility and acceptance belong to the owner. No agent browser, screenshot or usability testing was performed. Use implementation commit `5080af20caea976a852109d8e0a79d93641538f9`, identified in [the final receipt](phases/phase6-final-receipt.md). Phase 7 has not started.

## Launch safely

In Terminal, enter the repository folder, then:

```sh
export PATH="$PWD/.local/runtime/node/bin:$PATH"
export COLLEGENOTES_DATA_DIR="$PWD/.local/manual-phase6"
npm run build
npm run dev
```

Open http://127.0.0.1:5173. The isolated data directory keeps these tests separate from personal data. Leave Terminal running; Control-C stops the app. If startup reports a port conflict, stop the earlier CollegeNotes instance. Do not use real private documents for the first review.

## 1. Import, extract and inspect originals

Create two empty courses, such as Synthetic Biology and Synthetic Geometry. In Sources, import a small text file, a native PDF, a scanned PDF or screenshot, DOCX and DRM-free EPUB. The per-file limit is 25 MiB.

Use Extract text in the import queue; the queue refreshes automatically. Confirm status reaches completed, the saved source opens, and text/source anchors are visible. Empty or unreadable scans should report limitations instead of inventing text. Inspect numeric facts manually: OCR confidence never constitutes approval.

Download each original and compare it with your input. PNG/JPEG/PDF previews should preserve the original pixels without theme recoloring. Use the page field for multi-page PDFs; an invalid page must show a preview error. For text/DOCX/EPUB, compare the initial extraction and the downloaded original.

Import the same bytes again: duplication should be detected within the course. Import a changed file under the same name: both versions should remain separate source records. Import the same bytes into the other course: its source remains independent.

## 2. Corrections, notes and history

Create a pasted note and extract its text. Open it, change a sentence and save a new revision. The unchanged original should still download; history must show the old and new text, authors and anchors.

Make an unsaved correction, switch theme/mode or navigate away and back, and confirm the in-memory draft remains. Reload/close must warn while unsaved text exists; unsaved drafts do not survive closing the app. Save before quitting. Failed saves must keep the text in the editor.

For a conflict check, open the same source in two browser tabs. Save a correction in one, then attempt to save the older revision in the other. The second tab must report a conflict and preserve its draft. Reopen the source, compare history, then explicitly choose Use draft against latest revision or discard the old draft.

## 3. Review and build the local index

An imported/extracted source starts unapproved. Review the saved text against its original, check the review acknowledgement, then approve the saved revision. Unsaved corrections cannot be approved.

Select Build / rebuild local index. Confirm building changes to ready. Only approved sources are included. The English MiniLM model and OCR assets are already installed; the app must not download anything at runtime. A missing or corrupt model should show unavailable and prevent a successful build.

Save another correction. Approval should clear and the index should become stale. Approve the new version and rebuild. Cancel a longer build and confirm it can be retried. If the app is stopped during a build, restart and confirm interrupted work is marked failed/retryable, with originals preserved.

Phase 6 exposes index readiness and the backend retrieval contract. The reading/search experience, bookmarks and annotations belong to Phase 7; no finished search interface is claimed here.

## 4. Export and deletion

Export one item from its review panel, then select several active items and export the selection. Inspect the JSON downloads: original bytes, checksums, revisions and anchors should be present; private filesystem paths and provider credentials should not be present. Course export should include its index records. Importing these exports as a backup is future Phase 13 work.

Move a source to trash. It disappears from the active collection and must no longer contribute to retrieval. Enable Show trash and restore it. Its history and original should remain; rebuild the index to include approved text again. Trash is retained until you explicitly permanently delete it—there is no automatic expiry.

For permanent deletion, use only a synthetic test source. Verify that the exact filename and backup acknowledgement are required. Cancel once, then confirm. The source, original, revisions, chunks and derivative records should be removed. Other sources/courses must remain. Separate exported copies/backups are intentionally unaffected; deletion does not claim forensic disk erasure.

## 5. Desktop UI and accessibility

Repeat the main steps in Botanical Light/Dark and Brutalist Light/Dark. Check readable errors, selection controls, correction focus, queue status, and unchanged original colors. Test keyboard navigation, visible focus, VoiceOver labels, reduced motion and 200% zoom. Ensure text selection/file selection is not intercepted by dragging and that the side-by-side review reflows in a narrow Mac window. Record any failures; engineering checks cannot accept these for you.

## Report your result

Note the implementation commit, theme/mode, source format, exact action, expected result and observed result for each issue. Owner acceptance remains pending until you explicitly review this build.

## Future Phase 8 reminder

Before Phase 8, plug in the **MyceliaOS external SSD**. It is the designated home for local AI. The agent must alert you and verify its mounted location/model directory before any Phase 8 local-model installation or migration. No Phase 8 work or local generative-model download is authorized by this guide.
