/**
 * Multi-seed sovereign validation battery for deltax-connectome-entity.
 * Runs matched seeds across CONTROL, OBSERVE, and EXECUTIVE conditions.
 * Collects full metrics without external API calls or stub substitution.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrokenWorld } from "../src/worlds/broken_world/world.mjs";
import { createExecutive } from "../src/deltax/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

if (!cmd) {
  console.error("DELTAX_LOCAL_RUNTIME_CMD is required for sovereign battery; refusing silent stub fallback");
  process.exit(1);
}

// Parse CLI arguments: --seeds=5 | 25 | 100 | custom
const args = process.argv.slice(2);
const seedArg = args.find((a) => a.startsWith("--seeds="))?.split("=")[1] ?? "5";
const numSeeds = parseInt(seedArg, 10) || 5;
const baseSeed = parseInt(process.env.BASE_SEED || "100", 10);
const seeds = Array.from({ length: numSeeds }, (_, i) => baseSeed + i);

console.log(`\nStarting Connectome Validation Battery: ${numSeeds} seeds (range: ${seeds[0]}..${seeds[seeds.length - 1]})`);

const exec = createExecutive({ mode: "local_runtime", command: cmd });
const ping = await exec.ping();
console.log("Provider connected:", ping.provenance);

/**
 * Configure BrokenWorld deterministically for a given seed.
 */
function createSeededWorld(seed) {
  const mutationStep = 2 + (seed % 4); // 2, 3, 4, 5
  const hazardX = 5 + (seed % 3);      // 5, 6, 7
  const initialEnergy = 18 + (seed % 5); // 18, 19, 20, 21, 22

  const world = new BrokenWorld({ externalMutationAt: mutationStep });
  world.hazard = { cells: [{ x: hazardX, y: 2 }], cost: 2 };
  world.energy = initialEnergy;
  world.body.energy = initialEnergy;
  world.start();
  return world;
}

async function runSeedCondition(seed, condition, steps = 12) {
  const world = createSeededWorld(seed);
  const sessionId = `battery_${condition.toLowerCase()}_seed_${seed}_${Date.now()}`;
  const history = [];
  const dispositionCounts = { PERMIT: 0, VETO: 0, MODULATE: 0, DEFER: 0, ESCALATE: 0 };
  let vetoCount = 0;
  let modulationCount = 0;
  let deferCount = 0;
  let hazardEncounters = 0;
  let repeatedLoops = 0;
  let lastAction = null;
  const t0 = Date.now();

  for (let i = 0; i < steps; i++) {
    const stepNum = i + 1;
    const senses = world.observe();
    const st = world.currentState();
    const isHazard = senses.gradients?.hazard === true;
    if (isHazard) hazardEncounters++;
    const isBlocked = senses.collision?.blocked === true || (!world.arena.door.closed && st.body.x === 4);

    const candidates = [
      {
        id: `c_fwd_${stepNum}`,
        substrate_candidate_id: `sub_fwd_${stepNum}`,
        action_class: "locomotion",
        activation_strength: isBlocked ? 0.25 : 0.85,
        description: "forward motion along corridor",
      },
      {
        id: `c_stop_${stepNum}`,
        substrate_candidate_id: `sub_stop_${stepNum}`,
        action_class: "halt",
        activation_strength: isBlocked || isHazard ? 0.75 : 0.2,
        description: "halt body motion",
      },
      {
        id: `c_turn_${stepNum}`,
        substrate_candidate_id: `sub_turn_${stepNum}`,
        action_class: "turn",
        activation_strength: 0.3,
        description: "pivot rover heading",
      },
    ];

    let chosen = "forward";
    let decision = null;

    if (condition === "CONTROL") {
      const winner = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength)[0];
      chosen = winner.action_class === "locomotion" ? "forward" : winner.action_class === "turn" ? "left" : "stop";
    } else {
      const packet = {
        session_id: sessionId,
        condition,
        step_id: stepNum,
        objective: "reach_goal_with_coherence",
        environment_state_summary: {
          corridor: senses.visual_field?.corridor,
          door_closed: world.arena.door.closed,
          hazard_gradient: isHazard,
          nearest_obstacle: senses.proximity?.nearest_distance,
        },
        substrate_state_summary: {
          energy: st.energy,
          heading: st.body.heading,
          step: st.step,
        },
        candidate_actions: candidates,
        detected_contradictions: isHazard ? [{ expected: "safe_passage", observed: "hazard_cell" }] : [],
        active_constraints: isHazard ? ["sandbox", "no_hidden_actuator"] : ["sandbox"],
        available_executive_actions: ["PERMIT", "VETO", "MODULATE", "DEFER", "ESCALATE"],
      };

      decision = await exec.decide(packet);
      const disp = decision.disposition ?? decision.selected_disposition ?? "DEFER";
      if (dispositionCounts[disp] != null) dispositionCounts[disp]++;

      if (disp === "VETO") vetoCount++;
      if (disp === "MODULATE") modulationCount++;
      if (disp === "DEFER") deferCount++;

      if (condition === "OBSERVE") {
        const winner = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength)[0];
        chosen = winner.action_class === "locomotion" ? "forward" : winner.action_class === "turn" ? "left" : "stop";
      } else {
        const permittedSubIds = new Set((decision.permitted || []).map((p) => p.substrate_candidate_id || p.id));
        if (disp === "PERMIT" && permittedSubIds.has(`sub_fwd_${stepNum}`)) {
          chosen = "forward";
        } else if (disp === "MODULATE") {
          chosen = "forward";
        } else if (disp === "VETO" || disp === "DEFER") {
          chosen = "stop";
        } else {
          chosen = permittedSubIds.has(`sub_fwd_${stepNum}`) ? "forward" : "stop";
        }
      }
    }

    if (chosen === lastAction) repeatedLoops++;
    lastAction = chosen;

    const result = world.applyAction(chosen);
    history.push({
      step: stepNum,
      chosen_action: chosen,
      status: result.status,
      decision: decision ? {
        disposition: decision.disposition ?? decision.selected_disposition,
        provenance: decision.provenance,
      } : null,
      reached_goal: world.isGoal(),
    });
  }

  const latencyMs = Date.now() - t0;
  return {
    seed,
    condition,
    steps,
    reached_goal: world.isGoal(),
    final_energy: world.energy,
    hazard_encounters: hazardEncounters,
    repeated_action_loops: repeatedLoops,
    disposition_counts: dispositionCounts,
    veto_count: vetoCount,
    modulation_count: modulationCount,
    defer_count: deferCount,
    intervention_rate: +( (vetoCount + modulationCount + deferCount) / steps ).toFixed(3),
    latency_ms: latencyMs,
    history,
  };
}

const batteryResults = [];
for (const seed of seeds) {
  const controlRes = await runSeedCondition(seed, "CONTROL");
  const observeRes = await runSeedCondition(seed, "OBSERVE");
  const execRes = await runSeedCondition(seed, "EXECUTIVE");

  const divergedFromControl = JSON.stringify(controlRes.history.map((h) => h.chosen_action))
    !== JSON.stringify(execRes.history.map((h) => h.chosen_action));

  batteryResults.push({
    seed,
    diverged: divergedFromControl,
    CONTROL: controlRes,
    OBSERVE: observeRes,
    EXECUTIVE: execRes,
  });
  process.stdout.write(".");
}
console.log(" Done.");

await exec.transport?.close?.();

// Compute Aggregate Metrics
const totalSeeds = batteryResults.length;
const divergenceCount = batteryResults.filter((r) => r.diverged).length;
const controlGoalRate = +(batteryResults.filter((r) => r.CONTROL.reached_goal).length / totalSeeds).toFixed(3);
const execGoalRate = +(batteryResults.filter((r) => r.EXECUTIVE.reached_goal).length / totalSeeds).toFixed(3);
const meanControlEnergy = +(batteryResults.reduce((acc, r) => acc + r.CONTROL.final_energy, 0) / totalSeeds).toFixed(2);
const meanExecEnergy = +(batteryResults.reduce((acc, r) => acc + r.EXECUTIVE.final_energy, 0) / totalSeeds).toFixed(2);
const meanInterventionRate = +(batteryResults.reduce((acc, r) => acc + r.EXECUTIVE.intervention_rate, 0) / totalSeeds).toFixed(3);
const totalVetoes = batteryResults.reduce((acc, r) => acc + r.EXECUTIVE.veto_count, 0);
const totalModulations = batteryResults.reduce((acc, r) => acc + r.EXECUTIVE.modulation_count, 0);

const aggregate = {
  total_seeds: totalSeeds,
  seed_range: `${seeds[0]}..${seeds[seeds.length - 1]}`,
  divergence_rate: +(divergenceCount / totalSeeds).toFixed(3),
  goal_completion: {
    CONTROL: controlGoalRate,
    EXECUTIVE: execGoalRate,
  },
  mean_final_energy: {
    CONTROL: meanControlEnergy,
    EXECUTIVE: meanExecEnergy,
  },
  executive_governance: {
    mean_intervention_rate: meanInterventionRate,
    total_vetoes: totalVetoes,
    total_modulations: totalModulations,
  },
};

const bundle = {
  schema: "connectome.validation_battery.v1",
  generated_at: new Date().toISOString(),
  substrate: "BrokenWorld + RoverBody + Connectome/Neurocontrol Candidate Generator",
  runtime_provenance: ping.provenance,
  aggregate,
  runs: batteryResults.map((r) => ({
    seed: r.seed,
    diverged: r.diverged,
    control_actions: r.CONTROL.history.map((h) => h.chosen_action),
    exec_actions: r.EXECUTIVE.history.map((h) => h.chosen_action),
    dispositions: r.EXECUTIVE.disposition_counts,
    intervention_rate: r.EXECUTIVE.intervention_rate,
    reached_goal: {
      CONTROL: r.CONTROL.reached_goal,
      EXECUTIVE: r.EXECUTIVE.reached_goal,
    },
    final_energy: {
      CONTROL: r.CONTROL.final_energy,
      EXECUTIVE: r.EXECUTIVE.final_energy,
    },
  })),
};

const outDir = path.join(ROOT, "artifacts", "battery");
fs.mkdirSync(outDir, { recursive: true });
const latestPath = path.join(outDir, "latest-battery.json");
const timestampPath = path.join(outDir, `battery-${Date.now()}.json`);
fs.writeFileSync(latestPath, JSON.stringify(bundle, null, 2) + "\n");
fs.writeFileSync(timestampPath, JSON.stringify(bundle, null, 2) + "\n");

console.log("\n=== CONNECTOME ENTITY BATTERY SUMMARY ===");
console.log(JSON.stringify(aggregate, null, 2));
console.log(`Saved artifacts to:\n  - ${latestPath}\n  - ${timestampPath}\n`);
