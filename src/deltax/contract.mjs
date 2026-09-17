import {EventLedger,DeltaXStub,MODES} from './adapter.mjs';
export const DISPOSITIONS=Object.freeze(['PERMIT','VETO','MODULATE','DEFER','ESCALATE']);
export const MODULATION_CLASSES=Object.freeze(['exploration','persistence','caution','novelty sensitivity','sensory gain','inhibition','urgency','behavior-switching threshold']);
const REQUIRED=['timestamp','run_id','step_id','objective','environment_state_summary','substrate_state_summary','candidate_actions','recent_action_history','recent_outcomes','expected_state','observed_state','detected_contradictions','active_constraints','identity_state','continuity_state','available_executive_actions'];
const copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const decisionId=p=>`decision:${p.run_id}:${p.step_id}`;
function candidates(p){
 if(!Array.isArray(p.candidate_actions)||!p.candidate_actions.length) throw new Error('candidate_actions must originate below DeltaX and be non-empty');
 for(const c of p.candidate_actions) for(const k of ['candidate_id','action_class','source_population','activation_strength','persistence','supporting_state','conflicting_state']) if(c[k]===undefined) throw new Error(`candidate missing provenance field: ${k}`);
 return p.candidate_actions;
}
function validateInput(p){ for(const k of REQUIRED) if(p[k]===undefined) throw new Error(`missing DeltaX input field: ${k}`); candidates(p); return p; }
export class DeltaXReferenceAdapter {
 constructor({mode=MODES.DELTAX,seed='unspecified',config={},checkpoint=null,stub=new DeltaXStub()}={}) {
  if(!Object.values(MODES).includes(mode)) throw new Error(`Unknown mode: ${mode}`);
  this.mode=mode; this.seed=seed; this.config={mode,...config}; this.checkpoint=checkpoint; this.stub=stub;
  this.ledger=new EventLedger({seed,config:this.config,checkpoint}); this.lastDecision=null;
 }
 observe(packet){ validateInput(packet); return this.ledger.record({layer:'environment/sensors',type:'observation',payload:{timestamp:packet.timestamp,run_id:packet.run_id,step_id:packet.step_id,environment_state_summary:copy(packet.environment_state_summary)}}); }
 evaluate(packet){ validateInput(packet); return {input:copy(packet),candidate_ids:packet.candidate_actions.map(c=>c.candidate_id),contradictions:copy(packet.detected_contradictions),implementation:'stub'}; }
 decide(packet){
  validateInput(packet); const id=decisionId(packet), cs=candidates(packet); this.observe(packet);
  this.ledger.record({layer:'connectome',type:'substrate_state',payload:copy(packet.substrate_state_summary)});
  this.ledger.record({layer:'behavioral proposals',type:'candidate_behaviors',payload:{candidates:copy(cs)},beforeIntervention:true});
  this.ledger.record({layer:'DeltaX intervention',type:'DeltaX input packet',payload:copy(packet)});
  let disposition=this.mode===MODES.UPSTREAM||this.mode===MODES.SUBSTRATE_ONLY?'PERMIT':(this.stub.policy.disposition??(this.stub.policy.permit===false?'VETO':'PERMIT'));
  if(packet.experimenter_control?.shutdown||packet.experimenter_control?.paused) disposition='ESCALATE';
  if(!DISPOSITIONS.includes(disposition)) throw new Error(`unsupported disposition: ${disposition}`);
  const chosen=this.stub.policy.candidate_id?cs.filter(c=>c.candidate_id===this.stub.policy.candidate_id):cs.slice(0,1);
  const vetoed=disposition==='VETO'?chosen:[], permitted=disposition==='PERMIT'||disposition==='MODULATE'?chosen:[];
  let commands=[];
  if(disposition==='MODULATE') {
   const m=this.stub.policy.modulation??{}, cls=m.modulation_class??'caution';
   if(!MODULATION_CLASSES.includes(cls)) throw new Error(`unsupported modulation class: ${cls}`);
   commands=[{modulation_class:cls,target:m.target??'executive',parameter:m.parameter??'level',previous_value:m.previous_value??0,new_value:m.new_value??0,duration:m.duration??1,decision_id:id}];
  }
  const out={decision_id:id,timestamp:packet.timestamp,evaluated_candidates:copy(cs),selected_disposition:disposition,permitted_candidates:copy(permitted),vetoed_candidates:copy(vetoed),modulation_commands:commands,unresolved_contradictions:copy(packet.detected_contradictions),constraint_refs:copy(packet.active_constraints),state_transition_refs:[],provenance:{implementation:'stub',adapter:'DeltaXReferenceAdapter',candidate_origin:'connectome/substrate',seed:this.seed,config:copy(this.config),checkpoint:this.checkpoint,free_form_reasoning:false},telemetry:{implementation:'stub',alwaysDecides:true,executiveBypass:false,causal_chain:'world→sensory→connectomecandidate→DeltaX→action'}};
  this.ledger.record({layer:'DeltaX intervention',type:'DeltaX output packet',payload:copy(out),decision_id:id}); this.lastDecision=out; return out;
 }
 apply(decision,{actuator='motor'}={}) {
  if(!decision||decision!==this.lastDecision) throw new Error('apply requires the latest structured decision packet');
  const blocked=!['PERMIT','MODULATE'].includes(decision.selected_disposition);
  const result={decision_id:decision.decision_id,actuator,applied:!blocked,routedTo:blocked?null:'existing-motor-path',directActuation:false,blockedByVeto:decision.selected_disposition==='VETO'};
  this.ledger.record({layer:'motor',type:'executed action',payload:result,decision_id:decision.decision_id}); return result;
 }
 record(event){ return this.ledger.record(event); }
 exportLedgerJSONL(){ return this.ledger.exportJSONL(); }
 replay(packet){ return this.decide(packet); }
}
