# Phase IV-D: Lane B Evidence Ingestion & Plasticity Handshake Report

**Document:** `docs/LANE_B_PLASTICITY_HANDSHAKE.md`  
**Phase:** IV-D Convergence Gate  
**Primary Lane (Lane A) Branch:** `phase4d-plasticity-foundation` (PR #20)  
**Steering Asymmetry Lane (Lane B) Branch:** `research/steering-asymmetry` (PR #19)  
**Lane B Ingestion Commit SHA:** `e62fb146e11d8d1b4a745137d84f0b829d39cdeb`  
**Status:** **HANDSHAKE AUDIT COMPLETE — FROZEN READ-ONLY**  
**Classification:** **CROSS-LANE INTEGRATION AUDIT & SPECIFICATION**  

---

## 1. Executive Summary

This document records the formal cross-lane scientific handshake between **Research Lane B** (Steering Asymmetry Causal Investigation) and **Primary Lane A** (Connectome Plasticity Foundation).

Lane B was tasked with independently investigating why right-steering activity (`turn_right`) is suppressed in the biological connectome substrate under lateralized sensory stimulation. Having completed functional causal mapping, counterfactual edge sweeps, active inhibition testing, and $N=100$ validation on commit `e62fb146e11d8d1b4a745137d84f0b829d39cdeb`, Lane B delivered its causal findings and candidate target artifacts.

Primary Lane A has ingested this evidence read-only, audited its methodology and terminology, reconciled its physical synaptic units, created four schema-validated frozen target manifests, and verified that the plasticity runtime propagates effective weight changes through the real `RateNetwork` with bit-exact reversibility.

**Zero training has been executed. No Phase IV-D held-out seeds have been consumed.**

---

## 2. Ingested Lane B Evidence Artifacts & Cryptographic Hashes

All 21 artifacts from Lane B commit `e62fb146e11d8d1b4a745137d84f0b829d39cdeb` (`artifacts/steering_asymmetry/`) were ingested and hashed using SHA-256:

| Artifact Filename | SHA-256 Checksum | Scientific Scope |
| :--- | :--- | :--- |
| `causal_interventions.json` | `cb32ab6685d6d6fc4df3c026aa285400cf876418aa18b91824db644733f93282` | Causal knockouts and sufficiency sweeps |
| `dn_readout_symmetry.json` | `983adfd3fccf9660998c90c142bef304dac95f8fd46b5f974b2cc330a363bad1` | Bilateral DNa02 readout symmetry audit |
| `dynamics_counterfactuals.json` | `8b9f8683f5a5150df307555bf6f72c9e721de0c2ee68f18b3c3a233d3d48e36b` | Rate dynamics counterfactual simulations |
| `edge_counterfactuals.json` | `80e173db919bf6322ffb50a87f08b0ab3740b95ea20767a14a8e27f3bba99976` | Synaptic edge scaling counterfactual sweeps |
| `functional_propagation_trace.json` | `206dce33b23df08ba28d0df6a0154c460425aa815c9071bcff0cbd9982b5910d` | Step-by-step firing rate propagation trace |
| `graph_reachability.json` | `4dd17dbf427bf2b3a18ad6db4564ba90024b83d921e89117c94b57760a099fc0` | Graph-theoretic reachability from sensory to DNs |
| `inhibitory_interventions.json` | `251d7454869065d0b9b691860ca1383629d7674e8d39824017ebfb45cc7b8ec8` | Inactivation of direct GABA/Glu inputs |
| `laterality_audit.json` | `28ed11a00ba2d727e2349c4d820b759da53e81e44fba4e70980995674e227858` | Structural hemisphere-wide laterality statistics |
| `matched_left_right_paths.json` | `b0b74a17dd5a1f1cff465aa7f1041f34fff798fc931cbec0e25688cba821e538` | Left vs right homologous path comparison |
| `mirrored_sensory_response.json` | `51a8f41451afbf67b34765f310c5e03d5afb54b957f46cb7045a57a27fd83b66` | Bilateral sensory stimulation response curves |
| `necessity_interventions.json` | `771f8b8c3fc0c68f06a01dec00ca36ef62d52fd0815a382b4c33f24e179f7031` | Pathway silencing and ablation tests |
| `parameter_audit.json` | `d2c59aad859372b8dfa998e15dd191034e47dd64e6381cb383f375dc3ea7d32f` | Pugliese model parameters audit ($a, \theta, \tau, r_{\max}$) |
| `plasticity_target_candidate.json` | `85104c02a684f295f0e9f770dba5c83a3d2b122c5da3596dd2d0d815f6cc3a4c` | Formal candidate specification delivered to Lane A |
| `propagation_trace.json` | `9f087db2bdbccf94530ff98697eec683d0d5d49065595b830d3c5c7cde4f9b7f` | Baseline neural activation propagation log |
| `receptor_swap.json` | `c3d812ae211da2f8deeb49406eb1cd5d18ea9cc93809d921013b5c05e0b0182c` | Left/right sensory receptor swap experiment |
| `receptor_swap_explicit.json` | `e0a7643180774f194c4b58970bee7bbc38eaf801279f36356875bd1317f01158` | Explicit bilateral receptor wiring swap test |
| `right_tactile_path_candidates.json` | `88daf117e8120581e2f455df7ec8679b1c5c759aa107bc65a9ae0f4598770b88` | Complete candidate pathway enumeration |
| `source_population_audit.json` | `85f95995c141c6a4581f89047877c297b7dbfc6fff3470b27cb74ab0fe6c45a4` | Mechanosensory receptor population census |
| `sufficiency_interventions.json` | `392b453b231b779c80aa49ab34cc586f768b5b007239603b8e54e1bc5ea7ab40` | Direct drive sweeps proving AN03A008 sufficiency |
| `validation.json` | `d31e361767046b8d2b644cbd11ee9e86a4ebf4d76f9a5d7bed4eb8e3800c4c20` | Seed validation cohort results |
| `validation_17000_17099.json` | `8b9c738adcfb57c2dcfa34535dc60e44771ef56f042d518b0d4b82c7e5483395` | Final Phase-2 validation across 100 fresh seeds |

---

## 3. Causal Findings Audit & Terminology Corrections

### 3.1 Mechanistic Localization of Right Steering Absence
Lane B proved that the absence of right steering under tactile stimulation is caused by a **two-factor afferent and threshold bottleneck**:
1. **Afferent Attenuation:** Intact right mechanoreceptors form only 41 chemical synapses onto right intermediate `AN03A008` (idx `2937`) across 8 edges, whereas the homologous left pathway has 78 chemical synapses across 15 edges.
2. **Dynamical Threshold Amplification:** Right `AN03A008` has an 8x larger segmented volume size scale ($s = 6.37$ vs. $0.79$), elevating its activation threshold ($\theta = 44.1$ vs. $5.9$). As a result, 41 incoming synapses produce only 4.98 Hz firing (subthreshold for recruiting downstream motor circuits), whereas the left homologue fires at 24.92 Hz.
3. **Premotor Conduit:** Right `AN03A008` makes a direct, massive cholinergic projection (717 synapses) into right `DNa02` (idx `332`). When `AN03A008` is driven at physiological rates (5 to 40 Hz), right `DNa02` fires at 0.33 to 4.30 Hz, producing `turn_right` candidate proposals with strength up to 0.527.

### 3.2 Terminology Audit & Bounds
1. **Conduit vs. Sole Bottleneck:**
   `AN03A008` is audited and confirmed as a **functionally validated rescue conduit** and an **evidence-supported candidate plasticity locus**, but **NOT** proven to be the *uniquely necessary anatomical bottleneck* in the whole connectome. Other multi-hop polysynaptic pathways may exist but are not recruited in the current substrate.
2. **Inhibition Findings:**
   Lane B's test (`inhibitory_interventions.json`) proves that:
   *"The tested direct inhibitory inputs into right AN03A008 and right DNa02 are not sufficient to explain the tactile steering deficit."*  
   This causal statement is precise and validated. It does **not** claim that all polysynaptic or network-level inhibition throughout the central brain is absent.
3. **Receptor Indices Discrepancy Caught and Resolved:**
   In Lane B's candidate artifact (`plasticity_target_candidate.json`), `source_indices` were written as `[14838, 14840, 14841, 14843, 14844, 14845, 14846, 14847]`, which were indices into Lane B's local mechanoreceptor array. The true global connectome neuron indices (as documented in `right_tactile_path_candidates.json` and verified in CSR `indptr`/`indices`) are:
   $$\text{Receptor Indices} = [149560, 154130, 154675, 154731, 154816, 155200, 156889, 159953]$$
   All frozen target manifests created in Lane A use the verified global connectome indices.

---

## 4. Physical Semantics of $W_{\text{base}}$ & Plasticity Formulation

### 4.1 What $W_{\text{base}}$ Represents
Tracing through `lib_node.mjs` $\to$ `graph_w3.bin` $\to$ `ratenet.js` proves:
- $W_{\text{base}}$ is the **measured anatomical chemical synapse count** ($S_{ij} \in \mathbb{N}_{\ge 5}$) from the Janelia FlyWire connectome.
- Its physical unit is **number of chemical synaptic contacts**.
- In the Pugliese et al. rate model, synaptic input current is:
  $$I_{\text{syn}, i} = b \cdot \sum_j \text{sgn}(j) \cdot S_{ij} \cdot r_j \quad (b = 0.03)$$

### 4.2 Dimensionless Efficacy Formulation
Synaptic plasticity cannot create new physical synapses in real time; it represents activity-dependent changes in **functional synaptic efficacy** (e.g. quantal release probability, AMPA/nAChR receptor insertion).

Therefore, Primary Lane A models plasticity as a **dimensionless efficacy multiplier** $\alpha_{ij}(t)$:
$$\alpha_{ij}(0) = 1.0$$
$$W_{\text{effective}, ij}(t) = S_{ij} \cdot \alpha_{ij}(t)$$
$$\Delta W_{ij}(t) = S_{ij} \cdot (\alpha_{ij}(t) - 1.0)$$

This maintains strict mathematical separation:
- $S_{ij} \equiv W_{\text{base}, ij}$ is immutable biological data (verified by SHA-256 checksum).
- $\alpha_{ij}(t)$ is the stateful efficacy variable.
- RateNetwork dynamics receive $W_{\text{effective}, ij}(t)$ via active `Float32Array` synchronization.

---

## 5. Four Frozen Target Manifests

Primary Lane A created and schema-validated four target manifests in `artifacts/plasticity/`:

```
artifacts/plasticity/
├── target_a_afferent_only.json
├── target_b_projection_only.json
├── target_c_balanced_two_stage.json
└── target_d_matched_sham.json
```

### 1. `TARGET_A_AFFERENT_ONLY`
- **Edges:** 8 feedforward tactile receptor afferents into right `AN03A008` (idx `2937`).
- **Base Synapses:** 41 total ($13, 3, 4, 3, 4, 4, 3, 7$).
- **CSR Edge Indices:** `9810580, 10043060, 10068413, 10070724, 10074108, 10089608, 10147782, 10285249`.
- **Direction:** `POTENTIATION_ONLY` (up to $+150\%$ efficacy, $\alpha \le 2.5$).
- **Budget:** 60.0.

### 2. `TARGET_B_PROJECTION_ONLY`
- **Edges:** 1 ascending premotor projection: `2937` (`AN03A008`) $\to$ `332` (`right DNa02`).
- **Base Synapses:** 717.
- **CSR Edge Index:** `1031330`.
- **Direction:** `POTENTIATION_ONLY` (up to $+50\%$ efficacy, $\alpha \le 1.5$).
- **Budget:** 360.0.

### 3. `TARGET_C_BALANCED_TWO_STAGE`
- **Edges:** All 9 edges (8 afferents + 1 premotor projection).
- **Base Synapses:** 758 total.
- **Direction:** `POTENTIATION_ONLY` (balanced moderate scaling across both stages).
- **Budget:** 420.0.

### 4. `TARGET_D_MATCHED_SHAM`
- **Concept:** Structurally matched negative control centered on ascending intermediate neuron `4306` (`AN06B025`).
- **Edges:** 8 afferents into `4306` (synapse counts $3, 10, 11, 9, 3, 3, 15, 146$) and 1 projection `4306 -> 126142` (579 synapses).
- **Isolation:** Has **zero downstream connectivity** to right `DNa02` (idx `332`).
- **Purpose:** Proves that behavioral rescue is specific to the DNa02 motor circuit and not a generic artifact of potentiating random ascending circuits.

---

## 6. Real Connectome Plasticity Propagation Proof

To prove that the plasticity overlay modifies actual neural dynamics in `RateNetwork` rather than living as a detached data structure, a non-steering diagnostic edge was tested:

- **Diagnostic Edge:** `102` (`VES074`) $\to$ `196` (`CB0677`) (CSR index `103776`, $S_{ij} = 177$).
- **Baseline ($\alpha = 1.0$, $W = 177$):** Exciting pre at 150 Hz produced postsynaptic rate $r_{196} = 3.47\text{ Hz}$.
- **Potentiated ($\alpha = 1.5$, $W = 265.5$):** Postsynaptic rate increased to $r_{196} = 11.18\text{ Hz}$ ($+222\%$).
- **Exact Reset Parity:** Calling `reset()` restored $r_{196}$ to $3.472388\text{ Hz}$ bit-exact (delta = 0).
- **Base Immutability:** $S_{ij}$ array checksum verified strictly identical before, during, and after potentiation.

---

## 7. Status & Handshake Sign-Off

1. **Lane B Status:** Causal mapping complete, validated across $N=100$, artifacts hashed and accepted. Branch `research/steering-asymmetry` remains intact and unmodified.
2. **Lane A Status:** Plasticity substrate complete, 13/13 plasticity tests pass, 77/77 repository tests pass, manifests frozen.
3. **First Experiment:** Preregistered in `docs/PHASE_4D_FIRST_LEARNING_EXPERIMENT.md` with reserved development seeds `18000..18049` ($N=50$).
4. **Execution Gate:** **STOPPED.** Zero training or ChangedWorld execution has been initiated.
