# deltax-connectome-entity

Connectome-derived **recurrent computational substrate** plus a planned **DeltaX synthetic executive control plane**, with persistent state, causal neural intervention, and an unfamiliar embodied task (Broken World).

This is **not** a fruit-fly behavior product demo, and it does **not** claim consciousness, AGI, or a simulated biological prefrontal cortex.

## Current status

| Phase | Status |
|---|---|
| Phase 0 — audit & lineage | **Docs landed** — see [`UPSTREAM.md`](UPSTREAM.md), [`docs/phase0/REMOTE_AUDIT.md`](docs/phase0/REMOTE_AUDIT.md) |
| Phase 1 — reproduce upstream baseline | **Held** (Cloud Agents unavailable; no local checkout authorized yet) |
| Milestone 1 — DeltaX observe / veto / modulate | Not started |
| Broken World + causal intervention demo | Not started |

Primary upstream candidate: [`Lulzx/fly-brain`](https://github.com/Lulzx/fly-brain) @ `054e402853d370b004facc1946e36a409de601e8` (MIT). Dataset and body/eye licenses remain with their sources (see `UPSTREAM.md`).

## Quick start (after Phase 1 incorporation)

Upstream today:

```sh
# once upstream tree is vendored / submoduled — see UPSTREAM.md
npm install
npm run dev   # arena: http://localhost:5173/arena.html
```

Headless examples (upstream):

```sh
node scripts/run_fly.mjs 6 nearodor
node scripts/calib_eval.mjs "$(cat public/data/brain_params.json)"
```

## Architecture target

```
ENVIRONMENT → SENSORY TRANSLATION → CONNECTOME SUBSTRATE
  → STATE / ACTION-PROPOSAL EXTRACTION → DELTAX EXECUTIVE
  → MODULATION / VETO / PERMISSION → MOTOR INTERFACE → BODY → ENVIRONMENT
```

DeltaX must not replace the connectome with direct actuator control in normal demo mode. Canonical DeltaX code is adapted if available; otherwise only a labeled stub interface is allowed — never presented as DeltaX.

## Documentation

- [`UPSTREAM.md`](UPSTREAM.md) — source pins and licenses
- [`docs/phase0/REMOTE_AUDIT.md`](docs/phase0/REMOTE_AUDIT.md) — Phase 0 remote audit
- [`docs/BASELINE_AUDIT.md`](docs/BASELINE_AUDIT.md) — provisional baseline template (complete after reproduction)

## License

Project documentation in this repository: TBD with first code commit.  
Upstream software and datasets: see `UPSTREAM.md` (MIT + CC-BY 4.0 + Apache-2.0 + …).

## Phase 1 quick start: the vendored upstream baseline

The untouched upstream reproduction is kept separate under `upstream/fly-brain/` and is pinned in [UPSTREAM.md](UPSTREAM.md). Run it from that directory:

```sh
cd upstream/fly-brain
npm install
node scripts/calib_eval.mjs "$(cat public/data/brain_params.json)"
node scripts/run_fly.mjs 2 default descending
```

The Phase 1 evidence and raw command logs are in [docs/BASELINE_AUDIT.md](docs/BASELINE_AUDIT.md) and `artifacts/baseline/`. DeltaX additions are intentionally not mixed into this upstream runnable tree.

## Quick start with the local DeltaX API

The repository is a public demo harness; the real executive runs in a local API. Copy `.env.example`, then launch the API and run the demo with:

```sh
DELTAX_API_URL=http://127.0.0.1:<port> DELTAX_EXECUTIVE=DELTAX node your-demo-entrypoint.mjs
```

The status is `executive_source: canonical_api`. For CI/development only, select the clearly labeled stub with `DELTAX_EXECUTIVE=stub`. DeltaX mode without `DELTAX_API_URL` fails loudly; it never silently substitutes the stub. See `DELTAX_INTERFACE.md` and `NEURAL_CONTROL.md`.

## Entity Observatory (phase 10)

`entity.html` is a separate, intentionally modest visualization surface for the Broken World harness. It has WORLD, SUBSTRATE, DELTAX, and EXPERIMENT panels. The page reads `artifacts/checkpoints/causal-intervention-8.json` when served from the repository and otherwise stays explicit about missing telemetry. The executive badge is driven only by `executive_source` (`canonical_api`, `stub`, or `disabled`); a stub is never presented as genuine DeltaX and neural activity is never labeled as DeltaX reasoning.

Open it from the repository root with a static server (for example `python3 -m http.server 4173`) and visit `http://localhost:4173/entity.html`. In Codespaces, forward port 4173. The controls provide a local observatory surface and JSONL export; authoritative experiment state remains the headless harness and its tests. This is not a full connectome visualization.
