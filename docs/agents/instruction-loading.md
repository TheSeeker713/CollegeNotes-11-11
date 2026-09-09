# Instruction loading checklist

Codex is the coding tool used in this pass. Its documented discovery reads global instructions and project instructions down to the working directory, with override files taking precedence. Start future coding sessions in the actual repository and inspect the effective instruction chain, especially nested overrides and size limits. [Official AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md), checked September 9, 2026.

This task began outside the project; therefore the agent explicitly read the repository rules and guides after creating them. Creating AGENTS.md midway through a session does not prove automatic hot-reloading. Do not start another agent or alter global settings merely to assert a loading test. The actual path/read and guide-link checks are the evidence for this pass; automatic discovery must be checked when a future repository-root session starts.

Checklist for each fresh tool session: confirm repository root; find ancestor/nested AGENTS or override files; explicitly read current project rules, state and active manifest; state the allowed phases, image-review gate and forbidden Phase 3; verify local/remote checkpoints before acting. Keep the root file small and use explicit links to guides.

Other coding tools have not been selected or tested in this pass. Do not claim Cursor or another tool loads these files automatically. The external image-generation AI receives the standalone design brief/prompts; it needs no repo permissions or coding-agent instruction installation.
