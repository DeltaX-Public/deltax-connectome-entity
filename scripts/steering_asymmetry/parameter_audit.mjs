/**
 * parameter_audit.mjs
 * Phase 8: Rate-Network Parameter Audit
 *
 * Compares dynamical parameter distributions (gain a, threshold theta, tau, rmax, sizeScale)
 * between matched left and right populations.
 *
 * Runs counterfactual parameter equalization:
 * Tests whether setting Right steering DNs / sensory parameters identical to Left
 * unleashes latent right steering.
 *
 * Output: artifacts/steering_asymmetry/parameter_audit.json
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

const STEERING_PAIRS = [
  { type: "DNa02", left: 130496, right: 332 },
  { type: "DNa01", left: 406, right: 704 },
  { type: "DNp09", left: 725, right: 1087 },
];

function extractParams(net, idx) {
  return {
    gain_a: +net.a[idx].toFixed(4),
    threshold_theta: +net.theta[idx].toFixed(4),
    tau_ms: +net.tau[idx].toFixed(2),
    rmax_hz: +net.rmax[idx].toFixed(2),
    size_scale: +net.sizeScale[idx].toFixed(4),
  };
}

function runTrial(runtime, driveIndices, intensity = 180.0, steps = 60, stimStart = 10, stimEnd = 35) {
  runtime.net.reset();
  runtime.net.ext.fill(0);
  runtime.sensoryDrives.clear();

  const driveMap = new Map();
  for (const idx of driveIndices) driveMap.set(idx, intensity);

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
  console.log("=== Phase 8: Rate-Network Parameter Audit ===\n");

  const bmPath = path.join(ROOT, "upstream", "fly-brain", "public", "data", "bodymap.json");
  const bodymap = JSON.parse(fs.readFileSync(bmPath, "utf8"));
  const leftTactile = bodymap.sensors.find(s => s.name === "tactile T1 left")?.idx || [];
  const rightTactile = bodymap.sensors.find(s => s.name === "tactile T1 right")?.idx || [];

  const results = {
    schema: "steering_asymmetry.parameter_audit.v1",
    timestamp: new Date().toISOString(),
    dn_parameters: {},
    sensory_parameters: {},
    counterfactual_trials: [],
    aggregate_comparison: {},
    conclusion: {},
  };

  // Inspect DN parameters on seed 15000
  const sampleRuntime = new ConnectomeRuntime({ seed: 15000, substepsPerTick: 1 });
  for (const pair of STEERING_PAIRS) {
    results.dn_parameters[pair.type] = {
      left: { index: pair.left, ...extractParams(sampleRuntime.net, pair.left) },
      right: { index: pair.right, ...extractParams(sampleRuntime.net, pair.right) },
    };
  }

  // Sensory parameter distributions
  const getPopStats = (net, indices) => {
    const vals = { a: [], theta: [], tau: [], rmax: [], size: [] };
    for (const idx of indices) {
      vals.a.push(net.a[idx]);
      vals.theta.push(net.theta[idx]);
      vals.tau.push(net.tau[idx]);
      vals.rmax.push(net.rmax[idx]);
      vals.size.push(net.sizeScale[idx]);
    }
    const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
    return {
      count: indices.length,
      mean_gain: +mean(vals.a).toFixed(4),
      mean_threshold: +mean(vals.theta).toFixed(4),
      mean_tau: +mean(vals.tau).toFixed(2),
      mean_rmax: +mean(vals.rmax).toFixed(2),
      mean_size_scale: +mean(vals.size).toFixed(4),
    };
  };

  results.sensory_parameters["tactile T1"] = {
    left: getPopStats(sampleRuntime.net, leftTactile),
    right: getPopStats(sampleRuntime.net, rightTactile),
  };

  console.log("Steering DN Parameters (Seed 15000):");
  console.log(JSON.stringify(results.dn_parameters, null, 2));
  console.log("\nSensory Parameters (tactile T1):");
  console.log(JSON.stringify(results.sensory_parameters, null, 2));

  // Run counterfactual trials across 10 seeds
  for (const seed of SEEDS) {
    // 1. Intact Control (Left and Right stimulation)
    const intact = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
    const intactLeft = runTrial(intact, leftTactile, INTENSITY);
    const intactRight = runTrial(intact, rightTactile, INTENSITY);

    // 2. Counterfactual: Clone Left DN parameters into Right DNs
    const cf = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
    for (const pair of STEERING_PAIRS) {
      cf.net.a[pair.right] = cf.net.a[pair.left];
      cf.net.theta[pair.right] = cf.net.theta[pair.left];
      cf.net.tau[pair.right] = cf.net.tau[pair.left];
      cf.net.rmax[pair.right] = cf.net.rmax[pair.left];
      cf.net.sizeScale[pair.right] = cf.net.sizeScale[pair.left];
    }
    const cfRight = runTrial(cf, rightTactile, INTENSITY);

    // 3. Counterfactual 2: Equalize sensory receptor parameters too
    const cf2 = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
    // Match DNs
    for (const pair of STEERING_PAIRS) {
      cf2.net.a[pair.right] = cf2.net.a[pair.left];
      cf2.net.theta[pair.right] = cf2.net.theta[pair.left];
      cf2.net.tau[pair.right] = cf2.net.tau[pair.left];
      cf2.net.rmax[pair.right] = cf2.net.rmax[pair.left];
      cf2.net.sizeScale[pair.right] = cf2.net.sizeScale[pair.left];
    }
    // Match sensory parameters (set right sensory to mean left sensory params)
    const meanLeftTheta = results.sensory_parameters["tactile T1"].left.mean_threshold;
    const meanLeftGain = results.sensory_parameters["tactile T1"].left.mean_gain;
    for (const idx of rightTactile) {
      cf2.net.theta[idx] = meanLeftTheta;
      cf2.net.a[idx] = meanLeftGain;
    }
    const cf2Right = runTrial(cf2, rightTactile, INTENSITY);

    results.counterfactual_trials.push({
      seed,
      intact_left: intactLeft,
      intact_right: intactRight,
      cf_dn_matched_right: cfRight,
      cf_dn_and_sensory_matched_right: cf2Right,
    });
  }

  // Aggregate comparisons
  const meanOf = (trials, path1, key) =>
    +(trials.reduce((s, t) => s + t[path1][key], 0) / trials.length).toFixed(4);

  results.aggregate_comparison = {
    intact_left_stim_turn_left: meanOf(results.counterfactual_trials, "intact_left", "turn_left"),
    intact_right_stim_turn_right: meanOf(results.counterfactual_trials, "intact_right", "turn_right"),
    cf_dn_matched_turn_right: meanOf(results.counterfactual_trials, "cf_dn_matched_right", "turn_right"),
    cf_dn_and_sensory_matched_turn_right: meanOf(results.counterfactual_trials, "cf_dn_and_sensory_matched_right", "turn_right"),
  };

  const restored = results.aggregate_comparison.cf_dn_matched_turn_right > 0.1;
  results.conclusion = {
    dynamical_parameters_explain_asymmetry: restored,
    summary: restored
      ? "Parameter matching successfully restored right steering. Dynamical asymmetry in parameters explains the deficit."
      : "Parameter matching did NOT restore right steering. Right steering remains absent even when DN and sensory dynamical parameters are equalized. The bottleneck lies in the intermediate connectome graph topology or recurrent inhibition.",
  };

  console.log("\n=== COUNTERFACTUAL AGGREGATE RESULTS ===");
  console.log(`Intact Left Stim -> Turn Left:  ${results.aggregate_comparison.intact_left_stim_turn_left} Hz`);
  console.log(`Intact Right Stim -> Turn Right: ${results.aggregate_comparison.intact_right_stim_turn_right} Hz`);
  console.log(`CF DN Matched -> Turn Right:     ${results.aggregate_comparison.cf_dn_matched_turn_right} Hz`);
  console.log(`CF DN+Sensory -> Turn Right:     ${results.aggregate_comparison.cf_dn_and_sensory_matched_turn_right} Hz`);
  console.log(`Conclusion: ${results.conclusion.summary}\n`);

  const outPath = path.join(ROOT, "artifacts", "steering_asymmetry", "parameter_audit.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`Artifact written to: ${outPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
