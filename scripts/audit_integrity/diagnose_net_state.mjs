import { ConnectomeRuntime } from "../../src/connectome/runtime.mjs";
import fs from "fs";

const bodymap = JSON.parse(fs.readFileSync("upstream/fly-brain/public/data/bodymap.json", "utf-8"));
const RIGHT_TACTILE = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];
const LEFT_TACTILE = bodymap.sensors.find((s) => s.name === "tactile T1 left")?.idx || [];

const rt = new ConnectomeRuntime({ seed: 18100, substepsPerTick: 1, plasticity: false });

console.log("=== DIAGNOSING NET STATE ACROSS PROBES ===");
console.log(`Initial net.t: ${rt.net.t}, _steps: ${rt.net._steps}`);

function probe(drive) {
  rt.net.reset();
  rt.net.ext.fill(0);
  rt.sensoryDrives.clear();
  const driveMap = new Map();
  for (const idx of drive) driveMap.set(idx, 180.0);
  for (let s = 1; s <= 60; s++) {
    if (s >= 11 && s <= 35) rt.setSensoryDrives(driveMap);
    else { rt.sensoryDrives.clear(); rt.net.ext.fill(0); }
    rt.step(1);
  }
}

console.log("Running Right Tactile probe...");
probe(RIGHT_TACTILE);
console.log(`After Right probe:`);
console.log(`  _steps: ${rt.net._steps}`);
console.log(`  spikeCount sum: ${rt.net.spikeCount.reduce((a, b) => a + b, 0)}`);
  let uMin1 = 1, aMax1 = 0;
  for (let i = 0; i < rt.net.N; i++) {
    if (rt.net.u[i] < uMin1) uMin1 = rt.net.u[i];
    if (rt.net.A[i] > aMax1) aMax1 = rt.net.A[i];
  }
  console.log(`  u min: ${uMin1}`);
  console.log(`  A max: ${aMax1}`);

console.log("Running Left Tactile probe...");
probe(LEFT_TACTILE);
console.log(`After Left probe:`);
console.log(`  _steps: ${rt.net._steps}`);
console.log(`  spikeCount sum: ${rt.net.spikeCount.reduce((a, b) => a + b, 0)}`);
  let uMin2 = 1, aMax2 = 0;
  for (let i = 0; i < rt.net.N; i++) {
    if (rt.net.u[i] < uMin2) uMin2 = rt.net.u[i];
    if (rt.net.A[i] > aMax2) aMax2 = rt.net.A[i];
  }
  console.log(`  u min: ${uMin2}`);
  console.log(`  A max: ${aMax2}`);

// Now let's check input caching!
let maxInpDivergence = 0;
let fullRecomp = new Float32Array(rt.net.N);
for (let j = 0; j < rt.net.N; j++) {
  if (rt.net.out[j] === 0) continue;
  const f = rt.net.preFactor[j] * rt.net.out[j];
  for (let k = rt.net.indptr[j], e = rt.net.indptr[j + 1]; k < e; k++) {
    fullRecomp[rt.net.indices[k]] += f * rt.net.weights[k];
  }
}
for (let i = 0; i < rt.net.N; i++) {
  const diff = Math.abs(rt.net.inp[i] - fullRecomp[i]);
  if (diff > maxInpDivergence) maxInpDivergence = diff;
}
console.log(`Max input cache divergence after Left probe: ${maxInpDivergence}`);
