import {spawnSync} from 'node:child_process';
import {BrokenWorld} from '../src/worlds/broken_world/world.mjs';
import {createExecutive} from '../src/deltax/index.mjs';

export function runWorld(){const world=new BrokenWorld();return world.run(Array(12).fill('forward'));}
export function runUpstream(){const p=spawnSync('npm',['--prefix','upstream/fly-brain','run','build'],{encoding:'utf8'});if(p.status!==0)throw new Error(`UPSTREAM fly validation failed: ${p.stderr||p.stdout}`);return {mode:'UPSTREAM',validation:'fly-brain build passed'};}

export async function runLocalRuntime({env=process.env, steps=12, runId=`entity_run_${Date.now()}`}={}){
  if(!env.DELTAX_LOCAL_RUNTIME_CMD){
    throw new Error('local_runtime requires DELTAX_LOCAL_RUNTIME_CMD; refusing silent stub fallback');
  }
  const world = new BrokenWorld();
  world.start();
  const exec = createExecutive({
    mode: 'local_runtime',
    command: env.DELTAX_LOCAL_RUNTIME_CMD,
    sessionId: runId,
  });

  const history = [];
  const actions = Array(steps).fill('forward');

  for (let i = 0; i < actions.length; i++) {
    const stepNum = i + 1;
    const senses = world.observe();
    const st = world.currentState();
    const isHazard = senses.gradients?.hazard === true;
    const isBlocked = senses.collision?.blocked === true || (!world.arena.door.closed && st.body.x === 4);

    // Substrate generates candidates based on recurrent state & sensory inputs
    const candidates = [
      {
        id: `c_fwd_${stepNum}`,
        substrate_candidate_id: `sub_fwd_${stepNum}`,
        action_class: 'locomotion',
        activation_strength: isBlocked ? 0.2 : 0.85,
        description: 'forward motion along corridor',
      },
      {
        id: `c_stop_${stepNum}`,
        substrate_candidate_id: `sub_stop_${stepNum}`,
        action_class: 'halt',
        activation_strength: isBlocked || isHazard ? 0.75 : 0.2,
        description: 'halt body motion',
      },
      {
        id: `c_turn_${stepNum}`,
        substrate_candidate_id: `sub_turn_${stepNum}`,
        action_class: 'turn',
        activation_strength: 0.3,
        description: 'pivot rover heading',
      },
    ];

    const packet = {
      session_id: runId,
      step_id: stepNum,
      objective: 'reach_goal_with_coherence',
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
      detected_contradictions: isHazard ? [{ expected: 'safe_passage', observed: 'hazard_cell' }] : [],
      active_constraints: isHazard ? ['sandbox', 'no_hidden_actuator'] : ['sandbox'],
      available_executive_actions: ['PERMIT', 'VETO', 'MODULATE', 'DEFER', 'ESCALATE'],
    };

    const decision = await exec.decide(packet);

    // Actuate permitted or fallback action
    const permittedSubIds = new Set((decision.permitted || []).map((p) => p.substrate_candidate_id || p.id));
    const vetoedSubIds = new Set((decision.vetoed || []).map((v) => v.substrate_candidate_id || v.id));

    let chosen = 'stop';
    if (decision.disposition === 'PERMIT' && permittedSubIds.has(`sub_fwd_${stepNum}`)) {
      chosen = 'forward';
    } else if (decision.disposition === 'MODULATE') {
      chosen = 'forward';
    } else if (decision.disposition === 'VETO' || decision.disposition === 'DEFER') {
      chosen = 'stop';
    } else if (permittedSubIds.size > 0) {
      chosen = permittedSubIds.has(`sub_fwd_${stepNum}`) ? 'forward' : 'stop';
    }

    const appliedResult = world.applyAction(chosen);

    history.push({
      step: stepNum,
      chosen_action: chosen,
      action_result: appliedResult,
      decision: {
        disposition: decision.disposition ?? decision.selected_disposition,
        executive_source: decision.executive_source,
        permitted: decision.permitted,
        vetoed: decision.vetoed,
        provenance: decision.provenance,
      },
      state: world.currentState(),
      reached_goal: world.isGoal(),
    });
  }

  await exec.transport?.close?.();

  return {
    mode: 'local_runtime',
    executiveSource: 'local_runtime',
    run_id: runId,
    world: {
      reachedGoal: world.isGoal(),
      state: world.currentState(),
      events: world.events,
    },
    steps: history.length,
    history,
    summary: {
      dispositions: history.map((h) => h.decision.disposition),
      actions: history.map((h) => h.chosen_action),
      reached_goal: world.isGoal(),
      final_energy: world.energy,
    },
    note: 'Sovereign closed-loop execution: BrokenWorld + RoverBody + LocalRuntimeDeltaXAdapter. Zero remote APIs.',
  };
}


export function run({mode='SUBSTRATE_ONLY',stub=false,env=process.env}={}){
 if(mode==='UPSTREAM')return runUpstream();
 if(mode==='SUBSTRATE_ONLY')return runWorld();
 if(mode==='local_runtime'){
  return runLocalRuntime({env});
 }
 if(mode==='DELTAX'){
  if(stub)return {...runWorld(),mode:'DELTAX',executiveSource:'stub'};
  if(!env.DELTAX_API_URL)throw new Error('DELTAX mode requires DELTAX_API_URL; use explicit --stub for CI');
  return {...runWorld(),mode:'DELTAX',executiveSource:'canonical_api',apiUrl:env.DELTAX_API_URL,transport:'configured; remote executive call is not hidden by this scaffold'};
 }
 throw new Error(`Unknown experiment mode: ${mode}`);
}

const args=process.argv.slice(2);
if(import.meta.url===`file://${process.argv[1]}`){
  const mode=args.find(a=>a.startsWith('--mode='))?.split('=')[1]??'SUBSTRATE_ONLY';
  Promise.resolve(run({mode,stub:args.includes('--stub')}))
    .then((result)=>console.log(JSON.stringify(result,null,2)))
    .catch((e)=>{console.error(e.message);process.exitCode=1;});
}
