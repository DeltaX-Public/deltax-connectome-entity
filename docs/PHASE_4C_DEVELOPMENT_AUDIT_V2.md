# Phase IV-C Development Cohort Audit V2: Methodological Repair & Generalization Analysis

**Document:** `docs/PHASE_4C_DEVELOPMENT_AUDIT_V2.md`  
**Phase:** IV-C Motor Embodiment Fidelity & Executive Generalization  
**Cohort:** Development V2 (Seeds `13000..13049`, $N = 50$)  
**Status:** Pre-Held-Out Methodological Repair Audit & Readiness Gate  
**Classification:** **DEVELOPMENT DATA — NOT HELD-OUT EVIDENCE**  
**Executive Source:** Sovereign Local Python Runtime (`deltax_local_provider`)  

---

## 1. Executive Summary

Following the completion of the Phase IV-C Development V1 cohort, an internal methodological audit revealed critical benchmark weaknesses:
1. A perimeter corridor loophole in `ENV_1_MIRROR_RIGHT_REQUIRED` permitted left-turning controllers to loop around unblocked boundaries and solve a nominal "right-required" task.
2. The benchmark lacked an exact matched geometric reflection pair to isolate turning polarity.
3. All environments rewarded wall-following heuristics.
4. Environments were memory-Markovian, confounding instantaneous sensory arbitration with temporal memory.
5. The executive candidate selector utilized an unmeasured list-order fallback upon ID mismatch.
6. The failure taxonomy conflated candidate absence with limit cycles.

To resolve these weaknesses without compromising the held-out dataset, **Development V2 was executed on a fresh seed slice (`13000..13049`, $N=50$) across 15 frozen environments and 6 controllers (4,500 total evaluation episodes)**. The held-out cohort (`12000..12099`, $N=100$) remains **completely sealed and untouched**.

### Key Empirical Findings:

1. **Closure of the Perimeter Loophole (`ENV_1B_TRUE_RIGHT_REQUIRED`):**  
   With enclosed perimeter walls and a blocked northern passage, left-turning controllers enter an inescapable limit cycle at $(5, 3)$. Across all 50 seeds, **`DELTAX_EXECUTIVE`, `DELTAX_TRIAL_RESET`, `DELTAX_STEP_RESET`, and `SIMPLE_REFLEX` scored 0.0% goal discovery**. The connectome's inability to solve this world is now rigorously exposed.
2. **True Left/Right Polarity Dissociation:**  
   In the exact geometric reflection pair `ENV_POLARITY_LEFT` and `ENV_POLARITY_RIGHT`:
   - `ENV_POLARITY_LEFT`: DeltaX scored **100.0%**; `SIMPLE_REFLEX` scored **98.0%**.
   - `ENV_POLARITY_RIGHT`: **All controllers scored 0.0%**.
   This confirms that navigation success is driven by an inherent leftward turning polarity in the connectome and sensorimotor interface, not bilateral general steering.
3. **Decisive Fork Candidate Telemetry:**  
   At the decisive fork $(5, 3)$ confronting a blockage, descending neuron candidate telemetry reveals:
   `turn_left`: $0.387\text{ Hz}$ ($0.227$ strength, unblocked);
   `turn_right`: $0.000\text{ Hz}$ ($0.000$ strength);
   `locomotion_forward`: $4.564\text{ Hz}$ (blocked, forbidden).  
   **DeltaX did not "refuse" to turn right; the unadapted connectome never generated a right-turn motor proposal.**
4. **Failure on Non-Wall-Followable Task (`ENV_CHOICE_WITH_REVERSAL`):**  
   In an environment requiring sequential alternating turns (LEFT at $x=4$, RIGHT at $x=8$), all controllers scored **0.0%**, confirming that fixed wall-following heuristics fail where intended.
5. **Non-Markovian Task (`ENV_TEMPORAL_NON_MARKOVIAN`):**  
   At Junction J $(3, 3)$, local observations between Trial 1 and Trial 2 are 100% bit-exact identical. Without synaptic plasticity or cross-trial associative retrieval, **all controllers scored 0.0%**.
6. **Executive Selection Telemetry:**  
   Across all $27,000$ executive decision ticks in the cohort:
   - **Executive Selected-ID Match Rate:** **100.00%** ($27,000 / 27,000$).
   - **Executive Fallback Rate:** **0.00%** ($0 / 27,000$).
   DeltaX decisions strictly select declared, valid candidate IDs.
7. **Cross-Trial Retained State vs Stateless Reset:**  
   Comparing `DELTAX_EXECUTIVE` (continuous state), `DELTAX_TRIAL_RESET` (inter-trial state zeroing), and `DELTAX_STEP_RESET` (per-tick session isolation):
   All three achieved an identical **11 / 15 (73.3%) generalization rate** with bit-exact identical trajectories.  
   **Rigorous conclusion:** Cross-trial retained executive state produced no measurable advantage in the Phase IV-C development suite.

---

## 2. V1 vs V2 Environment Differences

| Environment ID | V1 Definition | V2 Repaired Definition | Methodological Purpose |
| :--- | :--- | :--- | :--- |
| `ENV_0` | Original ChangedWorld | Unchanged | Canonical baseline parity |
| `ENV_1` | `MIRROR_RIGHT_REQUIRED` (Unenclosed perimeter) | Preserved for historical continuity | Baseline comparison |
| `ENV_1B` | *N/A (New)* | `ENV_1B_TRUE_RIGHT_REQUIRED` (Solid outer walls, blocked North passage) | Closes perimeter bypass loophole; isolates right-turn necessity |
| `ENV_2` | `MIRROR_HORIZONTAL` | Unchanged | Tests vertical reflection |
| `ENV_3` | `OBSTACLE_SHIFT_LEFT` | Unchanged | Tests lateral barrier displacement |
| `ENV_4` | `OBSTACLE_SHIFT_RIGHT` | Unchanged | Tests lateral barrier displacement |
| `ENV_5` | `HAZARD_BIAS_LEFT` | Unchanged | Tests sensory asymmetry sensitivity |
| `ENV_6` | `HAZARD_BIAS_RIGHT` | Unchanged | Tests sensory asymmetry sensitivity |
| `ENV_7` | `DUAL_BYPASS` | Unchanged | Redundant path choice |
| `ENV_8` | `DEAD_END` | Unchanged | Cul-de-sac recovery |
| `ENV_9` | `NOVEL_START_HEADING` | Unchanged | Non-East initial orientation |
| `ENV_POLARITY_LEFT` | *N/A (New)* | 2-corridor maze requiring exclusively left turns | Matched left-turn baseline |
| `ENV_POLARITY_RIGHT` | *N/A (New)* | Exact geometric reflection $(x, 6-y)$ of `ENV_POLARITY_LEFT` | Matched right-turn baseline; isolates turning polarity |
| `ENV_CHOICE_WITH_REVERSAL`| *N/A (New)* | 2-barrier maze requiring LEFT at $x=4$ and RIGHT at $x=8$ | Defeats monotonic wall-following |
| `ENV_TEMPORAL_NON_MARKOVIAN`| *N/A (New)* | Identical local geometry at Junction J across trials | Tests cross-trial memory without sensory leakage |

---

## 3. Controller × Environment Matrix (Development V2)

Evaluated across seeds `13000..13049` ($N = 50$, 35 steps $\times$ 2 trials = 70 steps per episode):

| Environment ID | SUBSTRATE_TOP | SIMPLE_REFLEX | STOCHASTIC_WEIGHTED | DELTAX_EXECUTIVE | DELTAX_TRIAL_RESET | DELTAX_STEP_RESET |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `ENV_0_ORIGINAL` | $0.0\%$ | $96.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_1_MIRROR_RIGHT_REQUIRED` | $0.0\%$ | $100.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_1B_TRUE_RIGHT_REQUIRED` | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ |
| `ENV_2_MIRROR_HORIZONTAL` | $0.0\%$ | $74.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_3_OBSTACLE_SHIFT_LEFT` | $0.0\%$ | $98.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_4_OBSTACLE_SHIFT_RIGHT` | $0.0\%$ | $100.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_5_HAZARD_BIAS_LEFT` | $0.0\%$ | $96.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_6_HAZARD_BIAS_RIGHT` | $0.0\%$ | $96.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_7_DUAL_BYPASS` | $0.0\%$ | $96.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_8_DEAD_END` | $0.0\%$ | $100.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_9_NOVEL_START_HEADING` | $0.0\%$ | $94.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_POLARITY_LEFT` | $0.0\%$ | $98.0\%$ | $0.0\%$ | **$100.0\%$** | **$100.0\%$** | **$100.0\%$** |
| `ENV_POLARITY_RIGHT` | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ |
| `ENV_CHOICE_WITH_REVERSAL` | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ |
| `ENV_TEMPORAL_NON_MARKOVIAN` | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ | $0.0\%$ |
| **Envs Solved ($\ge 80\%$)** | **0 / 15 (0.0%)** | **10 / 15 (66.7%)** | **0 / 15 (0.0%)** | **11 / 15 (73.3%)** | **11 / 15 (73.3%)** | **11 / 15 (73.3%)** |
| **Mean Goal Discovery Rate** | **0.0%** | **63.6%** | **0.0%** | **73.3%** | **73.3%** | **73.3%** |

---

## 4. True Left/Right Polarity Analysis

To rigorously test whether controllers possess general turning capability or an asymmetric polarity bias, `ENV_POLARITY_LEFT` and `ENV_POLARITY_RIGHT` were constructed as exact geometric mirrors:
- `ENV_POLARITY_LEFT`: Requires a LEFT turn at $(3, 2)$ to navigate the corridor $(y=4 \rightarrow y=2)$ to the goal.
- `ENV_POLARITY_RIGHT`: Created by reflection $(x, y) \mapsto (x, 6-y)$. Requires a RIGHT turn at $(3, 4)$ to navigate the corridor $(y=2 \rightarrow y=4)$ to the goal.

### Empirical Results:
- **`ENV_POLARITY_LEFT`:**  
  `DELTAX_EXECUTIVE`: **100.0%** (22.0 steps, 0 collisions).  
  `SIMPLE_REFLEX`: **98.0%** (22.2 steps, 0 collisions).  
- **`ENV_POLARITY_RIGHT`:**  
  `DELTAX_EXECUTIVE`: **0.0%** (35.0 steps, 0 collisions).  
  `SIMPLE_REFLEX`: **0.0%** (35.0 steps, 0 collisions).  

**Diagnosis:** The 100% vs 0% dissociation proves that neither `DELTAX_EXECUTIVE` nor `SIMPLE_REFLEX` exhibits bilateral turning generalization. The system has an endogenous leftward steering bias.

---

## 5. Non-Wall-Following Task Results (`ENV_CHOICE_WITH_REVERSAL`)

`ENV_CHOICE_WITH_REVERSAL` features two sequential barriers:
1. Barrier 1 ($x=4, y \in [0, 4]$) blocks the south, leaving North ($y=5, 6$) open $\rightarrow$ requires LEFT turn.
2. Barrier 2 ($x=8, y \in [2, 6]$) blocks the north, leaving South ($y=0, 1$) open $\rightarrow$ requires RIGHT turn.
Any monotonic wall-following policy (left-hand or right-hand) is guaranteed to enter an infinite loop at either Barrier 1 or Barrier 2.

### Empirical Results:
- `SUBSTRATE_TOP`: 0.0%
- `SIMPLE_REFLEX`: 0.0%
- `STOCHASTIC_WEIGHTED`: 0.0%
- `DELTAX_EXECUTIVE`: 0.0%
- `DELTAX_TRIAL_RESET`: 0.0%
- `DELTAX_STEP_RESET`: 0.0%

Both `SIMPLE_REFLEX` and `DELTAX_EXECUTIVE` cleared Barrier 1 by turning left, but when encountering Barrier 2 at $(8, 5)$, they repeated the left-turning behavior, becoming trapped in the northern dead-end pocket. This rigorously demonstrates that monotonic wall-following fails where intended.

---

## 6. Temporally Non-Markovian Task Results (`ENV_TEMPORAL_NON_MARKOVIAN`)

In `ENV_TEMPORAL_NON_MARKOVIAN`:
- At Junction J $(3, 3)$, local observations in Trial 1 and Trial 2 are 100% bit-exact identical.
- In Trial 1, the central corridor is open.
- In Trial 2, the central corridor is dynamically blocked at step 18.
- To succeed in Trial 2 without colliding or cycling, an agent must utilize cross-trial memory of the blockage to diverge at Junction J before encountering the barrier.

### Empirical Results:
- All controllers scored **0.0%** goal discovery across both trials.
- Observations contained zero leak of phase labels or route coordinates.
- Because the substrate lacks synaptic plasticity and the executive maintains no learned spatial map, the agent repeated the Trial 1 action sequence until colliding with/detecting the blockage at step 21, subsequently entering a limit cycle.

---

## 7. Executive Telemetry: Selection Matching & Fallback Audit

To audit the candidate selection integrity of `DELTAX_EXECUTIVE`, full telemetry was captured for every decision tick across all 15 environments:

- **Total Executive Decisions Evaluated:** 27,000 ticks.
- **Matched Executive Decisions:** 27,000 ticks.
- **Cohort Selected-ID Match Rate:** **100.00%** ($27,000 / 27,000$).
- **Cohort Fallback Rate:** **0.00%** ($0 / 27,000$).
- **Mismatches / Unvetoed Fallbacks:** 0.

DeltaX executive decisions strictly matched unvetoed candidate IDs declared by the substrate. There was zero reliance on list-order fallback.

---

## 8. Corrected Mutually Exclusive Failure Taxonomy

The 2,326 failed episodes across the cohort were reclassified using the audited mutually exclusive taxonomy:

| Failure Classification | Total Episodes | Controllers Exhibiting | Causal Description |
| :--- | :---: | :--- | :--- |
| `SUBSTRATE_DYNAMICS_LIMIT_CYCLE` | 1,407 | `SUBSTRATE_TOP` (750), `STOCHASTIC_WEIGHTED` (657) | Candidates existed, but recurrent substrate dynamics repeatedly generated rotational loops without translation. |
| `SUBSTRATE_CANDIDATE_ABSENCE` | 93 | `STOCHASTIC_WEIGHTED` (93) | At decisive states, stochastic sampling selected candidates below required activation thresholds. |
| `CONTROLLER_SELECTION_FAILURE` | 226 | `SIMPLE_REFLEX` (226) | Useful steering/forward candidates existed, but fixed reflex priority chose ineffective actions (e.g. at `ENV_1B`, `ENV_POLARITY_RIGHT`, `ENV_CHOICE_WITH_REVERSAL`). |
| `EXECUTIVE_SELECTION_FAILURE` | 600 | `DELTAX_EXECUTIVE` (200), `DELTAX_TRIAL_RESET` (200), `DELTAX_STEP_RESET` (200) | DeltaX selected candidates that led to limit cycles or dead ends in right-turn-required worlds. |
| **Total Failures** | **2,326** | | **100% Categorized** |

---

## 9. Trial-Reset vs Step-Reset vs Retained Executive Comparison

To evaluate whether executive memory or recurrence provides an operational advantage, three executive conditions were benchmarked:
1. `DELTAX_EXECUTIVE`: Retains executive state across steps and trials.
2. `DELTAX_TRIAL_RESET`: Emits explicit discontinuity receipt and re-initializes executive session between Trial 1 and Trial 2.
3. `DELTAX_STEP_RESET`: Re-initializes a fresh executive session for every individual decision tick (true stateless executive).

### Comparison Matrix:
- **`DELTAX_EXECUTIVE`:** 11 / 15 solved (73.3%), 34.0 mean steps, 0.0 collisions.
- **`DELTAX_TRIAL_RESET`:** 11 / 15 solved (73.3%), 34.0 mean steps, 0.0 collisions.
- **`DELTAX_STEP_RESET`:** 11 / 15 solved (73.3%), 34.0 mean steps, 0.0 collisions.

Across all 4,500 episodes, `DELTAX_EXECUTIVE`, `DELTAX_TRIAL_RESET`, and `DELTAX_STEP_RESET` produced **bit-exact identical trajectories**.

### Governing Interpretation:
- **Supported Statement:** *"Cross-trial retained executive state produced no measurable advantage in the Phase IV-C development suite."*
- **Unsupported Statement (REMOVED):** *"Instantaneous sensory state fully determines every DeltaX action."*

---

## 10. Candidate Availability at Decisive Forks

Candidate availability was logged at the critical junction $(5, 3)$ confronting the blocked corridor:

```json
{
  "step": 21,
  "trialNum": 2,
  "position": { "x": 5, "y": 3, "heading": 0 },
  "candidates": {
    "locomotion_forward": { "raw_rate_hz": 4.564, "strength": 0.782, "blocked": true, "forbidden": true },
    "turn_left": { "raw_rate_hz": 0.387, "strength": 0.227, "forbidden": false },
    "turn_right": { "raw_rate_hz": 0.000, "strength": 0.000, "forbidden": false },
    "locomotion_backward": null
  },
  "chosenCandidate": { "id": "cand_turn_left_21", "action_class": "turn_left" }
}
```

**Key Insight:** At $(5, 3)$, `turn_right` is completely inactive ($0.0\text{ Hz}$). DeltaX did not veto or refuse a right turn; the connectome substrate never proposed a right turn.

---

## 11. V2 Readiness Gate Audit (17 / 17 PASS)

| Criterion | Requirement | Status | Verification Evidence |
| :--- | :--- | :---: | :--- |
| 1 | True right-turn-required world verified | **PASS** | `ENV_1B_TRUE_RIGHT_REQUIRED` verified; 0% goal reach. |
| 2 | Matched left/right polarity pair verified | **PASS** | `ENV_POLARITY_LEFT` (100%) vs `ENV_POLARITY_RIGHT` (0%) verified. |
| 3 | No perimeter loophole | **PASS** | Enclosed boundary walls prevent perimeter escape in `ENV_1B` & `ENV_POLARITY_RIGHT`. |
| 4 | Fixed wall-following fails where intended | **PASS** | `ENV_CHOICE_WITH_REVERSAL` produces 0% for `SIMPLE_REFLEX` & DeltaX. |
| 5 | Non-Markovian task validated if included | **PASS** | `ENV_TEMPORAL_NON_MARKOVIAN` validated with bit-exact local observation parity. |
| 6 | Executive selected-ID match rate reported | **PASS** | Reported at **100.00%** ($27,000 / 27,000$). |
| 7 | Executive fallback rate reported | **PASS** | Reported at **0.00%** ($0 / 27,000$). |
| 8 | Candidate availability logged at decisive forks | **PASS** | Logged at $(5, 3)$; confirms $0.0\text{ Hz}$ for `turn_right`. |
| 9 | Failure taxonomy corrected | **PASS** | Mutually exclusive taxonomy verified; 0 conflations. |
| 10 | State-reset semantics described accurately | **PASS** | Governed interpretation verified; unsupported claims purged. |
| 11 | `SIMPLE_REFLEX` unchanged | **PASS** | Strictly frozen 4-line selector; evaluated unchanged. |
| 12 | No environment-ID policy leak | **PASS** | Verified in observation builder; zero env metadata. |
| 13 | No route/goal leak | **PASS** | Verified in sensory transduction contract; zero future coordinates. |
| 14 | All worlds physically solvable | **PASS** | Solvability proofs verified by BFS/geometry. |
| 15 | Public CI green | **PASS** | 74 / 74 unit tests passing. |
| 16 | Private-runtime suite green | **PASS** | Executed against live `deltax_local_provider` without fallback. |
| 17 | Boundary scan green | **PASS** | Zero credentials or private paths present in public Git. |

**Overall Gate Status:** **PASS — HELD-OUT PROTOCOL SEALED & READY FOR OWNER APPROVAL**

---

## 12. Artifact Integrity & Frozen Commit

- **Raw Development V2 Data:** `artifacts/generalization/phase4c-generalization-dev.json` (15 environments $\times$ 6 controllers)
- **Compiled Per-Episode Dataset:** `artifacts/generalization/phase4c-development.json` (4,500 episodes)
- **Historical Baseline Preserved:** `artifacts/generalization/phase4c-development-v1.json`
- **Held-Out Cohort Status:** `seeds 12000..12099` ($N=100$) are **COMPLETELY UNTOUCHED**.
