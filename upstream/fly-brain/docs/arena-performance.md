# Arena rendering and flight verification — 2026-09-14

The arena uses the Blender-prepared articulated model at macro distance and compact derivatives at
smaller projected sizes. Material batches, GPU compute backpressure and bounded pose messaging keep
twelve active brains/physics worlds from overwhelming the renderer. The flight motor now uses a
calibrated cycle mean, explicit force-center conversion and stable takeoff/cruise/landing transitions.

## Rendering measurements

Chrome 152.0.7977.83, ANGLE Metal on Apple M4 Pro, 1400×900 CSS pixels, device scale 1. Frame-rate
figures are `1000 / mean requestAnimationFrame interval`, without intrusive GPU timer queries.
[Machine-readable results](arena-performance.json) contain draw counts, intervals, CPU submission
measurements, per-fly simulation advances, backend logs and validation results.

| Scenario | Before FPS | After FPS | Mean draws before → after |
|---|---:|---:|---:|
| One fly, paused | 60.2 | 60.0 | 116 → 52 |
| Twelve flies, paused | 60.2 | 60.0 | 1,112 → 121 |
| Twelve flies, running | 16.8 | 60.0 | 1,971 → 113 |
| Twelve flies, macro, paused | 60.0 | 60.1 | 801 → 437 |

Baseline source: `43cd107`, Vite dev server, 240 warm frames. Final sample: production preview, 300
warm frames. Both used the same initial placement and camera routine, with ten seconds of simulation
warmup before the active sample. A separate dev-server measurement of the new batching/backpressure
path also reached 60.2 FPS with twelve running flies, so the improvement is not solely a dev/production
comparison. That intermediate run is retained separately in the JSON.

All final samples above used DPR 1. The baseline macro sample used adaptive DPR 0.9. Flies move during
active samples and simulation rates differ, so the macro camera can contain different numbers of
nearby flies. These are application workload measurements, not a GPU-only geometry microbenchmark.
The initial baseline additionally produced repeated invalid `proxy7` lookups: each world allocated
seven other-fly bodies despite supporting twelve flies. The corrected world allocates and caches all
11 proxies, and hides unused ones. The final population check reports no page/shader/physics errors.
A missing favicon is excluded from browser error assertions.

The active frame interval p95 fell from 101.8 ms to 19.2 ms. All twelve workers advanced during the
final five-second sample, by 204–315 simulated milliseconds each: **0.04–0.06× real time**. The baseline
advanced around 0.07× real time. This change restores display responsiveness; it does not establish
faster neural throughput. The GPU fence bounds queued work and readback lag. No neuron population or
physics update is removed. The arena's real-time ratio remains the relevant simulation-speed display.

A separate twelve-fly takeoff stress run held **60.2 FPS with 11–12 flies airborne** during the
240-frame sample (p95 frame interval 20.9 ms, average 159 draws, DPR 1). All twelve workers advanced;
all twelve were airborne at the following paused macro check. The harness verifies that every world
has its full complement of 11 collision proxies and that Blender/sex/hair attributes remain present.

The existing `check_rendering.mjs` suite also passed: anatomy rest/flight, actual single-fly simulation,
macro and distant tiers, five active workers, shared buffers, female pigmentation/comb visibility,
flight visibility, environment resource cleanup and resize. Those scenarios measured around 60 FPS.

## Assets

- Macro surface: original 1,169,030 Blender triangles, with 35,060 exact baked hair instances.
- Medium surface: 105,589 triangles. Distant surface: 21,332 triangles.
- Additional arena asset: 2,440,303 bytes compressed, plus its metadata.
- Source-hash/topology/attribute validation and the existing exact-hair asset checks passed.
- Low/medium bodies share material batches across flies; macro geometry remains unchanged.

The arena uses Cycles diffuse illumination and the Blender AgX transform with live specular lighting
and ground shadows. Baked lighting assumes the studio/rest pose; it is an approximation during large
articulated movements. It is interactive WebGL, not browser Cycles path tracing.

## Flight

The old isolated controller tumbled violently; a representative trace reached thousands of radians
per second. It used incorrect angle units and drag direction, an incorrect external-force center,
and aggressive feedback combined with instantaneous virtual-wing moments. Correcting the coefficients
alone did not yield reliable flight. The replacement is a cycle-averaged flight motor; its scope is
explained in [Flight](24-flight.md).

`check_flight.mjs` passes straight flight, left/right steering, wind and zero-lift ablation using real
MuJoCo integration. Powered cases reach about 0.69 cm, remain upright, stay below 8 cm/s in these seeded
cases, and land around 1.86 simulated seconds with foot contact. The unpowered case falls. Tests also
check dissipative drag and clearing persistent forces at landing. These are motor checks, not evidence
of biological validity.

The actual browser control passes on WebGPU and WASM: a takeoff request queued while paused at startup
survives the initial gate, clears on launch, displays wing blur in flight, and returns to an upright
landing with the original wings visible. In the WebGPU run, the airborne observation was at 1.563 s
and height 0.253 cm; landing completed at 3.397 s and height 0.130 cm. A separate six-second full-brain
WASM diagnostic with vision disabled recorded two takeoffs, an upright landing and a second cruise.

## Reproduce

```sh
node scripts/pack_fly_arena.mjs       # only after regenerating the Blender source
node scripts/check_arena_asset.mjs
node scripts/check_fly_asset.mjs
node scripts/check_flight.mjs
npm run build
npm run preview -- --host 127.0.0.1 --port 5176
```

In a second terminal, run browser suites serially so they do not compete for the GPU:

```sh
node scripts/check_arena_population.mjs --url=http://127.0.0.1:5176 --frames=300
node scripts/check_arena_population.mjs --url=http://127.0.0.1:5176 --takeoff=1 --out=/tmp/fly-arena-population-flight
node scripts/check_arena_flight.mjs --url=http://127.0.0.1:5176
node scripts/check_arena_flight.mjs --url=http://127.0.0.1:5176 --gpu=0 --out=/tmp/fly-arena-flight-wasm
node scripts/check_rendering.mjs --url=http://127.0.0.1:5176
```

Screenshots and raw browser reports are written to each harness's `/tmp` output directory. Timing
varies with hardware, thermal state, viewport and simulation activity; these results do not establish
120 FPS or real-time neural simulation across devices.
