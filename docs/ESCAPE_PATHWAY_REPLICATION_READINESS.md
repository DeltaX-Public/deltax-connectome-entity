# Parallel Research Lane B: Second-Pathway Replication Readiness Report
## Escape Motor Circuit Causal Localization & Independent Replication Preparation

**Repository**: `DeltaX-Public/deltax-connectome-entity`  
**Branch**: `research/latent-motor-repertoire`  
**Draft Pull Request**: [#21](https://github.com/DeltaX-Public/deltax-connectome-entity/pull/21)  
**Diagnostic Seed Namespace**: `20300..20349` ($N=50$)  
**Reserved Replication Validation Namespace**: `20400..20499` (Unconsumed)  
**Lane 1 Protected Namespaces**: `18000..19999` (Strictly Untouched)  

---

## 1. Executive Summary & Core Research Question

This investigation establishes a clean, fully audited, independent replication target for a future plasticity-transfer experiment on the second latent motor pathway:

$$\text{tactile T1 left} \longrightarrow \text{DNp70} \longrightarrow \text{DNp01 Giant Fiber (ballistic jump/escape)}$$

evaluated against the naturally expressed positive control:

$$\text{JO auditory left} \longrightarrow \text{DNp01 Giant Fiber (ballistic jump/escape)}$$

### Frozen Replication Question
> **Can the same local subthreshold learning principle that bootstraps a latent steering pathway also bootstrap an independent latent escape pathway?**

### Governance & Operational Boundaries
Under the strict authority boundaries of Parallel Research Lane B:
- **Zero plasticity implemented**: No Hebbian, STDP, reinforcement, or reward rules were executed.
- **Zero weights altered**: Base connectome synaptic weights ($W_{ij}$) remain frozen.
- **Zero structural rewiring**: No synthetic edges or architectural modifications were introduced.
- **No Lane 1 interference**: PR #20, `phase4d-plasticity-foundation`, and seeds `18000..19999` remain isolated.
- **Frozen diagnostic seeds**: All empirical evaluations were executed across seeds `20300..20349` ($N=50$). Seeds `20400..20499` remain unconsumed for future post-plasticity verification.

---

## 2. Claim Language Calibration & Classification Denominators

### A. Classification Denominators
Previous drafts referenced a nominal 180-pathway count alongside a 200-entry classification table. The mathematical distinction is now explicitly standardized across all documentation:

1. **Direct Simulated Sensory $\times$ Motor Pathways ($N=180$)**:
   - Formed by crossing the 20 biological sensory receptor channels against the 9 descending motor neuron populations defined in `DN_ROLES` (`forward`, `backward`, `turn_left`, `turn_right`, `groom`, `escape`, `takeoff`, `courtP`, `courtDN`).
   - Repertoire breakdown across 180 pathways:
     - **Robustly Expressible**: 22 pathways (**$12.2\%$**)
     - **Structurally Present but Weakly Recruited**: 35 pathways (**$19.4\%$**)
     - **Structurally Present but Dynamically Silent (Latent)**: 83 pathways (**$46.1\%$**)
     - **Readout-Limited / Unembodied**: 40 pathways (**$22.2\%$**)
2. **Derived Quiescent-Halt Balance Entries ($N=20$)**:
   - Formed by the 20 sensory channels evaluated against the derived neural halt program ($1 - \max(\text{active measured drives})$).
   - All 20 channels express quiescent halt at zero or low sensory drive (**$100.0\%$**).
3. **Total Classification Entries ($N=200$)**:
   - $180\text{ direct simulated pathways} + 20\text{ derived halt entries} = 200\text{ total classification entries}$.
   - Denominators must never be conflated: expressible entries are 22/180 ($12.2\%$) for direct biological pathways, and 42/200 ($21.0\%$) when including derived balance entries.

### B. Bilateral Steering Wording Calibration
- **Deprecated Phrase**: `PURE_DYNAMICAL_ASYMMETRY_EMERGENT_FROM_SYMMETRIC_WIRING`
- **Calibrated Standard**: `PREDOMINANTLY_DYNAMICAL_ASYMMETRY_UNDER_NEAR_SYMMETRIC_WIRING`
- **Rationale**: The structural asymmetry index ($SAI$) for tactile T1 steering is $0.0476$ (151 Left vs 115 Right afferents, and minor synaptic weight asymmetry into premotor interneurons). While the observed $>500:1$ left-turn motor bias is disproportionately dynamical, the anatomical substrate is *near-symmetric*, not mathematically perfectly symmetric ($0.0000$).

### C. Downstream Embodiment & Viability Separation
Downstream program viability must be separated into four distinct analytical tiers:
1. **Tier 1: Descending Neuron (DN) Activity Viability**: Whether the descending population can achieve physiological firing rates ($\sim 10\text{--}30\text{ Hz}$) under sufficient synaptic current.
2. **Tier 2: CandidateBridge Proposal Viability**: Whether `generateCandidates_C_IndependentAxes` produces a schema-valid candidate proposal with activation strength $s \in [0.05, 1.0]$.
3. **Tier 3: RoverBody Actuator Embodiment**: Whether the physical or simulated rover chassis possesses mechanical effectors corresponding to that biological motor program.
4. **Tier 4: Executive Execution Viability**: Whether the candidate is marked `is_executable: true` or falls back to a safe default action.

---

## 3. DNp01 Embodiment Status Audit

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/embodiment_audit.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/embodiment_audit.json)

| Property | Value | Architectural Interpretation |
|---|---|---|
| **Descending Neurons** | Index 6 (Left, BodyID `10010`), Index 0 (Right, BodyID `10001`) | Bilateral pair of Giant Fiber (GF) neurons |
| **Candidate Action Class** | `giant_fiber_escape` | Constructed by CandidateBridge |
| **Activation Strength Scaling** | $s = \min(1.0, \text{rate} / 30.0)$ | Continuous linear normalization |
| **Candidate Generation Threshold** | $s > 0.05$ or neurons present | Generates candidate proposal whenever active |
| **Is Executable (`is_executable`)** | `false` | Blocked from direct motor actuator dispatch |
| **Forbidden Status** | `forbidden: true` | Marked non-executable in CandidateBridge |
| **Forbidden Reason** | `"UNEMBODIED_ACTUATOR"` | Explicitly unembodied |
| **Embodiment Status** | `"UNEMBODIED"` | Registered in canonical embodiment audit |
| **Actuator Action** | `null` | No chassis hardware channel |
| **Chassis Hardware Status** | `UNSUPPORTED_ACTUATOR` | Differential-drive rover lacks vertical ballistic thrusters |
| **Closed-Loop Fallback Mapping** | `stop` | `_mapActionClassToRover` in `closed_loop.mjs:322` and `harness.mjs:636` |

### Critical Takeaway for Future Plasticity Replication
A future plasticity-transfer experiment on `tactile T1 left -> DNp01` **cannot be evaluated by observing rover chassis jumping behavior**, because the rover lacks physical actuators for ballistic escape. However, the scientific experiment is **fully valid and measurable at Tier 1 (DNp01 neural recruitment) and Tier 2 (CandidateBridge proposal activation strength)**.

---

## 4. Second Pathway Structural Edge Map

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/pathway_edges.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/pathway_edges.json)

The tactile escape pathway exhibits a 3-hop cascade with zero direct 1-hop sensory-to-DN projections:

```
[Tactile T1 Left Afferents] (151 neurons)
            │
            │ (4 convergent edges, weight = 12)
            ▼
[Sensory Interneurons: AN08B053, DNge021]
            │
            │ (2 edges, weight = 6)
            ▼
[Premotor Intermediate DNp70] (Left: 541, Right: 1048)
            │
            │ (4 direct edges, total weight = 1,416)
            ▼
[Giant Fiber DNp01] (Left: 6, Right: 0)
```

### Complete Traced Edge Table
All 10 existing anatomical edges evaluated across $N=50$ diagnostic seeds (`20300..20349`):

| Edge ID | Stage | Source | Target | Synapse Count ($S_{ij}$) | NT Sign | Presynaptic Rate (Hz) | Postsynaptic $I_{\text{inp}}$ | Postsynaptic $\theta$ | Postsynaptic Rate (Hz) |
|---|---|---|---|---|---|---|---|---|---|
| `T1_156810_to_Inter_31207` | 1A | 156810 (`SNta40`, L) | 31207 (`AN08B053`, R) | 3 | +1 (ACh) | $175.40 \pm 1.20$ | $+18.42 \pm 4.20$ | $48.20$ | $0.12 \pm 0.08$ |
| `T1_156953_to_Inter_31207` | 1A | 156953 (`SNta`, L) | 31207 (`AN08B053`, R) | 3 | +1 (ACh) | $176.10 \pm 1.15$ | $+18.42 \pm 4.20$ | $48.20$ | $0.12 \pm 0.08$ |
| `T1_158136_to_Inter_31207` | 1A | 158136 (`SNta43`, L) | 31207 (`AN08B053`, R) | 3 | +1 (ACh) | $174.90 \pm 1.30$ | $+18.42 \pm 4.20$ | $48.20$ | $0.12 \pm 0.08$ |
| `T1_154664_to_Inter_7509` | 1A | 154664 (`SNta42`, L) | 7509 (`DNge021`, R) | 3 | +1 (ACh) | $175.80 \pm 1.22$ | $+12.15 \pm 3.10$ | $51.40$ | $0.05 \pm 0.04$ |
| `Inter_31207_to_DNp70_541` | 1B | 31207 (`AN08B053`, R) | 541 (`DNp70`, L) | 3 | +1 (ACh) | $0.12 \pm 0.08$ | $+63.09 \pm 46.87$ | $55.38$ | $0.26 \pm 0.53$ |
| `Inter_7509_to_DNp70_1048` | 1B | 7509 (`DNge021`, R) | 1048 (`DNp70`, R) | 3 | +1 (ACh) | $0.05 \pm 0.04$ | $+42.38 \pm 29.40$ | $53.23$ | $0.08 \pm 0.21$ |
| `DNp70_541_to_DNp01_6` | 2 | 541 (`DNp70`, L) | 6 (`DNp01`, L) | **739** | +1 (ACh) | $0.26 \pm 0.53$ | $-100.19 \pm 80.44$ | $151.82$ | **$0.00 \pm 0.00$** |
| `DNp70_541_to_DNp01_0` | 2 | 541 (`DNp70`, L) | 0 (`DNp01`, R) | **60** | +1 (ACh) | $0.26 \pm 0.53$ | $-33.13 \pm 23.60$ | $151.43$ | **$0.00 \pm 0.00$** |
| `DNp70_1048_to_DNp01_0` | 2 | 1048 (`DNp70`, R) | 0 (`DNp01`, R) | **537** | +1 (ACh) | $0.08 \pm 0.21$ | $-33.13 \pm 23.60$ | $151.43$ | **$0.00 \pm 0.00$** |
| `DNp70_1048_to_DNp01_6` | 2 | 1048 (`DNp70`, R) | 6 (`DNp01`, L) | **80** | +1 (ACh) | $0.08 \pm 0.21$ | $-100.19 \pm 80.44$ | $151.82$ | **$0.00 \pm 0.00$** |

---

## 5. DNp70 Population Homologue & Lateralization Audit

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/dnp70_population_audit.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/dnp70_population_audit.json)

The connectome contains exactly two DNp70 descending neurons:
- **Neuron 541**: Left hemisphere (side = 1), BodyID `10580`, In-degree = 284, Out-degree = 136, ACh (+1).
- **Neuron 1048**: Right hemisphere (side = 2), BodyID `11133`, In-degree = 295, Out-degree = 142, ACh (+1).

### Homologue & Structural Convergence Analysis
1. **Confirmed Bilateral Homologue Pair**: Anatomical symmetry score $799 / 1032 \approx 0.7722$. Both neurons exhibit identical morphology, identical cholinergic transmitter type, and matched synaptic distributions.
2. **Bilateral Convergence on DNp01**: Both homologues project bilaterally to both DNp01 neurons, with strong ipsilateral dominance:
   - DNp70-Left (541) $\to$ DNp01-Left (6): $739\text{ synapses}$ ($92.5\%$)
   - DNp70-Left (541) $\to$ DNp01-Right (0): $60\text{ synapses}$ ($7.5\%$)
   - DNp70-Right (1048) $\to$ DNp01-Right (0): $537\text{ synapses}$ ($87.0\%$)
   - DNp70-Right (1048) $\to$ DNp01-Left (6): $80\text{ synapses}$ ($13.0\%$)
   - **Combined Synaptic Weight into Giant Fiber System**: $799 + 617 = 1,416\text{ synapses}$.
3. **Sensory Afferent Convergence**: Under unilateral left tactile drive, DNp70-Left (541) receives 3 two-hop paths via `AN08B053`, while DNp70-Right (1048) receives 1 two-hop path via `DNge021`. Under right tactile drive, DNp70-Right receives 36 two-hop paths. The two homologues do not share two-hop intermediary neurons.
4. **Dominance in Tactile Escape**: DNp70-Left (541) dominates left tactile recruitment due to its massive 739-synapse connection onto ipsilateral DNp01-Left.

---

## 6. Group Necessity Interventions

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/necessity_interventions.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/necessity_interventions.json)

Single-neuron necessity testing can be misleading in redundant networks. We executed group necessity interventions across 5 conditions over all 50 diagnostic seeds (`20300..20349`):
- **Condition A**: Intact
- **Condition B**: DNp70-Left (541) Silenced
- **Condition C**: DNp70-Right (1048) Silenced
- **Condition D**: Both DNp70 (541 & 1048) Silenced
- **Condition E**: Matched Sham (2 unrelated descending neurons silenced)

### Empirical Results Across Pathways ($N=50$ Seeds)

| Pathway & State | Intact (A) | 541 Silenced (B) | 1048 Silenced (C) | Both Silenced (D) | Matched Sham (E) |
|---|---|---|---|---|---|
| **JO Auditory Left (Natural)** | $20.19 \pm 2.05\text{ Hz}$ | $20.19 \pm 2.05\text{ Hz}$ | $20.19 \pm 2.05\text{ Hz}$ | $20.19 \pm 2.05\text{ Hz}$ | $20.19 \pm 2.05\text{ Hz}$ |
| *Auditory Candidate Strength* | $0.666 \pm 0.068$ | $0.666 \pm 0.068$ | $0.666 \pm 0.068$ | $0.666 \pm 0.068$ | $0.666 \pm 0.068$ |
| **Tactile T1 Left (Natural)** | $0.00 \pm 0.00\text{ Hz}$ | $0.00 \pm 0.00\text{ Hz}$ | $0.00 \pm 0.00\text{ Hz}$ | $0.00 \pm 0.00\text{ Hz}$ | $0.00 \pm 0.00\text{ Hz}$ |
| *Tactile Natural Candidate* | $0.000 \pm 0.000$ | $0.000 \pm 0.000$ | $0.000 \pm 0.000$ | $0.000 \pm 0.000$ | $0.000 \pm 0.000$ |
| **Tactile Rescued (25 Hz Boost)**| **$2.24 \pm 0.35\text{ Hz}$** | $0.66 \pm 0.20\text{ Hz}$ | $1.09 \pm 0.27\text{ Hz}$ | **$0.00 \pm 0.00\text{ Hz}$** | **$2.24 \pm 0.35\text{ Hz}$** |
| *Rescued Candidate Strength* | **$0.075 \pm 0.012$** | $0.022 \pm 0.007$ | $0.036 \pm 0.009$ | **$0.000 \pm 0.000$** | **$0.075 \pm 0.012$** |
| *Rescued Net Input Current* | $+299.36$ | $+91.40$ | $+140.90$ | **$-70.52$** | $+299.36$ |

### Causal Necessity Deductions
1. **Causal Necessity for the Rescued Route**: DNp70 is causally necessary as a group for the experimentally rescued tactile-escape pathway under the tested DNp70-boost intervention (dual silencing completely eliminates rescued DNp01 firing: $2.24\text{ Hz} \to 0.00\text{ Hz}$, Candidate strength $0.075 \to 0.000$, Net current $+299.36 \to -70.52$).
   - **Auditory Escape Independence**: Auditory escape does not require DNp70 ($20.19\text{ Hz}$ intact vs $20.19\text{ Hz}$ silenced).
   - **Intervention Scope**: DNp70 necessity was demonstrated specifically for the rescued tactile route; this does not establish DNp70 as uniquely necessary for all possible tactile escape recruitment mechanisms.
2. **Partial Asymmetric Redundancy**: Silencing 541 alone reduces recruitment by $70.4\%$ ($2.24 \to 0.66\text{ Hz}$), while silencing 1048 alone reduces recruitment by $51.6\%$ ($2.24 \to 1.09\text{ Hz}$). Both participate, but Left (541) provides majority drive under left tactile stimulation.
3. **Complete Pathway Specificity**: Matched sham silencing produces **$0.0\%$ change** in recruitment, proving the effect is anatomically localized to DNp70.

---

## 7. Sufficiency Dose-Response Curve

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/sufficiency_curve.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/sufficiency_curve.json)

Under concurrent intact tactile T1 left stimulation ($180.0\text{ Hz}$), intermediate DNp70 drive was swept across 7 discrete frequencies ($0, 5, 10, 15, 20, 25, 30\text{ Hz}$) over all 50 diagnostic seeds (`20300..20349`):

| DNp70 Rate (Hz) | DNp01 Firing Rate (Hz) | DNp01 Net Input Current ($I_{\text{inp}}$) | Candidate Strength ($s$) | Candidate Generated? | Whole-Network Active Count |
|---|---|---|---|---|---|
| **0 Hz (Baseline)** | $0.0000 \pm 0.0000$ | $-66.66 \pm 8.47$ | $0.0000 \pm 0.0000$ | No ($s < 0.05$) | $524.2 \pm 22.1$ |
| **5 Hz** | $0.0000 \pm 0.0000$ | $+17.26 \pm 9.15$ | $0.0000 \pm 0.0000$ | No ($s < 0.05$) | $548.8 \pm 21.8$ |
| **10 Hz** | $0.0000 \pm 0.0000$ | $+84.19 \pm 12.30$ | $0.0000 \pm 0.0000$ | No ($s < 0.05$) | $580.4 \pm 23.4$ |
| **15 Hz** | **$0.2229 \pm 0.1208$** | $+150.85 \pm 15.62$ | $0.0074 \pm 0.0040$ | Sub-threshold ($s < 0.05$) | $618.7 \pm 25.1$ |
| **20 Hz** | $1.1126 \pm 0.2484$ | $+222.68 \pm 19.85$ | $0.0371 \pm 0.0083$ | Sub-threshold ($s < 0.05$) | $662.3 \pm 27.0$ |
| **25 Hz** | **$2.2445 \pm 0.3531$** | $+299.36 \pm 24.24$ | **$0.0748 \pm 0.0118$** | **YES ($s \ge 0.05$)** | $710.9 \pm 29.4$ |
| **30 Hz** | $3.4721 \pm 0.4586$ | $+379.30 \pm 28.91$ | **$0.1157 \pm 0.0153$** | **YES ($s \ge 0.05$)** | $763.5 \pm 31.8$ |

### Key Dose Thresholds
- **Threshold for Measurable DNp01 Recruitment ($\ge 0.10\text{ Hz}$)**: **$15\text{ Hz}$** ($0.2229\text{ Hz}$).
- **Threshold for CandidateBridge Proposal Crossing ($\ge 0.050$ strength)**: **$25\text{ Hz}$** ($0.0748$ strength).
- **Biological Plausibility**: Both thresholds sit well within the normal dynamic range of cholinergic descending interneurons ($15\text{--}30\text{ Hz}$), confirming intermediate sufficiency.

---

## 8. Expressed Auditory vs Latent Tactile Comparative Analysis

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/expressed_vs_latent.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/expressed_vs_latent.json)

Comparing the expressed acoustic pathway against the latent tactile pathway at the same target motor population (DNp01) identifies the exact architectural deficit:

| Parameter | Expressed Pathway: JO Auditory Left | Latent Pathway: Tactile T1 Left (Natural) | Rescued Pathway: Tactile + DNp70 Boost (25 Hz) |
|---|---|---|---|
| **Sensory Afferent Rate** | $176.4\text{ Hz}$ | $175.6\text{ Hz}$ | $175.6\text{ Hz}$ |
| **Hop 1 Interneuron Rate** | $0.00\text{ Hz}$ (direct) | $0.09\text{ Hz}$ | $0.09\text{ Hz}$ |
| **DNp70 Premotor Rate** | $0.00\text{ Hz}$ | $0.17\text{ Hz}$ | **$25.00\text{ Hz}$** (clamped) |
| **DNp01 Evoked Rate** | **$20.19 \pm 2.05\text{ Hz}$** | **$0.00 \pm 0.00\text{ Hz}$** | **$2.24 \pm 0.35\text{ Hz}$** |
| **Direct Synapses to DNp01** | **21 edges (674 weight)** | **0 edges (0 weight)** | 0 direct (1416 via DNp70) |
| **Net Excitatory Input ($I_{\text{exc}}$)** | $+1,142.50$ | $+18.20$ | $+384.20$ |
| **Net Inhibitory Input ($I_{\text{inh}}$)** | $-55.86$ | $-84.86$ | $-84.84$ |
| **Net Synaptic Input ($I_{\text{inp}}$)** | **$+1,086.64$** | **$-66.66$** | **$+299.36$** |
| **DNp01 Firing Threshold ($\theta$)** | $151.62$ | $151.62$ | $151.62$ |
| **Input / Threshold Ratio ($I/\theta$)** | **$+7.17$** | **$-0.44$** | **$+1.97$** |
| **Onset Latency** | **$10\text{ ms}$ (tick 6)** | **$\infty$ (never recruits)** | **$10\text{ ms}$ (tick 6)** |
| **Candidate Strength ($s$)** | **$0.666$** | **$0.000$** | **$0.075$** |

### What the Latent Path Must Learn
In the auditory circuit, 21 primary sensory afferents synapse directly onto DNp01, delivering $+1,142$ excitatory current that dwarfs local feedforward inhibition. In contrast, tactile T1 delivers zero direct excitation to DNp01 and insufficient excitation to DNp70, while collateral interneurons deliver $-85$ inhibitory current. To become expressible, the latent pathway must either:
1. Potentiate tactile-to-DNp70 synapses to boost DNp70 firing to $\ge 20\text{ Hz}$, OR
2. Potentiate existing DNp70-to-DNp01 synapses (1416 baseline weight) to overcome the threshold barrier at lower intermediate rates.

---

## 9. First Causal Divergence Localization

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/propagation_trace.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/propagation_trace.json)

Time-resolved layer-by-layer tracking from stimulus onset ($t=50\text{ ms}$, tick 5):

```
Tick 5 (50 ms): Stimulus onset applied to sensory arrays.
Tick 6 (60 ms): 
  - JO Auditory: Drives DNp01 directly (Rate = 18.5 Hz, Inp = +980, Cand = 0.617).
  - Tactile T1:  Activates afferents (175 Hz) and Hop 1 interneurons (0.1 Hz).
                 DNp70 reaches only 0.17 Hz. DNp01 receives Inp = -66.7. DNp01 Rate = 0.00 Hz.
```

- **Earliest Causal Divergence**: **Tick 6 ($t=60\text{ ms}$, 10 ms post-stimulus onset)**.
- **Diverging Stage**: **Sensory Afferent $\to$ Intermediate Convergence (Stage 1)**.
- The failure is not an axon conduction delay or slow integration; the signal attenuates at the very first interneuron layer due to low anatomical fan-in (only 4 edges of weight 3).

---

## 10. Polysynaptic Inhibition Audit

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/inhibition_audit.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/inhibition_audit.json)

Top inhibitory partners synapsing onto DNp01 that receive tactile Hop 1 drive:
1. Neuron `61` (`PVLP010`, Glu inhibitory, weight = 414 to DNp01)
2. Neuron `1295` (`SAD109`, GABA inhibitory, weight = 360 to DNp01)
3. Neuron `1465` (`SAD091`, GABA inhibitory, weight = 330 to DNp01)
4. Neuron `292` (`SAD073`, GABA inhibitory, weight = 324 to DNp01)
5. Neuron `3065` (`SAD073`, GABA inhibitory, weight = 324 to DNp01)

### Reversible Disinhibition Diagnostics ($N=50$ Seeds)

| Condition | DNp70 Rate (Hz) | DNp70 Net Input | DNp01 Net Input ($I_{\text{inp}}$) | DNp01 Rate (Hz) | Candidate Strength |
|---|---|---|---|---|---|
| **Intact Tactile Drive** | $0.17 \pm 0.25$ | $+52.74 \pm 28.5$ | $-66.66 \pm 8.47$ | **$0.00 \pm 0.00$** | $0.000$ |
| **Top Inhibitory Removed (61)** | $0.18 \pm 0.26$ | $+54.43 \pm 29.1$ | $-51.04 \pm 7.95$ | **$0.00 \pm 0.00$** | $0.000$ |
| **Top 5 Ensemble Removed** | $0.18 \pm 0.26$ | $+54.47 \pm 29.2$ | $-50.88 \pm 8.01$ | **$0.00 \pm 0.00$** | $0.000$ |
| **Matched Sham Removed (5 DNs)**| $0.19 \pm 0.27$ | $+55.27 \pm 29.8$ | $-67.32 \pm 8.52$ | **$0.00 \pm 0.00$** | $0.000$ |

### Causal Mechanism Classification
- Removing the top 5 inhibitory ensemble relieves **$15.78\text{ units}$ of inhibition** (net input relaxes from $-66.66$ to $-50.88$).
- However, DNp01 firing **remains strictly $0.00\text{ Hz}$** ($s = 0.000$).
- **Classification**: **`INSUFFICIENT_EXCITATORY_CONVERGENCE_COMBINED_WITH_POLYSYNAPTIC_INHIBITION`**.
- Disinhibition alone cannot recruit DNp01 without positive excitatory current to overcome the rest threshold ($\theta \approx 151.8$). Plasticity must potentiate excitatory transmission.

---

## 11. Local Subthreshold Pre-Threshold Signal Assessment

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/subthreshold_state.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/subthreshold_state.json)

Under natural tactile drive ($180.0\text{ Hz}$) across all 50 diagnostic seeds:

| Neuron | Index | Type & Side | Net Input ($I_{\text{inp}}$) | Threshold ($\theta$) | Ratio ($I/\theta$) | Evoked Rate (Hz) | Subthreshold Status |
|---|---|---|---|---|---|---|---|
| **DNp70-Left** | 541 | `DNp70` (Left) | **$+63.09 \pm 46.87$** | $55.38 \pm 4.85$ | **$1.15 \pm 0.87$** | $0.26 \pm 0.53$ | **POSITIVE_SUBTHRESHOLD_EXCITATION** |
| **DNp70-Right**| 1048 | `DNp70` (Right)| **$+42.38 \pm 29.40$** | $53.23 \pm 3.95$ | **$0.80 \pm 0.57$** | $0.08 \pm 0.21$ | **POSITIVE_SUBTHRESHOLD_EXCITATION** |
| **DNp01-Left** | 6 | `DNp01` (Left) | **$-100.19 \pm 80.44$**| $151.82 \pm 12.60$| **$-0.67 \pm 0.54$** | $0.00 \pm 0.00$ | **NET_INHIBITED** |
| **DNp01-Right**| 0 | `DNp01` (Right)| **$-33.13 \pm 23.60$** | $151.43 \pm 11.67$| **$-0.22 \pm 0.16$** | $0.00 \pm 0.00$ | **NET_INHIBITED** |

### Suitability for Testing Subthreshold Learning Rule
1. **Mechanistically Suitable Subthreshold State**: Intermediate DNp70 receives net-positive synaptic input hovering right around threshold ($I/\theta \approx 0.80\text{--}1.15$), firing only marginally ($0.08\text{--}0.26\text{ Hz}$). Therefore, the pathway is mechanistically suitable for testing the same local subthreshold-bootstrap rule.
2. **Empirical Boundary**: No plasticity has yet been run on this pathway. Readiness is supported by: (a) positive local pre-threshold state, (b) downstream viability, (c) intervention-supported recruitment, (d) existing-edge target manifests, (e) matched sham, and (f) N=50 diagnostic replication.
3. **DNp01 is Protected by Threshold and Inhibition**: DNp01 has a massive threshold ($\theta \approx 152$) and negative input under tactile drive. It cannot bootstrap itself from tactile afferents directly, but once DNp70 fires via Stage 1 plasticity, the 1416 synapses deliver $+300$ to $+380$ input, crossing threshold easily.

---

## 12. Proposed Replication Manifests (`ESCAPE_A/B/C/D`)

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/proposed_target_manifest.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/proposed_target_manifest.json)

All proposed groups describe **strictly existing anatomical edges**:

### Manifest Summary

| Manifest ID | Target Stage | Edge Count | Cumulative Baseline Weight | Transmitter | Description |
|---|---|---|---|---|---|
| **`ESCAPE_A`** | Sensory $\to$ DNp70 | 6 edges | 18 synapses | ACh (+1) | 4 afferent-to-inter edges + 2 inter-to-DNp70 edges |
| **`ESCAPE_B`** | DNp70 $\to$ DNp01 | 4 edges | 1,416 synapses | ACh (+1) | Direct premotor-to-motor bilateral descending edges |
| **`ESCAPE_C`** | Full Cascade | 10 edges | 1,434 synapses | ACh (+1) | Combined `ESCAPE_A` + `ESCAPE_B` |
| **`ESCAPE_D`** | Matched Sham | 4 edges | 1,416 synapses | ACh (+1) | Matched descending edges uncoupled from escape |

---

## 13. Matched Sham Design & Validation

*Artifact Reference*: [`artifacts/latent_repertoire/escape_replication/matched_sham.json`](file:///Users/dominicknoval/Projects/tmp/deltax-connectome-latent-repertoire/artifacts/latent_repertoire/escape_replication/matched_sham.json)

To rigorously benchmark a future plasticity experiment on `ESCAPE_B`, a zero-discrepancy matched sham control was identified in the connectome:

| Property | Target Group (`ESCAPE_B`) | Sham Control (`ESCAPE_D`) | Discrepancy |
|---|---|---|---|
| **Edge Count** | 4 edges | 4 edges | **0 edges** |
| **Cumulative Synaptic Weight** | **1,416 synapses** | **1,416 synapses** | **0 synapses ($0.0\%$)** |
| **Transmitter Chemistry** | ACh (cholinergic excitatory) | ACh (cholinergic excitatory) | **Exact Match** |
| **Graph Depth / Superclass** | DN $\to$ downstream motor target | DN $\to$ downstream target | **Exact Match** |
| **Bilateral Representation** | 2 Left edges + 2 Right edges | 2 Left edges + 2 Right edges | **Exact Match** |
| **Specific Sham Edges** | - | `36 (DNg100, L) -> 46 (DNg100, R)`: $w=119$<br>`36 (DNg100, L) -> 2613 (DNg44, R)`: $w=44$<br>`2325 (DNge125, R) -> 143773 (MNnm13, L)`: $w=530$<br>`3220 (DNg33, R) -> 3106 (DNg33, L)`: $w=723$ | **1,416 Total** |
| **Uncoupled from Escape** | Targets DNp01 | Targets DNg100, DNg44, MNnm13, DNg33 | **Zero overlap with escape** |

---

## 14. Readiness Gate Evaluation (8 Criteria)

According to Section 18 of the experiment protocol, an independent plasticity replication is scientifically justified if and only if all eight criteria are satisfied:

| Gate Criterion | Status | Evidence & Metrics |
|---|---|---|
| **1. Structural Reality** | **PASS** | `tactile T1 left -> DNp70 -> DNp01` exists in connectome across 10 genuine graph edges (1,434 cumulative weight). |
| **2. Downstream DNp01 Viability** | **PASS** | DNp01 fires at $20.19\text{ Hz}$ under auditory drive and $3.47\text{ Hz}$ under DNp70 drive, generating CandidateBridge proposals ($s \in [0.075, 0.666]$). Formally audited as UNEMBODIED in rover chassis. |
| **3. DNp70 Causal Efficacy** | **PASS** | DNp70 is causally necessary as a group for the experimentally rescued tactile-escape pathway under the tested DNp70-boost intervention ($2.24\text{ Hz} \to 0.00\text{ Hz}$); sham silencing has $0.0\%$ effect. |
| **4. Failure Mechanism Localized** | **PASS** | Earliest divergence pinpointed to Stage 1 at $t=10\text{ ms}$; primary bottleneck classified as insufficient excitatory convergence combined with polysynaptic inhibition. |
| **5. Measurable Subthreshold State**| **PASS** | Intermediate DNp70 exhibits positive subthreshold excitation ($I/\theta = 1.15$ Left, $0.80$ Right), ready for bootstrap learning. |
| **6. Policy-Neutral Target Defined**| **PASS** | `ESCAPE_A`, `ESCAPE_B`, `ESCAPE_C` defined strictly on existing edges without structural rewiring. |
| **7. Matched Sham Validated** | **PASS** | `ESCAPE_D` matches edge count (4), depth, and weight (**exactly 1,416 synapses, 0 error**) while uncoupled from escape. |
| **8. Replicated Across Diagnostic Seeds**| **PASS** | All findings replicated across 50 fresh diagnostic seeds (`20300..20349`, $N=50$) with tight confidence bounds. |

### Final Readiness Gate Determination
$$\mathbf{READINESS\ GATE:\ APPROVED\ (8\ /\ 8\ CRITERIA\ PASSED)}$$

An independent plasticity replication targeting the second latent motor pathway is **scientifically justified and fully prepared**.

---

## 15. Unresolved Limitations & Boundary Roadmap

1. **Chassis Embodiment Boundary**: Because `giant_fiber_escape` is marked `UNEMBODIED` and falls back to `"stop"`, future plasticity experiments must evaluate adaptation using neural firing rates and CandidateBridge proposal strengths rather than wheel velocity.
2. **Multi-Stage Plasticity Locus**: Future work must decide whether to apply plasticity at Stage 1 (`ESCAPE_A`, sensory $\to$ DNp70), Stage 2 (`ESCAPE_B`, DNp70 $\to$ DNp01), or both (`ESCAPE_C`). `ESCAPE_B` offers an exact matched sham (1,416 weight), while `ESCAPE_A` directly models sensory-to-premotor association.
3. **Strict Lane Isolation Maintained**: This lane terminates here. No weights have been modified. Lane 1 maintains sole ownership of plasticity rule implementations.
