# DeltaX Connectome Entity: Release Evidence Manifest

**Date:** September 21, 2026
**Status:** **ACTIVE RESEARCH PAUSE — EVIDENCE & IMMUTABILITY AUDIT**
**Repository:** `DeltaX-Public/deltax-connectome-entity`
**Base Commit:** `47255c7fabf943e946a832d492d90b721dea3453` (PR #22 on `main`)
**Freeze Candidate Branch:** `chore/research-pause-freeze`
**Licensing:** PolyForm Noncommercial License 1.0.0 (DeltaX-owned source/data) / MIT (upstream/fly-brain)

---

## 1. Provenance & Milestone Commits

This manifest records the verified commit SHAs representing key scientific milestones in this repository, derived directly from git history:

| Scientific Phase | Milestone Commit SHA | Merge Date | Primary Contributions |
| :--- | :--- | :--- | :--- |
| **Phase II Initial Integration** (PR #12) | `0c7d56f` | Sep 17, 2026 | First embodied connectome rate-network; baseline evaluation. |
| **Phase II Canonical Post-Integrity** (PR #13) | `3693cc5` | Sep 18, 2026 | Canonical post-integrity state; excision of post-DeltaX shortcuts. |
| **Phase III Unassisted** (PR #14) | `5e4128d` | Sep 18, 2026 | Unassisted connectome benchmark ($N=100$ held-out seeds `4000..4099`); collision safety via halting confirmed. |
| **Phase IV-C Generalization** (PR #18) | `3897690` | Sep 19, 2026 | 15-environment generalization benchmark ($N=100$ held-out seeds `12000..12099`, 9,000 episodes; 199,500 candidate choices; zero fallbacks). |
| **Lane B: Steering Asymmetry** (PR #19) | `04e5340` | Sep 20, 2026 | 10-phase causal audit of mechanosensory asymmetry; target plasticity manifests. |
| **Lane B: Latent Motor Repertoire** (PR #21) | `c1341b0` | Sep 20, 2026 | 180-pathway whole-CNS motor atlas; bilateral validation ($N=100$ on `20200..20299`). |
| **Phase IV-D.1–D.3 Plasticity** (PR #20) | `5fa548e` | Sep 20, 2026 | Subthreshold bootstrap plasticity and dose-response development cohorts ($N=50$, $N=100$). |
| **License Cutover (PolyForm)** (PR #22) | `47255c7` | Sep 21, 2026 | Repository cutover to PolyForm Noncommercial License 1.0.0 on `main`. Base commit for pause freeze. |

---

## 2. Primary Artifact Manifest (SHA-256 Hashes & Sizes)

The table below catalogs the 19 primary empirical evidence artifacts committed in the repository. All SHA-256 hashes and file sizes have been verified bit-for-bit (additional descriptive and protocol files in `artifacts/` are verified for valid JSON syntax by `npm run verify:pause`):

| Relative File Path | Size (Bytes) | SHA-256 Digest | Description / Phase |
| :--- | :--- | :--- | :--- |
| `artifacts/generalization/phase4c-held-out.json` | 29,704,844 | `be87e26a72f547975e5b4f52fd41729e535e9ebc80e0b70e43fc3eeccbf1665f` | Phase IV-C Held-Out Episodes (9,000 episodes, seeds `12000..12099`) |
| `artifacts/generalization/phase4c-generalization-held_out.json` | 31,382,843 | `4ec41208872f6b0d7aebd3af7eb1eeda10a901430368072d0e4502dd13abadaf` | Phase IV-C Held-Out Detailed Metrics & Candidate Forks |
| `artifacts/generalization/phase4c-failure-attribution-held_out.json` | 58,183 | `aa5c2eb735c710b39a1065161f6a98d702a3eba5394d028bbb2d8aa35b1f39fe` | Canonical Causal Attribution (`SUBSTRATE_CANDIDATE_ABSENCE`) |
| `artifacts/generalization/phase4c-development.json` | 8,951,094 | `be4f30844d9324bf0c513310dd07267205a57236a1bbd7c8700c8d18655a26d2` | Phase IV-C Dev V2 ($N=50$, seeds `11000..11049`) |
| `artifacts/steering_asymmetry/validation.json` | 36,546 | `d31e361767046b8d2b644cbd11ee9e86a4ebf4d76f9a5d7bed4eb8e3800c4c20` | Steering Asymmetry Validation ($N=100$, seeds `16000..16099`) |
| `artifacts/steering_asymmetry/validation_17000_17099.json` | 36,261 | `8b9c738adcfb57c2dcfa34535dc60e44771ef56f042d518b0d4b82c7e5483395` | Steering Asymmetry Validation ($N=100$, seeds `17000..17099`) |
| `artifacts/steering_asymmetry/plasticity_target_candidate.json` | 5,626 | `85104c02a684f295f0e9f770dba5c83a3d2b122c5da3596dd2d0d815f6cc3a4c` | Anatomical Target Candidate Identification (`AN03A008`) |
| `artifacts/latent_repertoire/validation/bilateral_validation_20200_20299.json` | 5,494 | `9e3565abcc11d4f075637f68ea114675723fd2ad2530216f93331d46588aac66` | Latent Repertoire Bilateral Validation ($N=100$, seeds `20200..20299`) |
| `artifacts/latent_repertoire/sensory_motor_matrix.json` | 27,977 | `bc2a0ec3228673838068499b1517310893d492d1891e3bbd5a40bbe085490705` | 180-Pathway Dynamic Response Matrix |
| `artifacts/latent_repertoire/intermediate_rescue.json` | 23,324 | `a0384af28f2dc9e9ddc1c026961c1c681b38e7c3fd7b9b14bd0b839738826556` | Intermediate Rescues via Physiological Stimulation |
| `artifacts/plasticity/phase4d1/protocol_frozen.json` | 4,012 | `6eeb6357ce1f92c995c139fa17bf6dbd6c19e66c794620de384ac7632fd436d8` | Phase IV-D.1 Frozen Protocol |
| `artifacts/plasticity/phase4d1/condition_summary.json` | 7,980 | `085ba532df4eca2578fda221df2d5c1b082d23b17a9fd024e605a78f40f15f1b` | Phase IV-D.1 Rate-Hebb Deadlock Summary ($N=50$, seeds `18000..18049`) |
| `artifacts/plasticity/phase4d1b/local_subthreshold_state_audit.json` | 3,360 | `5750d321550c4f9c79269d46e8f97f62d77f283bd0f16a6ddb13b47d1126c596` | Phase IV-D.1B Subthreshold Dendritic Input Audit |
| `artifacts/plasticity/phase4d2/protocol_frozen.json` | 4,663 | `a19c695d9d49d21e25002165504b1fafe7eefd4c0c1c34558681b24f0d7c79df` | Phase IV-D.2 Subthreshold Bootstrap Protocol |
| `artifacts/plasticity/phase4d2/condition_summary.json` | 11,388 | `8052ee967946cbafb8571001b32b570b3b403ca89f6a1f95302282e23218df0a` | Phase IV-D.2 Bootstrap Recruitment Results ($N=50$, seeds `18100..18149`) |
| `artifacts/plasticity/phase4d3/protocol_frozen.json` | 4,026 | `c00947f938d31f5b54484a0de3a41e8a4d5b21a6b0000e8ffb1021e01db72c17` | Phase IV-D.3 Dose-Response Protocol |
| `artifacts/plasticity/phase4d3/dose_response.json` | 5,243 | `50c98d0dd788584392909c7712f81d0e82543d307a56046484404c57254580a4` | Phase IV-D.3 Dose Response ($N=100$, seeds `18200..18299`) |
| `artifacts/plasticity/target_a_afferent_only.json` | 2,736 | `6a9223a2e0cab2e233b90abaf1bfa924a22cfd0e4b9ada7d04aeb137967f176b` | Afferent Stage Manifest (8 edges into `AN03A008`) |
| `artifacts/plasticity/target_c_balanced_two_stage.json` | 3,148 | `4a61ae85d8ef8efe725010ba3515d190e4ec6a5c64c2fb82fb7e0037e1116574` | Two-Stage Manifest (8 afferent + 1 projection edge) |

---

## 3. Seed Namespace Partitioning

The repository uses protocol-level seed namespace separation:

| Seed Range | Size ($N$) | Phase / Research Lane | Allocation Category | Consumption / Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| `1000..1024` | 25 | Phase II Baseline | Historical Benchmark | Consumed (Committed artifacts) |
| `4000..4099` | 100 | Phase III Unassisted | Historical Benchmark | Consumed (Committed artifacts) |
| `10000..10049` | 50 | Phase IV-C Dev V1 | Development (Superseded) | Consumed (Superseded by Dev V2) |
| `11000..11049` | 50 | Phase IV-C Dev V2 | Development | Consumed (Committed artifacts) |
| `12000..12099` | 100 | Phase IV-C Canonical | **Held-Out Benchmark** | **Consumed & Confirmed (9,000 episodes)** |
| `16000..16099` | 100 | Lane B Steering | Diagnostic Validation | Consumed (Committed artifacts) |
| `17000..17099` | 100 | Lane B Steering | Diagnostic Validation | Consumed (Committed artifacts) |
| `18000..18049` | 50 | Phase IV-D.1 | Development | Consumed (Rate-Hebb deadlock audit) |
| `18100..18149` | 50 | Phase IV-D.2 | Development | Consumed (Subthreshold bootstrap cohort) |
| `18200..18299` | 100 | Phase IV-D.3 | Development | Consumed (Dose-response cohort) |
| `20000..20049` | 50 | Lane B Latent Atlas | Diagnostic Exploration | Consumed ($N=10, 5, 3, 1$ in scripts) |
| `20200..20299` | 100 | Lane B Latent Atlas | Validation | Consumed (Bilateral validation) |
| `20400..20499` | 100 | Lane B Escape | Reserved | **Unconsumed (Reserved)** |
| `19000..19099` | **100** | **Phase IV-D Held-Out** | **Held-Out Benchmark** | **SEALED & UNCONSUMED IN COMMITTED RECORDS** |

---

## 4. Software Environment & Execution Prerequisites

Reproducing or auditing the results in this repository requires:

- **Node.js**: Version `>= 20.0.0` (ESM native, built-in test runner `node:test`).
- **Python**: Version `>= 3.11` (for offline analysis and validation scripts).
- **Git**: Modern git client with submodule support.
- **Operating System**: macOS (Darwin arm64/x86_64) or Linux (x86_64).

### Key Commands:
```bash
# Run unit and regression test suite (non-modifying):
node --test test/*.test.mjs

# Verify research pause state, 19 primary artifact hashes, and held-out preservation:
npm run verify:pause
```

---

## 5. Runtime Architecture & Protocol Boundaries

### Subsystem File References:
- **Rate Network Integration:** `src/connectome/runtime.mjs`, wrapping `upstream/fly-brain/src/ratenet.js`.
- **Synaptic Plasticity Overlay:** `src/connectome/plasticity_overlay.mjs`.
- **Canonical HTTP API Adapter:** `src/deltax/canonical.mjs`.
- **Local Subprocess Provider:** `src/deltax/local_runtime.mjs`.
- **Candidate Readouts & Bridge:** `src/connectome/candidate_readouts.mjs` and `src/connectome/candidate_bridge.mjs`.
- **Executive Adapter:** `src/deltax/adapter.mjs`.

### Underlying Dataset & Graph:
- **Connectome Dataset:** MaleCNS v1.0 whole-CNS dataset ($N=165,122$ neurons).
- **Graph Topology:** 10,511,038 directed connections representing 104,213,652 synaptic contacts, stored in Compressed Sparse Row (CSR) format.
- **Sensory Representations:**
  - Tactile mechanoreceptors (T1 bristles) and wind/gravity receptors (Johnston's organ).
  - High-threshold operational aversive, thermal, and gustatory channels.
  - Visual input is represented as flat, uncalibrated photoreceptor drive—not calibrated retinotopy or optical flow.

### Inter-Process Protocol Boundary:
- The connectome entity communicates with embodiment controllers and governors through standard JSON-Lines (JSONL) input/output over `stdin`/`stdout` (`src/runtime/ipc_protocol.mjs`).
- At each simulation tick, the embodiment transmits sensory observations to the connectome entity.
- The RateNetwork executes numerical integration ($\Delta t = 1.0\text{ ms}$, default 10–100 steps per tick) and outputs candidate proposals via `CandidateBridge` (`turn_left`, `turn_right`, `forward`, `reverse`, etc.).
- The external DeltaX governor evaluates active candidates and returns the selected action.
- **Reproducibility Boundary:** Public tests and committed traces verify the governance integration boundary; they do not make the private DeltaX runtime publicly reproducible.

### Runtime Version & Authentication Disclaimers:
- Several committed artifact JSON headers record:
  ```json
  "runtime_version": "v1.0.0-local"
  ```
- **Attestation Boundary**: This string was set locally by the simulation runner (`scripts/run_phase4c_generalization.mjs`). It does **NOT** represent an immutable cryptographic build attestation, hardware-enclave signature, or signed production release. Build authentication remains deferred to future release hardening.
