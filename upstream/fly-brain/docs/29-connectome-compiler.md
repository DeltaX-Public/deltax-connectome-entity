# The connectome compiler: one analysis, many animals

Doc 28 measures the algorithmic structures of the male fly CNS. This doc is the first step toward
making that machinery dataset-agnostic: a canonical **intermediate representation** for any
connectome, plus the generic analysis layer that runs on it. The fly-specific sections (Delta7
kernels, glomerular purity, …) stay in `algo_circuits.py`; everything below is the part that
compiles any nervous system.

## The IR

`scripts/connectome_ir.py` defines the schema every dataset is packed into:

| field | meaning |
|---|---|
| `names`, `types`, `scn`, `cln` | cell name, cell type (bilateral homologues share one), superclass, class |
| `side` | 1 = left, 2 = right, 3 = midline/other, 0 = unknown |
| `sign` | +1 excitatory, −1 inhibitory, 0 unknown/modulatory |
| `sensory`, `motor` | pins for the flow-hierarchy depth (sensors = 0, outputs = 1) |
| `indptr/indices/weights` | chemical graph, CSR, weight = synapse count |
| `gap_indptr/indices/weights` | electrical graph, symmetric CSR (empty where absent) |
| `meta` | provenance, sign convention, per-dataset thresholds |

Two loaders exist:

- **`load_fly()`** — reads the MaleCNS tables already packed for the browser sim
  (`graph_w3.bin`, `neurons.bin`, `ntsign.bin`, `meta.json`). Verified: every generic measure
  reproduces `algo_structures.json` exactly.
- **`load_worm()`** — Cook et al. 2019 adult hermaphrodite (corrected Jul 2020), from the
  Netzschleuder CSV dumps; neurotransmitter signs from the OpenWorm/WormAtlas cell dump
  (ACh = +1, GABA/Glu = −1, monoamines = 0; covers 179/302 neurons — the unassigned remainder is
  almost entirely pharyngeal). Types are neuron classes: bilateral suffixes are stripped only
  when a mirrored partner exists (`AVAL/AVAR → AVA`, but `RIR`, `PQR`, `AQR`, `PVR` stay single),
  and serial digits fold into the class (`DA01–DA09 → DA`): 169 types over 454 cells.
  Gap junctions are kept as a second, symmetric graph — a real edge type the fly IR lacks.

`scripts/algo_ir.py` runs the generic sections — flow depth, SCC/reciprocity, sign structure,
bilateral wiring, the type-graph motif census **with the same degree/sign-preserving null model
and FFL census** (imported from `algo_circuits.py`), the signed-matrix spectral footprint, and
hub tails — and writes `public/data/ir_generic.json`. Datasets accumulate by key, so per-species
reruns don't clobber each other.

## Worm vs fly, first comparison

| measure | *C. elegans* herm. (Cook 2019) | MaleCNS |
|---|---|---|
| cells / edges / synapses | 454 / 4,879 / 28,113 | 165,122 / 10.5M / 104M |
| forward / feedback / lateral weight | **12% / 72% / 16%** | 37% / 12% / 50% |
| giant SCC (chemical) | 0.61 | 0.97 |
| reciprocal weight | 0.29 | 0.27 |
| dominant neuron-level 2-cycle | **I↔I (371)** | **E↔I (616k)** |
| midline-crossing weight | 37% | 22% |
| FFI share of strong E type edges | 17% (z = 3.7) | 80% (z = 297) |
| FFL edges, coherent / incoherent | 29 / 33 (z = 1.4 / **3.0**) | 415k / 369k (z = 398 / 170) |
| spectral radius | 136 | 3,771 |
| dominant-eigenvector participation | **10.8 cells** | 49.9 cells |
| dominant-mode cell types | **RMD, RIA, SMD — the head-steering ring** | lLN2/lLN1 lateral-horn LNs |
| hub tail exponent (in / out) | 2.6 / 1.9 | 1.0 / 1.15 |

### What the comparison already says

- **Different dominant loop.** The fly's characteristic 2-cycle is feedback inhibition (E↔I);
  the worm's is mutual inhibition (I↔I) — the command-interneuron alternation (AVA↔AVB-style
  rivalry) that worm motor behaviour is famous for. At *type* level the worm's I↔I enrichment
  washes out (z ≈ −0.4): worm motor classes are single cells, so the motif lives at neuron
  resolution, not class resolution. The fly's FFI regime is far more extreme — 80% vs 17%.
- **The worm is shallower and more recurrent.** Only 12% of synaptic weight runs strictly
  forward (sensory→output), vs 37% in the fly — consistent with the worm's tiny recurrent
  interneuron core doing most of the work.
- **The dominant dynamical mode self-identifies.** On the worm, the leading eigenvector of the
  signed weight matrix lands on RMD/RMDV/RIA/SMD — the ring-interneuron/head-motor circuit that
  oscillates the head during foraging. Nobody told the analysis that; it fell out of the same
  measurement that found the lateral-horn LNs in the fly. That is the kind of "found, not
  annotated" result this layer exists for.
- **Hub tails differ in kind.** The fly's degree distribution is much heavier-tailed
  (exp ≈ 1.0 vs 2.6): 165k neurons have room for true super-hubs; 454 cells don't.

### Caveats specific to the worm pass

- Sign coverage is 179/302 neurons (pharyngeal cells mostly unassigned); unsigned edges are
  excluded from sign-conditioned counts rather than guessed.
- The null model swaps ~100 edges per rewire on a 330-edge graph — the worm's type graph is
  small enough that z-scores carry wide uncertainty; treat them as directional.
- Gap junctions are stored but not yet folded into the motif census (they are unsigned and
  undirected — folding them in changes reciprocity measures and is a deliberate next step).

## Where this goes

1. **Third dataset: MICrONS mm³.** Connectivity + measured activity + a functional digital twin.
   Needs CAVE credentials, boundary-aware completeness filtering (most arbors are cut), and
   class-inferred sign. The payoff: every detected operator becomes falsifiable against real
   responses.
2. **Operator detectors.** The generic layer currently produces statistics, not operators. Next:
   detectors that output the compressed layer directly — ring-attractor detection (folded
   inhibitory kernel + concentrated dominant mode + shifter asymmetry), expansion-layer
   detection, normalization-cell detection — so "10,000 neurons → 47 types → 11 motifs →
   3 operators → 1 algorithm" is a pipeline output, not prose.
3. **Invariant search.** Any detector that fires on worm AND fly (mutual-inhibition cores,
   feedforward motifs, command-interneuron convergence) is a candidate computational universal.
   The male/female fly comparison is the same trick at smaller evolutionary distance.

See also: doc 28 for the fly circuit sections, `scripts/check_structures.py` for the
fly invariants. The IR numbers regenerate with `python3 scripts/algo_ir.py`.
