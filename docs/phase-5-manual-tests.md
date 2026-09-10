# Phase 5 — owner-only UI/UX testing guide

Date: September 10, 2026. Test the Phase 5 candidate recorded in `docs/phases/phase5-final-receipt.md`. These tasks have **not** been performed by an AI agent. Engineering checks do not establish visual quality, keyboard usability or accessibility. Phase 6 is not authorized.

## 1. Start the current build

1. Open Terminal and run:

   ```sh
   cd /Users/myceliainteractive/Developer/CollegeNotes
   PATH="$PWD/.local/runtime/node/bin:$PATH" npm run build
   PATH="$PWD/.local/runtime/node/bin:$PATH" npm run dev
   ```

2. Keep that Terminal open. In your browser, open `http://127.0.0.1:5173`.
3. If an older development process already occupies a port, stop its Terminal with Control-C. If needed, run the following from a second Terminal in the repository, then retry `npm run dev`:

   ```sh
   PATH="$PWD/.local/runtime/node/bin:$PATH" npm run dev:stop
   ```

4. Reload the browser so it uses the current source. Do not delete your normal application data to obtain an empty screen.
5. Use throwaway courses named **Phase 5 Test A** and **Phase 5 Test B** below. Permanent deletion tests must target only these throwaway courses.

Expected: the local app loads without requiring an AI account. A fresh data directory starts with no courses. Existing courses remain available. The normal authoritative data directory is `~/Library/Application Support/CollegeNotes-11-11`, outside the repository.

Optional isolated first-use test: stop the development processes, then start with a separate directory. Reuse this command for restarts during that isolated test:

```sh
COLLEGENOTES_DATA_DIR="$HOME/Library/Application Support/CollegeNotes-Phase5-Manual-Test" PATH="$PWD/.local/runtime/node/bin:$PATH" npm run dev
```

This creates a separate test workspace; it does not erase your normal workspace. Use only one development instance at a time. The browser appearance cache may briefly reflect its previous choice before the service loads authoritative settings.

## 2. Judge the presentation first

1. Use a window around **1440 × 900**. Inspect the navigation, course collection, first-use form, settings and course home.
2. In **Settings**, choose **Botanical Organic Glass**, with Dark mode off. Expect warm cream surfaces, green accents, rounded cards and serif headings.
3. Turn Dark mode on. Expect dark evergreen surfaces and readable light text.
4. Choose **Brutalist Glass Lab**, then test both Light and Dark. Expect square geometry, heavier borders, condensed headings and contrasting title bars.
5. Repeat at roughly **1024 × 700**, then at **200% browser zoom**. Check that controls, descriptions and confirmation text remain readable and reachable without overlapping. At reduced effective width, the Menu button should expose navigation.
6. Try Comfortable/Compact density, Reduce motion and Reduce transparency. Return to your preferred settings.

Record whether the GUI now matches your intended design quality. If it still looks wrong, describe the specific screen, theme, mode, window size and offending element. This is a required owner judgment, not an engineering pass.

## 3. Create and edit courses

1. Click **Courses → Create course**. If the workspace is empty, use the first-course form.
2. Leave the name empty. Creation must remain unavailable. Enter **Phase 5 Test A** and description **A course for manual testing**. Create it.
3. Expect its course home to show that name and description. No instructor, syllabus, assignment, source or AI connection should appear automatically. No modules should be selected.
4. Create **Phase 5 Test B**. Give it a different description.
5. Create another throwaway course with the same name as Test B. Duplicate names are allowed; each card shows a distinct ID suffix. Rename the duplicate immediately to **Phase 5 Duplicate** so it is easy to distinguish.
6. Return to Courses. Search by name and description. Switch Active/Archived/Deletion pending and use Refresh.
7. Click **Manage course** for Test A. Change its name to **Phase 5 Test A — edited** and description to **My revised description**. Click **Save details**.
8. Expect a saved message and updated card. Refresh the page and reopen settings: the text must persist. Test B must remain unchanged.
9. Enter another edit without saving. Close settings: declining the discard prompt must preserve the edit; accepting it discards only the unsaved edit. Navigating within the app and returning should preserve the still-open settings edit. Reload/closing the tab with unsaved course details should offer the browser's warning.

## 4. Select modules and write a local note

1. Manage Test A. Review the eight module choices: Reading, Notes, Study, Research, Tutoring, Audio, Presentation practice and Subject visuals.
2. Enable **Notes**, **Reading** and **Tutoring**. Each successful selection should be acknowledged.
3. Expect Notes to say it provides a basic local note. Future modules must say they are planned; enabling them must not claim that their tool or a provider connection is ready.
4. Open Test A. Write **This note belongs only to Test A.** in the Notes card. Pause briefly, then reload. The note must remain.
5. Manage Test B and enable Notes. Write **This note belongs only to Test B.** Switch between courses and reload. Notes must remain isolated.
6. Turn Notes off for Test A. Its Notes card must disappear from course home. Turn Notes on again: its saved writing must return.
7. Switch themes and modes while viewing each course. Notes, selected modules and course descriptions must not change. No AI login or paid request should occur.
8. If multiple workspace cards are visible, focus a **Move** button and press Enter; use arrow keys, then Enter to place or Escape to cancel. Try Pin and Reset layout. Switching courses must preserve each course's own layout independently of appearance.

## 5. Export a course

1. Save any unsaved course details. In Test A's settings, click **Export course**.
2. Check the browser's Downloads for `course-<course ID>.json`. The app's message means the download was prepared; verify that the browser actually saved it.
3. Open it in a text editor. Expect `format: collegenotes-course`, `version: 1`, a SHA-256 `dataChecksum`, and the selected course under `data`.
4. Find your saved name, description, Notes selection and Test A note. Test B's note must not appear. In these new test courses, sources should be empty because Phase 6 import is not implemented yet.
5. Expect no connection credentials, credential-reference table or local original-file path field. If you previously had local materials from development, a successful export includes their original bytes as base64 and their checksums; a missing or changed original must produce an error instead of an incomplete success claim.
6. Keep this export for the deletion test. **Import/restore of this JSON file is not implemented in Phase 5**; do not assume it is available.

## 6. Archive and restore

1. Manage Test A and click **Archive course** after saving its details.
2. Expect it to leave Active and appear under Archived. It should no longer offer Open course. Its settings explain that it must be restored before changing modules.
3. Refresh the browser. It must remain archived.
4. Under Archived, export it if desired, then click **Restore course**.
5. Open it from Active. Expect its description, Notes text and module choices to remain. Test B must be unaffected.
6. Repeat an archive/restore cycle after stopping and restarting the service to check durable behavior.

## 7. Permanently delete a throwaway course

1. Use **Phase 5 Duplicate** first. Open its settings and click **Review permanent deletion**.
2. Read the explanation: this removes the course, originals, notes and linked local data; separate exports and backups remain.
3. Type an incorrect name. The final delete button must stay disabled. Type the correct name but leave the backup acknowledgement unchecked: it must remain disabled.
4. Click Cancel. The course must still exist.
5. Reopen the deletion form, type the exact name, acknowledge separate backups, and click **Permanently delete**.
6. Expect the course to disappear. Refresh and restart: it must not return. Test A and Test B must still work.
7. Export Test A before optionally deleting it. After deletion, verify that its downloaded JSON file still exists. The app does not erase separate backups.
8. If deletion reports incomplete cleanup during real use, check **Deletion pending**. That course must not reopen for study. Use **Retry deletion** only after resolving the reported local file problem. You do not need to deliberately corrupt files or database records for manual testing; interrupted cleanup and unsafe-path failures were exercised by synthetic backend tests.

## 8. Service failure and recovery

1. Keep the browser tab open. Edit a throwaway course's description but do not save.
2. Stop the development processes with Control-C in the Terminal.
3. Click Save details in the loaded browser tab. Expect a clear error and your entered text to remain. Never treat an error as a saved result.
4. Restart using the same normal or isolated command from Step 1. Retry Save details. Expect success, then reload and confirm persistence.
5. If the UI itself cannot load because Vite is stopped, restart it before continuing. This phase does not provide an offline installed desktop package.
6. During an outage, preserve any unsaved note text before closing or reloading. Notes save on changes and report failures; failed note writes remain in the current window but are not promised to survive a browser reload.

## 9. Keyboard and VoiceOver review

1. Use Tab and Shift-Tab from the address bar through the app. Verify a visible focus indicator on every control and a working Skip to main content link.
2. Create/edit a throwaway course using only the keyboard. Toggle modules with Space. Use the course filters and search.
3. Open/close course settings. Focus should reach the editor and return sensibly when closed. Complete and cancel deletion using the keyboard.
4. At 200% zoom, verify form labels and confirmation instructions are not clipped and every action remains reachable.
5. With VoiceOver, check input names, headings, module checkbox state, filter pressed state, errors, success messages and delete confirmation. Record any missing or confusing announcement.

## 10. Send your results

Report each defect with:

- Screen and action.
- Expected versus actual result.
- Theme/mode, window size and zoom.
- Whether the problem survives reload or restart.
- A screenshot if useful, with private material removed.

Say explicitly whether you accept the Phase 5 GUI and behavior. A defect reopens Phase 5 for repair. Phase 6 requires a separate instruction; this guide does not authorize it.
