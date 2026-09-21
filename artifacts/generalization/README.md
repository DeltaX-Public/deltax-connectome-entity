# Phase IV-C Generalization & Failure Attribution Artifacts

This directory contains evaluation data and benchmark manifests for Phase IV-C (Motor Embodiment Fidelity & Executive Generalization) evaluated across the sealed held-out evaluation cohort ($N = 100$ seeds, `12000..12099`, across 15 environments and 6 controller architectures; 9,000 total closed-loop episodes).

---

## 1. Held-Out Cohort Artifact Pair & Metrics

The repository preserves two primary data files documenting the 9,000 held-out evaluation episodes:

### A. `phase4c-held-out.json` (~28.3 MB)
- **Structure:** Per-episode evaluation summaries and selected decision-fork telemetry across all 9,000 closed-loop evaluation runs.
- **Episode Records:** Exactly **9,000 episode records** (6 controllers × 15 environments × 100 seeds).
  - 4,500 DeltaX episodes (1,500 `DELTAX_EXECUTIVE`, 1,500 `DELTAX_TRIAL_RESET`, 1,500 `DELTAX_STEP_RESET`).
  - 4,500 baseline episodes (1,500 `SIMPLE_REFLEX`, 1,500 `SUBSTRATE_TOP`, 1,500 `STOCHASTIC_WEIGHTED`).
- **Summarized Executive Decisions:** Exactly **199,500 executive decision ticks** across the three DeltaX conditions (66,500 decisions per condition). Each episode summary records `total_decisions`, `matched_decisions`, `match_rate: 1.0`, and `fallback_count: 0`.
- **Detailed Fork Candidate Logs:** Exactly **19,305 detailed decision-fork records** across all 9,000 episodes:
  - `DELTAX_EXECUTIVE`: 2,800 fork logs
  - `DELTAX_TRIAL_RESET`: 2,800 fork logs
  - `DELTAX_STEP_RESET`: 2,800 fork logs
  - `SIMPLE_REFLEX`: 3,016 fork logs
  - `STOCHASTIC_WEIGHTED`: 5,384 fork logs
  - `SUBSTRATE_TOP`: 2,505 fork logs
- **Replay & Inspection Boundary:**
  - *What can be replayed/inspected directly:* Frozen seeds (`12000..12099`), per-episode outcomes, step counts, collision counts, energy usage, aggregate action histograms (`action_counts`), dominant candidate selections, candidate availability, executive matching stats, and the detailed candidate fields/decisions at each of the 19,305 fork records.
  - *What cannot be replayed from the committed JSON alone:* The repository does not store a complete 475,749-event per-tick telemetry trace for every intermediate non-fork step. Complete step-by-step state trajectories require deterministic re-execution of the simulation from the frozen seeds.

### B. `phase4c-generalization-held_out.json` (~29.9 MB)
- **Structure:** Matrix-aggregated summary structuring the 9,000 evaluation episodes into a $15\text{ environments} \times 6\text{ controllers}$ grid ($90$ evaluation cells).
- **Contents:** Wilson 95% confidence intervals, mean collision rates, step counts, aggregate action histograms, and episode arrays per cell.

---

## 2. Classification Lineage & Canonical Causal Attribution

### The Two Classification Layers:
1. **Generic Online Failure Heuristics (`phase4c-generalization-held_out.json`):**
   During initial batch execution, online simulation monitors applied heuristic thresholds to tag failed runs. This heuristic labeled 210 DeltaX failed episodes as `EXECUTIVE_SELECTION_FAILURE` and 190 as `SUBSTRATE_CANDIDATE_ABSENCE` per DeltaX controller.
2. **Canonical Causal Failure Attribution (`phase4c-failure-attribution-held_out.json`):**
   A dedicated post-run causal attribution audit analyzed descending neuron firing rates and candidate proposals across all 400 failed episodes per DeltaX condition (1,200 failed episodes total). This analysis proved that in **100.0% of failed DeltaX episodes (1,200 / 1,200)**:
   - Navigation failure was causally driven by **`SUBSTRATE_CANDIDATE_ABSENCE`**: descending steering neuron `DNa02` produced $0.0\text{ Hz}$ firing and $0.000$ strength under lateralized right obstacle contact in environments where right turns were mandatory (`ENV_1B_TRUE_RIGHT_REQUIRED`, `ENV_POLARITY_RIGHT`, `ENV_CHOICE_WITH_REVERSAL`, `ENV_TEMPORAL_NON_MARKOVIAN`).
   - There were **0 executive selection failures** (`CONTROLLER_SELECTION_FAILURE: 0`). Across all 199,500 executive decision ticks, DeltaX candidate-ID match rate was $100.00\%$ with $0$ fallbacks.

### Supersession Notice:
**[`phase4c-failure-attribution-held_out.json`](phase4c-failure-attribution-held_out.json)** is the **canonical causal failure attribution record** and formally supersedes the generic online heuristic tags in `phase4c-generalization-held_out.json`. Both files are preserved unmodified in this directory for audit integrity.

---

## 3. Provenance & Non-Duplication Notice

- **Identical Seed Cohort:** Both `phase4c-held-out.json` and `phase4c-generalization-held_out.json` evaluate the exact same frozen held-out seed slice (`12000..12099`, $N=100$).
- **Complementary Representations:** They represent two complementary serializations of the same evaluation run (episode summary traces with fork records vs. matrix-aggregated generalization summary), not duplicate or independent runs.
- **Historical Baselines Preserved:** Earlier development runs (`phase4c-development-v1.json`, `phase4c-generalization-dev-v1.json`, `phase4c-development.json`, `phase4c-generalization-dev.json`) remain archived for chronological audit trail integrity.
