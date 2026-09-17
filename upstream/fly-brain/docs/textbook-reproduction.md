# Textbook technical reproduction companion

Executable commands and artifact locations for the prose edition in [the textbook](textbook/01-introduction.md). These commands are retained from the earlier reproduction appendix; the editorial revision did not rerun the scientific experiments. Run from the repository root with the source datasets and required dependencies available. Scientific stages overwrite their corresponding saved reports, so use an isolated checkout to compare with the recorded results.

Build the web edition with `node scripts/build_textbook.mjs`, or regenerate both web and PDF editions with `node scripts/build_textbook.mjs --pdf` (requires Pandoc, Tectonic, and STIX Two Text). The PDF is copied to the public download automatically. Run `npm run build` to build the site.

## Pipeline order

```bash
# IR and generic structure (Chapters 2 to 4)
python3 scripts/algo_structures.py    # fly structural report, ~3 min -> public/data/algo_structures.json
python3 scripts/connectome_ir.py      # fly + worm -> canonical IR
python3 scripts/algo_ir.py            # IR -> generic cross-species report -> public/data/ir_generic.json
python3 scripts/check_structures.py   # fly-through-IR reproduces algo_structures.json
node scripts/validate_dynamics.mjs    # structure-vs-LIF checks -> public/data/dynamics_validation.json

# Operator detection (Chapter 5)
python3 scripts/operators.py          # structure report -> public/data/operators.json

# Field model and perturbations (Chapters 8, 9)
python3 scripts/ring_pde.py           # self-check: bump, integration, landmark remap
python3 scripts/perturb_pde.py        # -> public/data/perturb_pde.json

# Ensembles (Chapters 6, 7, 10, 11); field output exists before the ring merge
python3 scripts/ensemble_spec.py      # operators -> public/data/ensemble_specs.json
node scripts/run_ensemble.mjs ring_attractor 42
node scripts/run_ensemble.mjs phasor_vector_shift 42
node scripts/run_ensemble.mjs sparse_associative_memory 42
node scripts/hypothesis_lab.mjs 42    # the hand-written ring lab, seed 42
node scripts/phasor_lab.mjs 42        # the hand-written phasor lab

# Benchmark (Chapter 12), ~40 s
python3 scripts/bench_heading.py

# Whole-brain model (Chapter 14)
node scripts/calib_eval.mjs           # one parameter set against the benchmark suite
node scripts/calib_search.mjs         # cross-entropy search
node scripts/behavior_report.mjs      # closed-loop scenarios
node scripts/sensory_screen.mjs       # which senses drive which commands
node scripts/starvation.mjs           # the genotype table
node scripts/neuromod_calib.mjs       # modulatory-neuron resting thresholds
```

## Key artifacts

| artifact | content |
|---|---|
| `public/data/algo_structures.json` | full structural report for the fly |
| `public/data/ir_generic.json` | cross-species IR comparison |
| `public/data/dynamics_validation.json` | Delta7 kernel, PEN push field and APL sparsening in the LIF model |
| `public/data/operators.json` | the operator catalogue |
| `public/data/ensemble_specs.json` | the declarative specs |
| `public/data/hypothesis_lab.json` | ring ensemble, ranked experiments, cross-formalism block |
| `public/data/ring_attractor_lab.json` | the heading circuit through the generic runner (approximate agreement, not identical counts) |
| `public/data/phasor_lab.json`, `phasor_vector_shift_lab.json` | PFN→hΔB ensemble, lab and runner |
| `public/data/sparse_associative_memory_lab.json` | memory ensemble |
| `public/data/perturb_pde.json` | field-model perturbation curves |
| `public/data/brain_params.json` | the fitted whole-brain parameters |

## Notation

- Ensemble *members* are parameter points. *Classes* are behaviour labels assigned by
  the probe. *Mechanisms* are the perturbation-outcome subclasses within a class.
- Separation scores are the fraction of member pairs an experiment places in different
  classes, in [0, 1]. A score near 0.5 in a two-class ensemble is a near-even split.
- Bump widths are full width at half maximum in degrees. Benchmark scores are RMS
  wrapped error in radians.
- *Wired* means read from synapse counts. *Realised* means measured in simulation.
- Ring offsets use the explicitly folded eight-bin analysis coordinate. In that coordinate, 1.5 bins is 67.5°, not a 22.5° anatomical wedge. A bridge-to-wedge interpretation requires its own mapping.
- The circuit builder retains the full loaded graph and uses current-based LIF defaults with adaptation and depression. It does not import the embodied `brain_params.json` fit.
- The recorded PFN lab has 13 shifted members: 9 PFNd cases receive mechanism attribution, while 4 PFNv-only cases do not.
- `d7_confines` denotes loss of confinement; it is distinct from `d7_confines_width`, which denotes a surviving widened bump. The recorded spiking artifact has no member in the latter class.
