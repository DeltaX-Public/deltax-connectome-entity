# Phase IV-C Pre-Registration Plan: Executive Generalization & Motor Embodiment Fidelity

**Document:** `docs/PHASE_4C_EXECUTIVE_GENERALIZATION_PLAN.md`  
**Authoritative Baseline:** `main` at `e0c91ce` (Post-Phase IV-B Closeout)  
**Branch:** `phase4c-executive-generalization`  
**Date:** September 18, 2026  
**Status:** Pre-Registered & Frozen  

---

## 1. Primary & Secondary Research Questions

### Primary Research Question:
Does DeltaX executive sequencing genuinely generalize across systematic changes in environment geometry, obstacle locations, hazard distributions, and motor affordances, or is its observed 100% navigation success specific to the single `ChangedWorld` layout and the connectome's endogenous left-turn bias?

### Secondary Research Question:
How much executive performance can be reproduced by simpler, non-learning candidate selectors (such as a 4-line reactive reflex controller or stochastic sampling) operating on the exact same physical observations and connectome candidate fields?

---

## 2. Frozen Controller Architectures

All controllers receive identical physical sensory observations, step through the intact *Drosophila* whole-CNS connectome (165,122 neurons, ~10.5M synapses), and select strictly from the pre-evaluation candidate field emitted by `READOUT_C_INDEPENDENT_AXES`.

1. **`SUBSTRATE_TOP`**:  
   Selects the admissible candidate with the highest neural activation strength:
   $$\text{argmax}_{c \in \mathcal{C}_{\text{admissible}}} s(c)$$
   Filters out physically blocked forward locomotion and unembodied candidates (`giant_fiber_escape`, `groom`).
2. **`SIMPLE_REFLEX`**:  
   A non-learning candidate selector utilizing only the immediate physical obstacle detection:
   - If forward path is physically blocked: selects the highest-strength available turning or withdrawal candidate (`turn_left`, `turn_right`, `locomotion_backward`).
   - If forward path is open: selects the highest-strength locomotor candidate (`locomotion_forward`, etc.).
   Zero map, zero coordinates, zero memory, zero route knowledge.
3. **`STOCHASTIC_WEIGHTED`**:  
   Samples from admissible candidates proportional to normalized neural activation strength:
   $$P(c_i) = \frac{s(c_i)}{\sum_{j} s(c_j)}$$
   Uses a seeded pseudo-random generator (PRNG) for bit-exact reproducibility.
4. **`DELTAX_EXECUTIVE`**:  
   Live sovereign DeltaX executive runtime operating with contradiction detection, goal coherence, and stateful tracking.
5. **`DELTAX_STATE_RESET`**:  
   DeltaX executive where executive temporal memory and state are explicitly reset at the change/recurrence boundary.

---

## 3. Environment Generalization Suite (10 Frozen Environments)

Every environment enforces strict information parity (zero future leaks, zero coordinate cheats) and is guaranteed solvable under the `RoverBody` actuator vocabulary:

| Environment ID | Name | Geometric & Physical Transformation | Critical Test / Purpose |
| :--- | :--- | :--- | :--- |
| `ENV_0` | `ORIGINAL` | Canonical ChangedWorld (door at $x=6, y=3$, North & South openings at $x=3, 5, 8$). | Baseline continuity anchor. |
| `ENV_1` | `MIRROR_RIGHT_REQUIRED` | Asymmetric corridor: North opening at $x=5$ is closed; South opening at $x=5, y=4$ is open. | **Critical Mirror Test:** Requires right-turn steering at the obstacle; tests whether executive fails when connectome left-bias is counterproductive. |
| `ENV_2` | `MIRROR_HORIZONTAL` | East $\to$ West traversal: Start at $(9, 3)$ facing West (heading=2); goal at $x \le 2$; door at $(4, 3)$. | Reversed cardinal orientation and opposite heading coordinates. |
| `ENV_3` | `OBSTACLE_SHIFT_LEFT` | Door blockage moved earlier to $x=4, y=3$ (bypass exit at $x=3$). | Earlier obstacle onset requiring rapid turning response. |
| `ENV_4` | `OBSTACLE_SHIFT_RIGHT` | Door blockage moved later to $x=7, y=3$ (bypass exit at $x=8$ or $x=5$). | Extended corridor traversal before contradiction onset. |
| `ENV_5` | `HAZARD_BIAS_LEFT` | Severe aversive noxious gradient on North bypass ($y=1$); South bypass clear. | Aversive sensory bias test (North corridor penalized). |
| `ENV_6` | `HAZARD_BIAS_RIGHT` | Severe noxious gradient on South bypass ($y=5$); North bypass clear. | Aversive sensory bias test (South corridor penalized). |
| `ENV_7` | `DUAL_BYPASS` | Both North and South passages open, but North has extra clearance. | Path selection under symmetric affordances. |
| `ENV_8` | `DEAD_END` | Cul-de-sac at $x=6, y=3$ with side walls at $(6, 2)$ and $(6, 4)$, blocking forward, left, and right. | **Withdrawal Test:** Strictly requires `backward` locomotion to escape the cul-de-sac before turning. |
| `ENV_9` | `NOVEL_START_HEADING` | Start at $(1, 3)$ facing North (heading=3) rather than East. | Rotational initialization test: requires steering to align with the corridor before locomotion. |

---

## 4. Cohorts & Statistical Methodology

- **Development Cohort:** Seeds `11000..11049` ($N = 50$).
- **Held-Out Cohort:** Seeds `12000..12099` ($N = 100$).
- **Evaluation Budget:** 10 environments $\times$ 5 controllers $\times$ 2 trials $\times$ 35 steps.
- **Metrics Computed per (Environment, Controller):**
  - Goal Completion Rate (Trial 1, Trial 2, Both Goals) with Wilson 95% Score Intervals.
  - Step Efficiency (mean steps to goal).
  - Collision Count (wall and obstacle impacts).
  - Energy Consumption.
  - Action Distribution (Forward, Backward, Left, Right, Stop).
  - Candidate Availability Fraction.
  - **Generalization Rate:** Fraction of the 10 environments where controller achieves $\ge 80\%$ goal completion.

---

## 5. Failure Taxonomy

Every failed trial is classified into one mutually exclusive category:
1. `EXECUTIVE_FAILURE`: The appropriate action candidate was present and permitted in the candidate field, but the executive selected an ineffective or contradictory candidate.
2. `SUBSTRATE_CANDIDATE_ABSENCE`: The task required a specific motor program (e.g. `turn_right` or `locomotion_backward`), but the connectome substrate failed to generate that candidate with strength $>0.05$.
3. `ACTUATOR_UNAVAILABLE`: The candidate was generated but could not be executed by the body chassis (`UNEMBODIED`).
4. `SENSOR_FAILURE`: The environment condition failed to trigger the expected receptor population.

---

## 6. Falsification Criteria

- **Falsifier 1 (Geometry Overfitting):** If DeltaX executive succeeds on `ENV_0` but drops below $50\%$ on `ENV_1` (the Critical Mirror Test requiring right turns), we reject the claim of general executive competence and conclude success was an artifact of alignment with the connectome's innate left bias.
- **Falsifier 2 (Controller Triviality):** If the 4-line `SIMPLE_REFLEX` achieves statistically indistinguishable goal completion ($\Delta \le 5\%$) across all 10 environments, we conclude that long-horizon adaptation in this benchmark does not necessitate complex executive governance.
- **Falsifier 3 (Actuator Incompleteness):** If `ENV_8` (Dead End) cannot be solved by any controller due to failure of backward candidate generation or execution, backward embodiment remains incomplete.
