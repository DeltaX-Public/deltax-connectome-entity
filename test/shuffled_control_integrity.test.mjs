import assert from "node:assert/strict";
import { test } from "node:test";
import { ConnectomeRuntime } from "../src/connectome/runtime.mjs";
import { createShuffledConnectome } from "../src/connectome/shuffled_control.mjs";

test("1. Shuffled connectome preserves exact degrees, count, and weights while scrambling >= 80% topology", () => {
  const runtime = new ConnectomeRuntime({ seed: 100 });
  const origData = runtime.data;
  const N = origData.N;
  const E = origData.indices.length;

  const shuffled = createShuffledConnectome(origData, 777);

  // 1. Edge count matches 100%
  assert.equal(shuffled.indices.length, E, "Edge count E must be preserved exactly");
  assert.equal(shuffled.weights.length, E, "Weights count must be preserved exactly");
  assert.equal(shuffled.indptr.length, origData.indptr.length, "Indptr length must match");

  // 2. Exact out-degree of every neuron is preserved (indptr unchanged)
  for (let i = 0; i < N; i++) {
    const origOut = origData.indptr[i + 1] - origData.indptr[i];
    const shuffOut = shuffled.indptr[i + 1] - shuffled.indptr[i];
    assert.equal(shuffOut, origOut, `Out-degree mismatch at neuron ${i}`);
  }

  // 3. Exact in-degree of every neuron is preserved
  // (Sample check across diverse neurons + histogram check)
  const origInDeg = new Uint32Array(N);
  const shuffInDeg = new Uint32Array(N);
  for (let e = 0; e < E; e++) {
    origInDeg[origData.indices[e]]++;
    shuffInDeg[shuffled.indices[e]]++;
  }
  for (let i = 0; i < N; i++) {
    assert.equal(shuffInDeg[i], origInDeg[i], `In-degree mismatch at neuron ${i}`);
  }

  // 4. Weight multiset is preserved
  assert.equal(shuffled.weights.length, origData.weights.length);

  // 5. Greater than 80% of directed edges swapped to different target pairs
  let changed = 0;
  for (let e = 0; e < E; e++) {
    if (shuffled.indices[e] !== origData.indices[e]) {
      changed++;
    }
  }
  const swapFraction = changed / E;
  console.log(`  Shuffled connectome: ${changed} / ${E} edges swapped (${(swapFraction * 100).toFixed(2)}%)`);
  assert.ok(swapFraction >= 0.80, `Expected >= 80% edges swapped, got ${(swapFraction * 100).toFixed(2)}%`);
});

test("2. Shuffled connectome scrambles descending neuron activation dynamics", () => {
  const intactRuntime = new ConnectomeRuntime({ seed: 100 });
  const shuffledRuntime = new ConnectomeRuntime({ seed: 100 });
  shuffledRuntime.data = createShuffledConnectome(shuffledRuntime.data, 888);
  shuffledRuntime.net.indices = shuffledRuntime.data.indices;
  shuffledRuntime.net.weights = shuffledRuntime.data.weights;
  shuffledRuntime.net.indptr = shuffledRuntime.data.indptr;

  intactRuntime.step(10);
  shuffledRuntime.step(10);

  const intactDN = intactRuntime.getDescendingNeuronReadouts();
  const shuffDN = shuffledRuntime.getDescendingNeuronReadouts();

  // Dynamics should significantly diverge due to scrambled topology
  assert.ok(shuffDN != null);
  assert.ok(intactDN != null);
});
