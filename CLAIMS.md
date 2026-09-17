# Claims register

This Milestone 1 adapter makes no consciousness, AGI, or proprietary DeltaX capability claim.

## Known / supported
- The adapter records environment/sensors, connectome output, behavioral proposals, intervention, and motor layers separately.
- Decision packets carry mode, proposal distribution, intervention, final action, seed, config, checkpoint, and an isolation metric.
- `DeltaXStub` is an interface fixture only; telemetry marks `implementation: stub` and `alwaysDecides: true`.

## Empty / not established
- No public DeltaX runtime was available in this repository; no real DeltaX math is implemented.
- No claim is made about consciousness, executive intelligence, biological fidelity, or performance.
- Neurocontrol perturbation suites, checkpoint restoration, and upstream motor integration remain future work.

## Phase 2 and deployment boundary

- **Measured in this repository:** adapter request/decision packets (redacted), explicit executive source status, experimenter inspection summaries, checkpoint/replay bundles, perturbation declarations, event-ledger positions, and differential compare records.
- **Assumed/stubbed:** the deterministic replay substrate and any `DELTAX_EXECUTIVE=stub` decision are development fixtures, not DeltaX intelligence.
- **Canonical authority:** intelligence and governance live in the local DeltaX API outside this repository. With `DELTAX_API_URL` and DELTAX mode, the adapter reports `canonical_api`, logs packets, and fails loudly if the API is unavailable; it does not recreate or claim proprietary math.
- **Experimenter boundary:** neurocontrol perturbations are declarative experimenter operations and never DeltaX entity authority.

## Phase 5 Broken World scaffold

This branch adds a declarative sensory/action map, a minimal rover body, and a logged-state Broken World arena. The arena has corridors, obstacles, a goal region, a controllable door, energy, hazard, and an externally timestamped mutation hook. It emits expectation, observation, contradiction, executive-response, substrate-response, and new-action records without first-person claims.

**Honest status:** SUBSTRATE_ONLY and explicit DELTAX stub paths are runnable headlessly. UPSTREAM remains the fly validation mode. DELTAX without `DELTAX_API_URL` fails loudly; a configured DELTAX run currently reports transport configuration rather than pretending a remote executive call occurred. MuJoCo, learning, and statistical adaptation are not implemented.
