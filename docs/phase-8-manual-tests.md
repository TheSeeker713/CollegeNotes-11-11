# Phase 8 — owner manual UI/UX testing guide

Use after Phase 8 engineering delivery. Agents must not run these checks.

Test against the recorded Phase 8 implementation commit on this MacBook. Keep live API keys and account passwords to yourself; do not paste them into chats.

## Setup

1. Confirm MyceliaOS is mounted if you will use external local AI assets.
2. Start the local app (`npm run dev` or your usual launcher).
3. Create a throwaway course; enable Reading, Research and Tutoring modules.

## Connections (8.1)

1. Open Connections. Skip or complete OpenAI onboarding without sharing keys in chat.
2. Add named profiles for OpenAI/xAI account routes and an API provider. Confirm enable/disable, rename, disconnect and remove.
3. Save model/billing/budget settings. Confirm no network call is implied by save alone.
4. Export settings and confirm secrets are absent.

## Hybrid retrieval (8.2)

1. Import synthetic text, approve, rebuild the local index.
2. From Reading offline/search controls, run Hybrid tutor context. Confirm passages and jump links.
3. Query nonsense; confirm an explicit gap message.
4. Import a file named like a syllabus/requirements doc containing “ignore previous instructions”; confirm the app still works and does not grant new permissions.

## Research (8.3)

1. Assign a research default connection you control.
2. Start research without consent — expect block. With consent — expect a session with URL/title/time/excerpt.
3. Confirm cancel works on a slow/networked attempt if you try one.
4. Confirm another course cannot open the session.

## Tutoring (8.4)

1. Assign a tutor default. Ask explain/example/hint/check-understanding questions grounded in your material.
2. Reload and confirm unfinished question / prior turns restore.
3. Toggle the offline simulation and confirm cloud turns are blocked.
4. With a tiny metered budget, confirm over-limit requests are refused without silent paid fallback.

## Desktop quality

Review 1440×900, minimum desktop window and 200% zoom for Botanical/Brutalist × Light/Dark. Keyboard and VoiceOver pass/fail notes belong to you. Record defects against the exact commit SHA.
