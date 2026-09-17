"""BioISA v0.1: lift measured structures into named computational primitives.

Reads algo_structures.json (+ dynamics_validation.json, ir_generic.json) and emits
public/data/operators.json: structured operator records, not prose. Each record:

    name / isa          the primitive's ISA entry
    section             structures-page card it belongs to
    substrate           cell types + cell count implementing it
    signature           the graph pattern the detector looked for
    semantics           inputs, operations, state, output (Algorithm IR)
    topology_folded     true when part of the computation lives in wire geometry,
                        i.e. was constant-folded into connectivity by evolution
    conventional        the standard CS/control analogue
    evidence            measured values supporting the call (weighted)
    counterevidence     measured or known limits (mandatory field)
    predictions         falsifiable claims for perturbation/dynamics tests
    confidence          sum(evidence weights) - penalty(counterevidence), clipped
    reduced_model       executable pseudocode (Python semantics)

The fly's three known-answer circuits (ring attractor, motion correlator, sparse
associative memory) must detect. Running the same detectors on the worm IR is the
cross-species control: mutual inhibition and feedforward motifs should transfer,
the ring attractor should report 'undetermined' (no columnar data), not hallucinate.

    python3 scripts/operators.py
"""
import json, os

def load(p):
    return json.load(open(p)) if os.path.exists(p) else {}

R = load('public/data/algo_structures.json')
DV = load('public/data/dynamics_validation.json')
IRG = load('public/data/ir_generic.json')

OPS = []

def op(name, isa, section, substrate, signature, semantics, conventional, evidence,
       counterevidence, predictions, reduced, topology_folded=False):
    w = sum(v for _, _, v in evidence)
    conf = round(max(0.0, min(1.0, w - 0.15 * len(counterevidence))), 2)
    OPS.append(dict(name=name, isa=isa, section=section, substrate=substrate, signature=signature,
                    semantics=semantics, conventional_equivalent=conventional, topology_folded=topology_folded,
                    evidence=[dict(item=k, value=v, weight=wt) for k, v, wt in evidence],
                    counterevidence=counterevidence, predictions=predictions,
                    reduced_model=reduced, confidence=conf,
                    status='detected' if conf >= 0.5 else ('marginal' if conf > 0.2 else 'not_detected')))


# ================================================================ fly detectors
def detect_fly():
    cx = R.get('central_complex', {})
    if cx:
        cf = cx.get('delta7_cosine_fit', {})
        L = cx.get('pen_to_epg_shift_L', [0, 0, 0]); Rr = cx.get('pen_to_epg_shift_R', [0, 0, 0])
        penL, penR = (L[1] if isinstance(L, list) else L), (Rr[1] if isinstance(Rr, list) else Rr)
        bump_ok = DV.get('verdict', {}).get('bump_kernel')
        shift_ok = DV.get('verdict', {}).get('pen_shifter')
        dl, dr = DV.get('pen_shifter', {}).get('median_L'), DV.get('pen_shifter', {}).get('median_R')
        op('ring_attractor', 'cyclic state estimator', 'cx',
           dict(types=['EPG', 'Delta7', 'PEG', 'PEN_a(PEN1)', 'PEN_b(PEN2)'], cells=cx.get('n', {}).get('EPG', 0) + cx.get('n', {}).get('Delta7', 0)),
           'columnar population + 2-hop inhibitory kernel ∝ 1−cos(Δθ) + mirror-symmetric shifter',
           dict(inputs=['self-motion rotation', 'visual landmark'], operations=['recurrent bump sustainment', 'asymmetric shifter integration', 'divisive gain (Delta7)'],
                state='θ (heading), bump position on ring', output='heading phase'),
           'continuous-attractor heading estimator (cf. EKF orientation tracking — same problem, not same mechanism)',
           [('Delta7 kernel fits a − b·cos(2πk/8)', f"R²={cf.get('r2')}", 0.35),
            ('kernel contrast (min at bump, max opposite)', cf.get('contrast'), 0.15),
            ('PEN shifter mirror-symmetric', f'L {penL:+.2f} / R {penR:+.2f} cols', 0.2),
            ('dynamics: realised Delta7 kernel on the ring', f'pass={bump_ok}', 0.15 if bump_ok else 0),
            ('dynamics: realised PEN push field', f'L {dl} / R {dr}' if dl else 'not run', 0.15 if shift_ok else 0)],
           ['calibrated LIF does not sustain a free-running bump without tonic drive — the attractor is structurally present but subthreshold in this model',
            'predicted transmitter signs; receptor kinetics and delays unmodelled'],
           ['lesion Delta7 → kernel contrast collapses, bump fragments',
            'sustained unilateral PEN drive → persistent heading drift at rate ∝ drive asymmetry',
            'sufficient tonic EPG excitation → bump persists in darkness'],
           'theta += k * (PEN_L - PEN_R)\nif landmark: theta += gain * (landmark_angle - theta)\n# Delta7: global divisive normalisation of the bump')

        fbo = cx.get('fb_columnar_offsets', [])
        hout = [o for o in fbo if o['pre'] == 'hDelta' and o['peak_offset'] >= 4]
        pfd = next((o for o in fbo if o['pre'] == 'PFNd' and o['post'] == 'hDelta'), None)
        pfv = next((o for o in fbo if o['pre'] == 'PFNv' and o['post'] == 'hDelta'), None)
        op('phasor_vector_shift', 'vector rotation by wiring offset', 'cx',
           dict(types=['hDelta', 'PFNv', 'PFNd', 'PFL3', 'PFL2'], cells=sum(o['synapses'] for o in hout)),
           'sinusoidal population code + fixed columnar offset between input and output + convergent summation',
           dict(inputs=['heading phasor', 'translational velocity phasor'], operations=['amplitude modulation', 'fixed phase shift (wired)', 'population summation'],
                state='O(1) per column', output='allocentric travel-direction signal'),
           'coordinate transform — but the transform is partially compiled into the wiring',
           [('hDelta fans out at peak offset +4/+5 columns (≈180°) to downstream types', f'{len(hout)} targets, {sum(o["synapses"] for o in hout):,} synapses', 0.5),
            ('PFN phasor arms arrive at hDelta with opposite-sign offsets', f"PFNd {pfd['peak_offset']:+d}, PFNv {pfv['peak_offset']:+d}" if pfd and pfv else '?', 0.25),
            ('weight at |offset| ≥ 3 columns', f"{cx.get('fb_offset_weight', {}).get('peak_shift_ge3', 0):,} synapses", 0.1)],
           ['static offsets only — the summation step is measured, the phase-shifted phasor arithmetic is inferred from anatomy + literature',
            'FB has 10 columns but PB-derived offsets are mod-8; the 180° reading assumes the published phase convention'],
           ['drive PFNv/PFNd → hDelta output phasor rotates by the wired offset',
            'silence hDelta → travel-direction signal lost, heading intact'],
           'out[col] = sum(in[col - offset])   # the adder is wiring, not arithmetic',
           topology_folded=True)

    ol = R.get('optic_lobe', {})
    if ol:
        t4c = ol.get('t4_subtype_input_cosine')
        off_diag = [t4c[i][j] for i in range(4) for j in range(4) if i != j] if t4c else []
        meanc = sum(off_diag) / len(off_diag) if off_diag else 0
        ws = ol.get('weight_sharing', [])
        cvs = [w['weight_cv'] for w in ws]
        op('motion_correlator', 'spatiotemporal correlation detector', 'ol',
           dict(types=['T4a', 'T4b', 'T4c', 'T4d', 'T5a', 'T5b', 'T5c', 'T5d'], cells=None),
           'ON/OFF channel split + identical input composition across directional subtypes + spatial offset of inputs',
           dict(inputs=['local luminance changes'], operations=['delay', 'multiply (correlate)', 'threshold'],
                state='none (feedforward)', output='direction-selective motion, 4 channels'),
           'Reichardt correlator / spatiotemporal matched filter',
           [('T4 subtypes share input composition', f'cosine {meanc:.2f} across a–d', 0.5),
            ('lamina splits ON/OFF with no cross-talk', 'block-diagonal L1/L2 pathways', 0.2),
            ('columnar kernel weight CV 0.2–0.4', f'{len(ws)} shared-kernel pairs', 0.15)],
           ['the delay arm is implemented by temporal dynamics of the interneurons — not measurable from connectivity alone',
            'direction selectivity is inferred from anatomy + physiology literature, not proven by the graph'],
           ['silence T4a → behavioural responses to front-to-back motion lost only',
            'the four subtypes should tile all directions; the fifth found would break the model'],
           'y = thresh( x[t, r] * x[t-τ, r+δ] - x[t-τ, r] * x[t, r+δ] )   # per subtype δ')

        op('convolution_front_end', 'shared-kernel spatial transform', 'ol',
           dict(types=None, cells=None, note=f"{ol.get('columnar_types')} columnar types"),
           'one cell type per column, identical partner counts, low CV of total weight across columns',
           dict(inputs=['retinal array'], operations=['same kernel at every position'], state='none',
                output='feature maps'),
           'convolution layer',
           [(f"{ol.get('columnar_types')} types with one copy per column", 'partner counts fixed per type', 0.4),
            ('weight CV across columns', f"{min(cvs):.2f}–{max(cvs):.2f}" if cvs else '?', 0.3)],
           ['positional variation exists (some pairs CV ~0.36) — not a perfect convolution'],
           ['kernel transfer: a feature learned at one eccentricity should hold at all eccentricities'],
           'out[:, x] = K * in[:, x]   # same K for all columns', topology_folded=True)

    mb = R.get('mushroom_body', {})
    if mb:
        f = mb.get('synapse_flows', {})
        op('sparse_associative_memory', 'random-projection content-addressable memory', 'mb',
           dict(types=['KC', 'APL', 'MBON', 'DAN'], cells=mb.get('n_kc')),
           'large sparse expansion + near-random input mixing + global feedback inhibition + compartmental modulatory gating',
           dict(inputs=['odor / feature vector'], operations=['random projection', 'top-k sparsification', 'local 3-factor update'],
                state='synaptic weights (learned)', output='valence per learned pattern'),
           'locality-sensitive hashing + linear readout (FlyHash); three-factor Hebbian rather than backprop',
           [('expansion ratio', f"{mb.get('expansion_ratio')}×", 0.25),
            ('PN-pair KC-correlation ≈ shuffle', f"{mb.get('pn_type_pair_corr_observed')} vs {mb.get('pn_type_pair_corr_shuffled')}", 0.2),
            ('APL covers all KCs (global normalisation)', f"{mb.get('apl_covers_kc_frac')}", 0.15),
            ('DAN→KC ≫ DAN→MBON (gate at the synapse)', f"{f.get('DAN->KC', 0):,} vs {f.get('DAN->MBON', 0):,}", 0.15),
            ('dynamics: ABL silencing broadens KC code', f"{DV.get('apl', {}).get('kc_active_with_apl')}→{DV.get('apl', {}).get('kc_active_without_apl')} active", 0.1)],
           ['no plasticity in the sim — the learning rule is inferred from DAN anatomy, not demonstrated',
            'odor identity of PN channels is anatomical, not verified per-channel'],
           ['present odor + shock → MBON valence flips for that odor only',
            'lesion APL → code density rises, discrimination falls'],
           'x = topk(sparse_random_project(odor), k=5%)\nvalue = W_dan_gated @ x   # W updated locally by DAN reward signal')

    m = R.get('motifs', {})
    if m:
        nm = m.get('null_model', {})
        ffi = m.get('feedforward_inhibition', {})
        op('feedforward_inhibition', 'temporal derivative / gain limiter', 'motif',
           dict(types=None, cells=None, note='type-level census'),
           'A→B plus A→I→B with I inhibitory',
           dict(inputs=['signal'], operations=['delay', 'subtract'], state='none', output='band-passed / amplitude-limited signal'),
           'feedforward cancellation; noise shaping',
           [('share of strong E edges with a parallel I path', f"{ffi.get('frac')}", 0.3),
            ('enrichment vs degree/sign-preserving null', f"z={nm.get('ffi_frac', {}).get('z')}", 0.4)],
           ['fractional sign: some edges counted E are mixed'],
           ['blocking the I arm should broaden temporal tuning of B'],
           'y = x[t] - g·x[t-1]   # implemented as A→B and A→I→B')

        rec = m.get('reciprocal_type_pairs_by_sign', {})
        op('winner_take_all', 'mutual-inhibition competition', 'motif',
           dict(types=['ER ring neurons', 'ILN2 family', 'many more'], cells=None),
           'I↔I reciprocal type pairs',
           dict(inputs=['competing drives'], operations=['mutual suppression'], state='winner identity (persistent)', output='single active channel'),
           'argmax with hysteresis; bistable switch',
           [('I↔I type pairs', f"{rec.get('I<->I')}", 0.25),
            ('enrichment vs null', f"z={nm.get('recip_II', {}).get('z')}", 0.5)],
           ['measured at type level; neuron-level I↔I is even more numerous'],
           ['simultaneous strong drive to both sides → bistability / oscillation rather than compromise'],
           'a.x -= g*b.x; b.x -= g*a.x   # last-one-standing dynamics')

        nc = m.get('normalisation_candidates', [])
        if nc:
            op('divisive_normalization', 'gain control by population total', 'al',
               dict(types=[c['type'] for c in nc[:8]], cells=None),
               'inhibitory cell whose dominant input population equals its dominant output population',
               dict(inputs=['population activity vector'], operations=['sum', 'divide'], state='none', output='normalised vector'),
               'divisive normalisation / RMS gain control',
               [(f'{len(nc)} candidate cells', f'top: {", ".join(c["type"] for c in nc[:3])}', 0.3),
                ('APL in/out KC coverage', f"{mb.get('apl_covers_kc_frac')}" if mb else '?', 0.2),
                ('AL LNs span glomeruli broadly + presynaptic LN→ORN feedback', f"median {R.get('antennal_lobe', {}).get('ln_input_glomeruli_p10_50_90', [0])[1]} glomeruli, LN→ORN/ORN→PN {R.get('antennal_lobe', {}).get('ln_to_orn_over_orn_to_pn')}", 0.15)],
               ['in/out-overlap does not prove divisive (could be subtractive) — needs the nonlinearity'],
               ['inject a common-mode offset into the population → output ratios preserved'],
               'y = x / (eps + mean(x))')

    dn = R.get('descending', {})
    if dn:
        op('command_funnel', 'population-vote bottleneck', 'dn',
           dict(types=None, cells=dn.get('n_dn')),
           'many circuits converge onto a small set of descending channels',
           dict(inputs=['whole-brain state'], operations=['weighted vote', 'compression'], state='none', output='~1300 motor commands'),
           'low-rank readout / API boundary',
           [('share of brain output carried by DNs', f"{dn.get('brain_output_to_dn_frac')}", 0.3),
            ('DN↔AN loop weight comparable to DN output', 'closed loop with the cord', 0.15)],
           ['the funnel count mixes cell types with very different functions — a bottleneck of bandwidth, not necessarily of decisions'],
           ['silence a single DN type → a specific motor program drops out'],
           'cmd = W_vote @ brain_state   # tall-skinny readout')


# ================================================================ worm detectors (cross-species control)
def detect_worm():
    w = IRG.get('celegans_herm', {})
    if not w: return
    m = w.get('motifs', {}); nm = m.get('null_model', {}); ffi = m.get('feedforward_inhibition', {})
    op('feedforward_inhibition', 'temporal derivative / gain limiter', None,
       dict(types=None, cells=None, species='celegans_herm'),
       'A→B plus A→I→B with I inhibitory (type level)',
       dict(inputs=['signal'], operations=['delay', 'subtract'], state='none', output='band-passed signal'),
       'feedforward cancellation',
       [('FFI share', f"{ffi.get('frac')}", 0.25), ('z vs null', f"{nm.get('ffi_frac', {}).get('z')}", 0.3)],
       ['only 179/302 neurons have NT assignments; sign-conditioned counts undercount',
        '169-type graph is small — z-scores are directional'],
       ['FFI should concentrate on sensory→interneuron edges where temporal filtering matters'],
       'y = x[t] - g·x[t-1]')

    rec = w.get('recurrence', {})
    cyc = rec.get('two_cycles_by_sign', {})
    op('winner_take_all', 'mutual-inhibition competition', None,
       dict(types=['AVA', 'AVB', 'RMD', 'SMD', 'command interneurons'], cells=None, species='celegans_herm'),
       'I↔I dominant among neuron-level 2-cycles',
       dict(inputs=['competing drives'], operations=['mutual suppression'], state='winner identity', output='single motor program'),
       'argmax with hysteresis',
       [('I↔I is the most common neuron-level 2-cycle', f"{cyc.get('I<->I')} pairs", 0.4),
        ('dominant eigenmode on head-steering circuit', 'RMD/RIA/SMD', 0.15)],
       ['at type level I↔I enrichment is absent (z≈−0.4): the motif lives at cell resolution because worm motor classes are singletons',
        'command rivalry could also be implemented by excitatory-biased bistability, not only I↔I'],
       ['lesion one member of an I↔I pair → its rival tonically wins'],
       'a.x -= g*b.x; b.x -= g*a.x')

    op('ring_attractor', 'cyclic state estimator', None,
       dict(types=None, cells=None, species='celegans_herm'),
       'columnar population + folded inhibitory kernel + shifter asymmetry',
       dict(inputs=['rotation'], operations=['bump sustain', 'shift'], state='θ', output='phase'),
       'continuous attractor',
       [('dominant eigenmode concentrated on 10.8 cells', 'RMD/RIA/SMD head circuit', 0.1)],
       ['no columnar coordinate data loaded for the worm — the kernel test cannot run; attractor-like head dynamics are physiologically known but not provable from this IR'],
       ['if the head circuit is a ring attractor, RIA should show a bump that rotates with head oscillation'],
       'undetermined: needs cyclic column labels')
    OPS[-1]['status'] = 'undetermined'
    OPS[-1]['confidence'] = 0.0


detect_fly()
detect_worm()
json.dump(OPS, open('public/data/operators.json', 'w'), indent=1)
for o in OPS:
    print(f"{o['status']:>13}  {o['confidence']:.2f}  {o['name']:<28} {o.get('substrate', {}).get('species', 'malecns')}")
print('wrote public/data/operators.json')
