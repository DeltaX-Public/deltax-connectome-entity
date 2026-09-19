/**
 * Phase IV-A Aversive / Noxious Sensory Drive Characterization.
 *
 * Operationalizes aversive stimulation across:
 * - Thermosensory (Noxious heat/cold)
 * - Bitter / Contact gustation (taste T1)
 * - Severe mechanical collision (tactile T1)
 * - Multi-modal hazard combination (thermo + taste + tactile)
 *
 * Evaluates:
 * - Levels: MILD (50 Hz), MODERATE (100 Hz), STRONG (180 Hz)
 * - Lateralities: SYMMETRIC, LEFT_BIASED, RIGHT_BIASED
 *
 * Questions answered:
 * - Does aversive drive cause halt, withdrawal (backward), steering, or escape?
 * - Does symmetric aversive drive collapse the network into HALT?
 * - Does lateralized aversive drive break the HALT attractor and produce steering / escape?
 *
 * Saves artifacts to artifacts/sensory_atlas/aversive_characterization.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SensoryAtlasHarness } from "../src/experiments/sensory_atlas/harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts", "sensory_atlas");

const AVERSIVE_MODALITIES = [
  { name: "thermosensory", leftPop: "thermosensory left", rightPop: "thermosensory right" },
  { name: "taste_bitter", leftPop: "taste T1 left", rightPop: "taste T1 right" },
  { name: "tactile_collision", leftPop: "tactile T1 left", rightPop: "tactile T1 right" },
  {
    name: "multimodal_hazard",
    composite: true,
    leftPops: ["thermosensory left", "taste T1 left", "tactile T1 left"],
    rightPops: ["thermosensory right", "taste T1 right", "tactile T1 right"],
  },
];

const INTENSITY_LEVELS = [
  { name: "MILD", hz: 50.0 },
  { name: "MODERATE", hz: 100.0 },
  { name: "STRONG", hz: 180.0 },
];

const LATERALITIES = ["SYMMETRIC", "LEFT_BIASED", "RIGHT_BIASED"];

async function runAversiveCharacterization() {
  console.log("=== Running Phase IV-A Aversive / Noxious Input Characterization ===");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seed = 7000;
  const harness = new SensoryAtlasHarness({ seed });
  const results = [];

  for (const mod of AVERSIVE_MODALITIES) {
    console.log(`\nEvaluating Modality: ${mod.name}...`);

    for (const level of INTENSITY_LEVELS) {
      for (const lat of LATERALITIES) {
        let leftHz = level.hz;
        let rightHz = level.hz;

        if (lat === "LEFT_BIASED") {
          rightHz = level.hz * 0.2;
        } else if (lat === "RIGHT_BIASED") {
          leftHz = level.hz * 0.2;
        }

        let trial;
        if (mod.composite) {
          // Multimodal composite
          const lIndices = mod.leftPops.flatMap((p) => harness.getSensorIndices(p));
          const rIndices = mod.rightPops.flatMap((p) => harness.getSensorIndices(p));
          trial = await harness.runTrial({
            laterality: "ASYMMETRIC",
            asymmetricDrives: {
              leftPop: lIndices,
              rightPop: rIndices,
              leftHz,
              rightHz,
            },
            seed,
          });
        } else {
          trial = await harness.runTrial({
            laterality: "ASYMMETRIC",
            asymmetricDrives: {
              leftPop: mod.leftPop,
              rightPop: mod.rightPop,
              leftHz,
              rightHz,
            },
            seed,
          });
        }

        const resRecord = {
          modality: mod.name,
          intensity_level: level.name,
          base_hz: level.hz,
          laterality: lat,
          left_hz: leftHz,
          right_hz: rightHz,
          dominant_winner: trial.dominant_winner,
          dominant_winner_pct: +(trial.dominant_winner_fraction * 100).toFixed(1),
          measured_dn_means: trial.stimulus_means,
          peaks: trial.peaks,
          steering_bias_hz: trial.steering_bias,
          mean_candidate_entropy: trial.mean_candidate_entropy,
        };

        results.push(resRecord);
        console.log(`  [${level.name.padEnd(8)} | ${lat.padEnd(12)}] Winner: ${resRecord.dominant_winner.padEnd(10)} | Fwd: ${resRecord.measured_dn_means.forward}Hz | Back: ${resRecord.measured_dn_means.backward}Hz | TurnL: ${resRecord.measured_dn_means.turn_left}Hz | TurnR: ${resRecord.measured_dn_means.turn_right}Hz | Escape: ${resRecord.measured_dn_means.escape}Hz`);
      }
    }
  }

  const outData = {
    schema: "sensory.aversive_characterization.v1",
    timestamp: new Date().toISOString(),
    seed,
    results,
  };

  const outPath = path.join(OUT_DIR, "aversive_characterization.json");
  fs.writeFileSync(outPath, JSON.stringify(outData, null, 2));
  console.log(`\n=== Aversive Input Characterization Complete. Saved to ${outPath} ===\n`);
}

runAversiveCharacterization().catch((err) => {
  console.error("Error in aversive characterization:", err);
  process.exit(1);
});
