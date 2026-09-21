import { ConnectomeRuntime } from "../../src/connectome/runtime.mjs";
import { PLASTICITY_RULES } from "../../src/connectome/plasticity_overlay.mjs";
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

function testProbeSequence(probes) {
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

  // Run the given probes
  for (const p of probes) {
    runStandardizedProbe(rt, p);
  }

  // Induction
  const driveMap = new Map();
  for (const idx of RIGHT_TACTILE) driveMap.set(idx, INTENSITY);

  for (let c = 0; c < INDUCTION_CYCLES; c++) {
    rt.setSensoryDrives(driveMap);
    for (let t = 0; t < 3; t++) { rt.step(10); rt.plasticity.applyModulatoryUpdate(0.0); }
    rt.sensoryDrives.clear(); rt.net.ext.fill(0);
    for (let t = 0; t < 2; t++) { rt.step(10); rt.plasticity.applyModulatoryUpdate(1.0); }
    for (let t = 0; t < 5; t++) rt.step(10);
  }

  const budget = rt.plasticity.getGlobalBudgetUsed();
  const postDNa02 = runStandardizedProbe(rt, RIGHT_TACTILE);
  return { budget, postDNa02 };
}

console.log("=== ISOLATING PRE-INDUCTION PROBE SUPPRESSION ===");

const allProbes = [
  { name: "RIGHT_TACTILE", idx: RIGHT_TACTILE },
  { name: "LEFT_TACTILE", idx: LEFT_TACTILE },
  { name: "JO_AUDITORY_RIGHT", idx: JO_AUDITORY_RIGHT },
  { name: "JO_AUDITORY_LEFT", idx: JO_AUDITORY_LEFT },
  { name: "THERMO_RIGHT", idx: THERMO_RIGHT },
  { name: "THERMO_LEFT", idx: THERMO_LEFT },
];

for (let i = 1; i <= allProbes.length; i++) {
  const subset = allProbes.slice(0, i);
  const names = subset.map((s) => s.name).join(" + ");
  const res = testProbeSequence(subset.map((s) => s.idx));
  console.log(`Probes [1..${i}] (${names}):`);
  console.log(`  -> Budget: ${res.budget.toFixed(4)}, DNa02: ${res.postDNa02.toFixed(4)} Hz, Recruited: ${res.postDNa02 > 0.05}`);
}
