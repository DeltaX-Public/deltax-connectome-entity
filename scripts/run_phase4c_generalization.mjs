/**
 * Phase IV-C Generalization Evaluation Runner.
 * Executes the 10-environment x 5-controller matrix across:
 *   - Development Cohort: seeds 11000..11049 (N = 50)
 *   - Held-Out Cohort: seeds 12000..12099 (N = 100)
 *
 * Parallelized across worker processes by environment.
 * PUBLIC-SAFE: Never exposes private filesystem paths or credentials.
 */
import fs from "node:fs";
import path from "node:path";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ENVIRONMENT_SUITE } from "../src/worlds/changed_world/environment_suite.mjs";
import { CONTROLLER_TYPES } from "../src/controllers/candidate_selectors.mjs";
import { ChangedWorldHarness } from "../src/experiments/changed_world/harness.mjs";
import { TRANSDUCTION_MODES } from "../src/connectome/sensory_transduction.mjs";
import { READOUT_MODES } from "../src/connectome/candidate_bridge.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const outDir = path.join(ROOT, "artifacts", "generalization");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

export const CONTROLLERS_TO_EVALUATE = Object.freeze([
  CONTROLLER_TYPES.SUBSTRATE_TOP,
  CONTROLLER_TYPES.SIMPLE_REFLEX,
  CONTROLLER_TYPES.STOCHASTIC_WEIGHTED,
  CONTROLLER_TYPES.DELTAX_EXECUTIVE,
  CONTROLLER_TYPES.DELTAX_STATE_RESET,
]);

function wilsonCI(k, n, z = 1.96) {
  if (n === 0) return { lower: 0, upper: 0 };
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const spread = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return {
    lower: +Math.max(0, center - spread).toFixed(4),
    upper: +Math.min(1, center + spread).toFixed(4),
  };
}

function meanAndStdErr(arr) {
  if (!arr || arr.length === 0) return { mean: 0, stdErr: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, arr.length - 1);
  const stdErr = Math.sqrt(variance / arr.length);
  return { mean: +mean.toFixed(2), stdErr: +stdErr.toFixed(2) };
}

/**
 * Execute single (Environment, Controller) evaluation for a seed slice.
 */
export async function executeEnvController({
  envKey,
  controllerKey,
  startSeed,
  seedCount,
  command = process.env.DELTAX_LOCAL_RUNTIME_CMD || null,
}) {
  const envDef = ENVIRONMENT_SUITE[envKey];
  if (!envDef) throw new Error(`Unknown environment: ${envKey}`);

  const seeds = Array.from({ length: seedCount }, (_, i) => startSeed + i);
  const episodes = [];

  const harnessCondition =
    controllerKey === CONTROLLER_TYPES.DELTAX_STATE_RESET
      ? "EXECUTIVE_MEMORY_RESET"
      : controllerKey === CONTROLLER_TYPES.DELTAX_EXECUTIVE
      ? "EXECUTIVE"
      : "CONTROL";

  for (const seed of seeds) {
    const harness = new ChangedWorldHarness({
      seed,
      condition: harnessCondition,
      command,
      controllerType: controllerKey,
      worldFactory: envDef.createWorld,
      sensoryMode: TRANSDUCTION_MODES.LATERALIZED,
      readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES,
      maxStepsPerTrial: 35,
      changeAtStep: 18,
    });

    const ep = await harness.runEpisode();
    await harness.close();

    const actionHist = { forward: 0, backward: 0, left: 0, right: 0, stop: 0 };
    for (const tr of [ep.trial1, ep.trial2]) {
      for (const h of tr.history || []) {
        const act = h.chosenAction || "stop";
        actionHist[act] = (actionHist[act] || 0) + 1;
      }
    }

    episodes.push({
      seed,
      bothReachedGoal: ep.bothReachedGoal,
      t1ReachedGoal: ep.trial1.reachedGoal,
      t2ReachedGoal: ep.trial2.reachedGoal,
      t1Collisions: ep.trial1.collisionCount,
      t2Collisions: ep.trial2.collisionCount,
      t1Energy: ep.trial1.energyUsed,
      t2Energy: ep.trial2.energyUsed,
      t1Steps: ep.trial1.stepsExecuted,
      t2Steps: ep.trial2.stepsExecuted,
      actionHist,
    });
  }

  const bothGoals = episodes.filter((e) => e.bothReachedGoal).length;
  const t1Goals = episodes.filter((e) => e.t1ReachedGoal).length;
  const t2Goals = episodes.filter((e) => e.t2ReachedGoal).length;

  const aggActionHist = { forward: 0, backward: 0, left: 0, right: 0, stop: 0 };
  for (const e of episodes) {
    for (const [k, v] of Object.entries(e.actionHist)) {
      aggActionHist[k] = (aggActionHist[k] || 0) + v;
    }
  }

  const t2CollisionsArr = episodes.map((e) => e.t2Collisions);
  const t2StepsArr = episodes.map((e) => e.t2Steps);

  return {
    envKey,
    controllerKey,
    n: seedCount,
    summary: {
      t1_goal_rate: +(t1Goals / seedCount).toFixed(4),
      t2_goal_rate: +(t2Goals / seedCount).toFixed(4),
      both_goal_rate: +(bothGoals / seedCount).toFixed(4),
      both_goal_ci: wilsonCI(bothGoals, seedCount),
      t2_collisions: meanAndStdErr(t2CollisionsArr),
      t2_steps: meanAndStdErr(t2StepsArr),
      action_histogram: aggActionHist,
    },
    episodes,
  };
}

/**
 * Worker process evaluating all controllers for a single environment.
 */
async function runEnvWorker({ envKey, startSeed, seedCount, command }) {
  const results = {};
  for (const controllerKey of CONTROLLERS_TO_EVALUATE) {
    results[controllerKey] = await executeEnvController({
      envKey,
      controllerKey,
      startSeed,
      seedCount,
      command,
    });
  }
  return results;
}

/**
 * Orchestrate parallel cohort evaluation across all 10 environments.
 */
export async function runPhase4CCohort({
  cohortName = "dev",
  startSeed = 11000,
  seedCount = 50,
  environments = Object.keys(ENVIRONMENT_SUITE),
  command = process.env.DELTAX_LOCAL_RUNTIME_CMD || null,
} = {}) {
  console.log(`\n======================================================`);
  console.log(`Starting Phase IV-C Generalization Evaluation: ${cohortName}`);
  console.log(`Seeds: ${startSeed}..${startSeed + seedCount - 1} (N = ${seedCount})`);
  console.log(`Environments (${environments.length}): ${environments.join(", ")}`);
  console.log(`Controllers (${CONTROLLERS_TO_EVALUATE.length}): ${CONTROLLERS_TO_EVALUATE.join(", ")}`);
  console.log(`Runtime Mode: ${command ? "local_runtime" : "public_only"}`);
  console.log(`======================================================\n`);

  const tStart = Date.now();
  const workerPromises = environments.map((envKey) => {
    return new Promise((resolve, reject) => {
      const worker = fork(__filename, [
        "--worker",
        envKey,
        String(startSeed),
        String(seedCount),
        command || "",
      ], {
        env: { ...process.env, DELTAX_LOCAL_RUNTIME_CMD: command || "" },
        stdio: ["inherit", "inherit", "inherit", "ipc"],
      });

      let resultData = null;
      worker.on("message", (msg) => {
        if (msg && msg.type === "RESULT") {
          resultData = msg.data;
        }
      });

      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker for ${envKey} exited with code ${code}`));
        } else if (!resultData) {
          reject(new Error(`Worker for ${envKey} did not send result data`));
        } else {
          console.log(`✓ Completed environment: ${envKey}`);
          resolve([envKey, resultData]);
        }
      });
    });
  });

  const workerResults = await Promise.all(workerPromises);
  const matrix = Object.fromEntries(workerResults);
  const durationMs = Date.now() - tStart;

  // Compute Generalization Rates per controller across environments
  const generalizationRates = {};
  for (const controllerKey of CONTROLLERS_TO_EVALUATE) {
    let envsSolved = 0;
    for (const envKey of environments) {
      const rate = matrix[envKey]?.[controllerKey]?.summary?.both_goal_rate || 0;
      if (rate >= 0.8) {
        envsSolved++;
      }
    }
    generalizationRates[controllerKey] = {
      environments_solved: envsSolved,
      total_environments: environments.length,
      generalization_rate: +(envsSolved / environments.length).toFixed(4),
    };
  }

  const artifact = {
    schema: "phase4c.generalization.v1",
    timestamp: new Date().toISOString(),
    cohort: cohortName,
    seed_range: `${startSeed}..${startSeed + seedCount - 1}`,
    seed_count: seedCount,
    duration_ms: durationMs,
    executive_source: command ? "local_runtime" : "public_only",
    runtime_available: Boolean(command),
    runtime_version: command ? "v1.0.0-local" : null,
    generalization_rates: generalizationRates,
    matrix,
  };

  const outPath = path.join(outDir, `phase4c-generalization-${cohortName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2), "utf8");
  console.log(`\n======================================================`);
  console.log(`Saved generalization artifact to ${outPath} in ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`======================================================\n`);

  // Print Formatted Matrix Table
  console.log("--- PHASE IV-C ENVIRONMENT x CONTROLLER GOAL RATES ---");
  const tableRows = [];
  for (const envKey of environments) {
    const row = { Environment: envKey };
    for (const cKey of CONTROLLERS_TO_EVALUATE) {
      const rate = matrix[envKey]?.[cKey]?.summary?.both_goal_rate ?? 0;
      row[cKey] = `${(rate * 100).toFixed(1)}%`;
    }
    tableRows.push(row);
  }
  console.table(tableRows);

  console.log("--- GENERALIZATION SUMMARY TABLE ---");
  console.table(
    Object.entries(generalizationRates).map(([k, v]) => ({
      Controller: k,
      "Envs Solved (>=80%)": `${v.environments_solved} / ${v.total_environments}`,
      "Generalization Rate": `${(v.generalization_rate * 100).toFixed(1)}%`,
    }))
  );

  return artifact;
}

// CLI Entrypoint
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain) {
  if (process.argv[2] === "--worker") {
    const envKey = process.argv[3];
    const startSeed = parseInt(process.argv[4], 10);
    const seedCount = parseInt(process.argv[5], 10);
    const command = process.argv[6] || process.env.DELTAX_LOCAL_RUNTIME_CMD;

    runEnvWorker({ envKey, startSeed, seedCount, command })
      .then((data) => {
        if (process.send) {
          process.send({ type: "RESULT", data });
        }
        process.exit(0);
      })
      .catch((err) => {
        console.error(`Worker error for ${envKey}:`, err);
        process.exit(1);
      });
  } else {
    const cohortArg = process.argv[2] || "dev";
    if (cohortArg === "held_out") {
      runPhase4CCohort({ cohortName: "held_out", startSeed: 12000, seedCount: 100 }).catch(console.error);
    } else {
      const countArg = parseInt(process.argv[3] || "50", 10);
      runPhase4CCohort({ cohortName: "dev", startSeed: 11000, seedCount: countArg }).catch(console.error);
    }
  }
}
