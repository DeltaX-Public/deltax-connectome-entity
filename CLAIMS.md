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

## Phase 8 claim boundary

The causal-intervention harness demonstrates causal intervention on this implemented computational model only. It does **not** demonstrate, identify, or claim biological memory traces, biological adaptation, or organism-level causality. The stub path reports measurable packet divergence under population silence and recovery after restore; these are computational replay results. DeltaX remains the executive authority and the substrate is limited to proposals recorded before DeltaX.

## Entity Observatory scope (phase 10)

The Entity Observatory is a polished, secondary view over available harness artifacts. It is not a full connectome viewer and does not claim to expose internal DeltaX reasoning. SUBSTRATE values are summaries only. DELTAX values are displayed from ledger fields when available, with `executive_source` explicitly shown as `canonical_api`, `stub`, or `disabled`; stub output is not genuine DeltaX. The experiment controls are an honest local observatory surface and export path; headless harness artifacts and tests remain authoritative.

## Phase II Causal Integrity Pass & Claim Boundaries

1. **Superseded Initial Claims (`superseded_pre_integrity_pass`):**  
   Initial reports claiming +100.0% goal completion lift on seeds 200..224 were achieved with post-DeltaX actuator shortcuts (`MODULATE -> forward`, `PERMIT -> forward`, `blocked -> left`). Following rigorous audit, all actuator shortcuts were excised, and initial 100% lift claims are formally designated as `superseded_pre_integrity_pass`.

2. **Strict Causal Sequence:**  
   Under the corrected causal architecture, every physical action executed by the body must strictly originate from an explicit substrate candidate present in the pre-evaluation candidate field (`connectome activity -> substrate candidates -> DeltaX governance -> permitted candidate set -> candidate selection -> actuator`).

3. **Candidate Provenance Typing:**  
   Every candidate is explicitly typed as `MEASURED_NEURAL` (direct descending neuron readouts), `DERIVED_NEURAL` (antagonistic balance/posture derivation), or `FALLBACK` (`cand_safe_noop`). No candidate may be injected or selected outside this set.

4. **Biological Multi-Synaptic Latency:**  
   In the intact 165,122-neuron connectome graph, sensory signals require 4–5 simulation steps (~40–50 ms) to traverse sensory afferents and intermediate interneurons before descending locomotor command neurons (`DNg100/97/p09`) overcome postural balance suppression (`halt`). Within a 12-step budget, the intact biological entity naturally pauses before walking forward, reaching $x=7$ or $x=8$ (near goal) before time expires.

5. **Degree-Preserving Circuit Scrambling Control:**  
   The `SHUFFLED_CONNECTOME` control preserves exact in-degrees, out-degrees, and weight distributions while swapping 100% of synaptic edges. Because randomized connections bypass multi-layer interneuron delay lines, sensory inputs immediately trigger descending motor neurons from step 1, sprinting forward blindly without biological latency.

## Phase III Long-Horizon Adaptation & Recurrence Claim Boundaries (Audited V2)

1. **Superseded Pre-Audit Claims:**  
   Initial reports claiming 100% EXECUTIVE recovery and a 2-hazard / 4-energy memory advantage on seeds 3000..3024 were achieved with harness-side steering overrides on `cand_halt` and coordinate checks at `x=3`. Following an adversarial methodological audit (documented in `docs/PHASE_3_PROTOCOL_DEVIATIONS.md`), these initial results are formally designated as superseded and archived under `artifacts/changed_world/phase3_pre_integrity_audit/`.

2. **Collision Prevention via Safe Halting (Confirmed):**  
   Under unassisted causal governance without harness overrides, DeltaX closed-loop governance (`EXECUTIVE`) reliably prevents repeated wall collisions upon unexpected blockage by selecting `cand_halt` (`disposition: PERMIT`), incurring 0.0 ± 0.0 collisions in Trial 2 (compared to 21 collisions in scrambled connectome controls).

3. **Autonomous Bypass Traversal (Not Established):**  
   Under unassisted candidate selection without harness steering heuristics, DeltaX candidate evaluation does not autonomously steer the entity through bypass corridors to reach the goal. Across 100 unseen held-out seeds (4000..4099), goal attainment is 0.0% [0.0–3.7%] across all conditions.

4. **Cross-Trial Spatial Foresight (Null Difference):**  
   Under strict unassisted evaluation, retained executive state in Trial 2 produces no anticipatory pre-turns or hazard reductions compared to reset executive state (paired hazard diff: 0.0 ± 0.0, Cohen's d: 0.0). Retained memory does not confer 2D grid pathfinding foresight.

5. **Observer Non-Contamination (Verified):**  
   `CONTROL` and `OBSERVE` conditions achieve 100.00% action trajectory parity across all 100 held-out evaluation seeds (4000..4099), proving that DeltaX ephemeral observation causes zero physical or neural actuation side-effects.
