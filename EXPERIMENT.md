
## Phase 8 causal intervention harness

`scripts/causal_intervention_demo.mjs` is a deterministic, headless harness for the implemented computational model. It runs a fixed-duration Broken World phase, exports an explicit bundle (neurocontrol checkpoint, ledger, seeds, config, world state/events, and `executive_source`), then runs CONTROL, an EXPERIMENTER-labelled population-silence intervention, and a restored control run. Output is written to `artifacts/interventions/` and prints:

`CHECKPOINT → NORMAL`  
`CHECKPOINT → PERTURBATION → ALTERED`  
`CHECKPOINT → RESTORED → RECOVERED|FAILED_RECOVERY`

The intervention export records substrate proposals before each DeltaX packet and checks that DeltaX is not bypassed. This is causal intervention on the implemented computational model; it does not claim biological memory traces or adaptation. The current stub path intentionally reports measurable replay divergence and recovery. `scripts/replay_run.mjs` reproduces stub packets from a checkpoint and event stream. Canonical API replay requires recorded executive packets if the API is unavailable.
