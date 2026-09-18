# DeltaX Connectome Entity

A public, sovereign harness integrating a 165,122-neuron connectome graph recurrent substrate (*Drosophila* whole-CNS dataset), causal neural intervention, and the DeltaX executive control plane.

## Status

| Subsystem | Status | Reality & Provenance |
| --- | --- | --- |
| **Phase II: Real Connectome** | **Complete & Verified** | Strict candidate provenance typing; post-DeltaX shortcuts excised; initial 100% lift marked `superseded_pre_integrity_pass` |
| **Causal Neural Intervention** | **Complete & Verified** | Bit-exact tripartite state branching with targeted optogenetic silencing (`DNg100/97/p09`) vs sham controls |
| **Held-Out Evaluation Battery** | **25 Seeds Complete** | Post-integrity held-out evaluation battery (seeds 1000..1024) across CONTROL, OBSERVE, EXECUTIVE, SHAM, and degree-preserving SHUFFLED_CONNECTOME |
| **Component Ablation Suite** | **10 Seeds Complete** | Quantified isolation of No DeltaX, OBSERVE only, Shuffled Graph, Lambda Gate, Memory Reset, and Contradiction Handling |
| **Sovereign Local Runtime** | **Active (0 Egress)** | Shared private JSONL provider via `DELTAX_LOCAL_RUNTIME_CMD`; provenance `executive_source: local_runtime`; zero external network egress observed |
| **Entity Observatory** | **Live Show Mode** | Real telemetry, descending neuron firing rates, candidate provenance, and DeltaX governance |

---

## Reproducibility Table

| Field | Description / Value |
| :--- | :--- |
| **Claim** | Post-integrity causal verification across 25 held-out seeds (1000..1024), component ablations, and triple-branch causal neural intervention with zero actuator shortcuts |
| **Status of Initial 100% Lift** | Formally designated as `superseded_pre_integrity_pass` (actuator shortcuts eliminated) |
| **Command** | `node --test test/*.mjs && node scripts/connectome_battery.mjs --seeds=25 && node scripts/causal_neural_intervention.mjs && node scripts/run_ablations.mjs --seeds=10` |
| **Branch** | `phase2-real-connectome-integration` |
| **Commit** | HEAD of `phase2-real-connectome-integration` |
| **Seed Set** | `1000..1024` (held-out battery), `1000..1009` (ablations), `105` (causal intervention) |
| **Runtime Mode** | `local_runtime` (via `DELTAX_LOCAL_RUNTIME_CMD`) |
| **Expected Artifact** | `artifacts/battery/latest-held-out-battery.json`, `artifacts/ablations/latest-component-ablations.json`, `artifacts/interventions/latest-neural-intervention.json` |
| **Stub Allowed** | No (for sovereign validation battery); Yes (for unit tests / stub-honesty tests) |
| **Private Runtime Required** | Yes (for genuine `local_runtime` sovereign validation) |
| **Network Expected** | No (zero network egress during local battery execution) |

---

## Quickstart & Reproduction

```bash
# 1. Point to private local provider
export DELTAX_LOCAL_RUNTIME_CMD="/path/to/private/runtime/.venv/bin/python3 -m deltax_runtime.provider"

# 2. Run unit and integration tests
npm test

# 3. Run real causal neural intervention
npm run connectome:causal

# 4. Run frozen held-out evaluation battery (25 seeds)
npm run connectome:battery

# 5. Generate and view Observatory Show Mode
npm run demo:observatory
python3 -m http.server 4173
# Open http://127.0.0.1:4173/entity.html
```

---

## Documentation

- [docs/PHASE_2_CONNECTOME_CAUSAL_INTEGRATION_REPORT.md](docs/PHASE_2_CONNECTOME_CAUSAL_INTEGRATION_REPORT.md) — Comprehensive Phase II Empirical Evidence Report
- [docs/EVIDENCE_BATTERY_REPORT.md](docs/EVIDENCE_BATTERY_REPORT.md) — Phase I Sovereign Runtime Battery Report
- [UPSTREAM.md](UPSTREAM.md) — Upstream Janelia fly-brain connectome boundary
- [DELTAX_INTERFACE.md](DELTAX_INTERFACE.md) — Executive adapter and JSONL IPC contract
- [docs/LOCAL_RUNTIME_PROVIDER.md](docs/LOCAL_RUNTIME_PROVIDER.md) — Private runtime provider boundary
- [ARCHITECTURE.md](ARCHITECTURE.md) — Architecture and ownership diagram
- [CLAIMS.md](CLAIMS.md) — Empirical claim boundaries and non-biological notice
- [LIMITATIONS.md](LIMITATIONS.md) — Known limitations
