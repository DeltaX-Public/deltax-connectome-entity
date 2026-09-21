# DeltaX Connectome Research: Harmonized Re-Evaluation Experiment Plan

**Document Version:** 1.0.0  
**Status:** FROZEN & UNEXECUTED — PENDING OWNER REVIEW  
**Date:** September 20, 2026  
**Auditor:** DeltaX Autonomous Research Agent (Antigravity)  
**Governing Issue Register:** [`docs/INTEGRITY_ISSUE_REGISTER.md`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-entity/docs/INTEGRITY_ISSUE_REGISTER.md)  
**Impact Assessment:** [`docs/EARLIER_CLAIM_IMPACT_TABLE.md`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-entity/docs/EARLIER_CLAIM_IMPACT_TABLE.md)  
**Repair Branch:** `fix/runtime-integrity-repairs`

---

## 1. Context and Objective

Following the research hold on merged science snapshot `5fa548e`, critical runtime and experimental integrity defects were audited and version-repaired:
- **DEF-01:** Asynchronous input-cache divergence resolved via instant synaptic delta propagation ($\Delta \text{inp} = \text{preFactor} \cdot \text{out} \cdot \Delta W_{active}$) and full recompute on restore.
- **DEF-02:** Inter-harness probe contamination resolved by enforcing non-mutating isolated clone probes (`runStandardizedIsolatedProbe`).
- **DEF-03:** Base connectome immutability safeguard upgraded to full-buffer SHA-256 over 100% of $W_{base}$ memory. Manual setter bypass closed.
- **DEF-04:** Sub-threshold synapse filtering (`minSyn = 5`) separated into two explicit model conditions: Model A (`MODEL_A_RETAINED_ONLY`) and Model B (`MODEL_B_EXPLICIT_REVIVAL`).
- **DEF-05:** Active biophysical parameter declaration harmonized (`adaptK = 0`, `depU = 0`).

This document defines the **Harmonized Re-Evaluation Protocol** to be executed once the owner authorizes unpausing of research cohorts.

---

## 2. Strict Governance & Non-Consumption Constraints

1. **Frozen Status:** This protocol is completely unexecuted. No cohorts may be initiated until explicit owner authorization is granted.
2. **Reserved Seed Boundaries:**
   - **HELD-OUT SEEDS (`19000..19099`):** STRICTLY OFF LIMITS. Must remain pristine and unconsumed until final model freezing.
   - **RESERVED SEEDS (`20400..20499`):** STRICTLY OFF LIMITS.
   - **ALLOWED RE-EVALUATION COHORT:** Development seeds `18100..18149` (Cohort D.2) and `18200..18249` (Cohort D.3).
3. **No In-Place Overwrites:**
   - Historical artifacts in `artifacts/plasticity/phase4d1/`, `phase4d2/`, and `phase4d3/` remain untouched.
   - All harmonized experimental outputs must be directed to `artifacts/plasticity/harmonized_repaired/`.
4. **Escape Pathway Boundary:** Escape plasticity replication remains paused until connectome reachability is re-evaluated under Model A and Model B.

---

## 3. Preregistered Experimental Design

### 3.1 Experimental Conditions

| Condition ID | Model Condition | Target Manifest | Learning Rule | Modulatory Gate | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **COND-01A** | Model A (Retained Only) | Target A (Afferents) | Subthreshold Bootstrap Hebbian | Closed-loop ($g_t \in \{0, 1\}$) | Tests afferent plasticity without activating sub-5 contact edges. |
| **COND-01B** | Model B (Explicit Revival) | Target A (Afferents) | Subthreshold Bootstrap Hebbian | Closed-loop ($g_t \in \{0, 1\}$) | Tests afferent plasticity allowing potentiated sub-5 contacts to activate when $\ge 5$. |
| **COND-02A** | Model A (Retained Only) | Target B (Projections) | Subthreshold Bootstrap Hebbian | Closed-loop ($g_t \in \{0, 1\}$) | Tests AN03A008 $\to$ DNa02 projection plasticity under Model A. |
| **COND-02B** | Model B (Explicit Revival) | Target B (Projections) | Subthreshold Bootstrap Hebbian | Closed-loop ($g_t \in \{0, 1\}$) | Tests AN03A008 $\to$ DNa02 projection plasticity under Model B. |
| **COND-03A** | Model A (Retained Only) | Target C (Two-Stage) | Subthreshold Bootstrap Hebbian | Closed-loop ($g_t \in \{0, 1\}$) | Tests balanced two-stage circuit under Model A. |
| **COND-03B** | Model B (Explicit Revival) | Target C (Two-Stage) | Subthreshold Bootstrap Hebbian | Closed-loop ($g_t \in \{0, 1\}$) | Tests balanced two-stage circuit under Model B. |
| **COND-04** | Sham Control | Target D (Matched Sham) | Subthreshold Bootstrap Hebbian | Closed-loop ($g_t \in \{0, 1\}$) | Negative control on uncoupled ascending neuron 4306 (9 edges, 779 synapses). |
| **COND-05** | No-Reinforcement Control | Target A (Afferents) | Subthreshold Bootstrap Hebbian | Unreinforced ($g_t = 0.0$) | Evaluates baseline stability without reinforcement. |

### 3.2 Standardized Measurement Protocol
- **Probing Modality:** `runStandardizedIsolatedProbe()` exclusively.
- **Probe Timing:** Pre-induction baseline (Cycle 0), Mid-induction checkpoints (Cycles 5, 10, 20), Post-induction (Cycle 30).
- **Zero Live Interference:** Live training runtimes are never stimulated during probes; state vectors ($\mathbf{r}, \mathbf{inp}, \mathbf{u}, \mathbf{A}, \_steps$) must remain 100% bit-identical.

### 3.3 Counterfactual Branching Suite
At Cycle 30, every recruited seed must undergo causal counterfactual branching:
1. `BRANCH_A_LEARNED_INTACT`: Full post-induction model.
2. `BRANCH_B_DELTA_W_RESET`: Resets all active $\Delta W = 0$; tests whether acquired response strictly abolishes.
3. `BRANCH_C_ELIGIBILITY_RESET_ONLY`: Clears eligibility traces while preserving $\Delta W$; proves eligibility traces are not carrying transient currents.

---

## 4. Preregistered Quantitative Criteria for Publication Unpausing

1. **Recruitment Threshold:** Right DNa02 evoked firing rate $> 0.05$ Hz under standardized isolated probe (stim window steps 11..35).
2. **Steering Candidate Threshold:** Executive `TURN_RIGHT` candidate confidence $> 0.05$.
3. **Associative Specificity:** Sham Target D recruitment rate must be $< 2.0\%$ across all development seeds.
4. **Abolition upon Reset:** Acquired steering response in Branch B must drop to baseline levels ($\Delta \text{Rate} \le 0.01$ Hz).
5. **Model A vs Model B Concordance:** Report exact comparative recruitment fractions under both Model A and Model B to provide transparent scientific honesty regarding the role of weak ($S_{ij} < 5$) anatomical synapses.

---

## 5. Execution Readiness Checklist

- [x] Pinned input hashes generated (`artifacts/audit/pinned_input_hashes.json`).
- [x] Target D manifest reconciled to 9 eligible edges / 779 base synapses (`artifacts/audit/target_d_manifest_reconciliation.json`).
- [x] Input-cache consistency repair implemented and verified (`test/input_cache_repair.test.mjs`).
- [x] Non-mutating isolated clone probe implemented and verified (`test/probe_isolation_repair.test.mjs`).
- [x] Base connectome full-buffer SHA-256 safeguards and setter bounds active.
- [x] Numerical pruning limits evaluated (`test/numerical_pruning_limits.test.mjs`).
- [x] Three-seed diagnostic comparison completed (`artifacts/audit/diagnostic_three_seed_comparison.json`).
- [x] Earlier-claim impact table published (`docs/EARLIER_CLAIM_IMPACT_TABLE.md`).
- [ ] **AWAITING OWNER REVIEW & AUTHORIZATION BEFORE COHORT EXECUTION.**
