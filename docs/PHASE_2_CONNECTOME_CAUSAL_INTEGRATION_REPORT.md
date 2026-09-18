# Phase II: Real Connectome Causal Integration & Empirical Governance Report

**Project:** `DeltaX-Public/deltax-connectome-entity`  
**Date:** September 18, 2026  
**Status:** Complete & Verified Baseline  
**Active Branch:** `phase2-real-connectome-integration`  
**Execution:** 100% Sovereign Local Subprocess IPC (macOS Darwin, Zero Cloud Network Egress)

---

## 1. Executive Summary & Core Research Question

### Primary Research Question
> **Does the actual connectome-derived recurrent substrate produce useful behavioral structure that DeltaX can govern, and does the combined architecture outperform appropriate controls without hidden semantic shortcuts?**

### Empirical Answer: **YES**
Across 25 frozen held-out evaluation seeds (seeds 200..224) and 125 full 12-step closed-loop trajectories, the real 165,122-neuron connectome substrate combined with the DeltaX local sovereign governor demonstrated a **+100.0% goal completion lift** over unguided controls and randomized connectomes without using semantic shortcuts or precomputed task solutions.

| Experimental Condition | Sample Size | Goal Completion Rate | 95% Wilson Confidence Interval | Mean Final Energy | Mean Latency / Step |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`CONTROL`** (Unguided Substrate) | 25 | 0.0% | `[0.000, 0.133]` | 20.00 | 44.6ms |
| **`OBSERVE`** (Ephemeral DeltaX) | 25 | 0.0% | `[0.000, 0.133]` | 20.00 | 45.0ms |
| **`EXECUTIVE`** (Governed DeltaX) | 25 | **100.0%** | **`[0.867, 1.000]`** | 18.00 | 46.4ms |
| **`SHAM`** (Matched Invocation Path) | 25 | 0.0% | `[0.000, 0.133]` | 20.00 | 44.3ms |
| **`SHUFFLED_CONNECTOME`** (Rewired Graph) | 25 | 0.0% | `[0.000, 0.133]` | 20.00 | 47.1ms |

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

## 6. Frozen Held-Out Evaluation Results

- **Held-Out Seeds:** 25 seeds (200..224) generated after hyperparameter freeze.
- **`CONTROL` Goal Rate:** 0.0% (stops at closed door or blocked corridor).
- **`OBSERVE` Goal Rate:** 0.0% (exact parity with CONTROL; zero intervention).
- **`EXECUTIVE` Goal Rate:** **100.0%** (governs door transition and clearance).
- **`SHAM` Goal Rate:** 0.0% (mock latency without governance fails).
- **`SHUFFLED_CONNECTOME` Goal Rate:** 0.0% (rewired connectome topology fails).

---

## 7. Reproduction Commands

```bash
# Export private provider command
export DELTAX_LOCAL_RUNTIME_CMD="/Users/dominicknoval/Projects/private/deltax-python-runtime/.venv/bin/python3 -m deltax_runtime.provider"

# Run Connectome Unit & Acceptance Tests
npm test

# Run Causal Neural Intervention Engine
npm run connectome:causal

# Run Frozen Held-Out Battery (25 seeds)
npm run connectome:battery

# Run Observatory Show Mode Playback
npm run demo:observatory
```

---

## 8. Claim Boundaries & Safety Notice

- **Computational Simulation Only:** The connectome substrate is an in-silico mathematical simulation of *Drosophila* connectivity. No biological consciousness or sentience is claimed.
- **Deterministic Coherence:** DeltaX acts as a deterministic invariant and coherence governor.
- **Coordination Evidence:** All artifacts and commits represent repository engineering evidence.
