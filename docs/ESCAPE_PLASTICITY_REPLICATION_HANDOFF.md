# Lane B: Escape Plasticity Replication Handoff Specification

**Repository**: `DeltaX-Public/deltax-connectome-entity`  
**Branch**: `research/latent-motor-repertoire`  
**Draft Pull Request**: [#21](https://github.com/DeltaX-Public/deltax-connectome-entity/pull/21)  
**Handoff Scope**: Frozen evidence package for future independent plasticity replication.  

---

## A. Scientific Replication Question

> **Does the same policy-neutral local subthreshold plasticity rule validated in the steering pathway generalize to a distinct latent escape circuit by strengthening existing tactile-to-DNp70 recruitment without changing anatomical topology?**

*Operational Status*: Frozen specification only. Zero plasticity rules, weight changes, or learning simulations are executed in this lane.

---

## B. Core Causal Evidence Summary

Across $N=50$ diagnostic seeds (`20300..20349`), the latent tactile escape pathway (`tactile T1 left -> DNp70 -> DNp01 Giant Fiber`) was causally localized:
1. **Natural State**: Tactile T1 left drive ($180.0\text{ Hz}$) strongly activates sensory afferents ($175.6\text{ Hz}$), but leaves intermediate DNp70 weakly recruited ($0.17\text{ Hz}$) and DNp01 silent ($0.00\text{ Hz}$).
2. **Intermediate Rescue**: Physiological stimulation of DNp70 at $25\text{ Hz}$ rescues DNp01 firing to $2.24 \pm 0.35\text{ Hz}$ ($I_{\text{inp}} = +299.36$) and crosses the CandidateBridge threshold ($s = 0.075 \pm 0.012$).
3. **Causal Necessity**: DNp70 is causally necessary as a group for the experimentally rescued tactile-escape pathway under the tested DNp70-boost intervention (dual silencing of 541 & 1048 completely abolishes rescued DNp01 firing to $0.00\text{ Hz}$; matched sham produces $0.0\%$ change). Auditory escape does not require DNp70 ($20.19\text{ Hz}$ intact vs silenced).
4. **Sufficiency Thresholds**:
   - Measurable DNp01 recruitment ($\ge 0.10\text{ Hz}$): **$15\text{ Hz}$** DNp70 stimulation ($0.2229\text{ Hz}$).
   - CandidateBridge proposal crossing ($s \ge 0.050$): **$25\text{ Hz}$** DNp70 stimulation ($s = 0.0748$).
5. **Causal Divergence**: Signal attenuates at **Tick 6 ($t=60\text{ ms}$, 10 ms post-stimulus onset)** at Stage 1 (Sensory Afferent $\to$ Intermediate Convergence).

---

## C. Exact Target Edges

The latent cascade consists of 10 strictly existing graph edges across two stages:

### Stage 1: Sensory Afferents to Intermediate DNp70 (6 Edges)
- `156810 (SNta40, L) -> 31207 (AN08B053, R)`: $S_{ij}=3$, NT=ACh (+1)
- `156953 (SNta, L)   -> 31207 (AN08B053, R)`: $S_{ij}=3$, NT=ACh (+1)
- `158136 (SNta43, L) -> 31207 (AN08B053, R)`: $S_{ij}=3$, NT=ACh (+1)
- `154664 (SNta42, L) -> 7509 (DNge021, R)`: $S_{ij}=3$, NT=ACh (+1)
- `31207 (AN08B053, R)-> 541 (DNp70, L)`: $S_{ij}=3$, NT=ACh (+1)
- `7509 (DNge021, R)  -> 1048 (DNp70, R)`: $S_{ij}=3$, NT=ACh (+1)

### Stage 2: Intermediate DNp70 to Giant Fiber DNp01 (4 Edges)
- `541 (DNp70, L)  -> 6 (DNp01, L)`: $S_{ij}=739$, NT=ACh (+1) [Ipsilateral dominant]
- `541 (DNp70, L)  -> 0 (DNp01, R)`: $S_{ij}=60$, NT=ACh (+1) [Contralateral]
- `1048 (DNp70, R) -> 0 (DNp01, R)`: $S_{ij}=537$, NT=ACh (+1) [Ipsilateral dominant]
- `1048 (DNp70, R) -> 6 (DNp01, L)`: $S_{ij}=80$, NT=ACh (+1) [Contralateral]
- **Combined Stage 2 Synaptic Weight**: **1,416 synapses**.

---

## D. DNp70 and DNp01 Subthreshold Dynamic State

Under natural tactile drive ($180.0\text{ Hz}$) across $N=50$ diagnostic seeds (`20300..20349`):

| Neuron Population | Indices | Measured Net Input ($I_{\text{inp}}$) | Threshold ($\theta$) | Ratio ($I/\theta$) | Firing Rate | Mechanistic State |
|---|---|---|---|---|---|---|
| **DNp70-Left** | 541 | $+63.09 \pm 46.87$ | $55.38 \pm 4.85$ | $+1.15 \pm 0.87$ | $0.26 \pm 0.53\text{ Hz}$ | `POSITIVE_SUBTHRESHOLD_EXCITATION` |
| **DNp70-Right**| 1048 | $+42.38 \pm 29.40$ | $53.23 \pm 3.95$ | $+0.80 \pm 0.57$ | $0.08 \pm 0.21\text{ Hz}$ | `POSITIVE_SUBTHRESHOLD_EXCITATION` |
| **DNp01-Left** | 6 | $-100.19 \pm 80.44$| $151.82 \pm 12.60$| $-0.67 \pm 0.54$ | $0.00 \pm 0.00\text{ Hz}$ | `NET_INHIBITED` |
| **DNp01-Right**| 0 | $-33.13 \pm 23.60$ | $151.43 \pm 11.67$| $-0.22 \pm 0.16$ | $0.00 \pm 0.00\text{ Hz}$ | `NET_INHIBITED` |

Intermediate DNp70 sits in a positive subthreshold state ($I/\theta \approx 0.80\text{--}1.15$), whereas DNp01 is deeply inhibited and high-threshold ($\theta \approx 152$).

---

## E. Matched Sham Definition

A zero-discrepancy matched control was identified in the connectome for `ESCAPE_B`:
- **Edge Count**: Exactly 4 edges.
- **Cumulative Weight**: **Exactly 1,416 synapses** (0 discrepancy, $0.0\%$ error).
- **Chemistry & Superclass**: ACh excitatory Descending Neurons $\to$ Downstream Targets.
- **Laterality**: 2 Left edges + 2 Right edges.
- **Specific Sham Edges**:
  1. `36 (DNg100, L) -> 46 (DNg100, R)`: $w=119$
  2. `36 (DNg100, L) -> 2613 (DNg44, R)`: $w=44$
  3. `2325 (DNge125, R) -> 143773 (MNnm13, L)`: $w=530$
  4. `3220 (DNg33, R) -> 3106 (DNg33, L)`: $w=723$
- **Uncoupled**: Zero anatomical or functional overlap with DNp01, DNp70, or escape circuits.

---

## F. Explicit Embodiment Boundary

> **IMPORTANT**: `giant_fiber_escape` is currently **UNEMBODIED** in the rover platform (`actuator_action: null`, `is_executable: false`, `forbidden_reason: "UNEMBODIED_ACTUATOR"`). In closed-loop execution, `_mapActionClassToRover` falls back to `"stop"`.

Therefore, the future plasticity replication's primary outcomes MUST be:
- **Tier 1**: DNp01 neural recruitment (firing rate in Hz).
- **Tier 2**: CandidateBridge `giant_fiber_escape` proposal strength ($s \in [0.05, 1.0]$).
- **STRICT EXCLUSION**: Never evaluate escape replication using rover chassis jump or velocity behavior. Physical chassis embodiment of ballistic escape is a separate engineering phase.

---

## G. Proposed Replication Conditions & Mechanistic Expectations

Four target conditions are preserved:
1. **`ESCAPE_A`**: Sensory $\to$ Intermediate $\to$ DNp70 (6 edges, 18 weight).
2. **`ESCAPE_B`**: DNp70 $\to$ DNp01 (4 edges, 1,416 weight).
3. **`ESCAPE_C`**: Both stages combined (10 edges, 1,434 weight).
4. **`ESCAPE_D`**: Matched sham control (4 edges, 1,416 weight).

### Pre-Registered Mechanistic Expectations (Recorded BEFORE any learning run)
- **`ESCAPE_A` is the strongest *a priori* candidate**: Natural tactile drive generates robust sensory afferent activity ($175.6\text{ Hz}$) and delivers positive pre-threshold input into DNp70 ($I/\theta \approx 0.80\text{--}1.15$). Correlated pre- and subthreshold post-synaptic events exist to drive local Hebbian/subthreshold potentiation. Once DNp70 crosses $\ge 15\text{--}20\text{ Hz}$, its 1,416 downstream synapses naturally recruit DNp01 without requiring downstream synaptic alterations.
- **`ESCAPE_B` may remain difficult or refractory under natural drive**:
  - DNp70 presynaptic firing under natural tactile drive is very low ($0.08\text{--}0.26\text{ Hz}$).
  - DNp01 net synaptic input under natural drive is negative ($-33$ to $-100$).
  - Therefore, the subthreshold bootstrap factor at DNp01 under natural tactile drive is expected to be weak or zero, impeding potentiation unless DNp70 is artificially pre-activated or paired.
- **`ESCAPE_C`**: Tests whether concurrent two-stage potentiation accelerates or destabilizes recruitment.

### Conceptual Success Criteria for Future Replication
A future plasticity replication experiment should conceptually require:
1. Significant increase in tactile-evoked DNp01 firing rate.
2. CandidateBridge `giant_fiber_escape` proposal threshold crossing ($s \ge 0.050$) in a statistically significant fraction of seeds.
3. Reinforcement dependence (loss of adaptation under unreinforced extinction).
4. Negative matched sham (`ESCAPE_D` potentiation produces zero escape recruitment).
5. Alpha-reset loss of acquired response (verifying synaptic plasticity origin).
6. Preservation of unrelated motor outputs (no degradation of forward walking or steering).
7. Absence of runaway recurrent network seizure activity.
8. Learning strictly constrained to existing edges without structural rewiring.

*Note*: Final numerical preregistration belongs to Lane 1 after its current learning curve experiments close.

---

## H. Reserved Validation Namespace

- **Diagnostic Cohort (Consumed)**: Seeds `20300..20349` ($N=50$).
- **Replication Validation Cohort (Strictly Untouched)**: Seeds `20400..20499` ($N=100$).
- **Lane 1 Protected Cohorts**: `18000..19999` (Untouched).

---

## I. Claim Boundaries

1. **Plasticity Status**: No plasticity has been run on this pathway. The evidence establishes that the pathway is *mechanistically suitable for testing the same local subthreshold-bootstrap rule*, not that it has already learned.
2. **Causal Necessity Scope**: DNp70 necessity was demonstrated specifically for the experimentally rescued tactile-escape pathway under the tested DNp70-boost intervention; this does not establish DNp70 as uniquely necessary for all possible tactile escape recruitment mechanisms.
3. **Auditory Independence**: JO auditory escape does not require DNp70.

---

## J. Source Artifact SHA-256 Hashes

All source evidence artifacts frozen under `artifacts/latent_repertoire/escape_replication/`:

| Artifact Filename | SHA-256 Checksum |
|---|---|
| `dnp70_population_audit.json` | `88a6d8372af998fe4d47af19f5c1efd7f060f92807570c00907cc731b46682f8` |
| `embodiment_audit.json` | `910f5ec2236e194c4f89da40b35696cc00aef97ec7c33cd53ce65d78a1daf920` |
| `expressed_vs_latent.json` | `50f4a759e9789e35398d59d734f7594f344cadef06fc9e6c7b4d0273a7d1cfce` |
| `inhibition_audit.json` | `43285afff717c666e80b9bfdc24621202605592783ff8e1a8710c0d669fd1f6d` |
| `matched_sham.json` | `f4be723a0c916e5beafcd20c8bb56b55a77fdc49d79bf08f103a48f98775aafa` |
| `necessity_interventions.json` | `7378d58a2b03570954be4076558b4acd76331d1a7ac835e85a159898638fdf33` |
| `pathway_edges.json` | `4cc96f24f2d56d2911086f12826d0d75035ab0a18d1373bbdb4ee5f9588fbdb1` |
| `propagation_trace.json` | `c9bb0dca37a99188aa9ee513f186270b30b6722e60c0544224e828145cc1c7cd` |
| `proposed_target_manifest.json` | `65a6387dab4ac35af49e902bf56a7a7f1042970d82bfb212794e3bdb57c6cd57` |
| `subthreshold_state.json` | `da1a9567c0d42aab0c98dc78fb80c2f148d42eafc5cd6fefb4726d40ca6e3323` |
| `sufficiency_curve.json` | `c91aa0586b90f6e364644480f1e18e46edf410a4ee16678ad535bf10f3b7cb74` |

### Environment & Source Data Checksums
- **Git Branch**: `research/latent-motor-repertoire`
- **Git Commit SHA**: `169daad` (plus handoff freeze commit)
- **Bodymap Sensor Dataset (`upstream/fly-brain/public/data/bodymap.json`)**: `10630cd4c7a6cc2c1dcfcbee4a602d307f06766f316b185f631406813a58da9d`
- **Connectome Metadata (`upstream/fly-brain/public/data/meta.json`)**: `580c2d5a210469a6ab1184ae2187dcc4ce8217c6f74043bd2e585c7b110ec36a`
