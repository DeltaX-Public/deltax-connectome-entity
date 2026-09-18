# Experimental Evidence Preservation & Immutability Policy

This policy governs the generation, storage, immutability, and versioning of all experimental evidence and benchmark artifacts within `DeltaX-Public/deltax-connectome-entity`.

---

## 1. Core Principles

1. **Evidence Immutability:** Once an empirical evaluation or battery run is published or incorporated into an integration milestone, its raw data artifacts MUST NOT be silently altered, overwritten, or recomputed.
2. **Provenance Traceability:** Every evidence bundle must capture:
   - Full environment specification (dimensions, hazards, obstacle layouts).
   - Random seed ranges and seed-generation methodology.
   - Commit SHA of the exact codebase used to produce the run.
   - Timestamp and execution duration.
   - Summary metrics computed directly from raw trial logs.
3. **Honest Invalidation via Archival:** When a methodology audit identifies confounding variables, artificial assists, or protocol errors:
   - Prior runs MUST NOT be deleted.
   - Prior runs must be isolated into an archived folder (e.g. `phase<N>_pre_integrity_audit/`).
   - A companion `PROTOCOL_DEVIATIONS.md` must document the exact flaw and reasons for supersession.
   - The corrected evaluation is versioned under a distinct manifest (e.g. `held_out_battery_v2.json`).

---

## 2. Directory Structure & Layout

All empirical artifacts reside under `artifacts/` partitioned by experimental phase:

```
artifacts/
├── changed_world/
│   ├── phase3_pre_integrity_audit/    # FROZEN: Archived pre-audit run
│   │   ├── held_out_battery_phase3.json
│   │   ├── held_out_battery_phase3_summary.json
│   │   └── ...
│   ├── held_out_battery_phase3_v2.json         # ACTIVE: V2 unassisted evaluation
│   ├── held_out_battery_phase3_v2_summary.json  # ACTIVE: V2 metrics
│   └── ablation_studies_phase3.json
└── evidence_battery/                           # Phase II battery artifacts
    ├── battery_summary.json
    └── ...
```

---

## 3. Hash Locking & Verification

Prior to merging any release or milestone PR:
1. All JSON files in `artifacts/` are validated for strict syntax and schema adherence.
2. Checksums or commit references are locked in the corresponding scientific report (e.g. `PHASE_2_CONNECTOME_CAUSAL_INTEGRATION_REPORT.md` or `PHASE_3_LONG_HORIZON_ADAPTATION_REPORT.md`).
3. Automated CI validates that artifact files parse cleanly without corrupted records.

---

## 4. Prohibited Practices

- **Never cherry-pick favorable seeds:** Evaluations must use predefined, contiguous ranges (e.g. seeds `4000..4099`).
- **Never retroactively edit metric summaries:** Metrics in `*_summary.json` must be deterministically regenerable from the trial logs.
- **Never commit private runtime outputs containing proprietary DeltaX internal states:** Log only public-contract fields (`disposition`, `selected_candidate_id`, `telemetry.coherence_score`, `cycle_count`).
