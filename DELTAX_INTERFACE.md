# DeltaX Executive Contract

This file records the authoritative public integration contract supplied for Milestone 1. It defines the boundary, not proprietary mathematics. When no canonical runtime is attached, use a clearly named `DeltaXStub`/`DeltaXReferenceAdapter`; never label stub output as genuine DeltaX.

## Role and causal chain

DeltaX is the bounded executive plane above the connectome-derived substrate. It is not a sensory encoder, recurrent substrate, motor controller, physics simulator, LLM prompt, reward function, or connectome replacement. Preserve: WORLD -> SENSORY INPUT -> CONNECTOME -> CANDIDATE BEHAVIOR -> DELTAX EVALUATION -> EXECUTIVE MODULATION -> ACTION -> CONSEQUENCE. DeltaX must not silently bypass the connectome or directly puppet the body.

## Structured input

Every evaluation accepts extensible structured packets containing: `timestamp`, `run_id`, `step_id`, `objective`, `environment_state_summary`, `substrate_state_summary`, `candidate_actions[]`, `recent_action_history[]`, `recent_outcomes[]`, `expected_state`, `observed_state`, `detected_contradictions[]`, `active_constraints[]`, `identity_state`, `continuity_state`, and `available_executive_actions[]`.

Candidates originate below DeltaX and carry `candidate_id`, `action_class`, `source_population`, `activation_strength`, `persistence`, `supporting_state`, and `conflicting_state`. The adapter does not fabricate neural activity retroactively. Contradictions are first-class and remain in outputs for resolution.

## Outputs

Decision packets use dispositions `PERMIT`, `VETO`, `MODULATE`, `DEFER`, or `ESCALATE` (the demo primarily exercises the first three). Packets contain `decision_id`, timestamp, evaluated/permitted/vetoed candidates, selected disposition, modulation commands, unresolved contradictions, constraint/state references, and provenance. No free-form reasoning is state.

`PERMIT` allows the candidate through the existing downstream motor path; DeltaX does not execute it. `VETO` suppresses it with an observable record. `MODULATE` changes only declared decision-landscape parameters, never actuator commands.

Allowed modulation classes are exploration, persistence, caution, novelty sensitivity, sensory gain, inhibition, urgency, and behavior-switching threshold. Each command records target, parameter, previous/new value, duration, and decision_id. Identity/continuity remains distinct from temporary strategy. Do not reduce coherence to highest-score-wins absent a canonical rule.

## Invariants and hierarchy

Runtime remains inside simulation; no shell access; no unrestricted network; no hidden actuator bypass; no silent substrate mutation; no undeclared external controller; experimenter retains pause/stop/checkpoint/restore/inspect/perturb authority; all interventions are logged. Authority is Experimenter > bounded DeltaX > substrate. DeltaX cannot rewrite arbitrary synapses, directly actuate, alter logs, or grant itself authority.

## Logging and determinism

Every evaluation records observation, substrate state, candidate behaviors, DeltaX input/output packets, intervention, executed action, and environmental result in append-only JSONL. Identical state/input/configuration should reproduce decisions; any stochastic component must be declared and seeded. Adapter transport is separate from executive semantics and can later connect to a canonical local, packaged, service, or embedded runtime.

## Required integration tests

The implementation must cover: connectome-origin (candidates exist before evaluation), veto (cannot reach actuator), permit (normal substrate/motor path), modulation (only declared targets change), provenance (each intervention references decision), replay (deterministic packet reproduction), and bypass (no undocumented arbitrary motor command). The contract adapter and headless tests in `test/` implement these checks. Full canonical DeltaX remains unconnected; this is an honest reference/stub integration only.
