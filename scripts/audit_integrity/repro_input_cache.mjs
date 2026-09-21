import { RateNetwork } from "../../upstream/fly-brain/src/ratenet.js";

function runTest() {
  console.log("=== LANE 1.1: Input-Cache Consistency Minimal Reproduction ===");

  // 2 neurons: 0 -> 1 with weight 10
  const N = 2;
  const indptr = new Int32Array([0, 1, 1]);
  const indices = new Int32Array([1]);
  const weights = new Float32Array([10]);
  const nt = new Uint8Array([0, 0]); // cholinergic excitatory
  const size = new Float32Array([1, 1]);

  const net = new RateNetwork(N, indptr, indices, weights, nt, size, {
    seed: 42,
    dt: 10,
    minSyn: 1,
    sizeNorm: false,
    b: 1.0,
  });

  // Step 1: drive neuron 0 to fire
  net.setDrive([0], 100.0);
  for (let s = 0; s < 5; s++) net.step();

  console.log(`Step 5: out[0]=${net.out[0].toFixed(4)}, inp[1]=${net.inp[1].toFixed(4)}`);
  
  // Independent reference: full recomputation
  const fullRecompute = () => {
    let expectedInp1 = 0;
    for (let j = 0; j < N; j++) {
      if (net.out[j] === 0) continue;
      const f = net.preFactor[j] * net.out[j];
      for (let k = net.indptr[j], e = net.indptr[j + 1]; k < e; k++) {
        if (net.indices[k] === 1) expectedInp1 += f * net.weights[k];
      }
    }
    return expectedInp1;
  };

  console.log(`Reference recomputed inp[1]: ${fullRecompute().toFixed(4)}`);

  // Now modify weight from 10 to 20 (as done by plasticity overlay)
  console.log("\nModifying weight from 10 to 20 (plasticity update)...");
  net.weights[0] = 20.0;

  console.log(`Immediately after weight change:`);
  console.log(`  Cached net.inp[1]:            ${net.inp[1].toFixed(4)}`);
  console.log(`  True expected inp[1]:         ${fullRecompute().toFixed(4)}`);
  console.log(`  Cache Error:                  ${(net.inp[1] - fullRecompute()).toFixed(4)}`);

  // Step network with neuron 0 still driving at same level
  net.step();
  console.log(`\nAfter 1 step with weight=20:`);
  console.log(`  Cached net.inp[1]:            ${net.inp[1].toFixed(4)}`);
  console.log(`  True expected inp[1]:         ${fullRecompute().toFixed(4)}`);
  console.log(`  Cache Error:                  ${(net.inp[1] - fullRecompute()).toFixed(4)}`);

  // Now shut off drive to neuron 0
  console.log("\nShutting off drive to neuron 0 (external drive = 0)...");
  net.setDrive([0], 0.0);
  for (let s = 0; s < 10; s++) net.step();

  console.log(`After neuron 0 stops firing (out[0]=${net.out[0].toFixed(4)}):`);
  console.log(`  Cached net.inp[1]:            ${net.inp[1].toFixed(4)}`);
  console.log(`  True expected inp[1]:         ${fullRecompute().toFixed(4)}`);
  console.log(`  Cache Error (Phantom current):${(net.inp[1] - fullRecompute()).toFixed(4)}`);

  return {
    cached: net.inp[1],
    expected: fullRecompute(),
    phantomCurrent: net.inp[1] - fullRecompute()
  };
}

runTest();
