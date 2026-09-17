# 15. Arena app

Files: `arena.html`, `src/arena.js`, `src/sim/fly.worker.js`, `src/sim/fly.js`.

## Architecture
- The main thread loads data, writes the connectome and flyvis model into shared memory, and renders.
- Each fly runs in its own Web Worker with its own MuJoCo world and brain slot (maximum 12 flies).
- Workers transfer pose buffers at most 30 times per wall-clock second. The renderer interpolates
  positions and quaternions between snapshots, without extrapolating the simulation.
- Other-fly positions and sexes are shared at most 30 Hz. Every world has 11 cached collision proxies;
  unused proxies are parked outside the arena. The old seven-proxy allocation generated invalid-body
  lookups once the population exceeded eight flies.
- WebGPU brains use bounded bursts (at most eight simulated milliseconds / eight CPU milliseconds),
  flush, and await their submitted GPU work before scheduling more. This prevents an accumulating
  compute queue from starving WebGL or making motor readback increasingly stale. WASM uses the same
  CPU burst limit without a GPU fence. Neither backend skips neural/physics steps.
- `?gpu=0` forces the WebAssembly brain; flyvis eyes always use WASM.
- Food consumption is accumulated between pose messages and broadcast back to the workers.

## Rendering
The arena now loads the same Blender-prepared articulated body as `fly.html`: 1,169,030 surface
triangles, 35,060 baked hair instances, Cycles vertex illumination and the Blender AgX look. These are
interactive meshes, not rendered fly photographs. Live specular lighting and the dynamic floor shadow
remain. Cycles already supplies body/hair occlusion, so the arena skips redundant screen-space AO.

The arena retains MuJoCo's body poses and proportions. The anatomy viewer's female size adjustment and
idle animation are not applied over physics poses. Both sexes receive the Blender material treatment;
female banding and hidden sex combs remain distinct. The single cuticle detail texture and all immutable
surface/hair buffers are shared. Baked illumination assumes the studio/rest pose, so moving self-shadows,
female recoloring and large flight poses remain approximations.

Distance detail uses projected body size with hysteresis:

| View | Geometry and hairs |
|---|---|
| Distant (enter below ~85 px, leave above 110 px) | 21,332-triangle Blender derivative; no separate hairs |
| Nearby (~110–330 px) | 105,589-triangle Blender derivative; simpler long bristles |
| Macro (enter above 330 px, leave below 270 px) | Full Blender mesh and all curved hairs |

The reduced meshes preserve normals, eye curvature attributes, wing UVs and baked illumination.
`node scripts/pack_fly_arena.mjs` generates the two compact tiers offline from `fly.mesh`; the additional
asset is 2.44 MB compressed. `check_arena_asset.mjs` verifies the source hash, topology and attributes.
The full macro mesh is unchanged. Hair detail changes preserve each batch's baked light attribute.

`src/arena-batches.js` groups low/medium articulated surfaces by material using Three.js `BatchedMesh`.
A material draw can contain many body parts from all twelve flies. Each part retains its own physics
matrix and frustum culling. Macro surfaces use their original meshes; wing blur uses two instanced
membrane draws per flying fly. Picking still uses the articulated source surfaces.

Ground shadows refresh at most 30 Hz and stop when poses/camera settle. Brain colors upload only for
new activity/selection/highlighting, and the brain inset draws at most 30 Hz. Environment placement
releases the old geometry, materials and textures. Hidden tabs skip rendering and activity polling.
`src/render-resolution.js` retains the 2.4-megapixel ceiling, DPR cap of 2 and adaptive density for macro
views, with a 120 Hz target on capable displays. Wide-view simulation load does not lower render density.

See [current twelve-fly performance and flight checks](arena-performance.md) and the
[Blender workflow](../art/fly/README.md). The older tables below record previous renderer revisions.
Rendering FPS and simulated-time/wall-time are separate measurements.

### Measured rendering (2026-09-13)

Headless Chrome 152, ANGLE Metal on Apple M4 Pro, 1400×900 at device scale 1; 180 warm frames per
scenario. Source baseline: `9d89509`. Full samples and CPU submission timings are in
[`rendering-benchmark.json`](rendering-benchmark.json). FPS below is 1000 / mean frame interval.
This table records the initial optimization, before the subsequent cuticle/lighting revision; the
revision's browser and timing results are recorded separately in the same JSON.

| Scenario | Before FPS | After FPS | Before → after mean draw calls |
|---|---:|---:|---:|
| Anatomy, resting, focus + AO | 60.1 | 60.0 | 569 → 399 |
| Anatomy, flying, dark backdrop | 50.4 | 60.1 | 678 → 388 |
| Arena, default view, paused | 60.1 | 60.3 | 182 → 116 |
| Arena, macro, paused | 60.0 | 59.2 | 180 → 270 |
| Arena, macro, running | 60.2 | 55.8 | 180 → 302 |
| Arena, wide, paused | 60.2 | 60.1 | 182 → 95 |
| Arena, five flies, paused | 60.2 | 60.1 | 826 → 489 |
| Arena, five flies, running | 37.3 | 35.8 | 791 → 667 |

The macro arena renders substantially more geometry than the former low-detail view. Its visual upgrade
costs about 1.3 ms per frame in the active single-fly sample; the five-fly simulation remains below 60 FPS
in both versions. These results establish reduced draw work and better anatomy-view flight performance,
not a universal frame-rate improvement. The active macro sample used render DPR 0.9 after adaptation,
and the following wide sample began recovering density. Other desktop rows used DPR 1. Brain-colour
uploads were zero in all settled paused samples; shadows also stayed cached, apart from a refresh when
render density changed. The resting anatomy view submitted about 53% fewer triangles across all passes.

A separate device-scale-2 check allowed five seconds for adaptation, then sampled 120 frames: anatomy
60.4 FPS and paused macro arena 60.1 FPS. Both settled at render DPR 0.997 (1396×897 drawing buffer for
a 1400×900 CSS viewport). This is adaptive raster resolution, not native Retina rendering. Full scan
and hair geometry remained enabled; front, rear, overhead and eye close-ups were also inspected.

After the cuticle/lighting revision, another 180-frame run at device scale 1 measured 60.2 FPS in both
anatomy scenarios, 58.9 FPS in the paused macro arena, 60.2 FPS with one active fly, and 37.2 FPS with
five active flies. All these samples used render DPR 1. Browser interaction and shader checks passed.
The varying active-worker results are not evidence that the material shader accelerates simulation.
The revised device-scale-2 check also held about 60 FPS after adaptation: render DPR 0.9 for anatomy
and 0.997 for the paused macro arena. Those remain reduced-density renders, not native Retina.

The subsequent Blender-baked detail revision passed the same 180-frame browser suite at about 60 FPS
in all sampled views, at DPR 1. A separate five-fly check allowed ten seconds of simulation warmup,
then measured 600 frames: 60.0 FPS, 21.9 ms p95 frame interval. Every worker's simulation timestamp
advanced during that measurement. One receding fly reached the distant detail tier. The JSON keeps
this run separate from earlier timings; active workloads vary, and rendering FPS does not establish
real-time neural/physics throughput. Blender itself rendered the 1600×1152, 256-sample reference in
36.3 seconds including scene setup on the warmed Metal cache; that is an offline render.

## Brain panel
The right-hand panel follows the selected fly. Every 120 ms the page asks that fly's worker for:
- **Eyes:** the brightness in each of the 721 columns per eye that the flyvis model receives, drawn by
  azimuth and elevation with the front of each eye towards the middle.
- **Named neuron groups:** firing rate per side in Hz of simulated time, smoothed over about 150 ms,
  for smell, taste, photoreceptors, looming detectors (LC4, LPLC2), the giant fibre, forward and backward
  walking DNs, steering DNs, grooming DNs, the courtship circuit (pIP10, DNp13), the hunger-driven
  octopamine neurons (one pooled trace) and
  feeding motor neurons. Each row keeps about 18 s of
  history. The "?" opens a short explanation. Hovering a row fades the brain inset and marks that
  group's somas.

Group membership is defined once in `src/sim/groups.js` and used by both the worker (`GroupMeter`)
and the page.

## Panels
Both side panels fold to their title bar with the chevron button, or the `[` and `]` keys. The choice is
remembered. While the brain panel is folded, the page stops polling activity and drawing the inset.

## Flight
A flying fly's wings are drawn as faint copies across the wing-beat cycle, from poses the worker computes
at startup. Its shadow on the floor shows its height. "Activate takeoff DNs" queues the selected fly's intrinsic takeoff request until startup and contact
gates permit launch. See [Flight](24-flight.md) for the motor approximation and actual browser checks.

## World presets

| Preset | Contents |
|---|---|
| Foraging arena | One fly, food with vinegar, bitter patch, hot patch, block |
| Open field | Three flies, five small food patches |
| Predator zone | Two flies, a looming threat every 6 s |
| Maze | Three walls, food at the far end |
| Social | Five flies, one food patch |
| Courtship | A male and a female |

## Controls
Run and pause, speed, add fly, add female, motor mode, follow camera, placement tools, looming threat,
takeoff DN activation, wind, light.
The panel shows each fly's behaviour label, energy, health, food eaten, distance, takeoffs and flights,
its endogenous state (walk, stop, groom, feed, search, avoiding, court, fly), AKH and insulin levels, octopamine
tone and arousal ([Neuromodulation](25-neuromodulation.md)), and live descending-neuron commands.
