import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BrokenWorld} from '../src/worlds/broken_world/world.mjs';
import {run} from '../scripts/experiment.mjs';

const sensory=readFileSync('config/sensory_map.json','utf8');
assert.doesNotThrow(()=>JSON.parse(sensory));
assert.doesNotMatch(sensory,/door_is_correct|correct_door|solution_label|door_correct/i);
const action=JSON.parse(readFileSync('config/action_map.json','utf8'));
assert.deepEqual(action.proposals.map(x=>x.body_action),['forward','left','right','stop','inspect']);
const closed=new BrokenWorld({externalMutationAt:99});closed.start();for(let i=0;i<12;i++)closed.applyAction('forward');assert.equal(closed.reachableWithoutDoor(),false);assert.equal(closed.isGoal(),false);
let tick=100;const world=new BrokenWorld({clock:()=>++tick,externalMutationAt:3});const result=world.run(Array(10).fill('forward'));const types=new Set(result.events.map(e=>e.type));for(const t of ['EXPECTED','OBSERVED','CONTRADICTION','EXECUTIVE RESPONSE','SUBSTRATE RESPONSE','NEW ACTION'])assert(types.has(t),`missing ${t}`);const mutation=result.events.find(e=>e.type==='WORLD_MUTATION');assert(mutation&&mutation.detail.source==='external');assert.equal(typeof mutation.detail.timestamp,'number');
assert.throws(()=>run({mode:'DELTAX',env:{}}),/requires DELTAX_API_URL/);const stub=run({mode:'DELTAX',stub:true});assert.equal(stub.executiveSource,'stub');assert(stub.events.length>0);
console.log('Phase 5 tests: PASS');
