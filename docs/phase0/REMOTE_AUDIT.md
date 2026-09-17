# Phase 0 audit — remote

**Date:** 2026-09-17 (PT)  
**Method:** GitHub remote read of `Lulzx/fly-brain` (no local clone, no headless/browser baseline run yet)  
**Audited SHA:** `054e402853d370b004facc1946e36a409de601e8`

## Verdict

`Lulzx/fly-brain` is a **suitable primary integration candidate**. Architecture matches the handoff requirements: connectome LIF substrate, sensory injection, descending readouts, MuJoCo body, flyvis vision, browser + headless paths, and an explicit honest boundary between wiring-driven and scaffolding-driven behavior.

**Blocker for Phase 1:** Cursor Cloud Agents unavailable on current plan; local checkout not authorized. Baseline reproduction deferred.

## Sensor → connectome → DN → motor pipeline

Per upstream `docs/guide/loop.md` (per simulated ms, per fly):

1. **Senses** — `src/sim/senses.js`, `src/sim/vision.js`  
   Taste, odour, touch, proprioception, wind, heat; vision 2×721 rays through flyvis at 50 Hz → ~62k optic-lobe neurons as Poisson spike trains.
2. **Brain** — `src/wasm/lif.c` / `src/lifgpu.js`  
   Two 0.5 ms LIF steps over ~10.5M connections; JS / WASM / WebGPU backends.
3. **Motor** — `src/sim/motor.js`  
   Identified descending-neuron rates → walking / turning / grooming / escape via stepping pattern generator (not raw actuators from connectome alone in normal mode).
4. **Physics** — `src/sim/world.js`  
   flybody + MuJoCo substeps.
5. **Endogenous behaviour** — `src/sim/intrinsic.js`  
   Walk/pause/grooming/saccades/etc. delivered as **synaptic conductance onto descending neurons**, never as direct actuator commands (upstream claim — verify in Phase 1).
6. **Neuromodulation** — `src/sim/neuromod.js`  
   Hunger / octopamine / visual gain pathways.
7. **Flight** — `src/sim/flight.js`  
   Blade-element aero on wing stroke after takeoff.

## Behavior injected outside the connectome

From upstream `docs/guide/what-the-wiring-gives.md` (must remain documented; do not silently attribute to connectome or future DeltaX):

| Outside wiring | Notes |
|---|---|
| Coordinated walking / stepping generator | Fitted kinematics between DNs and legs |
| Spontaneous bout timing | Ethology-derived bout/pause/saccade rates |
| Reafference gain | Without it, self-motion drives walking endlessly |
| Escape gating | Prevents jump-into-wall from self-loom |
| Giant-fibre electrical synapse to jump MN | Not in chemical connectome |
| Slow adaptation on steering readout | Compensates left-right wiring asymmetry |
| Courtship state machine scaffolding | Connectome detection + code-gated court state |

**Implication for DeltaX integration:** Runtime modes `UPSTREAM` / `SUBSTRATE_ONLY` / `DELTAX` / `DELTAX_DEBUG` are required before claiming executive effects. Retain endogenous scaffolding until audited and optionally disabled under `SUBSTRATE_ONLY`.

## Headless / test entry points (for Phase 1)

```sh
npm install
npm run dev            # http://localhost:5173/arena.html
node scripts/run_fly.mjs 6 nearodor
node scripts/run_fly.mjs 3 onfood
node scripts/run_fly.mjs 2 threat
node scripts/calib_eval.mjs "$(cat public/data/brain_params.json)"
```

Also: `behavior_report.mjs`, `sensory_screen.mjs`, `starvation.mjs`, `diag_walk.mjs`, various `check_*.mjs`.

## Checkpoint / instrumentation (Phase 0 observation)

Upstream exposes shared brain memory and worker-per-fly architecture (`src/sim/fly.worker.js`, `src/brainsetup.js`). Full experimenter inspect/checkpoint/restore/perturb APIs are **not** present as the handoff's `src/neurocontrol/` — that is Phase 2 work after baseline.

## Licensing checklist

- [x] Upstream software MIT noted
- [x] Connectome CC-BY 4.0 noted
- [x] flybody Apache-2.0 noted
- [x] flyvis MIT noted
- [ ] FlySuite license file verified at incorporation
- [ ] MuJoCo npm redistribution notices copied at incorporation
- [ ] Exact data file hashes under `public/` recorded at incorporation

## Next step (held)

Phase 1: incorporate pinned upstream tree, run headless + document timings/seeds, commit `baseline/upstream-reproduced`, expand `docs/BASELINE_AUDIT.md` from provisional remote notes to measured baseline.
