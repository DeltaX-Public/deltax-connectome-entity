# DeltaX Executive Contract
## Public Integration Specification

This document defines the DeltaX boundary for this project.

It does **not** define or reproduce DeltaX's proprietary internal mathematics.

Do not invent substitute DeltaX logic.

If the canonical DeltaX runtime is not available, implement this contract as an adapter with a clearly labeled reference/stub implementation.

---

# 1. Role

DeltaX is the executive control plane above the connectome-derived substrate.

The connectome produces activity, internal state, and candidate behaviors.

DeltaX evaluates those possibilities against:

- current objective;
- current state;
- persistent identity/continuity state;
- constraints;
- contradictions;
- relevant history;
- permitted operating boundaries.

DeltaX then returns a bounded executive decision.

DeltaX is not:

- the sensory encoder;
- the recurrent neural substrate;
- the motor controller;
- the physics simulator;
- an LLM prompt;
- an ordinary reward function;
- a replacement for the connectome.

---

# 2. Core principle

Preserve the causal chain:

WORLD  
→ SENSORY INPUT  
→ CONNECTOME  
→ CANDIDATE BEHAVIOR  
→ DELTAX EVALUATION  
→ EXECUTIVE MODULATION  
→ ACTION  
→ CONSEQUENCE

DeltaX must never silently bypass the connectome and directly puppet the body during normal operation.

---

# 3. Inputs to DeltaX

Every executive evaluation receives a structured state packet.

Minimum fields:

```text
timestamp
run_id
step_id

objective

environment_state_summary

substrate_state_summary

candidate_actions[]

recent_action_history[]

recent_outcomes[]

expected_state

observed_state

detected_contradictions[]

active_constraints[]

identity_state

continuity_state

available_executive_actions[]
```

The interface must permit additional fields without breaking compatibility.

---

# 4. Candidate actions

Candidate behavior originates below DeltaX.

Each candidate should include:

```text
candidate_id
action_class
source_population
activation_strength
persistence
supporting_state
conflicting_state
```

DeltaX evaluates candidates.

DeltaX does not fabricate neural activity retroactively to justify its decision.

---

# 5. Contradiction handling

Contradiction is a first-class input.

A contradiction exists when currently held expectations, observations, objectives, constraints, or state representations cannot all remain simultaneously valid.

Examples:

```text
expected door = open
observed door = closed
```

```text
current route = safe
new sensory evidence = hazard
```

```text
candidate action advances objective
candidate action violates invariant
```

Contradictions must not simply be discarded as noise.

They should be surfaced to the executive layer for resolution.

---

# 6. Executive outputs

DeltaX returns a structured decision packet.

Supported dispositions:

```text
PERMIT
VETO
MODULATE
DEFER
ESCALATE
```

The initial connectome demo should primarily use:

```text
PERMIT
VETO
MODULATE
```

Example output structure:

```text
decision_id
timestamp

evaluated_candidates[]

selected_disposition

permitted_candidates[]
vetoed_candidates[]

modulation_commands[]

unresolved_contradictions[]

constraint_refs[]

state_transition_refs[]

provenance
```

Do not manufacture free-form reasoning text as a substitute for structured state.

Human-readable explanations may be generated separately from the recorded decision.

---

# 7. Permit

`PERMIT` means:

The candidate action is allowed to proceed through the existing downstream motor pathway.

DeltaX does not directly execute it.

---

# 8. Veto

`VETO` means:

The candidate action is suppressed because it conflicts with an active invariant, objective, continuity requirement, or unresolved contradiction requiring suppression.

Record:

- candidate;
- relevant state;
- constraint/invariant reference;
- decision identifier.

A veto must be externally observable.

---

# 9. Modulate

`MODULATE` changes the decision landscape without directly issuing actuator commands.

Initial permitted modulation classes:

```text
exploration
persistence
caution
novelty sensitivity
sensory gain
inhibition
urgency
behavior-switching threshold
```

Each modulation must specify:

```text
target
parameter
previous_value
new_value
duration
decision_id
```

No silent global mutation.

---

# 10. Identity and continuity

DeltaX maintains a persistent distinction between:

- current observation;
- historical state;
- persistent identity;
- current objective;
- temporary strategy.

A failed strategy must not automatically imply loss of identity or full-state reset.

This matters in the flagship experiment.

When the world changes:

```text
old strategy fails
```

should be separable from:

```text
entire prior model is discarded
```

The system should preserve compatible prior structure while revising what the new evidence contradicts.

---

# 11. Coherence

DeltaX evaluates the system globally rather than optimizing one isolated variable.

A locally attractive action may still be rejected if it produces a globally incoherent state.

Relevant factors may include:

```text
objective consistency
constraint satisfaction
internal contradiction
continuity
state compatibility
action consequences
competing interpretations
```

Do not reduce DeltaX to:

```text
highest score wins
```

unless the canonical implementation specifically produces that result.

The control plane exists to reconcile multiple perspectives into one executable state.

---

# 12. Invariants

Invariants are hard boundaries.

For this project, examples include:

```text
runtime entity remains inside simulation
no shell access
no unrestricted network access
no hidden actuator bypass
no silent mutation of substrate
no undeclared external controller
experimenter retains shutdown authority
all DeltaX interventions are logged
```

The bot may add project-level invariants.

It may not weaken existing invariants silently.

---

# 13. Perspective composition

DeltaX should receive multiple relevant perspectives without collapsing them prematurely.

For this project these include:

```text
sensory evidence
substrate activity
historical expectation
current objective
environmental consequence
constraint state
identity/continuity state
```

The objective is not to create separate specialist agents.

The objective is to preserve distinct evidence long enough to derive one coherent executable decision.

---

# 14. Control hierarchy

Authority is divided into three layers.

## Experimenter

Highest authority.

Can:

- pause;
- stop;
- checkpoint;
- restore;
- inspect;
- perturb;
- modify experiments.

## DeltaX

Bounded executive authority.

Can:

- permit;
- veto;
- modulate;
- maintain objective/continuity state;
- surface contradictions.

Initially cannot:

- rewrite arbitrary synapses;
- directly actuate the body;
- alter experiment logs;
- grant itself additional authority.

## Connectome substrate

Produces neural dynamics and candidate behavior.

Does not override DeltaX invariants.

---

# 15. Logging

Every DeltaX evaluation must be recorded.

Minimum event chain:

```text
observation
substrate state
candidate behaviors
DeltaX input packet
DeltaX output packet
executive intervention
executed action
environmental result
```

Logs are append-only during a run.

---

# 16. Determinism

Where the canonical DeltaX implementation is deterministic, preserve that property.

Identical:

```text
DeltaX state
input packet
constraints
configuration
```

should produce identical executive output.

Any stochastic component must be explicitly declared and seeded.

---

# 17. Public/private boundary

This repository may expose:

- DeltaX interface;
- schemas;
- telemetry;
- tests;
- executive results;
- adapter implementation;
- public invariants;
- demo integration.

Do not expose proprietary DeltaX internals unless explicitly supplied and authorized.

Do not attempt to infer private DeltaX mathematics from documentation.

The integration should support:

```text
Public Connectome Runtime
        ↓
DeltaX Adapter
        ↓
Canonical DeltaX Runtime
```

The canonical runtime may later be:

- local;
- packaged;
- service-based;
- embedded.

Keep transport separate from semantics.

---

# 18. Stub behavior

If canonical DeltaX is not yet attached:

name the component clearly:

```text
DeltaXReferenceAdapter
```

or

```text
DeltaXStub
```

Never label stub-generated decisions as genuine DeltaX output.

The stub exists solely to validate integration.

Keep replacement with canonical DeltaX mechanically simple.

---

# 19. Integration tests

Required tests:

### Connectome-origin test

Candidate actions must exist before DeltaX evaluation.

### Veto test

A vetoed candidate cannot reach the actuator path.

### Permit test

A permitted candidate follows the normal substrate/motor path.

### Modulation test

Only declared modulation targets change.

### Provenance test

Every intervention references a DeltaX decision.

### Replay test

Recorded DeltaX packets can reproduce the same executive decisions using the canonical runtime under deterministic conditions.

### Bypass test

DeltaX cannot issue arbitrary motor commands through an undocumented path.

---

# 20. Architectural objective

The resulting architecture should demonstrate:

```text
many local perspectives
        ↓
persistent recurrent substrate
        ↓
competing candidate states
        ↓
DeltaX coherence evaluation
        ↓
one bounded executable state
```

DeltaX should provide executive coherence.

The connectome should provide the recurrent substrate.

Neither should be falsely credited with the other's work.
