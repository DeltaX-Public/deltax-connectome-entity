/**
 * Phase IV-A Sensory Lateralization Experiment.
 *
 * Evaluates whether lateral sensory asymmetry (directional stimulus gradients)
 * drives downstream steering DN asymmetry (turn_left vs turn_right) and directional
 * candidate activation in the intact connectome vs the degree-preserving shuffled control.
 *
 * Laterality Matrix:
 * L=180/R=0, L=180/R=30, L=180/R=90, L=180/R=180, L=90/R=180, L=30/R=180, L=0/R=180
 *
 * Saves artifacts to artifacts/sensory_atlas/lateralization.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SensoryAtlasHarness } from "../src/experiments/sensory_atlas/harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts", "sensory_atlas");

const LATERALITY_SWEEP = [
  { label: "L=180 / R=0", leftHz: 180, rightHz: 0 },
  { label: "L=180 / R=30", leftHz: 180, rightHz: 30 },
  { label: "L=180 / R=90", leftHz: 180, rightHz: 90 },
  { label: "L=180 / R=180", leftHz: 180, rightHz: 180 },
  { label: "L=90 / R=180", leftHz: 90, rightHz: 180 },
  { label: "L=30 / R=180", leftHz: 30, rightHz: 180 },
  { label: "L=0 / R=180", leftHz: 0, rightHz: 180 },
];

const BILATERAL_POPULATIONS = [
  { name: "tactile T1", leftPop: "tactile T1 left", rightPop: "tactile T1 right" },
  { name: "JO wind/gravity", leftPop: "JO wind/gravity left", rightPop: "JO wind/gravity right" },
  { name: "thermosensory", leftPop: "thermosensory left", rightPop: "thermosensory right" },
  { name: "taste T1", leftPop: "taste T1 left", rightPop: "taste T1 right" },
  { name: "photoreceptors", leftPop: "photoreceptors left", rightPop: "photoreceptors right" },
];

async function runLateralizationExperiment() {
  console.log("=== Running Phase IV-A Sensory Lateralization Experiment ===");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seed = 7000;
  const harness = new SensoryAtlasHarness({ seed });
  const results = {
    intact: {},
    shuffled: {},
  };

  for (const pop of BILATERAL_POPULATIONS) {
    console.log(`\n--- Testing Population: ${pop.name} (INTACT vs SHUFFLED) ---`);
    results.intact[pop.name] = [];
    results.shuffled[pop.name] = [];

    for (const sweep of LATERALITY_SWEEP) {
      // 1. Intact Connectome Run
      const trialIntact = await harness.runTrial({
        population: pop.name,
        laterality: "ASYMMETRIC",
        asymmetricDrives: {
          leftPop: pop.leftPop,
          rightPop: pop.rightPop,
          leftHz: sweep.leftHz,
          rightHz: sweep.rightHz,
        },
        seed,
        isShuffled: false,
      });

      // 2. Shuffled Connectome Run (for extreme conditions to preserve computation budget)
      let trialShuffled = null;
      if (sweep.label === "L=180 / R=0" || sweep.label === "L=180 / R=180" || sweep.label === "L=0 / R=180") {
        trialShuffled = await harness.runTrial({
          population: pop.name,
          laterality: "ASYMMETRIC",
          asymmetricDrives: {
            leftPop: pop.leftPop,
            rightPop: pop.rightPop,
            leftHz: sweep.leftHz,
            rightHz: sweep.rightHz,
          },
          seed,
          isShuffled: true,
        });
      }

      const intactSummary = {
        label: sweep.label,
        left_hz: sweep.leftHz,
        right_hz: sweep.rightHz,
        turn_left_hz: trialIntact.stimulus_means.turn_left,
        turn_right_hz: trialIntact.stimulus_means.turn_right,
        steering_diff_hz: +(trialIntact.stimulus_means.turn_left - trialIntact.stimulus_means.turn_right).toFixed(3),
        peak_diff_hz: trialIntact.peaks.peak_left_right_diff,
        dominant_winner: trialIntact.dominant_winner,
        forward_hz: trialIntact.stimulus_means.forward,
        backward_hz: trialIntact.stimulus_means.backward,
        escape_hz: trialIntact.stimulus_means.escape,
      };

      results.intact[pop.name].push(intactSummary);

      let shuffledSummary = null;
      if (trialShuffled) {
        shuffledSummary = {
          label: sweep.label,
          left_hz: sweep.leftHz,
          right_hz: sweep.rightHz,
          turn_left_hz: trialShuffled.stimulus_means.turn_left,
          turn_right_hz: trialShuffled.stimulus_means.turn_right,
          steering_diff_hz: +(trialShuffled.stimulus_means.turn_left - trialShuffled.stimulus_means.turn_right).toFixed(3),
          peak_diff_hz: trialShuffled.peaks.peak_left_right_diff,
          dominant_winner: trialShuffled.dominant_winner,
        };
        results.shuffled[pop.name].push(shuffledSummary);
      }

      console.log(`  [INTACT] ${sweep.label.padEnd(16)} -> TurnL: ${intactSummary.turn_left_hz}Hz, TurnR: ${intactSummary.turn_right_hz}Hz (Diff: ${intactSummary.steering_diff_hz > 0 ? "+" : ""}${intactSummary.steering_diff_hz}Hz) | Winner: ${intactSummary.dominant_winner}`);
      if (shuffledSummary) {
        console.log(`    [SHUFFLED] ${sweep.label.padEnd(14)} -> TurnL: ${shuffledSummary.turn_left_hz}Hz, TurnR: ${shuffledSummary.turn_right_hz}Hz (Diff: ${shuffledSummary.steering_diff_hz > 0 ? "+" : ""}${shuffledSummary.steering_diff_hz}Hz)`);
      }
    }
  }

  const outData = {
    schema: "sensory.lateralization.v1",
    timestamp: new Date().toISOString(),
    seed,
    sweeps: LATERALITY_SWEEP,
    populations: BILATERAL_POPULATIONS.map((p) => p.name),
    results,
  };

  const outPath = path.join(OUT_DIR, "lateralization.json");
  fs.writeFileSync(outPath, JSON.stringify(outData, null, 2));
  console.log(`\n=== Lateralization Experiment Complete. Saved to ${outPath} ===\n`);
}

runLateralizationExperiment().catch((err) => {
  console.error("Error in lateralization experiment:", err);
  process.exit(1);
});
