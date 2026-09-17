# Broken World experiment (Phase 5 draft)

## Scope
This is a deterministic, headless scaffold for an embodied flagship path. It does not claim executive adaptation, consciousness, or biological equivalence. The existing fly demo remains `UPSTREAM` validation and is not modified.

## Arena and ledger
The arena has west/east corridors, a full-height barrier with one controllable central door, fixed obstacles, a goal region, an energy budget, and a hazard cell. `RoverBody` exposes only `forward`, `left`, `right`, and `stop`. The action map may propose `inspect`, but the body has no inspect motor.

Every event records a timestamp and complete state snapshot. Phase A starts with `EXPECTED` from logged state. Phase B calls `mutateExternally` mid-run. The world emits `OBSERVED`, `CONTRADICTION`, `EXECUTIVE RESPONSE`, `SUBSTRATE RESPONSE`, and `NEW ACTION` records from event/state data, not first-person narrative.

## Modes
- `node scripts/experiment.mjs --mode=UPSTREAM` runs the existing fly-brain build validation.
- `node scripts/experiment.mjs --mode=SUBSTRATE_ONLY` runs rover/world without an executive API.
- `DELTAX_API_URL=... node scripts/experiment.mjs --mode=DELTAX` selects canonical API configuration; remote transport is not hidden.
- `node scripts/experiment.mjs --mode=DELTAX --stub` is the explicit CI stub.

DELTAX without `DELTAX_API_URL` fails loudly unless `--stub` is supplied. Tests cover label hygiene, door reachability, mutation logging, API failure, and stub behavior.

## Gaps
No live executive decision packet, MuJoCo, learned policy, or statistical evaluation is claimed. Those are follow-on tasks; this scaffold keeps the observation/action ledger inspectable first.
