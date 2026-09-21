# DeltaX Connectome Implementation Integrity & Model Robustness Issue Register

**Audit Branch:** `audit/implementation-integrity-and-robustness`  
**Base Commit:** `5fa548e` (merged science snapshot) / `a8512b4` (HEAD)  
**Date:** September 20, 2026  
**Auditor:** DeltaX Autonomous Research Agent (Antigravity)  
**Status:** PROVISIONAL HOLD — AWAITING OWNER REVIEW

---

## Summary of Audit Findings

| Issue ID | Domain | Classification | Severity | Affected Claims | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | Runtime Cache | **Confirmed Defect** | Critical | Instant synaptic input post-update; counterfactual branching; recovery dynamics | Confirmed |
| **DEF-02** | Probe Execution | **Confirmed Defect** | Critical | D.2 null result vs D.3 recruitment jump; baseline comparability | Confirmed |
| **DEF-03** | Safeguards | **Confirmed Defect** | High | Base connectome immutability guarantee; mask enforcement in manual APIs | Confirmed |
| **DEF-04** | Target Graph | **Confirmed Defect** | High | Target A afferents (< 5 synapses); Escape A pathway reachability | Confirmed |
| **DEF-05** | Biophysics Model | **Confirmed Defect** | Medium | Adaptation and depression claims; parameter reporting honesty | Confirmed |
| **HYP-01** | Connectome Morphology | **Unresolved Hypothesis**| Medium | Segmentation error vs biological asymmetry in DNa02/DNp01 volume | Hypothesis |
| **HYP-02** | Network Dynamics | **Disproven Hypothesis** | Medium | "Responder bistability" (actually parametric variation across random seeds) | Resolved |

---

## Detailed Issue Register

### DEF-01: Asynchronous Input-Cache Inconsistency in RateNetwork during Plasticity Updates
- **Finding:** `RateNetwork.step()` maintains post-synaptic current `inp[i]` incrementally via changes in presynaptic firing (`_delta[c] * weights[k]`). When `PlasticityOverlay` modifies `netWeights[k]`, `setEfficacyMultiplier()`, `applyModulatoryUpdate()`, `reset()`, or `restore()` are invoked, `net.recomputeInput()` is **never called**.
- **Evidence:** On synthetic 2- and 3-neuron chains, when weight increases from 10 to 20 while the presynaptic neuron fires at 75 Hz:
  - Immediate cache error: `-749.9476` units (-50.0% divergence from true input).
  - When presynaptic neuron stops firing, cached `inp` drops to `-749.9476` (phantom negative current) instead of 0.0000.
  - Periodic cache sync (`recomputeInput()`) only triggers every 2,000 steps.
- **Affected Claims:**
  - Fast-onset recruitment latency.
  - Counterfactual branching parity (`BRANCH_B_DELTA_W_RESET` retains phantom currents from modified weights).
- **Minimal Reproduction:** `scripts/audit_integrity/audit_lane1_input_cache.mjs`
- **Proposed Correction:**
  1. Whenever weights are mutated by `PlasticityOverlay`, invoke `net.recomputeInput()` immediately, or incrementally adjust `inp[target] += preFactor[source] * out[source] * deltaW`.
  2. Call `net.recomputeInput()` in `runtime.restore()` and `runtime.createCounterfactualBranch()`.
- **Tests Required for Closure:** Bit-exact agreement between incremental `RateNetwork.step()` and `fullRecompute()` across all weight update, reset, and restore events.

---

### DEF-02: Inter-Harness Probe Cross-Contamination and Missing State Reset
- **Finding:** `runStandardizedProbe()` resets `runtime.net` at the *start* of the probe, but **does not reset** or restore `runtime.net` at the *conclusion* of the probe. Furthermore, Phase IV-D.2 executed 6 multimodal baseline probes (`rightTactile`, `leftTactile`, `joAuditoryRight`, `joAuditoryLeft`, `thermoRight`, `thermoLeft`) without disabling plasticity (`enabled = true`), accumulating dirty eligibility traces and leaving residual contralateral inhibition prior to induction.
- **Evidence:**
  - In D.2 harness on Seed 18100: Budget = 4.76, DNa02 = 0.0010 Hz (Recruited = FALSE).
  - In D.3 harness on Seed 18100: Budget = 55.99, DNa02 = 1.2034 Hz (Recruited = TRUE).
  - Isolating probe subsets on Seed 18100:
    - 1 Probe (`RIGHT_TACTILE`): Budget = 60.00, DNa02 = 1.2997 Hz (Recruited = TRUE).
    - 2 Probes (`+ LEFT_TACTILE`): Budget = 2.74, DNa02 = 0.0006 Hz (Recruited = FALSE).
    - 6 Probes (D.2 exact): Budget = 4.76, DNa02 = 0.0010 Hz (Recruited = FALSE).
- **Affected Claims:**
  - The claim that D.2 had a "null recruitment result" due to intrinsic biophysical deadlock while D.3 achieved 75% recruitment due to "subthreshold plasticity dose response".
  - The recruitment jump between D.2 and D.3 is a harness artifact of probe contamination, not seed heterogeneity.
- **Minimal Reproduction:** `scripts/audit_integrity/audit_probe_subsets.mjs`
- **Proposed Correction:**
  1. Standardized measurement probes must NEVER run on the live training runtime. Probes must be executed exclusively on isolated clone instances (`new ConnectomeRuntime(...)` restored from snapshot).
  2. Ensure eligibility traces and internal neural dynamics are clean prior to induction cycle 0.
- **Tests Required for Closure:** 100% bit-exact parity between uninterrupted training and probed training.

---

### DEF-03: Prefix-Only Base Connectome Checksum and Unchecked Setter Bypass
- **Finding:**
  1. `PlasticityOverlay._computeBaseChecksum()` only hashes `Math.min(100000, byteLength)` (the first 100 KB of a 21 MB array). 99.5% of the connectome base weights can be modified in-place without triggering `verifyBaseImmutability()`.
  2. `setEfficacyMultiplier(edgeIndex, alpha)` fails to validate `isEligibleEdge()`, total budget, or maximum edge delta, allowing arbitrary weight mutations on ineligible edges.
- **Evidence:**
  - Mutating `baseWeights[60000]` (byte offset 120,000) was undetected by `verifyBaseImmutability()`.
  - Mutating ineligible edge 12345 via `setEfficacyMultiplier(12345, 50.0)` succeeded and bypassed the 10.0 budget limit, consuming 1,176 units without error.
- **Affected Claims:**
  - Structural immutability invariant of $W_{base}$.
  - Strict enforcement of target edge mask boundaries.
- **Minimal Reproduction:** `scripts/audit_integrity/audit_lane1_safeguards.mjs`
- **Proposed Correction:**
  1. Hash the entire `baseWeights` buffer (or a deterministic multi-block chunked SHA-256).
  2. Require `isEligibleEdge()` and bounds checking in `setEfficacyMultiplier()`.
- **Tests Required for Closure:** Mutation at any arbitrary index $\in [0, E-1]$ must throw `CRITICAL SAFETY VIOLATION`.

---

### DEF-04: Sub-Threshold Anatomical Synapse Filtering (`minSyn = 5`) Disconnects Proposed Pathways
- **Finding:** `RateNetwork` initializes active runtime weights with `minSyn = 5`: all edges with $< 5$ synapses are zeroed out (`w[k] = 0`).
  - Target A: 6 of the 8 tactile receptor afferent connections have raw synapse counts of 3 or 4 ($S_{ij} \in \{3, 4\}$). Only 2 connections (weights 13 and 7) are active at runtime.
  - Proposed Escape Cascade (ESCAPE_A): 6 of 6 edges have raw synapse counts of 3 ($S_{ij} = 3$). In the active runtime network, **all 6 edges are zeroed out**.
- **Evidence:** Target inventory audit in `artifacts/plasticity/effective_graph_target_inventory.json` confirmed 6/8 Target A edges and 6/6 Escape A edges are filtered to weight 0 at baseline.
- **Affected Claims:**
  - Escape pathway replication readiness (the proposed pathway is structurally severed in `RateNetwork`).
  - Target A baseline mechanism (6 edges were dead until revived by `eff >= 5` logic).
- **Minimal Reproduction:** `scripts/audit_integrity/audit_lane2_target_inventory.mjs`
- **Proposed Correction:**
  1. Formally record in manifests whether targets rely on raw graph ($S_{ij} \ge 1$) or filtered graph ($S_{ij} \ge 5$).
  2. Reassess escape reachability with `minSyn = 1` vs `minSyn = 5`.
- **Tests Required for Closure:** Explicit target inventory schema validating active runtime weight $> 0$ prior to plasticity induction.

---

### DEF-05: Resolved Zero Values for Adaptation and Depression in Active Runtime
- **Finding:** Artifacts in `phase4d2` and `phase4d3` report `adaptation_A` and `depression_u = 1.000` as if they reflect active biophysical feedback. In reality, `RateNetwork` defaults are `adaptK = 0` and `depU = 0`, and `ConnectomeRuntime` never configures non-zero values.
- **Evidence:**
  - `rt.net.p.adaptK === 0` (spike-frequency adaptation is completely disabled).
  - `rt.net.p.depU === 0` (short-term synaptic depression is completely disabled).
- **Affected Claims:**
  - Claims implying that spike-frequency adaptation or short-term depression stabilized plasticity or prevented runaway excitation.
- **Minimal Reproduction:** `scripts/audit_integrity/audit_lane1_safeguards.mjs`
- **Proposed Correction:** Accurately declare in manuscript and artifacts that the simulated rate-network operates without adaptation or short-term depression (`adaptK = 0`, `depU = 0`).
- **Tests Required for Closure:** Schema audit verifying reported parameters match active configuration.

---

### HYP-01: NeuPrint EM Voxel Segmentation Error in Descending Giant Neurons
- **Status:** **Unresolved Hypothesis**
- **Finding:** Neurons DNa02 (idx 332, 130496) and DNp01 (idx 6, 0) have extreme voxel volumes ($1.56 \times 10^{10}$ and $1.07 \times 10^{11}$ voxels), causing `sizeScale` to clamp at the maximum bound of 20.0.
- **Evidence:** NeuPrint Male CNS v1.0 table volumes directly extracted to `neuron_size.bin`. Whether this represents biological reality (giant descending axons extending the full length of the cervical connective and VNC) or segmentation merge artifacts remains an open neuroanatomical question.
- **Resolution Plan:** Treat segmentation error strictly as a hypothesis; do not assert it as an empirical finding without FlyWire/neuPrint proofreading verification.

---

### HYP-02: "Responder Heterogeneity" as Dynamical Bistability
- **Status:** **Disproven Hypothesis (Resolved to Parametric Variation)**
- **Finding:** Phase IV-D.3 hypothesized that the 75% responders vs 25% non-responders reflected dynamical bistability of the connectome.
- **Evidence:** Controlled dynamical testing on a fixed seed (Seed 18100) across different initial conditions demonstrated that while recurrent hysteresis exists, the primary difference between seeds 18100..18149 and 18200..18299 is **parametric variation** (randomly sampled intrinsic thresholds $\theta_i$ and gains $a_i$ drawn from truncated normal distributions).
- **Resolution Plan:** Refactor manuscript text to describe responder groups as parametric heterogeneity rather than dynamical multistability.
