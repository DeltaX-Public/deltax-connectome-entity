# Steering Laterality & End-to-End Definition Audit

## 1. Executive Summary

This audit traces the definitions and implementations of **LEFT** and **RIGHT** throughout the entire stack of `deltax-connectome-entity`:
$$\text{World Coordinates} \longrightarrow \text{Sensors} \longrightarrow \text{Receptor Populations} \longrightarrow \text{Connectome Graph} \longrightarrow \text{RateNetwork Dynamics} \longrightarrow \text{Descending Neurons} \longrightarrow \text{Candidate Readout} \longrightarrow \text{Actuators}$$

All findings are empirically verified against `upstream/fly-brain` connectome artifacts ($N=165,122$ neurons, $E=10,511,038$ synapses) and `src/connectome/candidate_readouts.mjs`.

---

## 2. Layer-by-Layer Laterality Audit

### 2.1 World Coordinates & Heading Convention
- **Coordinate System**: Cartesian 2D/3D in ChangedWorld / Rover simulation. Forward is $+x$, Left is $+y$, Right is $-y$. Heading angle $\theta = 0$ corresponds to heading along $+x$.
- **Steering Convention**: Positive angular velocity $\dot{\theta} > 0$ denotes counter-clockwise (CCW / Left) rotation; negative $\dot{\theta} < 0$ denotes clockwise (CW / Right) rotation.
- **Audit Result**: Standard right-handed mathematical coordinate convention. No sign inversions found in basic kinematics.

### 2.2 Physical Sensor Geometry & Transduction
- In `src/connectome/sensory_transduction.mjs` (LATERALIZED mode):
  - `lateral.left_contact` / `lateral.left_antenna_distance` $\to$ drives `"JO wind/gravity left"` and `"tactile T1 left"`
  - `lateral.right_contact` / `lateral.right_antenna_distance` $\to$ drives `"JO wind/gravity right"` and `"tactile T1 right"`
  - `lateral.left_noxious` $\to$ `"thermosensory left"`
  - `lateral.right_noxious` $\to$ `"thermosensory right"`
- **Audit Result**: The sensor assignments are correctly lateralized. No ipsilateral/contralateral naming cross-wires exist in `sensory_transduction.mjs`.

### 2.3 Sensory Receptor Population Asymmetry in Connectome Source
Comparing receptor counts in `upstream/fly-brain/public/data/bodymap.json`:

| Sensory Modality | Left Population Name | Left Count | Right Population Name | Right Count | Asymmetry Ratio (L/R) |
|---|---|---|---|---|---|
| **tactile T1 (Foreleg)** | `tactile T1 left` | **151** | `tactile T1 right` | **115** | **1.313 (+31.3% L)** |
| **JO wind/gravity** | `JO wind/gravity left` | 228 | `JO wind/gravity right` | 247 | 0.923 (-7.7% L) |
| **JO auditory** | `JO auditory left` | 62 | `JO auditory right` | 52 | 1.192 (+19.2% L) |
| **thermosensory** | `thermosensory left` | 12 | `thermosensory right` | 13 | 0.923 (-7.7% L) |
| **taste T1** | `taste T1 left` | 149 | `taste T1 right` | 151 | 0.987 (-1.3% L) |
| **chordotonal T1** | `chordotonal T1 left` | 23 | `chordotonal T1 right` | 13 | 1.769 (+76.9% L) |

- **Finding**: While gustatory and thermosensory populations are nearly balanced, **tactile T1 has an intrinsic +31.3% surplus of afferent receptors in the left foreleg (151 vs 115)**.
- **Physical Consequence**: When stimulated with equal uniform firing rates per receptor, the left mechanosensory channel delivers $151 \times \text{rate}$ total input spikes vs $115 \times \text{rate}$ on the right.

### 2.4 Connectome Neuron Indexing & Hemispheric Partition
From `upstream/fly-brain/public/data/neurons.bin`:
- Side encoding values: `1 = Left`, `2 = Right`, `3 = Midline`, `0 = Unknown`.
- Global counts:
  - Left ($s=1$): **74,220** neurons (44.95%)
  - Right ($s=2$): **74,430** neurons (45.08%)
  - Midline ($s=3$): **392** neurons (0.24%)
  - Unknown ($s=0$): **16,080** neurons (9.74%)
- **Audit Result**: The global hemibrain partition is balanced within 0.28% ($74,220$ vs $74,430$). The indexing system correctly distinguishes hemispheres without offset errors.

### 2.5 Steering Descending Neurons (DNs)
Audited from `DN_ROLES.turn` (`DNa02: 1.0, DNa01: 0.6, DNp09: 0.5`):

| DN Type | Hemisphere | Neuron Index | Body ID | Neurotransmitter | In-Degree | Out-Degree |
|---|---|---|---|---|---|---|
| **DNa02** | Left ($s=1$) | `130496` | 523769 | ACh ($+1$) | 707 | 339 |
| **DNa02** | Right ($s=2$) | `332` | 10360 | ACh ($+1$) | 730 | 322 |
| **DNa01** | Left ($s=1$) | `406` | 10442 | ACh ($+1$) | 403 | 316 |
| **DNa01** | Right ($s=2$) | `704` | 10760 | ACh ($+1$) | 413 | 311 |
| **DNp09** | Left ($s=1$) | `725` | 10793 | ACh ($+1$) | 504 | 317 |
| **DNp09** | Right ($s=2$) | `1087` | 11467 | ACh ($+1$) | 546 | 334 |

- **Index Disjointness Check**: All left and right neuron index sets are disjoint:
  - $\text{Left Indices} = \{406, 725, 130496\}$
  - $\text{Right Indices} = \{332, 704, 1087\}$
  - $\text{Intersection} = \emptyset$
- **Audit Result**: Exactly one homologous neuron exists on each side for each of the three steering DN classes. No missing right-side neurons, duplicated populations, or indexing collisions exist.

### 2.6 Descending Readout Formulations (READOUT_A, READOUT_B, READOUT_C)
Audited from `src/connectome/candidate_readouts.mjs`:
- In `READOUT_C`:
  ```javascript
  const diffL = Math.max(0, turnLHz - turnRHz);
  const diffR = Math.max(0, turnRHz - turnLHz);
  const turnLStrength = turnLSilenced ? 0 : +(1.0 - Math.exp(-diffL / turnScale)).toFixed(3);
  const turnRStrength = turnRSilenced ? 0 : +(1.0 - Math.exp(-diffR / turnScale)).toFixed(3);
  ```
- **Algebraic Symmetry Check**:
  - Formulas for `turn_left` and `turn_right` are identical under transposition $L \leftrightarrow R$.
  - Exact empirical test in `dn_readout_symmetry.mjs` across intensities $[0.1, 0.25, 0.5, 1.0, 2.0, 5.0]\text{ Hz}$ confirmed:
    $$\text{Symmetry Error} = |\text{Left}(A) - \text{Right}(B)| + |\text{Right}(A) - \text{Left}(B)| = 0.000000$$
- **Audit Result**: READOUT_C is strictly mirror-symmetric. The readout layer introduces **zero** artificial lateral bias.

### 2.7 Actuator Mapping
- In `src/embodiment/rover/actuators.mjs` and candidate definitions:
  - `cand_turn_left` $\to$ `actuator_action: "left"`
  - `cand_turn_right` $\to$ `actuator_action: "right"`
- In rover kinematics:
  - `left` executes $\omega = +0.5\text{ rad/s}$
  - `right` executes $\omega = -0.5\text{ rad/s}$
- **Audit Result**: Actuators are mirror-symmetric and have equal magnitude gain.

---

## 3. Specific Pathology Check Results

| Check Item | Status | Finding |
|---|---|---|
| **Swapped signs** | CLEAN | All turn DNs are ACh ($+1$). Formula signs in readout and kinematics are consistent. |
| **Duplicated populations** | CLEAN | Steering DNs have exactly 1 neuron per hemisphere. |
| **Missing right-side neurons** | CLEAN | Homologous right DNs are present (`332`, `704`, `1087`). |
| **Indexing mistakes** | CLEAN | Disjoint left/right index sets. Side mapping $1 \leftrightarrow 2$ cleanly applied. |
| **Ipsilateral / Contralateral confusion** | CLEAN | Left stimulus drives left sensors; left sensors project to left DNs (ipsilateral steering). |
| **Unequal normalization** | CLEAN | Left and right candidate formulas use identical `turnScale = 1.5`. |
| **Accidental array reuse** | CLEAN | Fresh buffers allocated for Left and Right states. |
| **Asymmetric thresholds** | **DETECTED IN DYNAMICS / BIOLOGY** | The source connectome contains structural asymmetry in upstream sensory-to-DN recurrent pathways, acknowledged in upstream `motor.js` (line 79-81). Furthermore, tactile T1 sensory afferents exhibit a +31.3% receptor surplus on the left. |

---

## 4. Conclusion

The steering asymmetry does **not** arise from implementation defects, indexing errors, sign errors, or readout bias. All software pipelines are mirror-symmetric. The origin must be investigated in:
1. Receptor population size differences (e.g. tactile T1 151 vs 115)
2. Connectome graph topology (directed path reachability and synaptic weight distribution)
3. RateNetwork recurrent dynamics and inhibition/excitation balance.
