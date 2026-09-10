# Execution

Start with AGENTS.md, current.json, approvals.json, active phase manifest and latest checkpoint. Verify working directory, Git changes and remote before mutation. Preserve unrelated changes. Resolve user direction before secondary references. Work only within the current authorization's pass and phase limits.

Before each step, freeze its acceptance/check IDs from the manifest. Implement, verify, then audit in distinct passes. Any failed/missing required result means repairing or blocked, never complete. Repair checks only when their implementation is wrong; record justification and repeat affected checks. A changed requirement, budget, provider or design decision needs the user's actual direction.

After the gate, bind a source fingerprint to the evidence, commit, push and compare the remote SHA. Do not advance if push fails. Record complete only after the receipt; avoid recursive claims that a commit contains its own SHA. An incomplete design handoff can be committed as work-in-progress, explicitly without completing its step or advancing to the next one.

Every phase normally ends for explicit user approval. AUTH-1-2 permits this pass to proceed from completed Phase 1 to Phase 2 without another question. This is authorization to execute, not an invented manual acceptance. Phase 3 remains forbidden. Phase 2 requires images from the other AI, rendered-design checks and user review; prompts alone do not complete it.

Approval records quote or identify actual user messages. A validator cannot grant authority or prove a quote is authentic; the agent audits it against the conversation. GitHub cannot grant phase approval. No CI or PR gate is introduced.

## Current recovery pass

AUTH-P4 authorizes Phase 4 only. Execute steps 4.1–4.4. Stop at Phase 4 completion. Do not begin Phase 5.
