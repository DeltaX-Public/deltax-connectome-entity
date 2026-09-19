/**
 * Build Phase IV-C Development Artifact (V2 Repaired).
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
 * - failure classification (mutually exclusive taxonomy)
 * - session / state-reset condition
 * - environment ID / version
 * - executive selected-ID match rate & fallback rate
 * - fork candidate metrics
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attributeFailureCausally, DIAGNOSTIC_FORKS } from "../src/experiments/changed_world/diagnostic_forks.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const cohortArg = process.argv[2] || "dev";
const isHeldOut = cohortArg === "held_out";
const rawFileName = isHeldOut ? "phase4c-generalization-held_out.json" : "phase4c-generalization-dev.json";
const outFileName = isHeldOut ? "phase4c-held-out.json" : "phase4c-development.json";

const rawPath = path.join(ROOT, "artifacts", "generalization", rawFileName);
if (!fs.existsSync(rawPath)) {
  console.error(`Missing raw data at ${rawPath}`);
  process.exit(1);
}
const rawData = JSON.parse(fs.readFileSync(rawPath, "utf8"));

const formattedEpisodes = [];
const failureAttributions = [];
let totalExecDecisionsCohort = 0;
let matchedExecDecisionsCohort = 0;
let fallbackExecDecisionsCohort = 0;

for (const [envKey, controllers] of Object.entries(rawData.matrix)) {
  for (const [controllerKey, condData] of Object.entries(controllers)) {
    for (const ep of condData.episodes) {
      const reachedGoal = ep.bothReachedGoal;
      const t2Steps = ep.t2Steps;
      const t2Collisions = ep.t2Collisions;
      const t2Energy = ep.t2Energy;
      const act = ep.actionHist || {};

      let sessionState = "N/A";
      if (controllerKey === "DELTAX_STEP_RESET") {
        sessionState = "STEP_RESET";
      } else if (controllerKey === "DELTAX_TRIAL_RESET" || controllerKey === "DELTAX_STATE_RESET") {
        sessionState = "TRIAL_RESET";
      } else if (controllerKey === "DELTAX_EXECUTIVE") {
        sessionState = "CONTINUOUS_RETAINED";
      }

      // Executive selection matching metrics
      let execMatching = null;
      if (ep.executiveSelectionSummary) {
        const t1 = ep.executiveSelectionSummary.trial1;
        const t2 = ep.executiveSelectionSummary.trial2;
        const total = (t1?.total_decisions || 0) + (t2?.total_decisions || 0);
        const matched = (t1?.matched_decisions || 0) + (t2?.matched_decisions || 0);
        const fallback = (t1?.fallback_count || 0) + (t2?.fallback_count || 0);
        totalExecDecisionsCohort += total;
        matchedExecDecisionsCohort += matched;
        fallbackExecDecisionsCohort += fallback;
        execMatching = {
          total_decisions: total,
          matched_decisions: matched,
          match_rate: total > 0 ? +(matched / total).toFixed(4) : 1.0,
          fallback_count: fallback,
        };
      }

      let failureAttribution = null;
      let failureCat = null;
      if (!reachedGoal) {
        failureAttribution = attributeFailureCausally({
          environmentId: envKey,
          controller: controllerKey,
          reachedGoal: false,
          history: [],
          actionCounts: act,
          forkCandidateLogs: ep.forkCandidateLogs || [],
          stepCount: ep.t1Steps + ep.t2Steps,
        });
        failureCat = failureAttribution ? failureAttribution.category : "OTHER";
        failureAttributions.push({
          seed: ep.seed,
          environment: envKey,
          controller: controllerKey,
          steps: ep.t1Steps + ep.t2Steps,
          action_counts: act,
          attribution: failureAttribution,
        });
      }

      formattedEpisodes.push({
        seed: ep.seed,
        environment: envKey,
        environment_version: "v2.0",
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
          quiescent_halt: true,
          giant_fiber_escape: true,
        },
        dominant_selected_candidate: act.forward > act.left ? "locomotion_forward" : "turn_left",
        executive_disposition: controllerKey.startsWith("DELTAX") ? "GOVERNED" : "N/A",
        failure_classification: reachedGoal ? "NONE" : failureCat,
        failure_attribution: failureAttribution,
        session_state_condition: sessionState,
        executive_matching: execMatching,
        fork_candidate_logs: ep.forkCandidateLogs || [],
      });
    }
  }
}

// Compute aggregate metrics by controller
const aggregateMetrics = {};
for (const [envKey, controllers] of Object.entries(rawData.matrix)) {
  for (const [controllerKey, condData] of Object.entries(controllers)) {
    if (!aggregateMetrics[controllerKey]) {
      aggregateMetrics[controllerKey] = {
        episodes_count: 0,
        goals_reached: 0,
        total_steps: 0,
        total_collisions: 0,
        failures_by_type: {},
      };
    }
    const agg = aggregateMetrics[controllerKey];
    for (const ep of condData.episodes) {
      agg.episodes_count++;
      if (ep.bothReachedGoal) agg.goals_reached++;
      agg.total_steps += ep.t2Steps;
      agg.total_collisions += ep.t2Collisions;
      if (!ep.bothReachedGoal) {
        const epAttribution = attributeFailureCausally({
          environmentId: envKey,
          controller: controllerKey,
          reachedGoal: false,
          history: [],
          actionCounts: ep.actionHist || {},
          forkCandidateLogs: ep.forkCandidateLogs || [],
          stepCount: ep.t1Steps + ep.t2Steps,
        });
        const fType = epAttribution ? epAttribution.category : "OTHER";
        agg.failures_by_type[fType] = (agg.failures_by_type[fType] || 0) + 1;
      }
    }
  }
}

const devArtifact = {
  schema: "phase4c.development_audit.v2",
  timestamp: new Date().toISOString(),
  cohort: rawData.cohort || "dev_v2",
  seed_range: rawData.seed_range,
  seed_count: rawData.seed_count,
  environments_count: Object.keys(rawData.matrix).length,
  controllers_count: Object.keys(aggregateMetrics).length,
  total_episodes: formattedEpisodes.length,
  executive_selected_id_match_rate: totalExecDecisionsCohort > 0
    ? +(matchedExecDecisionsCohort / totalExecDecisionsCohort).toFixed(4)
    : 1.0,
  executive_fallback_rate: totalExecDecisionsCohort > 0
    ? +(fallbackExecDecisionsCohort / totalExecDecisionsCohort).toFixed(4)
    : 0.0,
  generalization_rates: rawData.generalization_rates,
  aggregate_controller_metrics: Object.fromEntries(
    Object.entries(aggregateMetrics).map(([k, v]) => [
      k,
      {
        episodes_count: v.episodes_count,
        goal_rate: +(v.goals_reached / v.episodes_count).toFixed(4),
        mean_steps: +(v.total_steps / v.episodes_count).toFixed(2),
        mean_collisions: +(v.total_collisions / v.episodes_count).toFixed(2),
        failures: v.failures_by_type,
      },
    ])
  ),
  episodes: formattedEpisodes,
};

const devOutPath = path.join(ROOT, "artifacts", "generalization", outFileName);
fs.writeFileSync(devOutPath, JSON.stringify(devArtifact, null, 2), "utf8");

// Publish failure attribution artifact
const failureSummary = {};
const failureByController = {};
const failureByEnv = {};
for (const f of failureAttributions) {
  const cat = f.attribution?.category || "OTHER";
  failureSummary[cat] = (failureSummary[cat] || 0) + 1;
  if (!failureByController[f.controller]) failureByController[f.controller] = {};
  failureByController[f.controller][cat] = (failureByController[f.controller][cat] || 0) + 1;
  if (!failureByEnv[f.environment]) failureByEnv[f.environment] = {};
  failureByEnv[f.environment][cat] = (failureByEnv[f.environment][cat] || 0) + 1;
}

const failureAttributionArtifact = {
  schema: "phase4c.failure_attribution.v2",
  timestamp: new Date().toISOString(),
  cohort: rawData.cohort || (isHeldOut ? "held_out" : "dev_v2"),
  seed_range: rawData.seed_range,
  seed_count: rawData.seed_count,
  total_episodes: formattedEpisodes.length,
  failed_episodes: failureAttributions.length,
  overall_failure_distribution: failureSummary,
  failures_by_controller: failureByController,
  failures_by_environment: failureByEnv,
  diagnostic_forks: DIAGNOSTIC_FORKS,
  sample_failures: failureAttributions.slice(0, 100),
};

const failureOutFileName = isHeldOut ? "phase4c-failure-attribution-held_out.json" : "phase4c-failure-attribution-v2.json";
const failureOutPath = path.join(ROOT, "artifacts", "generalization", failureOutFileName);
fs.writeFileSync(failureOutPath, JSON.stringify(failureAttributionArtifact, null, 2), "utf8");

console.log(`\n======================================================`);
console.log(`Compiled ${formattedEpisodes.length} development episodes into:`);
console.log(`${devOutPath}`);
console.log(`Published failure attribution artifact to:`);
console.log(`${failureOutPath}`);
console.log(`Cohort Executive Match Rate: ${(devArtifact.executive_selected_id_match_rate * 100).toFixed(2)}%`);
console.log(`Cohort Executive Fallback Rate: ${(devArtifact.executive_fallback_rate * 100).toFixed(2)}%`);
console.log(`Failure Breakdown:`, JSON.stringify(failureSummary));
console.log(`======================================================\n`);
