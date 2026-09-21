import { ConnectomeRuntime } from "../../src/connectome/runtime.mjs";
import { PLASTICITY_RULES } from "../../src/connectome/plasticity_overlay.mjs";
import { readFileSync } from "fs";

function testProbeIsolation() {
  console.log("=== LANE 1.2: Probe Isolation Verification ===");

  // Use a small reproducible connectome simulation or the actual connectome runtime on seed 18100
  // Let's load the connectome metadata
  const bodymap = JSON.parse(readFileSync("upstream/fly-brain/public/data/bodymap.json", "utf-8"));
  const rightTactile = bodymap.mechanosensory?.tactile_t1_r || [2937]; // fallback

  // Target A edge from manifest or test set
  // Let's create runtime A (uninterrupted) and runtime B (with probes)
  const createRt = () => new ConnectomeRuntime({
    seed: 18100,
    dt: 10,
    plasticity: {
      enabled: true,
      rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
      eta: 0.05,
      tau_e: 100,
      rewardDelaySteps: 5,
      inductionDurationSteps: 25,
      subthresholdBoost: 1.0,
      subthresholdThresholdFactor: 0.5,
      subthresholdSharpness: 5.0,
    }
  });

  console.log("Loading runtimes...");
  const rtUninterrupted = createRt();
  const rtWithProbes = createRt();

  // Make edge 0 eligible for both
  rtUninterrupted.plasticity.setEligibleEdgeMask(new Set([0, 1, 2]));
  rtWithProbes.plasticity.setEligibleEdgeMask(new Set([0, 1, 2]));

  const driveMap = new Map([[rightTactile[0], 100.0]]);

  // Induction protocol: 3 cycles
  // Each cycle: 25 steps drive, 5 steps delay, 1 step reinforcement
  const runCycle = (rt) => {
    // 25 steps drive
    rt.setSensoryDrives(driveMap);
    for (let s = 0; s < 25; s++) rt.step(1);
    // 5 steps delay
    rt.sensoryDrives.clear();
    rt.net.ext.fill(0);
    for (let s = 0; s < 5; s++) rt.step(1);
    // 1 step reinforcement
    rt.plasticity.applyPlasticityUpdate(1.0);
  };

  console.log("\nRunning Cycle 1 on both...");
  runCycle(rtUninterrupted);

  runCycle(rtWithProbes);
  // Now run probe on rtWithProbes exactly as D.3 does:
  const snap = rtWithProbes.snapshot();
  // probe:
  rtWithProbes.net.reset();
  rtWithProbes.net.ext.fill(0);
  rtWithProbes.sensoryDrives.clear();
  rtWithProbes.setSensoryDrives(driveMap);
  for (let s = 0; s < 25; s++) rtWithProbes.step(1);
  rtWithProbes.sensoryDrives.clear();
  rtWithProbes.net.ext.fill(0);
  for (let s = 0; s < 35; s++) rtWithProbes.step(1);
  // restore:
  rtWithProbes.restore(snap);

  console.log("\nRunning Cycle 2 on both...");
  runCycle(rtUninterrupted);
  runCycle(rtWithProbes);

  // Compare deltaW and eligibility traces between rtUninterrupted and rtWithProbes
  console.log("\n--- Comparison After Cycle 2 ---");
  const hashA = rtUninterrupted.plasticity.getHash();
  const hashB = rtWithProbes.plasticity.getHash();
  console.log(`Uninterrupted hash: ${hashA}`);
  console.log(`With probes hash:   ${hashB}`);
  console.log(`Hashes match:       ${hashA === hashB}`);

  // Inspect state variables:
  console.log(`rtUninterrupted._steps: ${rtUninterrupted.net._steps}`);
  console.log(`rtWithProbes._steps:    ${rtWithProbes.net._steps}`);

  let maxDeltaDiff = 0;
  for (const [k, v] of rtUninterrupted.plasticity.deltaW) {
    const vB = rtWithProbes.plasticity.deltaW.get(k) || 0;
    const diff = Math.abs(v - vB);
    if (diff > maxDeltaDiff) maxDeltaDiff = diff;
  }
  console.log(`Max deltaW diff: ${maxDeltaDiff}`);

  let maxInpDiff = 0;
  for (let i = 0; i < rtUninterrupted.net.N; i++) {
    const diff = Math.abs(rtUninterrupted.net.inp[i] - rtWithProbes.net.inp[i]);
    if (diff > maxInpDiff) maxInpDiff = diff;
  }
  console.log(`Max net.inp diff: ${maxInpDiff}`);

  let maxRDiff = 0;
  for (let i = 0; i < rtUninterrupted.net.N; i++) {
    const diff = Math.abs(rtUninterrupted.net.r[i] - rtWithProbes.net.r[i]);
    if (diff > maxRDiff) maxRDiff = diff;
  }
  console.log(`Max net.r diff: ${maxRDiff}`);
}

testProbeIsolation();
