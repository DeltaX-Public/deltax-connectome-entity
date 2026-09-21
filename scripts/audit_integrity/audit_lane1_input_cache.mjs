import { RateNetwork } from "../../upstream/fly-brain/src/ratenet.js";
import { ConnectomeRuntime } from "../../src/connectome/runtime.mjs";
import { PLASTICITY_RULES } from "../../src/connectome/plasticity_overlay.mjs";
import fs from "fs";
import path from "path";

/**
 * LANE 1.1: Input-Cache Consistency Audit
 */
export function auditInputCacheConsistency() {
  console.log("\n=======================================================");
  console.log("LANE 1.1: INPUT-CACHE CONSISTENCY AUDIT");
  console.log("=======================================================");

  // 1. Synthetic 3-neuron chain: 0 -> 1 -> 2
  // 0 -> 1 (w=10, ACh excitatory)
  // 1 -> 2 (w=15, ACh excitatory)
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

  const fullRecompute = () => {
    const expectedInp = new Float32Array(N);
    for (let j = 0; j < N; j++) {
      const oj = net.out[j];
      if (oj === 0) continue;
      const f = net.preFactor[j] * oj;
      for (let k = net.indptr[j], e = net.indptr[j + 1]; k < e; k++) {
        expectedInp[net.indices[k]] += f * net.weights[k];
      }
    }
    return expectedInp;
  };

  // Run initial excitation
  net.setDrive([0], 80.0);
  for (let s = 0; s < 10; s++) net.step();

  const refBefore = fullRecompute();
  console.log(`Pre-modification:`);
  console.log(`  Neuron 0 out: ${net.out[0].toFixed(4)}, Neuron 1 out: ${net.out[1].toFixed(4)}`);
  console.log(`  Cached inp[1]: ${net.inp[1].toFixed(4)}, True ref inp[1]: ${refBefore[1].toFixed(4)}`);
  console.log(`  Cached inp[2]: ${net.inp[2].toFixed(4)}, True ref inp[2]: ${refBefore[2].toFixed(4)}`);

  // Modulate weight 0->1 from 10 to 25 (e.g. potentiation)
  net.weights[0] = 25.0;

  const refAfterWeightChange = fullRecompute();
  const errorImmediately = net.inp[1] - refAfterWeightChange[1];
  console.log(`\nImmediately after weight change 0->1 (10 -> 25):`);
  console.log(`  Cached net.inp[1]:    ${net.inp[1].toFixed(4)}`);
  console.log(`  True expected inp[1]: ${refAfterWeightChange[1].toFixed(4)}`);
  console.log(`  Instant Cache Divergence: ${errorImmediately.toFixed(4)} (Relative Error: ${((errorImmediately / refAfterWeightChange[1]) * 100).toFixed(2)}%)`);

  // Step network
  for (let s = 0; s < 5; s++) net.step();
  const refAfterSteps = fullRecompute();
  console.log(`\nAfter 5 additional steps:`);
  console.log(`  Cached net.inp[1]:    ${net.inp[1].toFixed(4)}`);
  console.log(`  True expected inp[1]: ${refAfterSteps[1].toFixed(4)}`);
  console.log(`  Cache Divergence:     ${(net.inp[1] - refAfterSteps[1]).toFixed(4)}`);

  // Shut off drive: observe phantom inhibitory current
  net.setDrive([0], 0.0);
  for (let s = 0; s < 20; s++) net.step();
  const refAfterZero = fullRecompute();
  console.log(`\nAfter presynaptic silence (out[0] = ${net.out[0].toFixed(4)}):`);
  console.log(`  Cached net.inp[1]:    ${net.inp[1].toFixed(4)}`);
  console.log(`  True expected inp[1]: ${refAfterZero[1].toFixed(4)}`);
  console.log(`  Phantom Current:      ${net.inp[1].toFixed(4)}`);

  return {
    instantError: errorImmediately,
    phantomCurrent: net.inp[1],
    defectConfirmed: Math.abs(errorImmediately) > 1e-4 && Math.abs(net.inp[1]) > 1e-4,
  };
}

auditInputCacheConsistency();
