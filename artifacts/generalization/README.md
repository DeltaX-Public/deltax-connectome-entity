# Phase IV-C Generalization Artifacts

This directory contains evaluation data and benchmark manifests for Phase IV-C (Motor Embodiment Fidelity & Executive Generalization).

## Held-Out Cohort Artifact Pair

The directory preserves two large data files for the formal held-out benchmark cohort (seeds `12000..12099`, $N=100$):

1. **`phase4c-held-out.json`** (~28.3 MB)
   - **Structure:** Raw per-episode evaluation records containing full step-level telemetry, candidate fields, executed actions, and downstream failure classifications across all 9,000 closed-loop evaluation runs.
   - **Primary Use:** Causal failure attribution, tick-by-tick trajectory inspection, and episode-level validation.

2. **`phase4c-generalization-held_out.json`** (~29.9 MB)
   - **Structure:** Environment × controller matrix and aggregate generalization summary structuring the identical 9,000 held-out evaluation episodes into analysis-ready metric groupings.
   - **Primary Use:** Benchmark generalization scoring, confidence interval computation, and cross-controller performance comparison.

### Provenance & Non-Duplication Notice

- **Identical Seed Cohort:** Both artifacts evaluate the exact same frozen held-out seed slice (`12000..12099`, $N=100$).
- **Complementary Representations:** They represent two complementary serializations of the same evaluation run (raw episode traces vs. matrix-aggregated generalization summary), not duplicate or independent runs.
- **Provenance Retention:** Both files are retained for full scientific reproducibility and archival audit integrity.
- **Single Experiment:** Neither file should be treated as an independent replicate or second experiment.
