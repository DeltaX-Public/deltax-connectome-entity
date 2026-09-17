import {DeltaXAdapter,DeltaXStub,MODES} from '../src/deltax/adapter.mjs';
const mode=process.argv[2]??MODES.DELTAX_DEBUG;
const policy=process.argv.includes('--veto')?{permit:false}:{permit:true};
const adapter=new DeltaXAdapter({mode,seed:'harness-seed',config:{harness:'milestone1'},checkpoint:'demo-checkpoint',stub:new DeltaXStub({policy})});
const input={sensors:{light:0.5,wingLoad:0.2},environment:{scenario:'adapter-harness'},connectome:{state:['sensory','motor'],activation:0.75},proposal:{distribution:{left:0.6,right:0.4},action:{leftWing:0.2,rightWing:0.1}}};
adapter.observe(input); const packet=adapter.decide(input); const applied=adapter.apply(packet);
console.log(JSON.stringify({packet,applied,ledgerJSONL:adapter.exportLedgerJSONL()},null,2));
