# Phase IV-D.2: Subthreshold Bootstrap Plasticity Experiment Plan
## Preregistration of Subthreshold-Sensitive Three-Factor Learning Protocol

> [!NOTE] Historical Document — Executed Development Plan
> This plan was preregistered for Phase IV-D.2 development and executed on development seeds `18100..18149`. Full empirical findings are documented in [`docs/PHASE_4D2_BOOTSTRAP_PLASTICITY_RESULTS.md`](./PHASE_4D2_BOOTSTRAP_PLASTICITY_RESULTS.md) and extended by the Phase IV-D.3 dose-response study in [`docs/PHASE_4D3_DOSE_RESPONSE_RESULTS.md`](./PHASE_4D3_DOSE_RESPONSE_RESULTS.md). Merged via PR #20 (`5fa548e`). Reserved Phase IV-D held-out evaluation on seeds `19000..19099` remains paused and unconsumed.

**Document:** `docs/PHASE_4D2_BOOTSTRAP_PLASTICITY_PLAN.md`
**Phase:** IV-D.2 Subthreshold Bootstrap Plasticity Design
**Branch:** `phase4d-plasticity-foundation`
**PR:** DeltaX-Public/deltax-connectome-entity#20 (Merged: `5fa548e`)
**Status:** **HISTORICAL PREREGISTRATION — EXECUTED ON DEVELOPMENT SEEDS (18100..18149) — HELD-OUT CONFIRMATION PAUSED**
**Classification:** **GOVERNED SCIENTIFIC RESEARCH SPECIFICATION**

---

## 1. Scientific Objective & Hypothesis

### Core Scientific Question:
> **Can a local three-factor plasticity rule that is sensitive to subthreshold postsynaptic dendritic drive escape `ASSOCIATIVE_BOOTSTRAP_DEADLOCK` and recruit right-steering motor program without privileged policy information?**

### Working Hypothesis:
In the intact fly connectome, the tactile-to-right-steering pathway is structurally connected (41 base synapses into intermediate AN03A008, 717 base synapses into actuator DNa02), but physiologically subthreshold. When stimulated with tactile input, the postsynaptic dendritic arbor receives significant synaptic input ($\text{inp} = 97.99$, covering $68.4\%$ of motor threshold), but the somatic spike generator remains silent ($r_{\text{post}} = 0.0000\text{ Hz}$).

By replacing somatic firing rate coincidence with a **postsynaptic subthreshold drive sensitivity** ($\psi_{\text{post}}$), an unassisted connectome can accumulate synaptic eligibility during sensory stimulation, receive physical reinforcement upon contact clearance, and incrementally potentiate silent pathways until they cross threshold.

---

## 2. Strict Information-Theoretic Governance & Boundary Invariants

The proposed Phase IV-D.2 learning rule adheres strictly to the core governance constraints of the DeltaX project:

### Zero Privileged Policy Information:
The learning rule and modulatory channels MUST NOT access:
1. Neuron semantic labels (`AN03A008`, `DNa02`, `sensory`, `motor`).
2. Desired actions (`turn_right`, `turn_left`, `forward`).
3. Goal coordinates, distance-to-goal, target bearing, or progress metrics.
4. Route positions, maze branch identifiers, or environment IDs.
5. Target firing rates, target candidate strengths, or desired $\alpha$ values.
6. Lane B counterfactual rescue values (e.g., $1.5\times$ or $2.0\times$ manually injected weights).

### Information-Flow Invariant:
All plasticity updates must depend solely on:
$$\Delta \alpha_{ij}(t) = \mathcal{F}\Big(\underbrace{r_j(t)}_{\text{local pre activity}}, \ \underbrace{\psi_i(t)}_{\text{local post state}}, \ \underbrace{g(t)}_{\text{scalar physical consequence}}\Big)$$

---

## 3. Mathematical Formulation of the Candidate Bootstrap Rule

### 3.1 Local Postsynaptic Subthreshold State $\psi_i(t)$
Derived directly from `RateNetwork` internal variables (`upstream/fly-brain/src/ratenet.js`):
- $\text{inp}[i]$: Summed synaptic input arriving at neuron $i$:
  $$\text{inp}[i] = \sum_j \text{preFactor}[j] \cdot \Delta \text{out}[j] \cdot W_{ji}$$
- $\theta_i$: Static somatic firing threshold.

We define the dimensionless postsynaptic dendritic activation ratio:
$$\phi_i(t) = \frac{\text{inp}[i](t)}{\theta_i}$$

To smoothly integrate subthreshold dendritic excitation while preserving stability during superthreshold firing, we define the composite postsynaptic drive:
$$\psi_i(t) = \max\left(0, \ \tanh\Big(\beta_{\text{sub}} \cdot \phi_i(t)\Big) + \frac{r_i(t)}{100.0}\right)$$
where $\beta_{\text{sub}} = 1.0$ is a fixed scaling factor ensuring $\tanh(\phi_i) \in [0, 1]$.

### 3.2 Eligibility Trace Formulation
The eligibility trace $e_{ij}(t)$ updates according to:
$$e_{ij}(t) = e_{ij}(t-1) \cdot (1 - \lambda_e) + \left(\frac{r_j(t)}{100.0}\right) \cdot \psi_i(t)$$
- Presynaptic term: $\frac{r_j(t)}{100.0}$ (normalized firing rate of presynaptic mechanoreceptors).
- Postsynaptic term: $\psi_i(t)$ (local dendritic activation ratio + somatic rate).
- When a pathway is completely silent ($\text{inp}_i \le 0$ and $r_i = 0$), $\psi_i = 0 \implies e_{ij} = 0$.
- When presynaptic neurons fire and deliver synaptic input to the dendritic arbor ($\text{inp}_i > 0$), $\psi_i > 0$, generating eligibility even if $r_i = 0$.

### 3.3 Three-Factor Modulatory Update
The efficacy update remains gated by the scalar consequence signal $g_t \in [-1, 1]$:
$$\Delta W_{\text{prop}}(t) = \eta \cdot g_t \cdot e_{ij}(t) - \gamma \cdot \Delta W(t-1)$$
$$\alpha_{ij}(t) = \frac{S_{ij} + \Delta W(t)}{S_{ij}}$$

---

## 4. Frozen Experimental Conditions (Retaining Causal Targets)

Phase IV-D.2 maintains the exact 5-way target comparison established in Phase IV-D.1:

| Condition ID | Causal Target Manifest | Plasticity Rule | Target Description |
| :--- | :--- | :--- | :--- |
| **C0 (Baseline)** | None | `PLASTICITY_NONE` | Unmodified connectome baseline |
| **C1 (Afferent)** | `TARGET_A_AFFERENT_ONLY` | `SUBTHRESHOLD_ELIGIBILITY_HEBBIAN` | 8 feedforward mechanoreceptors $\to$ AN03A008 (41 base synapses) |
| **C2 (Projection)**| `TARGET_B_PROJECTION_ONLY` | `SUBTHRESHOLD_ELIGIBILITY_HEBBIAN` | Ascending projection AN03A008 $\to$ DNa02 (717 base synapses) |
| **C3 (Two-Stage)** | `TARGET_C_BALANCED_TWO_STAGE` | `SUBTHRESHOLD_ELIGIBILITY_HEBBIAN` | Combined 2-stage target (receptors $\to$ AN03A008 $\to$ DNa02) |
| **C4 (Sham)** | `TARGET_D_MATCHED_SHAM` | `SUBTHRESHOLD_ELIGIBILITY_HEBBIAN` | Matched intermediate 4306 and uncoupled downstream targets |

---

## 5. Prohibition of Parameter Escalation

To ensure that learning is driven by biophysical mechanism rather than brute-force overparameterization, the following parameters remain **strictly frozen at Phase IV-D.1 values**:

| Parameter | Phase IV-D.1 Value | Phase IV-D.2 Value | Escalation Status |
| :--- | :--- | :--- | :--- |
| **Learning Rate ($\eta$)** | $0.15$ | $0.15$ | **FROZEN (No Increase)** |
| **Trace Decay ($\lambda_e$)** | $0.05\text{ tick}^{-1}$ | $0.05\text{ tick}^{-1}$ | **FROZEN (No Increase)** |
| **Passive Decay ($\gamma$)** | $0.0005\text{ tick}^{-1}$ | $0.0005\text{ tick}^{-1}$ | **FROZEN (No Increase)** |
| **Per-Step Rate Limit** | $5.0$ | $5.0$ | **FROZEN (No Increase)** |
| **Induction Duration** | 30 cycles (300 ticks) | 30 cycles (300 ticks) | **FROZEN (No Extension)** |
| **Stimulus Intensity** | $180.0\text{ Hz}$ | $180.0\text{ Hz}$ | **FROZEN (No Boost)** |
| **Reward Signal ($g_t$)** | $+1.0$ upon clearance | $+1.0$ upon clearance | **FROZEN (No Inflation)** |
| **Target Manifests** | Frozen A, B, C, D | Frozen A, B, C, D | **FROZEN (No Changes)** |
| **Initial $\alpha$** | $1.0000$ | $1.0000$ | **FROZEN (No Seeding)** |

### Specific Negative Prohibitions:
- Prohibited from raising $\eta$ to force numerical growth.
- Prohibited from artificially stimulating or clamping DNa02 during induction.
- Prohibited from initializing $\alpha > 1.0$ using Lane B rescue values.
- Prohibited from leaking navigational reward or directional goals into $g_t$.

---

## 6. Seed Cohort Allocation

### Reserved Fresh Development Cohort:
- **Seed Range:** `18100..18149` ($N=50$).
- **Usage:** Phase IV-D.2 Development and Tuning ONLY.

### Untouched Held-Out Cohort:
- **Seed Range:** `19000..19099` ($N=100$).
- **Status:** **STRICTLY FROZEN AND UNCONSUMED.** Held-out evaluation will only be unlocked after Phase IV-D.2 development is completed and frozen.

---

## 7. Preregistered Success Criteria

Phase IV-D.2 will be evaluated against the following preregistered quantitative criteria:

1. **Criterion 1 (Right DNa02 Evoked Rate):**
   Mean evoked rate of right DNa02 during standardized tactile probe exceeds $>0.50\text{ Hz}$ in Condition C3 (Two-Stage).
2. **Criterion 2 (Candidate Action Strength):**
   `turn_right` candidate proposal activation strength under Readout C exceeds $>0.050$ (breaking above baseline resting floor of $0.010$).
3. **Criterion 3 (Replication Rate):**
   At least $70\%$ of development seeds ($35/50$) demonstrate successful right-steering recruitment.
4. **Criterion 4 (Sham Specificity):**
   Condition C4 (Sham) produces $<0.05\text{ Hz}$ right DNa02 recruitment, confirming anatomical circuit specificity.
5. **Criterion 5 (Off-Target Preservation):**
   Whole-brain firing rate divergence outside target pathways remains within $\pm 10\%$.
6. **Criterion 6 (Left Steering Preservation):**
   Left tactile steering recruitment (left DNa02 $\approx 1.43\text{ Hz}$) is preserved within $\pm 5\%$.

---

## 8. Current Status & Execution Boundary

**HISTORICAL RECORD:** This plan was executed for development cohort evaluation (seeds `18100..18149`) and merged into `main` via PR #20 (commit `5fa548e`). The held-out confirmation cohort (seeds `19000..19099`) remains unconsumed and frozen under the research pause.
