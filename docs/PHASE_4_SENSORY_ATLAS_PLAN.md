# Phase IV-A Pre-Registered Sensory Atlas Plan

**Repository:** `DeltaX-Public/deltax-connectome-entity`  
**Protocol Version:** `v1.0.0-frozen`  
**Authoritative Baseline:** Post-Audited Phase III V2 (`5e4128d`)

---

## 1. Primary Research Question & Objectives

Does the current synthetic sensory interface adequately excite the neural pathways needed to generate differentiated behavioral candidates (forward locomotion, backward locomotion, left/right steering, escape, grooming, halting)? Or are current world inputs producing symmetric aversive/mechanosensory states that collapse into HALT?

Does structured sensory asymmetry or controlled input entropy reveal latent steering / escape behavior that is hidden by impoverished or overly symmetric stimulation?

### Methodological Invariants:
1. **Zero Synaptic Plasticity:** $W_{\text{base}}$ is strictly immutable ($\Delta W = 0$). No learning, no reward modulation.
2. **Zero Executive Intervention:** Substrate is evaluated directly via `SensoryAtlasHarness`; DeltaX evaluation is disabled.
3. **Zero Navigation Logic:** Autonomous behavior is probed purely from biological connectome dynamics without maze coordinates or pathfinding hints.
4. **Honest Nociception Terminology:** Aversive stimulation is operationalized as high-threshold mechanical deflections, extreme thermal stimulation, and bitter gustation. No claims of pain or subjective experience are made.

---

## 2. Experimental Dimensions & Stimulus Matrix

### 2.1 Verified Sensory Populations
- Mechanosensory: `tactile T1 left/right`, `tactile T2`, `tactile T3`, `JO wind/gravity left/right`, `wing/notum bristles left/right`, `haltere left/right`
- Gustatory: `taste T1 left/right`, `labellar taste left/right`
- Thermosensory / Noxious: `thermosensory left/right`
- Olfactory: `ORN_DA2` (geosmin / aversive), `ORN_V` (CO2 / aversive), `ORN_DM1` (food attractant), `ORN_DA1` (pheromone)
- Visual: `photoreceptors left/right`

### 2.2 Dose-Response Sweeps
- Firing rate grid: $0, 25, 50, 75, 100, 125, 150, 175, 200$ Hz.
- Duration: 10 ms baseline, 25 ms stimulus, 25 ms post-stimulus decay (60 ms total).

### 2.3 Laterality Sweep Matrix
Evaluates whether directional input gradients $\Delta S = S_L - S_R$ create directional motor candidate fields:
- `L=180 / R=0` (Left only)
- `L=180 / R=30` (Strong left bias)
- `L=180 / R=90` (Moderate left bias)
- `L=180 / R=180` (Symmetric bilateral)
- `L=90 / R=180` (Moderate right bias)
- `L=30 / R=180` (Strong right bias)
- `L=0 / R=180` (Right only)

### 2.4 Controlled Input Entropy Manipulations
Evaluates equal-energy stimulation across 6 structured patterns:
- **A. CONSTANT:** Uniform 100 Hz continuous drive.
- **B. TEMPORALLY_PULSED:** 200 Hz in 5ms ON / 5ms OFF pulses (equal mean energy).
- **C. TEMPORALLY_JITTERED:** 100 Hz $\pm$ 40 Hz random timing jitter.
- **D. SPATIALLY_SPARSE:** 25% of neurons at 400 Hz (equal instantaneous energy).
- **E. SPATIALLY_DISTRIBUTED:** 100% of population at 100 Hz.
- **F. LATERAL_ASYMMETRIC:** L=170 Hz / R=30 Hz (equal total combined energy).

### 2.5 Causal Perturbation Protocol
- Target: `tactile T1 left` (180 Hz) $\to$ `turn_left` DNs.
- Branches:
  - Branch A (Intact): Baseline intact connectome.
  - Branch B (Silenced Steering): Left steering DNs (`DNa02`, `DNa01`, `DNp09` side 1) optogenetically silenced.
  - Branch C (Sham Silencing): 39 unrelated grooming DNs (`DNg07`, `DNg08`) silenced.
  - Branch D (Opposite Sensory): `tactile T1 right` (180 Hz).

---

## 3. Cohort Partitions & Seed Discipline
- **Development Cohort:** Seeds `7000..7049` ($N = 50$)
- **Robustness Atlas Cohort:** Seeds `8000..8099` ($N = 100$)

---

## 4. Pre-Registered Falsification Criteria

1. **Reject Sensory Impoverishment Hypothesis if:**
   - Directional stimulation does not create directional DN responses ($\Delta \text{DN} \le 0.05$ Hz across all lateralized inputs).
   - Steering DN activity remains negligible ($< 0.1$ Hz) across all plausible sensory inputs.
   - Intact and degree-preserving shuffled connectomes respond identically.
   - Phase III inputs already contain strong usable directional differentials.

2. **Support Sensory Impoverishment Hypothesis if:**
   - Phase III sensory inputs are verified to be 100% rotationally symmetric,
   AND
   - Lateralized sensory stimulation reliably and causally drives directional steering DN divergence ($> 0.5$ Hz differential) that is abolished by steering DN silencing and absent in shuffled controls.
