// Synthetic display/frame traces: fast displays adapt; a 60 Hz screen preserves detail.
import assert from 'node:assert/strict';
import { RenderResolution } from '../src/render-resolution.js';
Object.assign(globalThis,{devicePixelRatio:2,innerWidth:1400,innerHeight:900});
let callbacks=[];
globalThis.requestAnimationFrame=fn=>callbacks.push(fn);
function display(hz){for(let i=0;i<18;i++){const q=callbacks;callbacks=[];q.forEach(fn=>fn(i*1000/hz));}}
function frames(r,ms,count,start=1000){for(let i=1;i<=count;i++)r.update(start+i*ms);return start+count*ms;}
const sixty=new RenderResolution(()=>{}, {targetFps:120});display(60);
frames(sixty,1000/60,360);
assert.equal(sixty.ratio,sixty.maximum,'A 60 Hz screen must not downscale just because the target is 120');
const fast=new RenderResolution(()=>{}, {targetFps:120});display(120);
let t=frames(fast,12,180);
assert.ok(fast.ratio<fast.maximum,'A 120 Hz screen must react when frames take 12 ms');
t=frames(fast,1000/120,180,t); // Drain the rolling sample that still contains slow frames.
const settled=fast.ratio;
frames(fast,1000/120,1400,t);
assert.equal(fast.ratio,settled,'Stable 120 Hz must not periodically reallocate a larger target');
const migrating=new RenderResolution(()=>{}, {targetFps:120});display(60);
t=frames(migrating,1000/120,60);
frames(migrating,12,180,t);
assert.ok(migrating.ratio<migrating.maximum,'Recognize a sustained switch to a faster display');
console.log('60 Hz, 120 Hz, refresh transition and stable-resolution checks passed');
