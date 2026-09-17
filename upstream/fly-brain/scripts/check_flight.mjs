// Real MuJoCo acceptance: lift, both steering directions, gust, safe contact landing,
// and a zero-wing-force ablation. No renderer fixtures or prescribed body positions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import loadMujoco from '@mujoco/mujoco';
import { buildWorldXML, DEFAULT_ENV } from '../src/sim/world.js';
import { Flight } from '../src/sim/flight.js';
const mj=await loadMujoco(), xml=fs.readFileSync('public/body/fly_physics.xml','utf8');
const results=[];
for (const [name,turn,wind,noWings] of [['straight',0,[0,0]],['left',.25,[0,0]],['right',-.25,[0,0]],['wind',.1,[3,-2]],['no-wings',0,[0,0],true]]) {
  const env=structuredClone(DEFAULT_ENV); env.wind=wind;
  const M=mj.MjModel.from_xml_string(buildWorldXML(xml,env,{flyPos:[0,0,.4]})), d=new mj.MjData(M);
  mj.mj_forward(M,d);
  const jointAdr={},act={},range={},touch=[];
  for(let j=0;j<M.njnt;j++) jointAdr[M.jnt(j).name]=M.jnt_qposadr[j];
  for(let i=0;i<M.nu;i++) { const n=M.actuator(i).name;act[n]=i;range[n]=[M.actuator_ctrlrange[2*i],M.actuator_ctrlrange[2*i+1]]; }
  for(let i=0;i<M.nsensor;i++) if(M.sensor(i).name.startsWith('touch_claw_')) touch.push(M.sensor_adr[i]);
  const th=M.body('thorax').id;let seed=5;
  const flight=new Flight({mj,model:M,data:d,thorax:th,jointAdr,act,range,rand:()=>((seed=seed*16807%2147483647)/2147483647)});
  for(const s of [0,1])for(const velocity of [[100,20,30],[-50,90,-10],[1,2,100]]) {
    const force=flight.aeroForce(s,[0,0],velocity);
    assert.ok(force.reduce((dot,f,i)=>dot+f*velocity[i],0)<=1e-8,'Aerodynamic drag must dissipate relative motion');
  }
  flight.start(0);flight.dur=1200;
  let maxZ=0,minUp=1,maxSpeed=0,landed=null,yawAtOneSecond=0,contacts=0,previousYaw=0,yawTotal=0;
  const phases=new Set();
  for(let t=0;t<4000;t++) {
    const legTouch=touch.some(i=>d.sensordata[i]>0);
    if(legTouch)contacts++;
    const result=flight.update(t,1,{turn,env,others:[],legTouch});
    if(noWings)flight.fade=0;
    if(flight.phase)phases.add(flight.phase);
    for(let s=0;s<Math.round(.001/M.opt.timestep);s++) { if(flight.active)flight.substep(1000*M.opt.timestep);mj.mj_step(M,d); }
    const z=d.xpos[th*3+2],up=d.xmat[th*9+8],speed=Math.hypot(...d.qvel.slice(0,3));
    assert.ok(Number.isFinite(z+up+speed),`${name}: finite dynamics`);
    maxZ=Math.max(maxZ,z);if(t>100)minUp=Math.min(minUp,up);maxSpeed=Math.max(maxSpeed,speed);
    const yaw=Math.atan2(d.xmat[th*9+3],d.xmat[th*9]);
    yawTotal+=Math.atan2(Math.sin(yaw-previousYaw),Math.cos(yaw-previousYaw));previousYaw=yaw;
    if(t===1000)yawAtOneSecond=yawTotal;
    if(result==='landed') { landed=t; break; }
  }
  const row={name,maxZ,minUp,maxSpeed,landed,yawAtOneSecond,contacts,phases:[...phases],finalZ:d.xpos[th*3+2]};
  results.push(row);console.log(JSON.stringify(row));
  if(noWings) { assert.ok(maxZ<.43);assert.ok(row.finalZ<.2); }
  else {
    assert.ok(maxZ>.5 && maxZ<1,`${name}: bounded sustained lift`);
    assert.ok(minUp>.75,`${name}: upright through landing`);
    assert.ok(maxSpeed<20,`${name}: no catapult velocities`);
    assert.ok(landed>1200 && landed<3500 && contacts>0 && row.finalZ<.2,`${name}: contact-based landing`);
    assert.deepEqual(row.phases,['climb','cruise','land','touchdown']);
    assert.ok(d.xfrc_applied.slice(th*6,th*6+6).every(v=>v===0),'Landing clears persistent external forces');
  }
  d.delete();M.delete();
}
assert.ok(results[1].yawAtOneSecond>2 && results[2].yawAtOneSecond< -2,'Steering turns in opposite directions');
fs.writeFileSync('/tmp/fly-flight-check.json',JSON.stringify(results,null,2)+'\n');
