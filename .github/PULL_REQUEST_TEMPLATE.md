## Description & Purpose

Briefly explain the motivation, context, and changes introduced in this PR.

---

## Research Governance & Integrity Checklist

Please verify and check each item prior to requesting review:

### 1. Causal Integrity & Experimental Boundaries
- [ ] **Substrate Primacy:** All actuator commands originate strictly from pre-evaluation substrate candidates.
- [ ] **No Harness Cheats:** No post-DeltaX steering overrides, route heuristics, or forced commands were introduced.
- [ ] **Symmetric Controls:** Control conditions (`CONTROL`, `OBSERVE`, `STATIC_GUARD`, `SHUFFLED`) remain unassisted and identical in physics.
- [ ] **Evidence Invalidation:** If existing benchmark results or claims are altered, prior frozen baselines are preserved and protocol deviation documents are updated.

### 2. Public / Private Repository Boundaries
- [ ] **Zero Private Runtime:** No proprietary DeltaX Python runtime code (`deltax-python-runtime`) is included.
- [ ] **Zero Absolute Local Paths:** No developer filesystem paths or local private directories are committed.
- [ ] **Zero Credentials:** No API keys, personal access tokens, private keys, or secrets are present.

### 3. Verification & Testing
- [ ] **Public-Safe Test Suite:** `node --test test/*.test.mjs` passed cleanly.
- [ ] **Local Runtime Verified:** (If touching closed loop) Verified locally against `deltax_local_provider` with multi-session isolation.
- [ ] **Artifacts Validated:** All newly generated JSON artifacts parse without schema errors.

---

## Related Issues / PRs

- Closes #
- Follows #
