# Phase III: Long-Horizon Adaptation & Recurrence Protocol V2
## Pre-Registered Experimental Plan & Methodological Freeze (Post-Audit)

**Status:** FROZEN PRE-REGISTRATION V2  
**Date:** September 18, 2026  
**Repository:** `DeltaX-Public/deltax-connectome-entity`  
**Branch:** `phase3-long-horizon-adaptation`  
**Authority:** Methodological Audit Directive (PR #14)  

---

### 1. Research Objectives & Honest Evaluation Principle

1. **Primary Question:** Under unexpected environmental change, does DeltaX closed-loop executive governance produce measurable differences in stability, collision prevention, or recovery compared to unguided connectome controls?
2. **Secondary Question:** When an unexpected condition recurs, does retained DeltaX executive session state confer measurable behavioral advantages compared to a verifiably reset executive state?

**Scientific Integrity Principle:**
There is no predetermined success requirement. If DeltaX safely halts rather than pathfinding through bypass corridors, or if memory retention produces zero hazard reduction under unassisted evaluation, those findings must be reported factually and objectively.

---

### 2. Experimental Environment & Fixed Parameters

- **Environment:** `ChangedWorld` (11×7 discrete grid arena).
- **Start Position:** `(x=1, y=3, heading=0)` (facing East).
- **Central Obstacle:** Dynamic wall drops at `(6, 3)` at step `changeAtStep=5`.
- **Hazard Zone:** Active at `(5, 3)`.
- **Bypass Corridors:** North corridor (`y=1`) and South corridor (`y=5`) with junctions at `x=3, 5, 8`.
- **Goal Region:** East end: `x ∈ [9, 10], y ∈ [1, 5]`.
- **Max Steps Per Trial:** 25 steps.
- **Initial Energy:** 50 units (forward = 1.0, turn = 0.1, hazard step = 2.0).

---

### 3. The Six Matched Conditions

1. **`CONTROL`**: Intact biological connectome alone (=165,122$, 10.5M synapses). Top descending neuron candidate executed.
2. **`OBSERVE`**: Intact connectome with DeltaX ephemeral observation on isolated clone runtime. Zero actuation impact. Identical to `CONTROL`.
3. **`STATIC_GUARD`**: Rule-based reactive obstacle reflex. Intervenes only upon immediate obstacle detection/collision. Zero memory.
4. **`EXECUTIVE`**: Sovereign closed-loop DeltaX governance with retained session state in Trial 2.
5. **`EXECUTIVE_MEMORY_RESET`**: Sovereign closed-loop DeltaX governance with explicit session reset receipt and zeroed tick/TNM memory in Trial 2.
6. **`SHUFFLED_CONNECTOME`**: Degree-preserving scrambled connectome graph (>=80% edges swapped). Negative biological control.

---

### 4. Strict Unassisted Causal Integrity Rules

1. **Pre-Evaluation Candidate Field Exclusivity:**
   Every executed actuator command must originate from descending neuron readouts before executive evaluation.
2. **Zero Harness Steering Substitution:**
   The harness may not intercept an executive decision to inject steering. If DeltaX selects `halt`, the entity halts.
3. **Information Parity:**
   Sensory streams contain only current physical observations (`obstacle_ahead`, `collision`, `hazard`, etc.). No route waypoints, future states, or condition-specific flags.
4. **State Lineage & Discontinuity Verification:**
   - `EXECUTIVE` must prove continuation via preserved session ID, tick count, and TNM history.
   - `EXECUTIVE_MEMORY_RESET` must prove fresh state via a machine-readable `reset_ack` receipt, fresh session ID, tick=0, and TNM count=0.

---

### 5. Frozen Held-Out Evaluation Cohort

- **Cohort Range:** Seeds `4000..4099` (100 seeds).
- **Rule:** Unseen held-out evaluation. No parameter tuning, candidate re-weighting, or harness changes permitted after execution starts.

---

### 6. Pre-Declared Statistical Analyses

1. **Categorical Outcomes (Goal Completion, Collision Occurrence):**
   - Paired exact analysis (McNemar's test or exact binomial test on discordant pairs).
2. **Continuous Outcomes (Collisions, Hazard Count, Energy Conserved):**
   - Exact paired difference analysis.
   - If distributions exhibit zero variance (deterministic outcomes across all seeds), report raw paired differences, $, and effect sizes rather than synthetic asymptotic p-values.
3. **Causal Replay 4-Branch Evaluation:**
   - Branch A: Intact Closed Loop (Retained Executive).
   - Branch B: Executive Memory Reset (Identical world & neural state, fresh executive state only).
   - Branch C: Targeted Steering Silencing (DNa02, DNa01, DNp09 silenced; retained executive).
   - Branch D: Matched Sham Control Silencing (DNp01, DNp02, DNp04 non-steering command neurons silenced; matched count = 6; retained executive).
