# The hypothesis lab: ensembles, discriminating experiments, and a PDE benchmark

Doc 29 built the dataset-agnostic IR and analysis layer. This doc adds the layer that answers
the actual scientific question: **which computation does the wiring support, and what would
you measure to find out?** The approach: instantiate an *ensemble* of dynamical models over the
parameters the connectome does not fix, measure the same observables on every member, classify
them into competing mechanistic hypotheses, then rank candidate perturbations by how many model
pairs they separate.

## The machinery (`scripts/lif_ensemble.mjs`)

Generic pieces any circuit lab reuses:

- seeded RNG (mulberry32 — ensemble results are reproducible; `argv[2]` selects the seed)
- `makeBuilder` — constructs a calibrated `LIFNetwork` and scales edge classes by named
  parameters (`{pre: typeOrSet, post: typeOrSet, param}`), plus tonic bias populations
- perturbation helpers (`silence` = clamped threshold), circular-mean observables
- `rankExperiments` — for each candidate experiment, the fraction of ensemble member pairs
  whose outcome class differs; the top-ranked experiment is the most informative measurement

## Lab 1: the heading bump (`scripts/hypothesis_lab.mjs`)

48 members over `{epgRecur, d7Gain, epgTonic, penGain}` — recurrence gain, Delta7 kernel gain,
tonic EPG excitability, PEN push gain. Observables per member: bump persistence after a seeded
bump is released (concentration + FWHM), realised Delta7 kernel, bump rotation under unilateral
PEN drive. Perturbations: Delta7 silence, PEG lesion, EPG excitability sweep, unilateral PEN.

**Result, stable across seeds:**

- **No free-running bump anywhere on the grid.** Every bump-sustaining member requires tonic
  EPG bias — the wiring supports the attractor geometry, but the dynamics needs an excitability
  floor. ~15–25% of the grid (recur ≈ 3–6×, tonic ≈ 3–7 mV) sustains a bump at all.
- **Among bump-sustaining members, three mechanisms produce the same baseline bump** and are
  separated by Delta7 silencing:
  - `d7_sculpts` — bump survives silencing; Delta7 sharpens it but isn't required
  - `d7_confines` — silencing releases runaway/uniform firing; Delta7 is what confines the bump
  - `d7_essential` — silencing extinguishes activity (released excitation drives adaptation
    shutdown — flagged as a possible LIF artifact, not a biological claim)
- **Ranked experiments** (consistent top-3, order shuffles across seeds): EPG excitability
  manipulation, PEG lesion, Delta7 silencing. Each maps to a real experiment: depolarize EPGs
  while imaging the ring; kill the PEG copy; silence Delta7 and watch bump width/continuity.

The literature check: real Delta7→EPG is glutamate→GluClα inhibition that suppresses EPGs
*distant* from the bump (the measured antipodal kernel), so `d7_sculpts`/`d7_confines`-style
outcomes are the plausible ones; `d7_essential` is the class real data would rule out — which
is exactly what a discriminating experiment is for.

## The labs are now compiler output (`scripts/ensemble_spec.py` + `scripts/run_ensemble.mjs`)

Both labs were reimplemented as executions of a declarative **ensemble spec**. The spec
generator reads `operators.json` and emits, per detected operator: populations and their
functional roles, the gain axes the wiring does not fix (per-edge-class scalar gains +
tonic biases, each with a `why` note), the perturbation set (each load-bearing population
and edge class ablated), hypothesis classes, and provenance (which evidence items justified
the detection). `run_ensemble.mjs` executes a spec through geometry plugins (`ring`,
`linear`) — hypothesis classification, perturbation ranking, mechanism attribution.

Equivalence check: the ring spec at seed 42 reproduces the hand-written lab's hypothesis
distribution and top-3 experiment set; the phasor spec reproduces the deepened workup and
surfaces arm coupling (`needs_...+pfnv_silenced`: some members' PFNd shift requires PFNv
co-activity). The difference between this and the earlier labs is the compiler claim: a new
operator is now analysed by writing a spec entry, not a new script.

## Lab 2: the PFN→hDeltaB phasor transform (`scripts/phasor_lab.mjs`)

Same machinery, different circuit — the test of whether the framework is generic or secretly
ring-specific. Geometry is linear FB columns (`_C<n>` tags), not the ring; the observable is a
population centroid offset, not bump persistence.

72 members over `{pfndGain, pfnvGain, hdRecur(0–2), hdTonic}`. Drive PFN column C6, measure where the
hDeltaB population responds; structure predicts PFNd −3 / PFNv +2 columns.

**Result:** 13 wired_shift · 55 passthrough · 4 silent. Realised offsets cluster at −1..−2 —
**directionally consistent with the wiring but magnitude-compressed** by dendritic integration.
hDeltaB response amplitude scales sub-linearly with PFN drive (the velocity channel exists but
saturates).

**The deeper workup changed the conclusion.** The connectome contains three candidate dynamical
mechanisms the first pass didn't test: PFNd→PFNd self-recurrence (7970 synapses), hΔB→PFN
feedback (61 edges), and hΔB internal recurrence. Ablating each in every wired_shift member:

- **No member is `wired_only`** — every shifted response requires at least one dynamical
  element (needs_hdb_recur / needs_pfn_recur / needs_hd2pfn_feedback in various combinations).
  The −3-column wiring alone does not produce a shifted response; dynamics always participates.
- **Column sweep is never rigid** — the realised offset varies with driven column, so the
  transform is warped by position, not a clean linear shift.
- **PFNv arm is structurally weaker** (20 cells vs 40) and rarely realises its +2 prediction;
  the two phasor arms are asymmetric in a way the wiring histogram doesn't show.
- Ranked discriminators: amplitude scaling (0.42) > hd_recur_off (0.41) > **hd2pfn_off (0.32)**
  — the feedback loop, newly added, is already a top-3 discriminator.

## Lab 3: mushroom-body memory circuit (`sparse_associative_memory`, geometry `memory`)

Third circuit through the generic runner — a different observable class entirely: no
spatial geometry. Two overlapping KC "odors" (200 cells, 50% shared) are driven; the
measured transform is KC→MBON readout, and the free question is whether the KC↔APL
feedback loop provides gain control (compresses KC output as drive doubles).

**Result: an honest negative.** 18 members over `{kc2mb, aplGain, mbonTonic, mbRecur}`:
9 silent, 9 collapsed/linear — no `gain_controlled` member. APL recruitment saturates
(~16 spikes in 200ms at 5× drive) while KC output scales ~3.4×; with ~1 APL synapse per
KC (4210 edges / 4064 cells), count-calibrated feedback cannot compress. The MBON
transform is near-linear (expansion < 1 for 50%-overlap odors — expected: decorrelation
happens upstream, at odor→KC, not at the readout). Interpretation: the wiring does not
by itself establish divisive normalization — per-synapse conductance, which the
connectome doesn't carry, is the missing parameter. That is the lab working as intended:
it reports where structure underdetermines function.

**Meta-finding across all three circuits: structure overstates what dynamics delivers.**
Cosine kernel → realised; phase shift → realised at ~⅓ amplitude and only via dynamics
(never `wired_only`); ring attractor → only in a narrow tonic regime; gain control →
absent at count-calibrated weights. The structure-to-dynamics gap is the calibration
signal — and, on the MB, it localises exactly which parameter functional data must fix.

## The engineering benchmark (`scripts/bench_heading.py` + `scripts/ring_pde.py`)

The decompiled estimator vs. standard algorithms on one task: track heading from noisy angular
velocity + sparse landmarks with 15% outliers (±π corruption). `RingField` is an Amari-type
field on S¹ with measured parameters — Delta7 surround kernel (a−b·cos), EPG local recurrence
(the gain wiring doesn't fix), PEN shifted-feedback advection, and landmark anchoring via
ring-neuron-style disinhibition (global suppression with a gap at the landmark bearing).

| estimator | RMS err (rad) | post-outlier |
|---|---|---|
| dead reckoning | 0.679 | 0.633 |
| complementary α=0.35 | 0.701 | 1.143 |
| Kalman 1-D | 1.117 | 1.991 |
| Kalman + outlier gate | 0.489 | 0.710 |
| complementary α=0.05 (matched) | 0.604 | 0.633 |
| ring attractor (scalar reduced) | 0.641 | 0.668 |
| **ring field (PDE, advect mode)** | **0.48** | **0.53** |
| ring field + per-cell noise σ=0.15 | ~0.49 | ~0.53 |

(Benchmark numbers shown for the corrected two-inhibition-channel model — matching the
real Delta7-block result costs ~0.07 rad vs. the pure-Delta7 version, which scored 0.41.)

### The velocity pathway, done properly

The PEN shifted-feedback mechanism was derived rather than hand-tuned. Writing the bump as
u*(θ−φ(t)) and the PEN arm as an extra shifted kernel K in τ∂_t u = −u + W∗f(u) + v·K∗f(u),
projecting the perturbation onto the translation mode u*' (the marginal direction of the
translation-invariant field) gives the integration gain in closed form:

    phi_dot = v · ⟨u*', K∗f(u*)⟩ / (τ ⟨u*', u*'⟩)   →   pen_gain = 1/coef ≈ 0.27

With the literal shifted-synapse kernels at that predicted gain, the field tracks clean
velocity linearly at ~0.85× (the 15% deficit is the second-order correction — the shifted
input also distorts the bump profile, which the leading-order projection ignores). Under
fluctuating velocity, however, the literal mechanism degrades badly: each shifted injection
distorts the bump shape, not just its phase.

**Two-population PEN models discriminated how the real circuit must work.** Three
mechanisms were implemented and benchmarked under identical noisy drive:

| pen_mode | mechanism | noisy RMS |
|---|---|---|
| `shifted` | amplitude coding: om scales shifted-arm injection into EPG | 1.29 |
| `shifted2` | amplitude coding through a second attractor field | 1.61 |
| `shifted3` | **position coding**: om displaces the PEN bump; EPG pulled toward it | **0.60** |
| `advect` | idealized transport of u itself (reduced algorithm) | 0.41 |

Amplitude coding fails under sign-flipping drive regardless of filtering (τ_pen 0.02–0.3
scanned) or of a second field. Position coding — velocity displaces the PEN bump and the
summed shifted projections drag EPG toward it — halves the error and is robust, but
plateaus at ~0.60 because u always chases v with a stage of lag. Direct advection of u
(0.41) is the bound when transport acts on the transported field itself. The ~50% gap
between `shifted3` and `advect` is the price of indirect transport — and position coding
carries a testable neural signature the amplitude models lack: an EPG–PEN phase offset
during rotation, which is what calcium imaging of the fly circuit actually shows.

### Cross-formalism perturbation check (`scripts/perturb_pde.py`)

The same manipulations the LIF lab ranked were run on the field model, so outcomes can be
compared across formalisms. Agreement across model classes is stronger evidence than
agreement across parameters within one class. `hypothesis_lab.mjs` now reads
`public/data/perturb_pde.json` and emits a `cross_formalism` block: each ranked experiment
carries the PDE outcome, its mapping onto the LIF mechanism classes, and an explicit
`agrees_with_lif_majority` flag — at seed 42 the PDE lands in `d7_confines_width` while the
LIF majority is `d7_sculpts_sharp`, so the disagreement is recorded, not smoothed over.

**Delta7 suppression, graded (the LIF lab's #1 discriminator), corrected against withheld
data.** The first field model attributed all surround inhibition to Delta7 and dissolved
the bump below d7≈0.3 — contradicted by Turner-Evans et al. (2020), where Δ7 block leaves
a formed bump that tracks unreliably ("other sources of inhibition must act"). Adding the
second biological channel — a shallow ring-neuron surround (GABAergic Gall-EB/R neurons,
`rn_gain`, `rn_depth`) not gated by d7 — reproduces the real result: FWHM widens
monotonically 90° → 143° as Δ7 is fully blocked while the bump survives throughout. The
LIF majority class (`survives sharp`) is now disfavored by both the corrected field model
and the published data; the refined prediction is a quantitative width-vs-suppression
curve, a measurable discriminating experiment.

**PEN arm gating.** With only the om>0 arm intact the field integrates +om at ~unity gain
and is indifferent to -om; the converse for the other arm. Arm selectivity is exact —
unilateral PEN silencing should abolish integration in one direction only, matching the
fly result (PEN block → heading no longer follows turns).

**Local excitation sweep.** The bump is bistable above epg_recur ≈ 1.5 and absent below —
the one free gain of the field model has a measured viability threshold, and the observed
bump width (~100° FWHM) is stable across the viable range (94°–107°).

Two honest points:

1. **At the scalar level there is no magic** — a weakly-corrected complementary filter matches
   the reduced ring model. The biological advantage is not a better scalar filter.
2. **The advantage lives in the spatial representation.** A corrupt landmark must *win a
   competition* on the field, not just shift a point estimate — outlier robustness emerges
   without gating logic, and per-cell noise is corrected collectively by the attractor. The PDE
   model beats even the gated Kalman filter post-outlier while carrying no outlier-detection
   machinery at all.

Caveats: tuned to one noise regime; the excitatory gain is a free parameter (the wiring shows
EPG↔EPG/PEG recurrence exists but not its strength); real PEN dynamics are graded neurons, not
pure advection. The claim is "this mechanism class is competitive in this regime," not "the fly
beats Kalman filters."

## What's next

- Third circuit candidate: KC/APL sparse coding under ensemble gains — does the sparse-memory
  hypothesis survive dynamics, or does the code densify?
- Withheld-prediction closure: find the specific measured bump-width change under Delta7
  perturbation in the literature and check which mechanism class it selects.
- Provenance: each lab JSON records params, observables, perturbation outcomes, mechanism
  class, and seed — the inspectable chain from wiring to claim.
