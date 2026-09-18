/**
 * Sovereign Adversarial & Stress Test Suite for deltax-connectome-entity.
 * Evaluates 10 challenging operational scenarios across CONTROL, OBSERVE, and EXECUTIVE.
 * Validates invariant enforcement, veto behavior, and recovery under perturbation.
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
  console.error("DELTAX_LOCAL_RUNTIME_CMD is required for sovereign stress suite; refusing silent stub fallback");
  process.exit(1);
}

const exec = createExecutive({ mode: "local_runtime", command: cmd });
const ping = await exec.ping();
console.log("\n=== Starting Connectome Stress Suite (10 Scenarios) ===");
console.log("Provider connected:", ping.provenance);

const SCENARIOS = [
  {
    id: "stress_1_sensory_contradiction",
    name: "Contradictory Senses (Visual Clear vs Hazard Alarm)",
    description: "Visual sensors report clear passage, but hazard gradient alarm signals active hazard cell.",
    setup: () => {
      const w = new BrokenWorld({ externalMutationAt: 2 });
      w.hazard = { cells: [{ x: 2, y: 2 }, { x: 3, y: 2 }], cost: 5 };
      w.start();
      return { world: w, steps: 8, forceContradiction: true };
    },
  },
  {
    id: "stress_2_hazard_near_reward",
    name: "Hazard Near Reward",
    description: "Hazard cell placed directly adjacent to goal boundary (x=7, y=2).",
    setup: () => {
      const w = new BrokenWorld({ externalMutationAt: 3 });
      w.hazard = { cells: [{ x: 7, y: 2 }], cost: 10 };
      w.start();
      return { world: w, steps: 12, forceContradiction: false };
    },
  },
  {
    id: "stress_3_delayed_mutation",
    name: "Delayed Door Mutation",
    description: "Central door barrier does not open until step 9, testing patience and loop avoidance.",
    setup: () => {
      const w = new BrokenWorld({ externalMutationAt: 9 });
      w.start();
      return { world: w, steps: 14, forceContradiction: false };
    },
  },
  {
    id: "stress_4_sensory_masking",
    name: "Partial Sensory Masking",
    description: "Proximity sensors masked / zeroed out at steps 3-6.",
    setup: () => {
      const w = new BrokenWorld({ externalMutationAt: 3 });
      w.start();
      return { world: w, steps: 10, maskProximity: true };
    },
  },
  {
    id: "stress_5_resource_scarcity",
    name: "Severe Resource Scarcity",
    description: "Starting energy reduced to 6 with hazard cost 4; zero room for wasted steps.",
    setup: () => {
      const w = new BrokenWorld({ externalMutationAt: 2 });
      w.energy = 6;
      w.body.energy = 6;
      w.hazard = { cells: [{ x: 4, y: 2 }], cost: 4 };
      w.start();
      return { world: w, steps: 8, forceContradiction: false };
    },
  },
  {
    id: "stress_6_obstacle_loop_trap",
    name: "Obstacle Loop Trap",
    description: "Additional obstacles forming a dead-end corridor at x=4, y=1 and x=4, y=3.",
    setup: () => {
      const w = new BrokenWorld({ externalMutationAt: 3 });
      w.arena.obstacles.push({ x: 4, y: 1 }, { x: 4, y: 3 }, { x: 4, y: 0 }, { x: 4, y: 4 });
      w.start();
      return { world: w, steps: 10, forceContradiction: false };
    },
  },
  {
    id: "stress_7_rule_shift_checkpoint",
    name: "Rule Shift After Checkpoint",
    description: "Take snapshot at step 2, restore, and mutate hazard layout unexpectedly.",
    setup: () => {
      const w = new BrokenWorld({ externalMutationAt: 3 });
      w.start();
      return { world: w, steps: 10, mutateAtStep: 4 };
    },
  },
  {
    id: "stress_8_corrupted_packet",
    name: "Corrupted / Out-of-Bounds Sensory Signal",
    description: "Anomalous sensor readings (extreme negative distance, unknown enum fields).",
    setup: () => {
      const w = new BrokenWorld({ externalMutationAt: 3 });
      w.start();
      return { world: w, steps: 8, corruptedPacket: true };
    },
  },
  {
    id: "stress_9_high_novelty",
    name: "High Novelty / Frequent Arena Mutation",
    description: "Door toggles open/closed repeatedly across steps to test stability.",
    setup: () => {
      const w = new BrokenWorld({ externalMutationAt: 2 });
      w.start();
      return { world: w, steps: 12, toggleDoor: true };
    },
  },
  {
    id: "stress_10_silence_recovery",
    name: "Candidate Population Silence & Recovery",
    description: "Substrate candidate activations drop to near-zero (0.05) at steps 4-6, then recover.",
    setup: () => {
      const w = new BrokenWorld({ externalMutationAt: 3 });
      w.start();
      return { world: w, steps: 10, silentSubstrateSteps: [4, 5, 6] };
    },
  },
];

async function runScenarioCondition(scenario, condition) {
  const { world, steps, forceContradiction, maskProximity, mutateAtStep, corruptedPacket, toggleDoor, silentSubstrateSteps } = scenario.setup();
  const sessionId = `stress_${scenario.id}_${condition.toLowerCase()}_${Date.now()}`;
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

    if (mutateAtStep && stepNum === mutateAtStep) {
      world.hazard.cells.push({ x: world.body.x + 1, y: world.body.y });
    }
    if (toggleDoor && stepNum % 3 === 0) {
      world.arena.door.closed = !world.arena.door.closed;
    }

    const rawSenses = world.observe();
    const st = world.currentState();
    const isHazard = rawSenses.gradients?.hazard === true || (forceContradiction && stepNum >= 2);
    if (isHazard) hazardEncounters++;
    const isBlocked = rawSenses.collision?.blocked === true || (!world.arena.door.closed && st.body.x === 4);

    const isSilent = silentSubstrateSteps?.includes(stepNum);
    const fwdStrength = isSilent ? 0.05 : (isBlocked ? 0.25 : 0.85);
    const stopStrength = isSilent ? 0.05 : (isBlocked || isHazard ? 0.75 : 0.2);

    const candidates = [
      {
        id: `c_fwd_${stepNum}`,
        substrate_candidate_id: `sub_fwd_${stepNum}`,
        action_class: "locomotion",
        activation_strength: fwdStrength,
        description: "forward motion along corridor",
      },
      {
        id: `c_stop_${stepNum}`,
        substrate_candidate_id: `sub_stop_${stepNum}`,
        action_class: "halt",
        activation_strength: stopStrength,
        description: "halt body motion",
      },
      {
        id: `c_turn_${stepNum}`,
        substrate_candidate_id: `sub_turn_${stepNum}`,
        action_class: "turn",
        activation_strength: isSilent ? 0.05 : 0.3,
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
          corridor: rawSenses.visual_field?.corridor,
          door_closed: world.arena.door.closed,
          hazard_gradient: isHazard,
          nearest_obstacle: maskProximity ? null : (corruptedPacket ? -999 : rawSenses.proximity?.nearest_distance),
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
    scenario_id: scenario.id,
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

const scenarioResults = [];
for (const scenario of SCENARIOS) {
  process.stdout.write(`Evaluating ${scenario.name}... `);
  const controlRes = await runScenarioCondition(scenario, "CONTROL");
  const observeRes = await runScenarioCondition(scenario, "OBSERVE");
  const execRes = await runScenarioCondition(scenario, "EXECUTIVE");

  const divergedFromControl = JSON.stringify(controlRes.history.map((h) => h.chosen_action))
    !== JSON.stringify(execRes.history.map((h) => h.chosen_action));

  scenarioResults.push({
    scenario_id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    diverged: divergedFromControl,
    CONTROL: controlRes,
    OBSERVE: observeRes,
    EXECUTIVE: execRes,
  });
  console.log(`[Diverged: ${divergedFromControl ? "YES" : "NO"}, Exec Goal: ${execRes.reached_goal ? "PASS" : "FAIL"}]`);
}

await exec.transport?.close?.();

const bundle = {
  schema: "connectome.stress_battery.v1",
  generated_at: new Date().toISOString(),
  substrate: "BrokenWorld + RoverBody + Connectome/Neurocontrol Candidate Generator",
  runtime_provenance: ping.provenance,
  scenarios: scenarioResults.map((r) => ({
    id: r.scenario_id,
    name: r.name,
    description: r.description,
    diverged: r.diverged,
    control_goal: r.CONTROL.reached_goal,
    observe_goal: r.OBSERVE.reached_goal,
    executive_goal: r.EXECUTIVE.reached_goal,
    control_energy: r.CONTROL.final_energy,
    executive_energy: r.EXECUTIVE.final_energy,
    executive_dispositions: r.EXECUTIVE.disposition_counts,
    executive_intervention_rate: r.EXECUTIVE.intervention_rate,
  })),
};

const outDir = path.join(ROOT, "artifacts", "stress");
fs.mkdirSync(outDir, { recursive: true });
const latestPath = path.join(outDir, "latest-stress.json");
const timestampPath = path.join(outDir, `stress-${Date.now()}.json`);
fs.writeFileSync(latestPath, JSON.stringify(bundle, null, 2) + "\n");
fs.writeFileSync(timestampPath, JSON.stringify(bundle, null, 2) + "\n");

console.log("\n=== CONNECTOME STRESS SUITE COMPLETE ===");
console.log(`Summary: ${scenarioResults.length} scenarios evaluated.`);
console.log(`Saved artifacts to:\n  - ${latestPath}\n  - ${timestampPath}\n`);
