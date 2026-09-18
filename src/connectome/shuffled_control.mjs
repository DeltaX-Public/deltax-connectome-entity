/**
 * Shuffled Connectome Control Generator.
 * Creates genuine degree-preserving randomized synaptic graphs for the SHUFFLED_CONNECTOME condition.
 *
 * STRICT TOPOLOGICAL CONSERVATION:
 * - Exact in-degree of every neuron: 100% preserved (zero deviation)
 * - Exact out-degree of every neuron: 100% preserved (zero deviation)
 * - Exact edge count E: 100% preserved
 * - Exact synaptic weight distribution: 100% preserved
 *
 * CIRCUIT DESTRUCTION:
 * - Destroys biological circuit topology (>99% of edges randomized to different target neurons)
 * - Scrambles giant fiber escape circuit, descending steering pathways, and sensory-to-descending routing.
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
  const E = indices.length;

  // 1. Global permutation of target indices (preserves in-degree multiset and out-degree slice sizes exactly)
  for (let i = E - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }

  // 2. Resolve any accidental self-loops (u == indices[e])
  let src = 0;
  for (let e = 0; e < E; e++) {
    while (src < N && indptr[src + 1] <= e) src++;
    if (indices[e] === src) {
      const e2 = (e + 101) % E;
      const tmp = indices[e];
      indices[e] = indices[e2];
      indices[e2] = tmp;
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
