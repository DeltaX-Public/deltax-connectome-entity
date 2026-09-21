/**
 * validation_cohort.mjs
 * Phase 10: Validation Cohort (N=100 Seeds 16000..16099)
 *
 * Tests the frozen steering asymmetry hypothesis across 100 unobserved seeds:
 *
 * Evaluates:
 * 1. LEFT_TACTILE_STIM (180 Hz): Firing rate of turn_left DNs vs turn_right DNs
 * 2. RIGHT_TACTILE_STIM (180 Hz): Firing rate of turn_right DNs vs turn_left DNs
 *
 * Measures:
 * - Effect direction (Left-dominant asymmetry vs Right-dominant)
 * - Magnitude (mean rate difference)
 * - Variance / Standard deviation
 * - Response latency (ms)
 * - Replication rate (fraction of seeds showing asymmetry)
 *
 * Output: artifacts/steering_asymmetry/validation.json
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
const N_SEEDS = 100;
const SEED_START = 16000;
const SEEDS = Array.from({ length: N_SEEDS }, (_, i) => SEED_START + i);

function runTrial(runtime, targetIndices, intensity = 180.0, steps = 50, stimStart = 10, stimEnd = 35) {
  runtime.net.reset();
  runtime.net.ext.fill(0);
  runtime.sensoryDrives.clear();

  const driveMap = new Map();
  for (const idx of targetIndices) driveMap.set(idx, intensity);

  let sumLeft = 0, sumRight = 0;
  let onsetStep = null;
  let count = 0;

  for (let step = 1; step <= steps; step++) {
    if (step > stimStart && step <= stimEnd) {
      runtime.setSensoryDrives(driveMap);
    } else {
      runtime.sensoryDrives.clear();
      runtime.net.ext.fill(0);
    }

    runtime.step(1);
    const dn = runtime.getDescendingNeuronReadouts();
    const tL = dn.turn_left?.weighted_mean || 0;
    const tR = dn.turn_right?.weighted_mean || 0;

    if (step > stimStart && step <= stimEnd) {
      sumLeft += tL;
      sumRight += tR;
      count++;
      if (onsetStep === null && (tL > 0.05 || tR > 0.05)) {
        onsetStep = step - stimStart;
      }
    }
  }

  return {
    mean_turn_left: +(sumLeft / (count || 1)).toFixed(4),
    mean_turn_right: +(sumRight / (count || 1)).toFixed(4),
    onset_latency_ms: onsetStep ?? -1,
  };
}

async function main() {
  console.log(`=== Phase 10: Validation Cohort (N=${N_SEEDS} Seeds ${SEED_START}..${SEED_START + N_SEEDS - 1}) ===\n`);

  const bmPath = path.join(ROOT, "upstream", "fly-brain", "public", "data", "bodymap.json");
  const bodymap = JSON.parse(fs.readFileSync(bmPath, "utf8"));
  const leftTactile = bodymap.sensors.find((s) => s.name === "tactile T1 left")?.idx || [];
  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];

  const seedRecords = [];
  let leftDominantCount = 0;
  let zeroRightTurnCount = 0;

  console.log(`Executing ${N_SEEDS} seed replications...`);
  const startTime = Date.now();

  for (let i = 0; i < N_SEEDS; i++) {
    const seed = SEEDS[i];
    const runtime = new ConnectomeRuntime({ seed, substepsPerTick: 1 });

    const leftRun = runTrial(runtime, leftTactile, INTENSITY);
    const rightRun = runTrial(runtime, rightTactile, INTENSITY);

    // Asymmetry is present if Left stim produces more Left turn than Right stim produces Right turn
    const isLeftDominant = leftRun.mean_turn_left > rightRun.mean_turn_right;
    if (isLeftDominant) leftDominantCount++;
    if (rightRun.mean_turn_right < 0.01) zeroRightTurnCount++;

    seedRecords.push({
      seed,
      left_stim: leftRun,
      right_stim: rightRun,
      asymmetry_magnitude: +(leftRun.mean_turn_left - rightRun.mean_turn_right).toFixed(4),
      is_left_dominant: isLeftDominant,
    });

    if ((i + 1) % 20 === 0) {
      console.log(`  Progress: ${i + 1}/${N_SEEDS} seeds completed (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);
    }
  }

  // Statistical aggregates
  const mean = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0) / arr.length;
  const std = (arr, fn, m) => Math.sqrt(arr.reduce((s, x) => s + (fn(x) - m) ** 2, 0) / arr.length);

  const meanLeftStimTurnLeft = mean(seedRecords, (r) => r.left_stim.mean_turn_left);
  const stdLeftStimTurnLeft = std(seedRecords, (r) => r.left_stim.mean_turn_left, meanLeftStimTurnLeft);

  const meanRightStimTurnRight = mean(seedRecords, (r) => r.right_stim.mean_turn_right);
  const stdRightStimTurnRight = std(seedRecords, (r) => r.right_stim.mean_turn_right, meanRightStimTurnRight);

  const meanAsymmetryMag = mean(seedRecords, (r) => r.asymmetry_magnitude);
  const stdAsymmetryMag = std(seedRecords, (r) => r.asymmetry_magnitude, meanAsymmetryMag);

  const validLatencies = seedRecords.map((r) => r.left_stim.onset_latency_ms).filter((l) => l > 0);
  const meanLatency = validLatencies.length ? mean(validLatencies, (l) => l) : -1;

  const results = {
    schema: "steering_asymmetry.validation.v1",
    timestamp: new Date().toISOString(),
    cohort: {
      n_seeds: N_SEEDS,
      seed_range: [SEED_START, SEED_START + N_SEEDS - 1],
      intensity_hz: INTENSITY,
    },
    hypothesis: {
      statement: "Tactile mechanosensory stimulation produces a persistent, substrate-level left-steering descending drive while homologous right stimulation fails to produce equivalent right-steering descending drive, persisting across random seed variations.",
      replicated: leftDominantCount >= 95,
    },
    metrics: {
      effect_direction: "LEFT_STEERING_DOMINANT",
      mean_turn_left_under_left_stim: +meanLeftStimTurnLeft.toFixed(4),
      std_turn_left_under_left_stim: +stdLeftStimTurnLeft.toFixed(4),
      mean_turn_right_under_right_stim: +meanRightStimTurnRight.toFixed(4),
      std_turn_right_under_right_stim: +stdRightStimTurnRight.toFixed(4),
      asymmetry_magnitude_mean: +meanAsymmetryMag.toFixed(4),
      asymmetry_magnitude_std: +stdAsymmetryMag.toFixed(4),
      mean_response_latency_ms: +meanLatency.toFixed(2),
      fraction_seeds_reproducing_asymmetry: +(leftDominantCount / N_SEEDS).toFixed(4),
      fraction_seeds_zero_right_turn: +(zeroRightTurnCount / N_SEEDS).toFixed(4),
    },
    per_seed_records: seedRecords,
  };

  console.log(`\n=== VALIDATION COHORT RESULTS (N=${N_SEEDS}) ===`);
  console.log(`Mean Turn Left  (under Left Stim):  ${results.metrics.mean_turn_left_under_left_stim} ± ${results.metrics.std_turn_left_under_left_stim} Hz`);
  console.log(`Mean Turn Right (under Right Stim): ${results.metrics.mean_turn_right_under_right_stim} ± ${results.metrics.std_turn_right_under_right_stim} Hz`);
  console.log(`Mean Asymmetry Magnitude:           ${results.metrics.asymmetry_magnitude_mean} ± ${results.metrics.asymmetry_magnitude_std} Hz`);
  console.log(`Fraction Reproducing Asymmetry:     ${(results.metrics.fraction_seeds_reproducing_asymmetry * 100).toFixed(1)}% (${leftDominantCount}/${N_SEEDS})`);
  console.log(`Fraction with Near-Zero Right Turn: ${(results.metrics.fraction_seeds_zero_right_turn * 100).toFixed(1)}% (${zeroRightTurnCount}/${N_SEEDS})`);
  console.log(`Mean Response Latency:              ${results.metrics.mean_response_latency_ms} ms`);
  console.log(`Hypothesis Replicated:              ${results.hypothesis.replicated ? "CONFIRMED" : "REJECTED"}\n`);

  const outPath = path.join(ROOT, "artifacts", "steering_asymmetry", "validation.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`Artifact written to: ${outPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
