# UPSTREAM

Lineage, licensing, and pins for `deltax-connectome-entity`.

**Status:** Phase 0 remote audit (2026-09-17). Full local baseline reproduction is deferred until Cloud Agents / a local checkout is available.

This project must always distinguish:

1. **Upstream biology / model code** — connectome runtime and dependencies
2. **DeltaX additions** — executive plane adapter and control (not yet present)
3. **Demo / environment additions** — Broken World, rover body, etc. (not yet present)

---

## Primary integration candidate

| Field | Value |
|---|---|
| Repository | [Lulzx/fly-brain](https://github.com/Lulzx/fly-brain) |
| Description | Embodied whole-CNS Drosophila connectome simulation in the browser |
| License (repo software) | MIT — Copyright (c) 2026 lulzx |
| Default branch | `main` |
| Audited commit (SHA) | `054e402853d370b004facc1946e36a409de601e8` |
| Audited commit date | 2026-09-17 |
| Live demos | [arena](https://lulzx.com/fly-brain/arena.html), [viewer](https://lulzx.com/fly-brain/), [structures](https://lulzx.com/fly-brain/structures.html), [textbook](https://lulzx.com/fly-brain/textbook/) |

### Why this candidate

Already combines:

- whole-CNS connectome runtime (≈165k neurons, packed data in `public/`)
- spiking / LIF neural simulation (`src/lif.js`, `src/lifwasm.js`, `src/lifgpu.js`, `src/wasm/lif.c`)
- WebAssembly / WebGPU execution
- identified sensory populations and descending-neuron outputs
- MuJoCo embodiment (`@mujoco/mujoco`) with TuragaLab flybody lineage
- flyvis optic-lobe runtime (`src/flyvis.js`)
- browser visualization (`arena.html`, `index.html`, …)
- headless experimental execution (`scripts/*.mjs`)
- behavioral benchmarks (`scripts/calib_eval.mjs`)

**Policy:** Do not blindly rewrite. Reproduce the upstream build exactly first (`baseline/upstream-reproduced`). Prefer this architecture unless it proves irreproducible or unsuitable.

---

## Authoritative upstream dependencies

Documented in upstream `docs/guide/sources.md`:

| Component | Source | License (as stated upstream) | Role |
|---|---|---|---|
| Connectome | Male CNS v1.0, Janelia FlyEM / Google Research — [male-cns.janelia.org](https://male-cns.janelia.org), [neuprint.janelia.org](https://neuprint.janelia.org) | CC-BY 4.0 | Graph / neuron / synapse data |
| Body | [TuragaLab/flybody](https://github.com/TuragaLab/flybody) (Vaxenburg et al. 2024) | Apache-2.0 | MuJoCo fly body |
| Eye | [TuragaLab/flyvis](https://github.com/TuragaLab/flyvis) (Lappalainen et al. 2024) | MIT | Optic-lobe / compound-eye model |
| Walking / wing | [TuragaLab/FlySuite](https://github.com/TuragaLab/FlySuite) | (verify at incorporation) | Kinematics / stroke data |
| Physics | MuJoCo WASM bindings (Google DeepMind) via npm `@mujoco/mujoco` | (npm package license) | Physics loop |
| Neuron model refs | Shiu et al. 2024; Pugliese et al. 2025 | literature | Calibration targets |

Upstream states: *This repository is MIT licensed. The connectome, body and eye keep their own licences.*

Also inspect at incorporation time: FlySuite license file, MuJoCo redistribution terms, and any notices inside packed `public/` data.

---

## npm runtime dependencies (upstream `package.json` at audited SHA)

| Package | Role |
|---|---|
| `@mujoco/mujoco` ^3.13.0 | Physics |
| `three` ^0.186.0 | Rendering |
| `vite` ^8.2.2 | Dev server / build |
| `playwright` ^1.63.0 (dev) | Browser checks |
| `meshoptimizer` ^1.2.0 (dev) | Asset tooling |

Scripts: `npm run dev` → Vite; arena at `/arena.html`. Cross-origin isolation headers required (see upstream `vite.config.js`) for SharedArrayBuffer / shared WASM brain memory.

---

## Incorporation plan (when baseline work resumes)

Recommended approach (subject to engineering confirmation during Phase 1):

- **Git subtree or vendored tree** under e.g. `upstream/fly-brain/` **or** a clearly marked submodule at a pinned SHA
- Preserve MIT license file and all attribution
- Keep DeltaX code strictly under `src/deltax/`, neurocontrol under `src/neurocontrol/`, demos under a separate tree
- Record the incorporation method and exact SHA in this file when done

Until incorporation: this repository holds Phase 0 documentation only; it does **not** yet contain upstream source.

---

## Modifications by this project

| Change | Status |
|---|---|
| None yet — documentation-only Phase 0 | current |

---

## Claim discipline (reminder)

Do not describe this project as conscious, sentient, artificial life, a digital brain equivalent to a fly, a synthetic prefrontal cortex, or biological intelligence recreated. Prefer: connectome-derived recurrent substrate, whole-CNS computational model, synthetic executive control plane (future), causal neural intervention (future).
