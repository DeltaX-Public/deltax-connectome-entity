# Latent Motor Repertoire Atlas: Research Plan

**Lane**: Parallel Research Lane B (Diagnostic and Comparative)  
**Repository**: `DeltaX-Public/deltax-connectome-entity`  
**Branch**: `research/latent-motor-repertoire`  
**Base Commit**: `3897690` (`origin/main`)  
**Status**: Completed Diagnostic Protocol  
**Date**: September 2026  

---

## 1. Executive Summary & Context

During Phase IV-C development and Lane B Phase 1/2 causal investigations, a profound substrate dissociation was uncovered:
At the decisive right-turn tactile fork, telemetry revealed:
- `turn_left`: `raw_rate_hz = 0.387`, `strength = 0.227`
- `turn_right`: `raw_rate_hz = 0.000`, `strength = 0.000`

Causal localization proved that:
1. Physical left/right mapping and body coordinates are intact.
2. CandidateBridge READOUT_C is algebraically mirror-symmetric.
3. Right descending steering neurons (`DNa02`, `DNa01`, `DNp09`) are structurally reachable from right tactile receptors (2 hops).
4. Direct stimulation of right `DNa02` produces vigorous right steering candidates and actuator drive.
5. Non-tactile modalities (auditory, haltere) can activate right steering.
6. The failure is an **upstream recruitment failure** under right tactile drive, mediated by an intermediate bottleneck at ascending interneuron `AN03A008`.

This raises the primary foundational question of this research lane:
> **Is right tactile steering an isolated quirk of the connectome, or is the connectome-derived substrate better understood as a large structural repertoire of motor programs, only a small fraction of which are functionally accessible under naive rate dynamics and isolated sensory drives?**

---

## 2. Lane Boundaries & Governance Locks

To maintain absolute non-interference with Lane 1 (Phase IV-D plasticity and bootstrap learning):
- **NO Plasticity Implementation**: No changes to weights, learning rates, plasticity rules, or dose-response curves.
- **NO Substrate Modification**: RateNetwork parameters, CandidateBridge formulas, and sensory mappings remain strictly frozen.
- **Strict Seed Isolation**: All diagnostic simulations use seeds `20000..20049`. Seeds in the `18000..19999` and `12000..12099` ranges are strictly prohibited.
- **Isolated Branch**: All work is confined to `research/latent-motor-repertoire` in an isolated git worktree.

---

## 3. Methodological Protocol & Tasks

### Task 1: Motor Population Inventory
- Systematic audit of descending neuron populations across the whole-CNS connectome (1,348 total DNs, 486 types).
- Characterization of 10 canonical motor programs:
  1. Forward Locomotion (`DNg100`, `DNg97`, `DNp09`, `DNa05`, `DNa07`, `DNp26`, `DNa01`, `DNa02` — 16 DNs)
  2. Backward Locomotion (`MDN` — 4 DNs)
  3. Turn Left Steering (`DNa02`, `DNa01`, `DNp09` Side 1 — 3 DNs)
  4. Turn Right Steering (`DNa02`, `DNa01`, `DNp09` Side 2 — 3 DNs)
  5. Giant Fiber Escape (`DNp01` — 2 DNs)
  6. Looming Takeoff (`DNp02`, `DNp04` — 4 DNs)
  7. Anterior Grooming (`DNg07`, `DNg08` — 39 DNs)
  8. Courtship Song (`pIP10` — 2 DNs)
  9. Courtship Pursuit (`DNp13` — 2 DNs)
  10. Quiescent Halt (derived neural balance)
- Recorded: neuron indices, body IDs, hemisphere laterality, neurotransmitter codes, in/out degrees, and CandidateBridge mapping.

### Task 2: Sensory × Motor Functional Response Matrix
- Stimulate 20 distinct sensory channels (tactile T1/T2/T3 left/right, Johnston's organ wind/gravity & auditory left/right, thermosensory left/right, taste T1 left/right, visual left/right, wing bristles left/right, haltere left/right) at matched physiological intensity (180 Hz).
- Measure steady-state evoked firing rate, peak rate, latency, and CandidateBridge candidate strength across diagnostic seeds `20000..20009`.

### Task 3: Whole-Brain Structural Reachability Graph
- Compute 3-hop directed BFS on the 10.5M-edge CSR connectome graph for all 20 × 9 pairs.
- Record reachability status, minimum hop count, target coverage, and cumulative synaptic weight.

### Task 4: Structure/Function Mismatch Identification
- Identify pathways where structural weight is heavy ($>500$ cumulative weight) but functional evoked rate is zero or near-zero ($<0.05$ Hz).
- Rank mismatches by severity: $\text{Severity} = \frac{\text{Weight}}{\text{Rate} + 0.005}$.

### Task 5: Direct Output Viability Test
- Directly stimulate descending populations at test rates [5, 15, 30] Hz.
- Verify whether downstream CandidateBridge readout and rover actuators respond correctly, separating upstream recruitment failure from downstream readout failure.

### Task 6: Intermediate Rescue Test
- For top structure/function mismatches, stimulate upstream intermediate bridging interneurons at bounded physiological rates [5..40] Hz across seeds `20000..20004`.
- Test whether intermediate drive bypasses upstream attenuation and rescues motor population recruitment.

### Task 7: Dynamical Bottleneck Audit
- Sample biophysical variables during sensory stimulation: synaptic current ($I_{\text{inp}}$), threshold ($\theta$), input-to-threshold ratio ($I/\theta$), gain ($a$), membrane time constant ($\tau$), adaptation ($A$), and depression ($u$).
- Classify primary dynamical bottleneck mechanisms (net inhibitory opposition, sub-threshold attenuation, adaptation quenching, depression).

### Task 8: Bilateral and Modality Symmetry Analysis
- Compare bilateral homologues across 10 sensory modalities and compute bilateral asymmetry index $\frac{|L - R|}{L + R}$.
- Analyze cross-modality convergence to distinguish modality-specific recruitment from general silence.

### Task 9: Repertoire Classification & Plasticity Amenability
- Classify motor programs and all 180 sensory-motor pathways into:
  - `ROBUSTLY_EXPRESSIBLE`
  - `STRUCTURALLY_PRESENT_BUT_WEAKLY_RECRUITED`
  - `STRUCTURALLY_PRESENT_BUT_DYNAMICALLY_SILENT`
  - `READOUT_LIMITED`
  - `STRUCTURALLY_UNREACHABLE`
- Provide theoretical plasticity amenability analysis without modifying weights.
