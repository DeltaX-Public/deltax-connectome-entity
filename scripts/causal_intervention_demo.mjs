import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrokenWorld } from '../src/worlds/broken_world/world.mjs';
import { createNeurocontrol } from '../src/neurocontrol/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'artifacts', 'interventions');
const CHECKPOINTS = path.join(ROOT, 'artifacts', 'checkpoints');
const clone = (x) => JSON.parse(JSON.stringify(x));
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
const seed = Number(process.env.SEED ?? 8);
const phaseA_steps = Number(process.env.PHASE_A_STEPS ?? 4);
const steps = Number(process.env.RUN_STEPS ?? 6);
const checkpoint_id = `causal-intervention-${seed}`;
const config = {
  model: 'implemented computational model; not a biological memory-trace claim',
  phase_a: { steps: phaseA_steps, reason: 'fixed checkpoint duration' },
  run_steps: steps, deterministic: true,
  perturbation: { type: 'silence_population', population: 'causal_demo_population' }
};

function substrateProposal(step, intervened) {
  return {
    step, actor: 'SUBSTRATE', authority: 'SUBSTRATE_PROPOSAL',
    proposal: intervened ? 'forward_after_population_silence' : 'forward',
    isolation_metric: { substrate_proposals_before_deltax: 1, deltaX_bypassed: false,
      ordering: 'substrate proposal recorded before DeltaX packet' }
  };
}

function execute(nc, mode, intervened = false) {
  const stepsOut = [];
  for (let step = 0; step < steps; step += 1) {
    const substrate_proposals_before_deltax = [substrateProposal(step, intervened)];
    const executive = nc.run(mode, { step, seed, source: 'causal_intervention_demo' });
    stepsOut.push({ step, substrate_proposals_before_deltax,
      deltax: { actor: 'DeltaX', authority: 'DeltaX', bypass: false, packets: clone(executive.packets) },
      replay_record: clone(executive) });
  }
  return { mode, actor: 'EXPERIMENTER', authority: 'EXPERIMENTER_RUN', steps: stepsOut };
}

function packetDiff(control, other) {
  const differences = [];
  for (let i = 0; i < Math.max(control.steps.length, other.steps.length); i += 1) {
    const left = control.steps[i]?.deltax?.packets;
    const right = other.steps[i]?.deltax?.packets;
    if (JSON.stringify(left) !== JSON.stringify(right)) differences.push({ step: i, control: left, other: right });
  }
  return differences;
}

// Fixed-duration Broken World checkpoint; this is not an adaptation claim.
const world = new BrokenWorld();
const phaseA = world.run(Array.from({ length: phaseA_steps }, () => 'forward'));
const worldState = clone(world.currentState());
const worldEvents = clone(world.events);
const nc = createNeurocontrol({
  seeds: { seed }, objective: { task: 'causal intervention demo' }, checkpointDir: CHECKPOINTS
});
const neurocontrol_checkpoint = nc.checkpoint({ id: checkpoint_id });
const bundle = {
  schema: 'causal_intervention.bundle.v1', checkpoint_id,
  neurocontrol_checkpoint: clone(neurocontrol_checkpoint),
  ledger: clone(neurocontrol_checkpoint.event_ledger ?? []),
  seeds: { seed }, config, executive_source: 'stub',
  world: { phase_a: phaseA, state: worldState, events: worldEvents },
  disclaimer: 'Causal intervention on the implemented computational model; no biological memory trace is inferred.'
};
const bundlePath = path.join(OUT, `${checkpoint_id}.bundle.json`);
writeJson(bundlePath, bundle);

console.log('CHECKPOINT' + String.fromCodePoint(0x2192) + 'NORMAL');
const checkpointForRuns = clone(neurocontrol_checkpoint);
nc.restore(checkpointForRuns);
const normal = execute(nc, 'CONTROL', false);

nc.restore(checkpointForRuns);
const perturbation = { ...nc.perturb({ type: 'silence_population', population: 'causal_demo_population' }), actor: 'EXPERIMENTER', authority: 'EXPERIMENTER' };
const intervention = execute(nc, 'INTERVENTION', true);
const altered = packetDiff(normal, intervention);
console.log('CHECKPOINT → PERTURBATION → ALTERED');

nc.restore(checkpointForRuns);
const restored = execute(nc, 'CONTROL', false);
const recoveryDiff = packetDiff(normal, restored);
const recovery = recoveryDiff.length === 0 ? 'RECOVERED' : 'FAILED_RECOVERY';
console.log(`CHECKPOINT → RESTORED → ${recovery}`);

const differential = {
  schema: 'causal_intervention.differential.v1', checkpoint_id,
  executive_source: 'stub', seed, bundle: path.relative(ROOT, bundlePath),
  claims: { biological_memory_trace: false, implemented_model_causal_intervention: true },
  authority: {
    experimenter: 'perturbation declaration and run bookkeeping only',
    deltaX: 'executive packets; intervention does not bypass DeltaX',
    substrate: 'proposal before DeltaX each step'
  },
  perturbation: clone(perturbation), control_run: normal,
  intervention_run: intervention,
  differential: { altered: altered.length > 0, differences: altered },
  restored_run: restored, recovery: { status: recovery, differences: recoveryDiff },
  isolation_metric: {
    every_intervention_step_has_pre_deltax_proposal: intervention.steps.every((s) => s.substrate_proposals_before_deltax.length > 0),
    deltaX_bypass_count: intervention.steps.filter((s) => s.deltax.bypass).length
  },
  note: 'Stub replay is intentionally measurable; canonical_api replay requires recorded packets when the API is unavailable.'
};
const differentialPath = path.join(OUT, `${checkpoint_id}.differential.json`);
writeJson(differentialPath, differential);
console.log(JSON.stringify({ differential: path.relative(ROOT, differentialPath), altered: altered.length > 0, recovery }, null, 2));
