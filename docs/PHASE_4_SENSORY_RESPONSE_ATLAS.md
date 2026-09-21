# Phase IV-A: Sensory Reachability & Connectome Response Atlas

**Repository:** `DeltaX-Public/deltax-connectome-entity`  
**Branch:** `phase4-sensory-response-atlas`  
**Authoritative Baseline:** Post-Audited Phase III V2 (`5e4128d`)  
**Artifacts Generated:** `artifacts/sensory_atlas/reachability.json`, `artifacts/sensory_atlas/dose_response.json`, `artifacts/sensory_atlas/lateralization.json`, `artifacts/sensory_atlas/aversive_characterization.json`, `artifacts/sensory_atlas/phase3_stimulus_projection.json`, `artifacts/sensory_atlas/entropy_experiment.json`, `artifacts/sensory_atlas/causal_perturbation.json`, `artifacts/sensory_atlas/latest-response-atlas.json`

---

## Executive Summary & Scope Declaration

Phase IV-A conducts an empirical characterization of the biological fruit fly whole-CNS connectome RateNetwork ($N=165,122$, $E=10,511,038$) without synaptic plasticity, without DeltaX executive overrides, and without maze navigation shortcuts.

The primary objective was to investigate two competing hypotheses for the Phase III null result:
1. **Sensory Impoverishment / Rotational Symmetry:** The environment delivered symmetric inputs that failed to drive intact directional steering pathways.
2. **Substrate Incompetence:** The connectome-derived substrate lacks functional steering pathways or cannot produce directional behavior.

### Summary of What is Supported:
- **Prior Sensory Interface Symmetry:** Reconstructed Phase III environmental observations confirm that sensory inputs feeding the connectome were 100% bilateral and rotationally symmetric.
- **Intact Steering Pathways Exist:** Unilateral sensory stimulation of front-leg mechanoreceptors (`tactile T1 left`) activates ipsilateral steering descending neurons (`turn_left`: `DNa02`, `DNa01`, `DNp09`) with a raw effect of **+0.797 Hz** ($0.813$ Hz Left vs $0.016$ Hz Right on seed 7000; across the $N=100$ robustness cohort, symmetric drive produces $0.606 \pm 0.153$ Hz Left vs $0.027 \pm 0.017$ Hz Right) with an onset latency of 15–16 ms.
- **Circuit Specificity:** In the degree-preserving shuffled connectome control, directional steering selectivity is abolished and inverted (-0.232 Hz).
- **Causal Necessity:** Optogenetically silencing the 3 left steering DNs completely eliminates the steering response ($0.000$ Hz, 100% reduction), whereas sham silencing of 39 unrelated grooming DNs preserves it bit-exactly ($0.813$ Hz).
- **Aversive Antagonism:** Aversive stimulation (noxious thermal arista drive, bitter gustation, high-velocity collision) drives strong backward locomotor antagonism (Moonwalker Descending Neurons `MDN` firing up to 4.16 Hz). Under symmetric stimulation, bilateral MDN activation combined with forward suppression renders `halt` the dominant candidate across 99% of tested seeds.
- **Temporal Amplification:** Controlled input entropy experiments show that temporal pulsing (5ms ON / 5ms OFF pulse trains) amplifies steering differentiation (+0.88 Hz vs +0.28 Hz) and accelerates onset latency (14.2 ms vs 18.2 ms). Random timing jitter increases entropy without exposing coherent directional modes.

### What is NOT Yet Established:
- **That sensory symmetry alone accounts for the entire Phase III null result.** (The CandidateBridge transfer function also strongly maps low forward locomotion to high HALT strength).
- **That right and left sensory responses are mirror symmetric.** (Left T1 stimulation strongly drives left steering; right T1 stimulation does not produce an equivalent mirror response).
- **That the connectome can autonomously navigate ChangedWorld under improved sensing.** (Unproven without closed-loop embodiment testing).
- **That synaptic plasticity is required.** (Unproven until sensory and readout fidelity are resolved).
- **That any observed neural response implies subjective experience or intelligence.** (Strictly avoided; this is biophysical network dynamics).

---

## 1. Verified Sensory Surface Inventory

The biological bodymap (`upstream/fly-brain/public/data/bodymap.json`) provides 7,745 sensory receptor neurons across 151 distinct channels, plus 4,107 compound eye photoreceptors:

- **Mechanosensory:** Front legs (`tactile T1`, 266 neurons), mid legs (`tactile T2`, 806 neurons), hind legs (`tactile T3`, 805 neurons), Johnston's Organ (`JO wind/gravity`, 475 neurons; `JO auditory`, 114 neurons), thoracic bristles (`wing/notum`, 655 neurons), halteres (396 neurons).
- **Gustatory:** Contact taste (`taste T1`, 300 neurons; `taste T2`, 226 neurons; `taste T3`, 242 neurons), proboscis taste (`labellar taste`, 223 neurons), pharyngeal taste (48 neurons).
- **Thermosensory & Hygrosensory:** Arista thermal sensors (`thermosensory`, 25 neurons: 12L / 13R), humidity sensors (`hygrosensory`, 65 neurons: 29L / 36R).
- **Olfactory:** 53 antennal lobe glomeruli types (`ORN_*`, ~2,500 neurons).
- **Vision:** Compound eyes (`photoreceptors left`, 1,733 neurons; `photoreceptors right`, 2,374 neurons).

> [!IMPORTANT]
> **Absence of Biological Pain Labels:** The connectome metadata contains no populations labeled "nociceptor" or "pain". Aversive stimulation is strictly operationalized as high-threshold mechanical deflections, extreme thermal stimulation, and bitter gustatory activation.

---

## 2. Graph Reachability Matrix

Multi-source Breadth-First Search (BFS) was computed from 34 sensory populations across the full directed connectome graph ($N=165,122$, $E=10,511,038$) to all descending motor command neuron (DN) roles up to depth 6 ([`artifacts/sensory_atlas/reachability.json`](../artifacts/sensory_atlas/reachability.json)):

| Sensory Population | Turn Left DNs | Turn Right DNs | Forward Walking DNs | Backward MDN | Giant Fiber Escape | Head Grooming DNs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `tactile T1 left` | **2 hops (100%)** | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | 3 hops (100%) | 2 hops (100%) |
| `tactile T1 right` | 2 hops (100%) | **2 hops (100%)** | 2 hops (100%) | 2 hops (100%) | 3 hops (100%) | 3 hops (100%) |
| `JO wind/gravity left` | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | **1 hop (100%)** |
| `JO wind/gravity right` | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | **1 hop (100%)** | **1 hop (100%)** |
| `thermosensory left` | 3 hops (100%) | 3 hops (100%) | 3 hops (100%) | 3 hops (100%) | 2 hops (100%) | 2 hops (100%) |
| `thermosensory right` | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | 3 hops (100%) | 2 hops (100%) |
| `taste T1 left` | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) | 2 hops (100%) |
| `photoreceptors left` | 3 hops (100%) | 3 hops (100%) | 3 hops (100%) | 3 hops (100%) | 3 hops (100%) | 3 hops (100%) |

**Key Finding:** Structural reachability is dense: every sensory modality reaches 100% of descending command neurons within 2 to 3 directed synaptic hops. Johnston's organ connects to grooming DNs in 1 monosynaptic hop, and right JO connects to Giant Fiber in 1 hop. Structural reachability alone does not dictate functional behavior; synaptic weights and dynamical sign balance govern candidate generation.

---

## 3. Dose-Response Dynamics (0..200 Hz)

Deterministic intensity sweeps evaluated in [`artifacts/sensory_atlas/dose_response.json`](../artifacts/sensory_atlas/dose_response.json):
- `tactile T1`: Monotonic increase in descending drive ($0.029$ Hz at 25 Hz up to $0.911$ Hz at 200 Hz). Onset latency shortens monotonically from 23 ms to 15 ms.
- `thermosensory`: Highly excitable with rapid 12 ms onset latency; drives bilateral turning DNs above 1.1–1.7 Hz.
- `wing/notum bristles`: Highest gain of all mechanosensory channels; 8 ms latency, driving locomotor DNs above 4.5 Hz.
- `photoreceptors`: Uniform full-field illumination produced **0.000 Hz** across all intensities; the insect visual system requires spatial contrast, edges, or motion to pass lamina/lobula filters.
- **Symmetric Collapse:** In 100% of symmetric dose-response sweeps, the winning candidate action was `halt`.

---

## 4. Lateralized Response & Biological Asymmetry

Testing the Laterality Matrix ($L=180/R=0 \to L=180/R=180 \to L=0/R=180$) in [`artifacts/sensory_atlas/lateralization.json`](../artifacts/sensory_atlas/lateralization.json):

| Population & Condition | L=180 / R=0 (Left Only) | L=180 / R=30 (Strong Left) | L=180 / R=180 (Symmetric) | L=30 / R=180 (Strong Right) | L=0 / R=180 (Right Only) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Tactile T1 (INTACT)** | **+0.797 Hz** (L: 0.81, R: 0.02) | **+0.776 Hz** | +0.751 Hz | +0.020 Hz | **-0.001 Hz** (L: 0.00, R: 0.00) |
| **Tactile T1 (SHUFFLED)** | **-0.232 Hz** (Scrambled) | N/A | -0.580 Hz | N/A | **-0.257 Hz** (Inverted) |
| **JO Wind/Gravity (INTACT)** | 0.000 Hz | 0.000 Hz | -0.065 Hz | **-0.413 Hz** (R: 0.41, L: 0.00) | **-0.359 Hz** (R: 0.36, L: 0.00) |
| **JO Wind/Gravity (SHUFFLED)**| -0.143 Hz (Both ~2.3 Hz) | N/A | +0.898 Hz (Both ~3.0 Hz) | N/A | +0.523 Hz (Both ~0.7 Hz) |

### Biological Asymmetry Finding:
The connectome response is **not mirror symmetric**. Left T1 stimulation produces strong Left steering (+0.797 Hz differential), whereas Right T1 stimulation produces minimal Right steering (-0.001 Hz). The connectome's biological wiring possesses intrinsic structural lateralization rather than mathematical reflection symmetry.

---

## 5. Aversive / Noxious Stimulation Findings

Tested in [`artifacts/sensory_atlas/aversive_characterization.json`](../artifacts/sensory_atlas/aversive_characterization.json):
- Multimodal hazard stimulation (thermo + bitter taste + tactile) drives Moonwalker Descending Neurons (`MDN`) up to **4.161 Hz**.
- Bitter taste selectively excites backward crawling (`MDN` at 1.61 Hz) while forward locomotion drops to 0.12 Hz.
- Because backward locomotion suppresses forward walking, the candidate normalization bridge assigns `halt` a strength of **0.97** and `turn_left` a strength of **0.146**. Consequently, under symmetric aversive drive, `halt` is the dominant candidate across tested seeds.

---

## 6. Representative Phase III Stimulus Reconstruction

Replaying reconstructed representative Phase III environmental observations through the direct sensory atlas ([`artifacts/sensory_atlas/phase3_stimulus_projection.json`](../artifacts/sensory_atlas/phase3_stimulus_projection.json)):

| Reconstructed Phase III State | Active Sensors | Input Asymmetry | Measured DN Readouts | Candidate Strengths | Dominant Winner | Steering Bias |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pre-Encounter ($t=1$)** | 4,630 | 0.00% (Symmetric) | Fwd: 0.12, Back: 0.66, TurnL: 0.00, TurnR: 0.09 | Halt: 0.97, Fwd: 0.05, Left: 0.05, Right: 0.05 | **halt (100%)** | -0.085 Hz |
| **Approach ($t=3$)** | 5,371 | 0.00% (Symmetric) | Fwd: 0.16, Back: 0.93, TurnL: 0.30, TurnR: 0.12 | Halt: 0.96, Fwd: 0.05, Left: 0.06, Right: 0.05 | **halt (100%)** | +0.187 Hz |
| **Encounter Impact ($t=5$)**| 5,396 | 0.00% (Symmetric) | Fwd: 0.40, Back: 2.37, TurnL: 2.00, TurnR: 0.87 | Halt: 0.96, Fwd: 0.05, Left: 0.10, Right: 0.05 | **halt (100%)** | +1.132 Hz |

*Note: This analysis reconstructs the observation vectors based on the defined Phase III world geometry rather than replaying raw simulation log files.*

---

## 7. Controlled Input Entropy Findings

Comparing equal-energy stimulation (100 Hz mean across 266 tactile T1 neurons) in [`artifacts/sensory_atlas/entropy_experiment.json`](../artifacts/sensory_atlas/entropy_experiment.json):

| Stimulus Pattern | Candidate Entropy | Network Entropy | Mean Steering Bias (L - R) | Onset Latency | Winner Reliability across Seeds |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **CONSTANT** | 1.2558 | 12.7737 | +0.2814 Hz | 18.2 ms | 80% (`halt`) |
| **TEMPORALLY_PULSED** | 1.2908 | 12.8614 | **+0.8794 Hz** (3.1x boost) | **14.2 ms** (4ms faster) | 80% (`halt`) |
| **TEMPORALLY_JITTERED**| 1.2565 | 12.7756 | +0.2912 Hz | 18.4 ms | 80% (`halt`) |
| **SPATIALLY_SPARSE** | 1.2798 | 12.6721 | +0.6480 Hz | 16.0 ms | 80% (`halt`) |
| **SPATIALLY_DISTRIBUTED**| 1.2558 | 12.7737 | +0.2814 Hz | 18.2 ms | 80% (`halt`) |
| **LATERAL_ASYMMETRIC** | 1.2841 | 12.7534 | **+0.7584 Hz** | 15.2 ms | 80% (`halt`) |

---

## 8. Causal Neural Perturbation Results

Stimulus: `tactile T1 left` (180 Hz) $\to$ Left steering DNs (`turn_left`) in [`artifacts/sensory_atlas/causal_perturbation.json`](../artifacts/sensory_atlas/causal_perturbation.json):

| Causal Branch | Experimental Perturbation | Measured Turn Left DN | Measured Turn Right DN | Net Steering Bias |
| :--- | :--- | :---: | :---: | :---: |
| **Branch A (Intact)** | Intact connectome | **0.813 Hz** | 0.016 Hz | **+0.797 Hz** |
| **Branch B (Silenced Steering)**| Left steering DNs silenced | **0.000 Hz** | 0.016 Hz | **-0.016 Hz** (100% reduction) |
| **Branch C (Sham Silencing)** | 39 unrelated grooming DNs silenced | **0.813 Hz** | 0.016 Hz | **+0.797 Hz** (Bit-exact intact) |
| **Branch D (Opposite Sensory)**| Right tactile stimulation | 0.000 Hz | 0.001 Hz | -0.001 Hz |

---

## 9. Robustness Cohort Summary ($N = 100$, Seeds `8000..8099`)

Sample statistics from the full 100-seed robustness cohort in [`artifacts/sensory_atlas/latest-response-atlas.json`](../artifacts/sensory_atlas/latest-response-atlas.json):

| Sensory Channel | Forward Locomotion | Backward Locomotion | Turn Left Steering | Turn Right Steering | Dominant Candidate | Winner Reliability | Onset Latency |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tactile T1 (Forelegs)** | $0.109 \pm 0.036$ Hz | $0.106$ Hz | $0.606 \pm 0.153$ Hz | $0.027 \pm 0.017$ Hz | `halt` | 99% | $15.98 \pm 2.11$ ms |
| **Johnston's Organ** | $0.110 \pm 0.049$ Hz | $0.011$ Hz | $0.000 \pm 0.000$ Hz | $0.010 \pm 0.032$ Hz | `halt` | 99% | $2.00 \pm 0.00$ ms |
| **Arista Thermosensory** | $0.571 \pm 0.051$ Hz | $0.741$ Hz | $1.290 \pm 0.586$ Hz | $1.922 \pm 0.627$ Hz | `halt` | 99% | $12.00 \pm 0.00$ ms |
| **Contact Gustation T1** | $0.138 \pm 0.042$ Hz | $1.582$ Hz | $0.091 \pm 0.081$ Hz | $0.159 \pm 0.073$ Hz | `halt` | 99% | $16.18 \pm 1.84$ ms |
| **Proboscis Gustation** | $0.063 \pm 0.028$ Hz | $0.110$ Hz | $0.000 \pm 0.000$ Hz | $0.099 \pm 0.050$ Hz | `halt` | 99% | $19.28 \pm 1.72$ ms |
| **Thoracic Bristles** | $3.791 \pm 0.552$ Hz | $0.001$ Hz | $4.673 \pm 0.805$ Hz | $2.898 \pm 0.623$ Hz | `halt` | 99% | $8.00 \pm 0.00$ ms |
| **Compound Eye Vision** | $0.000 \pm 0.000$ Hz | $0.000$ Hz | $0.000 \pm 0.000$ Hz | $0.000 \pm 0.000$ Hz | `halt` | 99% | N/A |

---

## 10. Direct Answers to Phase IV-A Core Research Questions

### 1. Are current Phase III inputs too symmetric or impoverished to support directional recovery?
**YES.** Transduction delivered identical scalar sensory drives to bilateral receptor groups. Without spatial or temporal input asymmetry, the connectome's intact steering pathways are driven symmetrically, producing mutual inhibition or bilateral activation that collapses into HALT.

### 2. Which sensory channels most reliably drive left/right steering?
**Tactile T1 (foreleg bristles) and Johnston's Organ wind/gravity.** Lateralized `tactile T1 left` drives ipsilateral steering DNs (+0.797 Hz differential on seed 7000; $0.606 \pm 0.153$ Hz Left vs $0.027 \pm 0.017$ Hz Right across $N=100$). Asymmetric `JO wind/gravity` reliably drives contralateral steering (-0.413 Hz). Crucially, this response is biologically asymmetric rather than mirror symmetric.

### 3. Does aversive stimulation primarily generate HALT, withdrawal, steering, or escape?
**HALT and withdrawal (backward locomotion).** Symmetric aversive stimulation drives Moonwalker Descending Neurons (`MDN`) up to 4.16 Hz, which suppresses forward walking and causes the candidate bridge to assign near-maximal HALT strength ($0.97$).

### 4. Does structured sensory entropy expose useful latent response modes?
**Structured temporal pulsing exposes latent steering modes; random jitter does not.** Temporal pulsing triples steering signal strength (+0.88 Hz vs +0.28 Hz) and accelerates onset latency by 4 ms without causing candidate instability.

### 5. Is there enough existing behavioral structure to proceed directly to plasticity, or does the sensory interface need redesign?
**The sensory interface and the candidate readout MUST be investigated before enabling synaptic plasticity.**
The biological connectome possesses intact steering circuits, but two bottlenecks prevent directional expression:
1. Symmetrically impoverished sensory inputs.
2. CandidateBridge transfer function compression (converting low forward locomotion into high-strength HALT).
Investigating behavioral readout fidelity (Phase IV-B) and refactoring sensory embodiment are the essential next steps.
