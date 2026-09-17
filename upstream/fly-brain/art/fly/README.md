# Blender macro fly

`fly-macro.blend` is an editable Blender 5.2.1 Cycles scene using the full 272,550-triangle
flybody scan and 35,060 procedural hairs/comb teeth from the browser renderer. The scene adds
one level of render subdivision on the body/lenses, three macro area lights and a lower bounce,
shallow amber subsurface scattering, individual red eye-lens highlights, and a defocused mint/ochre
backdrop. The main camera frames the face from slightly below. Additional three-quarter and
full-body cameras are included. `front.png` is the completed front render; its JSON records the
device, sample count, resolution and wall time including scene setup.

`full-body.png` is the complete fly at 2400×1600 and 256 samples; `fly-full-body.blend` is its
editable scene. The full-body camera fits the projected bounds of all body parts and hair batches,
including the wings and claws. A continuous matte stage receives contact shadows. This render
took 43.85 seconds including setup on the warmed Metal cache.

The supplied photograph guides the material response, lighting and microtexture. The existing
scan's head proportions, resting antennae and folded mouthparts differ from that specimen.
Procedural hairs, cellular relief, pigments and scattering parameters are artistic approximations.
This is an offline path-traced render; the browser is a separate real-time approximation.

## Reproduce

Run from the repository root with Blender 5.2.1 (tested on Apple M4 Pro/Metal):

```sh
blender -b --factory-startup --python scripts/bake_fly_cuticle.py
node scripts/export_fly_blender.mjs /tmp/fly-blender/appearance.json
blender -b --factory-startup --python scripts/render_fly_blender.py -- --samples 256 --width 1600 --height 1152 --output art/fly/front.png
blender -b --factory-startup --python scripts/render_fly_blender.py -- --view full --samples 256 --width 2400 --height 1600 --output art/fly/full-body.png --blend art/fly/fly-full-body.blend
```

The export is read directly from `src/fly-appearance.js`; it requires no running dev server.
The render script reads the original binary scan and exported world transforms, and creates hair
meshes in batches instead of thousands of Blender objects. Textures are packed into the saved
scene. The first Metal render can include substantial kernel compilation; subsequent runs reuse
the cache. The script falls back to CPU if Metal configuration is unavailable.

Options: `--view front|three-quarter|full`, `--front-elevation -10`, `--samples`, `--width`,
`--height`, `--output`, `--blend`, and `--appearance`. Use a temporary `--blend` path for
alternate renders to retain the main front-camera scene.

## Shared browser detail

`cuticle-bake.blend` is the source node graph for `public/body/cuticle_detail.png`: a seamless
512² linear data tile with height in red, roughness in green, and pigment variation in blue.
Noise and Voronoi nodes sample a torus to keep values and derivatives continuous across tile
boundaries. The bake uses Raw colour management, so these data channels are not gamma encoded.
Cycles uses box projection; the shared WebGL material uses three weighted planar samples.
Both map it in each body part's coordinates, and each browser fly shares the same mipmapped
texture. The browser retains its geometry tiers, cached shadows and adaptive raster resolution.

## Interactive 3D in fly.html

The page always renders real, articulated geometry. **Full body** and **Head detail** reposition
its orbit camera; dragging, wheel/pinch zoom and double-click focus work everywhere. The Blender
scene supplies the subdivided geometry, Cycles diffuse transport and exact AgX / Medium High
Contrast display transform. Four live area sources keep eye-lens and cuticle highlights dependent
on the camera angle. The fine hairs remain GPU instances.

The asset pipeline applies the same one-level subdivision as the Cycles image, then bakes diffuse
direct and indirect irradiance (including subsurface scattering) into vertex attributes. It also
bakes each hair batch and averages irradiance per hair. Glossy reflections are excluded from the
bake so highlights do not stick to the model as the camera moves. The cellular relief texture
still drives fine normal and roughness variation at close range.

```sh
node scripts/export_fly_blender.mjs /tmp/fly-blender/appearance.json
blender -b art/fly/fly-full-body.blend --python-exit-code 1 --python scripts/bake_fly_realtime.py -- --samples 128
node scripts/pack_fly_realtime.mjs /tmp/fly-blender/baked public/body/blender
```

Regenerate the full-body `.blend` first if the scan, procedural hair placement or Cycles materials
have changed. The baker's temporary output defaults to `/tmp/fly-blender/baked`. It currently
uses Metal; the editable `.blend` and lossless camera renders remain in `art/fly/` as source art.
The webpage does not load those images.

`public/body/blender/fly.mesh` contains meshoptimizer-compressed vertex/index streams inside gzip.
Positions use 16 bits per local axis, normals use 12-bit octahedral encoding, and irradiance uses
12-bit square-root encoding. No triangles are removed. The packer verifies index round-trips and
records maximum position/irradiance quantization errors in `bake.json`. Version 3 packs the
exact procedural hair transforms and their culling bounds offline, replacing the original surface
sampler. A short-lived worker decodes the geometry, lighting and hair matrices, then transfers
their buffers to the renderer without copying. `check_fly_asset.mjs` verifies every hair transform
against the original sampler and preserves the original abdomen band boundaries.
The small `agx-look.png` is a color-management lookup table, not a fly image.

Lighting is baked for the fixed studio and resting male. It remains valid when orbiting the
camera, but self-shadowing/scattering during large pose changes and female recoloring are
approximations. This renderer is WebGL with Cycles-prepared assets; it is not live Cycles path
tracing. The arena now loads the same Blender body and bake, with shared reduced geometry tiers and dynamic ground shadows. Its detailed workflow and timings are in [arena performance](../../docs/arena-performance.md).

```sh
npm run dev
node scripts/check_fly_page.mjs --url=http://localhost:5173 --out=/tmp/fly-blender/interactive-check
node scripts/check_rendering.mjs --url=http://localhost:5173 --out=/tmp/fly-blender/browser-check --frames=180
node scripts/check_fly_asset.mjs
npm run build
```

The page check verifies actual camera orbit/zoom, complete-body framing, Blender geometry and
lighting attributes, sex/wings/focus, phone touch controls and warm frame times. The arena harness
separately checks active simulations and buffer sharing. Rendering FPS is not neural simulation
throughput. Raw measurements are stored in
[`docs/rendering-benchmark.json`](../../docs/rendering-benchmark.json).

Validated on 2026-09-13 in production-preview Chrome 152 on M4 Pro: 60.0 FPS full-body,
60.1 FPS head detail and 60.1 FPS flying (300 frames each, 1400×900, DPR 1). The Retina check
held 60.3 FPS at effective DPR 1.38 under the 2.4-megapixel ceiling; it does not render at native
DPR 2. The packed mesh is now 8.22 MB, with no triangles removed. The focus effect reuses the
main render's resolved MSAA depth and combines focus compositing with the AgX output pass.
It preserves the full-resolution sharp image and no longer redraws the body for depth.
Both pages now adapt to a 120 Hz frame budget on fast displays. Flying wing-stroke samples use
smooth vertex illumination, and sub-texel motion reuses the studio shadow map.
See [the browser performance comparison](../../docs/fly-browser-performance.md) for measured
loading, GPU costs, visual checks, limitations and reproduction commands.

## Arena geometry tiers

After repacking the Blender source, regenerate the arena derivatives:

```sh
node scripts/pack_fly_arena.mjs
node scripts/check_arena_asset.mjs
```

The two derivatives have 21,332 and 105,589 triangles and preserve baked vertex illumination,
normals, eye curvature and wing UVs. Their combined gzip payload is 2.44 MB. The full macro geometry
is retained unchanged. The validator rejects tiers generated from an older Blender source hash.
