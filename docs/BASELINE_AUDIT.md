# BASELINE_AUDIT

**Status:** PROVISIONAL — Phase 0 remote audit only.  
**Not yet:** local `npm install`, headless experiment logs, browser arena timing, or `baseline/upstream-reproduced` commit.

Fill measured fields during Phase 1. Do not treat unchecked boxes as completed science.

## Neural runtime

| Topic | Provisional (from upstream docs/code layout) | Measured |
|---|---|---|
| Model | Conductance-based LIF, whole CNS | |
| Neuron count | ≈165,122 | |
| Connections | ≈10.5M (sim step docs) / ≈104M synapses in connectome description | |
| Step | 2 × 0.5 ms brain steps per 1 ms wall-sim | |
| Backends | JS (`lif.js`), WASM (`lifwasm.js` + `wasm/lif.c`), WebGPU (`lifgpu.js`) | |
| Isolation | SharedArrayBuffer / COOP+COEP via Vite | |

## State representation

| Topic | Provisional | Measured |
|---|---|---|
| Membrane / spikes | Shared brain memory slots per fly (`brainsetup.js`) | |
| Per-fly isolation | Web Worker + MuJoCo world per fly | |
| Checkpointable? | Not as handoff-grade API yet | |

## Synaptic representation

| Topic | Provisional | Measured |
|---|---|---|
| Packed data | `public/` codecs; see upstream docs/codecs | |
| Strengths | Fitted global params (`public/data/brain_params.json`) — not full measured synapses | |

## Sensory injection

| Channel | Implementation (upstream) | Notes |
|---|---|---|
| Vision | flyvis / compound eye rays → optic lobe | 50 Hz; largest cost |
| Chem / mech / thermo | `senses.js` | Poisson to sensory populations |

## Descending outputs

Identified DN populations drive walking, turning, backing, grooming, escape (see `motor.js` + upstream motor docs). Exact name tables: expand in Phase 1 from `groups.js` / neuron tables.

## Endogenous behaviour

`src/sim/intrinsic.js` — must stay labeled as non-connectome scaffolding. See `docs/phase0/REMOTE_AUDIT.md`.

## Neuromodulation

`src/sim/neuromod.js` — hunger / octopamine / visual gain. Upstream reports counterintuitive starvation walking effect from connectome octopamine wiring alone.

## Motor translation

Stepping pattern generator between DNs and legs in normal mode. Experimental full-connectome leg drive exists and fails to stand (upstream honest result).

## Physics loop

MuJoCo flybody; ~5 × 0.2 ms substeps per ms (per loop doc).

## Random number sources

**TODO Phase 1:** locate all seeds (vision Poisson, intrinsic bout sampling, etc.) and record how to freeze them.

## Checkpointable state

**TODO Phase 1:** enumerate what would be required for handoff-grade checkpoint (neural, adaptation, neuromod, env, body, RNG, objective, event cursor).

## Known limitations (upstream-reported)

- Connectome ≠ strengths, gap junctions, full plasticity
- Coordinated walking not connectome-only
- Looming escape weak (2/10 in upstream tests)
- Odour specificity in Kenyon cells failed calibration (recorded failure)
- Numerical / GPU non-bit-perfect replay across devices likely

## Baseline reproduction checklist (Phase 1 — held)

- [ ] Clone / subtree at pinned SHA
- [ ] `npm install`
- [ ] `npm run dev` arena loads
- [ ] `node scripts/calib_eval.mjs …` log saved
- [ ] At least one `run_fly.mjs` scenario log saved
- [ ] Performance notes (sim × realtime, WASM vs GPU)
- [ ] Seeds recorded
- [ ] Tag/branch `baseline/upstream-reproduced`

## Phase 1 reproduction evidence (measured)

**Branch:** `baseline/upstream-reproduced`  
**Source:** `Lulzx/fly-brain` at `054e402853d370b004facc1946e36a409de601e8`  
**Incorporation:** Codespaces terminal; `git archive` of the pinned checkout into `upstream/fly-brain/`.  
**Environment:** GitHub Codespaces, Node `v24.20.0`, npm `11.19.0`; run date `2026-09-17` UTC.

### Checklist and results

- [x] Pinned vendor tree landed at `upstream/fly-brain/`.
- [x] Upstream `LICENSE` preserved at `upstream/fly-brain/LICENSE`.
- [x] `npm install --no-audit --no-fund` — **PASS (exit 0)**. Log: `artifacts/baseline/npm-install.log`.
- [x] `node scripts/calib_eval.mjs "$(cat public/data/brain_params.json)"`  **PASS (exit 0)**. The script reported `8.684s`. Log: `artifacts/baseline/calib_eval.log`.
- [x] `node scripts/run_fly.mjs --help` — **PASS (exit 0)**; confirmed usage `node scripts/run_fly.mjs [seconds] [scenario] [mode]`. Log: `artifacts/baseline/run_fly_help.log`.
- [x] `node scripts/run_fly.mjs 2 default descending` — **PASS (exit 0)**. The upstream run reported `wall 35.733s for 2s sim (17.87x real-time)`. Log: `artifacts/baseline/run_fly_default.log`.

### Timing and seed notes

Calibration timing is the upstream script's reported `8.684s`. The fly scenario timing is upstream's reported wall time above; it is not a claim of hardware-independent performance. The `run_fly.mjs` invocation used the upstream default scenario state and does not expose an explicit seed argument; therefore the seed is recorded as **not specified / upstream default**, not invented. No DeltaX executive, consciousness, or AGI behavior was implemented in this phase.

### Reproduction commands

```sh
cd upstream/fly-brain
npm install --no-audit --no-fund
node scripts/calib_eval.mjs "$(cat public/data/brain_params.json)"
node scripts/run_fly.mjs 2 default descending
```

### Attempt note

An initial `npm install` wrapper using `/usr/bin/time ... sh -c ...` terminated with exit 127 before producing output. It is not counted as a pass and its empty log was discarded. The direct command shown above was then rerun; it completed with exit 0 and its output is the committed `artifacts/baseline/npm-install.log`.
