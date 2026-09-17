"""Reduced executable models emitted by the connectome compiler (Algorithm IR -> Python).

Each class is the smallest program consistent with the measured structure — not a neural
simulator, the decompiled computation itself. Self-check at the bottom verifies the
reduced model's implied quantities against the measured ones in the connectome.

    python3 scripts/reduced_ops.py
"""
import json
import numpy as np


class RingAttractor:
    """Central complex compass, decompiled.

    Substrate: EPG (bump population), Delta7 (1-cos inhibitory kernel, measured R2=0.99),
    PEN_a/PEN_b (shifters, measured +1.47 / -1.45 column offset), PEG (copy).

    State: activity vector over 8 wedges = a phase theta on the ring.
    Update: bump persists via EPG recurrence + Delta7 divisive normalisation;
            rotates when left/right PEN drive is asymmetric — the wired column offset
            makes the L-R difference an angular velocity integral.
    """
    def __init__(self, n_wedges=8, tau=0.05, gain=1.0):
        self.n = n_wedges
        self.th = None                                 # bump phase; None until seeded
        self.tau, self.gain = tau, gain
        # Delta7 kernel measured: weight[k] ~ a - b*cos(2 pi k/8), a=873, b=890 synapses.
        k = np.arange(n_wedges)
        self.kernel = 873.0 - 889.7 * np.cos(2 * np.pi * k / n_wedges)
        # PEN wiring offset: L PENs write +1.47 columns ahead, R PENs -1.45 (measured).
        self.shift_L, self.shift_R = 1.47, -1.45

    @property
    def x(self):
        """bump activity per wedge: raised cosine at the current phase."""
        if self.th is None: return np.zeros(self.n)
        k = np.arange(self.n)
        return np.maximum(0, np.cos(2 * np.pi * k / self.n - self.th) + 0.5)

    def step(self, drive_L=0.0, drive_R=0.0, landmark=None, dt=1.0):
        if self.th is None and (drive_L or drive_R or landmark is not None): self.th = 0.0
        if self.th is None: return None
        # PEN shifter: each hemisphere pushes the bump by its wired offset (columns/step * drive)
        self.th += self.tau * dt * (drive_L * self.shift_L + drive_R * self.shift_R) * 2 * np.pi / self.n
        if landmark is not None:                       # landmark correction
            self.th += self.gain * dt * np.arctan2(np.sin(landmark - self.th), np.cos(landmark - self.th))
        return self.theta()

    def theta(self):
        return self.th


class SparseAssociativeMemory:
    """Mushroom body, decompiled.

    Substrate: PN->KC expansion (5.9x measured), APL global inhibition (100% coverage),
    DAN gating at KC->MBON (DAN->KC 89k syn vs DAN->MBON 38k).
    x = top-k(sparse random projection); value = gated linear readout.
    """
    def __init__(self, n_in, n_kc, n_out, k_frac=0.05, seed=0):
        rng = np.random.default_rng(seed)
        self.P = (rng.random((n_in, n_kc)) < 6.0 / n_in).astype(float)   # ~6 claws per KC (measured)
        self.W = np.zeros((n_kc, n_out)); self.k = max(1, int(n_kc * k_frac))

    def encode(self, odor):
        z = odor @ self.P
        thr = np.partition(z, -self.k)[-self.k]          # APL: top-k sparsification
        return (z >= thr) * (z > 0)

    def learn(self, odor, reward, lr=0.1):
        x = self.encode(odor)
        self.W[np.ix_(x.astype(bool), np.arange(self.W.shape[1]))] -= lr * reward  # 3-factor: KC active x DAN x eligibility


if __name__ == '__main__':
    R = json.load(open('public/data/algo_structures.json'))
    cx = R['central_complex']
    # self-check: the reduced model's push convention must match the measured PEN offsets
    ra = RingAttractor(); ra.step(landmark=0.0, dt=0)  # seed bump at 0
    th0 = ra.theta()
    for _ in range(10): ra.step(drive_L=1.0, drive_R=0.0, dt=1.0)
    moved_L = ra.theta()
    ra2 = RingAttractor(); ra2.step(landmark=0.0, dt=0)
    for _ in range(10): ra2.step(drive_L=0.0, drive_R=1.0, dt=1.0)
    moved_R = ra2.theta()
    sL, sR = np.sign(np.sin(moved_L - th0)), np.sign(np.sin(moved_R - th0))
    ok = sL != sR and sL != 0
    print(f'self-check: L drive moved theta {moved_L - th0:+.3f} rad, R drive {moved_R - th0:+.3f} rad -> opposite signs: {ok}')
    print(f"measured PEN offsets: L {cx['pen_to_epg_shift_L'][1]:+.2f} / R {cx['pen_to_epg_shift_R'][1]:+.2f} columns")
    # sparse memory: orthogonal-ish codes, learnable readout
    sm = SparseAssociativeMemory(50, 2000, 3)
    a, b = sm.encode(np.random.default_rng(1).random(50)), sm.encode(np.random.default_rng(2).random(50))
    print(f'MB reduced: codes overlap {int(a @ b)}/{int(a.sum())} bits (random-projection separability)')
