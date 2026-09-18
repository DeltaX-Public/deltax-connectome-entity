# Architecture

## Runtime

```text
world -> sensation -> connectome -> candidates -> DeltaX adapter
                                             -> permit / veto / modulate -> motor
                                      experiment ledger and checkpoint artifacts
```

The Broken World produces a sensation, the recurrent substrate proposes candidates, and the executive adapter is the only authority that emits a permit, veto, or modulation. Motor output is downstream of that decision. The intervention runner records the same stages for replay.

## Modes

- `canonical_api`: `DELTAX_API_URL` points to the local canonical DeltaX API. Responses are labeled `canonical_api`.
- `stub`: an explicit deterministic `alwaysDecides` substitute for CI and offline replay. It is labeled `stub` and is not DeltaX.
- `disabled`: no executive authority; the UI shows this as disabled rather than inferring a decision.

## Ownership

- **Experimenter** declares perturbations, selects a run, and records metadata. It cannot impersonate an executive response.
- **DeltaX** is the executive control plane: it receives candidate packets through the adapter and returns permit, veto, or modulation.
- **Substrate** is the connectome-derived recurrent proposal mechanism. It proposes before DeltaX and does not bypass it.

## Transport and code layout

The transport is `stub` for explicit CI fallback and `canonical_api` for the real local API. The adapter is in `src/deltax/adapter.mjs` with contracts and canonical transport beside it. Neurocontrol and UI support live under `src/neurocontrol/` and `src/entity-ui/`. The headless harness and causal runner are in `scripts/` and `test/`. The preserved upstream implementation and fly validation remain under `upstream/`; root `src/` is the DeltaX integration boundary.
