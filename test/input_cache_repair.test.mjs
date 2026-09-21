import test from "node:test";
import assert from "node:assert/strict";
import { ConnectomeRuntime } from "../src/connectome/runtime.mjs";
import { RateNetwork } from "../upstream/fly-brain/src/ratenet.js";
import { PlasticityOverlay, PLASTICITY_RULES } from "../src/connectome/plasticity_overlay.mjs";

function computeTrueInput(net) {
  const { N, out, indptr, indices, weights, preFactor } = net;
  const expected = new Float32Array(N);
  for (let j = 0; j < N; j++) {
    const oj = out[j];
    if (oj === 0) continue;
    const f = preFactor[j] * oj;
    for (let k = indptr[j], e = indptr[j + 1]; k < e; k++) {
      expected[indices[k]] += f * weights[k];
    }
  }
  return expected;
}

test("Input-Cache Repair 1: Instant cache agreement on weight modification (DEF-01)", () => {
  // 3-neuron chain: 0 -> 1 -> 2
  const N = 3;
  const indptr = new Int32Array([0, 1, 2, 2]);
  const indices = new Int32Array([1, 2]);
  const weights = new Float32Array([10, 15]);
  const nt = new Uint8Array([0, 0, 0]);
  const size = new Float32Array([1, 1, 1]);

  const net = new RateNetwork(N, indptr, indices, weights, nt, size, {
    seed: 123,
    dt: 10,
    minSyn: 1,
    sizeNorm: false,
    b: 1.0,
  });

  const overlay = new PlasticityOverlay({
    N,
    E: 2,
    indptr,
    indices,
    baseWeights: weights.slice(),
    netWeights: net.weights,
    netInp: net.inp,
    netTheta: net.theta,
    net,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.LOCAL_HEBBIAN,
    },
    eligibleEdgeMask: [0, 1],
  });

  // Step 1: Drive neuron 0 so it produces output
  net.setDrive([0], 80.0);
  for (let s = 0; s < 10; s++) net.step();

  assert.ok(net.out[0] > 0, "Presynaptic neuron 0 must have active firing output");
  const trueBefore = computeTrueInput(net);
  assert.ok(Math.abs(net.inp[1] - trueBefore[1]) < 1e-2, `Pre-modification cached input (${net.inp[1]}) must match true input (${trueBefore[1]})`);

  // Step 2: Modify weight on edge 0 (0 -> 1) via setEfficacyMultiplier (10 -> 25)
  overlay.setEfficacyMultiplier(0, 2.5);

  const trueImmediately = computeTrueInput(net);
  assert.ok(
    Math.abs(net.inp[1] - trueImmediately[1]) < 1e-2,
    `Cached inp[1] (${net.inp[1]}) must immediately match true input (${trueImmediately[1]}) without phantom delay`
  );

  // Step 3: Stop drive and step until presynaptic output decays to zero
  net.setDrive([0], 0.0);
  for (let s = 0; s < 30; s++) net.step();

  const trueAfterSilence = computeTrueInput(net);
  assert.equal(trueAfterSilence[1], 0, "True expected input when presynaptic neuron is silent must be 0");
  assert.ok(
    Math.abs(net.inp[1]) < 1e-3,
    `Phantom current must not exist when presynaptic neuron is silent. Received: ${net.inp[1]}`
  );
});

test("Input-Cache Repair 2: Cache consistency during continuous modulatory learning", () => {
  const N = 3;
  const indptr = new Int32Array([0, 1, 2, 2]);
  const indices = new Int32Array([1, 2]);
  const weights = new Float32Array([10, 15]);
  const nt = new Uint8Array([0, 0, 0]);
  const size = new Float32Array([1, 1, 1]);

  const net = new RateNetwork(N, indptr, indices, weights, nt, size, {
    seed: 456,
    dt: 10,
    minSyn: 1,
    sizeNorm: false,
    b: 1.0,
  });

  const overlay = new PlasticityOverlay({
    N,
    E: 2,
    indptr,
    indices,
    baseWeights: weights.slice(),
    netWeights: net.weights,
    netInp: net.inp,
    netTheta: net.theta,
    net,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
      learningRate: 0.5,
      updateRateLimit: 2.0,
    },
    eligibleEdgeMask: [0, 1],
  });

  net.setDrive([0], 90.0);

  for (let t = 0; t < 20; t++) {
    net.step();
    overlay.updateEligibility(net.r, net.inp, net.theta);
    overlay.applyModulatoryUpdate(1.0, t);

    // After every update, cached inputs must match true input
    const trueInp = computeTrueInput(net);
    for (let i = 0; i < N; i++) {
      assert.ok(
        Math.abs(net.inp[i] - trueInp[i]) < 1e-2,
        `Step ${t}: cached net.inp[${i}] (${net.inp[i]}) diverged from true input (${trueInp[i]})`
      );
    }
  }

  // Reset and verify cache
  overlay.reset();
  const trueInpAfterReset = computeTrueInput(net);
  for (let i = 0; i < N; i++) {
    assert.ok(
      Math.abs(net.inp[i] - trueInpAfterReset[i]) < 1e-2,
      `After reset: cached net.inp[${i}] (${net.inp[i]}) diverged from true input (${trueInpAfterReset[i]})`
    );
  }
});

test("Input-Cache Repair 3: Counterfactual branch and restore input-cache synchronization", () => {
  const rt = new ConnectomeRuntime({
    seed: 18100,
    substepsPerTick: 1,
    plasticity: {
      enabled: true,
      rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
    },
  });

  // Excite sensory neuron
  rt.excite([100], 100.0);
  for (let s = 0; s < 10; s++) rt.step();

  const snap = rt.snapshot();

  // Branch B: Delta-W Reset
  rt.createCounterfactualBranch("BRANCH_B_DELTA_W_RESET", snap);
  const trueInpBranchB = computeTrueInput(rt.net);

  let maxDiff = 0;
  for (let i = 0; i < rt.N; i++) {
    const diff = Math.abs(rt.net.inp[i] - trueInpBranchB[i]);
    if (diff > maxDiff) maxDiff = diff;
  }
  assert.ok(maxDiff < 1e-4, `Max input cache difference after counterfactual branch: ${maxDiff}`);
});
