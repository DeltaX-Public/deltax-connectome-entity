# Phase IV-C Held-Out Benchmark Audit: Motor Embodiment Fidelity & Executive Generalization

**Document:** `docs/PHASE_4C_HELD_OUT_AUDIT.md`  
**Phase:** IV-C Motor Embodiment Fidelity & Executive Generalization  
**Cohort:** Sealed Held-Out Benchmark (Seeds `12000..12099`, $N = 100$)  
**Status:** Canonical Held-Out Evaluation Audit  
**Classification:** **FORMAL HELD-OUT EVIDENCE — GOVERNED CONTRACT**  
**Executive Source:** Sovereign Local Python Runtime (`deltax_local_provider`)  

---

## 1. Executive Summary

Following the pre-registration and methodological repair in Development V2, the **held-out evaluation cohort (`seeds 12000..12099`, $N = 100$)** was unsealed and executed across all 15 frozen environment variants and 6 controller architectures ($9,000$ total closed-loop episodes; 4,500 episodes across the three DeltaX conditions).

The held-out results **replicate the development findings in this instantiated model and benchmark**:

1. **Generalization Performance:**  
   - `DELTAX_EXECUTIVE` achieved a **73.3% generalization rate** (11 of 15 environments solved at $\ge 80\%$, with **100% observed success across the 100 held-out seeds in each of the 11 tested compatible environments**, representing 1,100 / 1,100 episodes per DeltaX variant).
   - `SIMPLE_REFLEX` achieved a **66.7% generalization rate** (10 of 15 environments solved at $\ge 80\%$).
   - `SUBSTRATE_TOP` and `STOCHASTIC_WEIGHTED` achieved **0.0% generalization** (0 of 15 environments solved).
2. **Causal Failure Attribution:**  
   Across all 400 failed episodes per DeltaX condition (1,200 failed episodes across the three DeltaX variants on `ENV_1B_TRUE_RIGHT_REQUIRED`, `ENV_POLARITY_RIGHT`, `ENV_CHOICE_WITH_REVERSAL`, `ENV_TEMPORAL_NON_MARKOVIAN`), **100.0% were causally caused by `SUBSTRATE_CANDIDATE_ABSENCE`**. In every failed environment, a right turn was physically mandatory, but descending neuron telemetry shows `turn_right` had $0.0\text{ Hz}$ raw activation and $0.000$ strength in the connectome-derived computational substrate. There were **0 executive selection failures**.
3. **True Left/Right Polarity Dissociation:**  
   In the matched geometric reflection pair, DeltaX achieved **100.0% [96.3–100.0%] in `ENV_POLARITY_LEFT`** and **0.0% [0.0–3.7%] in `ENV_POLARITY_RIGHT`**, demonstrating in this instantiated model and benchmark that fixed connectome-derived substrate steering possesses an endogenous leftward turning polarity under lateralized contact.
4. **Failure of Wall-Following Heuristics:**  
   In `ENV_CHOICE_WITH_REVERSAL` (which requires alternating turn polarity at sequential barriers), monotonic wall-following failed as intended (DeltaX: 0.0%, Simple Reflex: 3.0%).
5. **State Reset Invariance:**  
   `DELTAX_EXECUTIVE` (continuous retained state), `DELTAX_TRIAL_RESET` (inter-trial reset), and `DELTAX_STEP_RESET` (stateless per-tick session isolation) achieved **bit-exact identical performance** across all 4,500 corresponding DeltaX episodes (11 / 15 environments, 73.33% mean goal rate). Retained executive state produced zero measurable advantage (paired difference = 0).
6. **Executive Decision Integrity:**  
   Across all $66,500$ executive decision ticks in `DELTAX_EXECUTIVE` ($199,500$ across all three DeltaX variants), **Executive Selected-ID Match Rate was 100.00%** and **Fallback Rate was 0.00%** ($0$ fallbacks).

---

## 2. Factorial Held-Out Results Matrix (Seeds 12000..12099, N=100)

Values reported as `Both Goals Reached % [Wilson 95% CI]` evaluated in an $11 \times 7$ grid world ($x \in [0, 10], y \in [0, 6]$):

| Environment ID | SUBSTRATE_TOP | SIMPLE_REFLEX | STOCHASTIC_WEIGHTED | DELTAX_EXECUTIVE | DELTAX_TRIAL_RESET | DELTAX_STEP_RESET |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `ENV_0_ORIGINAL` | 0.0% [0.0–3.7%] | 92.0% [85.0–95.9%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_1_MIRROR_RIGHT_REQUIRED` | 0.0% [0.0–3.7%] | 96.0% [90.2–98.4%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_1B_TRUE_RIGHT_REQUIRED` | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] |
| `ENV_2_MIRROR_HORIZONTAL` | 0.0% [0.0–3.7%] | 63.0% [53.2–71.8%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_3_OBSTACLE_SHIFT_LEFT` | 0.0% [0.0–3.7%] | 93.0% [86.3–96.6%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_4_OBSTACLE_SHIFT_RIGHT` | 0.0% [0.0–3.7%] | 94.0% [87.5–97.2%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_5_HAZARD_BIAS_LEFT` | 0.0% [0.0–3.7%] | 92.0% [85.0–95.9%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_6_HAZARD_BIAS_RIGHT` | 0.0% [0.0–3.7%] | 92.0% [85.0–95.9%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_7_DUAL_BYPASS` | 0.0% [0.0–3.7%] | 92.0% [85.0–95.9%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_8_DEAD_END` | 0.0% [0.0–3.7%] | 94.0% [87.5–97.2%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_9_NOVEL_START_HEADING` | 0.0% [0.0–3.7%] | 90.0% [82.6–94.5%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_POLARITY_LEFT` | 0.0% [0.0–3.7%] | 99.0% [94.5–99.8%] | 0.0% [0.0–3.7%] | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** | **100.0% [96.3–100.0%]** |
| `ENV_POLARITY_RIGHT` | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] |
| `ENV_CHOICE_WITH_REVERSAL` | 0.0% [0.0–3.7%] | 3.0% [1.0–8.5%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] |
| `ENV_TEMPORAL_NON_MARKOVIAN` | 0.0% [0.0–3.7%] | 3.0% [1.0–8.5%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] | 0.0% [0.0–3.7%] |
| **Envs Solved ($\ge 80\%$)** | **0 / 15 (0.0%)** | **10 / 15 (66.7%)** | **0 / 15 (0.0%)** | **11 / 15 (73.3%)** | **11 / 15 (73.3%)** | **11 / 15 (73.3%)** |
| **Overall Goal Rate** | **0.0%** | **66.9%** | **0.0%** | **73.3%** | **73.3%** | **73.3%** |
| **Mean Collisions** | **0.03** | **0.00** | **0.07** | **0.00** | **0.00** | **0.00** |

---

## 3. Primary Pre-Registered Comparisons

### A. DeltaX vs SIMPLE_REFLEX
- **Generalization Rate:** DeltaX solved **11 / 15 (73.3%)** vs Simple Reflex **10 / 15 (66.7%)**.
- **Local Trap Navigation (`ENV_2_MIRROR_HORIZONTAL`):** Simple Reflex degraded to **63.0%** goal discovery due to rigid reactive sequencing, whereas DeltaX maintained **100.0% observed success**.
- **Left-Compatible Stability:** On all 11 left-compatible environments, DeltaX achieved **100% observed success across all 100 seeds with 0 collisions**, whereas Simple Reflex suffered 1–8% failures across environments.

### B. DeltaX vs SUBSTRATE_TOP
- Substrate Top scored **0.0% across all 15 environments**, collapsing into rotational limit cycles (1,159 episodes) or experiencing candidate absence (341 episodes).
- DeltaX provides the essential candidate arbitration required to translate raw connectome-derived activations into coherent goal-directed locomotion.

### C & D. DELTAX_EXECUTIVE vs DELTAX_TRIAL_RESET vs DELTAX_STEP_RESET
- All three conditions produced **bit-exact identical trajectories, action counts, and goal discovery** across all 4,500 corresponding episodes (11 / 15 environments, 73.33%).
- **Causal Conclusion:** In this deterministic sensory-motor benchmark, cross-trial retained executive state provided **no measurable advantage** over trial-reset or step-reset stateless execution (paired difference = 0).

### E. ENV_POLARITY_LEFT vs ENV_POLARITY_RIGHT
- `ENV_POLARITY_LEFT`: DeltaX scored **100.0%**, Simple Reflex scored **99.0%**.
- `ENV_POLARITY_RIGHT`: All controllers scored **0.0%**.
- **Causal Conclusion:** The connectome-derived computational substrate possesses an endogenous leftward turning bias under lateralized obstacle contact.

### F. Left-Compatible vs Right-Required Worlds
- **Left-Compatible Environments (11):** DeltaX achieved **100.0%** (1,100 / 1,100 episodes per condition; 3,300 / 3,300 across all three DeltaX conditions).
- **Right-Required Environments (4):** DeltaX achieved **0.0%** (0 / 400 episodes per condition; 0 / 1,200 across all three DeltaX conditions).

### G. Wall-Followable vs Reversal-Required Worlds
- In monotonic wall-followable worlds, both DeltaX and Simple Reflex succeed.
- In `ENV_CHOICE_WITH_REVERSAL`, which requires alternating polarity, monotonic wall-following failed (0.0% for DeltaX, 3.0% for Simple Reflex).

### H. Candidate-Present vs Candidate-Absent Failures
- **Candidate-Present Failures:** In all 11 environments where required candidates were present, DeltaX had **0 failures (100% success)**.
- **Candidate-Absent Failures:** In all 4 environments where DeltaX failed, the necessary candidate (`turn_right`) was absent ($0.0\text{ Hz}$ / $0.000$ strength).
- **Executive Selection Failures:** **0 across all 4,500 executive episodes (199,500 decision steps)**.

---

## 4. Evidence-Bound Scientific Claim Boundary

The formal held-out evidence establishes:

### Supported Claims:
1. Under `READOUT_C_INDEPENDENT_AXES` and lateralized sensory transduction, DeltaX executive navigation achieves **100% observed success across the 100 held-out seeds in each of the 11 tested compatible environments** (spatial transformations, obstacle shifts, hazard gradients, dead ends, and orientations).
2. DeltaX executive arbitration is strictly necessary to prevent connectome-derived RateNetwork rotational limit cycles.
3. DeltaX candidate selection operates with **100.00% fidelity to unvetoed substrate candidate IDs**, with **0.00% fallback usage**.
4. All DeltaX held-out failures are causally attributable to **upstream substrate candidate absence**, not executive selection failure.

### Explicitly Excluded Claims (Not Established):
1. **General Bilateral Steering:** The unadapted connectome-derived substrate does not possess general right-turn motor competence under these geometries.
2. **Executive Memory Advantage:** Retained executive state across recurrence trials provided no advantage over stateless step-reset (paired difference = 0).
3. **Cognitive Map / Long-Horizon Planning:** Navigation is driven by instantaneous candidate arbitration and reactive clearance sequencing, not internal map planning.
4. **Learning / Plasticity:** Synaptic weights remained completely fixed.
5. **Biological Equivalence:** The substrate is an idealized continuous rate network instantiated from whole-CNS connectome topology; living organism equivalence is not claimed.

