import { ConnectomeRuntime } from "../../src/connectome/runtime.mjs";
import {
  PlasticityOverlay,
  PLASTICITY_RULES,
  EFFECTIVE_EDGE_POLICIES,
  computeSubthresholdPostsynapticFactor,
} from "../../src/connectome/plasticity_overlay.mjs";
import { generateCandidates_C_IndependentAxes } from "../../src/connectome/candidate_readouts.mjs";
import { runStandardizedIsolatedProbe } from "../../src/connectome/isolated_probe.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

const bodymapPath = path.resolve(REPO_ROOT, "upstream/fly-brain/public/data/bodymap.json");
const bodymap = JSON.parse(fs.readFileSync(bodymapPath, "utf-8"));
const RIGHT_TACTILE = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];
const LEFT_TACTILE = bodymap.sensors.find((s) => s.name === "tactile T1 left")?.idx || [];
const JO_AUDITORY_RIGHT = bodymap.sensors.find((s) => s.name === "JO auditory right")?.idx || [];
const JO_AUDITORY_LEFT = bodymap.sensors.find((s) => s.name === "JO auditory left")?.idx || [];
const THERMO_RIGHT = bodymap.sensors.find((s) => s.name === "thermosensory right")?.idx || [];
const THERMO_LEFT = bodymap.sensors.find((s) => s.name === "thermosensory left")?.idx || [];

const RIGHT_DNA02 = 332;
const LEFT_DNA02 = 130496;
const RIGHT_AN03A008 = 2937;
const INTENSITY = 180.0;
const INDUCTION_CYCLES = 30;

function loadManifestTargetA() {
  const p = path.resolve(REPO_ROOT, "artifacts/plasticity/target_a_afferent_only.json");
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

/**
 * Legacy in-place probe as executed in D.2 and D.3 harnesses (MUTATING).
 */
function runLegacyInPlaceProbe(runtime, driveSensorIndices) {
  runtime.net.reset();
  runtime.net.ext.fill(0);
  runtime.sensoryDrives.clear();

  const driveMap = new Map();
  for (const idx of driveSensorIndices) driveMap.set(idx, INTENSITY);

  let sumRightDNa02 = 0;
  let sumCandRight = 0;
  const stimWindow = [11, 35];

  for (let step = 1; step <= 60; step++) {
    if (step >= stimWindow[0] && step <= stimWindow[1]) {
      runtime.setSensoryDrives(driveMap);
    } else {
      runtime.sensoryDrives.clear();
      runtime.net.ext.fill(0);
    }

    runtime.step(1);

    if (step >= stimWindow[0] && step <= stimWindow[1]) {
      const dn = runtime.getDescendingNeuronReadouts();
      const cands = generateCandidates_C_IndependentAxes(dn, step);
      sumRightDNa02 += runtime.net.r[RIGHT_DNA02];
      sumCandRight += (cands.find((c) => c.action === "TURN_RIGHT")?.confidence || 0);
    }
  }
  const count = stimWindow[1] - stimWindow[0] + 1;
  return {
    right_dna02_rate: +(sumRightDNa02 / count).toFixed(4),
    turn_right_strength: +(sumCandRight / count).toFixed(4),
  };
}

/**
 * 1. Archived Legacy D.2 Harness:
 * - 6 in-place probes pre-induction without disabling plasticity
 * - ThermoLeft residual contralateral inhibition + dirty traces
 * - In-place post probe
 */
function runLegacyD2(seed) {
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

  // 6 pre-induction probes without disabling plasticity
  runLegacyInPlaceProbe(rt, RIGHT_TACTILE);
  runLegacyInPlaceProbe(rt, LEFT_TACTILE);
  runLegacyInPlaceProbe(rt, JO_AUDITORY_RIGHT);
  runLegacyInPlaceProbe(rt, JO_AUDITORY_LEFT);
  runLegacyInPlaceProbe(rt, THERMO_RIGHT);
  runLegacyInPlaceProbe(rt, THERMO_LEFT);

  const driveMap = new Map();
  for (const idx of RIGHT_TACTILE) driveMap.set(idx, INTENSITY);

  for (let cycle = 0; cycle < INDUCTION_CYCLES; cycle++) {
    rt.setSensoryDrives(driveMap);
    for (let t = 0; t < 3; t++) {
      rt.step(10);
      rt.plasticity.applyModulatoryUpdate(0.0);
    }
    rt.sensoryDrives.clear();
    rt.net.ext.fill(0);
    for (let t = 0; t < 2; t++) {
      rt.step(10);
      rt.plasticity.applyModulatoryUpdate(1.0);
    }
    for (let t = 0; t < 5; t++) {
      rt.step(10);
    }
  }

  const post = runLegacyInPlaceProbe(rt, RIGHT_TACTILE);
  return {
    harness: "ARCHIVED_LEGACY_D2",
    seed,
    budget_used: +rt.plasticity.getGlobalBudgetUsed().toFixed(4),
    right_dna02_rate: post.right_dna02_rate,
    turn_right_strength: post.turn_right_strength,
    recruited: post.right_dna02_rate > 0.05,
    crossed_turn_right: post.turn_right_strength > 0.05,
  };
}

/**
 * 2. Archived Legacy D.3 Harness:
 * - 1 in-place probe pre-induction with plasticity disabled
 * - Checkpoint probes with snapshot/restore
 * - In-place post probe
 */
function runLegacyD3(seed) {
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

  if (rt.plasticity) rt.plasticity.config.enabled = false;
  runLegacyInPlaceProbe(rt, RIGHT_TACTILE);
  if (rt.plasticity) rt.plasticity.config.enabled = true;

  const driveMap = new Map();
  for (const idx of RIGHT_TACTILE) driveMap.set(idx, INTENSITY);

  const CHECKPOINTS = [1, 2, 3, 5, 8, 12, 16, 20, 25, 30];

  for (let cycle = 1; cycle <= INDUCTION_CYCLES; cycle++) {
    rt.setSensoryDrives(driveMap);
    for (let t = 0; t < 3; t++) {
      rt.step(10);
      rt.plasticity.applyModulatoryUpdate(0.0);
    }
    rt.sensoryDrives.clear();
    rt.net.ext.fill(0);
    for (let t = 0; t < 2; t++) {
      rt.step(10);
      rt.plasticity.applyModulatoryUpdate(1.0);
    }
    for (let t = 0; t < 5; t++) {
      rt.step(10);
    }

    if (CHECKPOINTS.includes(cycle)) {
      const snap = rt.snapshot();
      if (rt.plasticity) rt.plasticity.config.enabled = false;
      runLegacyInPlaceProbe(rt, RIGHT_TACTILE);
      if (rt.plasticity) rt.plasticity.config.enabled = true;
      rt.restore(snap);
    }
  }

  if (rt.plasticity) rt.plasticity.config.enabled = false;
  const post = runLegacyInPlaceProbe(rt, RIGHT_TACTILE);
  return {
    harness: "ARCHIVED_LEGACY_D3",
    seed,
    budget_used: +rt.plasticity.getGlobalBudgetUsed().toFixed(4),
    right_dna02_rate: post.right_dna02_rate,
    turn_right_strength: post.turn_right_strength,
    recruited: post.right_dna02_rate > 0.05,
    crossed_turn_right: post.turn_right_strength > 0.05,
  };
}

/**
 * 3 & 4. Corrected Unified Harness:
 * - Isolated non-mutating probes (zero interference with live training runtime)
 * - Input-cache synchronization active
 * - Full-buffer base checksum validation
 * - Model A (retained only) vs Model B (explicit revival)
 */
function runRepairedUnified(seed, effectiveEdgePolicy) {
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
      effectiveEdgePolicy,
    },
  });

  const eligibleIndices = [];
  for (const edge of manifest.eligible_edges) {
    const k = rt.plasticity.findEdgeIndex(edge.source, edge.target);
    if (k >= 0) eligibleIndices.push(k);
  }
  rt.plasticity.setEligibleEdgeMask(eligibleIndices);

  // Pre-induction baseline using isolated clone probe (training runtime remains 100% bit-untouched)
  const pre = runStandardizedIsolatedProbe(rt, RIGHT_TACTILE);

  const driveMap = new Map();
  for (const idx of RIGHT_TACTILE) driveMap.set(idx, INTENSITY);

  for (let cycle = 1; cycle <= INDUCTION_CYCLES; cycle++) {
    rt.setSensoryDrives(driveMap);
    for (let t = 0; t < 3; t++) {
      rt.step(10);
      rt.plasticity.applyModulatoryUpdate(0.0);
    }
    rt.sensoryDrives.clear();
    rt.net.ext.fill(0);
    for (let t = 0; t < 2; t++) {
      rt.step(10);
      rt.plasticity.applyModulatoryUpdate(1.0);
    }
    for (let t = 0; t < 5; t++) {
      rt.step(10);
    }
  }

  // Post-induction isolated probe
  const post = runStandardizedIsolatedProbe(rt, RIGHT_TACTILE);

  return {
    harness: "REPAIRED_UNIFIED",
    policy: effectiveEdgePolicy,
    seed,
    budget_used: +rt.plasticity.getGlobalBudgetUsed().toFixed(4),
    pre_dna02: pre.right_dna02_rate,
    post_dna02: post.right_dna02_rate,
    dna02_delta: +(post.right_dna02_rate - pre.right_dna02_rate).toFixed(4),
    post_turn_right: post.cand_right_turn,
    recruited: post.right_dna02_rate > 0.05,
    crossed_turn_right: post.cand_right_turn > 0.05,
    hash: rt.plasticity.getHash(),
  };
}

const SEEDS = [18100, 18101, 18102];
const results = {
  timestamp: new Date().toISOString(),
  target: "TARGET_A_AFFERENT_ONLY",
  induction_cycles: INDUCTION_CYCLES,
  seeds: SEEDS,
  comparisons: [],
};

console.log("\n=======================================================");
console.log("THREE-SEED DIAGNOSTIC EVALUATION (Seeds 18100..18102)");
console.log("=======================================================\n");

for (const s of SEEDS) {
  console.log(`--- Seed ${s} ---`);
  const d2 = runLegacyD2(s);
  console.log(`  Legacy D.2:       Budget=${d2.budget_used.toFixed(2)}, DNa02=${d2.right_dna02_rate} Hz (Recruited=${d2.recruited})`);

  const d3 = runLegacyD3(s);
  console.log(`  Legacy D.3:       Budget=${d3.budget_used.toFixed(2)}, DNa02=${d3.right_dna02_rate} Hz (Recruited=${d3.recruited})`);

  const repA = runRepairedUnified(s, EFFECTIVE_EDGE_POLICIES.MODEL_A_RETAINED_ONLY);
  console.log(`  Repaired Model A: Budget=${repA.budget_used.toFixed(2)}, DNa02=${repA.post_dna02} Hz (Δ=${repA.dna02_delta > 0 ? "+" : ""}${repA.dna02_delta}, Recruited=${repA.recruited})`);

  const repB = runRepairedUnified(s, EFFECTIVE_EDGE_POLICIES.MODEL_B_EXPLICIT_REVIVAL);
  console.log(`  Repaired Model B: Budget=${repB.budget_used.toFixed(2)}, DNa02=${repB.post_dna02} Hz (Δ=${repB.dna02_delta > 0 ? "+" : ""}${repB.dna02_delta}, Recruited=${repB.recruited})`);

  results.comparisons.push({
    seed: s,
    legacy_d2: d2,
    legacy_d3: d3,
    repaired_model_a_retained_only: repA,
    repaired_model_b_explicit_revival: repB,
  });
}

const outPath = path.resolve(REPO_ROOT, "artifacts/audit/diagnostic_three_seed_comparison.json");
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nWrote complete comparison to: ${outPath}`);
