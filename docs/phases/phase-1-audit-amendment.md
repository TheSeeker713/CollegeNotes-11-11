# Phase 1 validator maintenance during final handoff

The final audit found that the validator fixed the approval-record count at three and the schema fixed Phase 3's flag permanently to false. Those rules reflected the current pass but would incorrectly reject a later genuine owner decision. The current scope has not changed.

Repair: allow additional attributed unique approval records, and check the active state's allowed phases against the actual referenced authorization. Phase 3 remains rejected under AUTH-1-2; changing a state flag or adding Phase 3 to the local phase list cannot grant access. A later actual Phase 3 authorization must be a new user decision, with the previous phase accepted.

Added two synthetic negative/positive controls for expanded phase scope and a genuinely separate future authorization. The rehearsal suite now has 44 cases. Rerun planning validation and all 44 cases against the repaired source; retain the original 42-case checkpoint as historical evidence. This amends the Phase 1 validation implementation, not the owner's phase permissions. No Phase 3 work is authorized or executed.
