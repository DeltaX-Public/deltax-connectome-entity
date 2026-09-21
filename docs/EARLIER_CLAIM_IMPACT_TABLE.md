# DeltaX Connectome Research: Earlier-Claim Impact Table

**Document Version:** 1.0.0  
**Audit Context:** Research Hold & Implementation Integrity Repairs  
**Date:** September 20, 2026  
**Auditor:** DeltaX Autonomous Research Agent (Antigravity)  
**Governing Issue Register:** [`docs/INTEGRITY_ISSUE_REGISTER.md`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-entity/docs/INTEGRITY_ISSUE_REGISTER.md)  
**Audit Commit:** `4b9af71`  
**Repair Branch:** `fix/runtime-integrity-repairs`

---

## 1. Classification Status Taxonomy

Every earlier scientific claim across published and merged research lanes is assigned one of four governed audit statuses:

1. **`UNAFFECTED BY IDENTIFIED DEFECT`**: The claim relies on baseline static connectome graph properties, feedforward sensory reachability, topological graph metrics, or non-plastic recurrent dynamics completely decoupled from plasticity overlays, weight cache modifications, or probe contamination.
2. **`REQUIRES TARGETED REGRESSION`**: The underlying claim is qualitatively sound and supported by unaffected mechanisms, but specific numerical values (e.g., exact firing rates, latency steps, candidate confidence scores) were measured using in-place probes or un-synchronized caches and require isolated regression confirmation.
3. **`REQUIRES RECOMPUTATION`**: The claim was directly contaminated or distorted by an identified defect (e.g., DEF-01 input cache divergence, DEF-02 probe cross-contamination, DEF-04 sub-5 synapse disconnection, or DEF-05 biophysical parameter defaults). Historical artifacts must be sequestered, and numerical cohorts must be rerun under the repaired runtime before any manuscript re-submission.
4. **`UNRESOLVED`**: The claim involves an empirical hypothesis with open scientific ambiguity (e.g., HYP-01 anatomical segmentation merge artifacts vs. biological giant axon volumes) that cannot be resolved solely by software runtime repair.

---

## 2. Comprehensive Impact Assessment Table

| Phase / Research Lane | Original Claim / Finding | Governed Status | Impacting Defect / Hypothesis | Detailed Rationale & Action Plan |
| :--- | :--- | :--- | :--- | :--- |
| **Phase IV-A** | Sensory surface inventory maps genuine mechanosensory, auditory, and thermosensory receptors without cheat labels. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Purely anatomical metadata mapping in `bodymap.json`. Independent of runtime plasticity and probe caching. |
| **Phase IV-A** | Intact connectome produces directional steering asymmetry under lateralized sensory drive. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Driven on baseline connectome with plasticity disabled (`enabled = false`). Validated by degree-preserving shuffled controls. |
| **Phase IV-A** | 3-hop graph reachability connects sensory afferents to descending steering neurons (DNa02). | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Pure CSR graph topology traversal on immutable connectome `graph.flyg`. |
| **Phase IV-B** | Readout A (current-based) exhibits Central HALT dominance under low forward locomotion. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Evaluates descending population projection onto rover action candidates in baseline network. Decoupled from plasticity. |
| **Phase IV-B** | Readout C (independent axes) preserves lateral steering sign and prevents HALT suppression of turn candidates. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Algorithmic readout mapping function (`candidate_readouts.mjs`). Fully verified and active across all phases. |
| **Phase IV-C** | Motor embodiment audit: MDN activation drives backward locomotion; quiescence remains distinct from backward drive. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Static biophysical candidate mapping. Verified in test suite. |
| **Phase IV-C** | Closed-loop executive candidate selector enforces strict provenance and fallback on invalid candidates. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Autonomous executive controller contract. Decoupled from runtime plasticity. |
| **Lane B (PR #19)** | Steering asymmetry: Right-sided tactile drive elicits differential ipsilateral DNa02 activation over contralateral DNa02. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Baseline topological asymmetric routing present in native EM connectome graph. |
| **Lane B (PR #19)** | Causal optogenetic silencing of intermediate AN03A008 abolishes steering candidate generation. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Validated via non-plastic causal ablation (`rt.silence()`). |
| **Lane B (PR #21)** | Latent motor repertoire atlas identifies causally silent descending pathways (DNp70, DNa02). | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Baseline excitability scans and graph community detection. |
| **Escape Cascade** | ESCAPE_A giant fiber pathway replication readiness. | `REQUIRES RECOMPUTATION` | **DEF-04** | All 6 edges in the proposed escape cascade have raw synapse counts $S_{ij} = 3$. In active runtime (`minSyn = 5`), all 6 edges are zeroed out at baseline. Must re-evaluate under Model A vs Model B with explicit reachability analysis. |
| **Phase IV-D.1** | Classical Hebbian / rate-STDP associative learning deadlocks due to subthreshold postsynaptic firing. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | The finding that classical suprathreshold Hebbian plasticity fails when postsynaptic neurons fire at 0 Hz is mathematically and biologically correct. |
| **Phase IV-D.1b** | Null mechanism audit: associative deadlock is caused by zero postsynaptic firing, not eligibility trace failure. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Validated across 100 seeds. Analytical proof remains valid. |
| **Phase IV-D.2** | Subthreshold bootstrap rule ($\psi_i(t)$) breaks associative deadlock and recruits right DNa02. | `REQUIRES TARGETED REGRESSION` | **DEF-01**, **DEF-02** | The core mechanism is validated, but numerical recruitment rates (4/50 seeds) were contaminated by probe-induced contralateral inhibition (DEF-02). |
| **Phase IV-D.2** | Target A (afferent tactile) produces entire observed learning effect, while Target B (descending projection) produces zero. | `REQUIRES TARGETED REGRESSION` | **DEF-04** | 6 of 8 Target A edges had $S_{ij} < 5$. Under Model A (retained only), only 2 edges are active. Need targeted rerun to separate afferent vs projection contribution under both models. |
| **Phase IV-D.2** | Target D (sham negative control) produces zero behavioral recruitment. | `UNAFFECTED BY IDENTIFIED DEFECT` | None | Target D remains uncoupled from DNa02. Manifest reconciliation confirmed frozen 9-edge / 779-synapse structure. |
| **Phase IV-D.3** | Dose-response curve: Recruitment jumps from 8% (D.2) to 75% (D.3) under subthreshold plasticity. | `REQUIRES RECOMPUTATION` | **DEF-02** | The 8% vs 75% difference was almost entirely an artifact of probe cross-contamination (6 baseline probes in D.2 leaving residual inhibition vs 1 probe in D.3), NOT a biological or parametric dose response. |
| **Phase IV-D.3** | Responder heterogeneity represents dynamical connectome bistability. | `REQUIRES RECOMPUTATION` | **HYP-02** | Disproven during audit. Heterogeneity across seeds is driven by parametric variation (sampled thresholds $\theta_i$ and gains $a_i$), not dynamical bistability. |
| **All Phase IV-D** | Spike-frequency adaptation ($A_i$) and short-term depression ($u_i$) stabilized plasticity dynamics. | `REQUIRES RECOMPUTATION` | **DEF-05** | `RateNetwork` was simulated with `adaptK = 0` and `depU = 0`. Reported adaptation/depression was inactive. Manuscripts must accurately disclose zero adaptation/depression. |
| **All Phase IV-D** | Base connectome $W_{base}$ is cryptographically guaranteed immutable. | `UNAFFECTED BY IDENTIFIED DEFECT` | **DEF-03** (Repaired) | Verified: Although 100 KB prefix hash had a theoretical bypass, actual baseWeights remained untouched in all past experiments. Full-buffer SHA-256 now enforces absolute guarantee. |
| **Morphology** | Descending giant neuron volume anomaly (DNa02/DNp01 sizeScale = 20.0). | `UNRESOLVED` | **HYP-01** | Open neuroanatomical question whether extreme voxel counts reflect giant axon morphology or NeuPrint EM segmentation merge artifacts. |

---

## 3. Action Protocol & Publication Boundaries

1. **Retain Historical Artifacts:**  
   All artifacts in `artifacts/plasticity/phase4d1/`, `phase4d2/`, `phase4d3/`, `artifacts/steering_asymmetry/`, and `artifacts/latent_repertoire/` remain strictly frozen and preserved for scientific auditability.
2. **Corrected Namespace Separation:**  
   Any future recomputations must write exclusively to `artifacts/plasticity/harmonized_repaired/` with full provenance logs and git commit hashes.
3. **Manuscript Revisions Required:**  
   - Refactor Section 4 of Phase IV-D paper: retract the "dose-response jump" as a harness artifact; present clean harmonized isolated probe results.
   - Refactor "bistability" claims to describe parametric threshold heterogeneity.
   - Accurately disclose `adaptK = 0` and `depU = 0` in biophysical methods.
   - Disclose Model A (`minSyn = 5` retained only) vs Model B (explicit revival) in Target A and Escape A analyses.
