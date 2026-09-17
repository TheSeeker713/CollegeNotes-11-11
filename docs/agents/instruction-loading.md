# Instruction loading checklist

Primary project instructions live in root [`AGENTS.md`](../../AGENTS.md). Cursor project rules live under [`.cursor/rules/`](../../.cursor/rules/) and summarize the same authority for Cursor sessions; they do not override `PROJECT-PLAN.md` or `AGENTS.md`.

Codex discovery reads global and project `AGENTS.md` files down to the working directory, with override files taking precedence. Cursor loads `.cursor/rules/*.mdc` according to `alwaysApply` / `globs`. Start sessions in the repository root and inspect the effective chain. [Official AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md), checked September 9, 2026.

Creating instruction files mid-session does not prove automatic hot-reload. Do not start another agent or alter global settings merely to assert a loading test. Explicit path/read checks are the evidence.

Checklist for each fresh tool session: confirm repository root; find `AGENTS.md`, `.cursor/rules/`, and nested overrides; read current project rules, `project-state/current.json`, `approvals.json`, and the active phase manifest; state the current authorized phase, owner-only UI review, and MyceliaOS gate when relevant; verify local/remote checkpoints before acting. Keep the root file small and use explicit links to guides.

The external image-generation AI receives the standalone design brief/prompts; it needs no repo permissions or coding-agent instruction installation.

## Current authority

[PROJECT-PLAN.md](../../PROJECT-PLAN.md) is the sole scope authority. Active authorization is recorded in `project-state/approvals.json` (currently AUTH-P8 for Phase 8). Owner UI/UX review remains pending and deferred until after Phase 8. See guides under `docs/agents/` and Cursor rules under `.cursor/rules/`.
