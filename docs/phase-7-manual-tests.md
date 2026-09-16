# Phase 7 manual testing guide — deferred

Do not begin these tests now: the owner deferred manual user testing until after Phase 8 completion. This guide records pending acceptance, not a request to test or an assertion that the UI passed. Use synthetic material or your own private imports; never commit private test content. Record the exact build SHA from the final receipt when testing.

## Start the production preview when testing is authorized

From the CollegeNotes repository, run `npm run build` using the repository's pinned Node runtime on PATH. Start the local companion service on port 4781 using the existing development/startup workflow. For shell-cache preparation, start `npm run preview -w @collegenotes/web` and open `http://127.0.0.1:4173`. Keep the local service running for disconnected inference and saving. The development browser on 5173 is not the offline cold-open acceptance target.

## Reading and source fidelity — CHK-7.1-01 through 05

1. Create a course, enable its Reading module, and import/extract a text document with repeated phrases and Markdown headings, a PDF with multiple pages/tables/figures, and a DRM-free EPUB with multiple chapters.
2. Open Reading, select each source, traverse previous/next passages and heading/location controls, and use literal search. Verify repeated matches jump to the intended occurrence.
3. Switch between reflowed text and original page/chapter. Verify source mapping, original pixels and visible omission warnings. Confirm missing images/pages are labeled, and complex source content is never represented as fully preserved by extraction.
4. Exercise 75–200% reader zoom, a long document and the largest supported desktop window/minimum desktop window. Repeat at 200% browser zoom.

## Annotation and exact resumption — CHK-7.2-01 through 05

1. Highlight the second of two identical phrases. Add a note and bookmark. Use the explicit character range controls without a mouse.
2. Close/reopen Reading and restart the app/service after saving. Verify exact source, revision, selected passage, scroll, original PDF page/EPUB chapter, inner EPUB scroll and annotation draft.
3. Correct the source in Sources. Confirm old annotations remain historical. Open the latest revision, create a different draft, then jump back to an old annotation. Both revision drafts must remain intact.
4. Edit/delete a note, export the item and course, and inspect the included annotations/positions. Disable/re-enable Reading; data should remain. Trash/restore a source, then permanently delete a synthetic source after reviewing backup disclosure. Deleted material must not be available through live retrieval.
5. Open two tabs and edit the same saved position/note. A conflicting save must be explicit; no tab may silently rebase or overwrite the other's work. Copy your preserved draft before deliberately discarding conflicting work.

## Offline operation — CHK-7.3-01 through 05

1. Review and approve synthetic sources; build the local index. In production Reading, select sources under Course search and offline preparation, prepare them, and inspect the status and storage-persistence result.
2. Disconnect internet access while leaving the local service running. Cold-open the production URL. Read originals/reflowed text, run lexical and semantic search, annotate, save and resume.
3. Stop the local service and reload the prepared production URL. Verify the read-only browser library, preparation timestamp, lexical snapshot search, prepared originals and saved annotations. Semantic inference, writes and cloud features must be labeled unavailable.
4. Restore the service and use Reconnect. Correct/delete a synthetic source or archive its course; verify reconciliation/invalidation of this browser copy. Test Remove browser copy. Remember that other profiles, original downloads and exports are separate.
5. With a safe synthetic environment, test a missing/stale/mismatched local model/index, unavailable selected source, storage quota failure, and a browser with no prepared pack. Errors must be explicit and must not download replacements or claim cloud availability.

## Controls and integrated acceptance — CHK-7.4-01 through 05

1. Complete the reading/annotation workflow with keyboard and VoiceOver. Check labeled inputs, focus order, focus visibility, source-context panels and original iframe entry/exit.
2. Repeat using Botanical Light/Dark and Brutalist Light/Dark, desktop sizes and 200% browser zoom. Check selection, highlights, notes, bookmarks, source links, original fidelity and wrapping.
3. Change density, spacing, zoom, focus, context and reduced motion; restart offline and verify persistence. Also exercise existing reduced-transparency settings. Theme/control changes must preserve meaningful reading position and unfinished work.
4. Delay or stop the service during saving, make another edit, navigate and recover. Verify drafts are preserved and reported accurately. A confirmed saved draft must survive restart; an unsaved in-memory draft has only the stated close warning.
5. Run the precise P-INTERACT workload in `phase0/acceptance.md`: 3 runs, 100 actions each, input-to-next-painted-result, and its full specified fixture. Record each action's p95 and failures. The automated storage diagnostic is not a substitute.

## Results to record later

For each check record pass/fail, build SHA, source fixture, theme/mode, window/zoom, exact steps, expected/actual result, and any reproduction notes. Keep private evidence local. Unresolved historical GUI feedback remains open until the owner accepts the relevant build.
