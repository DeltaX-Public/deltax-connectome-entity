# DeltaX Connectome Entity Architecture

## 1. End-to-End System Pipeline

```text
+-----------------------------------------------------------------------------------+
| PHYSICAL EMBODIMENT & ENVIRONMENT                                                 |
|                                                                                   |
|  [Broken World Arena]  <---------- Actuator Action (forward, turn_left, etc.) ---+
|         |                                                                         |
|         v                                                                         |
|  [Sensory Transduction]                                                           |
|     tactile contacts, velocities, distance sensors -> bodymap.json afferent rates |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| RECURRENT CONNECTOME SUBSTRATE (165,122 neurons, 10,511,038 synapses)             |
|                                                                                   |
|  [RateNetwork] (CSR adjacency, non-linear activation, dt = 1.0 ms)                |
|     Multi-hop delay propagation: Sensory Afferents -> Interneurons -> DNs        |
|                                                                                   |
|  [Synaptic Plasticity Engine] (Phase IV-D Overlay)                                |
|     Target manifests (A/B/C/D), eligibility traces, subthreshold bootstrap rule   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| CANDIDATE PROPOSAL & EMBODIMENT INTERFACE                                         |
|                                                                                   |
|  [Descending Neuron Population Readouts] (READOUT_A, B, C)                        |
|     DNa02, DNa01, DNp09, DNg100, DNg97, MDN firing rates                          |
|                                                                                   |
|  [CandidateBridge]                                                                |
|     Translates raw population dynamics into structured, typed candidate proposals  |
|     (MEASURED_NEURAL, DERIVED_NEURAL, cand_safe_noop fallback)                    |
+-----------------------------------------------------------------------------------+
                                         | Candidate proposals packet
                                         v
+-----------------------------------------------------------------------------------+
| DELTAX EXECUTIVE GOVERNOR (External Sovereignty Boundary)                         |
|                                                                                   |
|  [Executive Adapter] (src/deltax/adapter.mjs / JSONL IPC protocol)                |
|     Candidate-constrained selection: evaluates active proposals                   |
|     Strict invariant: Permitted candidate selection only (zero fallbacks, 100% ID)|
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Subsystems

### 2.1 Sensory Transduction (`src/connectome/sensory_transduction.mjs`)
Maps continuous physical observables from the rover body and environment into discrete firing rate inputs across sensory afferents mapped in `bodymap.json`:
- **Tactile (T1 Left/Right):** Mechanoreceptors driven by lateral obstacle contact.
- **Johnston's Organ (JO Wind/Gravity):** Bilateral angular deflections and body rotations.
- **Thermosensory & Bitter Gustatory:** High-threshold nociceptive/aversive warning signals.
- **Visual:** Retinotopic photoreceptor arrays (uncalibrated intensity inputs).

### 2.2 Connectome RateNetwork (`src/connectome/rate_network.mjs`)
Implements numerical integration of whole-CNS recurrent dynamics:
- **Topology:** Derived from Janelia *Drosophila* hemibrain dataset ($N=165,122$ neurons, $E=10,511,038$ directed synapses stored in Compressed Sparse Row format).
- **Integration:** Forward Euler stepping with $\Delta t = 1.0\text{ ms}$, saturating non-linear activation functions, cell-type-specific resting potentials, and neurotransmitter sign assignments (cholinergic $+1$, GABAergic/glutamatergic $-1$).
- **Multi-Synaptic Latency:** Preserves biologically realistic 4–5 step (~40–50 ms) propagation delays through intermediate interneurons before command descending neurons overcome postural suppression.

### 2.3 Synaptic Plasticity Engine (`src/connectome/synaptic_plasticity.mjs`)
A three-factor local plasticity overlay operating under strict information-theoretic boundaries:
- **Manifest Targeting:** Restricts plasticity exclusively to audited target edges (e.g. `TARGET_A_AFFERENT_ONLY`, 8 edges into `AN03A008`), preserving global connectome weights.
- **Eligibility Traces:** Local pre/post coincidence accumulates in temporary eligibility flags:
  $$\Delta e_{ij}(t) = -\lambda_e e_{ij}(t) + r_j(t) \cdot \psi_i(t)$$
- **Subthreshold Bootstrap Sensitivity:** Replaces silent somatic firing rates with normalized pre-threshold dendritic drive:
  $$\psi_i(t) = \text{clamp}\left(\tanh\left(\max\left(0, \frac{\text{inp}_i(t)}{\theta_i}\right)\right) + \frac{r_i(t)}{100.0}, 0.0, 1.0\right)$$
- **Consequence Gating:** Synaptic weight efficacy $\alpha_{ij}$ updates only when gated by scalar physical consequence $g_t$ (e.g. $+1.0$ on clearance, $-1.0$ on collision). Sign matrix $S_{ij}$ remains immutable.

### 2.4 Candidate Proposal Generation (`src/connectome/candidate_bridge.mjs`)
Transforms continuous descending neuron firing rates into a discrete candidate proposals field:
- **`READOUT_C` Formulation:** Computes antagonistic left/right steering drive using softplus/exponential normalization, verified to be mathematically mirror-symmetric (error $= 0.000000$).
- **Provenance Typing:** Every proposal is tagged with strict provenance (`MEASURED_NEURAL`, `DERIVED_NEURAL`, or `FALLBACK`).

### 2.5 DeltaX Executive Control Plane (`src/deltax/adapter.mjs`)
The external governance authority:
- **Transport Modes:**
  - `canonical_api`: Interfaces with the sovereign DeltaX runtime via standard JSONL IPC (`stdin`/`stdout`).
  - `stub`: Deterministic offline/CI fixture with `alwaysDecides: true` (explicitly identified in telemetry).
- **Candidate-Constrained Invariant:** The governor does not inject actions or synthesize motor signals. It selects exclusively among candidate proposals generated by the connectome substrate. Across all 199,500 evaluated decisions in the Phase IV-C benchmark, candidate matching was 100.00% with 0 fallbacks.
