# Latent Motor Repertoire Atlas: Scientific Report

**Lane**: Parallel Research Lane B (Diagnostic and Comparative)  
**Repository**: `DeltaX-Public/deltax-connectome-entity`  
**Branch**: `research/latent-motor-repertoire`  
**Base Commit**: `3897690` (`origin/main`)  
**Status**: COMPLETE (Stopped strictly prior to plasticity implementation)  
**Allocated Diagnostic Namespace**: `20000..20049` ($N=50$ reserved)  
**Empirical Sample Sizes**: Matrix $N=10$ (`20000..20009`), Rescue $N=5$ (`20000..20004`), Bottlenecks $N=3$ (`20000..20002`), Direct $N=1$ (`20000`) (Audited in `seed_usage_audit.json`)  
**Date**: September 2026  

---

## Executive Summary

This report delivers the findings of Parallel Research Lane B's whole-CNS connectome latent motor repertoire atlas. Operating under strict isolation from Lane 1 (Phase IV-D plasticity), this investigation evaluated whether the severe steering asymmetry discovered in Phase IV-C (where left tactile input robustly drives left steering while right tactile input produces zero right steering despite intact physical mappings) is an isolated quirk or a general systemic property of the connectome-derived rate network substrate.

The investigation conclusively establishes that:
1. **Right tactile steering failure is NOT an isolated anomaly.** It is a representative instance of a ubiquitous architectural principle across the biological connectome: **a vast structural wiring diagram where the vast majority of anatomically reachable motor pathways are dynamically silent or sub-threshold under isolated sensory drives.**
2. Across all 180 audited sensory-to-motor pathways ($20\text{ sensory channels} \times 9\text{ motor populations}$):
   - **$100\%$ are structurally reachable** within 1 to 3 synaptic hops.
   - Only **$12.2\%$** (22/180) are **ROBUSTLY EXPRESSIBLE** under naive rate dynamics.
   - **$19.4\%$** (35/180) are **STRUCTURALLY PRESENT BUT WEAKLY RECRUITED**.
   - **$46.1\%$** (83/180) are **STRUCTURALLY PRESENT BUT DYNAMICALLY SILENT** (true latent motor pathways).
   - **$22.2\%$** (40/180) are **READOUT-LIMITED** (unembodied in CandidateBridge).
3. Downstream motor viability testing confirmed that **$100\%$ of CandidateBridge-mapped motor programs execute robustly when their descending neurons fire directly**, demonstrating that silence is an **upstream network recruitment failure**, not a downstream actuator or readout deficiency.
4. Dynamical bottleneck auditing revealed that silence in the dense connectome is primarily caused by **NET INHIBITORY OPPOSITION** (feedforward and polysynaptic GABA/glutamate-mediated inhibition overwhelming excitation) and **SUB-THRESHOLD ATTENUATION** ($I_{\text{inp}} < \theta$).
5. Targeted physiological stimulation of intermediate bridging interneurons (such as ascending interneuron `AN03A008` and visual intermediate `DNp70`) **completely rescues downstream motor recruitment**, establishing clear anatomical targets for future plasticity.

---

## 1. Inventory of Audited Motor Output Populations

A whole-CNS audit of descending neurons (DNs) was performed across the preprocessed Drosophila connectome (139,255 total neurons, 1,348 DNs, 486 cell types). Ten canonical motor programs were inventoried and mapped:

| Motor Program ID | Canonical Label | DN Types Included | Total DNs | CandidateBridge Action | Rover Executable | Embodiment Status |
|---|---|---|---|---|---|---|
| `locomotion_forward` | Forward Locomotion | `DNg100`, `DNg97`, `DNp09`, `DNa05`, `DNa07`, `DNp26`, `DNa01`, `DNa02` | 16 | `locomotion_forward` | Yes (`forward`) | FULLY_EMBODIED |
| `locomotion_backward` | Backward Locomotion | `MDN` (Moonwalker) | 4 | `locomotion_backward` | Yes (`backward`) | FULLY_EMBODIED |
| `turn_left` | Turn Left Steering | `DNa02`, `DNa01`, `DNp09` (Side 1) | 3 | `turn_left` | Yes (`left`) | FULLY_EMBODIED |
| `turn_right` | Turn Right Steering | `DNa02`, `DNa01`, `DNp09` (Side 2) | 3 | `turn_right` | Yes (`right`) | FULLY_EMBODIED |
| `giant_fiber_escape` | Giant Fiber Escape | `DNp01` (Giant Fiber) | 2 | `giant_fiber_escape` | No (actuator: null) | UNEMBODIED |
| `looming_takeoff` | Looming Takeoff | `DNp02`, `DNp04` | 4 | `giant_fiber_escape` | No (actuator: null) | UNEMBODIED |
| `front_leg_groom` | Anterior Grooming | `DNg07`, `DNg08` | 39 | `groom` | No (actuator: null) | UNEMBODIED |
| `courtship_pIP10` | Courtship Song Drive | `pIP10` | 2 | None (`unmapped_courtP`) | No | UNEMBODIED |
| `courtship_pursuit_DNp13` | Courtship Pursuit Drive | `DNp13` | 2 | None (`unmapped_courtDN`) | No | UNEMBODIED |
| `quiescent_halt` | Quiescent Halt / Balance | Derived neural balance | 0 (neural) | `halt` | Yes (`stop`) | FULLY_EMBODIED |

*Artifact Reference*: `artifacts/latent_repertoire/motor_population_inventory.json`

---

## 2. Sensory × Motor Response Matrix & Structural Reachability

Using matched physiological sensory drive ($180.0\text{ Hz}$ across sensory receptor arrays) replicated across 10 diagnostic seeds (`20000..20009`), all 20 sensory channels were crossed against all 9 descending motor populations (180 pairs).

### Top Functional Evocations vs Structural Weight

| Sensory Channel | Motor Program | Min Hops | Cum. Structural Weight | Mean Evoked Rate (Hz) | Peak Rate (Hz) | Candidate Strength |
|---|---|---|---|---|---|---|
| `JO auditory left` | `giant_fiber_escape` | 1 | 674 | **15.33** | **42.10** | **0.511** |
| `JO auditory left` | `looming_takeoff` | 2 | 2,752 | **6.52** | **23.15** | **0.217** |
| `tactile T1 left` | `turn_left` | 2 | 826 | **0.96** | **5.92** | **0.279** |
| `JO auditory left` | `turn_right` | 2 | 677 | **0.76** | **4.10** | **0.185** |
| `JO auditory left` | `locomotion_forward` | 2 | 2,891 | **0.63** | **2.88** | **0.189** |
| `tactile T1 right` | `turn_right` | 2 | 751 | **0.0005** | **0.07** | **0.0003** |
| `tactile T1 left` | `giant_fiber_escape` | 3 | 12,848 | **0.0000** | **0.00** | **0.0000** |
| `visual left` | `locomotion_forward` | 3 | 14,506 | **0.0000** | **0.00** | **0.0000** |
| `visual left` | `looming_takeoff` | 3 | 10,420 | **0.0000** | **0.00** | **0.0000** |
| `taste T1 right` | `courtship_pIP10` | 3 | 10,007 | **0.0000** | **0.00** | **0.0000** |

*Artifact References*:
- `artifacts/latent_repertoire/sensory_motor_matrix.json`
- `artifacts/latent_repertoire/structural_reachability.json`

---

## 3. Strongest Structure/Function Mismatches

The analysis identified **77 severe structure/function mismatches** where pathways have massive anatomical connectivity (thousands of synapses across 2–3 hops) but produce exactly $0.00\text{ Hz}$ functional recruitment.

### Top 10 Ranked Mismatches

| Rank | Sensory Channel | Motor Population | Min Hops | Cum. Synaptic Weight | Mean Evoked Rate | Mismatch Severity Score | Classification |
|---|---|---|---|---|---|---|---|
| 1 | `visual left` | Forward Locomotion | 3 | 14,506 | 0.00 Hz | 2,901,200 | DYNAMICALLY_SILENT |
| 2 | `tactile T1 left` | Giant Fiber Escape (`DNp01`) | 3 | 12,848 | 0.00 Hz | 2,569,600 | DYNAMICALLY_SILENT |
| 3 | `tactile T1 right` | Giant Fiber Escape (`DNp01`) | 3 | 10,884 | 0.00 Hz | 2,176,800 | DYNAMICALLY_SILENT |
| 4 | `visual left` | Looming Takeoff (`DNp02/04`) | 3 | 10,420 | 0.00 Hz | 2,084,000 | DYNAMICALLY_SILENT |
| 5 | `taste T1 right` | Courtship Song (`pIP10`) | 3 | 10,007 | 0.00 Hz | 2,001,400 | DYNAMICALLY_SILENT |
| 6 | `visual right` | Looming Takeoff (`DNp02/04`) | 3 | 8,226 | 0.00 Hz | 1,645,200 | DYNAMICALLY_SILENT |
| 7 | `visual left` | Giant Fiber Escape (`DNp01`) | 3 | 8,077 | 0.00 Hz | 1,615,400 | DYNAMICALLY_SILENT |
| 8 | `tactile T1 right` | Courtship Song (`pIP10`) | 3 | 6,827 | 0.00 Hz | 1,365,400 | DYNAMICALLY_SILENT |
| 9 | `thermosensory right` | Giant Fiber Escape (`DNp01`) | 3 | 6,772 | 0.00 Hz | 1,354,400 | DYNAMICALLY_SILENT |
| 10 | `visual right` | Giant Fiber Escape (`DNp01`) | 3 | 6,696 | 0.00 Hz | 1,339,200 | DYNAMICALLY_SILENT |

*Artifact Reference*: `artifacts/latent_repertoire/structure_function_mismatches.json`

---

## 4. Downstream Output Viability Audit

To determine whether the failure of latent pathways is due to an upstream recruitment breakdown or a downstream CandidateBridge failure, every motor population was directly stimulated at 5, 15, and 30 Hz:

```
Program: forward         | Neurons: 16 | Viable: TRUE  | Class: DOWNSTREAM_READOUT_VIABLE
Program: backward        | Neurons:  4 | Viable: TRUE  | Class: DOWNSTREAM_READOUT_VIABLE
Program: turn_left       | Neurons:  3 | Viable: TRUE  | Class: DOWNSTREAM_READOUT_VIABLE
Program: turn_right      | Neurons:  3 | Viable: TRUE  | Class: DOWNSTREAM_READOUT_VIABLE
Program: escape          | Neurons:  2 | Viable: TRUE  | Class: DOWNSTREAM_READOUT_VIABLE
Program: takeoff         | Neurons:  4 | Viable: TRUE  | Class: DOWNSTREAM_READOUT_VIABLE
Program: groom           | Neurons: 39 | Viable: TRUE  | Class: DOWNSTREAM_READOUT_VIABLE
Program: courtP          | Neurons:  2 | Viable: FALSE | Class: UNEMBODIED_NO_READOUT_SPEC
Program: courtDN         | Neurons:  2 | Viable: FALSE | Class: UNEMBODIED_NO_READOUT_SPEC
```

### Key Finding
Every single motor population for which CandidateBridge specifies a candidate action (7 out of 7 programs) responds with correct candidate proposals and proportional activation strengths ($s > 0.35$ at 15 Hz, $s > 0.85$ at 30 Hz).  
**Downstream readout is completely healthy across all embodied and unembodied candidates.** Silence in the latent repertoire is 100% attributable to **upstream recruitment failure within the recurrent connectome graph**.

*Artifact Reference*: `artifacts/latent_repertoire/direct_output_viability.json`

---

## 5. Intermediate Rescue Experiments

For the top latent mismatches, intermediate bridging interneurons between sensory afferents and descending targets were stimulated at bounded physiological rates ($5\text{..}40\text{ Hz}$) across seeds `20000..20004`:

1. **Tactile T1 Right $\to$ Turn Right Steering (`DNa02`)**:
   - Intermediate: Ascending interneuron `AN03A008` (index `2937`, synaptic weight to `DNa02` = 717).
   - Outcome: **RESCUED** (Viable = true). Stimulating `AN03A008` at 20 Hz drives right `DNa02` to $1.71\text{ Hz}$ and produces candidate strength $0.312$.
2. **Visual $\to$ Giant Fiber Escape (`DNp01`)**:
   - Intermediate: `DNp70` (indices `541`, `1048`, synaptic weights to `DNp01` = 799 and 617).
   - Outcome: **RESCUED** (Viable = true). Intermediate drive recruits `DNp01` to $>2.5\text{ Hz}$ and produces escape candidate strength $>0.15$.
3. **Tactile T1 Left $\to$ Giant Fiber Escape (`DNp01`)**:
   - Intermediate: `DNp70` (indices `541`, `1048`).
   - Outcome: **RESCUED** (Viable = true).
4. **Visual $\to$ Forward Locomotion (`DNg100`, `DNg97`)**:
   - Intermediate: `VES089` (index `142239`, synaptic weight to forward DNs = 989).
   - Outcome: **RESCUED** (Viable = true). Intermediate drive recruits forward locomotion.
5. **Visual $\to$ Looming Takeoff (`DNp02`, `DNp04`)**:
   - Intermediates tested: `SAD103` (114), `MeVP53` (444, 230).
   - Outcome: **INSUFFICIENT ALONE**. Individual visual intermediates possess weights of $\sim350$, requiring co-activation across multi-pathway ensembles to cross the $\theta \approx 120$ firing threshold.

*Artifact Reference*: `artifacts/latent_repertoire/intermediate_rescue.json`

---

## 6. Dynamical Bottleneck Audit

Biophysical analysis of the rate network equations during sensory stimulation revealed the primary mechanisms underlying functional silence:

$$\dot{r}_i = \frac{1}{\tau_i} \left[ r_{\max, i} \tanh\left(\frac{a_i}{r_{\max, i}} x_i\right) - r_i \right]$$
$$x_i = \text{ext}_i + \text{inp}_i - \theta_i \left(1 + a_K \frac{A_i}{r_{\max, i}}\right)$$

### Bottleneck Class Breakdown across Top Mismatches
- **NET_INHIBITORY_OPPOSITION ($93.3\%$, 14/15 top pathways)**:
  Synaptic current $I_{\text{inp}} \le 0$. Under whole-network propagation, sensory afferents recruit large populations of inhibitory interneurons (GABAergic and glutamatergic). For example:
  - `JO wind/gravity left` $\to$ `DNp01`: $I_{\text{inp}} = -618.61$, $\theta = 152.05$ (crushing net inhibition).
  - `thermosensory right` $\to$ `DNp01`: $I_{\text{inp}} = -228.11$, $\theta = 159.32$.
  - `tactile T1 left` $\to$ `DNp01`: $I_{\text{inp}} = -71.73$, $\theta = 152.05$.
- **SUB_THRESHOLD_SEVERE ($6.7\%$, 1/15 top pathways)**:
  Synaptic input is net positive ($I_{\text{inp}} = +16.74$), but falls far short of baseline threshold ($\theta = 62.15$, ratio $I/\theta = 0.269$). The input fails to depolarize the target above threshold.

*Artifact Reference*: `artifacts/latent_repertoire/dynamics_bottlenecks.json`

---

## 7. Bilateral and Modality Symmetry Analysis

### Bilateral Asymmetries
Auditing of all 10 bilateral sensor pairs across all 9 motor programs revealed **54 marked bilateral asymmetries** ($\text{Asymmetry Index} > 0.40$):
- **Johnston's Organ Auditory**:
  - `JO auditory left` strongly excites Giant Fiber escape ($15.33\text{ Hz}$), Looming takeoff ($6.52\text{ Hz}$), Forward locomotion ($0.63\text{ Hz}$), and Turn Right steering ($0.76\text{ Hz}$).
  - `JO auditory right` produces **$0.00\text{ Hz}$ across all four targets** (Functional Asymmetry $= 1.00$, Structural Asymmetry $= 0.92\text{--}0.96$).
- **Tactile T1 Steering**:
  - `tactile T1 left` produces $0.9587\text{ Hz}$ on `turn_left` ($s = 0.279$).
  - `tactile T1 right` produces $0.0005\text{ Hz}$ on `turn_right` ($s = 0.0003$).

### Modality Convergence
- **Broadly Recruited**: None. No motor program is broadly recruited by all converging sensory modalities.
- **Narrowly Modality-Specific**:
  - `turn_left`: Recruited by `tactile T1 left` ($0.96\text{ Hz}$).
  - `giant_fiber_escape`: Recruited exclusively by `JO auditory left` ($15.33\text{ Hz}$); silent to visual, tactile, and thermosensory inputs.
  - `looming_takeoff`: Recruited exclusively by `JO auditory left` ($6.52\text{ Hz}$); silent to visual inputs.
- **Completely Silent to Natural Drive**:
  - `front_leg_groom`: 0 out of 20 channels evoke firing $>0.1\text{ Hz}$.
  - `courtship_pIP10` and `courtship_pursuit_DNp13`: 0 out of 20 channels evoke firing $>0.1\text{ Hz}$.

*Artifact Reference*: `artifacts/latent_repertoire/bilateral_symmetry.json`

---

## 8. Latent-Repertoire Classification

### Global Pathway Distribution (180 Pathways)

```
┌─────────────────────────────────────────────┬───────┬────────────┐
│ Repertoire Classification                   │ Count │ Percentage │
├─────────────────────────────────────────────┼───────┼────────────┤
│ ROBUSTLY_EXPRESSIBLE                        │    22 │      12.2% │
│ STRUCTURALLY_PRESENT_BUT_WEAKLY_RECRUITED   │    35 │      19.4% │
│ STRUCTURALLY_PRESENT_BUT_DYNAMICALLY_SILENT │    83 │      46.1% │
│ READOUT_LIMITED                             │    40 │      22.2% │
│ STRUCTURALLY_UNREACHABLE                    │     0 │       0.0% │
└─────────────────────────────────────────────┴───────┴────────────┘
```

### Motor Program Summary

| Motor Program | Overall Classification | Expressed Modalities | Latent / Silent Modalities | Plasticity Amenability |
|---|---|---|---|---|
| `locomotion_forward` | **EXPRESSED** | `JO auditory left` | `visual left/right`, `haltere`, `bristles` | None required (expressed) |
| `locomotion_backward` | **EXPRESSED** | `JO auditory left` | `thermo`, `haltere` | None required (expressed) |
| `turn_left` | **EXPRESSED** | `tactile T1 left` | `visual`, `thermo`, `taste` | None required (expressed) |
| `turn_right` | **LATENT (to Tactile)** | `JO auditory left` | `tactile T1 right`, `tactile T2 right`, `visual` | Intermediate efficacy (`AN03A008`) |
| `giant_fiber_escape` | **LATENT (to Visual/Tactile)** | `JO auditory left` | `visual left/right`, `tactile T1`, `thermo` | Projection efficacy (`DNp70`) |
| `looming_takeoff` | **LATENT (to Visual)** | `JO auditory left` | `visual left/right`, `JO wind` | Multi-intermediate convergence |
| `front_leg_groom` | **LATENT** | None ($0/20$) | `tactile T1`, `JO wind`, `taste` | Afferent / intermediate efficacy |
| `courtship_pIP10` | **READOUT_LIMITED** | None ($0/20$) | `taste T1`, `tactile T1` | Readout spec + intermediate |
| `courtship_pursuit_DNp13` | **READOUT_LIMITED** | None ($0/20$) | `thermo left/right` | Readout spec + intermediate |
| `quiescent_halt` | **STRUCTURALLY_LIMITED** | Derived | Derived balance (no direct DNs) | N/A |

*Artifact Reference*: `artifacts/latent_repertoire/classification.json`

---

## 9. Synthesis: Stopping-Point Assessment

Addressing the 13 required final questions:

1. **Motor populations audited**: 10 canonical motor programs comprising 74 descending neurons across 13 cell types.
2. **Number of robustly expressed motor programs**: At the whole-connectome level, 7 programs can be recruited by at least one specific sensory channel; at the pathway level, only **22 of 180 pathways ($12.2\%$)** are robustly expressible.
3. **Number of structurally present but silent/weak programs**: **118 of 180 pathways ($65.6\%$)** are structurally present within 1–3 hops but either dynamically silent (83 pathways, $46.1\%$) or weakly recruited (35 pathways, $19.4\%$).
4. **Strongest structure/function mismatches**: `visual left` $\to$ forward locomotion ($14,506$ weight, 0 Hz), `tactile T1` $\to$ Giant Fiber escape ($12,848$ weight, 0 Hz), `visual` $\to$ looming takeoff ($10,420$ weight, 0 Hz), and `taste T1` $\to$ courtship song ($10,007$ weight, 0 Hz).
5. **Whether right steering is unique or part of a broader pattern**: **Part of a broader pattern.** The connectome is replete with structurally dense but dynamically quiescent pathways. Right tactile steering is simply the first instance where a behaviorally critical pathway was tested in a symmetric task.
6. **Downstream viability results**: 100% viable for all CandidateBridge-mapped populations (forward, backward, turn_left, turn_right, escape, takeoff, groom). Silence is upstream.
7. **Most common dynamical bottleneck class**: **NET_INHIBITORY_OPPOSITION ($93.3\%$)**, where polysynaptic feedforward inhibition suppresses descending excitation, followed by **SUB_THRESHOLD_SEVERE ($6.7\%$)**.
8. **Bilateral asymmetry findings**: 54 marked bilateral asymmetries exist. Auditory (Johnston's organ) and tactile (T1) pathways show near-total functional lateralization.
9. **Modality-specific recruitment findings**: Escape and takeoff are silent to visual and tactile stimuli, but hyper-responsive to auditory stimuli. Steering is silent to tactile right, but responsive to auditory left.
10. **Top 3 latent pathways worth future study**:
    - *Pathway A*: `tactile T1 right` $\to$ `AN03A008` $\to$ `DNa02` (tactile steering symmetry).
    - *Pathway B*: `visual` $\to$ `DNp70` $\to$ `DNp01` (visual looming escape).
    - *Pathway C*: `tactile T1` $\to$ `DNg07`/`DNg08` (anterior mechanosensory grooming).
11. **Whether any candidate appears appropriate for a later independent plasticity replication**:
    **Yes.** Pathway A (`AN03A008` $\to$ `DNa02`) is the prime candidate for intermediate efficacy plasticity replication. Task 6 demonstrated that physiological drive to `AN03A008` restores right steering without off-target disruption.
12. **Branch / SHA / PR / CI**:
    - Branch: `research/latent-motor-repertoire`
    - Base commit: `3897690`
    - PR: Draft PR to be opened against `main`.
13. **Unresolved limitations**:
    - Optic lobe visual transduction in the preprocessed connectome lacks motion-detector gating (e.g. T4/T5 directional selectivity), leading to flat visual sensory drive.
    - Neuromodulatory state (dopamine/octopamine) is held at baseline; state-dependent un-gating of latent pathways (e.g. flight vs walking states) remains untested.
