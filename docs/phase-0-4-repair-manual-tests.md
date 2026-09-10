# Phase 0–4 repair — manual UI/UX testing

September 10, 2026. These tasks are for the owner only. No AI agent has performed them. Use this checklist with the repair implementation checkpoint recorded in `docs/phases/repair-final-receipt.md`. Report defects before giving the Phase 5 green light.

## 1. Start an isolated review copy

In Terminal:

```sh
cd ~/Developer/CollegeNotes
export PATH="$PWD/.local/runtime/node/bin:$PATH"
export COLLEGENOTES_DATA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/collegenotes-review.XXXXXX")"
printf 'Review data directory: %s\n' "$COLLEGENOTES_DATA_DIR"
git rev-parse HEAD
npm run build
npm run dev
```

Keep this terminal running. The temporary data directory keeps this review separate from normal Application Support data. Save its displayed path if you want to resume after closing Terminal. No real documents or credentials are needed.

Open a new private browser window at **http://127.0.0.1:5173**. Use the same private window and same temporary directory throughout the review. If port 4781 or 5173 is occupied, stop the older CollegeNotes launch from its own terminal and retry. Do not change only the service port: this client expects 4781.

Expected: the local workspace loads, no real course is preloaded, no AI account is connected, and Botanical Light is the initial appearance.

## 2. Create and revisit empty courses

1. Create a course named **Review Alpha**.
2. Confirm its title is correct and there is no syllabus, assignment, sample course content or invented progress.
3. Type **Alpha note — keep this text** in the Your note card. Allow the save request to finish before leaving.
4. Open **Courses**, choose **Create course**, and create **Review Beta**.
5. Confirm Beta's note is empty. Type **Beta note — separate course**.
6. Use Courses to open Alpha again. Confirm its original note remains and Beta's note does not appear there.
7. Reload and confirm Alpha's note still appears.

Expected: both courses remain separate. The Courses screen explicitly says editing, archive, export and deletion are unavailable in this foundation build. Those full operations belong to Phase 5 and are not expected to work yet.

## 3. Inspect the foundation routes

1. Open Courses, Connections and Research from navigation.
2. In Connections, confirm all four choices appear: OpenAI/ChatGPT, xAI/Grok, Anthropic/Claude and Google/Gemini.
3. Confirm the screen says no service is connected and connection setup is unavailable in this build.
4. Confirm xAI/Anthropic account sign-in is described as unavailable until an official integration route is verified. API access must not be described as paid for by a subscription.
5. Confirm Research clearly explains that no live research is available yet and that future requests require provider/query/course/private-context choices.
6. Open Sources, Study, Practice, Requirements and Progress inside a course. Confirm empty states remain honest and do not display imported or generated material that you did not add.

Do not enter API keys or attempt provider sign-in: live connection controls are not implemented in this repair.

## 4. Test the four appearance variants

1. Open Settings and choose Botanical Organic Glass, then switch Light/Dark.
2. Choose Brutalist Glass Lab and inspect Light/Dark.
3. Change density, reduced motion and reduced transparency.
4. Return to the course and confirm your note and selected course remain intact.
5. Reload and confirm appearance persists.
6. Use Reset appearance. Confirm Botanical Light returns without deleting notes or courses.

Record unreadable text, weak focus indicators, clipping, excessive transparency or surprising resets. Agent type/lint checks do not establish visual quality.

## 5. Test keyboard and card controls

1. Use Tab from the top of the page. Activate Skip to main content; it should move focus without losing your course/route.
2. Navigate using keyboard only. Confirm focus is visible and the order is understandable.
3. On a card's Move control, press Enter, then arrow keys, then Enter to place.
4. Repeat and press Escape to cancel. Verify the previous arrangement returns.
5. Pin a card and verify the keyboard move action does not move the pinned card. Unpin it and try again.
6. Use Reset layout. Confirm writing remains intact.
7. At a window size where the Menu button is shown, open it, move focus into navigation and press Escape. Confirm it closes and focus returns to Menu.

Pointer drag/free-placement behavior is not established by this checklist; report anything in the current controls that suggests unsupported behavior.

## 6. Test restart and route recovery

1. Leave Alpha on Study with a note saved.
2. Close the browser tab and reopen **http://127.0.0.1:5173** with no route fragment. Confirm the saved course/route returns.
3. In the launch terminal press Control-C. Run `npm run dev` again in the same terminal, retaining the same review data directory.
4. Reload and confirm courses, notes and appearance persist.
5. Visit **http://127.0.0.1:5173/#/not-a-real-route**. Confirm a recovery notice and a usable home screen; your notes should remain intact.

If you restart Terminal, restore COLLEGENOTES_DATA_DIR to the path saved in step 1; creating another temporary directory intentionally starts empty.

## 7. Review desktop resizing and accessibility

1. Inspect the app at approximately 1440×900 and 1024×700.
2. Set browser zoom to 200%. Reach all navigation, fields, settings and relevant card controls.
3. Check that text, focus and controls are not obscured and that content remains readable.
4. If you use VoiceOver, verify headings, navigation, form labels, button names and recovery notices are understandable.
5. Repeat key checks in both themes and both modes, with reduced motion enabled.

Record failures with the route, theme/mode, window size, action and expected/actual result. Screenshots are optional owner evidence; keep any private content out of public history.

## 8. Review the revised design candidate

From another terminal:

```sh
cd ~/Developer/CollegeNotes
open docs/design/repair/index.html
```

This is a design gallery, not the application. Only its theme/mode selectors, navigation links and disclosure panels are interactive; other behavior is specified as planned states.

1. Inspect all 15 numbered states and expand each recovery panel.
2. Review course rename/edit/archive/restore/export/delete and destructive confirmation semantics.
3. Review material import/correction/original preservation/export/trash/permanent-delete and derivative cleanup states.
4. Review provider/capability toggles, API versus verified account access, defaults, billing limits, disconnect/removal and cleanup failures.
5. Review research source dates, excerpts, claim links, conflicts, export/deletion and private-context consent.
6. Confirm these preserve your intended visual direction and product scope.

## 9. Return your decision

Provide the tested commit, failed task numbers, expected versus actual behavior, and your design feedback. A green light should explicitly approve proceeding to Phase 5. Until then, Phase 5 remains unstarted. Reported defects reopen the current repair; the agent must not substitute its own UI/UX approval.

Stop the review launch with Control-C. Keep the review data directory if you need further investigation; there is no need to delete it now.
