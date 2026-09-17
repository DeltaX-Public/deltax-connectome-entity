"""Continuous attractor neural field (PDE) model of the heading circuit.

Amari-type field on S^1 with the measured structural parameters:

    tau * du(theta,t)/dt = -u + W * f(u)          # recurrent kernel (Delta7: a - b cos)
                         + v+ * [f(u) shifted +s] + v- * [f(u) shifted -s]
                         - (v+ + v-) * f(u)      # PEN push-pull: wired columnar offsets
                         + I_landmark(theta,t)   # localized visual anchoring
                         + xi(theta,t)           # per-position noise

PEN feedback is the literal biological mechanism: the left/right PEN->EPG
projections are wired ~+-1.5 columns ahead, so a velocity-modulated copy of the
current bump fed back at that offset drags the bump — angular velocity is
integrated by geometry, not arithmetic.

    python3 scripts/ring_pde.py    # self-check: bump sustains, velocity rotates it
"""
import numpy as np


class RingField:
    """Recurrent kernel = local EPG<->EPG/PEG excitation + measured Delta7 surround
    inhibition. The Delta7 part alone is (a - b cos) ~ 0 at the bump, strong at the
    antipode — it is the surround, not the center; the narrow excitatory component
    is the EPG recurrence whose gain the wiring does not fix (epgRecur axis)."""
    def __init__(self, n=256, tau=0.05, epg_recur=3.0, d7_gain=1.0,
                 shift_cols=1.47, n_cols=8, thr=0.2, rn_gain=0.5, rn_depth=0.5):
        self.n, self.tau = n, tau
        k = np.arange(n)
        c = np.cos(2 * np.pi * k / n)
        exc = epg_recur * np.maximum(0.0, c) ** 4          # narrow same-wedge excitation
        inh = d7_gain * 0.89 * (1.0 - c)                   # Delta7: a-b*cos, a~=b=~880/1000
        # second inhibitory channel: GABAergic ring neurons (Gall-EB / R neurons),
        # a shallow surround NOT gated by d7_gain. Withheld-data correction: real
        # Delta7 block leaves a formed-but-widened bump because ring neurons still
        # confine it (Turner-Evans et al. 2020: "other sources of inhibition must act").
        inh += rn_gain * (1.0 - rn_depth * c)
        self.W = exc - inh
        self.s = shift_cols * n / n_cols                   # PEN offset in field cells
        self.thr = thr
        self.vel_gain = 1.0                                # PEN advection coupling: bump speed = om*vel_gain
        # PEN arms as shifted excitatory kernels (the real mechanism): the PEN bump
        # copy re-enters EPG +-s cells ahead; mode projection predicts the gain.
        s = int(round(self.s))
        self.Wp = np.roll(np.maximum(0.0, c) ** 4, +s)     # +s column offset arm
        self.Wm = np.roll(np.maximum(0.0, c) ** 4, -s)     # -s arm
        self.W0 = np.maximum(0.0, c) ** 4                  # unshifted arm (shifted3 pull)
        # 'shifted' = literal shifted-synapse feedback (the mechanism). 'advect' = its
        # reduced-algorithm equivalent (first-order identical by mode projection).
        # Finding: 'shifted' tracks clean velocity at ~0.85x but distorts the bump
        # under fluctuating drive. A second PEN field with amplitude coding does not
        # fix it ('shifted2'); position coding does ('shifted3': om displaces the PEN
        # bump, EPG is pulled toward it — noisy RMS 0.60 vs 1.29, matching the observed
        # EPG-PEN phase offset during turns).
        self.pen_mode = 'advect'
        self.tau_pen = 0.06                                # PEN synaptic filtering (velocity channel)
        self.om_sm = 0.0
        # 'shifted2': amplitude coding — PEN field tracks u, shifted arms gated by om.
        # 'shifted3': position coding — velocity displaces the PEN bump (the observed
        # EPG-PEN phase offset during turns); EPG is pulled toward the displaced bump.
        self.v = np.zeros(n)
        self.tau_p = 0.06                                  # PEN field time constant
        self.g_drive = 2.0                                 # EPG -> PEN drive
        self.pen_pull = 1.5                                # PEN -> EPG pull strength (shifted3)
        self.pen_arms = False                              # True: pull via Wp+Wm; False: tight W0
        # velocity gain from translation-mode projection on an equilibrated bump:
        # phi_dot = om * <u*', Wshift*f(u*)> / (tau * <u*',u*'>)  ->  pen_gain = 1/coef
        th = np.linspace(0, 2 * np.pi, n, endpoint=False)
        u0 = np.maximum(0.0, np.cos(th)) + 0.4
        for _ in range(400):                               # settle to the bump fixed point
            f0 = np.clip((u0 - thr) / (1.0 - thr), 0, 1)
            u0 += 0.1 * (-u0 + np.fft.ifft(np.fft.fft(self.W) * np.fft.fft(f0)).real)
        fu0 = np.clip((u0 - thr) / (1.0 - thr), 0, 1)
        up = np.gradient(u0, th)
        num = (up * np.fft.ifft(np.fft.fft(self.Wm) * np.fft.fft(fu0)).real).sum()
        coef = num / max((up * up).sum(), 1e-9) / tau
        self.pen_gain = 1.0 / max(abs(coef), 1e-9)
        self.u = np.zeros(n)

    def f(self, u):
        return np.clip((u - self.thr) / (1.0 - self.thr), 0.0, 1.0)  # saturating rate

    def step(self, om=0.0, landmark=None, lm_gain=0.0, dt=0.005, noise=0.0,
             rng=None, pen_mask=(1, 1)):
        fu = self.f(self.u)
        F = np.fft.fft(fu)
        rec = np.fft.ifft(np.fft.fft(self.W) * F).real
        pen = 0.0
        if self.pen_mode == 'shifted3':
            # position coding: velocity input displaces the PEN bump (spectral
            # advection of v); the summed shifted arms pull EPG toward v's
            # displaced position. v keeps its own attractor + tracks u.
            m = np.fft.fftfreq(self.n) * self.n
            delta = om * dt * self.vel_gain * self.n / (2 * np.pi)
            if om:
                self.v = np.fft.ifft(np.fft.fft(self.v) * np.exp(-2j * np.pi * m * delta / self.n)).real
            fv = self.f(self.v)
            rec_v = np.fft.ifft(np.fft.fft(self.W) * np.fft.fft(fv)).real
            self.v += dt / self.tau_p * (-self.v + rec_v + self.g_drive * fu)
            fv = self.f(self.v)
            Fv = np.fft.fft(fv)
            Wpen = self.Wp + self.Wm if self.pen_arms else self.W0
            pen = self.pen_pull * np.fft.ifft(np.fft.fft(Wpen) * Fv).real
        elif om:
            # pen_mask gates the two PEN arms: +om engages arm 0, -om arm 1.
            if self.pen_mode == 'advect':
                om = om * (pen_mask[0] if om > 0 else pen_mask[1])
                m = np.fft.fftfreq(self.n) * self.n
                delta = om * dt * self.vel_gain * self.n / (2 * np.pi)
                self.u = np.fft.ifft(np.fft.fft(self.u) * np.exp(-2j * np.pi * m * delta / self.n)).real
                fu = self.f(self.u); F = np.fft.fft(fu)
                rec = np.fft.ifft(np.fft.fft(self.W) * F).real
            else:
                # genuine mechanism: velocity drives the shifted-arm feedback at the
                # gain the translation-mode projection predicts (set in __init__).
                # PEN firing saturates (real neurons can't encode |om| >> 2 rad/s).
                self.om_sm += (om - self.om_sm) * dt / self.tau_pen
                om_s = 2.0 * np.tanh(self.om_sm / 2.0)
                vp, vm = pen_mask[0] * max(om_s, 0.0), pen_mask[1] * max(-om_s, 0.0)
                if self.pen_mode == 'shifted2':
                    # PEN as its own attractor field driven by the EPG bump;
                    # its recurrence keeps f(v) bump-shaped, so the shifted
                    # injection is clean even when u is momentarily distorted.
                    fv = self.f(self.v)
                    rec_v = np.fft.ifft(np.fft.fft(self.W) * np.fft.fft(fv)).real
                    self.v += dt / self.tau_p * (-self.v + rec_v + self.g_drive * fu)
                    fv = self.f(self.v)
                    Fv = np.fft.fft(fv)
                    pen = self.pen_gain * (vp * np.fft.ifft(np.fft.fft(self.Wp) * Fv).real
                                         + vm * np.fft.ifft(np.fft.fft(self.Wm) * Fv).real)
                else:
                    pen = self.pen_gain * (vp * np.fft.ifft(np.fft.fft(self.Wp) * F).real
                                         + vm * np.fft.ifft(np.fft.fft(self.Wm) * F).real)
        lm = 0.0
        if landmark is not None:
            th = np.linspace(0, 2 * np.pi, self.n, endpoint=False)
            # landmark anchoring via ring-neuron disinhibition: global EPG
            # suppression with a gap at the landmark bearing (R-neuron wiring)
            lm = -lm_gain * (1.0 - np.cos(th - landmark)) / 2.0 + 0.3 * lm_gain * np.maximum(0.0, np.cos(th - landmark))
        xi = rng.normal(0, noise, self.n) if noise and rng is not None else 0.0
        self.u += dt / self.tau * (-self.u + rec + pen + lm + xi)
        return self.theta()

    def theta(self):
        k = np.arange(self.n)
        fu = self.f(self.u)
        if fu.sum() < 1e-9: return None
        return np.arctan2((fu * np.sin(2 * np.pi * k / self.n)).sum(),
                          (fu * np.cos(2 * np.pi * k / self.n)).sum())

    def bump_width(self):
        fu = self.f(self.u)
        if fu.max() <= 0: return 0
        pk = np.argmax(fu)
        return int((np.roll(fu, -pk + self.n // 2) > fu.max() / 2).sum())


if __name__ == '__main__':
    rng = np.random.default_rng(0)
    f = RingField()
    # seed a bump, check it persists
    th = np.linspace(0, 2 * np.pi, f.n, endpoint=False)
    f.u = np.maximum(0, np.cos(th - 1.0)) + 0.4
    for _ in range(200): f.step(dt=0.005)
    t0 = f.theta(); w0 = f.bump_width()
    print(f'seeded bump: theta {t0:.2f}, width {w0} cells, sustained={t0 is not None}')
    # velocity integration: constant omega should rotate the bump
    for _ in range(400): f.step(om=1.0, dt=0.005)
    t1 = f.theta()
    print(f'after om=+1 for 2s: theta {t0:.2f} -> {t1:.2f}  (drift {t1 - t0:+.2f} rad)')
    # landmark snap (disinhibition needs enough gain to beat antipodal suppression)
    for _ in range(600): f.step(om=0.0, landmark=0.0, lm_gain=25.0, dt=0.005)
    print(f'landmark at 0: theta {t1:.2f} -> {f.theta():.2f}')
