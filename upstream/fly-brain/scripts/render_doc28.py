#!/usr/bin/env python3
"""Regenerate the measured tables of docs/28-algorithmic-structures.md from
public/data/algo_structures.json. Blocks between <!-- GEN:key --> and
<!-- /GEN:key --> markers are rewritten; everything else is preserved prose.
Run after algo_structures.py:  python3 scripts/render_doc28.py
"""
import json, re, sys

R = json.load(open('public/data/algo_structures.json'))
DOC = 'docs/28-algorithmic-structures.md'

def fmt(v):
    return f'{v:,.0f}' if isinstance(v, (int, float)) and v == int(v) else f'{v:.3g}' if isinstance(v, float) else str(v)

def pct(v): return f'{round(v * 100)}%'
def tbl(header, rows):
    out = ['| ' + ' | '.join(header) + ' |', '|' + '---|' * len(header)]
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out)

G = {}
f = R.get('flow', {})
if f:
    hops = {}
    for k, v in f.get('hops_from_sensory', {}).items():
        k = int(k)
        key = '∞' if k < 0 else ('5+' if k >= 5 else str(k))
        hops[key] = hops.get(key, 0) + v
    order = sorted(hops, key=lambda k: 999 if k == '∞' else int(k.rstrip('+')))
    G['flow_hops'] = tbl(['hops from sensory'] + order, [['neurons'] + [f'{hops[k]:,}' for k in order]])
    G['flow_superclass_depth'] = tbl(['superclass', 'harmonic depth', 'neurons'],
        [[k.replace('_', ' '), f'{v[0]:.2f}', f'{v[1]:,}'] for k, v in sorted(f.get('median_depth_by_superclass', {}).items(), key=lambda kv: kv[1][0])])
r = R.get('recurrence', {})
if r:
    G['recip_pairs'] = tbl(['E↔I', 'E↔E', 'I↔I'], [[f'{v:,}' for v in (r.get('two_cycles_by_sign', {}).get(k, 0) for k in ('E<->I', 'E<->E', 'I<->I'))]])
m = R.get('motifs', {})
if m:
    G['motif_counts'] = tbl(['motif', 'count'],
        [['strong type edges', f"{m.get('strong_type_edges', 0):,}"],
         ['E edges with parallel FFI path', f"{m['feedforward_inhibition'].get('E_type_edges', 0):,} ({pct(m['feedforward_inhibition'].get('frac', 0))})"],
         ['reciprocal E↔E / I↔I / E↔I pairs', ' / '.join(f"{m['reciprocal_type_pairs_by_sign'].get(k, 0):,}" for k in ('E<->E', 'I<->I', 'E<->I'))],
         ['I→I (disinhibitory) edges', f"{m['disinhibition'].get('I_to_I_type_edges', 0):,}"]])
    if 'feedforward_loops' in m:
        ffl = m['feedforward_loops']
        G['ffl'] = tbl(['feedforward loops', 'edges in loop', 'loop instances'],
            [[f'coherent (E middle)', f"{ffl['coherent_edges']:,}", f"{ffl['by_middle']['E_E']['instances'] + ffl['by_middle']['I_E']['instances']:,}"],
             [f'incoherent (I middle)', f"{ffl['incoherent_edges']:,}", f"{ffl['by_middle']['E_I']['instances'] + ffl['by_middle']['I_I']['instances']:,}"]])
    if 'null_model' in m:
        nm = m['null_model']
        def zrow(label, k, ispct=False):
            z = nm[k]; ob = pct(z['obs']) if ispct else f"{z['obs']:,.0f}"
            me = pct(z['null_mean']) if ispct else f"{z['null_mean']:,.0f}"
            return [label, ob, f"{me} ± {z['null_std']:.3g}", '∞' if z['z'] == float('inf') else f"{z['z']:.0f}"]
        G['null_model'] = tbl(['metric', 'observed', 'null mean ± sd', 'z'],
            [zrow('FFI share of E edges', 'ffi_frac', True), zrow('reciprocal E↔E', 'recip_EE'), zrow('reciprocal I↔I', 'recip_II'),
             zrow('reciprocal E↔I', 'recip_EI'), zrow('edges in coherent FFL', 'ffl_coh_edges'), zrow('edges in incoherent FFL', 'ffl_incoh_edges'),
             zrow('I→I edges (control)', 'dis_II_control')]) + f"\n\n*{nm.get('n_nulls', '?')} degree- and sign-preserving rewires of the type graph.*"
sp = R.get('spectral', {})
if sp:
    G['spectral'] = tbl(['metric', 'value'],
        [['spectral radius (synapse weight)', fmt(sp.get('spectral_radius_power_iter'))],
         ['largest 40 eigenvalues with Re(λ)>0', sp.get('n_eigs_positive_real_of40')],
         ['dominant-eigenvector participation (cells)', fmt(sp.get('dominant_eigvec_participation'))]]) + \
        '\n\n' + tbl(['dominant-mode types', 'share'], [[t, f'{w:.1%}'] for t, w in sp.get('dominant_eigvec_types', [])[:10]])
c = R.get('central_complex', {})
if c:
    prof = c.get('offset_profiles_mod8', {}).get('EPG_to_D7_to_EPG', {})
    G['d7_kernel'] = tbl(['offset'] + [str(k) for k in range(8)], [['synapses'] + [fmt(prof.get(str(k), prof.get(k, 0))) for k in range(8)]])
    rows = []
    for key, label in [('pen_to_epg_shift_L', 'PEN (both types), left'), ('pen_to_epg_shift_R', 'PEN, right'),
                       ('pena_to_epg_shift_L', 'PEN1 only, left'), ('pena_to_epg_shift_R', 'PEN1, right'),
                       ('penb_to_epg_shift_L', 'PEN2 only, left'), ('penb_to_epg_shift_R', 'PEN2, right')]:
        v = c.get(key)
        if v is None: continue
        rows.append([label] + ([f'{x:+.2f}' for x in v] if isinstance(v, list) else ['—', f'{v:+.2f}', '—']))
    cf = c.get('delta7_cosine_fit', {})
    G['pen_shift'] = (tbl(['population', 'p10', 'median', 'p90'], rows) if rows else '') + \
        (f"\n\nDelta7 kernel cosine fit: mean {cf.get('mean')}, amplitude {cf.get('amplitude')}, R² {cf.get('r2')}, contrast {cf.get('contrast')}." if cf else '')
al = R.get('antennal_lobe', {})
if al:
    G['al_flows'] = tbl(['flow', 'synapses'], [[k.replace('->', '→'), f'{v:,}'] for k, v in al.get('synapse_flows', {}).items()])
mb = R.get('mushroom_body', {})
if mb:
    G['mb_flows'] = tbl(['flow', 'synapses'], [[k.replace('->', '→'), f'{v:,}'] for k, v in sorted(mb.get('synapse_flows', {}).items(), key=lambda kv: -kv[1])])
lh = R.get('lateral_horn', {})
if lh:
    G['lh'] = tbl(['metric', 'value'],
        [['LH neurons / types', f"{lh.get('n_lh', 0):,} / {lh.get('n_lh_types', 0)}"],
         ['output cells / local cells', f"{lh.get('n_output_cells', 0):,} / {lh.get('n_local_cells', 0):,}"],
         ['PN→LH / PN→KC weight', lh.get('pn_lh_vs_pn_kc')],
         ['PN types per LH output (median)', lh.get('lh_pn_breadth_p50')],
         ['top-PN share of input (median)', pct(lh['lh_top_pn_share_p50']) if lh.get('lh_top_pn_share_p50') else '—'],
         ['PNs reaching the LH', pct(lh.get('pn_cells_reaching_lh_frac', 0))]]) + \
        '\n\n' + tbl(['LH→descending', 'synapses'], [[t, f'{w:,}'] for t, w in lh.get('lh_to_dn_top', [])])
og = R.get('optic_glomeruli', {})
if og:
    G['og'] = tbl(['metric', 'value'],
        [['VPN neurons / types', f"{og.get('n_vpn', 0):,} / {og.get('n_vpn_types', 0)}"],
         ['top-target share (median)', pct(og.get('focus_median', 0))],
         ['target types at ≥5% (median)', og.get('breadth_median')],
         ['channel cosine p50 / p90', f"{og.get('pairwise_cosine_p50')} / {og.get('pairwise_cosine_p90')}"],
         ['VPN→DN / →ring / →LH synapses', f"{og.get('vpn_to_dn_synapses', 0):,} / {og.get('vpn_to_er_synapses', 0):,} / {og.get('vpn_to_lh_synapses', 0):,}"]]) + \
        '\n\n' + tbl(['convergent target', 'VPN types', 'synapses'], [[t, n, f'{w:,}'] for t, n, w in og.get('convergent_targets', [])[:12]])
mc = R.get('mbon_convergence', {})
if mc:
    G['mbc'] = tbl(['metric', 'value'],
        [['MBON cells / types', f"{mc.get('n_mbon', 0)} / {mc.get('n_mbon_types', 0)}"],
         ['transmitters', ', '.join(f'{n} {t}' for t, n in mc.get('nt_split', {}).items())],
         ['targets fed by ≥2 MBON types', len(mc.get('convergent_targets', []))],
         ['same-sign / cross-sign target cosine', f"{mc.get('same_valence_cosine_p50')} / {mc.get('diff_valence_cosine_p50')}"],
         ['MBON→DN synapses', f"{mc.get('mbon_to_dn_synapses', 0):,}"]]) + \
        '\n\n' + tbl(['convergent target', 'MBON types', 'synapses'], [[t, n, f'{w:,}'] for t, n, w in mc.get('convergent_targets', [])[:12]])
st = R.get('state_circuits', {})
if st:
    G['state'] = tbl(['link', 'synapses'], [[k.replace('->', '→'), f'{v:,}'] for k, v in sorted(st.get('links', {}).items(), key=lambda kv: -kv[1])]) + \
        '\n\n' + tbl(['group', 'cells', 'example types'],
        [[g, d['n'], ', '.join(d['types'][:8])] for g, d in st.get('per_group', {}).items()])

import os
if os.path.exists('public/data/dynamics_validation.json'):
    v = json.load(open('public/data/dynamics_validation.json'))
    rows = []
    if 'delta7_kernel' in v:
        dk = v['delta7_kernel']
        rows.append(['Delta7 kernel (aligned gI profile)', f"min near bump: {dk.get('min_at_bump')}, max at wedge {dk.get('max_wedge')}, cosine R² {dk['cos_fit'].get('r2')}"])
    if 'pen_shifter' in v:
        p = v['pen_shifter']
        rows.append(['PEN push field (median offset, columns)', f"L {p.get('median_L')}, R {p.get('median_R')} — opposite signs: {p.get('opposite_signs')}"])
    if 'apl' in v:
        a = v['apl']
        rows.append(['APL sparsening', f"active KCs {a.get('kc_active_with_apl')} → {a.get('kc_active_without_apl')} without APL; {a.get('kc_hz_with_apl')} → {a.get('kc_hz_without_apl')} Hz/cell"])
    if 'verdict' in v:
        rows.append(['verdict', ', '.join(f'{k}: {"✓" if ok else "✗"}' for k, ok in v['verdict'].items())])
    G['validation'] = tbl(['probe', 'measured'], rows)

src = open(DOC).read()
n = 0
def repl(mm):
    global n
    key = mm.group(1)
    if key in G: n += 1; return f'<!-- GEN:{key} -->\n{G[key]}\n<!-- /GEN:{key} -->'
    return mm.group(0)
out = re.sub(r'<!-- GEN:([\w]+) -->.*?<!-- /GEN:\1 -->', repl, src, flags=re.S)
open(DOC, 'w').write(out)
missing = [k for k in re.findall(r'<!-- GEN:([\w]+) -->', out) if k not in G]
print(f'rendered {n} blocks into {DOC}', ('missing data for: ' + ', '.join(missing)) if missing else '')
