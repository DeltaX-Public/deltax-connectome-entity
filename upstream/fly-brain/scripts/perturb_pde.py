#!/usr/bin/env python3
"""Cross-formalism perturbation suite for the PDE heading field.

The LIF hypothesis lab ranks perturbations by how well they separate
parameter ensemble members. This script runs the matching manipulations on
the field model, so outcomes can be compared across formalisms: agreement
on a perturbation outcome is evidence the mechanism claim is structural,
not an artifact of one neuron model.

Writes public/data/perturb_pde.json.
"""
import json
import numpy as np
from ring_pde import RingField

TH = None  # per-field


def settle(f, steps=600, dt=0.01, **kw):
    th = np.linspace(0, 2 * np.pi, f.n, endpoint=False)
    f.u = np.maximum(0, np.cos(th)) + 0.4
    for _ in range(steps):
        f.step(dt=dt, **kw)
    return f


def obs(f):
    """Bump observables: normalised resultant, FWHM in degrees, peak rate."""
    th = np.linspace(0, 2 * np.pi, f.n, endpoint=False)
    a = np.maximum(0.0, f.u - f.u.min())
    r = abs((a * np.exp(1j * th)).sum()) / max(a.sum(), 1e-9)
    half = np.maximum(0.0, a - 0.5 * a.max())
    w = half.sum() / max(half.max(), 1e-9) / f.n * 360.0
    return dict(R=round(float(r), 3), width_deg=round(float(w), 1),
                peak=round(float(f.u.max()), 2))


def main():
    out = {}

    # 1. Graded Delta7 suppression — the top discriminator in the LIF lab.
    #    LIF classes: survives-sharp / widens / uniform / silent.
    curve = []
    for d7 in [1.0, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1, 0.0]:
        f = settle(RingField(d7_gain=d7))
        o = obs(f); o['d7_gain'] = d7
        curve.append(o)
    out['d7_sweep'] = curve

    # 2. PEN arm silencing — does one arm suffice for integration?
    for arm in ['both', 'left', 'right']:
        f = RingField()
        th = np.linspace(0, 2 * np.pi, f.n, endpoint=False)
        f.u = np.maximum(0, np.cos(th)) + 0.4
        for _ in range(400):
            f.step(dt=0.01)
        th0 = f.theta()
        # drive om=+0.5; 'left' keeps only the arm that +om should engage
        for _ in range(200):
            f.step(om=0.5, dt=0.01,
                   pen_mask={'both': (1, 1), 'left': (1, 0),
                             'right': (0, 1)}[arm])
        out[f'pen_{arm}'] = dict(obs(f), drift=round((f.theta() - th0 + np.pi) % (2 * np.pi) - np.pi, 3))

    # 3. Local-excitation gain sweep — the free parameter of the field.
    curve = []
    for g in [1.4, 1.8, 2.2, 2.6, 3.0]:
        f = settle(RingField(epg_recur=g))
        o = obs(f); o['epg_recur'] = g
        curve.append(o)
    out['exc_sweep'] = curve

    path = 'public/data/perturb_pde.json'
    with open('../' + path, 'w') as fp:
        json.dump(out, fp, indent=1)
    print(json.dumps(out, indent=1)[:2000])


if __name__ == '__main__':
    main()
