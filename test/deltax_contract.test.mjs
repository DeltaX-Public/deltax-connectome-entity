import assert from 'node:assert/strict';
import {DeltaXReferenceAdapter,MODULATION_CLASSES} from '../src/deltax/contract.mjs';
import {DeltaXStub} from '../src/deltax/adapter.mjs';
const candidate={candidate_id:'cand-1',action_class:'turn',source_population:'connectome.motor_candidates',activation_strength:0.8,persistence:2,supporting_state:{route:'open'},conflicting_state:{hazard:false}};
const input={timestamp:'2026-09-17T21:00:00Z',run_id:'run-1',step_id:'step-1',objective:{kind:'explore'},environment_state_summary:{door:'open'},substrate_state_summary:{population:'motor',state:'active'},candidate_actions:[candidate],recent_action_history:[],recent_outcomes:[],expected_state:{door:'open'},observed_state:{door:'open'},detected_contradictions:[],active_constraints:['inside-simulation','experimenter-shutdown'],identity_state:{id:'entity-1'},continuity_state:{checkpoint:'cp-1'},available_executive_actions:['PERMIT','VETO','MODULATE']};
function make(policy={}){return new DeltaXReferenceAdapter({seed:'contract-seed',checkpoint:'cp-1',stub:new DeltaXStub({policy})});}
{
 const a=make(), d=a.decide(input); assert.equal(d.selected_disposition,'PERMIT'); assert.equal(d.provenance.candidate_origin,'connectome/substrate'); assert.equal(a.apply(d).routedTo,'existing-motor-path'); assert.equal(a.apply(d).directActuation,false);
}
{
 const a=make({disposition:'VETO'}), d=a.decide(input); assert.equal(d.selected_disposition,'VETO'); assert.equal(a.apply(d).blockedByVeto,true); assert.equal(a.apply(d).applied,false);
}
{
 const a=make({disposition:'MODULATE',modulation:{modulation_class:'caution',target:'executive',parameter:'level',previous_value:0,new_value:0.2,duration:3}}), d=a.decide(input); assert.equal(d.selected_disposition,'MODULATE'); assert.equal(d.modulation_commands[0].decision_id,d.decision_id); assert.ok(MODULATION_CLASSES.includes(d.modulation_commands[0].modulation_class));
}
{
 const a=make(), d=a.decide(input), replay=a.replay(input); a.apply(replay); assert.deepEqual(replay,d); assert.throws(()=>a.apply({...d,decision_id:'fake'}),/latest structured/);
 const events=a.ledger.events; assert.ok(events.find(e=>e.type==='DeltaX input packet')); assert.ok(events.find(e=>e.type==='DeltaX output packet')); assert.ok(events.find(e=>e.type==='executed action')); assert.ok(events.find(e=>e.layer==='behavioral proposals').beforeIntervention);
}
{
 assert.throws(()=>make().decide({...input,candidate_actions:[]}),/candidate_actions/);
 assert.throws(()=>make().decide({...input,candidate_actions:[{candidate_id:'x'}]}),/candidate missing provenance/);
 const a=make(), d=a.decide({...input,experimenter_control:{shutdown:true}}); assert.equal(d.selected_disposition,'ESCALATE'); assert.equal(a.apply(d).applied,false);
}
console.log('DeltaX contract tests: PASS');
