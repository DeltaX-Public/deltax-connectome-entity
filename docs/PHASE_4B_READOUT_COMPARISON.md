# Phase IV-B: Readout Comparison & Auditing
## Upstream Motor Model (`motor.js`) vs Current `ConnectomeCandidateBridge`

### 1. Executive Summary

This document compares the motor readout semantics of the upstream fruit fly brain simulation (`upstream/fly-brain/src/sim/motor.js`) against our public candidate bridge (`src/connectome/candidate_bridge.mjs`) across identical descending neuron (DN) states.

Our quantitative transfer map audit (`artifacts/readout/bridge-transfer-map.json`) confirms the **Central HALT Hypothesis**:
> **The current `CandidateBridge` treats the absence of forward locomotor drive as positive evidence for an active stopping command.** Because `haltStrength = max(0.1, 1.0 - (fwdStrength * 0.85))`, any condition with low forward drive generates a HALT candidate with strength $\ge 0.90$. Meanwhile, robust unilateral steering signals ($2.0 - 5.0\text{ Hz}$) map to strengths of $0.095 - 0.221$. Consequently, **HALT dominates and suppresses legitimate steering information across all low-translational states.**

In contrast, the upstream reference model treats translation ($v$) and steering ($\theta$) as **independent, orthogonal control axes**, explicitly supporting an **in-place pivot turn** when forward velocity is near zero and steering drive is active.

---

### 2. Side-by-Side Architectural Comparison

| Dimension | Upstream Reference (`upstream/fly-brain/src/sim/motor.js`) | Current Bridge (`src/connectome/candidate_bridge.mjs`) |
| :--- | :--- | :--- |
| **Readout Paradigm** | Continuous orthogonal axes: $[v, \text{turn}, \text{escape}, \text{groom}]$ | Competing discrete candidate field: `[cand_fwd, cand_halt, cand_tl, cand_tr, ...]` |
| **Forward Translation** | $v = \text{sat}(\text{net} - \theta_{\text{fwd}})$ where $\text{net} = \text{fwd} - 2\cdot\text{back}$; threshold $\theta_{\text{fwd}} = 4.0\text{ Hz}$. | $s_{\text{fwd}} = 1 - \exp(-\text{fwd} / 15.0)$. |
| **Steering / Rotation** | $\text{turn} = \frac{\text{turnL} - \text{turnR}}{\text{scale}}$; independent of $v$. | Separate `turn_left` and `turn_right` candidates: $s = 1 - \exp(-\text{turn} / 20.0)$. |
| **Low Forward + High Steering** | **Pivot Gait:** If $|v| < 0.1$ and $|\text{turn}| > 0.25$, inner legs step backward and outer legs step forward (turn on the spot). | **HALT Dominance:** $s_{\text{halt}} \approx 0.98 \gg s_{\text{turn}} \approx 0.22$. Steering candidate is buried at Rank 2. |
| **Stop / Rest Semantic** | Passive stance: If $v < \theta_{\text{fwd}}$ and $|\text{turn}| < \theta_{\text{turn}}$, leg amplitude decays to 0. No active competing "halt" signal. | Synthesized active competitor: $s_{\text{halt}} = \max(0.1, 1.0 - 0.85 \cdot s_{\text{fwd}})$. |
| **Provenance Integrity** | Explicitly models biomechanical stepping pattern generator. | Labels HALT as `DERIVED_NEURAL` with populations `["MDN", "DNa02"]`, but the formula does not even read MDN or DNa02. |

---

### 3. Empirical Response Under Benchmark Test Cases

We evaluated identical descending neuron vectors across both readout architectures:

```
Test Case A: forward = 0.2 Hz, backward = 0.0 Hz, turn_left = 5.0 Hz, turn_right = 0.1 Hz
  - Biological Phenotype: Unilateral tactile stimulus -> strong ipsilateral turn intent.
  - Upstream Motor:       v = 0.0, turn = +0.196 -> Triggers PIVOT GAIT (in-place left turn).
  - Current Candidate:    s_halt = 0.989 (Rank 1), s_tl = 0.221 (Rank 2) -> HALT wins. Body stops.

Test Case B: forward = 0.2 Hz, backward = 6.0 Hz, turn_left = 5.0 Hz, turn_right = 0.1 Hz
  - Biological Phenotype: Aversive/noxious drive (MDN back) + lateral tactile contact.
  - Upstream Motor:       v = -0.054 (reverse walking), turn = +0.196 -> Backward left arc.
  - Current Candidate:    s_halt = 0.989 (Rank 1), s_tl = 0.221 (Rank 2) -> HALT wins. Backward ignored.

Test Case C: forward = 20.0 Hz, backward = 0.0 Hz, turn_left = 5.0 Hz, turn_right = 0.1 Hz
  - Biological Phenotype: High forward locomotor drive + moderate left steering.
  - Upstream Motor:       v = 0.736 (forward walking), turn = +0.196 -> Forward left curve.
  - Current Candidate:    s_fwd = 0.736 (Rank 1), s_halt = 0.374 (Rank 2), s_tl = 0.221 (Rank 3) -> Forward wins.

Test Case D: forward = 0.0 Hz, backward = 0.0 Hz, turn_left = 0.0 Hz, turn_right = 0.0 Hz
  - Biological Phenotype: Neural quiescence.
  - Upstream Motor:       v = 0.0, turn = 0.0 -> Standing rest / stance.
  - Current Candidate:    s_halt = 1.000 -> Active HALT candidate emitted with maximal strength.

Test Case E: forward = 0.2 Hz, escape = 35.0 Hz (DNp01 / Giant Fibre)
  - Biological Phenotype: Looming predator detection -> ballistic jump reflex.
  - Upstream Motor:       Triggers TTM explosive leg extension (hop).
  - Current Candidate:    s_halt = 0.989 (Rank 1), s_escape = 0.700 (Rank 2) -> HALT wins!
```

---

### 4. Methodological Diagnosis

The audit reveals three structural defects in `ConnectomeCandidateBridge`:

1. **Rank Inversion via Inverted Forward Drive:**
   `haltStrength` is defined as the mathematical inverse of forward drive. Because the whole-CNS connectome under baseline or aversive stimulation exhibits low spontaneous forward DN firing ($0.1 - 0.8\text{ Hz}$), `haltStrength` is pinned at $0.95 - 1.00$. In this regime, steering DNs firing at realistic physiological rates ($1.0 - 5.0\text{ Hz}$) cannot overcome the artificial HALT score.
2. **False Provenance Claim:**
   `halt` reports `originating_population: ["MDN", "DNa02"]`, but its normalization code is:
   `const haltStrength = +(Math.max(0.1, 1.0 - (fwdStrength * 0.85))).toFixed(3);`
   MDN is backward-walking command, and DNa02 is ipsilateral steering. Neither is used to calculate `haltStrength`.
3. **Loss of Pivot Turning:**
   In biological insects, turning when obstacles block forward progress occurs through *pivot turns* (inner legs retracting/braking while outer legs step). By forcing a single winner among `[locomotion_forward, turn_left, turn_right, halt]`, the entity cannot express pivot turning unless turn strength exceeds halt strength—which our sweep proved requires $>200\text{ Hz}$ firing, far beyond physiological limits.

---

### 5. Separation of Motor States

To establish causal integrity, we must separate five distinct concepts previously lumped together:

1. **`MEASURED_NEURAL` Forward Drive:** Firing rate of forward locomotor DNs (`DNg100`, `DNp09`, etc.).
2. **`MEASURED_NEURAL` Steering Drive:** Differential firing of ipsilateral vs contralateral steering DNs (`DNa02`, `DNa01`, `DNp09`).
3. **`MEASURED_NEURAL` Backward Drive:** Firing rate of Moonwalker Descending Neurons (`MDN`).
4. **`DERIVED_NEURAL` Resting Stance (Quiescence):** Low translational drive AND low steering drive ($v < \theta_{\text{fwd}}$ and $|\text{turn}| < \theta_{\text{turn}}$).
5. **`FALLBACK` Safety Noop:** Governance-mandated fail-safe when all neural candidates are forbidden or vetoed.
