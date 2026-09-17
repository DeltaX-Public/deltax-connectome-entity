/** Isolated DeltaX adapter boundary. DeltaXStub is not a DeltaX runtime. */
export const MODES = Object.freeze({UPSTREAM:'UPSTREAM',SUBSTRATE_ONLY:'SUBSTRATE_ONLY',DELTAX:'DELTAX',DELTAX_DEBUG:'DELTAX_DEBUG'});
const LAYERS = Object.freeze(['environment/sensors','connectome','behavioral proposals','DeltaX intervention','motor']);
const clone = (v) => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
const id = (p='evt') => `${p}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export class EventLedger {
 constructor({seed='unspecified',config={},checkpoint=null}={}) { this.replay={seed,config:clone(config),checkpoint}; this.events=[]; }
 record(event) { const row={eventId:id('event'),recordedAt:new Date().toISOString(),...clone(event),replay:clone(this.replay)}; this.events.push(row); return row; }
 toJSONL() { return this.events.map(e=>JSON.stringify(e)).join('\\n')+(this.events.length?'\\n':''); }
 exportJSONL() { return this.toJSONL(); }
}
export class DeltaXStub {
 constructor({policy={},name='DeltaXStub'}={}) { this.name=name; this.policy={permit:true,modulation:null,...policy}; }
 evaluate(context) { return {implementation:'stub',decisionSource:'DeltaXStub',alwaysDecides:true,policy:clone(this.policy)}; }
 decide(context) { const e=this.evaluate(context), permit=this.policy.permit!==false; return {...e,action:permit?clone(context.proposal.action):null,permit,veto:!permit,modulation:clone(this.policy.modulation),reason:permit?'stub_policy_permit':'stub_policy_veto'}; }
}
export class DeltaXAdapter {
 constructor({mode=MODES.SUBSTRATE_ONLY,seed='unspecified',config={},checkpoint=null,stub=new DeltaXStub()}={}) {
  if(!Object.values(MODES).includes(mode)) throw new Error(`Unknown mode: ${mode}`);
  this.mode=mode; this.stub=stub; this.ledger=new EventLedger({seed,config:{mode,...config},checkpoint}); this.lastPacket=null;
 }
 observe({sensors,environment={}}={}) {
  if(sensors===undefined) throw new Error('observe requires sensors/environment input');
  return this.ledger.record({layer:'environment/sensors',type:'observation',payload:{sensors:clone(sensors),environment:clone(environment)}});
 }
 evaluate({connectome,proposal}={}) {
  this.#validateSubstrate(connectome,proposal);
  const r=(this.mode===MODES.DELTAX||this.mode===MODES.DELTAX_DEBUG)?this.stub.evaluate({connectome,proposal}):{implementation:'none',decisionSource:'substrate',bypassed:true};
  return {...r,mode:this.mode};
 }
 decide({sensors,environment={},connectome,proposal,checkpoint=null}={}) {
  this.#validateSubstrate(connectome,proposal);
  const distribution=clone(proposal.distribution??{});
  const c=this.ledger.record({layer:'connectome',type:'connectome_output',payload:clone(connectome)});
  const p=this.ledger.record({layer:'behavioral proposals',type:'substrate_proposal',payload:{proposal:clone(proposal),distribution},beforeIntervention:true});
  let intervention;
  if(this.mode===MODES.UPSTREAM||this.mode===MODES.SUBSTRATE_ONLY) intervention={permit:true,veto:false,modulation:null,implementation:'none',decisionSource:'substrate',bypassed:true,reason:'mode_no_deltax'};
  else intervention=this.stub.decide({sensors,environment,connectome,proposal});
  const i=this.ledger.record({layer:'DeltaX intervention',type:'intervention',payload:clone(intervention),substrateProposalEventId:p.eventId});
  const finalAction=intervention.veto?null:(intervention.modulation??intervention.action??proposal.action);
  const packet={packetId:id('packet'),mode:this.mode,replay:{seed:this.ledger.replay.seed,config:clone(this.ledger.replay.config),checkpoint},layers:[...LAYERS],substrateProposalDistribution:distribution,intervention:clone(intervention),finalAction:clone(finalAction),telemetry:{implementation:intervention.implementation,alwaysDecides:intervention.alwaysDecides??false,substrateProposalRecordedBeforeIntervention:true,connectomeRequired:true,executiveBypass:false,isolationMetric:this.#isolationMetric(connectome,proposal)},ledgerEventIds:{connectome:c.eventId,proposal:p.eventId,intervention:i.eventId}};
  this.lastPacket=packet; return packet;
 }
 apply(packet,{actuator='motor',manualOverride=null}={}) {
  if(!packet||packet!==this.lastPacket) throw new Error('apply requires the adapter decision packet');
  const override=manualOverride!==null, permitted=packet.intervention.permit===true&&!packet.intervention.veto;
  const action=override?clone(manualOverride):(permitted?clone(packet.finalAction):null);
  const result={applied:action!==null,actuator,action,mode:packet.mode,manualOverride:override,blockedByVeto:!permitted&&!override};
  if(override) result.telemetry={...packet.telemetry,manualOverride:true,manualOverrideLabel:'MANUAL_OVERRIDE'};
  this.ledger.record({layer:'motor',type:'motor_application',payload:result,packetId:packet.packetId}); return result;
 }
 record(event){ return this.ledger.record(event); }
 exportLedgerJSONL(){ return this.ledger.exportJSONL(); }
 #validateSubstrate(connectome,proposal){ if(connectome===undefined) throw new Error('connectome output is required; DeltaX cannot bypass the connectome'); if(!proposal||typeof proposal.action==='undefined') throw new Error('behavioral proposal with action is required'); }
 #isolationMetric(connectome,proposal){ const n=Object.keys(connectome??{}).length+Object.keys(proposal??{}).length; return {substrateFieldsBeforeIntervention:n,deltaXInputFields:2,retainedSubstrateStructure:n>0?1:0}; }
}
export const createAdapter=(options={})=>new DeltaXAdapter(options);
