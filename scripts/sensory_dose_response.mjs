/**
 * Phase IV-A Dose-Response Sweeps.
 *
 * Evaluates neural and candidate response across deterministic intensity sweeps:
 * [0, 25, 50, 75, 100, 125, 150, 175, 200 Hz]
 * Across verified biological sensory populations:
 * - tactile T1
 * - JO wind/gravity
 * - thermosensory
 * - taste T1
 * - labellar taste
 * - photoreceptors
 * - wing/notum bristles
 *
 * Saves artifacts to artifacts/sensory_atlas/dose_response.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SensoryAtlasHarness } from "../src/experiments/sensory_atlas/harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts", "sensory_atlas");

const INTENSITIES = [0, 25, 50, 75, 100, 125, 150, 175, 200];
const POPULATIONS = [
  "tactile T1",
  "JO wind/gravity",
  "thermosensory",
  "taste T1",
  "labellar taste",
  "photoreceptors",
  "wing/notum bristles",
];

async function runDoseResponseSweeps() {
  console.log("=== Running Phase IV-A Dose-Response Sweeps ===");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seed = 7000; // Dev seed
  const harness = new SensoryAtlasHarness({ seed });
  const results = {};

  for (const pop of POPULATIONS) {
    console.log(`\nTesting Population: ${pop}...`);
    results[pop] = [];

    for (const intensity of INTENSITIES) {
      const trial = await harness.runTrial({
        population: pop,
        intensity,
        pattern: "CONSTANT",
        laterality: "SYMMETRIC",
        seed,
      });

      const summary = {
        population: pop,
        intensity_hz: intensity,
        dominant_winner: trial.dominant_winner,
        dominant_winner_pct: +(trial.dominant_winner_fraction * 100).toFixed(1),
        onset_latency_ms: trial.onset_latency_ms,
        settling_time_ms: trial.settling_time_ms,
        mean_entropy: trial.mean_candidate_entropy,
        peaks: trial.peaks,
        stimulus_means: trial.stimulus_means,
        steering_bias: trial.steering_bias,
      };

      results[pop].push(summary);
      console.log(`  ${String(intensity).padStart(3)} Hz -> Winner: ${summary.dominant_winner.padEnd(12)} (${summary.dominant_winner_pct}%) | Fwd: ${summary.stimulus_means.forward}Hz | TurnL: ${summary.stimulus_means.turn_left}Hz | TurnR: ${summary.stimulus_means.turn_right}Hz | Latency: ${summary.onset_latency_ms}ms`);
    }
  }

  const outData = {
    schema: "sensory.dose_response.v1",
    timestamp: new Date().toISOString(),
    seed,
    intensity_grid_hz: INTENSITIES,
    populations_tested: POPULATIONS,
    dose_response_results: results,
  };

  const outPath = path.join(OUT_DIR, "dose_response.json");
  fs.writeFileSync(outPath, JSON.stringify(outData, null, 2));
  console.log(`\n=== Dose-Response Sweeps Complete. Saved to ${outPath} ===\n`);
}

runDoseResponseSweeps().catch((err) => {
  console.error("Error in dose-response sweeps:", err);
  process.exit(1);
});
