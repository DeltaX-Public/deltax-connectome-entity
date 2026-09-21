# Phase IV-D: Connectome Plasticity Foundation & Causal Methodology

> [!NOTE]
> **HISTORICAL SPECIFICATION RECORD — RESEARCH MILESTONE MERGED**
> This document specifies the foundational, bounded synaptic plasticity infrastructure developed in Phase IV-D.
> - **Lane B Evidence Status:** Lane B causal mapping was fully completed and merged via PR #19 (`04e5340`) and PR #21 (`c1341b0`), delivering the four canonical target manifests (`target_a_afferent_only.json`, `target_b_projection_only.json`, `target_c_balanced_two_stage.json`, `target_d_matched_sham.json`).
> - **Plasticity Milestone Merged:** The plasticity foundation and development experiments (Phase IV-D.1 through D.3) were formally merged into `main` via PR #20 (`5fa548e`).
> - **Held-Out Preservation:** Phase IV-D held-out evaluation seeds `19000..19099` remain strictly sealed and unconsumed.

**Document:** `docs/PHASE_4D_PLASTICITY_FOUNDATION.md`
**Phase:** IV-D Connectome Plasticity Foundation
**Branch:** `phase4d-plasticity-foundation` (Merged into `main` in PR #20, commit `5fa548e`)
**Status:** **MERGED HISTORICAL SPECIFICATION**
**Classification:** **GOVERNED INFRASTRUCTURE SPECIFICATION**

---

## 1. Objective & Scope

Phase IV-C proved that navigation failures in right-required and reversal environments are causally attributable to **upstream substrate candidate absence** (`turn_right` = 0.0 Hz in the connectome-derived computational substrate under lateralized sensory contact).

Phase IV-D establishes the **generic, bounded synaptic plasticity infrastructure** required to test activity-dependent circuit adaptation. In strict compliance with research lane boundaries:
1. **The Primary Lane (Lane A)** builds generic, modular, bounded plasticity infrastructure.
2. **The Steering-Asymmetry Lane (Lane B)** independently investigates why right-steering activity is suppressed.
3. **Zero Pathway Targeting:** No biological pathway is modified, no training on `ENV_POLARITY_RIGHT` is executed, and no parameters are tuned until Lane B delivers its causal target manifest.

---

## 2. Core Architectural Principle: $W_{\text{base}}$ Immutability

The measured Drosophila connectome topology represents empirical biological truth and must never be mutated or overwritten in place.

$$\mathbf{W}_{\text{base}} = \text{original measured connectome synaptic weights}$$
$$\mathbf{W}_{\text{effective}}(t) = \mathbf{W}_{\text{base}} + \Delta\mathbf{W}(t)$$

### Invariants:
1. **Immutability:** $\mathbf{W}_{\text{base}}$ is read-only. Cryptographic checksums verify that not a single byte of the base weights array is altered during simulation or plasticity updates.
2. **Reversibility & Reset:** Resetting plasticity returns $\Delta\mathbf{W} \equiv 0$ exactly, restoring the exact initial connectome state with zero residue.
3. **Sparsity:** Plasticity is maintained in a sparse map (`Map<edgeIndex, deltaValue>`). No dense $165{,}122 \times 165{,}122$ matrix is allocated.
4. **Behavioral Inertia when Disabled:** When plasticity is disabled (`enabled: false` or `PLASTICITY_NONE`), whole-connectome RateNetwork dynamics and descending neuron readouts are **100% bit-exact identical** to the baseline substrate.

---

## 3. Hard Safety Bounds

Every proposed weight update is subjected to a cascade of 6 strict safety bounds:

1. **Per-Step Update Rate Limit:**
   $$|\Delta W_{ij}(t) - \Delta W_{ij}(t-1)| \le \Delta_{\text{max\_step}} \quad (\text{default: } 0.5)$$
2. **Per-Edge Absolute Bound:**
   $$|\Delta W_{ij}(t)| \le \Delta_{\text{max\_abs}} \quad (\text{default: } 5.0)$$
3. **Per-Edge Percentage Deviation Bound:**
   $$|\Delta W_{ij}(t)| \le W_{\text{base}, ij} \times \delta_{\text{max\_pct}} \quad (\text{default: } 100\%)$$
4. **Non-Negative Synaptic Floor:**
   $$W_{\text{effective}, ij}(t) = \max(0, W_{\text{base}, ij} + \Delta W_{ij}(t))$$
5. **Total Global Modification Budget:**
   $$\sum_{(i,j) \in \mathcal{E}} |\Delta W_{ij}(t)| \le B_{\text{global}} \quad (\text{default: } 100.0)$$
   Updates exceeding the global budget are strictly clipped.
6. **Eligible Edge Mask:**
   $$\Delta W_{ij}(t) \equiv 0 \quad \forall (i, j) \notin \mathcal{M}_{\text{eligible}}$$
   Only edges explicitly designated in the target manifest may undergo plasticity.

---

## 4. Generic Learning Rules (Plugin Architecture)

The infrastructure implements 5 formal learning rules for controlled causal comparison:

### A. `PLASTICITY_NONE` (Baseline Default)
$$\Delta W_{ij}(t) = 0$$

### B. `LOCAL_HEBBIAN`
Activity coincidence without modulatory gating:
$$\Delta W_{ij}(t) = \Delta W_{ij}(t-1) + \eta \cdot \frac{r_i(t)}{100} \cdot \frac{r_j(t)}{100} - \gamma \cdot \Delta W_{ij}(t-1)$$

### C. `ANTI_HEBBIAN`
Activity-dependent depression:
$$\Delta W_{ij}(t) = \Delta W_{ij}(t-1) - \eta \cdot \frac{r_i(t)}{100} \cdot \frac{r_j(t)}{100} - \gamma \cdot \Delta W_{ij}(t-1)$$

### D. `ELIGIBILITY_MODULATED_HEBBIAN`
Three-factor learning rule combining local eligibility traces with a global scalar modulatory signal $g(t)$:
$$e_{ij}(t) = e_{ij}(t-1) \cdot (1 - \lambda_e) + \frac{r_i(t)}{100} \cdot \frac{r_j(t)}{100}$$
$$\Delta W_{ij}(t) = \Delta W_{ij}(t-1) + \eta \cdot g(t) \cdot e_{ij}(t) - \gamma \cdot \Delta W_{ij}(t-1)$$

### E. `RATE_STDP_APPROXIMATION`
Temporal derivative asymmetry (pre preceding post causes potentiation; post preceding pre causes depression):
$$c_{ij}(t) = \frac{r_i(t) \cdot \Delta r_j(t) - r_j(t) \cdot \Delta r_i(t)}{10{,}000}$$
$$e_{ij}(t) = e_{ij}(t-1) \cdot (1 - \lambda_e) + c_{ij}(t)$$
$$\Delta W_{ij}(t) = \Delta W_{ij}(t-1) + \eta \cdot g(t) \cdot e_{ij}(t) - \gamma \cdot \Delta W_{ij}(t-1)$$

---

## 5. Information Boundary & Learning Signal Interface

### Narrow Modulatory Signal:
- Modulatory drive is strictly a scalar $g_t \in [-1.0, 1.0]$ or discrete state (`HOLD`: 0.0, `REINFORCE`: +1.0, `SUPPRESS`: -1.0).
- **Forbidden Semantic Leakage:** Automated validators reject any packet containing `turn_direction`, `turn_right`, `target_neuron_id`, `synapse_id`, `route_coordinates`, or `target_weight`.

### Physical Consequence Channels:
Learning signals are computed from physical embodiment metrics:
$$g_t = f(\text{collision}, \text{noxious\_exposure}, \text{energy\_consumed}, \text{clearance}, \text{progress})$$
No policy directionality ("RIGHT TURN GOOD") is encoded.

---

## 6. Causal Counterfactual Branching

The runtime supports 5 distinct counterfactual branches from any simulation checkpoint:
- **`BRANCH_A_LEARNED_INTACT`**: Full restore of weights and traces.
- **`BRANCH_B_DELTA_W_RESET`**: $\Delta\mathbf{W} \leftarrow 0$, testing whether behavior requires learned weights.
- **`BRANCH_C_ELIGIBILITY_RESET_ONLY`**: Clears eligibility traces while retaining $\Delta\mathbf{W}$.
- **`BRANCH_D_EXECUTIVE_RESET_DELTA_W_RETAINED`**: Tests connectome adaptation independent of executive state.
- **`BRANCH_E_SHAM_RESET`**: Sham control resetting traces to evaluate baseline stability.

---

## 7. Integration Boundary with Steering Lane (Lane B)

The schema `artifacts/plasticity/target_manifest.schema.json` establishes the contract between research lanes. When Lane B identifies the symmetry-breaking bottleneck, it will emit an evidence-selected target manifest specifying:
- `eligible_populations`: Identified bottleneck cell types.
- `eligible_edges`: Specific source $\to$ target synapses.
- `allowed_direction`: `POTENTIATION_ONLY`, `DEPRESSION_ONLY`, or `BIDIRECTIONAL`.
- `safety_bounds`: Pathway-specific caps.

The plasticity overlay loads this manifest without requiring code alterations.
