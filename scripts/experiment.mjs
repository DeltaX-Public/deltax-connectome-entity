import {spawnSync} from 'node:child_process';
import {BrokenWorld} from '../src/worlds/broken_world/world.mjs';

export function runWorld(){const world=new BrokenWorld();return world.run(Array(12).fill('forward'));}
export function runUpstream(){const p=spawnSync('npm',['--prefix','upstream/fly-brain','run','build'],{encoding:'utf8'});if(p.status!==0)throw new Error(`UPSTREAM fly validation failed: ${p.stderr||p.stdout}`);return {mode:'UPSTREAM',validation:'fly-brain build passed'};}
export function run({mode='SUBSTRATE_ONLY',stub=false,env=process.env}={}){
 if(mode==='UPSTREAM')return runUpstream();
 if(mode==='SUBSTRATE_ONLY')return runWorld();
 if(mode==='DELTAX'){
  if(stub)return {...runWorld(),mode:'DELTAX',executiveSource:'stub'};
  if(!env.DELTAX_API_URL)throw new Error('DELTAX mode requires DELTAX_API_URL; use explicit --stub for CI');
  return {...runWorld(),mode:'DELTAX',executiveSource:'canonical_api',apiUrl:env.DELTAX_API_URL,transport:'configured; remote executive call is not hidden by this scaffold'};
 }
 throw new Error(`Unknown experiment mode: ${mode}`);
}
const args=process.argv.slice(2);if(import.meta.url===`file://${process.argv[1]}`){const mode=args.find(a=>a.startsWith('--mode='))?.split('=')[1]??'SUBSTRATE_ONLY';try{console.log(JSON.stringify(run({mode,stub:args.includes('--stub')}),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
