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
