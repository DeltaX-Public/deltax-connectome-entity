# Phase III: Long-Horizon Adaptation & Recurrence Protocol
## Pre-Registered Experimental Plan & Methodological Freeze

**Status:** FROZEN PRE-REGISTRATION  
**Date:** September 18, 2026  
**Repository:** `DeltaX-Public/deltax-connectome-entity`  
**Branch:** `phase3-long-horizon-adaptation`  
**Governance Authority:** `governance/deltax_unified_governance_v1.yaml`  

---

### 1. Primary & Secondary Research Questions

- **Primary Research Question:** Does DeltaX improve adaptation, recovery, and continuity over long-horizon behavior when the connectome-derived substrate encounters an unexpected environmental change?
- **Secondary Research Question:** When the same changed condition returns later, does preserved DeltaX executive state produce measurably better behavior than a fresh/reset executive state?

**Core Directive:** Report empirical findings objectively. If DeltaX produces no measurable advantage on any metric, that null or negative result must be recorded without reinterpretation.

---

### 2. Environment Architecture & 5-Phase Temporal Structure

The experimental environment is `ChangedWorld` (11×7 discrete arena with physical energy dynamics):
- **Arena Dimensions:** Width = 11, Height = 7 (x ∈ [0, 10], y ∈ [0, 6]).
- **Initial Energy:** 50 units (locomotion forward = 1.0, turn = 0.1, hazard step = 2.0).
- **Start Position:** (x=1, y=3, heading=0 [East]).
- **Goal Region:** East end: x ∈ [9, 10], y ∈ [1, 5].

```
y=0  ############################################# (North Wall)
y=1  .  .  . [P] . [P] .  . [P] .  . [GOAL REGION] (North Bypass Corridor)
y=2  #  #  #  .  #  .  #  #  .  #  # (Dividing Wall: Passages at x=3, 5, 8)
y=3 [S] .  .  .  . [H][B] .  .  .  . (Central Corridor: Blockage at x=6, Hazard at x=5)
y=4  #  #  #  .  #  .  #  #  .  #  # (Dividing Wall: Passages at x=3, 5, 8)
y=5  .  .  . [P] . [P] .  . [P] .  . [GOAL REGION] (South Bypass Corridor)
y=6  ############################################# (South Wall)
     x=0    x=3   x=5      x=8 x=9 x=10
```

#### Temporal Phases (Within Each Episode)
1. **Phase A (Baseline Settling):** Steps 1–10. Substrate integrates sensory drives; forward locomotion emerges from descending neuron populations.
2. **Phase B (Stable Experience):** Steps 11–18. Central corridor (y=3) is open; stable locomotion proceeds toward goal.
3. **Phase C (Unexpected Environmental Mutation):** At step 18 (`changeAtStep=18` or `changeAtStep=5` in rapid protocol), dynamic blockage drops at (6, 3) and hazard zone activates at (5, 3).
4. **Phase D (Recovery):** Steps 19–35. Entity detects contradiction, halts forward locomotion, arbitrates steering alternatives from intact connectome candidate field, and navigates via North or South bypass corridors.
5. **Phase E (Recurrence):** Trial 2. World begins with blockage already active; tests memory retention vs memory reset.

---

### 3. The Six Matched Experimental Conditions

To prevent confounding, every seed is evaluated across exactly six matched conditions:

1. **`CONTROL` (Intact Connectome Alone):**
   Full rate-coded Drosophila connectome ($N=165,122$, 10.5M edges). Receives sensory transduction; descending neuron population firing rates generate candidates. Highest-activation candidate executed without executive intervention.
2. **`OBSERVE` (Non-Contaminating Evaluation):**
   Full connectome runs identically to `CONTROL`. DeltaX local runtime evaluates candidate field and environment state ephemerally via IPC. Disposition is recorded, but the action executed is strictly the unguided substrate candidate.
   *Invariant:* Action trajectory must match `CONTROL` 100%.
3. **`STATIC_GUARD` (Non-Learning Reactive Reflex):**
   Rule-based safety filter. If obstacle directly detected or collided with, vetoes forward and selects available steering candidate. Zero session state or executive learning across trials.
4. **`EXECUTIVE` (Sovereign DeltaX with Retained Memory):**
   Full closed loop. DeltaX evaluates candidate field with real-time coherence checks. In Trial 2 (Recurrence), session state is preserved across trials, allowing memory anticipation at downstream junctions.
5. **`EXECUTIVE_MEMORY_RESET` (Sovereign DeltaX with Memory Reset):**
   Identical to `EXECUTIVE` during Trial 1, but executive session memory is cleared at the start of Trial 2. Measures the exact causal contribution of retained memory.
6. **`SHUFFLED_CONNECTOME` (Negative Biological Control):**
   Degree-preserving topological shuffle of connectome graph. Edge counts and weights preserved, but neural circuit pathways scrambled. Demonstrates whether behavioral organization depends on actual connectome topology.

---

### 4. Information Parity & Causal Integrity Constraints

1. **Information Parity Contract:**
   - Observations contain only local physical sensor outputs: `visual_field` (corridor, front distance, obstacle ahead), `collision` (blocked), `proximity` (nearest distance), `gradients` (hazard, energy, food signal), and `body` state.
   - Zero cheat codes, zero future world state leaks, zero route labels.
2. **Causal Integrity Rules:**
   - Pre-evaluation candidate field is generated strictly by descending neuron readouts before executive evaluation.
   - Every executed motor action must map directly to a candidate present in the pre-evaluation candidate field:
     $$\forall a_t \in \text{Actions}, \exists c \in \mathcal{C}_{\text{pre}} : a_t = \text{actuator\_action}(c)$$
   - Zero post-DeltaX actuator shortcuts (`VETO -> left`, `MODULATE -> forward`, etc. are forbidden).

---

### 5. Seed Allocation & Pre-Registration Boundary

- **Development & Calibration Seeds:** 2000–2049 (50 seeds). Used solely for threshold calibration and parameter tuning.
- **Unit & Acceptance Test Seeds:** 2000, 2001 (disjoint from held-out set).
- **Frozen Held-Out Evaluation Seeds:** 3000–3099 (100 seeds).
  *Rule:* No code modifications, parameter adjustments, or candidate re-weightings are permitted after running held-out seeds.

---

### 6. Hypotheses, Key Metrics, and Falsifiers

#### Primary Hypotheses
- **H1 (Sovereign Adaptation & Recovery):** Under unexpected environmental mutation (Phase C), `EXECUTIVE` achieves statistically significant higher goal completion than `CONTROL` and `SHUFFLED_CONNECTOME`.
- **H2 (Memory Retention Advantage):** In Trial 2 (Recurrence), `EXECUTIVE` (retained) exhibits:
  1. Reduced hazard zone encounters compared to `EXECUTIVE_MEMORY_RESET`.
  2. Lower total energy consumption compared to `EXECUTIVE_MEMORY_RESET`.
  3. Preemptive bypass corridor steering at junction $x=3$.

#### Statistical Metrics & Decision Rules
1. **Goal Completion Rate:** Proportion of trials reaching goal region with 95% Wilson Score Confidence Intervals.
2. **Hazard Rate:** Mean number of hazard cell encounters during Trial 2.
3. **Energy Efficiency:** Mean final energy remaining and total energy consumed.
4. **Step Latency & Speedup:** Mean steps to goal in Trial 1 vs Trial 2 ($S_1 - S_2$).
5. **Deterministic Parity:** $100\%$ action match between `CONTROL` and `OBSERVE`.

#### Pre-Registered Falsification Criteria
- If `EXECUTIVE` Trial 1 goal rate does not exceed `CONTROL` by $\ge 30\%$ percentage points ($p < 0.01$), reject H1.
- If `EXECUTIVE` (retained) does not demonstrate reduced hazard encounters or step savings relative to `EXECUTIVE_MEMORY_RESET` in Trial 2 ($p < 0.05$), reject H2 and report absence of memory advantage.
- If `CONTROL` and `OBSERVE` action trajectories differ on any seed, invalidate evaluation due to observer contamination.

---

### 7. Planned Causal Counterfactual Replay Branches

At the exact fork point immediately before world mutation (Step 15, position $(5, 3)$), four causal branches will be evaluated from identical substrate checkpoints:
- **Branch A (Intact Closed Loop):** Normal DeltaX executive governance.
- **Branch B (Memory Reset):** Executive session reset at fork point.
- **Branch C (Targeted Substrate Silencing):** Bilateral silencing of turning descending neurons (`DNg100`, `DNg97`, `DNp09`).
- **Branch D (Sham Substrate Control):** Silencing of non-motor interneurons with matched firing rates.

---
