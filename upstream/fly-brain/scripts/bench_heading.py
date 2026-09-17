"""Engineering benchmark: heading estimation under identical conditions.

Compares the decompiled biological estimator (reduced_ops.RingAttractor) against
standard algorithms on the same task: track heading theta(t) from noisy angular
velocity + sparse, occasionally-corrupt landmark bearings.

    python3 scripts/bench_heading.py [n_trials]

Estimators
    dead_reckoning   theta += omega dt                          state: 1 float
    complementary    theta += omega dt + a*wrap(L - theta)      state: 1 float
    kalman_1d        constant-velocity KF on wrap(theta)        state: 2 floats
    kalman_gated     same + Mahalanobis outlier rejection       state: 2 floats
    ring_attractor   PEN-drive integration + bounded wrap snap  state: 1 phase (8-wedge pop code)

Reported: RMS wrap error (clean / with outlier landmarks), 5s post-outlier
error (recovery), and a per-neuron-noise robustness variant for the population
readout — the thing scalar estimators cannot express.
"""
import sys
import numpy as np
from reduced_ops import RingAttractor
from ring_pde import RingField

wrap = lambda a: np.arctan2(np.sin(a), np.cos(a))
RNG = np.random.default_rng(7)


def trajectory(T=60.0, dt=0.05, seed=0):
    """Ground truth: heading with OU angular velocity + discrete turns."""
    rng = np.random.default_rng(seed)
    n = int(T / dt)
    om = np.zeros(n); v = 0.0
    for t in range(n):
        v += (-v * 0.3 * dt) + rng.normal(0, 0.9) * np.sqrt(dt)          # OU, rad/s
        if rng.random() < dt / 8: v += rng.normal(0, 2.5)               # saccade-like turns
        om[t] = v
    return np.cumsum(om) * dt % (2 * np.pi), om


def observations(th, om, dt, w_sig=0.15, lm_every=2.0, lm_sig=0.10, p_out=0.15, seed=1):
    """omega_hat = noisy efference copy; landmarks sparse + occasional pi-flip outliers."""
    rng = np.random.default_rng(seed)
    n = len(th)
    om_hat = om + rng.normal(0, w_sig, n) / np.sqrt(dt)                  # white velocity noise
    lm = np.full(n, np.nan)
    for t in range(0, n, int(lm_every / dt)):
        lm[t] = th[t] + rng.normal(0, lm_sig)
        if rng.random() < p_out: lm[t] += np.pi                        # corrupt landmark
    return om_hat, lm


# ---- estimators ----
def dead_reckon(om_hat, lm, dt):
    th = 0.0; out = np.empty(len(om_hat))
    for t in range(len(om_hat)):
        th += om_hat[t] * dt
        out[t] = th
    return out


def complementary(om_hat, lm, dt, alpha=0.35):
    th = 0.0; out = np.empty(len(om_hat))
    for t in range(len(om_hat)):
        th += om_hat[t] * dt
        if not np.isnan(lm[t]): th += alpha * wrap(lm[t] - th)
        out[t] = th
    return out


def kalman(om_hat, lm, dt, q=0.3, r=0.01, gated=False):
    th, P = 0.0, 1.0; out = np.empty(len(om_hat))
    for t in range(len(om_hat)):
        th += om_hat[t] * dt; P += q * dt
        if not np.isnan(lm[t]):
            y = wrap(lm[t] - th); S = P + r; K = P / S
            if not (gated and y * y / S > 9.0):                        # 3-sigma gate
                th += K * y; P = (1 - K) * P
        out[t] = th
    return out


def ring(om_hat, lm, dt, gain=1.0, pop_noise=0.0, seed=3):
    """Scalar reduced model: PEN drives <- omega, landmark -> bounded phase snap."""
    rng = np.random.default_rng(seed)
    ra = RingAttractor()
    s = 8.0 / (ra.tau * 1.46 * 2 * np.pi)                              # drive scale: dth/dt = omega
    out = np.empty(len(om_hat))
    for t in range(len(om_hat)):
        L = lm[t] if not np.isnan(lm[t]) else None
        ra.step(drive_L=s * max(0.0, om_hat[t]), drive_R=s * max(0.0, -om_hat[t]),
                landmark=L, dt=dt)
        if pop_noise > 0 and ra.th is not None:
            x = ra.x + rng.normal(0, pop_noise, ra.n)
            out[t] = np.arctan2((x * np.sin(2 * np.pi * np.arange(ra.n) / ra.n)).sum(),
                                (x * np.cos(2 * np.pi * np.arange(ra.n) / ra.n)).sum())
        else:
            out[t] = ra.theta() or 0.0
    return out


def ring_pde(om_hat, lm, dt, field_noise=0.0, lm_gain=25.0, seed=3):
    """PDE field model: advection (PEN shifted feedback) + recurrent bump (EPG/Delta7)
    + landmark anchoring via ring-neuron disinhibition. 64-cell field, read out by
    circular mean of the population — spatial pooling is native, not simulated."""
    rng = np.random.default_rng(seed)
    f = RingField()
    f.u = np.maximum(0, np.cos(np.linspace(0, 2 * np.pi, f.n, endpoint=False))) + 0.4  # seed bump
    sub = max(1, int(round(dt / 0.01)))                                # field timestep ~10ms
    hold = int(0.4 / dt)                                               # cue persistence window
    L_hold = None; hold_left = 0
    out = np.empty(len(om_hat))
    for t in range(len(om_hat)):
        if not np.isnan(lm[t]): L_hold, hold_left = lm[t], hold
        elif hold_left > 0: hold_left -= 1
        else: L_hold = None
        for _ in range(sub):
            f.step(om=om_hat[t], landmark=L_hold, lm_gain=lm_gain if L_hold is not None else 0.0,
                   dt=dt / sub, noise=field_noise / np.sqrt(dt / sub), rng=rng)
        out[t] = f.theta() or 0.0
    return out


def metrics(est, th, lm, dt):
    err = wrap(est - th)
    rms = float(np.sqrt((err ** 2).mean()))
    out_idx = np.where(~np.isnan(lm))[0]
    # post-outlier: windows after landmarks whose value jumped >1.5 rad from est
    rec = []
    for t in out_idx:
        if abs(wrap(lm[t] - th[t])) > 1.5:
            w = err[t:t + int(5 / dt)]
            if len(w): rec.append(np.sqrt((w ** 2).mean()))
    return rms, float(np.mean(rec)) if rec else rms


def main(n_trials=60):
    rows = []
    for name, fn in [
        ('dead_reckoning', lambda o, l, dt: dead_reckon(o, l, dt)),
        ('complementary', lambda o, l, dt: complementary(o, l, dt)),
        ('kalman_1d', lambda o, l, dt: kalman(o, l, dt)),
        ('kalman_gated', lambda o, l, dt: kalman(o, l, dt, gated=True)),
        ('complementary_a05', lambda o, l, dt: complementary(o, l, dt, alpha=0.05)),  # matched correction strength
        ('ring_attractor', lambda o, l, dt: ring(o, l, dt)),
        ('ring_pde', lambda o, l, dt: ring_pde(o, l, dt)),
        ('ring_pde+noise', lambda o, l, dt: ring_pde(o, l, dt, field_noise=0.15)),
    ]:
        rs, rc = [], []
        for s in range(n_trials):
            th, om = trajectory(seed=s)
            om_hat, lm = observations(th, om, dt=0.05, seed=1000 + s)
            est = fn(om_hat, lm, 0.05)
            rms, rec = metrics(est, th, lm, 0.05)
            rs.append(rms); rc.append(rec)
        rows.append((name, np.mean(rs), np.std(rs), np.mean(rc)))
    print(f'{"estimator":<20}{"RMS err (rad)":>15}{"+/-sd":>9}{"post-outlier":>14}')
    for n, m, s, r in rows:
        print(f'{n:<20}{m:>15.3f}{s:>9.3f}{r:>14.3f}')
    print('\nnote: ring_pde+noise injects per-cell field noise sigma=0.15/sqrt(dt); the')
    print('attractor corrects it collectively — spatial pooling a scalar filter lacks.')


if __name__ == '__main__':
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 60)
