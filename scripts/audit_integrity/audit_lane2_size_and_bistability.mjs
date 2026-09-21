import { ConnectomeRuntime } from "../../src/connectome/runtime.mjs";
import { RateNetwork } from "../../upstream/fly-brain/src/ratenet.js";
import fs from "fs";
import path from "path";

const bodymap = JSON.parse(fs.readFileSync("upstream/fly-brain/public/data/bodymap.json", "utf-8"));
const RIGHT_TACTILE = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];
const RIGHT_DNA02 = 332;
const RIGHT_AN03A008 = 2937;
const INTENSITY = 180.0;

/**
 * LANE 2.4: Controlled Size-Scaling Comparisons
 */
export function testSizeScalingVariants(seed = 18100) {
  console.log("\n=======================================================");
  console.log("LANE 2.4: CONTROLLED SIZE-SCALING COMPARISONS");
  console.log("=======================================================");

  const variants = [
    { name: "1. ORIGINAL (theta*s, a/s)", scaleTheta: true, scaleA: true },
    { name: "2. THRESHOLD_ONLY (theta*s, a unscaled)", scaleTheta: true, scaleA: false },
    { name: "3. GAIN_ONLY (theta unscaled, a/s)", scaleTheta: false, scaleA: true },
    { name: "4. JOINT_UNSCALED (theta unscaled, a unscaled)", scaleTheta: false, scaleA: false },
  ];

  const results = [];

  for (const v of variants) {
    const rt = new ConnectomeRuntime({ seed, substepsPerTick: 1, plasticity: false });
    const net = rt.net;
    const s = net.sizeScale;

    // Apply scaling rule
    for (let i = 0; i < net.N; i++) {
      if (!v.scaleTheta) {
        // undo theta * s[i]
        net.theta[i] = net.theta[i] / s[i];
      }
      if (!v.scaleA) {
        // undo a / s[i]
        net.a[i] = net.a[i] * s[i];
      }
    }

    // Run standardized probe under intact baseline (no plasticity)
    net.reset();
    net.ext.fill(0);
    rt.sensoryDrives.clear();

    const driveMap = new Map();
    for (const idx of RIGHT_TACTILE) driveMap.set(idx, INTENSITY);

    let sumRightDNa02 = 0;
    let sumAN03 = 0;
    for (let step = 1; step <= 60; step++) {
      if (step >= 11 && step <= 35) rt.setSensoryDrives(driveMap);
      else { rt.sensoryDrives.clear(); net.ext.fill(0); }
      rt.step(1);
      if (step >= 11 && step <= 35) {
        sumRightDNa02 += net.r[RIGHT_DNA02];
        sumAN03 += net.r[RIGHT_AN03A008];
      }
    }

    const meanDNa02 = sumRightDNa02 / 25;
    const meanAN03 = sumAN03 / 25;
    const dna02Theta = net.theta[RIGHT_DNA02];
    const dna02Gain = net.a[RIGHT_DNA02];
    const dna02Scale = s[RIGHT_DNA02];

    console.log(`Variant: ${v.name}`);
    console.log(`  DNa02 Scale: ${dna02Scale.toFixed(2)}, Theta: ${dna02Theta.toFixed(2)}, Gain: ${dna02Gain.toFixed(4)}`);
    console.log(`  Baseline Tactile Response -> AN03A008: ${meanAN03.toFixed(4)} Hz, DNa02: ${meanDNa02.toFixed(4)} Hz`);

    results.push({
      variant: v.name,
      dna02Scale,
      dna02Theta,
      dna02Gain,
      meanAN03,
      meanDNa02,
    });
  }

  return results;
}

/**
 * LANE 2.5: Parameter Variation vs Initial-State Variation ("Bistability" Test)
 */
export function testDynamicalBistability(seed = 18100) {
  console.log("\n=======================================================");
  console.log("LANE 2.5: DYNAMICAL BISTABILITY TEST ON FIXED SEED");
  console.log("=======================================================");

  // Within a SINGLE fixed seed, do different initial states lead to different steady states?
  const rt = new ConnectomeRuntime({ seed, substepsPerTick: 1, plasticity: false });
  const driveMap = new Map();
  for (const idx of RIGHT_TACTILE) driveMap.set(idx, INTENSITY);

  const initialConditions = [
    { label: "Zero Initial State (r=0)", initFn: () => rt.net.reset() },
    {
      label: "Random Perturbed State (r ~ U(0, 10))",
      initFn: () => {
        rt.net.reset();
        for (let i = 0; i < rt.net.N; i++) rt.net.r[i] = Math.random() * 10;
      },
    },
    {
      label: "Hyper-Excited DNa02 State (r[332]=100 Hz)",
      initFn: () => {
        rt.net.reset();
        rt.net.r[RIGHT_DNA02] = 100.0;
        rt.net.out[RIGHT_DNA02] = 100.0;
      },
    },
  ];

  const trajectories = [];

  for (const ic of initialConditions) {
    ic.initFn();
    rt.net.ext.fill(0);
    rt.sensoryDrives.clear();

    const dna02Trace = [];
    // Drive for 50 steps under constant stimulus
    rt.setSensoryDrives(driveMap);
    for (let s = 1; s <= 50; s++) {
      rt.step(1);
      dna02Trace.push(rt.net.r[RIGHT_DNA02]);
    }

    const finalRate = dna02Trace[dna02Trace.length - 1];
    console.log(`Initial Condition: ${ic.label}`);
    console.log(`  Step 1 DNa02: ${dna02Trace[0].toFixed(4)} Hz -> Step 50 DNa02: ${finalRate.toFixed(4)} Hz`);
    trajectories.push({ label: ic.label, finalRate, trace: dna02Trace });
  }

  const diffMax = Math.abs(trajectories[0].finalRate - trajectories[1].finalRate);
  const diffPerturb = Math.abs(trajectories[0].finalRate - trajectories[2].finalRate);
  console.log(`\nAttractor divergence between Zero and Random init: ${diffMax.toFixed(6)} Hz`);
  console.log(`Attractor divergence between Zero and Hyper-excited init: ${diffPerturb.toFixed(6)} Hz`);
  console.log(`Verdict: ${diffMax < 1e-3 && diffPerturb < 1e-3 ? "SINGLE MONOSTABLE ATTRACTOR (Not Bistable)" : "BISTABILITY CONFIRMED"}`);

  return { trajectories, isBistable: diffMax >= 1e-3 || diffPerturb >= 1e-3 };
}

testSizeScalingVariants();
testDynamicalBistability();
