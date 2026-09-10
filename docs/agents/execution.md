# Execution

Start with AGENTS.md, current.json, approvals.json, active phase manifest and latest checkpoint. Verify working directory, Git changes and remote before mutation. Preserve unrelated changes. Resolve user direction before secondary references. Work only within the current authorization's pass and phase limits.

Before each step, freeze its acceptance/check IDs from the manifest. Implement, verify, then audit in distinct passes. Any failed/missing required result means repairing or blocked, never complete. Repair checks only when their implementation is wrong; record justification and repeat affected checks. A changed requirement, budget, provider or design decision needs the user's actual direction.

After the gate, bind a source fingerprint to the evidence, commit, push and compare the remote SHA. Do not advance if push fails. Record complete only after the receipt; avoid recursive claims that a commit contains its own SHA. An incomplete design handoff can be committed as work-in-progress, explicitly without completing its step or advancing to the next one.

Every phase normally requires user approval. The current AUTH-REPAIR-0-4 explicitly permits repair execution through Phase 4; it does not fabricate design acceptance. Owner UI/UX review follows the repair implementation, as the latest user instruction directs.

Approval records quote or identify actual user messages. A validator cannot grant authority or prove a quote is authentic; the agent audits it against the conversation. GitHub cannot grant phase approval. No CI or PR gate is introduced.

## Current repair pass

[PROJECT-PLAN.md](../../PROJECT-PLAN.md) is the sole scope authority. AUTH-REPAIR-0-4 and AUTH-REPAIR-PUSH authorize the bounded repairs through Phase 4 and existing-repository pushes. Older pass restrictions are historical. UI/UX testing and rendered-design review belong exclusively to the owner; agents perform source audits and non-UI engineering checks. Manual acceptance remains pending through the repair implementation. Phase 5 needs the owner's green light. See [repair manifest](../phases/repair-0-4.json).
