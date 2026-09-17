// Structure-vs-dynamics validation: does the wiring measured in algo_structures.json
// actually do the computation in the live LIF network? Three probes:
//   A) Delta7 ring kernel: pulse one EPG wedge, read the voltage profile the network
//      writes across the ring — should match the structural 1 - cos kernel.
//   B) PEN shifter: drive each PB column's PENs, read which EPG wedges depolarise —
//      left-hemisphere PENs should push ~+1.5 columns, right ~-1.5 (mirror-symmetric).
//   C) APL feedback: KC population activity with APL intact vs silenced.
// Note: the calibrated LIF does not sustain a free-running EPG bump (EPG recurrence is
// subthreshold on its own), so rotation is measured as the realised push field, not
// drift of a persistent bump. Run: node scripts/validate_dynamics.mjs
// (writes public/data/dynamics_validation.json, rendered into doc 28 by render_doc28.py)
import fs from 'node:fs';
import { loadAll } from './lib_node.mjs';
import { makeLIF } from './lifprobe.mjs';

const D = loadAll(), { meta, N } = D;
const f2 = (v) => (+v).toFixed(2);

// PB column tags (EPG(PB08)_L4) -> PB-line position -> ring wedge mod 8 (same fold as algo_circuits.py)
const pbcol = (s) => { const m = s && s.match(/_([LR])(\d)/); return m ? [m[1], +m[2]] : null; };
const posOf = (c) => c[0] === 'L' ? 9 - c[1] : 8 + c[1];
const wedgeOf = (i) => { const c = pbcol(meta.instances[i]); return c ? ((posOf(c) % 8) + 8) % 8 : -1; };

const epg = D.byType('EPG');
const wedges = Array.from({ length: 8 }, () => []);
epg.forEach((i) => { const w = wedgeOf(i); if (w >= 0) wedges[w].push(i); });
const penAll = [...D.byType('PEN_a(PEN1)'), ...D.byType('PEN_b(PEN2)')];
const penByCol = {};                                               // 'L4' -> [neuron idx]
for (const i of penAll) { const c = pbcol(meta.instances[i]); if (c) (penByCol[c[0] + c[1]] ||= []).push(i); }
const kcCls = meta.classes.indexOf('Kenyon_Cell'), pnCls = meta.classes.indexOf('ALPN');
const kc = [], pn = [];
for (let i = 0; i < N; i++) { if (D.cls[i] === kcCls) kc.push(i); if (D.cls[i] === pnCls) pn.push(i); }
const apl = D.byType('APL');
console.log(`populations: EPG ${epg.length} (wedges ${wedges.map(w => w.length).join(',')}), PEN ${penAll.length} in ${Object.keys(penByCol).length} columns, KC ${kc.length}, PN ${pn.length}, APL ${apl.length}`);

const clean = (net) => { net.drive.fill(0); net.bias.fill(0); net.thr.fill(0); net.reset(); };
const run = (net, ms) => { for (let s = 0; s < Math.round(ms / net.p.dt); s++) net.step(); };
const wedgeV = (net) => wedges.map(ws => ws.reduce((a, i) => a + net.v[i], 0) / ws.length - net.p.vRest);
const circMean = (vals) => { let x = 0, y = 0, n = 0; vals.forEach((a, w) => { x += a * Math.cos(w * Math.PI / 4); y += a * Math.sin(w * Math.PI / 4); n += a; }); return n > 0 ? Math.atan2(y, x) / (Math.PI / 4) : null; };
const cosFit = (v) => { // v[k] ~ a - b cos(2 pi k/8): report amplitude and R^2
  const k8 = [...Array(8).keys()], a = v.reduce((s, x) => s + x) / 8;
  const b = -2 * v.reduce((s, x, k) => s + x * Math.cos(2 * Math.PI * k / 8), 0) / 8;
  const ss = v.reduce((s, x, k) => s + (x - (a - b * Math.cos(2 * Math.PI * k / 8))) ** 2, 0);
  const tt = v.reduce((s, x) => s + (x - a) ** 2, 0);
  return { mean: +f2(a), amplitude: +f2(b), r2: +f2(1 - ss / Math.max(tt, 1e-9)) };
};

const net = makeLIF(D, {});
const out = {};

// ---------- A) Delta7 kernel: each Delta7's realised inhibition footprint on the ring ----------
{
  const d7 = D.byType('Delta7');
  const d7idx = new Map(d7.map((d, k) => [d, k]));
  // each Delta7's preferred bump wedge = the wedge whose EPGs give it the most weight
  const d7in = d7.map(() => new Float64Array(8));
  for (const i of epg) { const w = wedgeOf(i); if (w < 0) continue; for (let j = D.indptr[i]; j < D.indptr[i + 1]; j++) { const k = d7idx.get(D.indices[j]); if (k != null) d7in[k][w] += D.weights[j]; } }
  const acc = new Float64Array(8); let cnt = 0;
  for (const d of d7) {
    const prefW = d7in[d7idx.get(d)].indexOf(Math.max(...d7in[d7idx.get(d)]));
    clean(net); net.setBias(epg, 4); run(net, 100);
    net.setDrive([d], 100); run(net, 150); net.setDrive([d], 0);
    const gI = wedges.map(ws => -ws.reduce((a, i) => a + net.gI[i], 0) / ws.length);   // gI is signed negative
    const gi0 = Math.min(...gI); if (Math.max(...gI) - gi0 < 0.01) continue;            // no measurable footprint
    for (let w = 0; w < 8; w++) acc[w] += gI[((w + prefW) % 8 + 8) % 8];
    cnt++;
  }
  const prof = [...acc].map(v => v / Math.max(cnt, 1));
  const fit = cosFit(prof);
  out.delta7_kernel = { aligned_gI_profile: prof.map(v => +v.toFixed(3)), n_d7: cnt, cos_fit: fit,
    min_at_bump: prof.indexOf(Math.min(...prof)) === 0 || prof.indexOf(Math.min(...prof)) === 7 || prof.indexOf(Math.min(...prof)) === 1,
    max_wedge: prof.indexOf(Math.max(...prof)) };
  console.log(`A) Delta7 realised kernel over ${cnt} cells, aligned gI (0 = preferred bump wedge): ${prof.map(v => v.toFixed(3)).join(' ')}`);
  console.log(`   min near bump: ${out.delta7_kernel.min_at_bump}, max at wedge ${out.delta7_kernel.max_wedge} (opposite = 4), cosine fit R2 ${fit.r2} amplitude ${fit.amplitude}`);
}

// ---------- B) PEN shifter: per-column voltage push field ----------
{
  const shifts = { L: [], R: [] };
  for (const side of ['L', 'R']) for (let k = 1; k <= 9; k++) {
    const ix = penByCol[side + k]; if (!ix) continue;
    clean(net); net.setBias(epg, 4); run(net, 100);
    net.setDrive(ix, 100); run(net, 100); net.setDrive(ix, 0);
    const dv = wedgeV(net).map(v => Math.max(0, v));   // depolarising push only
    const c = circMean(dv); if (c == null) continue;
    const pw = ((posOf([side, k]) % 8) + 8) % 8;
    let off = ((c - pw) % 8 + 8) % 8; if (off > 4) off -= 8;
    shifts[side].push(+f2(off));
  }
  const med = (a) => a.length ? +f2([...a].sort((x, y) => x - y)[a.length >> 1]) : null;
  out.pen_shifter = { L: shifts.L, R: shifts.R, median_L: med(shifts.L), median_R: med(shifts.R),
    opposite_signs: med(shifts.L) != null && med(shifts.R) != null && Math.sign(med(shifts.L)) !== Math.sign(med(shifts.R)) };
  console.log(`B) PEN column -> EPG depolarisation centre offset (cols):`);
  console.log(`   L: ${shifts.L.join(' ')}  median ${out.pen_shifter.median_L}`);
  console.log(`   R: ${shifts.R.join(' ')}  median ${out.pen_shifter.median_R}`);
  console.log(`   structure predicts L +1.47 / R -1.45 -> ${out.pen_shifter.opposite_signs ? 'mirror-symmetric push ✓' : 'signs not opposite ✗'}`);
}

// ---------- C) APL feedback sparsens the KC code ----------
{
  const kcActive = (disableAPL) => {
    clean(net);
    if (disableAPL) for (const i of apl) net.setThr(i, 1e6);
    net.setDrive(pn, 150); run(net, 200);
    const b = Uint32Array.from(net.spikeCount); run(net, 300);
    let act = 0, sp = 0;
    for (const i of kc) { const d = net.spikeCount[i] - b[i]; if (d > 0) { act++; sp += d; } }
    net.setDrive(pn, 0);
    return { frac: act / kc.length, rate: sp / kc.length / 0.3 };
  };
  const on = kcActive(false), off = kcActive(true);
  out.apl = { kc_active_with_apl: +f2(on.frac), kc_active_without_apl: +f2(off.frac),
    kc_hz_with_apl: +f2(on.rate), kc_hz_without_apl: +f2(off.rate), sparser_with_apl: on.frac < off.frac };
  console.log(`C) KC activity with APL ${(on.frac * 100).toFixed(1)}% cells (${f2(on.rate)} Hz/cell) vs APL silenced ${(off.frac * 100).toFixed(1)}% (${f2(off.rate)} Hz/cell) -> ${on.frac < off.frac ? 'sparser ✓' : 'NOT sparser ✗'}`);
}

const dk = out.delta7_kernel;
const verdict = {
  bump_kernel: dk.min_at_bump && dk.max_wedge >= 3 && dk.max_wedge <= 5 && dk.cos_fit.amplitude > 0 && dk.cos_fit.r2 > 0.4,
  pen_shifter: out.pen_shifter.opposite_signs,
  apl_sparsening: out.apl.sparser_with_apl,
};
console.log('\nsummary:', JSON.stringify(out, null, 1));
console.log('verdict:', JSON.stringify(verdict));
fs.writeFileSync('public/data/dynamics_validation.json', JSON.stringify({ ...out, verdict }, null, 1));
console.log('wrote public/data/dynamics_validation.json');
