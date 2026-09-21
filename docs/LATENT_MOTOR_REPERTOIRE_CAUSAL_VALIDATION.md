# Latent Motor Repertoire: Causal Validation & Claim Boundary Calibration

> [!NOTE] Historical Document — Completed Research Lane B
> This causal validation concluded Parallel Research Lane B and was merged into `main` via PR #21 (commit `c1341b0`). Evaluated on diagnostic seeds `20000..20049` and validated on bilateral seeds `20200..20299`. Lane 1 development seeds `18000..18299` and reserved Phase IV-D held-out seeds `19000..19099` remained strictly untouched.

**Lane**: Parallel Research Lane B (Diagnostic and Comparative)
**Repository**: `DeltaX-Public/deltax-connectome-entity`
**Branch**: `research/latent-motor-repertoire` (Merged: PR #21, commit `c1341b0`)
**Base Commit**: `3897690` (`origin/main`)
**Status**: COMPLETE (Merged into main via PR #21)
**Date**: September 2026
**Governing Boundaries**: Zero plasticity implemented, zero weights altered, Lane 1 development (`18000..18299`) and Phase IV-D held-out (`19000..19099`) strictly untouched.

---

## 1. Seed-Count Reconciliation Audit

A comprehensive audit of the diagnostic seed usage across all Phase 1/2 atlas artifacts was conducted to reconcile the allocated development namespace against empirical per-script execution batches:

| Artifact Name | Execution Type | Declared Namespace | Empirical Sample Size ($N$) | Exact Seeds Evaluated |
|---|---|---|---|---|
| `sensory_motor_matrix.json` | Dynamic simulation | `20000..20049` | $N = 10$ | `20000..20009` |
| `structural_reachability.json` | Deterministic BFS | N/A | $N = 1$ | N/A (Static CSR graph) |
| `classification.json` | Synthesis | N/A | Derived ($N=10$) | Synthesized from upstream |
| `bilateral_symmetry.json` | Synthesis | N/A | Derived ($N=10$) | `20000..20009` |
| `dynamics_bottlenecks.json` | Biophysical sampling | `20000..20049` | $N = 3$ | `20000..20002` |
| `direct_output_viability.json` | Downstream readout | `20000..20049` | $N = 1$ | `20000` (Rate sweeps) |
| `intermediate_rescue.json` | Intervention sweep | `20000..20049` | $N = 5$ | `20000..20004` |
| `bilateral_validation_20200_20299.json` | Fresh held-out validation | `20200..20299` | **$N = 100$** | **`20200..20299`** |

**Conclusion**: The `20000..20049` ($N=50$) block represented the reserved diagnostic development namespace allocated to Lane B. Individual exploratory scripts ran representative batches ($N=10$, $N=5$, $N=3$, $N=1$) within that reserved namespace. The causal validation phase was subsequently conducted on a completely held-out, fresh namespace: **`20200..20299` ($N=100$)**.

*Artifact Reference*: `artifacts/latent_repertoire/validation/seed_usage_audit.json`

---

## 2. Separation of Structural Reachability from Functional Support

A core finding of this causal validation is that **directed graph reachability within 1–3 hops in a 10.5-million-edge connectome is not synonymous with a biologically plausible functional motor pathway.**

To prevent unjustified claims of "latency," the framework enforces four distinct evidentiary criteria:
1. **Graph Reachability**: Directed path exists in the CSR adjacency matrix (necessary but insufficient).
2. **Sensory-Domain Biological Plausibility**: The sensory modality naturally drives the motor program in vivo (e.g. tactile front-leg obstacle avoidance $\to$ steering; acoustic startle $\to$ escape jump; mechanical debris $\to$ grooming).
3. **Valid Sensory Transduction**: The digital substrate stimulus array accurately captures the relevant biophysical signal features.
4. **Dynamical Recruitment & Viability**: The target descending population is downstream-viable and can be causally un-gated by physiological intermediate recruitment.

### Reclassification of Visual / Looming Pathways
Visual pathways into escape (`DNp01`) and takeoff (`DNp02`/`DNp04`) possess massive synaptic connectivity (8,000–10,000 synaptic weights). However, the bodymap visual array represents **flat, uncalibrated photoreceptors without optical flow, T4/T5 directional selectivity, or lobula columnar (LC4/LPLC2) expansion feature extraction.**
Treating visual looming silence as "connectome motor latency" is an artifact of stimulus inadequacy. Consequently, all visual pathways are reclassified as **`TRANSDUCTION_LIMITED`** and quarantined from general connectome motor silence claims.

---

## 3. High-Confidence Validation Panel

A frozen panel of 12 representative pathways was evaluated across functional, structural, and causal dimensions:

| ID | Sensory Channel | Motor Program | Panel Role | Atlas Evoked Rate | Structural Weight (Hops) | Revised Causal Classification |
|---|---|---|---|---|---|---|
| `tactile_t1_l_to_turn_l` | `tactile T1 left` | `turn_left` | Robust Positive Control | **0.959 Hz** | 826 (2 hops) | **ROBUSTLY_EXPRESSED** |
| `tactile_t1_r_to_turn_r` | `tactile T1 right` | `turn_right` | Latent Reference Case | **0.0005 Hz** | 751 (2 hops) | **FUNCTIONALLY_LATENT** |
| `jo_aud_l_to_escape` | `JO auditory left` | `giant_fiber_escape` | Robust Positive Control | **15.327 Hz** | 674 (1 hop) | **ROBUSTLY_EXPRESSED** |
| `jo_aud_r_to_escape` | `JO auditory right` | `giant_fiber_escape` | Bilateral Asymmetry Pair | **0.000 Hz** | 2,980 (2 hops) | **FUNCTIONALLY_LATENT** |
| `tactile_t1_l_to_escape` | `tactile T1 left` | `giant_fiber_escape` | Latent Deep-Dive Candidate | **0.000 Hz** | 12,848 (3 hops) | **FUNCTIONALLY_LATENT** |
| `tactile_t1_r_to_escape` | `tactile T1 right` | `giant_fiber_escape` | Latent Candidate | **0.000 Hz** | 10,884 (3 hops) | **FUNCTIONALLY_LATENT** |
| `tactile_t1_l_to_groom` | `tactile T1 left` | `front_leg_groom` | Plausible Candidate | **0.000 Hz** | 3 (2 hops) | **UNRESOLVED** |
| `tactile_t1_r_to_groom` | `tactile T1 right` | `front_leg_groom` | Plausible Candidate | **0.000 Hz** | 1,372 (3 hops) | **UNRESOLVED** |
| `jo_wind_l_to_turn_l` | `JO wind left` | `turn_left` | Weak Pathway | **0.082 Hz** | 1,251 (2 hops) | **WEAKLY_EXPRESSED** |
| `jo_wind_r_to_turn_r` | `JO wind right` | `turn_right` | Weak Pathway | **0.015 Hz** | 1,353 (2 hops) | **WEAKLY_EXPRESSED** |
| `visual_l_to_takeoff` | `visual left` | `looming_takeoff` | Transduction Limit | **0.000 Hz** | 10,420 (3 hops) | **TRANSDUCTION_LIMITED** |
| `visual_l_to_escape` | `visual left` | `giant_fiber_escape` | Transduction Limit | **0.000 Hz** | 8,077 (3 hops) | **TRANSDUCTION_LIMITED** |

*Artifact Reference*: `artifacts/latent_repertoire/validation/high_confidence_panel.json`

---

## 4. Causal Inhibition vs Excitatory Sufficiency Testing

To test the hypothesis that motor silence is caused by direct synaptic inhibition, five controlled conditions were evaluated on every non-transduction-limited panel pathway:
- **Condition A**: Intact sensory drive ($180\text{ Hz}$)
- **Condition B**: Optogenetic silencing of strongest direct presynaptic inhibitory input
- **Condition C**: Silencing of top 5 direct presynaptic inhibitory inputs
- **Condition D**: Matched inhibitory sham population
- **Condition E**: Preservation of inhibition + physiological boost ($15\text{--}25\text{ Hz}$) of top excitatory intermediary

### Experimental Findings

```
┌─────────────────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Pathway ID              │ Cond A (Hz) │ Cond B (Hz) │ Cond C (Hz) │ Cond D Sham │ Cond E Exc  │
├─────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ tactile_t1_l_to_turn_l  │      0.4770 │      0.4770 │      0.4770 │      0.4770 │   1.5169 Hz │
│ tactile_t1_r_to_turn_r  │      0.0000 │      0.0000 │      0.0000 │      0.0000 │   0.5043 Hz │
│ jo_aud_l_to_escape      │     31.0911 │     31.0931 │     31.3860 │     31.0911 │  34.3938 Hz │
│ jo_aud_r_to_escape      │      0.0000 │      0.0000 │      0.0000 │      0.0000 │   0.9288 Hz │
│ tactile_t1_l_to_escape  │      0.0000 │      0.0000 │      0.0000 │      0.0000 │   0.8882 Hz │
│ tactile_t1_r_to_escape  │      0.0000 │      0.0000 │      0.0000 │      0.0000 │   0.4505 Hz │
│ tactile_t1_l_to_groom   │      0.0000 │      0.0000 │      0.0000 │      0.0000 │   0.0128 Hz │
│ tactile_t1_r_to_groom   │      0.0000 │      0.0000 │      0.0000 │      0.0000 │   0.0321 Hz │
│ jo_wind_l_to_turn_l     │      0.0003 │      0.0003 │      0.0004 │      0.0003 │   0.6958 Hz │
│ jo_wind_r_to_turn_r     │      0.1454 │      0.1454 │      0.1454 │      0.1454 │   0.8145 Hz │
└─────────────────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### Mechanistic Conclusions
1. **Direct Presynaptic Inhibition Explains 0% of the Deficit**: Silencing direct inhibitory inputs onto descending neurons produced **$0.00\text{ Hz}$ recovery** across all silent pathways. Direct inhibition is not the primary gating mechanism.
2. **Polysynaptic Inhibitory Opposition**: For escape pathways (`tactile T1 -> DNp01`), net synaptic current is heavily negative ($I_{\text{inp}} = -73.9\text{ model units}$). The sensory drive activates large networks of upstream inhibitory interneurons that prevent depolarizing current from accumulating.
3. **Insufficient Excitatory Convergence**: For steering pathways (`tactile T1 right -> turn_right`), synaptic input is net-positive ($I_{\text{inp}} = +14.58$), but fails to cross the intrinsic threshold ($\theta = 98.46$). Boosting the identified ascending interneuron (`AN03A008`) **completely rescues firing ($0.5043\text{ Hz}$, candidate strength $0.3308$)** without altering inhibition.

*Artifact References*:
- `artifacts/latent_repertoire/validation/inhibition_interventions.json`
- `artifacts/latent_repertoire/validation/excitation_interventions.json`
- `artifacts/latent_repertoire/validation/causal_bottleneck_classification.json`

---

## 5. Right-Steering Positive Reference Validation

The known reference pathway:
$$\text{tactile T1 right} \longrightarrow \text{AN03A008 (idx 2937)} \longrightarrow \text{DNa02 (idx 332)}$$
was recovered with complete fidelity:
- **Intact**: $r = 0.0000\text{ Hz}$, $I_{\text{inp}} = +14.58$, $\theta = 98.46$.
- **Direct Inhibition Removal**: $\Delta r = 0.0000\text{ Hz}$ ($0\%$ recovery).
- **Excitatory Intermediate Boost (`AN03A008` @ 20 Hz)**: $r = 0.5043\text{ Hz}$, Candidate Strength = $0.3308$.
- **Causal Bottlenecks**: `INSUFFICIENT_EXCITATORY_CONVERGENCE` + `HIGH_INTRINSIC_THRESHOLD`.
- **Validation Outcome**: **CONFIRMED.** The causal framework accurately captures the established reference phenotype.

---

## 6. Deep Causal Dive: Second Latent Pathway (`tactile T1 left -> DNp01`)

To test whether the latent phenomenon generalizes beyond steering, a second non-visual, non-steering pathway was audited with single-neuron resolution:

$$\text{Tactile T1 Left (151 afferents)} \longrightarrow \text{DNp70 (idx 541, 1048)} \longrightarrow \text{DNp01 Giant Fiber (idx 0, 6)}$$
$$\text{Comparator: JO Auditory Left (62 afferents)} \longrightarrow \text{DNp01 Giant Fiber (idx 0, 6)}$$

### Layer-by-Layer Signal Trace

```
Tactile T1 Left Drive:
[Sensory: 87.85 Hz] ──(weak convergence)──> [DNp70: 0.138 Hz] ──(sub-threshold + inh)──> [DNp01: 0.000 Hz, Inp: -47.73]

JO Auditory Left Drive:
[Sensory: 78.78 Hz] ──────────────────────(direct 1-hop: 674 weight)──────────────────> [DNp01: 15.55 Hz, Inp: +923.10]
```

### First Functional Divergence
1. **Sensory-to-Intermediate Attenuation**: While tactile afferents fire vigorously ($87.85\text{ Hz}$), intermediate `DNp70` fails to depolarize above threshold ($0.138\text{ Hz}$).
2. **Polysynaptic Inflow**: Tactile drive concurrently recruits lateral inhibitory interneurons (`PVLP010`, `SAD109`, `SAD091`), driving `DNp01` net current negative ($-47.73$).
3. **Causal Rescue**: Stimulating intermediate `DNp70` at $25\text{ Hz}$ during tactile drive successfully un-gates `DNp01` to **$1.8244\text{ Hz}$** ($s = 0.061$).

*Artifact Reference*: `artifacts/latent_repertoire/validation/second_pathway_deep_dive.json`

---

## 7. Held-Out Seed Bilateral Asymmetry Validation ($N=100$, Seeds `20200..20299`)

The top bilateral asymmetry cases were re-evaluated across $N=100$ held-out seeds to verify directional persistence and distinguish structural from dynamical laterality:

| Case | Left Mean (Hz) | Right Mean (Hz) | Mean Difference (95% CI) | Dynamical Asymmetry Index | Structural Asymmetry Index | Direction Consistency | Classification |
|---|---|---|---|---|---|---|---|
| **Tactile T1 Steering** | 0.0445 | 0.0000 | **+0.0445** [0.0396, 0.0494] | **1.0000** | 0.0476 | **100.0% (100/100)** | **PURE_DYNAMICAL_ASYMMETRY** |
| **JO Auditory Escape** | 10.4061 | 0.0000 | **+10.4061** [10.1414, 10.6708] | **1.0000** | 0.9340 | **100.0% (100/100)** | **STRUCTURAL_DYNAMICAL_ASYMMETRY** |
| **JO Wind Steering** | 0.0065 | 0.0135 | **-0.0070** [-0.0096, -0.0044] | 0.3506 | 0.0392 | 76.0% (76/100) | SYMMETRIC / NOISE |
| **Tactile T1 Escape** | 0.0000 | 0.0000 | **0.0000** [0, 0] | 0.0000 | 0.0828 | 0.0% (0/100) | DYNAMICALLY_SILENT |
| **Tactile T1 Grooming** | 0.0000 | 0.0000 | **0.0000** [0, 0] | 0.0000 | 0.9956 | 0.0% (0/100) | STRUCTURAL_ASYM_WITHOUT_EFFECT |
| **Thermosensory Steering**| 0.0185 | 0.0299 | **-0.0114** [-0.0161, -0.0067] | 0.2360 | 0.9990 | 68.0% (68/100) | SYMMETRIC / SUB-THRESHOLD |

### Core Insights
- **Tactile Steering Asymmetry is Invariant**: Left steering is strictly greater than right steering across **$100\%$ of all 100 seeds** ($p < 10^{-15}$). Because structural asymmetry is tiny ($0.0476$), this is a **pure dynamical asymmetry** emergent from recurrent connectome propagation.
- **Acoustic Escape Asymmetry is Structurally Driven**: `JO auditory left` connects directly to `DNp01` (674 weight), whereas `JO auditory right` lacks equivalent 1-hop projections ($0.9340$ structural asymmetry), driving $100\%$ left-lateralized jump response.

*Artifact Reference*: `artifacts/latent_repertoire/validation/bilateral_validation_20200_20299.json`

---

## 8. Revised Latent-Repertoire Classification & Claim Boundaries

### Corrected Claim Boundaries
> **Permissible Broad Conclusion**: Under the tested sensory encodings and RateNetwork dynamics, many structurally reachable sensory-to-motor pathways remain weak or silent, with multiple causal mechanisms contributing (polysynaptic inhibitory opposition, insufficient excitatory convergence, high intrinsic thresholds, and transduction limitations). **Directed graph reachability $\ne$ biological functional pathway.**

### Full Repertoire Distribution (180 Pathways / 200 Entries)

```
┌─────────────────────────────────────────────┬───────┬────────────┐
│ Refined Classification                      │ Count │ Percentage │
├─────────────────────────────────────────────┼───────┼────────────┤
│ ROBUSTLY_EXPRESSED                          │    22 │      11.0% │
│ WEAKLY_EXPRESSED                            │    35 │      17.5% │
│ FUNCTIONALLY_LATENT                         │    11 │       5.5% │
│ TRANSDUCTION_LIMITED                        │    18 │       9.0% │
│ READOUT_LIMITED                             │    36 │      18.0% │
│ STRUCTURALLY_UNSUPPORTED                    │    20 │      10.0% │
│ UNRESOLVED                                  │    58 │      29.0% │
└─────────────────────────────────────────────┴───────┴────────────┘
```

*Artifact Reference*: `artifacts/latent_repertoire/validation/revised_classification.json`

---

## 9. Future Independent Plasticity Replication Candidates

Two pathways have now satisfied all prerequisite criteria for future independent plasticity replication:
1. **Prime Candidate**: $\text{tactile T1 right} \longrightarrow \text{AN03A008} \longrightarrow \text{DNa02}$ (Turn Right Steering).
   - Proven downstream viability (`turn_right` rover actuator).
   - Proven intermediate un-gating ($0.5043\text{ Hz}$, candidate strength $0.3308$).
   - Bilateral homologous control (`tactile T1 left` intact positive control).
2. **Secondary Candidate**: $\text{tactile T1 left} \longrightarrow \text{DNp70} \longrightarrow \text{DNp01}$ (Giant Fiber Jump Escape).
   - Proven downstream viability (`giant_fiber_escape`).
   - Proven intermediate un-gating ($1.8244\text{ Hz}$).
   - Clear mechanosensory acoustic startle comparator.

*Protocol Reminder: Zero plasticity has been implemented. Lane B terminates strictly prior to any learning rules or weight modifications.*
