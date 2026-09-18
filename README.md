> Launch day: see [the demo runbook](docs/DEMO_RUNBOOK.md).

# DeltaX Connectome Entity

A public, honest harness for a recurrent connectome substrate, causal replay, and a DeltaX executive control plane. The browser surface is an observatory, not a claim of a full connectome visualization.

## Status

| Work | Reality |
| --- | --- |
| PRs 1-6 | Merged: upstream baseline, interface, neurocontrol, Broken World scaffold, causal intervention and Entity Observatory |
| Phases 1-10 | Evidence and harness work is complete for the merged scope; learning claims remain explicitly limited |
| Canonical DeltaX transport | Implemented as an adapter; requires a reachable local API |
| Stub transport | Available only when explicitly selected, and labeled as stub |

## One launch path

1. **Upstream fly validation.** Read [UPSTREAM.md](UPSTREAM.md), then run the upstream checks from `upstream/fly-brain` without changing that package.
2. **Headless Broken World and causal intervention.** Run `npm run demo:causal`. This uses the checked-in harness and an explicit `executive_source: stub`; it is a CI scaffold, not proof of learned behavior.
3. **Real demo.** Start the local canonical API, then launch the demo with `DELTAX_API_URL=http://127.0.0.1:<port> DELTAX_EXECUTIVE=DELTAX ...`. The adapter fails clearly when the API is absent; it does not silently substitute the stub.
## Entity Observatory

From the repository root run `python3 -m http.server 4173`, then open `http://127.0.0.1:4173/entity.html`. In Codespaces, forward port 4173. The page reads the latest checked-in intervention artifact when available and otherwise shows an explicit empty state.

## Commands

```sh
npm test
npm run demo:causal
npm run demo:entity
```

`demo:entity` prints the static-server instruction. `entity.html` exposes only recorded fields: world, substrate proposals, DeltaX decisions, experiment metadata, source provenance, and export. It does not invent neural activity or animation.

## Documents

- [UPSTREAM.md](UPSTREAM.md) - upstream boundary and fly validation
- [DELTAX_INTERFACE.md](DELTAX_INTERFACE.md) - executive adapter and transport contract
- [NEURAL_CONTROL.md](NEURAL_CONTROL.md) - checkpoint and replay boundaries
- [EXPERIMENT.md](EXPERIMENT.md) - canonical experiment protocol; historical pointer: [docs/EXPERIMENT.md](docs/EXPERIMENT.md)
- [CLAIMS.md](CLAIMS.md) - claims and evidence
- [ARCHITECTURE.md](ARCHITECTURE.md) - runtime and ownership diagram
- [LIMITATIONS.md](LIMITATIONS.md) - known limitations and non-claims

## Repository boundary

`upstream/` is the preserved upstream fly tree. `src/` contains the DeltaX adapter, neurocontrol, and observatory support. Root scripts and tests are the reproducible harness around those boundaries.
