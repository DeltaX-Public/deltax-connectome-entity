import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

const { ConnectomeRuntime } = await import(
  path.join(ROOT, "src", "connectome", "runtime.mjs")
);
const {
  PLASTICITY_RULES,
  EFFECTIVE_EDGE_POLICIES,
  computeSubthresholdPostsynapticFactor,
} = await import(
  path.join(ROOT, "src", "connectome", "plasticity_overlay.mjs")
);
const {
  runStandardizedIsolatedProbe,
  extractCandidateTelemetry,
} = await import(
  path.join(ROOT, "src", "connectome", "isolated_probe.mjs")
);

const RIGHT_DNA02 = 332;
const LEFT_DNA02 = 130496;
const RIGHT_AN03A008 = 2937;
const PROBE_INTENSITY = 180.0;
const INDUCTION_CYCLES = 30;
const SEEDS = [18100, 18101, 18102];

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf8"));
}

const MANIFEST_A = loadJson("artifacts/plasticity/target_a_afferent_only.json");
const MANIFEST_C = loadJson("artifacts/plasticity/target_c_balanced_two_stage.json");
const HISTORICAL_D2 = loadJson("artifacts/plasticity/phase4d2/post_induction.json");

const AFFERENT_SENSORS = [
  149560, 154130, 154675, 154731, 154816, 155200, 156889, 159953
];

function getEligibleEdgeIndices(runtime, manifest) {
  const indices = [];
  for (const e of manifest.eligible_edges) {
    const idx = runtime.plasticity.findEdgeIndex(e.source, e.target);
    if (idx !== -1) indices.push(idx);
  }
  return indices;
}

/**
 * Read pinned historical execution values from Phase IV-D.2 artifacts.
 */
function getPinnedHistoricalD2(seed) {
  const item = HISTORICAL_D2.find(x => x.seed === seed && x.condition_id === "Q2");
  if (!item) {
    throw new Error(`Pinned historical D2 record missing for seed ${seed}`);
  }
  return {
    source: "PINNED_HISTORICAL_EXECUTION",
    artifact: "artifacts/plasticity/phase4d2/post_induction.json",
    condition_id: "Q2",
    seed,
    right_dna02_rate: item.right_probe.right_dna02_rate,
    turn_right_strength: item.right_probe.turn_right_strength,
    turn_left_strength: item.right_probe.turn_left_strength,
    total_budget_used: item.total_budget_used,
    recruited: item.right_probe.right_dna02_rate >= 0.05,
  };
}

/**
 * Reconstructed Schedule Control D.2 (6 multimodal baseline probes before induction).
 * Labeled honestly as reconstructed schedule control executing against current runtime.
 */
function runReconstructedScheduleD2(seed) {
  const runtime = new ConnectomeRuntime({
    seed,
    plasticity: {
      config: {
        enabled: true,
        rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
        learningRate: 0.15,
        passiveDecay: 0.0005,
        traceDecay: 0.05,
        maxAbsoluteDeltaW: MANIFEST_A.safety_bounds.max_edge_delta,
        maxPercentageDeviation: MANIFEST_A.safety_bounds.max_percentage_change,
        totalGlobalBudget: MANIFEST_A.safety_bounds.max_total_budget,
        updateRateLimit: 5.0,
        effectiveEdgePolicy: EFFECTIVE_EDGE_POLICIES.MODEL_B_EXPLICIT_REVIVAL,
      },
      eligibleEdgeMask: [],
    },
  });

  const eligibleEdges = getEligibleEdgeIndices(runtime, MANIFEST_A);
  runtime.plasticity.setEligibleEdgeMask(eligibleEdges);

  // Reconstructed D.2 multimodal pre-probes on live runtime (inducing probe pollution)
  const probeSensors = [
    AFFERENT_SENSORS,
    [149559, 154129, 154674], // left tactile
    [145100, 145101],         // jo right
    [145098, 145099],         // jo left
    [146000, 146001],         // thermo right
    [145998, 145999],         // thermo left
  ];
  for (const sensors of probeSensors) {
    const driveMap = new Map();
    for (const idx of sensors) driveMap.set(idx, PROBE_INTENSITY);
    for (let t = 1; t <= 60; t++) {
      if (t >= 11 && t <= 35) runtime.setSensoryDrives(driveMap);
      else { runtime.sensoryDrives.clear(); runtime.net.ext.fill(0); }
      runtime.step(1);
    }
  }

  // Induction: 30 cycles
  for (let c = 1; c <= INDUCTION_CYCLES; c++) {
    const driveMap = new Map();
    for (const idx of AFFERENT_SENSORS) driveMap.set(idx, PROBE_INTENSITY);
    for (let t = 1; t <= 60; t++) {
      if (t >= 11 && t <= 35) runtime.setSensoryDrives(driveMap);
      else { runtime.sensoryDrives.clear(); runtime.net.ext.fill(0); }
      runtime.step(1);
      if (t >= 15 && t <= 45 && t % 2 === 0) {
        runtime.plasticity.applyModulatoryUpdate(1.0, runtime.plasticity.stepCount + 1);
      }
    }
  }

  // Post-induction live probe
  const probeRes = runStandardizedIsolatedProbe(runtime, AFFERENT_SENSORS, {
    intensity: PROBE_INTENSITY,
    probeType: "CONTINUATION",
  });

  return {
    source: "RECONSTRUCTED_SCHEDULE_CONTROL",
    schedule: "LEGACY_D2_SCHEDULE",
    seed,
    right_dna02_rate: probeRes.right_dna02_rate,
    turn_right_strength: probeRes.turn_right_strength,
    turn_left_strength: probeRes.turn_left_strength,
    stored_efficacy_budget: runtime.plasticity.getStoredEfficacyBudget(),
    active_coupling_budget: runtime.plasticity.getActiveCouplingBudget(),
    revived_edge_count: runtime.plasticity.getActivatedEdgeCount(),
    recruited: probeRes.right_dna02_rate >= 0.05,
  };
}

/**
 * Reconstructed Schedule Control D.3 (No multimodal pre-probes).
 */
function runReconstructedScheduleD3(seed) {
  const runtime = new ConnectomeRuntime({
    seed,
    plasticity: {
      config: {
        enabled: true,
        rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
        learningRate: 0.15,
        passiveDecay: 0.0005,
        traceDecay: 0.05,
        maxAbsoluteDeltaW: MANIFEST_A.safety_bounds.max_edge_delta,
        maxPercentageDeviation: MANIFEST_A.safety_bounds.max_percentage_change,
        totalGlobalBudget: MANIFEST_A.safety_bounds.max_total_budget,
        updateRateLimit: 5.0,
        effectiveEdgePolicy: EFFECTIVE_EDGE_POLICIES.MODEL_B_EXPLICIT_REVIVAL,
      },
      eligibleEdgeMask: [],
    },
  });

  const eligibleEdges = getEligibleEdgeIndices(runtime, MANIFEST_A);
  runtime.plasticity.setEligibleEdgeMask(eligibleEdges);

  // Induction: 30 cycles
  for (let c = 1; c <= INDUCTION_CYCLES; c++) {
    const driveMap = new Map();
    for (const idx of AFFERENT_SENSORS) driveMap.set(idx, PROBE_INTENSITY);
    for (let t = 1; t <= 60; t++) {
      if (t >= 11 && t <= 35) runtime.setSensoryDrives(driveMap);
      else { runtime.sensoryDrives.clear(); runtime.net.ext.fill(0); }
      runtime.step(1);
      if (t >= 15 && t <= 45 && t % 2 === 0) {
        runtime.plasticity.applyModulatoryUpdate(1.0, runtime.plasticity.stepCount + 1);
      }
    }
  }

  const probeRes = runStandardizedIsolatedProbe(runtime, AFFERENT_SENSORS, {
    intensity: PROBE_INTENSITY,
    probeType: "CONTINUATION",
  });

  return {
    source: "RECONSTRUCTED_SCHEDULE_CONTROL",
    schedule: "LEGACY_D3_SCHEDULE",
    seed,
    right_dna02_rate: probeRes.right_dna02_rate,
    turn_right_strength: probeRes.turn_right_strength,
    turn_left_strength: probeRes.turn_left_strength,
    stored_efficacy_budget: runtime.plasticity.getStoredEfficacyBudget(),
    active_coupling_budget: runtime.plasticity.getActiveCouplingBudget(),
    revived_edge_count: runtime.plasticity.getActivatedEdgeCount(),
    recruited: probeRes.right_dna02_rate >= 0.05,
  };
}

/**
 * Repaired Unified Harness (Model A or Model B) with faithful fresh-evoked isolated clone probe.
 */
function runRepairedEvaluation(seed, policy) {
  const runtime = new ConnectomeRuntime({
    seed,
    plasticity: {
      config: {
        enabled: true,
        rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
        learningRate: 0.15,
        passiveDecay: 0.0005,
        traceDecay: 0.05,
        maxAbsoluteDeltaW: MANIFEST_A.safety_bounds.max_edge_delta,
        maxPercentageDeviation: MANIFEST_A.safety_bounds.max_percentage_change,
        totalGlobalBudget: MANIFEST_A.safety_bounds.max_total_budget,
        updateRateLimit: 5.0,
        effectiveEdgePolicy: policy,
      },
      eligibleEdgeMask: [],
    },
  });

  const eligibleEdges = getEligibleEdgeIndices(runtime, MANIFEST_A);
  runtime.plasticity.setEligibleEdgeMask(eligibleEdges);

  // Baseline probe (fresh evoked)
  const preProbe = runStandardizedIsolatedProbe(runtime, AFFERENT_SENSORS, {
    intensity: PROBE_INTENSITY,
    probeType: "FRESH_EVOKED",
  });

  // Induction: 30 cycles of Target A sensory stimulation with scheduled reinforcement
  for (let c = 1; c <= INDUCTION_CYCLES; c++) {
    const driveMap = new Map();
    for (const idx of AFFERENT_SENSORS) driveMap.set(idx, PROBE_INTENSITY);
    for (let t = 1; t <= 60; t++) {
      if (t >= 11 && t <= 35) runtime.setSensoryDrives(driveMap);
      else { runtime.sensoryDrives.clear(); runtime.net.ext.fill(0); }
      runtime.step(1);
      if (t >= 15 && t <= 45 && t % 2 === 0) {
        runtime.plasticity.applyModulatoryUpdate(1.0, runtime.plasticity.stepCount + 1);
      }
    }
  }

  // Post-induction probe (faithful fresh evoked)
  const postProbe = runStandardizedIsolatedProbe(runtime, AFFERENT_SENSORS, {
    intensity: PROBE_INTENSITY,
    probeType: "FRESH_EVOKED",
  });

  const storedBudget = +runtime.plasticity.getStoredEfficacyBudget().toFixed(4);
  const activeBudget = +runtime.plasticity.getActiveCouplingBudget().toFixed(4);
  const revivedEdges = runtime.plasticity.getActivatedEdgeCount();

  // Causal counterfactual reset check: Branch B (deltaW reset)
  const branchReset = runtime.createCounterfactualBranch("BRANCH_B_DELTA_W_RESET");
  const postResetProbe = runStandardizedIsolatedProbe(runtime, AFFERENT_SENSORS, {
    intensity: PROBE_INTENSITY,
    probeType: "FRESH_EVOKED",
  });

  return {
    source: "REPAIRED_UNIFIED_HARNESS",
    policy,
    seed,
    stored_efficacy_budget: storedBudget,
    active_coupling_budget: activeBudget,
    revived_edge_count: revivedEdges,
    pre_dna02: preProbe.right_dna02_rate,
    post_dna02: postProbe.right_dna02_rate,
    dna02_delta: +(postProbe.right_dna02_rate - preProbe.right_dna02_rate).toFixed(4),
    pre_turn_right: preProbe.turn_right_strength,
    post_turn_right: postProbe.turn_right_strength,
    post_turn_left: postProbe.turn_left_strength,
    post_forward: postProbe.forward_strength,
    post_backward: postProbe.backward_strength,
    post_halt: postProbe.halt_strength,
    post_reset_dna02: postResetProbe.right_dna02_rate,
    recruited: postProbe.right_dna02_rate >= 0.05,
    crossed_turn_right: postProbe.turn_right_strength > postProbe.turn_left_strength && postProbe.turn_right_strength >= 0.05,
    reset_abolished: postResetProbe.right_dna02_rate < 0.05,
    active_weights_hash: postProbe.active_weights_hash,
  };
}

/**
 * Matched Baseline Control (Q0: PLASTICITY_NONE).
 */
function runMatchedBaselineControl(seed) {
  const runtime = new ConnectomeRuntime({ seed });
  const probe = runStandardizedIsolatedProbe(runtime, AFFERENT_SENSORS, {
    intensity: PROBE_INTENSITY,
    probeType: "FRESH_EVOKED",
  });
  return {
    control_id: "Q0_BASELINE_NONE",
    seed,
    right_dna02_rate: probe.right_dna02_rate,
    turn_right_strength: probe.turn_right_strength,
    recruited: probe.right_dna02_rate >= 0.05,
  };
}

/**
 * Matched Old Rule Control (Q1: Target C ELIGIBILITY_MODULATED_HEBBIAN).
 */
function runMatchedOldRuleControl(seed) {
  const runtime = new ConnectomeRuntime({
    seed,
    plasticity: {
      config: {
        enabled: true,
        rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
        learningRate: 0.15,
        passiveDecay: 0.0005,
        traceDecay: 0.05,
        maxAbsoluteDeltaW: MANIFEST_C.safety_bounds.max_edge_delta,
        maxPercentageDeviation: MANIFEST_C.safety_bounds.max_percentage_change,
        totalGlobalBudget: MANIFEST_C.safety_bounds.max_total_budget,
        updateRateLimit: 5.0,
        effectiveEdgePolicy: EFFECTIVE_EDGE_POLICIES.MODEL_A_RETAINED_ONLY,
      },
      eligibleEdgeMask: [],
    },
  });

  const eligibleEdges = getEligibleEdgeIndices(runtime, MANIFEST_C);
  runtime.plasticity.setEligibleEdgeMask(eligibleEdges);

  for (let c = 1; c <= INDUCTION_CYCLES; c++) {
    const driveMap = new Map();
    for (const idx of AFFERENT_SENSORS) driveMap.set(idx, PROBE_INTENSITY);
    for (let t = 1; t <= 60; t++) {
      if (t >= 11 && t <= 35) runtime.setSensoryDrives(driveMap);
      else { runtime.sensoryDrives.clear(); runtime.net.ext.fill(0); }
      runtime.step(1);
      if (t >= 15 && t <= 45 && t % 2 === 0) {
        runtime.plasticity.applyModulatoryUpdate(1.0, runtime.plasticity.stepCount + 1);
      }
    }
  }

  const probe = runStandardizedIsolatedProbe(runtime, AFFERENT_SENSORS, {
    intensity: PROBE_INTENSITY,
    probeType: "FRESH_EVOKED",
  });

  return {
    control_id: "Q1_OLD_RULE_TARGET_C",
    seed,
    right_dna02_rate: probe.right_dna02_rate,
    turn_right_strength: probe.turn_right_strength,
    stored_efficacy_budget: runtime.plasticity.getStoredEfficacyBudget(),
    recruited: probe.right_dna02_rate >= 0.05,
  };
}

/**
 * Matched No Modulation Control (Q6: Target A SUBTHRESHOLD, g_t = 0).
 */
function runMatchedNoModulationControl(seed) {
  const runtime = new ConnectomeRuntime({
    seed,
    plasticity: {
      config: {
        enabled: true,
        rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
        learningRate: 0.15,
        passiveDecay: 0.0005,
        traceDecay: 0.05,
        maxAbsoluteDeltaW: MANIFEST_A.safety_bounds.max_edge_delta,
        maxPercentageDeviation: MANIFEST_A.safety_bounds.max_percentage_change,
        totalGlobalBudget: MANIFEST_A.safety_bounds.max_total_budget,
        updateRateLimit: 5.0,
        effectiveEdgePolicy: EFFECTIVE_EDGE_POLICIES.MODEL_A_RETAINED_ONLY,
      },
      eligibleEdgeMask: [],
    },
  });

  const eligibleEdges = getEligibleEdgeIndices(runtime, MANIFEST_A);
  runtime.plasticity.setEligibleEdgeMask(eligibleEdges);

  for (let c = 1; c <= INDUCTION_CYCLES; c++) {
    const driveMap = new Map();
    for (const idx of AFFERENT_SENSORS) driveMap.set(idx, PROBE_INTENSITY);
    for (let t = 1; t <= 60; t++) {
      if (t >= 11 && t <= 35) runtime.setSensoryDrives(driveMap);
      else { runtime.sensoryDrives.clear(); runtime.net.ext.fill(0); }
      runtime.step(1);
      if (t >= 15 && t <= 45 && t % 2 === 0) {
        runtime.plasticity.applyModulatoryUpdate(0.0, runtime.plasticity.stepCount + 1); // zero modulation
      }
    }
  }

  const probe = runStandardizedIsolatedProbe(runtime, AFFERENT_SENSORS, {
    intensity: PROBE_INTENSITY,
    probeType: "FRESH_EVOKED",
  });

  return {
    control_id: "Q6_NO_MODULATION_TARGET_A",
    seed,
    right_dna02_rate: probe.right_dna02_rate,
    turn_right_strength: probe.turn_right_strength,
    stored_efficacy_budget: runtime.plasticity.getStoredEfficacyBudget(),
    recruited: probe.right_dna02_rate >= 0.05,
  };
}

// ====================================================================
// MAIN ACCEPTANCE EXECUTION
// ====================================================================

console.log("=================================================================");
console.log("THREE-SEED ACCEPTANCE RUN: FAITHFUL PROBING & HONEST PROVENANCE");
console.log("=================================================================");

const results = [];

for (const seed of SEEDS) {
  console.log(`\n--- Evaluating Seed ${seed} ---`);

  // 1. Pinned Historical Execution D.2
  const pinnedD2 = getPinnedHistoricalD2(seed);
  console.log(`  Pinned D.2:           Budget=${pinnedD2.total_budget_used}, DNa02=${pinnedD2.right_dna02_rate} Hz, TurnRight=${pinnedD2.turn_right_strength} (Recruited=${pinnedD2.recruited})`);

  // 2. Reconstructed Schedule Controls
  const reconD2 = runReconstructedScheduleD2(seed);
  console.log(`  Reconstructed D.2:    StoredBudget=${reconD2.stored_efficacy_budget}, DNa02=${reconD2.right_dna02_rate} Hz, TurnRight=${reconD2.turn_right_strength}`);

  const reconD3 = runReconstructedScheduleD3(seed);
  console.log(`  Reconstructed D.3:    StoredBudget=${reconD3.stored_efficacy_budget}, DNa02=${reconD3.right_dna02_rate} Hz, TurnRight=${reconD3.turn_right_strength}`);

  // 3. Repaired Unified Harness Model A (Retained Only)
  const repA = runRepairedEvaluation(seed, EFFECTIVE_EDGE_POLICIES.MODEL_A_RETAINED_ONLY);
  console.log(`  Repaired Model A:     StoredBudget=${repA.stored_efficacy_budget}, ActiveBudget=${repA.active_coupling_budget}, RevivedEdges=${repA.revived_edge_count}, DNa02=${repA.post_dna02} Hz, TurnRight=${repA.post_turn_right} (Recruited=${repA.recruited}, ResetAbolished=${repA.reset_abolished})`);

  // 4. Repaired Unified Harness Model B (Explicit Revival)
  const repB = runRepairedEvaluation(seed, EFFECTIVE_EDGE_POLICIES.MODEL_B_EXPLICIT_REVIVAL);
  console.log(`  Repaired Model B:     StoredBudget=${repB.stored_efficacy_budget}, ActiveBudget=${repB.active_coupling_budget}, RevivedEdges=${repB.revived_edge_count}, DNa02=${repB.post_dna02} Hz, TurnRight=${repB.post_turn_right} (Recruited=${repB.recruited}, ResetAbolished=${repB.reset_abolished})`);

  // 5. Matched Controls
  const ctrlQ0 = runMatchedBaselineControl(seed);
  const ctrlQ1 = runMatchedOldRuleControl(seed);
  const ctrlQ6 = runMatchedNoModulationControl(seed);
  console.log(`  Matched Controls:     Q0 Baseline DNa02=${ctrlQ0.right_dna02_rate} Hz | Q1 Old Rule DNa02=${ctrlQ1.right_dna02_rate} Hz | Q6 No-Mod DNa02=${ctrlQ6.right_dna02_rate} Hz`);

  results.push({
    seed,
    pinned_historical_d2: pinnedD2,
    phase4d3_cohort_note: "Phase IV-D.3 used seeds 18200..18299. No pinned historical D.3 execution exists for seed " + seed,
    reconstructed_schedule_d2: reconD2,
    reconstructed_schedule_d3: reconD3,
    repaired_model_a_retained_only: repA,
    repaired_model_b_explicit_revival: repB,
    matched_controls: {
      q0_baseline: ctrlQ0,
      q1_old_rule: ctrlQ1,
      q6_no_modulation: ctrlQ6,
    },
  });
}

const outPath = path.join(ROOT, "artifacts", "audit", "diagnostic_three_seed_acceptance.json");
const payload = {
  timestamp: new Date().toISOString(),
  target: "TARGET_A_AFFERENT_ONLY",
  induction_cycles: INDUCTION_CYCLES,
  stim_intensity_hz: PROBE_INTENSITY,
  probe_specification: {
    probe_type: "FRESH_EVOKED",
    intensity_hz: PROBE_INTENSITY,
    duration_steps: 60,
    stim_window: [11, 35],
    clone_mechanism: "ConnectomeRuntime.cloneForProbe(disablePlasticity: true)",
    floating_point_active_weights: "Float32Array",
    telemetry_schema: "assertValidCandidate(action_class, activation_strength)",
  },
  seeds: SEEDS,
  comparisons: results,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`\nWrote complete acceptance results to: ${outPath}`);
