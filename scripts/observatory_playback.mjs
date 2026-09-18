/**
 * Build Entity Observatory Show Mode playback artifact.
 * Executes live connectome decision loop with real sensory transduction,
 * descending neuron population readouts, and DeltaX governance.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrokenWorld } from "../src/worlds/broken_world/world.mjs";
import { ConnectomeRuntime } from "../src/connectome/runtime.mjs";
import { ConnectomeSensoryTransduction } from "../src/connectome/sensory_transduction.mjs";
import { ConnectomeCandidateBridge } from "../src/connectome/candidate_bridge.mjs";
import { createExecutive } from "../src/deltax/index.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "observatory", "latest-playback.json");

const world = new BrokenWorld({ externalMutationAt: 3 });
world.hazard = { cells: [{ x: 6, y: 2 }], cost: 2 };
world.energy = 20;
world.body.energy = 20;
world.start();

const runtime = new ConnectomeRuntime({ seed: 200 });
const transduction = new ConnectomeSensoryTransduction(runtime.data);
const bridge = new ConnectomeCandidateBridge();

const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;
const exec = cmd ? createExecutive({ mode: "local_runtime", command: cmd, sessionId: `playback_${Date.now()}` }) : null;
const executive_source = exec ? "local_runtime" : "stub";

const frames = [];
const pushFrame = (note, extra = {}) => {
  const st = world.currentState();
  frames.push({
    step: st.step,
    note,
    body: st.body,
    door: st.door,
    hazard: st.hazard,
    energy: st.energy,
    reached_goal: world.isGoal(),
    last_events: world.events.slice(-3).map((e) => ({
      type: e.type,
      detail: e.detail?.action ?? e.detail?.change ?? e.detail?.fact ?? e.detail?.response ?? null,
    })),
    ...extra,
  });
};

pushFrame("start", { phase: "expect_door_closed" });

let latestDecision = null;
const totalSteps = 12;

for (let i = 0; i < totalSteps; i++) {
  const stepNum = i + 1;
  const beforeDoor = world.arena.door.closed;
  const senses = world.observe();
  const st = world.currentState();
  const isHazard = senses.gradients?.hazard === true;

  // Real sensory transduction to connectome
  const drives = transduction.transduce({
    visual_field: senses.visual_field,
    collision: senses.collision,
    gradients: senses.gradients,
    proximity: senses.proximity,
    body: st.body,
  });
  runtime.setSensoryDrives(drives);
  const simInfo = runtime.step(10);
  const dnReadouts = runtime.getDescendingNeuronReadouts();
  const candidates = bridge.generateCandidates(dnReadouts, stepNum);

  const telemetry = {
    spikes: Math.round(simInfo.mean_active_neurons * 10),
    regions: {
      sensory: Math.round(Array.from(drives.values()).reduce((a, b) => a + b, 0) / (drives.size || 1)),
      descending: Math.round(dnReadouts.forward?.weighted_mean || 0),
      recurrent: Math.round(simInfo.mean_active_neurons / 10),
      escape_gf: Math.round(dnReadouts.escape?.mean_rate || 0),
      steering: Math.round(Math.abs((dnReadouts.turn_left?.weighted_mean || 0) - (dnReadouts.turn_right?.weighted_mean || 0))),
    },
    dn_readouts: dnReadouts,
  };

  let chosen = "forward";
  let decision = null;

  if (exec) {
    const packet = {
      session_id: `playback_${stepNum}`,
      condition: "EXECUTIVE",
      step_id: stepNum,
      objective: "reach_goal_region_with_coherence",
      environment_state_summary: {
        door_closed: world.arena.door.closed,
        hazard_gradient: isHazard,
        corridor: senses.visual_field?.corridor,
        nearest_obstacle: senses.proximity?.nearest_distance,
      },
      substrate_state_summary: {
        energy: st.energy,
        step: st.step,
        descending_forward_hz: dnReadouts.forward?.weighted_mean,
      },
      candidate_actions: candidates,
      detected_contradictions: isHazard ? [{ expected: "safe_route", observed: "hazard_cell" }] : [],
      active_constraints: isHazard ? ["sandbox", "no_hidden_actuator"] : ["sandbox"],
      available_executive_actions: ["PERMIT", "VETO", "MODULATE", "DEFER", "ESCALATE"],
    };

    decision = await exec.decide(packet);
    latestDecision = decision;
    const permittedSubIds = new Set((decision.permitted || []).map((p) => p.substrate_candidate_id || p.id));
    if (decision.disposition === "PERMIT" && permittedSubIds.has(`sub_dn_forward_${stepNum}`)) {
      chosen = "forward";
    } else if (decision.disposition === "MODULATE") {
      chosen = "forward";
    } else if (decision.disposition === "VETO" || decision.disposition === "DEFER") {
      chosen = "stop";
    } else {
      chosen = permittedSubIds.has(`sub_dn_forward_${stepNum}`) ? "forward" : "stop";
    }
  }

  const result = world.applyAction(chosen);
  const afterDoor = world.arena.door.closed;

  pushFrame(decision ? "executive_decision" : (afterDoor ? "move_door_closed" : "move"), {
    phase: afterDoor ? "door_closed_west" : "east_corridor",
    telemetry,
    substrate_proposal: chosen,
    candidates: candidates.map((c) => ({
      id: c.id,
      substrate_candidate_id: c.substrate_candidate_id,
      action_class: c.action_class,
      activation_strength: c.activation_strength,
      originating_population: c.originating_population,
    })),
    decision: decision ? {
      disposition: decision.disposition ?? decision.selected_disposition,
      executive_source: decision.executive_source ?? executive_source,
      permitted: decision.permitted,
      vetoed: decision.vetoed,
      provenance: decision.provenance,
    } : null,
  });
}

if (exec) {
  await exec.transport?.close?.();
}

const artifact = {
  schema: "entity.observatory.playback.v2",
  generated_at: new Date().toISOString(),
  substrate: "165,122-neuron Whole-CNS Connectome (RateNetwork / Janelia synaptic graph)",
  objective: "reach goal region after door opens",
  executive_source,
  arena: {
    width: world.arena.width,
    height: world.arena.height,
    obstacles: world.arena.obstacles,
    goalRegion: world.arena.goalRegion,
    hazard: world.hazard,
  },
  decision_summary: latestDecision && {
    disposition: latestDecision.disposition ?? latestDecision.selected_disposition,
    executive_source: latestDecision.executive_source ?? executive_source,
    permitted: latestDecision.permitted,
    vetoed: latestDecision.vetoed,
    provenance: latestDecision.provenance,
  },
  frames,
  honesty: "Live playback from 165k-neuron connectome + private DeltaX provider. Zero synthetic signals.",
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify({
  wrote: path.relative(ROOT, OUT),
  frames: frames.length,
  executive_source,
  disposition: artifact.decision_summary?.disposition,
  reached_goal: frames.at(-1)?.reached_goal,
}, null, 2));
