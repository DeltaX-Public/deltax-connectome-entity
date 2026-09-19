# Phase IV-B: Candidate-Readout Selection & Freezing Specification
## Empirical Information-Preservation Analysis Across Frozen Connectome Trajectories

### 1. Executive Decision

Following quantitative evaluation across 35 empirical whole-CNS connectome states from the Phase IV-A Sensory Response Atlas (`artifacts/readout/fidelity_evaluation.json`), we formally select and freeze:

$$\mathbf{READOUT\_C\_INDEPENDENT\_AXES}$$

as the authoritative candidate readout model for Phase IV-B.

This selection is made **strictly on information-preservation criteria** evaluated against frozen neural states, completely independent of navigation or maze performance.

---

### 2. Empirical Information-Preservation Comparison

| Metric | `READOUT_A_CURRENT` (Frozen Baseline) | `READOUT_B_UPSTREAM_REFERENCE` (Direct MuJoCo Port) | `READOUT_C_INDEPENDENT_AXES` (Calibrated Orthogonal Axes) |
| :--- | :---: | :---: | :---: |
| **Lateral Steering Sign Preservation** | 23.8% | 52.4% | **100.0%** |
| **Steering Differential Spearman $\rho$** | 0.1319 | 0.7218 | **1.0000** |
| **Unique Candidate Rank Orderings** | 3 / 35 | 3 / 35 | **15 / 35** |
| **State Collapse Ratio** | 91.4% (Massive Information Loss) | 91.4% | **57.1%** |
| **Winner Distribution across 35 states** | 100% `halt` (35/35) | 100% `halt` (35/35) | `halt`: 9, `fwd`: 9, `back`: 7, `turnL`: 5, `turnR`: 5 |
| **Candidate Field Mean Entropy** | 1.256 bits | 0.348 bits | **0.975 bits** |
| **Dead-Zone Truncation Fraction** | 18.3% (clamped to 0.05 floor) | 12.5% | **0.0%** (continuous zero floor) |

---

### 3. Causal Readout Counterfactual Proof

To isolate whether HALT dominance originated in connectome dynamics or in readout transformation, we evaluated an identical empirical neural state:
$$\text{Unilateral Tactile T1 Drive: } L = 180\text{ Hz}, R = 0\text{ Hz}$$
Measured Descending Neuron Rates:
- $\text{Turn Left (DNa02/DNa01/DNp09)} = 0.813\text{ Hz}$ (Peak neuron $6.681\text{ Hz}$)
- $\text{Turn Right (DNa02/DNa01/DNp09)} = 0.016\text{ Hz}$
- $\text{Steering Differential} = +0.797\text{ Hz}$
- $\text{Forward Locomotor Drive} = 0.071\text{ Hz}$

#### Resulting Candidate Field by Readout:

1. **`READOUT_A_CURRENT`:**
   - `halt`: **0.997** (`DERIVED_NEURAL`) $\to$ **WINNER**
   - `locomotion_forward`: 0.050 (`MEASURED_NEURAL`)
   - `turn_left`: 0.050 (`MEASURED_NEURAL`, clamped to floor)
   - `turn_right`: 0.050 (`MEASURED_NEURAL`, clamped to floor)
   - *Result:* Steering difference ($+0.797\text{ Hz}$) is compressed to $0.050 - 0.050 = 0.000$. HALT wins by $20\times$.

2. **`READOUT_B_UPSTREAM_REFERENCE`:**
   - `halt`: **0.947** (`DERIVED_NEURAL`) $\to$ **WINNER**
   - `turn_left`: 0.053 (`MEASURED_NEURAL`)
   - `locomotion_forward`: 0.010 (`MEASURED_NEURAL`)
   - *Result:* HALT wins because net forward drive is below the $4.0\text{ Hz}$ stepping threshold.

3. **`READOUT_C_INDEPENDENT_AXES`:**
   - `turn_left`: **0.412** (`MEASURED_NEURAL`) $\to$ **WINNER**
   - `locomotion_forward`: 0.023 (`MEASURED_NEURAL`)
   - `halt`: 0.008 (`DERIVED_NEURAL`, suppressed by active turning command)
   - `turn_right`: 0.000 (`MEASURED_NEURAL`)
   - *Result:* The neural turning command cleanly and faithfully wins the candidate field with zero artificial suppression!

---

### 4. Mathematical Definition of `READOUT_C_INDEPENDENT_AXES`

1. **Locomotion Forward:**
   $$s_{\text{fwd}} = 1 - \exp(-\text{fwd\_hz} / 3.0)$$
   Provenance: `MEASURED_NEURAL`.
2. **Steering (Left & Right):**
   $$s_{\text{turnL}} = 1 - \exp(-\max(0, \text{turnL\_hz} - \text{turnR\_hz}) / 1.5)$$
   $$s_{\text{turnR}} = 1 - \exp(-\max(0, \text{turnR\_hz} - \text{turnL\_hz}) / 1.5)$$
   Provenance: `MEASURED_NEURAL`.
3. **Locomotion Backward (Aversive Withdrawal):**
   $$s_{\text{back}} = 1 - \exp(-\text{back\_hz} / 3.0)$$
   Provenance: `MEASURED_NEURAL` (MDN).
4. **Giant Fibre Escape Reflex:**
   $$s_{\text{escape}} = \min(1.0, \text{escape\_hz} / 30.0)$$
   Provenance: `MEASURED_NEURAL` (DNp01 / DNp02 / DNp04).
5. **Quiescent Halt (Standing Stance):**
   $$s_{\text{halt}} = \max(0.005, 0.12 \cdot \exp(-\max(s_{\text{active}}) / 0.15))$$
   Provenance: `DERIVED_NEURAL`. Represents idle standing posture; suppressed when active motor commands are present.
6. **Safe No-Op:**
   $$s_{\text{noop}} = 0.001$$
   Provenance: `FALLBACK`.

---

### 5. Architectural Freeze

This specification is frozen as of commit `7e33050`. No modifications to scales, equations, or candidate generation shall be made during the closed-loop embodiment evaluation.
