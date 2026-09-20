# Phase IV-D Experiment Plan (DRAFT)

**Document:** `docs/PHASE_4D_EXPERIMENT_PLAN_DRAFT.md`  
**Phase:** IV-D Connectome Plasticity & Bilateral Generalization  
**Status:** **HISTORICAL DRAFT — SUPERSEDED**  
**Classification:** **UNSEALED PLANNING DRAFT — NON-EXECUTABLE (PROVENANCE ONLY)**

---

> [!IMPORTANT]
> **HISTORICAL DRAFT — SUPERSEDED**
>
> This document predates the Lane B causal-localization results and is retained
> for provenance. The governing subsequent documents are:
>
> - [`PHASE_4D_FIRST_LEARNING_EXPERIMENT.md`](PHASE_4D_FIRST_LEARNING_EXPERIMENT.md)
> - [`PHASE_4D1_FIRST_LEARNING_RESULTS.md`](PHASE_4D1_FIRST_LEARNING_RESULTS.md)
> - [`PHASE_4D1B_NULL_MECHANISM_AUDIT.md`](PHASE_4D1B_NULL_MECHANISM_AUDIT.md)
> - [`PHASE_4D2_BOOTSTRAP_PLASTICITY_PLAN.md`](PHASE_4D2_BOOTSTRAP_PLASTICITY_PLAN.md)
> - [`PHASE_4D2_BOOTSTRAP_PLASTICITY_RESULTS.md`](PHASE_4D2_BOOTSTRAP_PLASTICITY_RESULTS.md)
>
> Do not use this draft as the active experimental protocol.

---

## 1. Status Notice & Governed Lane Boundary

> [!NOTE]
> **HISTORICAL STATUS AT AUTHORING TIME:**  
> In accordance with project governance and parallel research lane partitioning, **Lane A (Primary Architecture) does NOT preregister or execute the following items until Lane B (Steering Asymmetry Lane) delivers its causal findings**:
> - Specific target neural populations or synaptic pathways
> - Numerical learning rate ($\eta$)
> - Final learning rule selection
> - Preregistered held-out evaluation seeds
> - Quantitative success thresholds for bilateral generalization

---

## 2. Research Context & Lane Partitioning

- **Primary Problem Identified in Phase IV-C:**  
  The unadapted connectome-derived RateNetwork exhibits an endogenous leftward steering bias under lateralized obstacle contact. At decisive forks where right turns are physically mandatory (`ENV_1B_TRUE_RIGHT_REQUIRED`, `ENV_POLARITY_RIGHT`), `turn_right` descending neuron drive is $0.0\text{ Hz}$. DeltaX executive selection cannot execute actions absent from the substrate proposal field.
- **Lane B Mandate (`research/steering-asymmetry`):**  
  Investigates why right-steering activity is suppressed. Identifies whether the bottleneck is topological (missing or asymmetric connectivity), dynamical (inhibitory shunt or runaway recurrent suppression), or sensory transduction imbalance.
- **Lane A Mandate (`phase4d-plasticity-foundation`):**  
  Builds and verifies the generic, bounded plasticity overlay, eligibility trace infrastructure, modulatory consequence channels, and counterfactual branching tools.

---

## 3. Preregistration Workflow (Upon Receipt of Lane B Evidence)

When Lane B publishes its causal findings and schema-compliant manifests (`artifacts/plasticity/target_a_afferent_only.json`, `artifacts/plasticity/target_b_projection_only.json`, `artifacts/plasticity/target_c_balanced_two_stage.json`, `artifacts/plasticity/target_d_matched_sham.json`):

1. **Manifest Intake & Integrity Validation:**  
   Validate manifest against `artifacts/plasticity/target_manifest.schema.json` using `validateTargetManifest()`.
2. **Pathway Eligibility Masking:**  
   Configure `PlasticityOverlay` with the evidence-selected `eligibleEdgeMask`. Confirm that non-targeted connectome pathways remain 100% frozen ($W_{\text{effective}} = W_{\text{base}}$).
3. **Controlled Development Run (Cohort Dev, N=25):**  
   Evaluate candidate learning rules (`LOCAL_HEBBIAN`, `ANTI_HEBBIAN`, `ELIGIBILITY_MODULATED_HEBBIAN`, `RATE_STDP_APPROXIMATION`) across development seeds to select the rule that enables right-turn emergence without disrupting existing left-steering competence.
4. **Counterfactual Dissection:**  
   Execute Branches A through E to confirm that right-steering emergence causally requires $\Delta\mathbf{W}$ at the identified locus.
5. **Freeze & Seal Held-Out Protocol:**  
   Preregister held-out seed ranges, compute thresholds, and seal held-out evaluation scripts prior to benchmark unsealing.

---

## 4. Methodological Invariants (Immutable Constraints)

- **$W_{\text{base}}$ Immutability:** The base connectome weights must never be modified. All adaptation resides in $\Delta\mathbf{W}$.
- **Zero Policy Leakage:** The learning system must never receive semantic labels such as "turn right" or "turn left". Modulatory signals are strictly derived from physical consequence channels.
- **Bilateral Coexistence:** Any plasticity update that enables right steering must not abolish or impair left-steering competence on `ENV_POLARITY_LEFT` and canonical environments.
- **Full Provenance:** Every weight modification must record its exact timestep, edge index, base weight, $\Delta W$, eligibility, and modulatory drive.

---

**END DRAFT PLAN.** Awaiting Lane B causal delivery.
