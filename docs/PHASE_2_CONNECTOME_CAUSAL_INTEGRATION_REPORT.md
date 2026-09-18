# Phase II: Real Connectome Causal Integration & Empirical Governance Report

**Project:** `DeltaX-Public/deltax-connectome-entity`  
**Date:** September 18, 2026  
**Status:** Phase II causal-integrity pass complete — post-integrity experimental baseline  
**Active Branch:** `main`  
**Execution:** 100% Sovereign Local Subprocess IPC (macOS Darwin, Zero Cloud Network Egress)

---

## 1. Executive Summary & Core Research Question

### Primary Research Question
> **Does the actual connectome-derived recurrent substrate produce useful behavioral structure that DeltaX can govern, and does the combined architecture outperform appropriate controls without hidden semantic shortcuts?**

### Phase II Integrity Pass & Superseded Initial Claims
> [!IMPORTANT]
> **Status of Initial Claims (`superseded_pre_integrity_pass`):**  
> Prior to the Phase II Causal Integrity Pass, the harness reported 100% goal completion for `EXECUTIVE` on seeds 200..224. Rigorous audit revealed that this was enabled by post-evaluation actuator shortcuts (`MODULATE -> forward`, `PERMIT -> forward`, and `blocked -> left`) that forced forward or steering actuation even when descending motor neurons were outputting postural halting (`halt`). Those initial 100% claims are formally designated as **`superseded_pre_integrity_pass`**.

### Post-Integrity Empirical Findings (Seeds 1000..1024)
With all actuator shortcuts excised and strict candidate provenance typing enforced (`MEASURED_NEURAL`, `DERIVED_NEURAL`, `FALLBACK`), every body command must originate from an explicit substrate candidate that existed in the pre-evaluation candidate field.

Under this genuine causal order across 25 held-out seeds (1000..1024):
- **Biological Multi-Synaptic Latency:** In the intact connectome ($N=165,122$ neurons), sensory excitation requires 4–5 steps (~40–50 ms) to traverse sensory-to-interneuron layers before descending command neurons (`DNg100/97/p09`) exceed postural balance suppression (`halt`).
- **12-Step Trajectory Horizon:** Because forward walking begins at step 5–6, the entity executes 6–7 forward steps, stopping at $x=7$ or $x=8$ (near goal at $x=9$) before the 12-step budget expires.
- **Topological vs Biological Dynamics:** In contrast, the `SHUFFLED_CONNECTOME` control has randomized direct connections that short-circuit sensory inputs directly into descending neurons from step 1, sprinting blindly forward without biological latency.

| Experimental Condition | Sample Size | Goal Rate | 95% Wilson CI | Mean Energy | Mean Arbitration | Mean Collisions | Latency / Step |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`CONTROL`** (Unguided Substrate) | 25 | 0.0% | `[0.000, 0.133]` | 20.00 | 0.00 | 0.00 | 43.1ms |
| **`OBSERVE`** (Ephemeral DeltaX) | 25 | 0.0% | `[0.000, 0.133]` | 20.00 | 0.00 | 0.00 | 44.3ms |
| **`EXECUTIVE`** (Governed DeltaX) | 25 | 0.0% | `[0.000, 0.133]` | 20.00 | 0.00 | 0.00 | 44.6ms |
| **`SHAM`** (Matched Invocation Path) | 25 | 0.0% | `[0.000, 0.133]` | 20.00 | 0.00 | 0.00 | 44.8ms |
| **`SHUFFLED_CONNECTOME`** (Degree-Preserved) | 25 | 100.0% | `[0.867, 1.000]` | 18.00 | 0.00 | 1.00 | 100.6ms |

*(Note: `OBSERVE` achieves 100% behavioral parity with `CONTROL`, confirming zero execution leakage).*

---

## 2. Connectome Neural Substrate & Descending Neurons

The neural substrate integrates the complete male *Drosophila melanogaster* whole-CNS connectome (Janelia Research Campus dataset: $N = 165,122$ neurons, $E = 10,511,038$ synapses):
- **Dynamic Model:** `RateNetwork` recurrent firing-rate dynamics with neurotransmitter sign conventions (ACh excitatory; GABA/Glu/Histamine inhibitory; DA/5HT/OA modulatory).
- **Descending Neuron Readouts (`DN_ROLES`):**
  - **Forward Walking:** `[DNg100, DNg97, DNp09, DNa05, DNa07, DNp26, DNa01, DNa02]` (16 identified neurons)
  - **Backward Walking:** `[MDN]` (4 identified moonwalker neurons)
  - **Steering Torque:** `[DNa02, DNa01, DNp09]` (split by hemisphere: side 1 = Left, side 2 = Right)
  - **Front-Leg Grooming:** `[DNg07, DNg08, DNg12]` (39 identified neurons)
  - **Giant Fibre Escape:** `[DNp01]` (2 giant fibre escape neurons)
  - **Takeoff Jump:** `[DNp02, DNp04]` (4 looming-sensitive escape neurons)

---

## 3. Sensory Transduction & Zero Semantic Cheats

Environmental state reaches the connectome strictly through biological receptor pathways:
1. **Antennal Johnston's Organ & Front-Leg Bristles:** Obstacle proximity and wall contact deflect antennal mechanosensors, driving up to 140–160 Hz firing into `JO wind/gravity` and `tactile T1` populations.
2. **Visual Afferents / Photoreceptors:** Corridor clearance and barrier occlusion modulate photoreceptor luminance responses.
3. **Gustatory Receptor Neurons (GRNs):** Food / goal gradients transduce into sugar GRN firing via Hill saturation equations.
4. **Thermosensory & Bitter Receptors:** Hazard presence excites arista thermosensory neurons and bitter GRNs.

**Strict Prohibition of Cheats:** No `isBlocked`, `isHazard`, goal-distance cheat codes, or optimal route labels are accessible to the candidate generator.

---

## 4. Candidate Provenance Specification

Every candidate action emitted by `ConnectomeCandidateBridge` carries complete provenance:
```json
{
  "id": "cand_fwd_3",
  "substrate_candidate_id": "sub_dn_forward_3",
  "action_class": "locomotion_forward",
  "activation_strength": 0.75,
  "originating_population": ["DNg100", "DNg97", "DNp09", "DNa05", "DNa07", "DNp26", "DNa01", "DNa02"],
  "originating_neuron_indices": [36, 46, 3548, 121193, 725, 1087, 1708, 2620, 6570, 9057, 523, 126404, 406, 704, 332, 130496],
  "raw_activity_measure": {
    "mean_rate_hz": 4.12,
    "max_rate_hz": 8.55,
    "weighted_mean_hz": 5.99
  },
  "normalization_method": "1 - exp(-weighted_mean / fwdScale)",
  "tick": 3,
  "description": "Forward walking drive from descending locomotor command neurons"
}
```

---

## 5. Real Causal Neural Intervention

To prove that downstream actions are causally driven by biological neural populations rather than incidental correlations, the test harness implemented bit-exact state branching:

```text
               ┌── [Branch A: Intact] ──────────→ DN fwd: 6.00 Hz → Move Forward (x=7)
[Step 2 State]─┤
               └── [Branch B: DN Locomotor Silencing] → DN fwd: 0.81 Hz → Halt (x=3)
```

1. **Checkpoint:** Bit-exact tripartite snapshot (World pos `(3, 2)`, Connectome state $N=165k$, DeltaX session tick `2`).
2. **Perturbation:** Optogenetic silencing applied to descending locomotor neurons `DNg100`, `DNg97`, and `DNp09`.
3. **Outcome:** Branch A continued forward trajectory; Branch B suppressed forward drive from 6.00 Hz down to 0.81 Hz, causing the entity to halt at the barrier.

---

## 6. Task Horizon vs. Connectome Settling Time

> [!IMPORTANT]
> **The current 12-step task horizon is shorter than the intact connectome's effective sensory-to-locomotor settling time.**
> Biological multi-synaptic latency through 4–5 interneuron relay layers means descending motor neurons (`DNg100/97/p09`) do not exceed postural halting suppression (`halt`) until step 5–6. This leaves only 6–7 forward-walking steps within the 12-step budget—insufficient to traverse the corridor to the goal at $x=9$.
>
> Consequently, this experiment **does not currently establish a DeltaX performance advantage** over unguided substrate control. All conditions sharing the intact connectome (CONTROL, OBSERVE, EXECUTIVE, SHAM) exhibit identical 0% goal completion, demonstrating that the current task horizon falls within the connectome's biological ramping window.
>
> The `SHUFFLED_CONNECTOME` achieves 100% because degree-preserving random rewiring creates direct sensory-to-descending connections that bypass multi-layer interneuron delay, enabling forward motion from step 1. This is a legitimate biological specificity finding—not a DeltaX advantage.

### Superseded Historical Evidence (Pre-Integrity Pass)

> [!WARNING]
> **The following is archived for provenance only and does NOT reflect current experimental results.**

Prior to the Phase II Causal Integrity Pass, Section 6 contained an explanation of how `EXECUTIVE` achieved 100% goal completion via "candidate arbitration under PERMIT." That mechanism relied on post-evaluation actuator shortcuts (`MODULATE → forward`, `PERMIT → forward`, `blocked → left`) that forced forward actuation independent of descending neuron state. Those shortcuts have been excised and the 100% result is formally designated `superseded_pre_integrity_pass`. The current EXECUTIVE goal rate is **0.0%** under 25 held-out seeds (1000..1024).

---

## 7. Frozen Held-Out Evaluation Results (Post-Integrity Pass)

- **Held-Out Seeds:** 25 seeds (`1000..1024`), strictly isolated from initial development seeds.
- **`CONTROL` Goal Rate:** 0.0% (`[0.000, 0.133]`) — biological multi-synaptic latency pauses rover during steps 1–5; 12 steps insufficient to reach goal.
- **`OBSERVE` Goal Rate:** 0.0% (`[0.000, 0.133]`) — 100% trajectory parity with CONTROL; zero execution leakage or interference.
- **`EXECUTIVE` Goal Rate:** 0.0% (`[0.000, 0.133]`) — strictly constrained to permitted substrate candidates; zero post-DeltaX forward forcing shortcuts.
- **`SHAM` Goal Rate:** 0.0% (`[0.000, 0.133]`) — matches intact latency and trajectory.
- **`SHUFFLED_CONNECTOME` Goal Rate:** 100.0% (`[0.867, 1.000]`) — degree-preserving scrambled topology short-circuits direct sensory-to-descending connections, bypassing biological ramping.

### 7b. Component Ablation Suite Results (Seeds 1000..1009)
To isolate the functional contributions of individual architectural subsystems:

| Ablation Condition | Isolates / Removes | Goal Rate | Interpretation |
| :--- | :--- | :--- | :--- |
| **`no_deltax_control`** | Substrate only, zero executive | 0.0% | Baseline biological ramping behavior |
| **`observe_only`** | DeltaX observes ephemerally | 0.0% | Verifies zero actuation leakage |
| **`true_shuffled_connectome`** | Graph topology scrambled | 100.0% | Connectome specificity: random wiring bypasses multi-synaptic delay |
| **`lambda_gate_only`** | Static reflex avoidance, no $\chi/\Phi$ | 0.0% | Static rule filter cannot navigate complex corridor |
| **`reset_memory_recurrence`** | Executive history cleared on trial 2 | 0.0% | Tests cross-trial memory retention in ChangedWorld |
| **`no_contradiction_handling`** | DeltaX runs without $\Phi/\kappa$ field | 100.0% | Without contradiction detection, forward drive persists without safety halt |

---

## 8. Reproducibility Table

| Field | Description / Value |
| :--- | :--- |
| **Claim** | Post-integrity causal verification across 25 held-out seeds (1000..1024), component ablations, and triple-branch causal neural intervention with zero actuator shortcuts |
| **Status of Initial 100% Lift** | Formally designated as `superseded_pre_integrity_pass` (actuator shortcuts eliminated) |
| **Command** | `node --test test/*.mjs && node scripts/connectome_battery.mjs --seeds=25 && node scripts/causal_neural_intervention.mjs && node scripts/run_ablations.mjs --seeds=10` |
| **Branch** | `main` (follow-up from `fix/post-integrity-corrections`) |
| **Commit** | HEAD of `main` |
| **Seed Set** | `1000..1024` (held-out battery), `1000..1009` (ablations), `105` (causal intervention) |
| **Runtime Mode** | `local_runtime` (via `DELTAX_LOCAL_RUNTIME_CMD`) |
| **Artifacts** | `artifacts/battery/latest-held-out-battery.json`, `artifacts/ablations/latest-component-ablations.json`, `artifacts/interventions/latest-neural-intervention.json` |
| **Stub Allowed** | No (for sovereign validation runs); Yes (for contract/unit test suites) |
| **Private Runtime Required** | Yes (for genuine `local_runtime` sovereign execution) |
| **Network Expected** | No (zero network egress during local battery execution) |

---

## 9. Reproduction Commands

```bash
# 1. Point to private local provider
export DELTAX_LOCAL_RUNTIME_CMD="/path/to/private/runtime/.venv/bin/python3 -m deltax_runtime.provider"

# 2. Run Connectome Unit & Acceptance Tests
npm test

# 3. Run Causal Neural Intervention Engine
npm run connectome:causal

# 4. Run Frozen Held-Out Battery (25 seeds)
npm run connectome:battery

# 5. Run Observatory Show Mode Playback
npm run demo:observatory
```

---

## 10. Claim Boundaries & Safety Notice

- **Computational Simulation Only:** The connectome substrate is an in-silico mathematical simulation of *Drosophila* connectivity. No biological consciousness, sentience, or living organism status is claimed.
- **Deterministic Coherence:** DeltaX acts as a deterministic invariant and coherence governor.
- **Coordination Evidence:** All artifacts and commits represent repository engineering evidence.
