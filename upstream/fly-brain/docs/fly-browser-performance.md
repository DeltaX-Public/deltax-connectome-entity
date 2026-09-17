# Interactive fly browser performance

The 2026-09-13 optimization retains all 1,169,030 Blender body triangles, 35,060 hair/comb
instances, the Cycles bake, live reflections and four-sample MSAA. The viewer still uses WebGL 2.

## Changes

- The focus effect samples the main render's resolved depth texture instead of rendering the
  body again. A half-resolution, 13-tap blur feeds the final AgX display pass, which also composites
  the sharp image. This removes a geometry pass, a fullscreen pass and a used MSAA color target.
- Asset version 3 replaces the embedded original scan with losslessly packed hair transforms and
  precomputed culling bounds. The browser constructs the Blender geometry directly. The packer
  and asset check verify every hair matrix element; original segment pigment boundaries survive
  the change to subdivided geometry.
- A short-lived module worker expands meshoptimizer streams, computes bounds and eye curvature,
  and transfers the typed-array buffers. It terminates after the transfer.
- Material variants share their cuticle uniforms without JSON-serializing their texture. Previously,
  cloning these materials encoded the texture to PNG repeatedly and immediately discarded the copies.
- Body shaders compile asynchronously before the first interactive frame. The unused AO pass was
  removed; occlusion already comes from the Cycles bake.

## Measurements

Production builds, Chrome 152.0.7977.83, Apple M4 Pro, ANGLE Metal; 1400×900 CSS pixels,
DPR fixed at 1. Baseline source was `fccb518` (the fly implementation from `eb0857b`).
Baseline and optimized builds were served from separate directories, without HMR. Each rendering
sample contains 240 frames, following a 1.8-second warmup. Other desktop activity was not disabled.

| Measurement | Before | After |
| --- | ---: | ---: |
| Mesh download | 9,261,127 bytes | 8,224,812 bytes (−11.2%) |
| Full-body draw calls, median | 267 | 179 (−33.0%) |
| Full-body submitted triangles, median | 3,742,331 | 2,572,458 (−31.3%) |
| Full-body GPU time, mean | 8.67 ms | 6.43 ms (−25.8%) |
| Head-detail GPU time, mean | 11.68 ms | 7.04 ms (−39.8%) |
| Local load to first frame, median of 3 | 485 ms | 327 ms (−32.6%) |
| Longest startup task, median of 3 | 339 ms | 100 ms (−70.5%) |
| Local load, 4× CPU throttling, one run | 1,470 ms | 676 ms |
| Longest startup task, 4× CPU throttling | 996 ms | 172 ms |

GPU timing uses `EXT_disjoint_timer_query_webgl2` in a **separate diagnostic run**. Queries can
serialize ANGLE/Metal work, so their frame intervals are not ordinary FPS. Normal rendering stays
near the 60 Hz refresh ceiling before and after; the useful gain is less GPU work and shorter
startup stalls. Main-thread render submission varied between runs; no reliable percentage gain
is claimed for that metric. These measurements preceded the additional 120 FPS work below.

Loading uses fresh browser contexts with HTTP caching disabled, a local server and warm OS/driver
caches. These are not internet download times or completely cold driver starts. CPU throttling
is an approximation, not a test on a slower physical device. No phone-GPU claim is made.

## 120 FPS target

Both `/fly.html` and `/arena.html` now target 120 Hz when the browser supplies a fast refresh
cadence. The resolution controller samples refresh during loading and recognizes sustained
changes later. A 60 Hz screen keeps its previous quality policy. On faster screens, the controller
can reduce raster resolution while retaining geometry; it holds the resulting size until resize
instead of periodically allocating larger MSAA buffers. Camera damping and focus interpolation
in the fly viewer also use elapsed time.

The fly's fixed studio shadow map now updates only when a conservative caster-motion bound
exceeds half a shadow texel, with the existing 30 Hz ceiling. Its resolution and casting geometry
are unchanged. The sixteen transparent wing-stroke samples now use smooth vertex illumination
from the studio sources. This is an approximation for the motion blur; resting wings retain their
full physical material. Isolating the old blur shader identified it as the remaining bottleneck:
the initial strict test failed dark flight at 79.3 FPS, despite the other views passing.

Final production tests used **uncapped Chrome**, 600 frames per scenario, five-second warmup,
1400×900 CSS pixels, device DPR 2, the existing 2.4-megapixel maximum and adaptive resolution.

| Scenario | Average rendering FPS | Effective render DPR |
| --- | ---: | ---: |
| Fly full body | 164.0 | 1.380 |
| Fly head detail | 128.3 | 1.173 |
| Fly orbit | 150.6 | 1.173 |
| Fly flight, studio | 171.8 | 1.173 |
| Fly flight, dark background (separate both-page run) | 151.5 | 1.380 |
| Arena macro, paused | 170.8 | 1.380 |
| Arena macro, running | 168.5 | 1.380 |
| Arena flight fixture | 167.6 | 1.380 |
| Arena social, five running workers | 277.6 | 1.380 |

All scenarios in both strict runs passed the **average ≥120 FPS** assertion. Frame-time tails
still contain slower frames; this is not a claim of a locked 120 FPS on every frame or every
device. Chrome's normal headless presentation remains about 60 Hz. Actual 120 FPS presentation
requires a browser/display supplying 120 Hz; no synthetic extra frames or timer-driven drawing
were added to the application. The Chrome uncapping flags are used only by the benchmark.

```sh
node scripts/check_render_resolution.mjs
node scripts/profile_fly_browser.mjs --url=http://127.0.0.1:5176 --out=/tmp/fly-120 --dpr=2 --uncapped=1 --adaptive=1 --target=120 --frames=600
node scripts/check_rendering.mjs --url=http://127.0.0.1:5176 --out=/tmp/arena-120 --dpr=2 --uncapped=1 --target=120 --frames=600
```

## Validation

`check_fly_asset.mjs` checks exact original-versus-packed hair matrices, culling bounds, body/parent
mapping, male/female pigment boundaries, finite decoded attributes and valid indices. It also
rejects accidental serialization of the shared texture during material cloning.

A fixed-pose before/after comparison is pixel-identical with focus disabled. With focus enabled,
full-body mean absolute channel error is 0.012/255; head-detail error is 0.989/255. Focus now uses
full-resolution depth, including fine opaque hairs, so some defocused boundaries differ from the
old half-resolution body-only depth pass. This comparison covers the initial worker/depth changes;
the later flight-blur lighting is intentionally approximate. Full-body, close-up and flight
screenshots were inspected.

The browser checks cover real orbit and zoom, complete-body framing, sex/wings/focus controls,
portrait resizing and touch zoom. Arena regression checks cover geometry/buffer sharing, detail
levels, multiple active simulation workers and environment resource disposal. These rendering
checks do not measure neural simulation throughput.

Raw measurements and validation results are recorded in
[`rendering-benchmark.json`](rendering-benchmark.json), under `browserOptimization`.

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 5176
node scripts/check_fly_asset.mjs
node scripts/profile_fly_browser.mjs --url=http://127.0.0.1:5176 --out=/tmp/fly-profile
node scripts/profile_fly_browser.mjs --url=http://127.0.0.1:5176 --out=/tmp/fly-gpu --gpu=1
node scripts/check_fly_page.mjs --url=http://127.0.0.1:5176 --out=/tmp/fly-page
node scripts/check_rendering.mjs --url=http://127.0.0.1:5176 --out=/tmp/fly-arena --frames=180
```

To compare a later change, preserve each production build in a separate output directory and
profile them sequentially at the same viewport and DPR. `--loadOnly=1` measures only loading;
`--dpr=2` exercises the same existing 2.4-megapixel cap rather than forcing native Retina resolution.

## WebGPU feasibility

A fresh Chrome session successfully requested a hardware WebGPU adapter/device on this M4 Pro
(`vendor: apple`, `architecture: metal-3`, with timestamp-query support). The repository's brain
compute kernel already has a [WebGPU implementation](27-webgpu.md); the fly's graphics renderer
has not been migrated.

Three.js supports a WebGPU renderer with automatic WebGL 2 fallback. This viewer's custom
`onBeforeCompile` materials and GLSL postprocessing need porting to node materials/TSL and
`RenderPipeline` before they can use it. See the official
[migration guide](https://threejs.org/manual/en/webgpurenderer) and
[postprocessing guide](https://threejs.org/manual/en/webgpu-postprocessing.html).
A renderer migration should retain the Cycles attributes, detail texture, pupil, membrane blending,
focus and AgX lookup, then compare the same real scene on both backends. Hardware support alone
is not evidence of a speedup. The asset and redundant-pass improvements here also apply to that port.
