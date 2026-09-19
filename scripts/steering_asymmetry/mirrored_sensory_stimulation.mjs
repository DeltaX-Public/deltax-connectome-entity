/**
 * mirrored_sensory_stimulation.mjs
 * Phase 3: Mirrored Direct Sensory Stimulation
 *
 * Runs matched LEFT-only vs RIGHT-only stimulation using the SensoryAtlasHarness
 * for each sensory modality, across intensity sweeps and multiple seeds.
 *
 * Quantifies left/right DN asymmetry ratio for each condition.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

// Import the sensory atlas harness
const { SensoryAtlasHarness } = await import(
  path.join(ROOT, "src", "experiments", "sensory_atlas", "harness.mjs")
);

const POPULATIONS = [
  { name: "tactile T1", leftName: "tactile T1 left", rightName: "tactile T1 right" },
  { name: "JO wind/gravity", leftName: "JO wind/gravity left", rightName: "JO wind/gravity right" },
  { name: "thermosensory", leftName: "thermosensory left", rightName: "thermosensory right" },
  { name: "taste T1", leftName: "taste T1 left", rightName: "taste T1 right" },
];

const INTENSITIES = [10, 30, 60, 100, 140, 180];
const SEEDS = Array.from({ length: 10 }, (_, i) => 15000 + i);

async function main() {
  console.log("=== Phase 3: Mirrored Direct Sensory Stimulation ===\n");

  const results = {
    schema: "steering_asymmetry.mirrored_sensory_response.v1",
    timestamp: new Date().toISOString(),
    populations: POPULATIONS.map(p => p.name),
    intensities: INTENSITIES,
    seeds: SEEDS,
    trials: [],
    summary: {},
  };

  for (const pop of POPULATIONS) {
    console.log(`\n--- Population: ${pop.name} ---`);
    const popSummary = { population: pop.name, conditions: [] };

    for (const hz of INTENSITIES) {
      const leftResults = [];
      const rightResults = [];

      for (const seed of SEEDS) {
        const harness = new SensoryAtlasHarness({ seed });

        // LEFT-only stimulation
        const leftTrial = await harness.runTrial({
          population: pop.leftName,
          intensity: hz,
          laterality: "LEFT_ONLY",
          seed,
        });

        // RIGHT-only stimulation (fresh network)
        const rightTrial = await harness.runTrial({
          population: pop.rightName,
          intensity: hz,
          laterality: "RIGHT_ONLY",
          seed,
        });

        leftResults.push({
          seed,
          turn_left: leftTrial.stimulus_means.turn_left,
          turn_right: leftTrial.stimulus_means.turn_right,
          forward: leftTrial.stimulus_means.forward,
          backward: leftTrial.stimulus_means.backward,
          escape: leftTrial.stimulus_means.escape,
          steering_bias: leftTrial.steering_bias,
          onset_latency_ms: leftTrial.onset_latency_ms,
          peak_turn_left: leftTrial.peaks.turn_left,
          peak_turn_right: leftTrial.peaks.turn_right,
        });

        rightResults.push({
          seed,
          turn_left: rightTrial.stimulus_means.turn_left,
          turn_right: rightTrial.stimulus_means.turn_right,
          forward: rightTrial.stimulus_means.forward,
          backward: rightTrial.stimulus_means.backward,
          escape: rightTrial.stimulus_means.escape,
          steering_bias: rightTrial.steering_bias,
          onset_latency_ms: rightTrial.onset_latency_ms,
          peak_turn_left: rightTrial.peaks.turn_left,
          peak_turn_right: rightTrial.peaks.turn_right,
        });
      }

      // Aggregate across seeds
      const mean = (arr, key) => arr.reduce((s, r) => s + r[key], 0) / arr.length;
      const std = (arr, key) => {
        const m = mean(arr, key);
        return Math.sqrt(arr.reduce((s, r) => s + (r[key] - m) ** 2, 0) / arr.length);
      };

      const leftAgg = {
        mean_turn_left: +mean(leftResults, "turn_left").toFixed(4),
        mean_turn_right: +mean(leftResults, "turn_right").toFixed(4),
        std_turn_left: +std(leftResults, "turn_left").toFixed(4),
        std_turn_right: +std(leftResults, "turn_right").toFixed(4),
        mean_forward: +mean(leftResults, "forward").toFixed(4),
        mean_steering_bias: +mean(leftResults, "steering_bias").toFixed(4),
        mean_onset_latency: +mean(leftResults, "onset_latency_ms").toFixed(1),
        mean_peak_turn_left: +mean(leftResults, "peak_turn_left").toFixed(4),
        mean_peak_turn_right: +mean(leftResults, "peak_turn_right").toFixed(4),
      };

      const rightAgg = {
        mean_turn_left: +mean(rightResults, "turn_left").toFixed(4),
        mean_turn_right: +mean(rightResults, "turn_right").toFixed(4),
        std_turn_left: +std(rightResults, "turn_left").toFixed(4),
        std_turn_right: +std(rightResults, "turn_right").toFixed(4),
        mean_forward: +mean(rightResults, "forward").toFixed(4),
        mean_steering_bias: +mean(rightResults, "steering_bias").toFixed(4),
        mean_onset_latency: +mean(rightResults, "onset_latency_ms").toFixed(1),
        mean_peak_turn_left: +mean(rightResults, "peak_turn_left").toFixed(4),
        mean_peak_turn_right: +mean(rightResults, "peak_turn_right").toFixed(4),
      };

      // Asymmetry ratio: ideal mirror response would have
      // left-stim turn_left == right-stim turn_right
      const mirrorRatioTurnL = leftAgg.mean_turn_left > 0
        ? rightAgg.mean_turn_right / leftAgg.mean_turn_left
        : rightAgg.mean_turn_right > 0 ? Infinity : 1.0;

      const condition = {
        intensity_hz: hz,
        left_stimulation: leftAgg,
        right_stimulation: rightAgg,
        mirror_ratio: +mirrorRatioTurnL.toFixed(4),
        left_raw: leftResults,
        right_raw: rightResults,
      };

      popSummary.conditions.push(condition);

      results.trials.push({
        population: pop.name,
        intensity_hz: hz,
        left_stimulation: leftAgg,
        right_stimulation: rightAgg,
        mirror_ratio: +mirrorRatioTurnL.toFixed(4),
      });

      console.log(
        `  ${hz} Hz: L-stim → tL=${leftAgg.mean_turn_left} tR=${leftAgg.mean_turn_right} | ` +
        `R-stim → tL=${rightAgg.mean_turn_left} tR=${rightAgg.mean_turn_right} | ` +
        `mirror=${mirrorRatioTurnL.toFixed(4)}`
      );
    }

    results.summary[pop.name] = popSummary;
  }

  // Write artifact
  const outPath = path.join(ROOT, "artifacts", "steering_asymmetry", "mirrored_sensory_response.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nArtifact written to: ${outPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
