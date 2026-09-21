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
| RECURRENT CONNECTOME SUBSTRATE (165,122 neurons)                                  |
|  10,511,038 directed connections / 104,213,652 synaptic contacts                  |
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
|  [Executive Adapter] (HTTP API, optional local JSONL, or explicit stub provider)  |
|     Candidate-constrained selection: evaluates active proposals                   |
|     Enforced invariant: selected action references an active candidate            |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Subsystems

### 2.1 Sensory Transduction (`src/connectome/sensory_transduction.mjs`)
Maps continuous physical observables from the rover body and environment into discrete firing rate inputs across sensory afferents mapped in `bodymap.json`:
- **Tactile (T1 Left/Right):** Mechanoreceptors driven by lateral obstacle contact.
- **Johnston's Organ (JO Wind/Gravity):** Bilateral angular deflections and body rotations.
- **Operational Aversive, Thermal & Gustatory:** High-threshold warning and contact channels.
- **Visual:** Flat, uncalibrated photoreceptor drive (intensity inputs lacking optic flow or motion-selective direction circuits).

### 2.2 Connectome Rate Runtime (`src/connectome/runtime.mjs`, wrapping `upstream/fly-brain/src/ratenet.js`)
Implements numerical integration of whole-CNS recurrent dynamics:
- **Topology:** Instantiated from the MaleCNS v1.0 whole-CNS dataset ($N=165,122$ neurons, $10,511,038$ directed connections representing $104,213,652$ synaptic contacts stored in Compressed Sparse Row format).
- **Integration:** Forward Euler stepping with $\Delta t = 1.0\text{ ms}$, saturating non-linear activation functions, cell-type-specific resting potentials, and neurotransmitter sign assignments (cholinergic $+1$, GABAergic/glutamatergic $-1$).
- **Observed Multi-Synaptic Latency:** In the tested Phase II harness, command recruitment appeared after 4–5 harness ticks, corresponding to approximately 40–50 one-millisecond `RateNetwork` substeps, as activity propagated through intermediate interneurons and overcame postural suppression.

### 2.3 Synaptic Plasticity Overlay (`src/connectome/plasticity_overlay.mjs`)
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
  - `canonical_api`: Interfaces with the canonical HTTP API via `src/deltax/canonical.mjs`.
  - `local_runtime`: Interfaces with the sovereign local JSONL subprocess provider via `src/deltax/local_runtime.mjs`.
  - `stub`: Deterministic offline/CI fixture with `alwaysDecides: true` (explicitly identified in telemetry).
- **Candidate-Constrained Architectural Enforcement:**
  - The governor is architecturally restricted to selecting strictly among candidate proposals generated by the connectome substrate; it does not synthesize motor commands or bypass CandidateBridge.
  - In observed Phase IV-C benchmark runs across 9,000 episodes, candidate matching was 100.00% (199,500 / 199,500 decisions) with zero fallbacks. Public tests and traces verify this integration contract; they do not make the private DeltaX runtime publicly reproducible.
