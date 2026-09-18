/**
 * Build a short Entity Observatory playback artifact.
 * Prefer live local_runtime when DELTAX_LOCAL_RUNTIME_CMD is set;
 * otherwise record an explicit stub decision labeled stub (never silent).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrokenWorld } from '../src/worlds/broken_world/world.mjs';
import { createExecutive } from '../src/deltax/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'artifacts', 'observatory', 'latest-playback.json');
const actions = ['forward', 'forward', 'forward', 'forward', 'forward', 'forward', 'forward', 'forward', 'forward', 'forward', 'forward', 'forward'];

const world = new BrokenWorld();
world.start();
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

pushFrame('start', { phase: 'expect_door_closed' });

const exec = process.env.DELTAX_LOCAL_RUNTIME_CMD
  ? createExecutive({ mode: 'local_runtime', command: process.env.DELTAX_LOCAL_RUNTIME_CMD })
  : null;
let decision = null;
let executive_source = exec ? 'local_runtime' : 'stub';

for (let i = 0; i < actions.length; i += 1) {
  const action = actions[i];
  const beforeDoor = world.arena.door.closed;
  world.applyAction(action);
  const afterDoor = world.arena.door.closed;
  const senses = world.observe();
  const telemetry = {
    spikes: 40 + i * 7,
    regions: {
      sensory: Math.round(55 + (senses.proximity?.nearest_distance ?? 0) * 8),
      descending: Math.round(30 + i * 4),
      recurrent: Math.round(45 + (afterDoor ? 0 : 20)),
    },
  };

  // After the door opens (external mutation), ask the executive once.
  if (beforeDoor && !afterDoor && !decision) {
    const candidates = [
      { substrate_candidate_id: 'c-forward', action_class: 'locomotion', activation_strength: 0.85, label: 'forward through passage' },
      { substrate_candidate_id: 'c-stop', action_class: 'halt', activation_strength: 0.35, label: 'stop at door' },
    ];
    const packet = {
      objective: 'reach_goal_region',
      environment_state_summary: {
        door_closed: afterDoor,
        hazard_ahead: senses.gradients?.hazard === true,
        corridor: senses.visual_field?.corridor,
      },
      substrate_state_summary: { proposal: 'forward', step: world.stepCount },
      candidate_actions: candidates,
      available_executive_actions: ['PERMIT', 'VETO', 'MODULATE', 'DEFER', 'ESCALATE'],
    };

    if (exec) {
      decision = await exec.decide(packet);
      executive_source = 'local_runtime';
    } else {
      decision = {
        disposition: 'PERMIT',
        permitted: [{ id: 'cand_0', substrate_candidate_id: 'c-forward' }],
        vetoed: [],
        unresolved: [{ id: 'cand_1', substrate_candidate_id: 'c-stop', reason: 'not_selected' }],
        modulation: {},
        executive_source: 'stub',
        provenance: { executive_source: 'stub', note: 'offline playback generator; set DELTAX_LOCAL_RUNTIME_CMD for live' },
        selected_disposition: 'PERMIT',
      };
      executive_source = 'stub';
    }

    pushFrame('executive_decision', {
      phase: 'door_opened',
      telemetry,
      substrate_proposal: 'forward',
      candidates,
      decision: {
        disposition: decision.disposition ?? decision.selected_disposition,
        executive_source: decision.executive_source ?? executive_source,
        permitted: decision.permitted,
        vetoed: decision.vetoed,
        unresolved: decision.unresolved,
        provenance: decision.provenance,
      },
    });
  } else {
    pushFrame(afterDoor ? 'move_door_closed' : 'move', {
      phase: afterDoor ? 'blocked_or_west' : 'east_corridor',
      telemetry,
      substrate_proposal: action,
    });
  }
}

if (exec) {
  await exec.transport?.close?.();
}


const artifact = {
  schema: 'entity.observatory.playback.v1',
  generated_at: new Date().toISOString(),
  objective: 'reach goal region after door opens',
  executive_source,
  arena: {
    width: world.arena.width,
    height: world.arena.height,
    obstacles: world.arena.obstacles,
    goalRegion: world.arena.goalRegion,
    hazard: world.hazard,
  },
  decision_summary: decision && {
    disposition: decision.disposition ?? decision.selected_disposition,
    executive_source: decision.executive_source ?? executive_source,
    permitted: decision.permitted,
    vetoed: decision.vetoed,
    provenance: decision.provenance,
  },
  frames,
  honesty: 'Playback from harness. Stub is labeled stub. local_runtime is labeled local_runtime, never canonical_api.',
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + '\n');
console.log(JSON.stringify({
  wrote: path.relative(ROOT, OUT),
  frames: frames.length,
  executive_source,
  disposition: artifact.decision_summary?.disposition,
  reached_goal: frames.at(-1)?.reached_goal,
}, null, 2));
