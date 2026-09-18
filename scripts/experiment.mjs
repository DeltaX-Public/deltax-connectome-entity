import {spawnSync} from 'node:child_process';
import {BrokenWorld} from '../src/worlds/broken_world/world.mjs';
import {createExecutive} from '../src/deltax/index.mjs';

export function runWorld(){const world=new BrokenWorld();return world.run(Array(12).fill('forward'));}
export function runUpstream(){const p=spawnSync('npm',['--prefix','upstream/fly-brain','run','build'],{encoding:'utf8'});if(p.status!==0)throw new Error(`UPSTREAM fly validation failed: ${p.stderr||p.stdout}`);return {mode:'UPSTREAM',validation:'fly-brain build passed'};}

export async function runLocalRuntime({env=process.env}={}){
  if(!env.DELTAX_LOCAL_RUNTIME_CMD){
    throw new Error('local_runtime requires DELTAX_LOCAL_RUNTIME_CMD; refusing silent stub fallback');
  }
  const world = runWorld();
  const exec = createExecutive({ mode: 'local_runtime', command: env.DELTAX_LOCAL_RUNTIME_CMD });
  const decision = await exec.decide({
    objective: 'broken_world_smoke',
    environment_state_summary: { mode: 'SUBSTRATE_ONLY', steps: 12 },
    substrate_state_summary: { proposal: 'forward' },
    candidate_actions: [
      { substrate_candidate_id: 'c-forward', action_class: 'locomotion', activation_strength: 0.8 },
      { substrate_candidate_id: 'c-stop', action_class: 'halt', activation_strength: 0.3 },
    ],
    available_executive_actions: ['PERMIT', 'VETO', 'MODULATE', 'DEFER', 'ESCALATE'],
  });
  await exec.transport?.close?.();
  return {
    mode: 'local_runtime',
    executiveSource: 'local_runtime',
    world,
    decision: {
      disposition: decision.disposition ?? decision.selected_disposition,
      executive_source: decision.executive_source,
      provenance: decision.provenance,
      permitted: decision.permitted,
      vetoed: decision.vetoed,
    },
    note: 'JSONL local provider; not labeled canonical_api',
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
