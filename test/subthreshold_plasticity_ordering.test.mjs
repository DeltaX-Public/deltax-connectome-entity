/**
 * test/subthreshold_plasticity_ordering.test.mjs
 *
 * Phase IV-D.2 Prerequisite Verification:
 * 1. Unit testing of computeSubthresholdPostsynapticFactor psi_i(t) bounds & safety
 * 2. RateNetwork same-tick state ordering verification (r_j(t), inp_i(t), theta_i, r_i(t))
 * 3. Representative numerical psi measurement for right AN03A008 and right DNa02
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const { ConnectomeRuntime } = await import(
  path.join(ROOT, "src", "connectome", "runtime.mjs")
);
const {
  PLASTICITY_RULES,
  PlasticityOverlay,
  computeSubthresholdPostsynapticFactor,
} = await import(
  path.join(ROOT, "src", "connectome", "plasticity_overlay.mjs")
);

test("1. computeSubthresholdPostsynapticFactor bounds and safety audit", () => {
  const theta = 50.0;

  // Case 1: inp < 0
  const psi_neg = computeSubthresholdPostsynapticFactor(-20.0, theta, 0.0);
  assert.equal(psi_neg, 0.0, "inp < 0 with r=0 must produce exactly 0");

  // Case 2: inp = 0
  const psi_zero = computeSubthresholdPostsynapticFactor(0.0, theta, 0.0);
  assert.equal(psi_zero, 0.0, "inp = 0 with r=0 must produce exactly 0");

  // Case 3: inp << theta (inp = 5.0, theta = 50.0 -> ratio 0.1)
  const psi_low = computeSubthresholdPostsynapticFactor(5.0, theta, 0.0);
  assert(psi_low > 0.0 && psi_low < 0.2, "inp << theta must be in (0, 0.2)");
  assert.equal(psi_low.toFixed(4), Math.tanh(0.1).toFixed(4));

  // Case 4: inp = theta (inp = 50.0, theta = 50.0 -> ratio 1.0)
  const psi_eq = computeSubthresholdPostsynapticFactor(50.0, theta, 0.0);
  assert.equal(psi_eq.toFixed(4), Math.tanh(1.0).toFixed(4));
  assert(psi_eq > 0.7 && psi_eq < 0.8, "inp = theta must equal tanh(1.0) ~ 0.7616");

  // Case 5: inp >> theta (inp = 500.0, theta = 50.0 -> ratio 10.0)
  const psi_high = computeSubthresholdPostsynapticFactor(500.0, theta, 0.0);
  assert(psi_high > 0.9999 && psi_high <= 1.0, "inp >> theta must approach and be bounded by 1.0");

  // Case 6: Variations in r (r=0, r=10, r=rmax=200)
  const psi_r0 = computeSubthresholdPostsynapticFactor(25.0, theta, 0.0);
  const psi_r10 = computeSubthresholdPostsynapticFactor(25.0, theta, 10.0);
  const psi_rmax = computeSubthresholdPostsynapticFactor(25.0, theta, 200.0);

  assert(psi_r10 > psi_r0, "Positive firing rate must increase psi");
  assert.equal(psi_rmax, 1.0, "High firing rate (r=200) must clamp to 1.0");

  // Case 7: Strict upper and lower bounds: 0 <= psi <= 1
  for (let inp = -100; inp <= 1000; inp += 50) {
    for (let r = 0; r <= 300; r += 25) {
      const p = computeSubthresholdPostsynapticFactor(inp, theta, r);
      assert(p >= 0.0 && p <= 1.0, `psi must be in [0, 1], got ${p}`);
      assert(Number.isFinite(p), `psi must be finite, got ${p}`);
      assert(!Number.isNaN(p), "psi must not be NaN");
    }
  }

  // Case 8: Fail-closed on theta <= 0, NaN, Infinity
  assert.equal(computeSubthresholdPostsynapticFactor(50.0, 0.0, 10.0), 0.0, "theta = 0 must fail closed (0.0)");
  assert.equal(computeSubthresholdPostsynapticFactor(50.0, -10.0, 10.0), 0.0, "theta < 0 must fail closed (0.0)");
  assert.equal(computeSubthresholdPostsynapticFactor(50.0, NaN, 10.0), 0.0, "theta = NaN must fail closed (0.0)");
  assert.equal(computeSubthresholdPostsynapticFactor(50.0, Infinity, 10.0), 0.0, "theta = Infinity must fail closed (0.0)");
  assert.equal(computeSubthresholdPostsynapticFactor(NaN, theta, 0.0), 0.0, "inp = NaN must yield 0.0");
  assert.equal(computeSubthresholdPostsynapticFactor(50.0, theta, NaN), psi_eq, "r = NaN must treat r as 0");
});

test("2. RateNetwork same-tick state ordering verification", () => {
  const rt = new ConnectomeRuntime({ seed: 18100, substepsPerTick: 1 });
  const RIGHT_AN03A008 = 2937;
  const RIGHT_DNA02 = 332;

  // Step network 1 tick without input to observe baseline
  rt.step(1);

  // In RateNetwork, verify that net.inp, net.theta, and net.r reflect the same tick
  const rBefore = rt.net.r[RIGHT_AN03A008];
  const inpBefore = rt.net.inp[RIGHT_AN03A008];
  const theta = rt.net.theta[RIGHT_AN03A008];

  assert(Number.isFinite(rBefore), "rBefore must be finite");
  assert(Number.isFinite(inpBefore), "inpBefore must be finite");
  assert(Number.isFinite(theta) && theta > 0, "theta must be positive finite");

  // Apply sensory drive to right tactile sensors
  const bodymap = rt.data.bodymap;
  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];
  const driveMap = new Map();
  for (const idx of rightTactile) driveMap.set(idx, 180.0);
  rt.setSensoryDrives(driveMap);

  // Execute 1 tick with 10 substeps (10 ms)
  rt.step(10);

  // Verify that during rt.step(10):
  // 1. Sensory drives are applied to net.ext
  // 2. net.step() updates rates r and computes downstream synaptic inputs inp
  // 3. updateEligibility receives net.r, net.inp, net.theta from the current tick
  const rAfter = rt.net.r[RIGHT_AN03A008];
  const inpAfter = rt.net.inp[RIGHT_AN03A008];

  assert(inpAfter > inpBefore, "Synaptic input inp must accumulate during sensory stimulation");
  assert(rAfter >= 0.0, "Post-step rate must be non-negative");

  // Verify that an edge's eligibility update uses source r, target inp, target theta, target r
  const overlay = new PlasticityOverlay({
    N: rt.N,
    E: rt.E,
    indptr: rt.data.indptr,
    indices: rt.data.indices,
    baseSynapseCounts: rt.data.weights.slice(),
    netWeights: rt.net.weights,
    netInp: rt.net.inp,
    netTheta: rt.net.theta,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
      traceDecay: 0.05,
      learningRate: 0.15,
    },
  });

  const edgeK = overlay.findEdgeIndex(rightTactile[0], RIGHT_AN03A008);
  if (edgeK >= 0) {
    overlay.setEligibleEdgeMask([edgeK]);
    overlay.updateEligibility(rt.net.r, rt.net.inp, rt.net.theta);

    const trace = overlay.eligibilityTraces.get(edgeK);
    assert(trace !== undefined && trace > 0, "Eligible edge must accumulate non-zero subthreshold trace");

    // Manually compute expected trace from same-tick variables
    const expectedPsi = computeSubthresholdPostsynapticFactor(
      rt.net.inp[RIGHT_AN03A008],
      rt.net.theta[RIGHT_AN03A008],
      rt.net.r[RIGHT_AN03A008]
    );
    const expectedCoincidence = (rt.net.r[rightTactile[0]] / 100.0) * expectedPsi;
    assert.equal(trace.toFixed(6), expectedCoincidence.toFixed(6), "Trace must match same-tick analytical expectation");
  }
});

test("3. Representative numerical psi measurement for AN03A008 and DNa02", () => {
  const rt = new ConnectomeRuntime({ seed: 18100, substepsPerTick: 1 });
  const RIGHT_AN03A008 = 2937;
  const RIGHT_DNA02 = 332;

  const bodymap = rt.data.bodymap;
  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];
  const driveMap = new Map();
  for (const idx of rightTactile) driveMap.set(idx, 180.0);

  // Apply tactile stimulation and step 1 tick (10 ms)
  rt.setSensoryDrives(driveMap);
  rt.step(10);

  const an03_inp = rt.net.inp[RIGHT_AN03A008];
  const an03_theta = rt.net.theta[RIGHT_AN03A008];
  const an03_r = rt.net.r[RIGHT_AN03A008];
  const an03_psi = computeSubthresholdPostsynapticFactor(an03_inp, an03_theta, an03_r);

  const dna02_inp = rt.net.inp[RIGHT_DNA02];
  const dna02_theta = rt.net.theta[RIGHT_DNA02];
  const dna02_r = rt.net.r[RIGHT_DNA02];
  const dna02_psi = computeSubthresholdPostsynapticFactor(dna02_inp, dna02_theta, dna02_r);

  console.log(`\n--- Representative Subthreshold State (Seed 18100, Tick 1) ---`);
  console.log(`Right AN03A008 (idx 2937): inp=${an03_inp.toFixed(2)}, theta=${an03_theta.toFixed(2)}, r=${an03_r.toFixed(4)} Hz, psi=${an03_psi.toFixed(4)}`);
  console.log(`Right DNa02    (idx 332):  inp=${dna02_inp.toFixed(2)}, theta=${dna02_theta.toFixed(2)}, r=${dna02_r.toFixed(4)} Hz, psi=${dna02_psi.toFixed(4)}`);

  assert(an03_psi > 0.0 && an03_psi <= 1.0, "AN03A008 psi must be in (0, 1]");
  assert(dna02_psi >= 0.0 && dna02_psi <= 1.0, "DNa02 psi must be in [0, 1]");
});
