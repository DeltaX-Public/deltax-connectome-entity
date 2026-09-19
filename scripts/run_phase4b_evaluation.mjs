/**
 * scripts/run_phase4b_evaluation.mjs
 * Parallel Multi-Process Runner for the Phase IV-B 7-Condition Factorial Evaluation:
 *   A. OLD_SYMM_OLD_READOUT
 *   B. LATERAL_OLD_READOUT
 *   C. OLD_SYMM_CALIB_READOUT
 *   D. LATERAL_CALIB_READOUT
 *   E. LATERAL_CALIB_OBSERVE
 *   F. LATERAL_CALIB_EXECUTIVE
 *   G. SHUFFLED_LATERAL_CALIB
 *
 * Utilizes multi-core parallel worker processes for 7x speedup.
 * Outputs:
 *   - artifacts/readout/phase4b-evaluation-<cohort>.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { ChangedWorldHarness } from '../src/experiments/changed_world/harness.mjs';
import { TRANSDUCTION_MODES } from '../src/connectome/sensory_transduction.mjs';
import { READOUT_MODES } from '../src/connectome/candidate_bridge.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'artifacts', 'readout');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// ── Statistical Utilities ──────────────────────────────────────────────────
export function wilsonCI(k, n, z = 1.96) {
  if (n === 0) return { lo: 0, hi: 0, mid: 0 };
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const spread = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return {
    lo: +Math.max(0, centre - spread).toFixed(4),
    hi: +Math.min(1, centre + spread).toFixed(4),
    mid: +centre.toFixed(4),
  };
}

export function meanAndStdErr(arr) {
  if (!arr || arr.length === 0) return { mean: 0, stdErr: 0, n: 0 };
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / (arr.length > 1 ? arr.length - 1 : 1);
  const stdErr = Math.sqrt(variance / arr.length);
  return { mean: +mean.toFixed(2), stdErr: +stdErr.toFixed(2), n: arr.length };
}

export const FACTORIAL_CONDITIONS = Object.freeze({
  A_OLD_SYMM_OLD_READOUT: {
    id: "A_OLD_SYMM_OLD_READOUT",
    label: "A. Old Symmetric Sensory + Old Readout (Baseline)",
    harnessCondition: "CONTROL",
    sensoryMode: TRANSDUCTION_MODES.SYMMETRIC,
    readoutMode: READOUT_MODES.READOUT_A_CURRENT,
  },
  B_LATERAL_OLD_READOUT: {
    id: "B_LATERAL_OLD_READOUT",
    label: "B. Lateral Sensory + Old Readout",
    harnessCondition: "CONTROL",
    sensoryMode: TRANSDUCTION_MODES.LATERALIZED,
    readoutMode: READOUT_MODES.READOUT_A_CURRENT,
  },
  C_OLD_SYMM_CALIB_READOUT: {
    id: "C_OLD_SYMM_CALIB_READOUT",
    label: "C. Old Symmetric Sensory + Calibrated Readout",
    harnessCondition: "CONTROL",
    sensoryMode: TRANSDUCTION_MODES.SYMMETRIC,
    readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES,
  },
  D_LATERAL_CALIB_READOUT: {
    id: "D_LATERAL_CALIB_READOUT",
    label: "D. Lateral Sensory + Calibrated Readout (Substrate)",
    harnessCondition: "CONTROL",
    sensoryMode: TRANSDUCTION_MODES.LATERALIZED,
    readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES,
  },
  E_LATERAL_CALIB_OBSERVE: {
    id: "E_LATERAL_CALIB_OBSERVE",
    label: "E. Lateral Sensory + Calibrated Readout + Observe",
    harnessCondition: "OBSERVE",
    sensoryMode: TRANSDUCTION_MODES.LATERALIZED,
    readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES,
  },
  F_LATERAL_CALIB_EXECUTIVE: {
    id: "F_LATERAL_CALIB_EXECUTIVE",
    label: "F. Lateral Sensory + Calibrated Readout + Executive",
    harnessCondition: "EXECUTIVE",
    sensoryMode: TRANSDUCTION_MODES.LATERALIZED,
    readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES,
  },
  G_SHUFFLED_LATERAL_CALIB: {
    id: "G_SHUFFLED_LATERAL_CALIB",
    label: "G. Shuffled Connectome + Lateral Sensory + Calibrated Readout",
    harnessCondition: "SHUFFLED_CONNECTOME",
    sensoryMode: TRANSDUCTION_MODES.LATERALIZED,
    readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES,
  },
});

/**
 * Worker execution for a single condition across seeds.
 */
export async function executeSingleCondition({
  condKey,
  startSeed,
  seedCount,
  command,
}) {
  const condCfg = FACTORIAL_CONDITIONS[condKey];
  const seeds = Array.from({ length: seedCount }, (_, i) => startSeed + i);
  const episodes = [];

  for (let idx = 0; idx < seeds.length; idx++) {
    const seed = seeds[idx];
    const harness = new ChangedWorldHarness({
      seed,
      condition: condCfg.harnessCondition,
      sensoryMode: condCfg.sensoryMode,
      readoutMode: condCfg.readoutMode,
      command,
      maxStepsPerTrial: 35,
      changeAtStep: 18,
    });

    const ep = await harness.runEpisode();
    await harness.close();

    const actionHist = { forward: 0, left: 0, right: 0, stop: 0 };
    const candHist = {};
    let totalSteps = 0;

    for (const tr of [ep.trial1, ep.trial2]) {
      for (const h of tr.history || []) {
        totalSteps++;
        const act = h.chosenAction || h.action || "stop";
        actionHist[act] = (actionHist[act] || 0) + 1;
        const topCand = h.topCandidate?.action || h.chosenCandidateClass || "unknown";
        candHist[topCand] = (candHist[topCand] || 0) + 1;
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
      candHist,
      totalSteps,
      dispositions: ep.trial1.dispositionCounts || {},
    });

    if ((idx + 1) % 10 === 0 || idx === seeds.length - 1) {
      console.log(`[${condKey}] Progress: ${idx + 1}/${seedCount} seeds completed`);
    }
  }

  // Aggregate metrics
  const t1Goals = episodes.filter((e) => e.t1ReachedGoal).length;
  const t2Goals = episodes.filter((e) => e.t2ReachedGoal).length;
  const bothGoals = episodes.filter((e) => e.bothReachedGoal).length;

  const totalStepsInCond = episodes.reduce((s, e) => s + e.totalSteps, 0);
  const aggActionHist = { forward: 0, left: 0, right: 0, stop: 0 };
  const aggCandHist = {};
  for (const e of episodes) {
    for (const [act, cnt] of Object.entries(e.actionHist)) {
      aggActionHist[act] = (aggActionHist[act] || 0) + cnt;
    }
    for (const [cand, cnt] of Object.entries(e.candHist)) {
      aggCandHist[cand] = (aggCandHist[cand] || 0) + cnt;
    }
  }

  const t2CollisionsArr = episodes.map((e) => e.t2Collisions);
  const t2EnergyArr = episodes.map((e) => e.t2Energy);
  const t2StepsArr = episodes.map((e) => e.t2Steps);

  const haltCandCount = aggCandHist["halt"] || 0;
  const winnerDiversity = totalStepsInCond > 0 ? (totalStepsInCond - haltCandCount) / totalStepsInCond : 0;
  const steeringInitiationRate = totalStepsInCond > 0 ? (aggActionHist.left + aggActionHist.right) / totalStepsInCond : 0;

  return {
    config: condCfg,
    n: seedCount,
    summary: {
      t1_goal_rate: +(t1Goals / seedCount).toFixed(4),
      t1_goal_ci: wilsonCI(t1Goals, seedCount),
      t2_goal_rate: +(t2Goals / seedCount).toFixed(4),
      t2_goal_ci: wilsonCI(t2Goals, seedCount),
      both_goal_rate: +(bothGoals / seedCount).toFixed(4),
      both_goal_ci: wilsonCI(bothGoals, seedCount),
      t2_collisions: meanAndStdErr(t2CollisionsArr),
      t2_energy: meanAndStdErr(t2EnergyArr),
      t2_steps: meanAndStdErr(t2StepsArr),
      winner_diversity_fraction: +winnerDiversity.toFixed(4),
      steering_initiation_rate: +steeringInitiationRate.toFixed(4),
      action_histogram: aggActionHist,
      candidate_histogram: aggCandHist,
    },
    episodes,
  };
}

/**
 * Master process orchestrating parallel worker processes.
 */
export async function runCohortParallel({
  cohortName = "dev",
  startSeed = 9000,
  seedCount = 50,
  conditions = Object.keys(FACTORIAL_CONDITIONS),
  command = process.env.DELTAX_LOCAL_RUNTIME_CMD || null,
} = {}) {
  console.log(`\n======================================================`);
  console.log(`Starting Phase IV-B Parallel Factorial Evaluation: ${cohortName}`);
  console.log(`Seeds: ${startSeed}..${startSeed + seedCount - 1} (N = ${seedCount})`);
  console.log(`Conditions: ${conditions.join(", ")}`);
  console.log(`Runtime: ${command ? "local_runtime" : "None (Sovereign/Public-only)"}`);
  console.log(`Spawning ${conditions.length} parallel worker processes...`);
  console.log(`======================================================\n`);

  const tStart = Date.now();
  const workerPromises = conditions.map((condKey) => {
    return new Promise((resolve, reject) => {
      const worker = fork(__filename, [
        "--worker",
        condKey,
        String(startSeed),
        String(seedCount),
        command || "",
      ], {
        env: { ...process.env, DELTAX_LOCAL_RUNTIME_CMD: command || "" },
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      });

      let resultData = null;
      worker.on('message', (msg) => {
        if (msg && msg.type === 'RESULT') {
          resultData = msg.data;
        }
      });

      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker for ${condKey} exited with code ${code}`));
        } else if (!resultData) {
          reject(new Error(`Worker for ${condKey} did not send result data`));
        } else {
          console.log(`✓ Completed condition: ${condKey}`);
          resolve([condKey, resultData]);
        }
      });
    });
  });

  const workerResults = await Promise.all(workerPromises);
  const resultsByCondition = Object.fromEntries(workerResults);
  const durationMs = Date.now() - tStart;

  const artifact = {
    schema: "phase4b.evaluation.v1",
    timestamp: new Date().toISOString(),
    cohort: cohortName,
    seed_range: `${startSeed}..${startSeed + seedCount - 1}`,
    seed_count: seedCount,
    duration_ms: durationMs,
    executive_source: command ? "local_runtime" : "public_only",
    runtime_available: Boolean(command),
    runtime_version: command ? "v1.0.0-local" : null,
    conditions: resultsByCondition,
  };

  const outPath = path.join(outDir, `phase4b-evaluation-${cohortName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2), 'utf8');
  console.log(`\n======================================================`);
  console.log(`Saved evaluation artifact to ${outPath} in ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`======================================================\n`);

  // Summary Table
  console.log('--- FACTORIAL EVALUATION SUMMARY TABLE ---');
  const tableData = Object.entries(resultsByCondition).map(([k, v]) => ({
    Condition: k,
    'Winner Div.': `${(v.summary.winner_diversity_fraction * 100).toFixed(1)}%`,
    'Steer Rate': `${(v.summary.steering_initiation_rate * 100).toFixed(1)}%`,
    'Actions (F/L/R/S)': `${v.summary.action_histogram.forward}/${v.summary.action_histogram.left}/${v.summary.action_histogram.right}/${v.summary.action_histogram.stop}`,
    'T2 Collisions': `${v.summary.t2_collisions.mean} ± ${v.summary.t2_collisions.stdErr}`,
    'Both Goals': `${(v.summary.both_goal_rate * 100).toFixed(1)}%`,
  }));
  console.table(tableData);

  return artifact;
}

// CLI Execution Entrypoint
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain) {
  if (process.argv[2] === "--worker") {
    const condKey = process.argv[3];
    const startSeed = parseInt(process.argv[4], 10);
    const seedCount = parseInt(process.argv[5], 10);
    const command = process.argv[6] || process.env.DELTAX_LOCAL_RUNTIME_CMD;

    executeSingleCondition({ condKey, startSeed, seedCount, command })
      .then((data) => {
        if (process.send) {
          process.send({ type: 'RESULT', data });
        }
        process.exit(0);
      })
      .catch((err) => {
        console.error(`Worker ${condKey} error:`, err);
        process.exit(1);
      });
  } else {
    const cohortArg = process.argv[2] || "dev";
    if (cohortArg === "held_out") {
      runCohortParallel({ cohortName: "held_out", startSeed: 10000, seedCount: 100 }).catch(console.error);
    } else {
      const countArg = parseInt(process.argv[3] || "50", 10);
      runCohortParallel({ cohortName: "dev", startSeed: 9000, seedCount: countArg }).catch(console.error);
    }
  }
}
