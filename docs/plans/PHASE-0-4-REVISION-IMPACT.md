# Phase 0–4 Revision Impact and Repair Plan

Version 1.0 · September 10, 2026

Status: proposal only; no repair work is authorized

## Purpose and limit

This document covers only Phases 0, 1, 2, 3, and 4 because those are the phases with recorded work. It does not assess, redesign, or authorize any untouched phase. The official product direction is in [PROJECT-PLAN.md](../../PROJECT-PLAN.md).

The owner authorized this impact analysis and plan revision, not application-code changes, dependency changes, data migrations, or phase implementation.

## Revision that causes the impact

The corrected product direction is:

- no Presentation/COMM 110 course or course material embedded in the product;
- an empty app where the user creates course modules and imports material;
- complete course/material lifecycle planning, including import, edit or correction, export, archive where appropriate, and deletion;
- a removable provider-neutral AI system rather than a ChatGPT-only design;
- OpenAI, xAI, Anthropic, Google, and later providers presented through capability adapters;
- API credential import and officially supported OAuth/account connection options;
- provider-level and capability-level enable/disable controls;
- local embeddings and explicit, provenance-preserving internet research;
- owner-only authority to change official product scope and planning rules.

## What the current implementation actually contains

Read-only inspection of the existing Phase 4 source found:

- no `COMM 110` or Presentation-course content in `apps/` or `packages/`;
- first use creates an empty course with a user-entered name;
- course records currently contain only ID, name, and creation time;
- the local API currently supports listing and creating courses, not the full edit/archive/export/delete lifecycle;
- imported originals are course-scoped, but complete user-facing material export/edit/delete behavior is not present;
- the provider package currently models only generic tutor, narration, and recognition availability and its documentation emphasizes ChatGPT;
- no live OpenAI, xAI, Anthropic, or Google connection is currently implemented;
- no application code was changed during this analysis.

This means the existing shell is not contaminated with embedded Presentation content, but its contracts are too small for the corrected lifecycle and multi-provider direction.

## Phase-by-phase impact

### Phase 0 — materially impacted

What remains useful:

- local macOS/browser-development boundary;
- local-first privacy and loopback service direction;
- core React/TypeScript/Node/SQLite stack research;
- testing and evidence principles.

What is malformed or incomplete:

- the old plan described COMM 110 as the initial built-in class;
- ChatGPT was selected too narrowly as the principal tutor route;
- provider research did not establish a complete removable multi-provider system;
- material export and deletion were not stated as first-class requirements;
- the documentation hierarchy allowed technical projections to obscure the human plan;
- plan-change authority was not stated strongly enough.

Proposed repair outcome:

- accept `PROJECT-PLAN.md` as the sole scope authority;
- rewrite the Phase 0 requirement register and provider decision record from that plan;
- classify each provider authentication path as verified, experimental, API-only, unavailable, or awaiting owner decision;
- retain the compatible stack decision unless a fresh dependency review finds a concrete reason to amend it.

### Phase 1 — materially impacted

What remains useful:

- workspace structure and package separation;
- local validation scripts and repository workflow;
- domain/storage/provider package boundaries;
- private-evidence and secret-exclusion rules.

What is malformed or incomplete:

- agent instructions point to a fragmented collection instead of one clear human plan;
- machine-readable requirements can appear to have authority equal to the owner;
- course, material, connection, provider-capability, export, and deletion contracts are incomplete in planning;
- provider extension and credential-removal acceptance tests are not fully specified.

Proposed repair outcome:

- make every agent entry point name `PROJECT-PLAN.md` as the controlling source;
- mark generated manifests and old private plans as subordinate or historical;
- revise domain and acceptance specifications for user-created courses, full material lifecycle, provider connections, and removal;
- add a rule that agents may propose plan changes but may write them only on explicit owner direction.

### Phase 2 — materially impacted

What remains useful:

- the two selected visual themes and Light/Dark variants;
- desktop accessibility, focus, keyboard, recovery, density, and reduced-motion work;
- empty states and source-versus-user-writing separation;
- the reviewed image set as visual reference material.

What is malformed or incomplete:

- designs and prompts used Presentation/COMM 110 examples too prominently, creating the appearance of embedded product content;
- the design does not fully cover course rename/archive/export/delete;
- the material lifecycle lacks complete edit/export/delete and derivative-cleanup states;
- Connections lacks a complete provider list, API/OAuth choice, capability toggles, disconnect, and remove-service flow;
- research provenance, provider switching, cost disclosure, and private-context consent need full desktop states;
- old phone/narrow captures remain historical but are not current requirements.

Proposed repair outcome:

- keep the visual language while replacing course-specific production assumptions with empty and synthetic course-neutral examples;
- design the complete course/material lifecycle and destructive-action confirmations;
- design provider cards for OpenAI, xAI, Anthropic, Google, and custom providers;
- design API-key and verified OAuth flows, capability toggles, provider defaults, revoke/remove, errors, limits, and cost warnings;
- design research sessions with sources, dates, claim links, conflicts, export, and deletion;
- obtain explicit owner review of the revised desktop design before Phase 2 can be treated as aligned.

### Phase 3 — moderately impacted

What remains useful:

- installed compatible project stack and workspace lockfile;
- local build, type, lint, unit, integration, browser, accessibility, and evaluation harnesses;
- parser libraries and offline worker bundling;
- reproducible local startup.

What is malformed or incomplete:

- provider interfaces were shaped around tutor/narration/recognition kinds rather than provider identity plus independent capabilities;
- no credential-store abstraction or OAuth callback test harness is established;
- adapter tests do not yet cover provider removal, capability toggles, API-vs-OAuth selection, or secret redaction;
- current provider SDK/auth requirements must be researched at repair time; no SDK should be added merely because a vendor is named.

Proposed repair outcome:

- preserve the working dependency foundation;
- amend interfaces and tests before adding vendor SDKs;
- prefer standards-based HTTP/OAuth adapters when practical;
- add dependencies only after an owner-approved compatibility, security, licensing, and necessity review;
- verify the entire existing Phase 3 suite after any dependency or harness change.

### Phase 4 — materially impacted and currently not acceptable as complete

What remains useful:

- loopback Fastify service and origin/path protections;
- SQLite migration framework and local data directory;
- empty course creation rather than a seeded real class;
- source-file ownership, checksum, job, appearance, layout, draft, and session foundations;
- desktop shell and recovery behavior.

What is malformed or incomplete:

- the `Course` contract has no rename, archive, restore, export, or deletion state;
- material records have no complete edit/correction, export, soft-delete/permanent-delete, or derivative invalidation contract;
- provider contracts describe capability kinds but not provider identity, authentication methods, enabled state, removable configuration, model choices, cost/limit state, or health;
- no credential-store boundary or connection registry exists;
- routing and settings do not yet include complete Courses, Connections, and Research foundations;
- Phase 4 was recorded as complete under superseded planning and therefore requires a scoped repair and fresh audit.

Proposed repair outcome:

- revise foundational domain contracts and migrations without implementing untouched feature phases;
- add neutral entities/interfaces for course lifecycle, material lifecycle, provider definition, connection, credential reference, capability assignment, research session/source, and embedding index metadata;
- add shell routes and honest empty states only to the extent required for a stable foundation;
- preserve existing user data through forward-only migrations;
- rerun every affected Phase 4 test plus integrated build/type/lint/unit/integration/browser/accessibility checks;
- present the repaired shell to the owner and do not begin another phase.

## Recommended repair sequence

No item below is authorized until the owner explicitly approves a repair pass and its boundary.

1. **Owner accepts or corrects the official plan.** Do not repair code against an unapproved interpretation.
2. **Repair Phase 0 planning.** Consolidate requirements and provider facts under the official plan; record unresolved provider authentication decisions honestly.
3. **Repair Phase 1 governance and specifications.** Make the official plan authoritative and update subordinate machine-readable contracts and tests.
4. **Repair Phase 2 design.** Produce desktop designs for empty/user-created courses, complete data lifecycle, Connections, and Research; obtain owner review.
5. **Review Phase 3 foundation.** Change only interfaces, harnesses, or dependencies required by the accepted design and provider decisions; rerun the complete foundation suite.
6. **Repair Phase 4 foundation.** Implement only the cross-cutting contracts, migrations, settings/routes, and recovery needed to support the corrected product direction.
7. **Audit Phases 0–4 together.** Confirm no embedded real course content, no mandatory OpenAI dependency, no secret leakage, no destructive migration, and no false provider claims.
8. **Request owner acceptance.** Stop. Do not begin or redesign any untouched phase as part of this repair pass.

## Suggested authorization boundary

The safest implementation authorization would name one repair stage at a time. At minimum, it should state:

- which impacted phase or repair stage is authorized;
- whether documentation, design, dependency, migration, and application-code changes are included;
- whether real provider login testing is allowed;
- whether new dependencies or model downloads are allowed;
- the required stopping point and user-review artifact.

Silence, plan approval, or approval of an earlier repair stage does not authorize the next one.
