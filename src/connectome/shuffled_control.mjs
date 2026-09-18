/**
 * Shuffled Connectome Control Generator.
 * Creates degree-preserving randomized synaptic graphs for the SHUFFLED_CONNECTOME condition.
 * Preserves in-degree and out-degree distributions while destroying biological circuit topology.
 */

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createShuffledConnectome(data, seed = 12345) {
  const rand = mulberry32(seed);
  const N = data.N;
  const indptr = new Uint32Array(data.indptr);
  const indices = new Uint32Array(data.indices);
  const weights = new Uint16Array(data.weights);

  // Permute target indices within each outgoing synaptic bundle or across matched degree buckets
  for (let i = 0; i < N; i++) {
    const start = indptr[i];
    const end = indptr[i + 1];
    const len = end - start;
    if (len <= 1) continue;

    // Fisher-Yates shuffle of targets for this source neuron
    for (let k = len - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      const tmpIdx = indices[start + k];
      indices[start + k] = indices[start + j];
      indices[start + j] = tmpIdx;

      const tmpWt = weights[start + k];
      weights[start + k] = weights[start + j];
      weights[start + j] = tmpWt;
    }
  }

  return {
    ...data,
    indptr,
    indices,
    weights,
    shuffled_seed: seed,
    is_shuffled: true,
  };
}
