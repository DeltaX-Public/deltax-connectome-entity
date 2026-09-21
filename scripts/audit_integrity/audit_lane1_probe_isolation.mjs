import { ConnectomeRuntime } from "../../src/connectome/runtime.mjs";
import { PLASTICITY_RULES } from "../../src/connectome/plasticity_overlay.mjs";
import fs from "fs";
import path from "path";

const RIGHT_TACTILE = [149560, 154130, 154675, 154731, 154816, 155200, 156889, 159953];
const RIGHT_DNA02 = 332;
const RIGHT_AN03A008 = 2937;
const INTENSITY = 180.0;

function loadManifestTargetA() {
  const p = path.join(process.cwd(), "artifacts", "plasticity", "target_a_afferent_only.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function runStandardizedProbe(runtime, driveSensorIndices, intensity = INTENSITY, totalSteps = 60, stimWindow = [11, 35]) {
  runtime.net.reset();
  runtime.net.ext.fill(0);
  runtime.sensoryDrives.clear();

  const driveMap = new Map();
  for (const idx of driveSensorIndices) driveMap.set(idx, intensity);

  let sumRightDNa02 = 0;
  for (let step = 1; step <= totalSteps; step++) {
    if (step >= stimWindow[0] && step <= stimWindow[1]) {
      runtime.setSensoryDrives(driveMap);
    } else {
      runtime.sensoryDrives.clear();
      runtime.net.ext.fill(0);
    }
    runtime.step(1);
    if (step >= stimWindow[0] && step <= stimWindow[1]) {
      sumRightDNa02 += runtime.net.r[RIGHT_DNA02];
    }
  }
  return { mean_dna02_rate: sumRightDNa02 / (stimWindow[1] - stimWindow[0] + 1) };
}

function runExperiment(mode, seed = 18100, cycles = 10) {
  const manifest = loadManifestTargetA();
  const rt = new ConnectomeRuntime({
    seed,
    substepsPerTick: 1,
    plasticity: {
      enabled: true,
      rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
      learningRate: 0.15,
      traceDecay: 0.05,
      passiveDecay: 0.0005,
      updateRateLimit: 5.0,
      totalGlobalBudget: manifest.safety_bounds.max_total_budget,
      maxAbsoluteDeltaW: manifest.safety_bounds.max_edge_delta,
      maxPercentageDeviation: manifest.safety_bounds.max_percentage_change,
    },
  });

  const eligibleIndices = [];
  for (const edge of manifest.eligible_edges) {
    const k = rt.plasticity.findEdgeIndex(edge.source, edge.target);
    if (k >= 0) eligibleIndices.push(k);
  }
  rt.plasticity.setEligibleEdgeMask(eligibleIndices);

  const driveMap = new Map();
  for (const idx of RIGHT_TACTILE) driveMap.set(idx, INTENSITY);

  for (let cycle = 1; cycle <= cycles; cycle++) {
    // 1. Contact phase: 3 ticks (30 ms) with tactile contact -> g_t = 0.0
    rt.setSensoryDrives(driveMap);
    for (let t = 0; t < 3; t++) {
      rt.step(10);
      rt.plasticity.applyModulatoryUpdate(0.0);
    }

    // 2. Clearance phase: 2 ticks (20 ms) with clearance -> g_t = 1.0
    rt.sensoryDrives.clear();
    rt.net.ext.fill(0);
    for (let t = 0; t < 2; t++) {
      rt.step(10);
      rt.plasticity.applyModulatoryUpdate(1.0);
    }

    // 3. ITI phase: 5 ticks (50 ms) quiescent
    for (let t = 0; t < 5; t++) {
      rt.step(10);
    }

    // Probing intervention
    if (mode === "WITH_IN_PLACE_PROBE") {
      const snap = rt.snapshot();
      if (rt.plasticity) rt.plasticity.config.enabled = false;
      runStandardizedProbe(rt, RIGHT_TACTILE);
      if (rt.plasticity) rt.plasticity.config.enabled = true;
      rt.restore(snap);
    } else if (mode === "WITH_ISOLATED_CLONE_PROBE") {
      // Create isolated clone by snapshotting, restoring onto a fresh runtime instance
      const snap = rt.snapshot();
      const cloneRt = new ConnectomeRuntime({ seed, substepsPerTick: 1, plasticity: false });
      cloneRt.restore(snap);
      runStandardizedProbe(cloneRt, RIGHT_TACTILE);
      // rt is completely untouched
    }
  }

  // Measure final state
  const finalHash = rt.plasticity.getHash();
  const finalBudget = rt.plasticity.getGlobalBudgetUsed();
  const finalDeltaW = Array.from(rt.plasticity.deltaW.entries()).map(([k, v]) => ({ k, v }));
  const steps = rt.net._steps;
  const time = rt.net.t;

  return { mode, finalHash, finalBudget, finalDeltaW, steps, time };
}

export function auditProbeIsolation() {
  console.log("\n=======================================================");
  console.log("LANE 1.2: PROBE ISOLATION AUDIT");
  console.log("=======================================================");

  console.log("Running Mode 1: UNINTERRUPTED (No intermediate probes)...");
  const uninterrupted = runExperiment("UNINTERRUPTED");

  console.log("Running Mode 2: WITH_IN_PLACE_PROBE (D.3 in-place restore pattern)...");
  const inPlace = runExperiment("WITH_IN_PLACE_PROBE");

  console.log("Running Mode 3: WITH_ISOLATED_CLONE_PROBE (isolated probe pattern)...");
  const isolated = runExperiment("WITH_ISOLATED_CLONE_PROBE");

  console.log("\n--- Comparison Results ---");
  console.log(`Uninterrupted:`);
  console.log(`  Hash:        ${uninterrupted.finalHash}`);
  console.log(`  Budget:      ${uninterrupted.finalBudget.toFixed(6)}`);
  console.log(`  _steps:      ${uninterrupted.steps}`);
  console.log(`  Sim time ms: ${uninterrupted.time}`);

  console.log(`\nIn-Place Probe (D.3):`);
  console.log(`  Hash:        ${inPlace.finalHash}`);
  console.log(`  Budget:      ${inPlace.finalBudget.toFixed(6)}`);
  console.log(`  _steps:      ${inPlace.steps}`);
  console.log(`  Sim time ms: ${inPlace.time}`);

  console.log(`\nIsolated Clone Probe:`);
  console.log(`  Hash:        ${isolated.finalHash}`);
  console.log(`  Budget:      ${isolated.finalBudget.toFixed(6)}`);
  console.log(`  _steps:      ${isolated.steps}`);
  console.log(`  Sim time ms: ${isolated.time}`);

  const matchIsolated = uninterrupted.finalHash === isolated.finalHash;
  const matchInPlace = uninterrupted.finalHash === inPlace.finalHash;

  console.log(`\nVerdict:`);
  console.log(`  Uninterrupted == Isolated Clone: ${matchIsolated ? "EXACT BIT-MATCH (PASS)" : "DIVERGED (FAIL)"}`);
  console.log(`  Uninterrupted == In-Place Probe: ${matchInPlace ? "EXACT BIT-MATCH (PASS)" : "DIVERGED (FAIL)"}`);
  console.log(`  Step count divergence in in-place probe: ${inPlace.steps - uninterrupted.steps} steps (${inPlace.steps} vs ${uninterrupted.steps})`);

  return {
    uninterrupted,
    inPlace,
    isolated,
    matchIsolated,
    matchInPlace,
  };
}

auditProbeIsolation();
