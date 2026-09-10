# Step 4.3 — local gate

Loopback service rejects bad origins and traversal, validates malformed bodies, cancels jobs without deleting originals, and does not duplicate completed fingerprints. 5/5 required checks passed.

- CHK-4.3-01: origin 403 and `../` path 400
- CHK-4.3-02: empty name and invalid job body 400
- CHK-4.3-03: cancel queued job
- CHK-4.3-04: same fingerprint returns the completed job
- CHK-4.3-05: original bytes remain after cancel

Prerequisite: Step 4.2 `22e16ca220d828444d295e545dd0fb0a965d77f0`. Checkpoint pending. No Phase 5.
