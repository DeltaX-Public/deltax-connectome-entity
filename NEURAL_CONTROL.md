# Neurocontrol experimenter API

`src/neurocontrol/index.mjs` is an experimenter-level harness around the runtime. It is outside `upstream/fly-brain` and does not grant authority to DeltaX or call a motor actuator.

## API

- `inspect()` returns membrane and firing summaries, selected populations, sensory injection, descending activity, modulation, mode, and the active declarative perturbations. Results are labeled `EXPERIMENTER` / `OBSERVATION_ONLY`.
- `checkpoint({ id })` writes a reproducible JSON bundle under `artifacts/checkpoints/`. Bundles include serializable substrate fields, neural summary references, DeltaX adapter state/ledger, environment, seeds, objective, run id, perturbations, and ledger cursor.
- `restore(bundleOrPath)` restores available runtime state and the experimenter ledger position for deterministic stub replay.
- `perturb()` accepts `silence_population`, `excite_population`, `scale_regional_gain`, `mask_connection`, and `set_sensory_channel`. Operations are declarative, experimenter-only, and logged with ids.
- `compare(checkpoint, { interventions })` replays CONTROL and INTERVENTION from the same checkpoint and writes machine-readable `<checkpoint>-compare.json`.

Checkpoint, restore, perturb, run, and compare events use the experimenter ledger and are labeled `actor: EXPERIMENTER`. Default replay is an explicitly marked deterministic stub; no proprietary neural math is implemented.
