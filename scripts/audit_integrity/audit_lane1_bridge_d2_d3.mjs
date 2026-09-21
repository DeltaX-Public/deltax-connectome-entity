import { ConnectomeRuntime } from "../../src/connectome/runtime.mjs";
import { PLASTICITY_RULES } from "../../src/connectome/plasticity_overlay.mjs";
import { generateCandidates_C_IndependentAxes } from "../../src/connectome/candidate_readouts.mjs";
import fs from "fs";
import path from "path";

const bodymap = JSON.parse(fs.readFileSync("upstream/fly-brain/public/data/bodymap.json", "utf-8"));
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
  let sumCandRight = 0;
  for (let step = 1; step <= totalSteps; step++) {
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
      sumCandRight += cands.find((c) => c.action_class === "turn_right")?.activation_strength || 0.01;
    }
  }
  const count = stimWindow[1] - stimWindow[0] + 1;
  return {
    right_dna02_rate: sumRightDNa02 / count,
    turn_right_strength: sumCandRight / count,
  };
}

function runD2Harness(seed) {
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

  // Exact D.2: 6 pre-induction baseline probes without disabling plasticity
  runStandardizedProbe(rt, RIGHT_TACTILE);
  runStandardizedProbe(rt, LEFT_TACTILE);
  runStandardizedProbe(rt, JO_AUDITORY_RIGHT);
  runStandardizedProbe(rt, JO_AUDITORY_LEFT);
  runStandardizedProbe(rt, THERMO_RIGHT);
  runStandardizedProbe(rt, THERMO_LEFT);

  // Check dirty eligibility trace count
  const dirtyTracesCount = rt.plasticity.eligibilityTraces.size;
  let maxDirtyTrace = 0;
  for (const v of rt.plasticity.eligibilityTraces.values()) {
    if (Math.abs(v) > maxDirtyTrace) maxDirtyTrace = Math.abs(v);
  }

  // Exact D.2 Induction: 30 cycles (3 contact + 2 clearance + 5 ITI)
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

  // Post-induction probe
  const postProbe = runStandardizedProbe(rt, RIGHT_TACTILE);
  return {
    harness: "D.2_ORIGINAL",
    seed,
    dirtyTracesCount,
    maxDirtyTrace,
    budgetUsed: rt.plasticity.getGlobalBudgetUsed(),
    postDNa02: postProbe.right_dna02_rate,
    postTurnRight: postProbe.turn_right_strength,
    recruited: postProbe.right_dna02_rate > 0.05,
    crossedTurnRight: postProbe.turn_right_strength > 0.05,
  };
}

function runD3Harness(seed) {
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

  // Exact D.3: 1 pre-induction probe with plasticity disabled
  if (rt.plasticity) rt.plasticity.config.enabled = false;
  runStandardizedProbe(rt, RIGHT_TACTILE);
  if (rt.plasticity) rt.plasticity.config.enabled = true;

  const dirtyTracesCount = rt.plasticity.eligibilityTraces.size;
  let maxDirtyTrace = 0;

  // Exact D.3 Induction: 30 cycles (3 contact + 2 clearance + 5 ITI)
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
      runStandardizedProbe(rt, RIGHT_TACTILE);
      if (rt.plasticity) rt.plasticity.config.enabled = true;
      rt.restore(snap);
    }
  }

  // Post-induction probe
  if (rt.plasticity) rt.plasticity.config.enabled = false;
  const postProbe = runStandardizedProbe(rt, RIGHT_TACTILE);
  return {
    harness: "D.3_ORIGINAL",
    seed,
    dirtyTracesCount,
    maxDirtyTrace,
    budgetUsed: rt.plasticity.getGlobalBudgetUsed(),
    postDNa02: postProbe.right_dna02_rate,
    postTurnRight: postProbe.turn_right_strength,
    recruited: postProbe.right_dna02_rate > 0.05,
    crossedTurnRight: postProbe.turn_right_strength > 0.05,
  };
}

export function runBridgeAudit() {
  console.log("\n=======================================================");
  console.log("LANE 1.3: D.2 / D.3 BRIDGE COMPARISON AUDIT");
  console.log("=======================================================");

  const testSeeds = [18100, 18101, 18102, 18103, 18200, 18201, 18202, 18203];
  console.log(`Comparing D.2 and D.3 harnesses on ${testSeeds.length} consumed development seeds:\n`);

  const rows = [];
  for (const seed of testSeeds) {
    console.log(`Evaluating seed ${seed}...`);
    const resD2 = runD2Harness(seed);
    const resD3 = runD3Harness(seed);
    rows.push({ seed, d2: resD2, d3: resD3 });
    console.log(`  D.2 -> Budget: ${resD2.budgetUsed.toFixed(4)}, DNa02: ${resD2.postDNa02.toFixed(4)}, TurnR: ${resD2.postTurnRight.toFixed(4)}, Recruited: ${resD2.recruited}, DirtyTraces: ${resD2.dirtyTracesCount}`);
    console.log(`  D.3 -> Budget: ${resD3.budgetUsed.toFixed(4)}, DNa02: ${resD3.postDNa02.toFixed(4)}, TurnR: ${resD3.postTurnRight.toFixed(4)}, Recruited: ${resD3.recruited}, DirtyTraces: ${resD3.dirtyTracesCount}`);
  }

  console.log("\n=== Summary Table ===");
  console.log("Seed  | Cohort | D.2 DNa02 (Hz) | D.3 DNa02 (Hz) | D.2 Recruited | D.3 Recruited | D.2 Dirty Traces");
  console.log("---------------------------------------------------------------------------------------------");
  for (const r of rows) {
    const cohort = r.seed < 18200 ? "D.2 (181xx)" : "D.3 (182xx)";
    console.log(
      `${r.seed} | ${cohort.padEnd(10)} | ${r.d2.postDNa02.toFixed(4).padStart(14)} | ${r.d3.postDNa02.toFixed(4).padStart(14)} | ${String(r.d2.recruited).padStart(13)} | ${String(r.d3.recruited).padStart(13)} | ${r.d2.dirtyTracesCount}`
    );
  }

  fs.writeFileSync(
    path.join(process.cwd(), "artifacts", "plasticity", "d2_d3_bridge_audit.json"),
    JSON.stringify(rows, null, 2)
  );
}

runBridgeAudit();
