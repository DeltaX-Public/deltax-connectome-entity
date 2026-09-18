/**
 * Phase III Long-Horizon Held-Out Adaptation Battery
 *
 * Evaluates the 6 matched conditions across frozen held-out seeds (3000..):
 *   1. CONTROL            (Intact biological connectome)
 *   2. OBSERVE            (Ephemeral DeltaX evaluation, 100% parity check)
 *   3. STATIC_GUARD       (Rule-based safety filter)
 *   4. EXECUTIVE          (DeltaX closed loop with retained memory in recurrence)
 *   5. EXECUTIVE_MEMORY_RESET (DeltaX closed loop with memory reset in recurrence)
 *   6. SHUFFLED_CONNECTOME (Scrambled topology negative control)
 *
 * Output: artifacts/changed_world/phase3-held-out-battery.json
 */

import { ChangedWorldHarness, PHASE3_CONDITIONS } from "../src/experiments/changed_world/index.mjs";
import { createExecutive } from "../src/deltax/index.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

// ── Statistics Helpers ────────────────────────────────────────────────────────
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
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
  const stdErr = Math.sqrt(variance / arr.length);
  return { mean: +mean.toFixed(2), stdErr: +stdErr.toFixed(2), n: arr.length };
}

// ── Battery Runner ────────────────────────────────────────────────────────────
export async function runPhase3Battery({
  startSeed = 3000,
  seedCount = 25,
  maxStepsPerTrial = 25,
  changeAtStep = 5,
} = {}) {
  if (!cmd) {
    throw new Error("DELTAX_LOCAL_RUNTIME_CMD is required for Phase III battery; refusing silent fallback");
  }

  const seeds = Array.from({ length: seedCount }, (_, i) => startSeed + i);
  const startTime = Date.now();

  console.log("\n=======================================================");
  console.log("   PHASE III HELD-OUT LONG-HORIZON ADAPTATION BATTERY");
  console.log(`   Cohort: ${seedCount} seeds (${seeds[0]}..${seeds[seeds.length - 1]})`);
  console.log(`   Conditions: ${PHASE3_CONDITIONS.join(", ")}`);
  console.log("=======================================================\n");

  const sharedExec = createExecutive({ mode: "local_runtime", command: cmd });
  const ping = await sharedExec.ping();
  console.log("DeltaX Provider Connected:", ping.provenance);

  const results = [];

  for (let idx = 0; idx < seeds.length; idx++) {
    const seed = seeds[idx];
    process.stdout.write(`[${idx + 1}/${seeds.length}] Seed ${seed}: `);
    const row = { seed, conditions: {} };

    // 1. CONTROL
    const ctrl = new ChangedWorldHarness({ seed, condition: "CONTROL", maxStepsPerTrial, changeAtStep });
    row.conditions.CONTROL = await ctrl.runEpisode();
    await ctrl.close();
    process.stdout.write("CTRL ");

    // 2. OBSERVE
    const obs = new ChangedWorldHarness({ seed, condition: "OBSERVE", command: cmd, executive: sharedExec, maxStepsPerTrial, changeAtStep });
    row.conditions.OBSERVE = await obs.runEpisode();
    process.stdout.write("OBS ");

    // 3. STATIC_GUARD
    const guard = new ChangedWorldHarness({ seed, condition: "STATIC_GUARD", maxStepsPerTrial, changeAtStep });
    row.conditions.STATIC_GUARD = await guard.runEpisode();
    await guard.close();
    process.stdout.write("GUARD ");

    // 4. EXECUTIVE (Retained memory in recurrence)
    const execRet = new ChangedWorldHarness({ seed, condition: "EXECUTIVE", command: cmd, executive: sharedExec, maxStepsPerTrial, changeAtStep });
    row.conditions.EXECUTIVE = await execRet.runEpisode({ resetExecutiveMemoryOnRecurrence: false });
    process.stdout.write("EXEC_RET ");

    // 5. EXECUTIVE_MEMORY_RESET (Memory cleared on recurrence)
    const execRst = new ChangedWorldHarness({ seed, condition: "EXECUTIVE_MEMORY_RESET", command: cmd, executive: sharedExec, maxStepsPerTrial, changeAtStep });
    row.conditions.EXECUTIVE_MEMORY_RESET = await execRst.runEpisode({ resetExecutiveMemoryOnRecurrence: true });
    process.stdout.write("EXEC_RST ");

    // 6. SHUFFLED_CONNECTOME
    const shuf = new ChangedWorldHarness({ seed, condition: "SHUFFLED_CONNECTOME", maxStepsPerTrial, changeAtStep });
    row.conditions.SHUFFLED_CONNECTOME = await shuf.runEpisode();
    await shuf.close();
    process.stdout.write("SHUF\n");

    results.push(row);
  }

  if (sharedExec.transport?.close) {
    await sharedExec.transport.close();
  }

  // ── Aggregation & Verification ──────────────────────────────────────────────
  const n = results.length;
  let controlObserveMatches = 0;

  // Trackers per condition
  const stats = {};
  for (const cond of PHASE3_CONDITIONS) {
    stats[cond] = {
      t1Goals: 0,
      t2Goals: 0,
      bothGoals: 0,
      t1Steps: [],
      t2Steps: [],
      t1Collisions: [],
      t2Collisions: [],
      t1Hazards: [],
      t2Hazards: [],
      t1Energy: [],
      t2Energy: [],
    };
  }

  for (const row of results) {
    // Parity check
    const ctrl = row.conditions.CONTROL;
    const obs = row.conditions.OBSERVE;
    if (ctrl && obs) {
      const cActions = ctrl.trial1.history.map((h) => h.chosenAction);
      const oActions = obs.trial1.history.map((h) => h.chosenAction);
      if (JSON.stringify(cActions) === JSON.stringify(oActions)) {
        controlObserveMatches++;
      }
    }

    for (const cond of PHASE3_CONDITIONS) {
      const res = row.conditions[cond];
      if (!res) continue;
      const s = stats[cond];
      if (res.trial1.reachedGoal) s.t1Goals++;
      if (res.trial2.reachedGoal) s.t2Goals++;
      if (res.bothReachedGoal) s.bothGoals++;

      s.t1Steps.push(res.trial1.stepsExecuted);
      s.t2Steps.push(res.trial2.stepsExecuted);
      s.t1Collisions.push(res.trial1.collisionCount);
      s.t2Collisions.push(res.trial2.collisionCount);
      s.t1Hazards.push(res.trial1.hazardCount);
      s.t2Hazards.push(res.trial2.hazardCount);
      s.t1Energy.push(res.trial1.finalEnergy);
      s.t2Energy.push(res.trial2.finalEnergy);
    }
  }

  const controlObserveParityRate = +(controlObserveMatches / n).toFixed(4);

  // Summarize per condition
  const summaryPerCondition = {};
  for (const cond of PHASE3_CONDITIONS) {
    const s = stats[cond];
    summaryPerCondition[cond] = {
      trial1_goal_rate: {
        count: s.t1Goals,
        rate: +(s.t1Goals / n).toFixed(4),
        wilson_ci_95: wilsonCI(s.t1Goals, n),
      },
      trial2_goal_rate: {
        count: s.t2Goals,
        rate: +(s.t2Goals / n).toFixed(4),
        wilson_ci_95: wilsonCI(s.t2Goals, n),
      },
      both_trials_goal_rate: {
        count: s.bothGoals,
        rate: +(s.bothGoals / n).toFixed(4),
        wilson_ci_95: wilsonCI(s.bothGoals, n),
      },
      trial1_steps: meanAndStdErr(s.t1Steps),
      trial2_steps: meanAndStdErr(s.t2Steps),
      trial1_collisions: meanAndStdErr(s.t1Collisions),
      trial2_collisions: meanAndStdErr(s.t2Collisions),
      trial1_hazards: meanAndStdErr(s.t1Hazards),
      trial2_hazards: meanAndStdErr(s.t2Hazards),
      trial1_final_energy: meanAndStdErr(s.t1Energy),
      trial2_final_energy: meanAndStdErr(s.t2Energy),
    };
  }

  // Memory differential (EXECUTIVE vs EXECUTIVE_MEMORY_RESET in Trial 2)
  const retHaz = summaryPerCondition.EXECUTIVE.trial2_hazards.mean;
  const rstHaz = summaryPerCondition.EXECUTIVE_MEMORY_RESET.trial2_hazards.mean;
  const hazardReduction = +(rstHaz - retHaz).toFixed(2);

  const retEnergy = summaryPerCondition.EXECUTIVE.trial2_final_energy.mean;
  const rstEnergy = summaryPerCondition.EXECUTIVE_MEMORY_RESET.trial2_final_energy.mean;
  const energyPreserved = +(retEnergy - rstEnergy).toFixed(2);

  const summary = {
    schema: "deltax-phase3-held-out-battery-v1",
    generated_at: new Date().toISOString(),
    seed_cohort: { startSeed, seedCount: n, seeds },
    runtime_seconds: +((Date.now() - startTime) / 1000).toFixed(2),
    control_observe_action_parity_rate: controlObserveParityRate,
    memory_differential: {
      trial2_hazard_reduction: hazardReduction,
      trial2_energy_preserved: energyPreserved,
      retained_trial2_hazards_mean: retHaz,
      reset_trial2_hazards_mean: rstHaz,
      retained_trial2_energy_mean: retEnergy,
      reset_trial2_energy_mean: rstEnergy,
    },
    conditions: summaryPerCondition,
  };

  // Write artifacts
  const artifactDir = join(ROOT, "artifacts", "changed_world");
  mkdirSync(artifactDir, { recursive: true });
  const latestFile = join(artifactDir, "phase3-held-out-battery.json");
  const tsFile = join(artifactDir, `phase3_battery_${Date.now()}.json`);
  const payload = { summary, results };

  writeFileSync(latestFile, JSON.stringify(payload, null, 2) + "\n");
  writeFileSync(tsFile, JSON.stringify(payload, null, 2) + "\n");

  console.log("\n=======================================================");
  console.log("            PHASE III BATTERY SUMMARY");
  console.log("=======================================================");
  console.log(`Seeds Evaluated: ${n} (${seeds[0]}..${seeds[n - 1]})`);
  console.log(`CONTROL vs OBSERVE Action Parity: ${(controlObserveParityRate * 100).toFixed(1)}%`);
  console.log("\nCondition           | T1 Goal Rate (95% CI)     | T2 Goal Rate (95% CI)     | T2 Hazards | T2 Energy");
  console.log("--------------------+---------------------------+---------------------------+------------+----------");
  for (const cond of PHASE3_CONDITIONS) {
    const c = summaryPerCondition[cond];
    const t1 = `${(c.trial1_goal_rate.rate * 100).toFixed(0)}% [${(c.trial1_goal_rate.wilson_ci_95.lo * 100).toFixed(0)}-${(c.trial1_goal_rate.wilson_ci_95.hi * 100).toFixed(0)}%]`.padEnd(25);
    const t2 = `${(c.trial2_goal_rate.rate * 100).toFixed(0)}% [${(c.trial2_goal_rate.wilson_ci_95.lo * 100).toFixed(0)}-${(c.trial2_goal_rate.wilson_ci_95.hi * 100).toFixed(0)}%]`.padEnd(25);
    const haz = `${c.trial2_hazards.mean} ± ${c.trial2_hazards.stdErr}`.padEnd(10);
    const eng = `${c.trial2_final_energy.mean} ± ${c.trial2_final_energy.stdErr}`;
    console.log(`${cond.padEnd(19)} | ${t1} | ${t2} | ${haz} | ${eng}`);
  }
  console.log("------------------------------------------------------------------------------------------------");
  console.log(`Memory Advantage: Hazard Reduction = ${hazardReduction} cells, Energy Conserved = +${energyPreserved} units`);
  console.log(`Artifact written to: ${latestFile}\n`);

  return summary;
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith("phase3_battery.mjs")) {
  const isDev = process.argv.includes("--dev");
  const countArg = process.argv.find((a) => a.startsWith("--count="));
  const count = countArg ? parseInt(countArg.split("=")[1], 10) : 25;
  const start = isDev ? 2000 : 3000;

  runPhase3Battery({ startSeed: start, seedCount: count }).catch((err) => {
    console.error("Battery run failed:", err);
    process.exit(1);
  });
}
