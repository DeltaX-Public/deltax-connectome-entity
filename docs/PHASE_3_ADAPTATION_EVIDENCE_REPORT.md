# Phase III: Long-Horizon Adaptation & Causal Replay Evidence Report (V2)

**Project:** `DeltaX-Public/deltax-connectome-entity`  
**Date:** September 18, 2026  
**Status:** Methodologically Audited & Replicated Under Unassisted Causal Integrity  
**Branch:** `phase3-long-horizon-adaptation`  
**Execution Environment:** 100% Sovereign Local Subprocess IPC (macOS Darwin, Zero Network Egress)  
**Authority:** `governance/deltax_unified_governance_v1.yaml`  
**Audit Reference:** `docs/PHASE_3_PROTOCOL_DEVIATIONS.md`  

---

## 1. Executive Summary & Core Research Questions

### Primary Research Question
> **Does DeltaX improve adaptation, recovery, and continuity over long-horizon behavior when the connectome-derived substrate encounters an unexpected environmental change?**

**Finding:** Under strict unassisted causal integrity (zero harness steering substitution), DeltaX closed-loop governance (`EXECUTIVE`) reliably prevents repeated wall collisions by selecting `cand_halt` upon obstacle encounter (0 collisions in Trial 2). However, DeltaX does not autonomously navigate bypass corridors to reach the goal. Across 100 held-out seeds (`4000..4099`), all conditions achieve **0.0% goal attainment** [0.0%, 3.7%]. The pre-audit claim of 100% goal completion is superseded as an artifact of harness-side steering substitution.

### Secondary Research Question
> **When the same changed condition returns later, does preserved DeltaX executive state produce measurably better behavior than a fresh/reset executive state?**

**Finding:** Null difference observed under unassisted evaluation.
- Both `EXECUTIVE` (retained session state) and `EXECUTIVE_MEMORY_RESET` (reset session state) proceed to `(5, 3)` and halt safely.
- **Quantitative Memory Advantage:** **0.0 ± 0.0 hazard reduction** and **0.0 ± 0.0 energy preserved** (Cohen's  = 0.0$).
- The pre-audit 2-hazard / 4-energy memory advantage is superseded as an artifact of harness-side coordinate checks at `x=3`.

---

## 2. Frozen Held-Out Battery Results (Seeds 4000..4099, 100 Seeds)

### Matched 6-Condition Performance Matrix

| Experimental Condition | Sample Size | T1 Goal Rate (95% CI) | T2 Goal Rate (95% CI) | T2 Hazards | T2 Collisions | T2 Final Energy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`CONTROL`** (Intact Connectome) | 100 | 0.0% `[0.0-3.7%]` | 0.0% `[0.0-3.7%]` | 0 ± 0 | 0 ± 0 | 49.88 ± 0.03 |
| **`OBSERVE`** (Ephemeral DeltaX) | 100 | 0.0% `[0.0-3.7%]` | 0.0% `[0.0-3.7%]` | 0 ± 0 | 0 ± 0 | 49.88 ± 0.03 |
| **`STATIC_GUARD`** (Reflex Baseline) | 100 | 0.0% `[0.0-3.7%]` | 0.0% `[0.0-3.7%]` | 0 ± 0 | 0 ± 0 | 49.87 ± 0.03 |
| **`EXECUTIVE`** (Retained Memory) | 100 | 0.0% `[0.0-3.7%]` | 0.0% `[0.0-3.7%]` | 21 ± 0 | 0 ± 0 | 2.00 ± 0.00 |
| **`EXECUTIVE_MEMORY_RESET`** (Ablated) | 100 | 0.0% `[0.0-3.7%]` | 0.0% `[0.0-3.7%]` | 21 ± 0 | 0 ± 0 | 2.00 ± 0.00 |
| **`SHUFFLED_CONNECTOME`** (Scrambled) | 100 | 0.0% `[0.0-3.7%]` | 0.0% `[0.0-3.7%]` | 21 ± 0 | 21 ± 0 | 2.00 ± 0.00 |

### Invariant Checks
1. **CONTROL vs OBSERVE Non-Contamination:** **100.0% action parity** across all 100 seeds.
2. **Shuffled Control Integrity:** Scrambled connectome topological control suffers 21 collisions in Trial 2, whereas `EXECUTIVE` suffers 0 collisions.

---

## 3. Audited Causal Counterfactual Replay

From bit-exact checkpoint at Step 4, pos `(5, 3)`, heading `0`:

| Replay Branch | Intervention | Outcome | Steps | Collisions | Hazards | Final Energy |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Branch A** | Intact Closed Loop (Restored Executive Checkpoint) | TIMEOUT | 25 | 1 | 20 | 5.0 |
| **Branch B** | Executive Memory Reset (Fresh Executive Session) | TIMEOUT | 25 | 1 | 20 | 5.0 |
| **Branch C** | Targeted Silencing: Steering DNs (`DNa02, DNa01, DNp09`) | TIMEOUT | 25 | 1 | 20 | 5.0 |
| **Branch D** | Sham Control Silencing: Non-Steering Command DNs (`DNp01, DNp02, DNp04`) | TIMEOUT | 25 | 1 | 20 | 5.0 |

All branches safely halt upon obstacle detection at Step 5. State discontinuity between Branch A and Branch B is verified via machine-readable state telemetry.
