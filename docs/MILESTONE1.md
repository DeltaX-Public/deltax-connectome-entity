# Milestone 1: DeltaX adapter boundary

The adapter in `src/deltax/` is outside the untouched `upstream/fly-brain/` tree. It exposes `observe`, `evaluate`, `decide`, `apply`, `record`, decision packets, telemetry, and JSONL ledger export.

## Honest implementation status

There is no public DeltaX runtime in this repository. `DeltaXStub` is therefore the only DELTAX implementation and is explicitly labeled `implementation: stub`; its telemetry says `alwaysDecides: true`. It applies only a configurable permit/veto/modulation policy and invents no DeltaX mathematics.

## Causal and safety boundaries

Every decision records environment/sensors, connectome output, and the behavioral proposal distribution before the DeltaX intervention. The final motor mapping is recorded separately. `UPSTREAM` and `SUBSTRATE_ONLY` bypass the stub and preserve the substrate proposal. `DELTAX` and `DELTAX_DEBUG` use the stub. A missing connectome output is rejected, so the adapter cannot bypass the connectome. Vetoes block motor mapping; manual override is explicit and labeled `MANUAL_OVERRIDE`.

## Reproduction

```sh
node test/milestone1.test.mjs
node scripts/milestone1_harness.mjs DELTAX_DEBUG
node scripts/milestone1_harness.mjs DELTAX --veto
```

The test is the source of truth for mode separation, veto behavior, no executive bypass, ledger ordering, intervention recording, replay fields, and the substrate isolation metric. Full neurocontrol perturbation and checkpoint restore remain Phase 2 work.

## Authoritative interface contract

`DELTAX_INTERFACE.md` records the supplied public executive contract. `src/deltax/contract.mjs` implements its structured input/output boundary as `DeltaXReferenceAdapter`, including candidate provenance, contradictions, PERMIT/VETO/MODULATE/DEFER/ESCALATE dispositions, bounded modulation classes, experimenter shutdown escalation, replay identity, and non-actuating motor-path routing.
