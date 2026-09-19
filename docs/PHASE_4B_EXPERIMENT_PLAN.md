# Phase IV-B: Pre-Registered Experiment Plan
## Factorial Evaluation of Behavioral Readout Fidelity & Lateralized Sensory Embodiment

### 1. Protocol Pre-Registration

This document pre-registers the empirical closed-loop experimental design for Phase IV-B prior to running the evaluation cohorts.

- **Status:** PRE-REGISTERED & FROZEN
- **Timestamp:** 2026-09-18T18:20:00Z
- **Substrate Plasticity:** 0.0 (Strictly DISABLED; fixed connectome weights)
- **Harness Rescue Rules:** STRICTLY FORBIDDEN (No steering overrides, no `if blocked -> turn`, no artificial waypoints)
- **Cohorts:**
  - Development Cohort: Seeds `9000..9049` ($N = 50$)
  - Final Held-Out Evaluation Cohort: Seeds `10000..10099` ($N = 100$)

---

### 2. Research Questions & Factorial Hypothesis Matrix

In Phase III, unassisted connectome rovers in ChangedWorld exhibited $0\%$ goal discovery and 100% collision halting. We identified two structural bottlenecks:
1. **Sensory Symmetry:** Transduction delivered rotationally symmetric signals ($S_L = S_R$), canceling bilateral steering torque.
2. **Readout Compression:** CandidateBridge calculated $s_{\text{halt}} = \max(0.1, 1 - 0.85 \cdot s_{\text{fwd}})$, causing HALT to dominate whenever forward velocity was low, burying active steering signals.

#### Research Question:
Does eliminating sensory symmetry and candidate readout compression allow the fixed whole-CNS connectome to express directional steering and adaptive bypass behavior in closed loop?

---

### 3. Factorial Conditions ($2 \times 2 + \text{Controls}$)

| Condition ID | Sensory Interface | Candidate Readout | DeltaX Governance | Connectome Substrate |
| :--- | :--- | :--- | :--- | :--- |
| **A: `OLD_SYMM_OLD_READOUT`** | `SYMMETRIC` | `READOUT_A_CURRENT` | None (`CONTROL`) | Intact biological |
| **B: `LATERAL_OLD_READOUT`** | `LATERALIZED` | `READOUT_A_CURRENT` | None (`CONTROL`) | Intact biological |
| **C: `OLD_SYMM_CALIB_READOUT`** | `SYMMETRIC` | `READOUT_C_INDEPENDENT_AXES` | None (`CONTROL`) | Intact biological |
| **D: `LATERAL_CALIB_READOUT`** | `LATERALIZED` | `READOUT_C_INDEPENDENT_AXES` | None (`CONTROL`) | Intact biological |
| **E: `LATERAL_CALIB_OBSERVE`** | `LATERALIZED` | `READOUT_C_INDEPENDENT_AXES` | `OBSERVE` | Intact biological |
| **F: `LATERAL_CALIB_EXECUTIVE`** | `LATERALIZED` | `READOUT_C_INDEPENDENT_AXES` | `EXECUTIVE` | Intact biological |
| **G: `SHUFFLED_LATERAL_CALIB`** | `LATERALIZED` | `READOUT_C_INDEPENDENT_AXES` | None (`CONTROL`) | Shuffled (Degree-preserved) |

---

### 4. Primary & Secondary Metrics

1. **Candidate Winner Diversity:** Proportion of ticks where winning candidate is NOT `halt` (measuring release from artificial arrest).
2. **Steering Initiation Rate:** Frequency of `turn_left` or `turn_right` execution upon encountering lateral or frontal barriers.
3. **Turn Directional Concordance:** Whether chosen turns steer away from lateral contact (i.e. obstacle on left $\implies$ right turn, or biological left turn bias).
4. **Collision & Halting Duration:** Number of steps spent arrested against obstacles vs active maneuvering.
5. **Aversive Withdrawal Frequency:** Rate of Moonwalker Descending Neuron (`MDN`) backward locomotion when facing impassable barriers.
6. **Goal Completion Rate:** Proportion of seeds reaching the target region within 35 steps.
7. **Action Entropy:** Shannon entropy of the executed motor distribution.
8. **DeltaX Governance Dispositions:** PERMIT, VETO, MODULATE, and safe arbitration rates.

---

### 5. Explicit Falsification Criteria

1. **Falsifier 1 (Reject Readout Compression as Primary Blocker):**
   If Condition D (`LATERAL_CALIB_READOUT`) still produces $>90\%$ HALT actions and zero steering initiation when obstacles are detected, candidate bridge compression was NOT the primary cause of immobility.
2. **Falsifier 2 (Reject Sensory Symmetry as Primary Blocker):**
   If Condition B (`LATERAL_OLD_READOUT`) performs identically to Condition A, lateral sensing cannot overcome readout compression alone.
3. **Falsifier 3 (Connectome Steering Insufficiency):**
   If Condition D produces no purposeful or corridor-following turns despite lateral sensing and calibrated readout, the fixed connectome lacks an unconditioned obstacle-avoidance reflex, establishing that **synaptic plasticity (Phase IV-C) is mandatory** for adaptive navigation.

---

### 6. Causal Integrity Rules

1. **No Harness Steering:** Harness code must NOT contain any logic directing turns, selecting bypass corridors, or overriding HALT with turns.
2. **Provenance Preservation:** All executed actions must strictly originate from the pre-evaluation candidate field emitted by the candidate bridge.
3. **Sealed Evaluation:** No changes to sensor geometry, readout equations, or world parameters after execution of the held-out cohort (`10000..10099`).
