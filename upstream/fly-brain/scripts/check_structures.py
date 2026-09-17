#!/usr/bin/env python3
"""Invariants for public/data/algo_structures.json — fails loudly if a graph repack or
a pipeline change silently breaks a measured structure. Run: python3 scripts/check_structures.py
Exit 0 = all checks pass."""
import json, sys

R = json.load(open('public/data/algo_structures.json'))
fails = []
def chk(name, cond, detail=''):
    print(f"  {'ok ' if cond else 'FAIL'} {name} {detail}")
    if not cond: fails.append(name)
def close(a, b, tol): return a is not None and abs(a - b) <= tol

# global organisation
f = R['flow']; r = R['recurrence']; s = R['sign']; b = R['bilateral']
chk('forward weight ~0.37', close(f['forward_weight_frac'], 0.375, 0.05), f"={f['forward_weight_frac']}")
chk('giant SCC >95%', r['giant_scc_frac'] > 0.95, f"={r['giant_scc_frac']}")
chk('excitatory weight 55-70%', 0.55 < s['exc_weight_frac'] < 0.7, f"={s['exc_weight_frac']}")
chk('crossing weight 15-30%', 0.15 < b['crossing_weight_frac'] < 0.3, f"={b['crossing_weight_frac']}")

# motifs, FFL, null model
m = R['motifs']
chk('FFI frac >0.7', m['feedforward_inhibition']['frac'] > 0.7, f"={m['feedforward_inhibition']['frac']}")
chk('FFL census present', 'feedforward_loops' in m and m['feedforward_loops']['coherent_edges'] > 0)
nm = m.get('null_model', {})
if nm:
    for k in ('ffi_frac', 'recip_EE', 'recip_II', 'recip_EI', 'ffl_coh_edges', 'ffl_incoh_edges'):
        chk(f'null z({k}) > 20', nm[k]['z'] > 20, f"z={nm[k]['z']}")
    chk('dis_II control conserved (|z| < 5)', abs(nm['dis_II_control']['z']) < 5, f"z={nm['dis_II_control']['z']}")
else:
    chk('null model present', False)

# spectral
sp = R.get('spectral', {})
chk('spectral radius > 0', sp.get('spectral_radius_power_iter', 0) > 0, f"={sp.get('spectral_radius_power_iter')}")
chk('dominant eigenvector concentrated', 5 < sp.get('dominant_eigvec_participation', 0) < 500, f"={sp.get('dominant_eigvec_participation')}")
chk('netflow by superclass present', bool(sp.get('netflow_median_by_superclass')))

# circuits
al = R['antennal_lobe']
chk('AL labelled-line purity >0.9', al['orn_to_pn_same_glomerulus_frac'] > 0.9, f"={al['orn_to_pn_same_glomerulus_frac']}")
mb = R['mushroom_body']
chk('APL covers KCs >95%', mb['apl_covers_kc_frac'] > 0.95, f"={mb['apl_covers_kc_frac']}")
chk('MB expansion ~5.9x', close(mb['expansion_ratio'], 5.9, 1.5), f"={mb['expansion_ratio']}")

c = R['central_complex']
chk('Delta7 kernel min at offset 0', c['delta7_inhibition_min_offset'] == 0, f"={c['delta7_inhibition_min_offset']}")
chk('Delta7 cosine fit R2 > 0.9', c.get('delta7_cosine_fit', {}).get('r2', 0) > 0.9, f"={c.get('delta7_cosine_fit', {}).get('r2')}")
chk('PEN_L shift positive', c['pen_to_epg_shift_L'][1] > 0.5, f"={c['pen_to_epg_shift_L']}")
chk('PEN_R shift negative', c['pen_to_epg_shift_R'][1] < -0.5, f"={c['pen_to_epg_shift_R']}")
chk('PEN L/R roughly mirror', abs(c['pen_to_epg_shift_L'][1] + c['pen_to_epg_shift_R'][1]) < 0.6,
    f"{c['pen_to_epg_shift_L'][1]} vs {c['pen_to_epg_shift_R'][1]}")

o = R['optic_lobe']
chk('columnar types ~47', close(o['columnar_types'], 47, 10), f"={o['columnar_types']}")

# new sections
lh = R.get('lateral_horn', {})
chk('lateral horn present', lh.get('n_lh', 0) > 1000 and lh.get('pn_lh_vs_pn_kc', 0) > 0, f"n={lh.get('n_lh')}")
og = R.get('optic_glomeruli', {})
chk('optic glomeruli present', og.get('n_vpn_types', 0) > 100 and og.get('convergent_targets'), f"types={og.get('n_vpn_types')}")
mc = R.get('mbon_convergence', {})
chk('mbon convergence present', mc.get('n_mbon_types', 0) > 20 and mc.get('convergent_targets'), f"types={mc.get('n_mbon_types')}")
st = R.get('state_circuits', {})
chk('state circuits present', st.get('links', {}).get('state->CX', 0) > 10000, f"state->CX={st.get('links', {}).get('state->CX')}")

d = R['descending']; v = R['vnc']; h = R['hubs']
chk('DN funnel share <5%', d['brain_output_to_dn_frac'] < 0.05, f"={d['brain_output_to_dn_frac']}")
chk('motor pools share premotor >5x', v['pool_premotor_jaccard_median'] / max(v['random_mn_pair_jaccard_median'], 1e-9) > 5)
chk('hub tails heavy', h['in_degree_tail_exponent'] < 1.6 and h['out_degree_tail_exponent'] < 1.6)

print(f"\n{len(fails)} failures" if fails else '\nall checks pass')
sys.exit(1 if fails else 0)
