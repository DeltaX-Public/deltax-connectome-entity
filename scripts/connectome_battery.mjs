/**
 * Frozen Held-Out Connectome Evaluation Battery.
 * Evaluates real connectome closed-loop performance across 5 experimental conditions:
 *   1. CONTROL (Connectome without DeltaX)
 *   2. OBSERVE (Connectome with pure ephemeral DeltaX observation)
 *   3. EXECUTIVE (Connectome with full DeltaX governance)
 *   4. SHAM (Connectome with matched latency path without executive veto)
 *   5. SHUFFLED_CONNECTOME (Rewired synaptic connectome without biological topology)
 *
 * Runs on held-out evaluation seeds (200..299) generated after parameter freeze.
 * Computes effect sizes and 95% confidence intervals.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConnectomeClosedLoop } from "../src/connectome/closed_loop.mjs";
import { createExecutive } from "../src/deltax/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

if (!cmd) {
  console.error("DELTAX_LOCAL_RUNTIME_CMD is required for connectome battery; refusing silent stub fallback");
  process.exit(1);
}

// Parse CLI arguments: --seeds=5 | 25 | 100 | custom
const args = process.argv.slice(2);
const seedArg = args.find((a) => a.startsWith("--seeds="))?.split("=")[1] ?? "25";
const numSeeds = parseInt(seedArg, 10) || 25;
const baseSeed = parseInt(process.env.HELD_OUT_BASE_SEED || "200", 10);
const seeds = Array.from({ length: numSeeds }, (_, i) => baseSeed + i);

console.log(`\n=======================================================`);
console.log(`   DELTAX REAL CONNECTOME HELD-OUT EVALUATION BATTERY`);
console.log(`   Evaluating ${numSeeds} seeds (Range: ${seeds[0]}..${seeds[seeds.length - 1]})`);
console.log(`=======================================================\n`);

const sharedExecutive = createExecutive({ mode: "local_runtime", command: cmd });
const ping = await sharedExecutive.ping();
console.log("Provider connected:", ping.provenance);

const conditions = ["CONTROL", "OBSERVE", "EXECUTIVE", "SHAM", "SHUFFLED_CONNECTOME"];
const batteryResults = [];

for (const seed of seeds) {
  process.stdout.write(`Evaluating Seed ${seed} `);
  const seedRun = { seed, conditions: {} };

  for (const cond of conditions) {
    const loop = new ConnectomeClosedLoop({
      seed,
      condition: cond,
      steps: 12,
      command: cmd,
    });
    // Reuse shared executive to avoid spawning new process per step
    loop.executive = sharedExecutive;

    const res = await loop.run();
    seedRun.conditions[cond] = {
      reached_goal: res.reached_goal,
      final_energy: res.final_energy,
      hazard_encounters: res.hazard_encounters,
      contradiction_events: res.contradiction_events,
      repeated_action_loops: res.repeated_action_loops,
      veto_count: res.veto_count,
      modulation_count: res.modulation_count,
      intervention_rate: res.intervention_rate,
      latency_ms: res.latency_ms,
      actions: res.history.map((h) => h.chosen_action),
    };
    process.stdout.write(`[${cond.slice(0, 4)}: ${res.reached_goal ? "G" : "X"}] `);
  }
  console.log();
  batteryResults.push(seedRun);
}

await sharedExecutive.transport?.close?.();

// Compute Statistical Aggregates & Effect Sizes
function statsForCondition(condName) {
  const runs = batteryResults.map((r) => r.conditions[condName]);
  const goalCount = runs.filter((r) => r.reached_goal).length;
  const goalRate = +(goalCount / numSeeds).toFixed(3);
  const meanEnergy = +(runs.reduce((acc, r) => acc + r.final_energy, 0) / numSeeds).toFixed(2);
  const meanLatency = +(runs.reduce((acc, r) => acc + r.latency_ms, 0) / numSeeds).toFixed(1);
  const meanIntervention = +(runs.reduce((acc, r) => acc + r.intervention_rate, 0) / numSeeds).toFixed(3);

  // 95% Wilson Score Interval for Goal Rate
  const z = 1.96;
  const p = goalRate;
  const n = numSeeds;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const err = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  const ci95 = [Math.max(0, +(center - err).toFixed(3)), Math.min(1, +(center + err).toFixed(3))];

  return {
    condition: condName,
    sample_size: numSeeds,
    goal_completion_rate: goalRate,
    ci_95: ci95,
    mean_final_energy: meanEnergy,
    mean_intervention_rate: meanIntervention,
    mean_latency_ms: meanLatency,
  };
}

const summaryTable = {};
for (const cond of conditions) {
  summaryTable[cond] = statsForCondition(cond);
}

// Effect Size: EXECUTIVE vs CONTROL Goal Rate Difference & Energy Delta
const execRate = summaryTable.EXECUTIVE.goal_completion_rate;
const controlRate = summaryTable.CONTROL.goal_completion_rate;
const shuffledRate = summaryTable.SHUFFLED_CONNECTOME.goal_completion_rate;

const effectSizes = {
  goal_rate_lift_vs_control: +((execRate - controlRate) * 100).toFixed(1) + "%",
  goal_rate_lift_vs_shuffled: +((execRate - shuffledRate) * 100).toFixed(1) + "%",
  energy_difference_vs_control: +(summaryTable.EXECUTIVE.mean_final_energy - summaryTable.CONTROL.mean_final_energy).toFixed(2),
  observe_vs_control_parity: summaryTable.OBSERVE.goal_completion_rate === summaryTable.CONTROL.goal_completion_rate,
};

const bundle = {
  schema: "connectome.held_out_battery.v1",
  generated_at: new Date().toISOString(),
  evaluation_seeds: {
    total: numSeeds,
    range: `${seeds[0]}..${seeds[seeds.length - 1]}`,
    category: "HELD_OUT_EVALUATION (Separated from Development Seeds 100..124)",
  },
  runtime_provenance: ping.provenance,
  summary: summaryTable,
  effect_sizes: effectSizes,
  raw_runs: batteryResults,
};

const outDir = path.join(ROOT, "artifacts", "battery");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `held_out_connectome_battery_${Date.now()}.json`);
const latestPath = path.join(outDir, "latest-held-out-battery.json");
fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n");
fs.writeFileSync(latestPath, JSON.stringify(bundle, null, 2) + "\n");

console.log("\n=== HELD-OUT CONNECTOME BATTERY SUMMARY ===");
console.table(summaryTable);
console.log("\nEffect Sizes & Parity:", effectSizes);
console.log(`Saved artifacts to:\n  - ${outPath}\n  - ${latestPath}\n`);
