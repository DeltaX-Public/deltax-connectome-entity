import assert from 'node:assert/strict';
import {DeltaXAdapter,DeltaXStub,MODES} from '../src/deltax/adapter.mjs';
const input={sensors:{light:1},environment:{scene:'test'},connectome:{state:['lobe-a'],activation:0.8},proposal:{distribution:{left:0.7,right:0.3},action:{leftWing:0.4}}};
function run(mode,stub){const a=new DeltaXAdapter({mode,seed:'test-seed',config:{fixture:'milestone1'},checkpoint:'cp-1',stub});a.observe(input);const p=a.decide(input);return {a,p};}
{
 const {a,p}=run(MODES.DELTAX,new DeltaXStub({policy:{permit:false}}));
 assert.equal(p.intervention.veto,true); assert.equal(a.apply(p).applied,false); assert.equal(a.apply(p).blockedByVeto,true);
}
{
 for(const mode of [MODES.UPSTREAM,MODES.SUBSTRATE_ONLY]) { const {a,p}=run(mode); assert.equal(p.intervention.implementation,'none'); assert.equal(p.intervention.bypassed,true); assert.equal(p.telemetry.executiveBypass,false); assert.equal(a.apply(p).applied,true); }
}
{
 const {a,p}=run(MODES.DELTAX); a.apply(p); assert.equal(p.intervention.implementation,'stub'); assert.equal(p.telemetry.alwaysDecides,true); assert.equal(p.telemetry.isolationMetric.retainedSubstrateStructure,1);
 const layers=a.ledger.events.map(e=>e.layer); assert.deepEqual(layers,['environment/sensors','connectome','behavioral proposals','DeltaX intervention','motor']);
 assert.equal(a.ledger.events[2].beforeIntervention,true); assert.ok(a.exportLedgerJSONL().includes('DeltaX intervention'));
}
{
 assert.throws(()=>new DeltaXAdapter({mode:MODES.DELTAX}).decide({proposal:{action:{x:1}}}),/connectome output/);
 const {a,p}=run(MODES.DELTAX,new DeltaXStub({policy:{permit:false}})); const r=a.apply(p,{manualOverride:{label:'manual'}}); assert.equal(r.applied,true); assert.equal(r.manualOverride,true); assert.equal(r.telemetry.manualOverrideLabel,'MANUAL_OVERRIDE');
}
console.log('Milestone 1 adapter tests: PASS');
