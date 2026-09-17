# Phase 8.4 tutoring receipt

September 17, 2026. AUTH-P8 / CHANGE-P8-BYO. Structured tutor actions use hybrid local context; replies are synthetic-contract grounded text, not live-provider proof.

Explain / example / hint / check-understanding actions validate structured turns. Client request IDs prevent replay duplication. Sessions restore unfinished questions and prior turns. Offline sessions reject cloud turns. Metered budgets enforce `requestEligibility` / spend ceilings. Source, research, and model text remain labeled separately in the UI.

## Checks

- CHK-8.4-01 budget/limit handling
- CHK-8.4-02 no request replay duplication
- CHK-8.4-03 session restore
- CHK-8.4-04 no cloud request in offline mode
- CHK-8.4-05 synthetic provider contracts / tutor evaluation path
