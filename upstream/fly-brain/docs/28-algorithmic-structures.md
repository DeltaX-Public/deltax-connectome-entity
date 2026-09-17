# 28. Algorithmic structures in the connectome

What computations does the wiring itself implement, before any dynamics are simulated? This document
reports what `scripts/algo_structures.py` measures on the male-CNS graph used by the simulation
(165,122 neurons, 10.5 M connections of 3 or more synapses, 104 M synapses, signs from the predicted
transmitters as in [doc 5](05-brain-model.md)). `structures.html` visualises the same results with a description of each structure. Every number below is
reproduced by

```sh
python3 scripts/algo_structures.py            # ~3 min, writes public/data/algo_structures.json
python3 scripts/algo_structures.py cx mb      # only some sections
```

Sections: `flow rec sign bil spec motif al lh mb mbc cx ol og escape dn vnc state hubs`. The circuit
sections live in `scripts/algo_circuits.py`. Column, glomerulus and compartment labels come from the
neuron instance names (`EPG(PB08)_L4`, `hDeltaB_08_C7`, `ORN_DA1`, `MBON06(B1>a)`).

The tables in `<!-- GEN -->` blocks are regenerated from the JSON by `python3
scripts/render_doc28.py`; everything else is prose. `scripts/validate_dynamics.mjs` re-runs the
structure-vs-dynamics checks of section 4 against the live LIF model and writes
`public/data/dynamics_validation.json`.

## 1. Global organisation

**Shallow feedforward skeleton, deep recurrence.** Breadth-first from all sensory neurons over
connections of 5 or more synapses:

<!-- GEN:flow_hops -->
| hops from sensory | 0 | 1 | 2 | 3 | 4 | 5+ | ∞ |
|---|---|---|---|---|---|---|---|
| neurons | 15,912 | 27,495 | 84,711 | 35,214 | 902 | 31 | 857 |
<!-- /GEN:flow_hops -->

Half the descending neurons are one hop from a sensory neuron and nearly all the rest two; 465 of 708
motor neurons are one hop. So the longest sensor-to-muscle chain the wiring needs is three synapses,
and almost every neuron is within three.

A harmonic depth (sensory pinned at 0, motor and efferent at 1, every other neuron at the mean depth
of its partners) orders the superclasses: sensory 0 → antennal-lobe LNs 0.09 → PNs 0.15 → Kenyon
cells 0.19 → MBONs 0.26 → central-brain intrinsic 0.33 / central complex 0.35 → descending 0.49 →
VNC intrinsic 0.52 → motor 1. Measured against this order, only 37% of synaptic weight runs forward,
12% runs backward and 50% is lateral (between neurons at the same depth). The optic lobe alone is
89,390 neurons of lateral processing.

**One giant loop.** 97.2% of neurons (160,514) are in a single strongly connected component; every
central-brain intrinsic, descending, ascending and visual-projection neuron is in it. Only sensory
terminals, motor neurons and endocrine cells sit outside. 19% of connections and 27% of synaptic
weight are reciprocal (both directions between the same two neurons). Reciprocal pairs by sign:

<!-- GEN:recip_pairs -->
| E↔I | E↔E | I↔I |
|---|---|---|
| 616,156 | 263,808 | 126,371 |
<!-- /GEN:recip_pairs -->

Feedback inhibition is the dominant two-cycle, twice as common as recurrent excitation.

**Sign structure.** 61% of synaptic weight is excitatory (ACh 60%), 38% inhibitory (GABA 21%,
glutamate 16%, histamine 0.5%). The median neuron gets 44% of its input from inhibitory neurons
(10th–90th percentile 24–69%). Central-complex neurons are the most inhibited class (54%), MBONs
(14%) and Kenyon cells (18%) the least. Neuromodulatory neurons are broadcasters: the median
octopaminergic cell contacts 27 cell types (max 1,462), serotonergic 50, dopaminergic 8.

**Bilateral wiring.** 22% of synaptic weight crosses the midline; 3% in the optic lobe, 27% in the
central brain, 44% in the VNC, 47% for descending and 62% for ascending neurons. Crossing synapses are
more often inhibitory (44%) than ipsilateral ones (38%). The strongest left↔right mutual inhibition
between homologous types is in the central complex: ER4d (10,156 / 10,083 synapses each way), Delta7,
ER2_c, ER5, ER4m, ER3d_b, ER3m — the ring neurons that carry visual and self-motion inputs into the
ellipsoid body compete across hemispheres.

**Dynamics footprint.** Treating the signed weight matrix as a linear operator bounds what the
network's dynamics can do: the largest eigenvalue of the signed synapse-count matrix is the loop gain
the resting state must stabilise, and the spread of the dominant eigenvector says whether the biggest
loop is local or global. The source–sink axis (each neuron's output minus input synapse weight)
separates broadcasters — sensory, modulatory and command cells — from receivers, the motor pools and
output neurons that integrate the whole brain's vote.

<!-- GEN:spectral -->
| metric | value |
|---|---|
| spectral radius (synapse weight) | 3.77e+03 |
| largest 40 eigenvalues with Re(λ)>0 | 32 |
| dominant-eigenvector participation (cells) | 49.9 |

| dominant-mode types | share |
|---|---|
| lLN1_bc | 60.5% |
| lLN2F_b | 4.8% |
| lLN2T_c | 3.6% |
| lLN2X12 | 3.0% |
| DP1m_adPN | 1.6% |
| VP1m_l2PN | 1.6% |
| lLN2X11 | 1.5% |
| lLN1_a | 1.4% |
| lLN2T_e | 1.3% |
| DM1_lPN | 1.1% |
<!-- /GEN:spectral -->

## 2. Motif census at the cell-type level

Condensing neurons into 11,752 types and keeping type→type edges of at least 3 synapses per target
neuron and 20 in total leaves 473,523 edges.

- **Feedforward inhibition is the rule.** Of 277,512 strong excitatory type edges A→B, 80% have a
  parallel path A→I→B through an inhibitory type. The largest central-brain instances are
  EPG→Delta7→(Delta7, PEN), Kenyon cell→APL→Kenyon cell, ExR1→ER5→ER5/EL, EL→ER4d→ER4d and
  ORN_DA1→lLN2F_b→lLN2T_b.
- **Reciprocal type pairs**: 20,816 E↔I, 8,272 E↔E, 6,375 I↔I. Strongest central E↔E: DPM↔KCγ-m,
  KCγ-m↔PPL103, KCα'β' subtypes with each other, EPG↔PEN1/PEN2, KC↔PAM dopamine neurons. Strongest
  central I↔I (winner-take-all candidates): ER2_a↔ER2_c, lLN2F_b↔lLN2P_c, ER3a_a↔ER3m, ER3d subtypes,
  LNO1↔LNO2. Strongest central E↔I (feedback inhibition): APL with every Kenyon-cell subtype
  (79,151 / 79,270 with KCγ-m), EPG↔ExR6, gustatory IN05B002↔LgLG1a/WG4.
- **Disinhibition**: 78,796 I→I type edges. Top central chains: ER2_c→ER2_a→EPG, ER2_a→ER2_c→EPG,
  ER3a_a→ER3m→EPG (ring-neuron chains gating the heading bump), lLN2P_c→lLN2F_b→lLN2T_c in the
  antennal lobe, IN08A002→IN19A002→IN19B003 in the VNC.
- **Feedforward loops.** The other classic three-node motif, A→B→C plus direct A→C. Coherent loops
  (the middle neuron is excitatory, so the indirect path pushes the same way) act as delay lines and
  coincidence detectors; incoherent ones (inhibitory middle) shape pulses and accelerate
  responses — feedforward inhibition in triad form.

<!-- GEN:ffl -->
| feedforward loops | edges in loop | loop instances |
|---|---|---|
| coherent (E middle) | 415,017 | 2,193,304 |
| incoherent (I middle) | 369,037 | 1,362,679 |
<!-- /GEN:ffl -->
- **Normalisation cells**: inhibitory types whose main input population is also their main output
  population, i.e. they read a population's total activity and feed it back. APL (90% in / 94% out
  Kenyon cells), lLN2F_b and lLN2P (olfactory), Delta7 (99% / 100% central complex), ER4d, ER2_c,
  ER4m, ER5, ER3d_b, ER3m, and in the VNC IN01B001/002 (tactile), IN05B002 and IN05B011a (gustatory).
- **Hubs** are the same cells: the two APL neurons (119k and 113k input synapses), CT1 (139k output),
  LPi21, Am1, Li39, DPM, il3LN6. Degree distributions have a heavy tail with exponent about 1.0
  (in) and 1.15 (out) above 100 synapses; median in 260, 99th percentile 6,301.

**Are these counts surprising?** Rewiring the type graph while keeping every type's in- and
out-degree and the sign of each edge's source — so only the pairing of pre- to post-synaptic types
is shuffled — gives the null distribution. Every motif is far above chance: the wiring concentrates
feedback, feedforward and winner-take-all structure far beyond what degree statistics alone predict.
The I→I count is conserved exactly by this null (a control), so it is reported without a z-score.

<!-- GEN:null_model -->
| metric | observed | null mean ± sd | z |
|---|---|---|---|
| FFI share of E edges | 80% | 25% ± 0.0018 | 297 |
| reciprocal E↔E | 8,272 | 526 ± 20.9 | 370 |
| reciprocal I↔I | 6,375 | 282 ± 14.6 | 416 |
| reciprocal E↔I | 21,602 | 1,194 ± 34.8 | 587 |
| edges in coherent FFL | 415,017 | 134,573 ± 705 | 398 |
| edges in incoherent FFL | 369,037 | 112,842 ± 1.51e+03 | 170 |
| I→I edges (control) | 78,796 | 78,796 ± 0 | 0 |

*6 degree- and sign-preserving rewires of the type graph.*
<!-- /GEN:null_model -->

## 3. Circuits

### Antennal lobe: labelled lines with divisive normalisation
- 50 glomeruli, 2,562 ORNs, 267 uniglomerular PNs, 420 local neurons.
- **Labelled lines**: 96.6% of ORN→PN weight stays within one glomerulus. A glomerulus has a median
  35 ORNs and 4 PNs, a 10:1 convergence; each PN receives from a median 38 ORNs, each ORN reaches 4 PNs.
- **Normalisation**: ORNs send more synapses to LNs (537k) than to PNs (414k). LNs are broad — median
  8 input glomeruli and 15 output glomeruli, the top decile spanning more than 42 of 50 — and they
  synapse back onto ORN terminals (169k synapses, 41% of the ORN→PN weight): the presynaptic
  gain control the simulation models as GABA_B. LN→LN weight (626k) exceeds LN→PN (283k). LNs are
  mixed: 115 GABA, 99 glutamate, 137 acetylcholine (the excitatory LNs), 67 unknown.

### Lateral horn: the innate pathway, wired at the same weight as the learnable one
Projection neurons split their output between the mushroom body and the lateral horn, and the split
is even: the innate readout receives as much PN weight as the associative one. The horn has its own
local interneurons — the same normalisation pattern as the antennal lobe — and output cells that pool
a broader set of PN channels than the labelled lines upstream but a narrower one than the mushroom
body's near-random sampling. Learned and innate channels are not isolated: MBONs synapse back onto
the horn, and the horn reaches the descending bottleneck directly.

<!-- GEN:lh -->
| metric | value |
|---|---|
| LH neurons / types | 2,028 / 422 |
| output cells / local cells | 1,574 / 454 |
| PN→LH / PN→KC weight | 1.036 |
| PN types per LH output (median) | 6 |
| top-PN share of input (median) | 25% |
| PNs reaching the LH | 99% |

| LH→descending | synapses |
|---|---|
| DNp32 | 2,322 |
| pIP1 | 2,072 |
| DNp06 | 1,214 |
| DNp42 | 1,112 |
| DNp29 | 1,072 |
| DNp103 | 1,002 |
| DNp43 | 994 |
| DNb05 | 640 |
| DNg40 | 569 |
| DNp62 | 484 |
<!-- /GEN:lh -->

### Mushroom body: random expansion, global feedback, compartmental readout with three-factor gating
- **Expansion**: 4,064 Kenyon cells from 686 PNs (5.9×; 15× against the 267 uniglomerular PNs).
  Each KC samples a median 5 PNs (10th–90th percentile 3–8); 282 PNs reach the calyx, each
  contacting a median 56 KCs. 283 KCs have no PN input at 3 synapses
  (185 γ-d and 87 αβ-p, the subtypes that take visual rather than olfactory input).
- **Near-random sampling**: mean |correlation| between PN types over which KCs they contact is 0.023;
  shuffling the KC targets gives 0.013. A small structured excess, most of it random.
- **Sparsening**: every KC drives APL and every KC is inhibited by APL (KC→APL 210k, APL→KC 196k
  synapses, 100% coverage both ways), the global inhibitory feedback of a sparse code. KC→KC axonal
  synapses (491k) exceed PN→KC (389k).
- **Readout**: 97 MBONs, a median 313 KCs each (max 1,680); each KC reaches a median 11 MBONs.
  KC→MBON 439k synapses.
- **Three-factor rule**: dopamine neurons synapse on KC axons (89k) more than on MBONs (38k); 70% of
  DAN→MBON weight is within a matching compartment. MBON→DAN (9k) and MBON→MBON (25k) close the loop
  that lets the output of one compartment set the teaching signal of another.

### MBON convergence: where the compartments' votes recombine
The compartmental readout is not the end of the pathway — MBON outputs of different compartments and
opposite valence signs converge on shared downstream targets, and a direct channel reaches the
descending bottleneck. Same-sign MBONs share more of their target repertoire than opposite-sign
pairs, so the valence channels stay separable where they meet.

<!-- GEN:mbc -->
| metric | value |
|---|---|
| MBON cells / types | 97 / 37 |
| transmitters | 26 glutamate, 50 acetylcholine, 21 gaba |
| targets fed by ≥2 MBON types | 20 |
| same-sign / cross-sign target cosine | 0.026 / 0.02 |
| MBON→DN synapses | 4,073 |

| convergent target | MBON types | synapses |
|---|---|---|
|  | 13 | 2,400 |
| LHCENT3 | 10 | 1,977 |
| CRE011 | 8 | 4,403 |
| LHPV4m1 | 7 | 1,137 |
| MBON11 | 7 | 1,244 |
| LHCENT4 | 7 | 1,577 |
| MBON26 | 7 | 2,930 |
| SIP087 | 7 | 1,767 |
| CRE001 | 7 | 1,124 |
| LHPV5e1 | 6 | 1,316 |
| MBON20 | 6 | 1,294 |
| MBON24 | 6 | 603 |
<!-- /GEN:mbc -->

### Central complex: a ring attractor with a shifter, and vector shifts in the fan-shaped body
Protocerebral-bridge glomeruli from the instance names give each EPG, PEN, PEG and Delta7 neuron a
column; the heading ring has period 8 per side. Results are mean synapses between column groups.

- **Cosine inhibition kernel.** Two-hop EPG→Delta7→EPG weight against column offset (mod 8):

<!-- GEN:d7_kernel -->
| offset | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| synapses | 115 | 184 | 830 | 1.51e+03 | 1.77e+03 | 1.56e+03 | 828 | 190 |
<!-- /GEN:d7_kernel -->

  Minimum at the bump, maximum opposite it: the 1 − cos Δθ inhibition of a ring attractor. Each
  Delta7 reads a median 32 EPGs and writes onto 8, and Delta7 are 99% central-complex in and out.
  The same profile holds across hemispheres, with left glomerulus L_k paired equally with R_(9−k)
  and R_(10−k) (the two bridge halves are in half-glomerulus register) and L1 with R1 at the wrap.
- **Local recurrent excitation.** EPGs of one column synapse onto each other (33 synapses per pair
  at offset 0, 3 at offset ±1) and reciprocally with PEG (EPG→PEG 93 per pair at offset 0).
- **Shifter.** EPG→PEN goes to column +1 and PEN→EPG returns to −1 and −2 on the same side. Split by
  the PEN's hemisphere the two-hop EPG→PEN→EPG loop is asymmetric: through left PENs, weight to −1
  exceeds +1 by 1.7:1 on the left; through right PENs by 1.3:1 on the right. Resolving the shift
  combinatorially — each PEN's EPG targets weighted on the ring — gives a clean bimodal picture:
  left-hemisphere PENs write ~+1.5 columns ahead, right-hemisphere PENs ~−1.5 the other way
  (PEN1 and PEN2 alike). The pooled median is near zero only because the two hemispheres cancel.
  Because the two halves are mirror-mapped, left and right PEN populations push the bump opposite
  ways — angular-velocity integration.

<!-- GEN:pen_shift -->
| population | p10 | median | p90 |
|---|---|---|---|
| PEN (both types), left | +1.42 | +1.47 | +1.55 |
| PEN, right | -1.55 | -1.45 | -1.37 |
| PEN1 only, left | — | +1.50 | — |
| PEN1, right | — | -1.49 | — |
| PEN2 only, left | — | +1.45 | — |
| PEN2, right | — | -1.42 | — |

Delta7 kernel cosine fit: mean 873.0, amplitude 889.7, R² 0.99, contrast 0.878.
<!-- /GEN:pen_shift -->
- **Ring-neuron competition.** Inputs to the ring (ER types) show the strongest mutual inhibition
  in the brain, both between hemispheres (section 1) and between subtypes (ER2_a↔ER2_c 5.8k/6.1k),
  and disinhibitory chains onto EPG. Inputs compete before they reach the attractor.
- **Fan-shaped body vector shifts.** Between column-tagged FB cells, 201k synapses are in type pairs
  whose peak offset is the same column, 146k in pairs peaking 3 or more columns away. hDelta outputs
  peak 4–5 columns away (half of 8–9 columns, a 180° shift) onto PFL3, PFR, vDelta, FC2B, FC2C and
  PFGs, while vDelta→vDelta stays in column (53% of weight at offset 0). PFNd→hDelta peaks at −3.
- **Steering readout.** PFL3 and PFL2 project to descending neurons DNa03 (2,039 synapses), DNb01
  (753), DNa02 (736), DNpe016, DNae002.

### Optic lobe: shared convolution kernels, ON/OFF split, a direction filter bank, wide-field pooling
- 47 cell types have 600 or more copies (one per column and eye). For the strongest columnar
  type pairs, 99–100% of source neurons are connected, with a fixed number of partners and a
  coefficient of variation of total weight of 0.2–0.36: a shared kernel applied at every column.
  One-to-one kernels: L1→Mi1, L1→L5, L2→Tm1, L2→Tm2, L2→T1, C3→L2, C3→T1. Five-to-six-column kernels:
  L1→Tm3, Mi1→Tm3, L5→Tm3, Mi1→T4a–d, L2→Tm4.
- **ON/OFF split** at the lamina output (synapses): L1 → Mi1 142k, Tm3 147k, and nothing onto the OFF
  cells; L2 → Tm1 205k, Tm2 220k, Tm4 160k, T1 158k, and nothing onto Mi1/Tm3; L3 → Mi9 92k, Tm9 48k,
  Mi1 35k; L5 → Tm3 98k, Mi1 72k, Mi4 68k.
- **Direction-selective filter bank.** The four T4 subtypes have the same input composition (Mi1
  ~32%, Tm3 13%, Mi9 10–12%, CT1 6–7%, Mi4 5–6%; cosine similarity of the full input vectors
  0.93–0.95), so they are four copies of one kernel that differ only in spatial offset. T5a–d likewise
  (Tm9, Tm2, Tm1, CT1, Tm4). CT1, the top output hub, gives feedforward inhibition to every T5 subtype.
- **Pooling.** Wide-field lobula-plate cells sum one subtype each: HSE, HSN, HSS receive from about
  400–540 T4a and T5a and no other subtype; H2 from 760 T4b/T5b; VS from 225 T4d/T5d with some a and
  b. Thousands of local detectors to one integrator.

### Optic glomeruli: the visual feature menu
Visual projection neurons carry the optic lobe's computed features to the glomeruli of the central
brain. Each channel is focused on a small set of target classes and the channels are largely
non-redundant (low pairwise target-profile similarity), but downstream they recombine on shared
targets — the feature detectors hand off to integrators, including the compass ring neurons,
descending neurons and the lateral horn.

<!-- GEN:og -->
| metric | value |
|---|---|
| VPN neurons / types | 9,203 / 346 |
| top-target share (median) | 11% |
| target types at ≥5% (median) | 4 |
| channel cosine p50 / p90 | 0.002 / 0.05 |
| VPN→DN / →ring / →LH synapses | 275,710 / 1,250 / 23,508 |

| convergent target | VPN types | synapses |
|---|---|---|
|  | 232 | 59,305 |
| Li14 | 103 | 22,508 |
| LC33 | 100 | 11,960 |
| LPLC4 | 100 | 35,098 |
| Li39 | 99 | 14,179 |
| TmY17 | 90 | 22,396 |
| LT51 | 90 | 24,171 |
| LT52 | 88 | 39,029 |
| Tm37 | 81 | 10,034 |
| LC10a | 80 | 69,367 |
| TmY5a | 79 | 4,976 |
| LoVCLo3 | 79 | 3,937 |
<!-- /GEN:og -->

### Escape: a three-synapse funnel
Giant fibre input is 36k synapses. LC4 (126 neurons, 55–71 converging on each GF) provides 17.6%,
LPLC2 (182 neurons, about 90 per GF) 13.4%; the rest is spread over hundreds of types. Photoreceptor
to GF is 3 hops at 5 or more synapses. GF outputs go to GFC2–4, TTMn, DNp11 and PSI.

### Descending funnel
1,314 descending neurons receive only 3.7% of all brain output synapses. The median DN gets 1,722
synapses from 87 types (10th–90th percentile 335–7,883 synapses, 26–253 types). DNs talk to each
other (31,993 connections, 6,801 reciprocal). Only 6% of DN output goes directly to motor neurons;
half goes to VNC interneurons. Ascending neurons return 527k synapses onto DNs against 381k DN→AN,
a brain–cord loop as heavy as the descending command itself. Largest DNs by input: DNp103, DNa02,
DNp06, DNg16, DNp01 (GF), pIP1, DNg100.

### Motor pools
708 motor neurons. Median premotor input is 143 neurons and 2,464 synapses, 44% inhibitory; 88% from
VNC interneurons, 9% from descending neurons, 2% from sensory. Motor neurons of one type and side
share premotor partners (median Jaccard 0.03 against 0.002 for random pairs, 15×): pools. 43% of VNC
weight crosses the midline and 53% of that is inhibitory; the strongest reciprocal inhibitory
type pairs (IN16B049↔INXXX217, IN13A001↔IN19A001, IN08A002↔IN19A011, IN01B003↔IN13B021) are
half-centre candidates.

### State: clock, sleep and modulator cells woven through the fast circuits
A small set of identified cells carries brain state — circadian clock neurons (DN1a, DN1p, s-LNv,
LNd, LPN), sleep-need integrators (hDeltaC, ExR1/2, ER5), octopamine and serotonin broadcasters and
peptidergic populations. They are few, but their wiring is dense where it matters: a heavy two-way
loop with the compass (state→CX and CX→state are the two largest flows), a direct channel onto the
descending command neurons, onto the mushroom-body readout, and a strongly connected internal web.
State is not a layer on top of the network; it is threaded through it.

<!-- GEN:state -->
| link | synapses |
|---|---|
| CX→state | 111,308 |
| state→CX | 101,159 |
| state→state | 37,036 |
| state→DN | 8,686 |
| state→MBON | 3,392 |

| group | cells | example types |
|---|---|---|
| clock | 40 | DN1a, DN1pA, DN1pB, LNd_b, LNd_c, LPN_a, LPN_b, s-LNv |
| sleep | 49 | ER5, ExR1, ExR2, hDeltaC |
| octopamine | 37 | OA-AL2i1, OA-AL2i2, OA-AL2i3, OA-AL2i4, OA-ASM1, OA-ASM2, OA-ASM3, OA-VPM3 |
| serotonin | 8 | 5-HTPLP01, 5-HTPMPD01, 5-HTPMPV01, 5-HTPMPV03 |
| peptide | 53 | AstA1, CAPA, CAPA_a, CAPA_b, CRZ01, CRZ02, DH44, DSKMP3 |
<!-- /GEN:state -->

## 4. Structure vs dynamics
The claims above are about wiring. `scripts/validate_dynamics.mjs` asks whether the same structure
does the computation in the calibrated LIF model (`src/lif.js`, the same graph and sign conventions
as the browser simulation):

- **Delta7 kernel.** Firing each Delta7 cell and reading the inhibitory conductance it writes onto
  the EPG ring reproduces the structural kernel: minimum at the cell's preferred bump wedge, maximum
  on the opposite side.
- **PEN shifter.** Driving one column's PENs depolarises the EPG wedges about +1.5 columns ahead for
  left-hemisphere PENs and −1.5 for right — the mirror-symmetric push that integrates angular
  velocity. A freely rotating bump is *not* reproduced: the calibrated LIF does not sustain EPG
  recurrence without external drive, so rotation shows up as the push field rather than as drift of
  a persistent bump.
- **APL sparsening.** With the same PN drive, silencing APL (raising its threshold so it cannot
  spike) increases the fraction of active Kenyon cells — the global feedback that keeps the expanded
  code sparse.

<!-- GEN:validation -->
| probe | measured |
|---|---|
| Delta7 kernel (aligned gI profile) | min near bump: True, max at wedge 4, cosine R² 0.58 |
| PEN push field (median offset, columns) | L 1.49, R -1.46 — opposite signs: True |
| APL sparsening | active KCs 0.16 → 0.31 without APL; 0.89 → 1.96 Hz/cell |
| verdict | bump_kernel: ✓, pen_shifter: ✓, apl_sparsening: ✓ |
<!-- /GEN:validation -->

## 5. Summary of the algorithms the wiring supports

| Structure | Where | Evidence |
|---|---|---|
| Labelled lines + divisive normalisation | antennal lobe | 97% within-glomerulus, broad LNs, LN→ORN presynaptic inhibition |
| Random expansion + global feedback sparsening | mushroom body | 5.9× expansion, 5 claws, near-random sampling, APL 100% coverage |
| Compartmental readout with three-factor plasticity | mushroom body | 97 MBONs × 313 KCs, DAN→KC ≫ DAN→MBON, 70% compartment match |
| Ring attractor with cosine inhibition | ellipsoid body / bridge | Delta7 profile 115 → 1771 → 190 over half a turn |
| Angular-velocity integrator (shifter) | PEN | opposite-direction bias through left and right PENs |
| Vector arithmetic by half-ring shift | fan-shaped body | hDelta outputs 4–5 columns away |
| Shared convolution kernels | optic lobe | 47 columnar types, fixed partner counts, CV 0.2–0.36 |
| Parallel ON/OFF channels | lamina → medulla | L1/L2 output matrices block-diagonal |
| Direction filter bank + wide-field pooling | T4/T5 → LPTC | four identical kernels; HS pools only subtype a |
| Feedforward inhibition everywhere | whole CNS | 80% of strong E edges have a parallel I path |
| Winner-take-all inputs | ring neurons, AL LNs | strongest I↔I pairs, cross-hemisphere mutual inhibition |
| Sensorimotor bottleneck with loops | descending neurons | 1,314 DNs, 3.7% of brain output, AN→DN ≈ DN→AN |
| Motor pools with commissural inhibition | VNC | 15× shared premotor input, 53% inhibitory crossing |

## 6. Caveats
- Signs come from predicted transmitters; 3,602 neurons are graded rather than binary.
- Connections under 3 synapses are absent from the graph; the motif census uses 3 per target neuron.
- Central-complex offsets are at glomerulus resolution (45°). The PEN shift is one wedge (22.5°), so it
  appears as an asymmetry in the ±1 bins rather than a clean peak.
- The fan-shaped body column tag `C<n>` is taken from the instance name as given; columns are not a
  closed ring, so offsets are reported unfolded.
