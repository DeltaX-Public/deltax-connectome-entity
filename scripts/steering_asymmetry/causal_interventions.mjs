/**
 * causal_interventions.mjs
 * Phase 9: Causal Interventions & Hypothesis Testing
 *
 * Uses controlled, single-variable interventions to test how to elicit right-steering drive:
 *
 * Branch A: INTACT_RIGHT_STIMULATION (Baseline control: Right tactile T1 at 180 Hz)
 * Branch B: SILENCE_LEFT_STEERING_DN (Silence left DNa02 index 130496, DNa01 406, DNp09 725)
 * Branch C: SHAM_SILENCING (Silence matched unrelated descending neurons: MDN indices 1196, 2194)
 * Branch D: STIMULATE_HOMOLOGOUS_RIGHT_DN (Targeted excitation boost +30 Hz to right DNa02 332)
 * Branch E: EQUALIZE_RECEPTOR_DRIVE_ENERGY (Scale right tactile T1 by 151/115 = 1.313x to match left energy)
 * Branch F: RECEPTOR_SWAP_CONTROLLING_INPUT (Inject stimulus drive into left tactile receptors, read right DNs)
 *
 * Output: artifacts/steering_asymmetry/causal_interventions.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const { ConnectomeRuntime } = await import(
  path.join(ROOT, "src", "connectome", "runtime.mjs")
);

const INTENSITY = 180.0;
const SEEDS = Array.from({ length: 10 }, (_, i) => 15000 + i);

const STEERING_LEFT_INDICES = [130496, 406, 725]; // DNa02, DNa01, DNp09
const SHAM_INDICES = [1196, 2194]; // MDN left indices
const RIGHT_DNA02_INDEX = 332;

function runInterventionTrial(runtime, driveMap, steps = 60, stimStart = 10, stimEnd = 35) {
  let sumLeft = 0, sumRight = 0, sumFwd = 0;
  let count = 0;

  for (let step = 1; step <= steps; step++) {
    if (step > stimStart && step <= stimEnd) {
      runtime.setSensoryDrives(driveMap);
    } else {
      runtime.sensoryDrives.clear();
      runtime.net.ext.fill(0);
    }

    runtime.step(1);
    if (step > stimStart && step <= stimEnd) {
      const dn = runtime.getDescendingNeuronReadouts();
      sumLeft += dn.turn_left?.weighted_mean || 0;
      sumRight += dn.turn_right?.weighted_mean || 0;
      sumFwd += dn.forward?.weighted_mean || 0;
      count++;
    }
  }

  return {
    turn_left: +(sumLeft / count).toFixed(4),
    turn_right: +(sumRight / count).toFixed(4),
    forward: +(sumFwd / count).toFixed(4),
  };
}

async function main() {
  console.log("=== Phase 9: Causal Interventions & Mechanism Testing ===\n");

  const bmPath = path.join(ROOT, "upstream", "fly-brain", "public", "data", "bodymap.json");
  const bodymap = JSON.parse(fs.readFileSync(bmPath, "utf8"));
  const leftTactile = bodymap.sensors.find(s => s.name === "tactile T1 left")?.idx || [];
  const rightTactile = bodymap.sensors.find(s => s.name === "tactile T1 right")?.idx || [];

  const rightDriveMapStandard = new Map();
  for (const idx of rightTactile) rightDriveMapStandard.set(idx, INTENSITY);

  // Equalized energy map (+31.3% rate to compensate for fewer receptors: 180 * 151/115 = 236.35 Hz)
  const boostRate = INTENSITY * (leftTactile.length / rightTactile.length);
  const rightDriveMapEnergyEqualized = new Map();
  for (const idx of rightTactile) rightDriveMapEnergyEqualized.set(idx, +boostRate.toFixed(2));

  // Left drive map for receptor-swap
  const leftDriveMap = new Map();
  for (const idx of leftTactile) leftDriveMap.set(idx, INTENSITY);

  const branches = {
    BRANCH_A_INTACT: [],
    BRANCH_B_SILENCE_LEFT_DN: [],
    BRANCH_C_SHAM_SILENCING: [],
    BRANCH_D_BOOST_RIGHT_DN: [],
    BRANCH_E_EQUALIZE_RECEPTOR_ENERGY: [],
    BRANCH_F_RECEPTOR_SWAP: [],
  };

  for (const seed of SEEDS) {
    // Branch A: Intact
    const rtA = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
    branches.BRANCH_A_INTACT.push(runInterventionTrial(rtA, rightDriveMapStandard));

    // Branch B: Silence Left DNs
    const rtB = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
    rtB.silence(STEERING_LEFT_INDICES);
    branches.BRANCH_B_SILENCE_LEFT_DN.push(runInterventionTrial(rtB, rightDriveMapStandard));

    // Branch C: Sham Silencing
    const rtC = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
    rtC.silence(SHAM_INDICES);
    branches.BRANCH_C_SHAM_SILENCING.push(runInterventionTrial(rtC, rightDriveMapStandard));

    // Branch D: Direct Excitatory Boost to Right DNa02
    const rtD = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
    rtD.excite([RIGHT_DNA02_INDEX], 50.0);
    branches.BRANCH_D_BOOST_RIGHT_DN.push(runInterventionTrial(rtD, rightDriveMapStandard));

    // Branch E: Equalize Receptor Energy (+31.3% stimulus rate)
    const rtE = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
    branches.BRANCH_E_EQUALIZE_RECEPTOR_ENERGY.push(runInterventionTrial(rtE, rightDriveMapEnergyEqualized));

    // Branch F: Receptor Swap (stimulate left receptors)
    const rtF = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
    branches.BRANCH_F_RECEPTOR_SWAP.push(runInterventionTrial(rtF, leftDriveMap));
  }

  // Aggregate each branch
  const mean = (arr, k) => +(arr.reduce((s, r) => s + r[k], 0) / arr.length).toFixed(4);
  const summary = {};

  for (const [name, trials] of Object.entries(branches)) {
    summary[name] = {
      mean_turn_left: mean(trials, "turn_left"),
      mean_turn_right: mean(trials, "turn_right"),
      mean_forward: mean(trials, "forward"),
      differential_right_over_left: +(mean(trials, "turn_right") - mean(trials, "turn_left")).toFixed(4),
    };
  }

  console.log("=== CAUSAL INTERVENTION OUTCOMES (Mean across seeds 15000..15009) ===");
  for (const [name, res] of Object.entries(summary)) {
    console.log(`${name.padEnd(35)}: turn_left = ${res.mean_turn_left} Hz, turn_right = ${res.mean_turn_right} Hz (Net R = ${res.differential_right_over_left} Hz)`);
  }

  // Determine best intervention
  let bestBranch = null;
  let maxNetRight = -Infinity;
  for (const [name, res] of Object.entries(summary)) {
    if (name !== "BRANCH_F_RECEPTOR_SWAP" && res.differential_right_over_left > maxNetRight) {
      maxNetRight = res.differential_right_over_left;
      bestBranch = name;
    }
  }

  const results = {
    schema: "steering_asymmetry.causal_interventions.v1",
    timestamp: new Date().toISOString(),
    intensity_hz: INTENSITY,
    seeds: SEEDS,
    branch_summaries: summary,
    best_intervention: {
      branch: bestBranch,
      net_right_steering_gain_hz: maxNetRight,
    },
    raw_trials: branches,
  };

  const outPath = path.join(ROOT, "artifacts", "steering_asymmetry", "causal_interventions.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nArtifact written to: ${outPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
