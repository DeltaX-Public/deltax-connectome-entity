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
const INTENSITY = 180.0;
const INDUCTION_CYCLES = 30;

function loadManifestTargetA() {
  const p = path.join(process.cwd(), "artifacts", "plasticity", "target_a_afferent_only.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function runStandardizedProbe(runtime, driveSensorIndices) {
  runtime.net.reset();
  runtime.net.ext.fill(0);
  runtime.sensoryDrives.clear();

  const driveMap = new Map();
  for (const idx of driveSensorIndices) driveMap.set(idx, INTENSITY);

  let sumRightDNa02 = 0;
  for (let step = 1; step <= 60; step++) {
    if (step >= 11 && step <= 35) runtime.setSensoryDrives(driveMap);
    else { runtime.sensoryDrives.clear(); runtime.net.ext.fill(0); }
    runtime.step(1);
    if (step >= 11 && step <= 35) sumRightDNa02 += runtime.net.r[RIGHT_DNA02];
  }
  return sumRightDNa02 / 25;
}

function testVariant(name, fn) {
  const manifest = loadManifestTargetA();
  const rt = new ConnectomeRuntime({
    seed: 18100,
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

  const res = fn(rt, manifest);
  console.log(`${name.padEnd(45)} -> Budget: ${res.budget.toFixed(4).padStart(8)}, DNa02: ${res.dna02.toFixed(4).padStart(8)} Hz, Recruited: ${res.dna02 > 0.05}`);
}

console.log("=== DISSECTING D.2 vs D.3 RECRUITMENT ON SEED 18100 ===");

const driveMap = new Map();
for (const idx of RIGHT_TACTILE) driveMap.set(idx, INTENSITY);

// 1. Exact D.2 Original
testVariant("1. D.2 Original (6 probes, dirty traces)", (rt) => {
  runStandardizedProbe(rt, RIGHT_TACTILE);
  runStandardizedProbe(rt, LEFT_TACTILE);
  runStandardizedProbe(rt, JO_AUDITORY_RIGHT);
  runStandardizedProbe(rt, JO_AUDITORY_LEFT);
  runStandardizedProbe(rt, THERMO_RIGHT);
  runStandardizedProbe(rt, THERMO_LEFT);

  for (let c = 0; c < INDUCTION_CYCLES; c++) {
    rt.setSensoryDrives(driveMap);
    for (let t = 0; t < 3; t++) { rt.step(10); rt.plasticity.applyModulatoryUpdate(0.0); }
    rt.sensoryDrives.clear(); rt.net.ext.fill(0);
    for (let t = 0; t < 2; t++) { rt.step(10); rt.plasticity.applyModulatoryUpdate(1.0); }
    for (let t = 0; t < 5; t++) rt.step(10);
  }
  return { budget: rt.plasticity.getGlobalBudgetUsed(), dna02: runStandardizedProbe(rt, RIGHT_TACTILE) };
});

// 2. D.2 with eligibility traces cleared right before induction
testVariant("2. D.2 with ResetEligibility before induction", (rt) => {
  runStandardizedProbe(rt, RIGHT_TACTILE);
  runStandardizedProbe(rt, LEFT_TACTILE);
  runStandardizedProbe(rt, JO_AUDITORY_RIGHT);
  runStandardizedProbe(rt, JO_AUDITORY_LEFT);
  runStandardizedProbe(rt, THERMO_RIGHT);
  runStandardizedProbe(rt, THERMO_LEFT);

  rt.plasticity.resetEligibilityOnly(); // Clear dirty traces

  for (let c = 0; c < INDUCTION_CYCLES; c++) {
    rt.setSensoryDrives(driveMap);
    for (let t = 0; t < 3; t++) { rt.step(10); rt.plasticity.applyModulatoryUpdate(0.0); }
    rt.sensoryDrives.clear(); rt.net.ext.fill(0);
    for (let t = 0; t < 2; t++) { rt.step(10); rt.plasticity.applyModulatoryUpdate(1.0); }
    for (let t = 0; t < 5; t++) rt.step(10);
  }
  return { budget: rt.plasticity.getGlobalBudgetUsed(), dna02: runStandardizedProbe(rt, RIGHT_TACTILE) };
});

// 3. D.2 with 1 baseline probe with enabled=false (like D.3 pre-induction)
testVariant("3. D.2 with 1 clean baseline probe (like D.3)", (rt) => {
  rt.plasticity.config.enabled = false;
  runStandardizedProbe(rt, RIGHT_TACTILE);
  rt.plasticity.config.enabled = true;

  for (let c = 0; c < INDUCTION_CYCLES; c++) {
    rt.setSensoryDrives(driveMap);
    for (let t = 0; t < 3; t++) { rt.step(10); rt.plasticity.applyModulatoryUpdate(0.0); }
    rt.sensoryDrives.clear(); rt.net.ext.fill(0);
    for (let t = 0; t < 2; t++) { rt.step(10); rt.plasticity.applyModulatoryUpdate(1.0); }
    for (let t = 0; t < 5; t++) rt.step(10);
  }
  return { budget: rt.plasticity.getGlobalBudgetUsed(), dna02: runStandardizedProbe(rt, RIGHT_TACTILE) };
});

// 4. Exact D.3 Original (with intermediate checkpoint probes)
testVariant("4. D.3 Original (1 clean probe + chkpt probes)", (rt) => {
  rt.plasticity.config.enabled = false;
  runStandardizedProbe(rt, RIGHT_TACTILE);
  rt.plasticity.config.enabled = true;

  const CHECKPOINTS = [1, 2, 3, 5, 8, 12, 16, 20, 25, 30];
  for (let c = 1; c <= INDUCTION_CYCLES; c++) {
    rt.setSensoryDrives(driveMap);
    for (let t = 0; t < 3; t++) { rt.step(10); rt.plasticity.applyModulatoryUpdate(0.0); }
    rt.sensoryDrives.clear(); rt.net.ext.fill(0);
    for (let t = 0; t < 2; t++) { rt.step(10); rt.plasticity.applyModulatoryUpdate(1.0); }
    for (let t = 0; t < 5; t++) rt.step(10);

    if (CHECKPOINTS.includes(c)) {
      const snap = rt.snapshot();
      rt.plasticity.config.enabled = false;
      runStandardizedProbe(rt, RIGHT_TACTILE);
      rt.plasticity.config.enabled = true;
      rt.restore(snap);
    }
  }
  rt.plasticity.config.enabled = false;
  return { budget: rt.plasticity.getGlobalBudgetUsed(), dna02: runStandardizedProbe(rt, RIGHT_TACTILE) };
});
