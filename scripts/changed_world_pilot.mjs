/**
 * Changed World Pilot Battery (5 Development Seeds).
 * Validates task mechanics, sensory inputs, connectome dynamics, and telemetry before freeze.
 *
 * Seeds: 101, 102, 103, 104, 105.
 * Conditions: CONTROL, OBSERVE, STATIC_GUARD, EXECUTIVE (Retained vs Reset Memory).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChangedWorldHarness } from "../src/experiments/changed_world/harness.mjs";
import { createExecutive } from "../src/deltax/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

if (!cmd) {
  console.error("DELTAX_LOCAL_RUNTIME_CMD is required; refusing silent stub fallback");
  process.exit(1);
}

const pilotSeeds = [101, 102, 103, 104, 105];
console.log("\n=======================================================");
console.log("   THE WORLD CHANGED — 5-SEED DEVELOPMENT PILOT");
console.log(`   Development Seeds: ${pilotSeeds.join(", ")}`);
console.log("=======================================================\n");

const sharedExec = createExecutive({ mode: "local_runtime", command: cmd });
const ping = await sharedExec.ping();
console.log("Provider Connected:", ping.provenance);

const pilotRuns = [];

for (const seed of pilotSeeds) {
  process.stdout.write(`Pilot Seed ${seed}: `);
  const seedResult = { seed, conditions: {} };

  // 1. CONTROL
  const controlHarness = new ChangedWorldHarness({ seed, condition: "CONTROL", maxStepsPerTrial: 14 });
  seedResult.conditions.CONTROL = await controlHarness.runEpisode();
  process.stdout.write("[CONTROL] ");

  // 2. OBSERVE
  const observeHarness = new ChangedWorldHarness({ seed, condition: "OBSERVE", command: cmd, executive: sharedExec, maxStepsPerTrial: 14 });
  seedResult.conditions.OBSERVE = await observeHarness.runEpisode();
  process.stdout.write("[OBSERVE] ");

  // 3. STATIC_GUARD
  const guardHarness = new ChangedWorldHarness({ seed, condition: "STATIC_GUARD", maxStepsPerTrial: 14 });
  seedResult.conditions.STATIC_GUARD = await guardHarness.runEpisode();
  process.stdout.write("[GUARD] ");

  // 4. EXECUTIVE (Retained Memory across Recurrence)
  const execRetainedHarness = new ChangedWorldHarness({ seed, condition: "EXECUTIVE", command: cmd, executive: sharedExec, maxStepsPerTrial: 14 });
  seedResult.conditions.EXECUTIVE_RETAINED = await execRetainedHarness.runEpisode({ resetExecutiveMemoryOnRecurrence: false });
  process.stdout.write("[EXEC_RET] ");

  // 5. EXECUTIVE (Reset Memory on Recurrence)
  const execResetHarness = new ChangedWorldHarness({ seed, condition: "EXECUTIVE", command: cmd, executive: sharedExec, maxStepsPerTrial: 14 });
  seedResult.conditions.EXECUTIVE_RESET = await execResetHarness.runEpisode({ resetExecutiveMemoryOnRecurrence: true });
  process.stdout.write("[EXEC_RST]\n");

  pilotRuns.push(seedResult);
}

await sharedExec.transport?.close?.();

// Compute Summary Metrics
const summary = {
  totalSeeds: pilotSeeds.length,
  seeds: pilotSeeds,
  control_vs_observe_match_rate: +(pilotRuns.filter((r) =>
    JSON.stringify(r.conditions.CONTROL.trial1.history.map((h) => h.chosenAction)) ===
    JSON.stringify(r.conditions.OBSERVE.trial1.history.map((h) => h.chosenAction))
  ).length / pilotSeeds.length).toFixed(3),
  trial1_goal_rates: {
    CONTROL: +(pilotRuns.filter((r) => r.conditions.CONTROL.trial1.reachedGoal).length / pilotSeeds.length).toFixed(2),
    STATIC_GUARD: +(pilotRuns.filter((r) => r.conditions.STATIC_GUARD.trial1.reachedGoal).length / pilotSeeds.length).toFixed(2),
    EXECUTIVE_RETAINED: +(pilotRuns.filter((r) => r.conditions.EXECUTIVE_RETAINED.trial1.reachedGoal).length / pilotSeeds.length).toFixed(2),
  },
  trial2_recurrence_goal_rates: {
    CONTROL: +(pilotRuns.filter((r) => r.conditions.CONTROL.trial2.reachedGoal).length / pilotSeeds.length).toFixed(2),
    STATIC_GUARD: +(pilotRuns.filter((r) => r.conditions.STATIC_GUARD.trial2.reachedGoal).length / pilotSeeds.length).toFixed(2),
    EXECUTIVE_RETAINED: +(pilotRuns.filter((r) => r.conditions.EXECUTIVE_RETAINED.trial2.reachedGoal).length / pilotSeeds.length).toFixed(2),
    EXECUTIVE_RESET: +(pilotRuns.filter((r) => r.conditions.EXECUTIVE_RESET.trial2.reachedGoal).length / pilotSeeds.length).toFixed(2),
  },
  trial2_mean_collisions: {
    CONTROL: +(pilotRuns.reduce((acc, r) => acc + r.conditions.CONTROL.trial2.collisionCount, 0) / pilotSeeds.length).toFixed(1),
    STATIC_GUARD: +(pilotRuns.reduce((acc, r) => acc + r.conditions.STATIC_GUARD.trial2.collisionCount, 0) / pilotSeeds.length).toFixed(1),
    EXECUTIVE_RETAINED: +(pilotRuns.reduce((acc, r) => acc + r.conditions.EXECUTIVE_RETAINED.trial2.collisionCount, 0) / pilotSeeds.length).toFixed(1),
    EXECUTIVE_RESET: +(pilotRuns.reduce((acc, r) => acc + r.conditions.EXECUTIVE_RESET.trial2.collisionCount, 0) / pilotSeeds.length).toFixed(1),
  },
};

const artifact = {
  schema: "changed_world.pilot.v1",
  generated_at: new Date().toISOString(),
  environment: "ChangedWorld (11x7 corridor arena)",
  substrate: "Drosophila whole-brain connectome (N=165,122) rate-coded dynamics",
  runtime_provenance: ping.provenance,
  summary,
  pilot_runs: pilotRuns,
};

const outDir = path.join(ROOT, "artifacts", "changed_world");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "pilot_results.json");
fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2) + "\n");

console.log("\n=== PILOT SUMMARY ===");
console.log(JSON.stringify(summary, null, 2));
console.log(`\nPilot artifact written to: ${outPath}\n`);
