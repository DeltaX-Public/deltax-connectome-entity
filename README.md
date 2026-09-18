# DeltaX Connectome Entity

A public, sovereign harness integrating a 165,122-neuron biological connectome recurrent substrate (*Drosophila* whole-CNS), causal neural intervention, and the DeltaX executive control plane.

## Status

| Subsystem | Status | Reality & Provenance |
| --- | --- | --- |
| **Phase II: Real Connectome** | **Complete & Verified** | Descending-neuron candidate extraction from 165k-neuron connectome; zero semantic cheats; 100% goal completion on held-out seeds |
| **Causal Neural Intervention** | **Complete & Verified** | Bit-exact tripartite state branching with targeted optogenetic population silencing (`DNg100`, `DNg97`, `DNp09`) |
| **Held-Out Evaluation Battery** | **25 Seeds Complete** | Held-out evaluation seeds (200..224) comparing CONTROL, OBSERVE, EXECUTIVE, SHAM, and SHUFFLED_CONNECTOME |
| **Sovereign Local Runtime** | **Active (0 Egress)** | Shared private JSONL provider via `DELTAX_LOCAL_RUNTIME_CMD`; provenance `executive_source: local_runtime` |
| **Entity Observatory** | **Live Show Mode** | Real telemetry, descending neuron firing rates, candidate provenance, and DeltaX governance |

---

## Quickstart & Reproduction

```bash
# 1. Point to private local provider
export DELTAX_LOCAL_RUNTIME_CMD="/Users/dominicknoval/Projects/private/deltax-python-runtime/.venv/bin/python3 -m deltax_runtime.provider"

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
