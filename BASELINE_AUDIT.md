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
