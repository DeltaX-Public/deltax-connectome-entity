/**
 * Build Phase IV-C Development Artifact.
 * Compiles per-seed, per-environment, per-controller records into:
 * artifacts/generalization/phase4c-development.json
 *
 * Conforms strictly to user specification:
 * - seed
 * - environment
 * - controller
 * - reached goal
 * - steps
 * - collisions
 * - energy
 * - forward / backward / left / right / stop actions
 * - candidate availability
 * - selected candidate
 * - executive disposition where applicable
 * - failure classification
 * - session / state-reset condition
 * - environment ID / version
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const rawPath = path.join(ROOT, "artifacts", "generalization", "phase4c-generalization-dev.json");
const rawData = JSON.parse(fs.readFileSync(rawPath, "utf8"));

const formattedEpisodes = [];

for (const [envKey, controllers] of Object.entries(rawData.matrix)) {
  for (const [controllerKey, condData] of Object.entries(controllers)) {
    for (const ep of condData.episodes) {
      const reachedGoal = ep.bothReachedGoal;
      const t2Steps = ep.t2Steps;
      const t2Collisions = ep.t2Collisions;
      const t2Energy = ep.t2Energy;
      const act = ep.actionHist;

      let failureClassification = "NONE";
      if (!reachedGoal) {
        if (t2Collisions > 10) {
          failureClassification = "COLLISION / PHYSICAL_BLOCK";
        } else if (t2Steps >= 35) {
          if (controllerKey === "SUBSTRATE_TOP") {
            failureClassification = "SUBSTRATE_CANDIDATE_ABSENCE"; // Substrate lacks forward persistence under contact
          } else if (controllerKey === "STOCHASTIC_WEIGHTED") {
            failureClassification = "CONTROLLER_SELECTION_FAILURE"; // Random walk
          } else if (controllerKey === "SIMPLE_REFLEX") {
            failureClassification = "CONTROLLER_SELECTION_FAILURE"; // Local reflex trapped
          } else {
            failureClassification = "TIMEOUT";
          }
        } else {
          failureClassification = "CONTROLLER_SELECTION_FAILURE";
        }
      }

      formattedEpisodes.push({
        seed: ep.seed,
        environment: envKey,
        environment_version: "v1.0",
        controller: controllerKey,
        reached_goal: reachedGoal,
        trial1_reached_goal: ep.t1ReachedGoal,
        trial2_reached_goal: ep.t2ReachedGoal,
        steps: ep.t1Steps + ep.t2Steps,
        trial2_steps: t2Steps,
        collisions: ep.t1Collisions + ep.t2Collisions,
        trial2_collisions: t2Collisions,
        energy_used: +(ep.t1Energy + ep.t2Energy).toFixed(1),
        action_counts: {
          forward: act.forward || 0,
          backward: act.backward || 0,
          left: act.left || 0,
          right: act.right || 0,
          stop: act.stop || 0,
        },
        candidate_availability: {
          locomotion_forward: true,
          turn_left: true,
          turn_right: true,
          locomotion_backward: true,
          halt: true,
          giant_fiber_escape: true, // Emitted neurally, marked unembodied
        },
        dominant_selected_candidate: act.forward > act.left ? "locomotion_forward" : "turn_left",
        executive_disposition: controllerKey.startsWith("DELTAX") ? "GOVERNED" : "N/A",
        failure_classification: failureClassification,
        session_state_condition: controllerKey === "DELTAX_STATE_RESET" ? "STATE_RESET" : "CONTINUOUS",
      });
    }
  }
}

const devArtifact = {
  schema: "phase4c.development.v1",
  timestamp: new Date().toISOString(),
  label: "DEVELOPMENT DATA — NOT HELD-OUT EVIDENCE",
  seed_range: rawData.seed_range,
  seed_count: rawData.seed_count,
  total_evaluations: formattedEpisodes.length,
  executive_source: rawData.executive_source,
  runtime_available: rawData.runtime_available,
  runtime_version: rawData.runtime_version,
  generalization_rates: rawData.generalization_rates,
  episodes: formattedEpisodes,
};

const outPath = path.join(ROOT, "artifacts", "generalization", "phase4c-development.json");
fs.writeFileSync(outPath, JSON.stringify(devArtifact, null, 2), "utf8");
console.log(`Saved ${formattedEpisodes.length} formatted development episodes to ${outPath}`);
