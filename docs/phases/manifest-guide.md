# Manifest and state protocol

phase-00.json through phase-14.json retain the controlling plan's work, deliverables and required check wording for all 60 steps. Each check clause has a stable CHK ID and a matching AC criterion. CP identifies the commit/push/remote gate. Prerequisites name the previous step; phase entry separately requires actual authorization. No manifest activates itself.

User amendments outrank retained original wording. CHANGE-INPUTS removes historical screenshot/private-document development prerequisites throughout all phases; use safe known-answer fixtures and let the user import real course materials through the finished app. AUTH-1-2 permits this one pass's 1→2 transition and adds the external-image requirement to 2.3/2.4. Phase 3 remains prohibited. Prompts are preparatory work, not rendered-design evidence.

requirement-to-step.json maps all 28 requirements to concrete implementation and acceptance IDs, including final acceptance in 14.3. A check clause may need multiple runnable cases in Phase 3: expand its case manifest before implementation and do not drop any behavior while translating it. Manifests describe obligations, not past test results.

current.json is the active snapshot. approvals.json records only actual messages. state.schema.json specifies field types; record-formats.json defines approval, defect and evidence contracts without fake populated examples. An agent reviews quoted-message authenticity; the validator can detect missing or inconsistent references but cannot prove a user sent text.

Run `node scripts/validate-project.mjs` for structural checks and source hashes. `state-rules.mjs` rejects invalid state transitions, incomplete evidence and missing authorization. The later production runner must execute real commands, inspect report content/hashes and then use these rules; authored pass fields are not execution evidence. Synthetic rehearsals are isolated from real step reports.

At completion, compare the tested tree to the commit and its remote receipt. Step snapshots may say checkpoint_pending before their push; the later state/receipt records completion. Preserve history and detailed private reports. A WIP design handoff does not satisfy CP or authorize the next step.
