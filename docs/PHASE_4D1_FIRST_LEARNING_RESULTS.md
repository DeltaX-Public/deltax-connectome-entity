# Phase IV-D.1: First Substrate Learning Experiment Results

**Document:** `docs/PHASE_4D1_FIRST_LEARNING_RESULTS.md`  
**Phase:** IV-D.1 Substrate Plasticity Experiment  
**Branch:** `phase4d-plasticity-foundation`  
**Status:** **DEVELOPMENT COHORT EXPERIMENT COMPLETE — NEGATIVE RESULT FROZEN**  
**Classification:** **GOVERNED EMPIRICAL RESEARCH REPORT**  

---

## 1. Executive Summary & Verdict

In Phase IV-D.1, the first experience-dependent substrate plasticity experiment was executed across the 50 reserved development seeds (`18000..18049`, $N=50$) across six controlled conditions (P0 through P5).

### Core Finding:
Under the pre-registered frozen protocol, **neither Target A (afferents), Target B (premotor projection), nor Target C (two-stage) recruited right-steering motor activity**.
- **Right DNa02 Evoked Rate:** Remained at baseline $0.0020 \pm 0.0039\text{ Hz}$ across all experimental conditions (P0 through P4).
- **`turn_right` Candidate Proposal Strength:** Remained at floor $0.0102 \pm 0.0011$ across all experimental conditions (0/50 seeds crossed the $>0.05$ threshold).
- **Right AN03A008 Rate:** Remained at $2.14\text{ Hz}$ (subthreshold).
- **Matched Sham Control (P5):** Saturated 45/50 seeds (consuming $64.35$ budget) due to spontaneous background activity, but produced 0.0 right-steering recruitment, confirming circuit specificity.

In strict compliance with **Section 18 ("Failure is Also Informative")** and the anti-p-hacking rules of the repository, **no parameters were tuned, no thresholds were altered, no reruns were attempted, and held-out seeds were not consumed**.

---

## 2. Frozen Learning Parameters & Consequence Signal

Prior to execution, all experimental parameters were frozen and committed in `artifacts/plasticity/phase4d1/protocol_frozen.json` (commit `755a325`):

| Parameter | Frozen Value | Mechanistic Rationale |
| :--- | :--- | :--- |
| **Learning Rule** | `ELIGIBILITY_MODULATED_HEBBIAN` (P2..P5), `LOCAL_HEBBIAN` (P1), `PLASTICITY_NONE` (P0) | Controlled comparison of three-factor vs. two-factor vs. baseline |
| **Learning Rate ($\eta$)** | $0.15$ | Conservative step size preventing explosive single-step saturation |
| **Eligibility Trace Decay ($\lambda_e$)** | $0.05\text{ tick}^{-1}$ (half-life $\approx 14\text{ ticks} = 140\text{ ms}$) | Standard biological synaptic eligibility window |
| **Passive Efficacy Decay ($\gamma$)** | $0.0005\text{ tick}^{-1}$ | Prevents runaway weight accumulation while preserving learned state |
| **Per-Step Update Rate Limit** | $5.0$ coupling units | Hard bound on maximum weight change per update step |
| **Global Modification Budget** | $420.0$ coupling units | Portfolio-wide ceiling across all eligible edges |
| **Induction Cycles** | $30\text{ cycles}$ ($300\text{ ticks} = 3{,}000\text{ ms}$ total induction) | 30 pairings of stimulus onset + contact clearance |
| **Stimulus Frequency / Population** | $180.0\text{ Hz}$ across all 115 `tactile T1 right` mechanoreceptors | Matches Lane B standardized tactile stimulation protocol |
| **Evaluation Probe Window** | 60 steps total (stimulus active steps 11..35 at 180 Hz) | Bit-exact replication of Lane B evaluation probe |

### Consequence Signal Definition & Zero Privileged Information:
- **Formula:**
  $$g_t = \begin{cases} 0.0 \ (\text{HOLD}) & \text{during stimulus onset (contact} = 1.0) \\ +1.0 \ (\text{REINFORCE}) & \text{upon contact clearance (contact} = 0.0, \Delta c < 0) \\ 0.0 & \text{during ITI quiescent rest} \end{cases}$$
- **Zero Privileged Information Confirmation:**
  - $\Delta p_t$ (progress) was **strictly excluded / zeroed**.
  - No goal coordinates, distance-to-goal, route position, maze geometry, or environment IDs were referenced.
  - Directional labels (`turn_right`, `left`) were completely absent.
  - The signal is 100% mirror-symmetric: identical clearance of left or right contact generates identical scalar $g_t = +1.0$.

---

## 3. P0–P5 Experimental Results (N=50 Development Seeds)

All statistics represent $N=50$ development seeds (`18000..18049`):

| Condition ID | Description | Pre DNa02 (Hz) | Post DNa02 (Hz) | $\Delta$ DNa02 (Hz) | Pre `turn_right` | Post `turn_right` | Recruited Seeds ($>0.05$) | Mean Budget Used | Saturated Seeds |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P0** | Fixed Baseline | 0.0020 | 0.0020 | +0.0000 | 0.0102 | 0.0102 | 0 / 50 (0%) | 0.00 | 0 / 50 |
| **P1** | Ungated Local Control | 0.0020 | 0.0020 | +0.0000 | 0.0102 | 0.0102 | 0 / 50 (0%) | 0.0014 | 0 / 50 |
| **P2** | Afferent Gated (Target A) | 0.0020 | 0.0020 | +0.0000 | 0.0102 | 0.0102 | 0 / 50 (0%) | 0.0005 | 0 / 50 |
| **P3** | Projection Gated (Target B) | 0.0020 | 0.0020 | +0.0000 | 0.0102 | 0.0102 | 0 / 50 (0%) | 0.0000 | 0 / 50 |
| **P4** | Balanced Two-Stage (Target C) | 0.0020 | 0.0020 | +0.0000 | 0.0102 | 0.0102 | 0 / 50 (0%) | 0.0005 | 0 / 50 |
| **P5** | Matched Sham Control (Target D) | 0.0020 | 0.0020 | +0.0000 | 0.0102 | 0.0102 | 0 / 50 (0%) | 64.3530 | 45 / 50 |

---

## 4. Detailed Pre/Post Response Breakdown

### 4.1 Right DNa02 (Descending Steering Actuator, idx 332)
- **Baseline (P0):** Mean $0.0020 \pm 0.0039\text{ Hz}$ (median $0.0003\text{ Hz}$).
- **Post-Induction (P1..P4):** Mean $0.0020 \pm 0.0039\text{ Hz}$ (median $0.0003\text{ Hz}$).
- **Paired Seed Difference:** Exactly $0.0000\text{ Hz}$ across all 50 seeds.
- **Verdict:** Criterion 1 **FAILED** (no increase above baseline).

### 4.2 `turn_right` Candidate Proposal Strength (`READOUT_C`)
- **Baseline (P0):** Mean $0.0102 \pm 0.0011$ (resting floor).
- **Post-Induction (P1..P4):** Mean $0.0102 \pm 0.0011$.
- **Threshold Crossings ($>0.05$):** 0/50 seeds across all conditions.
- **Verdict:** Criterion 2 and 3 **FAILED** (candidate strength remained locked at floor).

### 4.3 Right AN03A008 (Ascending Intermediate Neuron, idx 2937)
- **Baseline Rate:** Mean $2.1384 \pm 0.412\text{ Hz}$.
- **Post-Induction Rate:** Mean $2.1384 \pm 0.412\text{ Hz}$.
- **Verdict:** Tactile stimulation evoked only ~2.14 Hz firing at baseline, which failed to increase.

### 4.4 Left Steering & Off-Target Network Preservation
- **Left DNa02 Evoked Rate:** Pre $1.4341\text{ Hz} \to$ Post $1.4341\text{ Hz}$ ($100\%$ preserved; Criterion 6 passed).
- **Whole-Brain Off-Target Network Divergence ($\Delta \Omega$):** $0.00\%$ across P0..P4 (well within the $\pm 10\%$ bound; Criterion 5 passed).
- **Johnston's Organ (JO) Auditory Probe:** Completely unchanged across all seeds.
- **Thermosensory Probe:** Completely unchanged across all seeds.

---

## 5. Causal Mechanisms of the Negative Result

Inspection of `induction_updates.json` and step-by-step trace logs reveals the precise biophysical and architectural reasons why learning failed to recruit right steering:

```
                  ┌─────────────────────────────────────────────────────────────┐
                  │                 WHY LEARNING FAILED TO INITIATE             │
                  └─────────────────────────────────────────────────────────────┘

    [Tactile Receptors] ──(41 synapses)──> [Right AN03A008] ──(717 syn)──> [Right DNa02]
         (180 Hz)                            (s=6.37, θ=44.1)                  (0.002 Hz)
            │                                       │                              │
            │                                       │                              │
            ▼                                       ▼                              ▼
      Receptor firing                     Subthreshold evoked              Virtually silent
      stops immediately                   firing: only 2.14 Hz             coincidence = 0
      when contact ends                   coincidence ~ 10^-6              (Target B silent)
            │                                       │
            └───────────────┬───────────────────────┘
                            │
                            ▼
              During Clearance Phase (g_t = +1.0):
              Sensory drive is already 0!
              Coincidence collapsed before reward arrived.
              Applied ΔW per cycle < 10^-6 coupling units.
```

### 1. The Temporal Disconnect of Pure Mechanosensory Receptors:
Sensory mechanoreceptors are **transduction-driven only**; unlike central brain neurons, they have zero intrinsic recurrent dynamics or spontaneous background firing.
- During the **Onset Phase** (stimulus active), receptors fired at 180 Hz, but reinforcement was gated off ($g_t = 0.0$ `HOLD`).
- During the **Clearance Phase** (stimulus removed), reinforcement arrived ($g_t = +1.0$), but receptors had already ceased firing ($r_{\text{pre}} = 0$).
- As a result, three-factor coincidence $e_{ij}(t)$ was already decaying, yielding microscopic updates ($\Delta W \approx 2 \times 10^{-7}$ per step). Over 30 cycles, total accumulated $\Delta W$ was only $0.0001$ coupling units.

### 2. The Dynamical Threshold Barrier on `AN03A008`:
As proved by Lane B, right `AN03A008` has an 8x larger segmented volume size scale ($s=6.37$) than its left homologue ($s=0.79$), pushing its firing threshold to $\theta = 44.1$.
- 41 incoming synapses from 8 receptors evoked only $2.14\text{ Hz}$ in whole-brain simulation.
- In Hebbian terms, $r_{\text{pre}} \cdot r_{\text{post}} \approx (1.8) \times (0.021) \approx 0.038$, which was too weak to overcome passive decay ($\gamma$) and build meaningful eligibility.

### 3. Premotor Silence (Target B Bottleneck):
Right `DNa02` (idx 332) fired at only $0.0020\text{ Hz}$ at baseline.
- On the projection edge `2937 -> 332`, postsynaptic rate was virtually zero ($r_{\text{post}} \approx 0.00002$).
- Zero postsynaptic firing produced zero coincidence ($e_{ij} \equiv 0$).
- Consequently, Target B had **exactly 0 applied updates** across all 50 seeds ($0.00$ budget used).

### 4. The Sham Contrast (P5 Proves the Mechanism):
In Condition P5 (Matched Sham on neuron `4306`):
- Unlike sensory receptors, the neurons in the sham pathway are **central brain ascending interneurons with spontaneous recurrent background firing**.
- Even when tactile drive was removed, these neurons continued to fire.
- As a result, when $g_t = +1.0$ arrived, $e_{ij}$ was robustly non-zero, causing **massive potentiation** (mean budget used: $64.35$, with 45/50 seeds saturating at their bounds).
- However, because neuron `4306` has zero downstream connectivity to `DNa02`, its right DNa02 evoked rate remained exactly $0.0020\text{ Hz}$.
- This proves that the learning machinery functions correctly, but requires active pre/post co-firing to engage.

---

## 6. Pre-Registered Success Criteria Evaluation

| Criterion | Requirement | Observed Outcome | Status |
| :--- | :--- | :--- | :--- |
| **1. Right DNa02 Increase** | Post rate increases $> 0.10\text{ Hz}$ | $0.0020\text{ Hz}$ (diff: $+0.0000\text{ Hz}$) | **FAIL** |
| **2. Executable Threshold** | `turn_right` strength crosses $> 0.05$ | $0.0102$ (floor) | **FAIL** |
| **3. Replication Rate** | Crosses threshold in $\ge 50\%$ of seeds ($\ge 25/50$) | $0 / 50$ seeds ($0\%$) | **FAIL** |
| **4. Sham Specificity** | Matched Sham (P5) produces 0 right-steering | $0 / 50$ seeds ($0\%$) | **PASS** |
| **5. Off-Target Network Safety** | Whole-brain rate divergence $\le \pm 10\%$ | $0.00\%$ divergence | **PASS** |
| **6. Left-Side Preservation** | Left DNa02 steering $\ge 85\%$ of baseline | $1.4341\text{ Hz}$ ($100\%$ preserved) | **PASS** |
| **7. Causal Reset Parity** | $\Delta W \to 0$ eliminates acquired response | N/A (no response acquired) | **N/A** |

**Final Protocol Verdict:** **NEGATIVE RESULT (NO RECRUITMENT UNDER FROZEN PROTOCOL).**

---

## 7. Target Comparison (A vs B vs C vs D)

| Target | Description | Mean Budget Used | Mean Post DNa02 | Success Count | Diagnosis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Target A** (P2) | Afferents Only (8 edges) | 0.0005 | 0.0020 Hz | 0 / 50 | Insufficient eligibility due to prompt sensory receptor cessation upon clearance. |
| **Target B** (P3) | Projection Only (1 edge) | 0.0000 | 0.0020 Hz | 0 / 50 | Complete failure of initiation due to silent postsynaptic DNa02 ($r \approx 0$). |
| **Target C** (P4) | Balanced Two-Stage (9 edges) | 0.0005 | 0.0020 Hz | 0 / 50 | Suffered compound bottleneck of both Stage 1 and Stage 2 silence. |
| **Target D** (P5) | Matched Sham Control | 64.3530 | 0.0020 Hz | 0 / 50 | Robust recurrent plasticity confirmed; zero steering effect confirmed. |

---

## 8. Governance & Boundary Compliance Statement

In strict accordance with the DeltaX Unified Governance Contract and the prompt's explicit constraints:
1. **Zero Parameter Tuning:** Parameters were NOT adjusted after observing these results.
2. **Held-Out Seeds Preserved:** Evaluation seeds `19000..19099` were **NOT** touched, accessed, or consumed.
3. **No Navigation Attempted:** No ChangedWorld navigation trials were run.
4. **Frozen Negative Result:** The negative result is frozen and preserved as empirical scientific ground truth.
5. **Next Step:** Return to repository owner for scientific review and direction.
