/**
 * Phase IV-A Causal Neural Perturbation.
 *
 * Evaluates causal necessity and topological specificity of the discovered
 * sensory-to-steering pathway:
 * Stimulus: Tactile T1 Left (180 Hz) -> Ipsilateral Steering DNs (turn_left)
 *
 * 4 Causal Branches:
 * Branch A (Intact): Intact connectome under Left Tactile stimulation.
 * Branch B (Silenced Steering): Left steering DNs (DNa02, DNa01, DNp09 side 1) silenced.
 * Branch C (Sham Silencing): Unrelated DN population (grooming DNs DNg07/DNg08) silenced.
 * Branch D (Opposite Sensory): Right Tactile stimulation (tactile T1 right at 180 Hz).
 *
 * Saves artifacts to artifacts/sensory_atlas/causal_perturbation.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SensoryAtlasHarness } from "../src/experiments/sensory_atlas/harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts", "sensory_atlas");

async function runCausalPerturbation() {
  console.log("=== Running Phase IV-A Causal Neural Perturbation ===");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seed = 7000;
  const harness = new SensoryAtlasHarness({ seed });
  const runtime = harness.initRuntime(seed);

  // Identify target populations
  const turnLNeuronIndices = new Set(runtime.dnPopulations.turn_left.map((n) => n.index));
  const groomNeuronIndices = new Set(runtime.dnPopulations.groom.map((n) => n.index));

  console.log(`Target Left Steering DNs: ${turnLNeuronIndices.size} neurons`);
  console.log(`Sham Grooming DNs: ${groomNeuronIndices.size} neurons`);

  const branches = {};

  // Branch A: Intact Left Tactile T1 (180 Hz)
  console.log("\nExecuting Branch A (Intact)...");
  branches.Branch_A_Intact = await harness.runTrial({
    population: "tactile T1 left",
    intensity: 180.0,
    pattern: "CONSTANT",
    laterality: "LEFT_ONLY",
    seed,
  });

  // Branch B: Silenced Left Steering DNs
  console.log("Executing Branch B (Silenced Steering DNs)...");
  branches.Branch_B_Silenced_Steering = await harness.runTrial({
    population: "tactile T1 left",
    intensity: 180.0,
    pattern: "CONSTANT",
    laterality: "LEFT_ONLY",
    seed,
    silencedNeurons: turnLNeuronIndices,
  });

  // Branch C: Sham Silencing (Grooming DNs)
  console.log("Executing Branch C (Sham Silencing)...");
  branches.Branch_C_Sham_Silencing = await harness.runTrial({
    population: "tactile T1 left",
    intensity: 180.0,
    pattern: "CONSTANT",
    laterality: "LEFT_ONLY",
    seed,
    silencedNeurons: groomNeuronIndices,
  });

  // Branch D: Opposite-Side Sensory Stimulation (Right Tactile T1 at 180 Hz)
  console.log("Executing Branch D (Opposite Sensory: Right Tactile)...");
  branches.Branch_D_Opposite_Sensory = await harness.runTrial({
    population: "tactile T1 right",
    intensity: 180.0,
    pattern: "CONSTANT",
    laterality: "RIGHT_ONLY",
    seed,
  });

  const branchSummaries = {
    Branch_A_Intact: {
      description: "Intact connectome under Left Tactile stimulation (180 Hz)",
      turn_left_hz: branches.Branch_A_Intact.stimulus_means.turn_left,
      turn_right_hz: branches.Branch_A_Intact.stimulus_means.turn_right,
      steering_bias_hz: branches.Branch_A_Intact.steering_bias,
      peak_left_hz: branches.Branch_A_Intact.peaks.turn_left,
      dominant_winner: branches.Branch_A_Intact.dominant_winner,
    },
    Branch_B_Silenced_Steering: {
      description: "Left steering DNs silenced (DNa02, DNa01, DNp09 side 1)",
      turn_left_hz: branches.Branch_B_Silenced_Steering.stimulus_means.turn_left,
      turn_right_hz: branches.Branch_B_Silenced_Steering.stimulus_means.turn_right,
      steering_bias_hz: branches.Branch_B_Silenced_Steering.steering_bias,
      peak_left_hz: branches.Branch_B_Silenced_Steering.peaks.turn_left,
      dominant_winner: branches.Branch_B_Silenced_Steering.dominant_winner,
    },
    Branch_C_Sham_Silencing: {
      description: "Sham silencing: Unrelated grooming DNs silenced",
      turn_left_hz: branches.Branch_C_Sham_Silencing.stimulus_means.turn_left,
      turn_right_hz: branches.Branch_C_Sham_Silencing.stimulus_means.turn_right,
      steering_bias_hz: branches.Branch_C_Sham_Silencing.steering_bias,
      peak_left_hz: branches.Branch_C_Sham_Silencing.peaks.turn_left,
      dominant_winner: branches.Branch_C_Sham_Silencing.dominant_winner,
    },
    Branch_D_Opposite_Sensory: {
      description: "Opposite-side Right Tactile stimulation (180 Hz)",
      turn_left_hz: branches.Branch_D_Opposite_Sensory.stimulus_means.turn_left,
      turn_right_hz: branches.Branch_D_Opposite_Sensory.stimulus_means.turn_right,
      steering_bias_hz: branches.Branch_D_Opposite_Sensory.steering_bias,
      peak_right_hz: branches.Branch_D_Opposite_Sensory.peaks.turn_right,
      dominant_winner: branches.Branch_D_Opposite_Sensory.dominant_winner,
    },
  };

  console.log("\n=== Causal Branch Results ===");
  for (const [name, s] of Object.entries(branchSummaries)) {
    console.log(`${name.padEnd(28)}: TurnL = ${s.turn_left_hz} Hz, TurnR = ${s.turn_right_hz} Hz (Steering Bias = ${s.steering_bias_hz > 0 ? "+" : ""}${s.steering_bias_hz} Hz)`);
  }

  const outData = {
    schema: "sensory.causal_perturbation.v1",
    timestamp: new Date().toISOString(),
    seed,
    stimulus: "tactile T1 left (180 Hz)",
    branches: branchSummaries,
  };

  const outPath = path.join(OUT_DIR, "causal_perturbation.json");
  fs.writeFileSync(outPath, JSON.stringify(outData, null, 2));
  console.log(`\nSaved causal perturbation artifact to ${outPath}`);
}

runCausalPerturbation().catch((err) => {
  console.error("Error in causal perturbation:", err);
  process.exit(1);
});
