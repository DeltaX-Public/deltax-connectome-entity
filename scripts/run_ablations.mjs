/**
 * DeltaX Component Ablation Battery.
 * Systematically isolates and quantifies each executive component:
 *   1. No DeltaX (CONTROL - Pure substrate)
 *   2. OBSERVE only (DeltaX evaluates, zero intervention)
 *   3. Lambda Gate Only (Static rule filter, no coherence/contradiction fields)
 *   4. No Contradiction Handling (Executive runs without Phi/kappa field)
 *   5. Reset Memory on Recurrence (Executive memory cleared between trials)
 *   6. True Shuffled Connectome (Executive paired with scrambled circuit)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConnectomeClosedLoop } from "../src/connectome/closed_loop.mjs";
import { ChangedWorldHarness } from "../src/experiments/changed_world/harness.mjs";
import { createExecutive } from "../src/deltax/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

if (!cmd) {
  console.error("DELTAX_LOCAL_RUNTIME_CMD required for ablations");
  process.exit(1);
}

const args = process.argv.slice(2);
const seedArg = args.find((a) => a.startsWith("--seeds="))?.split("=")[1] ?? "15";
const numSeeds = parseInt(seedArg, 10) || 15;
const baseSeed = parseInt(process.env.HELD_OUT_BASE_SEED || "1000", 10);
const seeds = Array.from({ length: numSeeds }, (_, i) => baseSeed + i);

console.log(`\n==================================================================`);
console.log(`   DELTAX COMPONENT ABLATION BATTERY`);
console.log(`   Seeds: ${numSeeds} (${seeds[0]}..${seeds[seeds.length - 1]})`);
console.log(`==================================================================\n`);

const sharedExecutive = createExecutive({ mode: "local_runtime", command: cmd });
await sharedExecutive.ping();

const ablationResults = {
  no_deltax_control: [],
  observe_only: [],
  lambda_gate_only: [],
  no_contradiction_handling: [],
  reset_memory_recurrence: [],
  true_shuffled_connectome: [],
};

for (const seed of seeds) {
  process.stdout.write(`Ablations Seed ${seed} `);

  // 1. No DeltaX (CONTROL)
  const loopCtrl = new ConnectomeClosedLoop({ seed, condition: "CONTROL", steps: 12 });
  const resCtrl = await loopCtrl.run();
  ablationResults.no_deltax_control.push({ seed, reached_goal: resCtrl.reached_goal, energy: resCtrl.final_energy, latency: resCtrl.latency_ms });
  process.stdout.write(`[CTRL: ${resCtrl.reached_goal ? "G" : "X"}] `);

  // 2. OBSERVE only
  const loopObs = new ConnectomeClosedLoop({ seed, condition: "OBSERVE", steps: 12, command: cmd });
  loopObs.executive = sharedExecutive;
  const resObs = await loopObs.run();
  ablationResults.observe_only.push({ seed, reached_goal: resObs.reached_goal, energy: resObs.final_energy, latency: resObs.latency_ms });
  process.stdout.write(`[OBS: ${resObs.reached_goal ? "G" : "X"}] `);

  // 3. True Shuffled Connectome
  const loopShuff = new ConnectomeClosedLoop({ seed, condition: "SHUFFLED_CONNECTOME", steps: 12, command: cmd });
  loopShuff.executive = sharedExecutive;
  const resShuff = await loopShuff.run();
  ablationResults.true_shuffled_connectome.push({ seed, reached_goal: resShuff.reached_goal, energy: resShuff.final_energy, latency: resShuff.latency_ms });
  process.stdout.write(`[SHUFF: ${resShuff.reached_goal ? "G" : "X"}] `);

  // 4. Lambda Gate Only (STATIC_GUARD in ChangedWorld)
  const harnessGuard = new ChangedWorldHarness({ seed, condition: "STATIC_GUARD", maxStepsPerTrial: 12 });
  const resGuard = await harnessGuard.runEpisode();
  const guardGoal = resGuard.trial1?.reachedGoal ?? false;
  ablationResults.lambda_gate_only.push({ seed, reached_goal: guardGoal, energy: resGuard.trial1.energy, interventions: resGuard.trial1.history.filter(h => h.staticGuardIntervened).length });
  process.stdout.write(`[LAMBDA: ${guardGoal ? "G" : "X"}] `);

  // 5. Executive with Recurrence (retained memory)
  const harnessExec = new ChangedWorldHarness({ seed, condition: "EXECUTIVE", command: cmd, maxStepsPerTrial: 12 });
  const resExec = await harnessExec.runEpisode({ resetExecutiveMemoryOnRecurrence: false });
  await harnessExec.close();

  // 6. Reset memory on recurrence
  const harnessReset = new ChangedWorldHarness({ seed, condition: "EXECUTIVE", command: cmd, maxStepsPerTrial: 12 });
  const resReset = await harnessReset.runEpisode({ resetExecutiveMemoryOnRecurrence: true });
  await harnessReset.close();
  const resetGoal = resReset.trial2?.reachedGoal ?? false;
  const retainedGoal = resExec.trial2?.reachedGoal ?? false;
  ablationResults.reset_memory_recurrence.push({ seed, reached_goal: resetGoal, retained_goal: retainedGoal });
  process.stdout.write(`[MEM_RESET: ${resetGoal ? "G" : "X"}] `);

  // 7. No contradiction handling (DeltaX without Phi field)
  const loopNoPhi = new ConnectomeClosedLoop({ seed, condition: "EXECUTIVE", steps: 12, command: cmd, ablateContradictions: true });
  loopNoPhi.executive = sharedExecutive;
  const resNoPhi = await loopNoPhi.run();
  ablationResults.no_contradiction_handling.push({ seed, reached_goal: resNoPhi.reached_goal, energy: resNoPhi.final_energy });
  process.stdout.write(`[NO_PHI: ${resNoPhi.reached_goal ? "G" : "X"}]\n`);
}

await sharedExecutive.transport?.close?.();

// Compute ablation summary
function summarize(arr, goalKey = "reached_goal") {
  const goalRate = +(arr.filter(r => r[goalKey]).length / arr.length).toFixed(3);
  return { samples: arr.length, goal_rate: goalRate };
}

const ablationSummary = {
  no_deltax_control: summarize(ablationResults.no_deltax_control),
  observe_only: summarize(ablationResults.observe_only),
  true_shuffled_connectome: summarize(ablationResults.true_shuffled_connectome),
  lambda_gate_only: summarize(ablationResults.lambda_gate_only),
  reset_memory_recurrence: summarize(ablationResults.reset_memory_recurrence),
  no_contradiction_handling: summarize(ablationResults.no_contradiction_handling),
};

const bundle = {
  schema: "connectome.ablations.v1",
  generated_at: new Date().toISOString(),
  seeds: { total: numSeeds, range: `${seeds[0]}..${seeds[seeds.length - 1]}` },
  summary: ablationSummary,
  raw: ablationResults,
};

const outDir = path.join(ROOT, "artifacts", "ablations");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `component_ablations_${Date.now()}.json`);
const latestPath = path.join(outDir, "latest-component-ablations.json");
fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n");
fs.writeFileSync(latestPath, JSON.stringify(bundle, null, 2) + "\n");

console.log("\n=== COMPONENT ABLATION SUMMARY ===");
console.table(ablationSummary);
console.log(`Saved ablation artifact to: ${latestPath}\n`);
