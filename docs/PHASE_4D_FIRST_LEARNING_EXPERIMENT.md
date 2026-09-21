# Phase IV-D: First Synaptic Learning Experiment (Preregistration Protocol)

> [!NOTE]
> **HISTORICAL PROTOCOL RECORD — EXECUTED & SUPERSEDED**
> This preregistration protocol was executed on development seeds `18000..18049` ($N=50$) during Phase IV-D.1.
> - **Execution Results:** Documented in [`docs/PHASE_4D1_FIRST_LEARNING_RESULTS.md`](PHASE_4D1_FIRST_LEARNING_RESULTS.md), which demonstrated the `ASSOCIATIVE_BOOTSTRAP_DEADLOCK` negative result under somatic rate-coincidence Hebbian learning.
> - **Subsequent Work:** Superseded by the subthreshold mechanism audit ([`docs/PHASE_4D1B_NULL_MECHANISM_AUDIT.md`](PHASE_4D1B_NULL_MECHANISM_AUDIT.md)), subthreshold bootstrap results ([`docs/PHASE_4D2_BOOTSTRAP_PLASTICITY_RESULTS.md`](PHASE_4D2_BOOTSTRAP_PLASTICITY_RESULTS.md)), and dose-response results ([`docs/PHASE_4D3_DOSE_RESPONSE_RESULTS.md`](PHASE_4D3_DOSE_RESPONSE_RESULTS.md)). Merged into `main` via PR #20 (`5fa548e`).
> - **Original Preregistration Text:** Retained below unmodified as an archival audit record.

**Document:** `docs/PHASE_4D_FIRST_LEARNING_EXPERIMENT.md`
**Phase:** IV-D Connectome Synaptic Plasticity
**Branch:** `phase4d-plasticity-foundation` (Merged into `main` in PR #20, commit `5fa548e`)
**Status:** **HISTORICAL PREREGISTRATION (EXECUTED IN PHASE IV-D.1)**
**Classification:** **PREREGISTERED EXPERIMENTAL DESIGN PROTOCOL**

---

> [!CAUTION]
> **DO NOT EXECUTE THIS EXPERIMENT YET.**
> This document constitutes a formal scientific preregistration protocol. No learning sweeps, ChangedWorld navigation trials, or weight updates under this protocol may be initiated until this preregistration has been reviewed, Lane B evidence is fully integrated, and explicit authorization is granted.

---

## 1. Executive Summary & Objective

In Phase IV-C, comprehensive audit of the 50-seed development and 100-seed held-out cohorts proved that navigation failures in right-required environments (`ENV_1B_TRUE_RIGHT_REQUIRED`, `ENV_POLARITY_RIGHT`, `ENV_CHOICE_WITH_REVERSAL`) are **upstream substrate candidate absence failures**: descending steering neuron DNa02 on the right side produces 0.0 Hz firing under right tactile contact, generating 0.0 candidate proposal strength.

In parallel, Research Lane B (`research/steering-asymmetry`, commit `e62fb146e11d8d1b4a745137d84f0b829d39cdeb`) performed causal localization sweeps and identified the primary bottleneck:
1. **Receptor-to-Intermediate Afferent Attenuation:** Right tactile T1 mechanoreceptors form only 41 chemical synapses onto ascending intermediate `AN03A008` (idx `2937`) across 8 edges (vs. 78 synapses across 15 edges on the left homologue).
2. **Dynamical Threshold Amplification:** An 8x larger segmented volume size scale for right `AN03A008` raises its activation threshold, preventing subthreshold afferent drive from recruiting the downstream cholinergic premotor projection into right `DNa02` (idx `332`, base weight 717).

This protocol preregisters the **first activity-dependent learning experiment** to determine whether bounded synaptic plasticity, guided strictly by scalar physical consequence channels without policy leakage, can functionally recruit right-steering behavior and rescue navigation in right-required environments.

---

## 2. Experimental Conditions (P0 through P5)

To ensure rigorous causal attribution, the experiment compares six strictly defined controller conditions:

| Condition ID | Plasticity Rule | Target Manifest | Eligible Edges | Modulatory Gating | Scientific Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P0 (Baseline)** | `PLASTICITY_NONE` | None | None (0 edges) | None | Unmodified biological connectome baseline. |
| **P1 (Unmodulated Hebbian)** | `LOCAL_HEBBIAN` | `TARGET_C_BALANCED_TWO_STAGE` | 9 edges (8 aff + 1 proj) | None (unmodulated coincidence) | Tests whether purely associative co-activity rescues steering or causes runaway off-target potentiation. |
| **P2 (Afferent Gated)** | `ELIGIBILITY_MODULATED_HEBBIAN` | `TARGET_A_AFFERENT_ONLY` | 8 edges into `2937` | Scalar $g_t \in [-1, 1]$ | Tests whether potentiating receptor afferents alone suffices to cross the intermediate firing threshold. |
| **P3 (Projection Gated)** | `ELIGIBILITY_MODULATED_HEBBIAN` | `TARGET_B_PROJECTION_ONLY` | 1 edge (`2937 -> 332`) | Scalar $g_t \in [-1, 1]$ | Tests whether potentiating the premotor projection alone amplifies subthreshold intermediate firing into DNa02. |
| **P4 (Balanced Two-Stage Gated)** | `ELIGIBILITY_MODULATED_HEBBIAN` | `TARGET_C_BALANCED_TWO_STAGE` | 9 edges (8 aff + 1 proj) | Scalar $g_t \in [-1, 1]$ | Tests balanced co-adaptation across both stages (Lane B recommended candidate). |
| **P5 (Negative Sham Control)** | `ELIGIBILITY_MODULATED_HEBBIAN` | `TARGET_D_MATCHED_SHAM` | 9 edges (8 aff + 1 proj into/from `4306`) | Scalar $g_t \in [-1, 1]$ | Structurally matched negative control uncoupled from DNa02; verifies behavioral rescue is not an artifact of generic potentiation. |

---

## 3. Cohort Partition & Seed Allocation

In strict accordance with empirical research hygiene:
- **Development Cohort Only:** The first learning experiment will execute exclusively on reserved development seeds:
  $$\text{Seeds } 18000 \dots 18049 \quad (N = 50)$$
- **Held-Out Cohort Preservation:**
  - Seeds `19000..19099` ($N = 100$) are **strictly reserved and frozen** for future held-out confirmation.
  - No code, runbook, or test may access or evaluate reserved Phase IV-D held-out seeds `19000..19099`.

### Test Environments:
1. `ENV_1B_TRUE_RIGHT_REQUIRED` (primary benchmark: right turn required to avoid barrier and reach goal)
2. `ENV_POLARITY_RIGHT` (exact geometric mirror of left-required baseline)
3. `ENV_CHOICE_WITH_REVERSAL` (tests whether bilateral plasticity creates catastrophic interference)
4. `ENV_CORRIDOR_PLAIN` (control: verifies no degradation of straight forward locomotion)
5. `ENV_1_DEFAULT` (control: verifies preservation of left-obstacle avoidance)

---

## 4. Physical Consequence Channels & Zero Policy Leakage

Plasticity is gated by a scalar modulatory signal $g_t \in [-1.0, 1.0]$ derived strictly from embodied physical interactions:

$$g_t = -\omega_{\text{col}} \cdot c_t - \omega_{\text{nox}} \cdot n_t - \omega_{\text{eng}} \cdot \Delta E_t + \omega_{\text{clr}} \cdot d_{\text{clear}} + \omega_{\text{prog}} \cdot \Delta p_t$$

### Invariants:
1. **Zero Policy Leakage:**
   The modulatory signal packet contains zero directional information (`turn_direction`, `turn_right`, `steer_action`, `target_neuron_id`, `route_coordinates`). Automated assertions in `validateLearningSignal()` throw a fatal exception if any directional or structural metadata is present.
2. **Mirror Symmetry:**
   A collision or obstacle contact on the right produces the exact same scalar penalty as a collision on the left. The learning machinery cannot distinguish left from right; directionality emerges entirely from which sensory receptors and neural circuits are active when the consequence occurs.

---

## 5. Primary Outcome Measures

The experiment will evaluate the following pre-registered metrics across all 50 seeds:

1. **Substrate Right-Steering Recruitment Rate:**
   - Mean firing rate of right DNa02 (idx `332`) under right tactile obstacle contact.
   - Mean candidate proposal strength of `turn_right` at decisive forks.
   - **Success criterion:** `turn_right` proposal strength $\ge 0.15$ in $>80\%$ of encounters under conditions P4.
2. **Task Completion Rate:**
   - Percentage of episodes reaching the goal in `ENV_1B_TRUE_RIGHT_REQUIRED` and `ENV_POLARITY_RIGHT`.
   - **Hypothesis:** P4 achieves $>75\%$ goal attainment; P0 and P5 achieve $0\%$.
3. **Off-Target Network Divergence ($\Delta \Omega$):**
   - Percentage change in total whole-brain firing rate relative to intact baseline:
     $$\Delta \Omega = \frac{\sum_{i=1}^N r_i^{\text{learned}} - \sum_{i=1}^N r_i^{\text{baseline}}}{\sum_{i=1}^N r_i^{\text{baseline}}}$$
   - **Safety criterion:** $\Delta \Omega \le 10.0\%$ (negligible whole-brain disturbance).
4. **Causal Reset Counterfactual Test (Branch B Parity):**
   - For every seed achieving behavioral success under P4, the episode is branched at the decisive fork:
     - **Branch A (Learned Intact):** Continues with $\Delta W$ intact.
     - **Branch B (Causal Reset):** Resets $\Delta W \equiv 0$ in place.
   - **Causal Verification Invariant:** In Branch B, right DNa02 firing and `turn_right` candidate proposal MUST immediately drop to $0.0$, causing the agent to fail or collide. This proves beyond doubt that behavioral recovery is causally mediated by synaptic modifications and not by latent internal state drift or recurrent runaway.

---

## 6. Mathematical Model of Synaptic Plasticity

The base connectome consists of measured anatomical chemical synapse counts:
$$S_{ij} \in \mathbb{N}_{\ge 5}$$

Plasticity modifies the dimensionless efficacy multiplier $\alpha_{ij}(t)$, where baseline efficacy is identically 1.0:
$$\alpha_{ij}(0) = 1.0$$
$$W_{\text{effective}, ij}(t) = S_{ij} \cdot \alpha_{ij}(t)$$
$$\Delta W_{ij}(t) = S_{ij} \cdot (\alpha_{ij}(t) - 1.0)$$

### Safety & Invariant Limits:
- **Floor:** $\alpha_{ij}(t) \ge 0.0 \implies W_{\text{effective}, ij}(t) \ge 0$.
- **Ceiling:** $\alpha_{ij}(t) \le 2.5$ on afferents, $\le 1.5$ on projection.
- **Global Budget:** $\sum_{(i,j)} |\Delta W_{ij}(t)| \le 420.0$.
- **Base Immutability:** Cryptographic checksum of $S_{ij}$ verified after every step.

---

## 7. Execution Readiness Gate Checklist

Prior to launching execution:
- [x] Generic plasticity foundation implemented and validated (`src/connectome/plasticity_overlay.mjs`).
- [x] RateNetwork propagation verified on diagnostic edge (`test/plasticity_foundation.test.mjs`).
- [x] Four target manifests created and schema-validated (`artifacts/plasticity/`).
- [x] Physical consequence channels verified mirror-symmetric and non-directional.
- [x] Lane B causal artifacts ingested, audited, and hashed.
- [x] Development seeds `18000..18049` ($N=50$) reserved; held-out seeds frozen.
- [ ] User review and explicit approval of this preregistration document.
