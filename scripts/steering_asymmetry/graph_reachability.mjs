/**
 * graph_reachability.mjs
 * Phase 6: Graph Reachability Analysis
 *
 * Computes directed structural reachability from matched sensory receptor populations
 * to Left and Right steering descending neurons (DNa02, DNa01, DNp09).
 *
 * Distinguishes:
 *   STRUCTURALLY ABSENT (no directed synaptic path exists)
 *   vs
 *   STRUCTURALLY PRESENT BUT DYNAMICALLY SILENT (paths exist, but recurrent dynamics extinguish activity)
 *
 * Output: artifacts/steering_asymmetry/graph_reachability.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const UPSTREAM = path.resolve(ROOT, "upstream", "fly-brain");

const { loadAll } = await import(path.join(UPSTREAM, "scripts", "lib_node.mjs"));
const { NT_SIGN } = await import(path.join(UPSTREAM, "src", "ratenet.js"));

async function main() {
  console.log("=== Phase 6: Graph Reachability Analysis ===\n");

  const origCwd = process.cwd();
  process.chdir(UPSTREAM);
  let data;
  try {
    data = loadAll();
  } finally {
    process.chdir(origCwd);
  }

  const { N, E, indptr, indices, weights, nt, side, bodymap } = data;
  console.log(`Graph loaded: N=${N}, E=${E}\n`);

  // Define steering DN targets
  const TARGETS = {
    left: {
      DNa02: 130496,
      DNa01: 406,
      DNp09: 725,
    },
    right: {
      DNa02: 332,
      DNa01: 704,
      DNp09: 1087,
    },
  };

  const leftTargetsSet = new Set(Object.values(TARGETS.left));
  const rightTargetsSet = new Set(Object.values(TARGETS.right));
  const allTargetsSet = new Set([...leftTargetsSet, ...rightTargetsSet]);

  // Sensory populations to evaluate
  const sensoryGroups = [
    { name: "tactile T1", left: "tactile T1 left", right: "tactile T1 right" },
    { name: "JO wind/gravity", left: "JO wind/gravity left", right: "JO wind/gravity right" },
    { name: "thermosensory", left: "thermosensory left", right: "thermosensory right" },
    { name: "taste T1", left: "taste T1 left", right: "taste T1 right" },
  ];

  const getReceptorIndices = (groupName) => {
    const group = bodymap.sensors?.find((s) => s.name === groupName);
    return group?.idx || [];
  };

  // Forward BFS up to maxDepth hops
  function analyzeReachability(sourceIndices, maxDepth = 4) {
    const dist = new Int8Array(N).fill(-1);
    const inPath = new Uint8Array(N);
    const hopSets = [];

    // Hop 0
    let currentFrontier = new Set(sourceIndices);
    for (const idx of sourceIndices) {
      dist[idx] = 0;
    }
    hopSets.push(Array.from(currentFrontier));

    const targetHits = {
      left: { DNa02: -1, DNa01: -1, DNp09: -1 },
      right: { DNa02: -1, DNa01: -1, DNp09: -1 },
    };

    const targetEdgeWeights = {
      left: { DNa02: 0, DNa01: 0, DNp09: 0 },
      right: { DNa02: 0, DNa01: 0, DNp09: 0 },
    };

    for (let depth = 1; depth <= maxDepth; depth++) {
      const nextFrontier = new Set();

      for (const u of currentFrontier) {
        const start = indptr[u];
        const end = indptr[u + 1];

        for (let k = start; k < end; k++) {
          const v = indices[k];
          const w = weights[k];

          // Check target hits
          for (const [name, targetIdx] of Object.entries(TARGETS.left)) {
            if (v === targetIdx) {
              if (targetHits.left[name] === -1) targetHits.left[name] = depth;
              targetEdgeWeights.left[name] += w;
            }
          }
          for (const [name, targetIdx] of Object.entries(TARGETS.right)) {
            if (v === targetIdx) {
              if (targetHits.right[name] === -1) targetHits.right[name] = depth;
              targetEdgeWeights.right[name] += w;
            }
          }

          if (dist[v] === -1) {
            dist[v] = depth;
            nextFrontier.add(v);
          }
        }
      }

      hopSets.push(Array.from(nextFrontier));
      currentFrontier = nextFrontier;
      if (currentFrontier.size === 0) break;
    }

    // Intermediary statistics (excitatory vs inhibitory, hemisphericity)
    const hopStats = hopSets.map((neurons, depth) => {
      let exc = 0, inh = 0, unk = 0;
      let leftSide = 0, rightSide = 0, midSide = 0;

      for (const idx of neurons) {
        const sign = NT_SIGN[nt[idx]] || 0;
        if (sign > 0) exc++;
        else if (sign < 0) inh++;
        else unk++;

        const s = side[idx];
        if (s === 1) leftSide++;
        else if (s === 2) rightSide++;
        else if (s === 3) midSide++;
      }

      return {
        depth,
        count: neurons.length,
        excitatory: exc,
        inhibitory: inh,
        unknown_nt: unk,
        hemisphere: { left: leftSide, right: rightSide, midline: midSide },
      };
    });

    return {
      target_hits: targetHits,
      target_edge_weights: targetEdgeWeights,
      hop_stats: hopStats,
    };
  }

  const results = {
    schema: "steering_asymmetry.graph_reachability.v1",
    timestamp: new Date().toISOString(),
    populations: {},
    summary: {},
  };

  for (const group of sensoryGroups) {
    console.log(`Analyzing reachability for: ${group.name}`);
    const leftIdx = getReceptorIndices(group.left);
    const rightIdx = getReceptorIndices(group.right);

    console.log(`  ${group.left} (${leftIdx.length} receptors) -> BFS maxDepth 4`);
    const reachLeft = analyzeReachability(leftIdx, 4);

    console.log(`  ${group.right} (${rightIdx.length} receptors) -> BFS maxDepth 4`);
    const reachRight = analyzeReachability(rightIdx, 4);

    results.populations[group.name] = {
      left_receptors: {
        name: group.left,
        count: leftIdx.length,
        reachability: reachLeft,
      },
      right_receptors: {
        name: group.right,
        count: rightIdx.length,
        reachability: reachRight,
      },
    };

    console.log(`  Results for ${group.name}:`);
    console.log(`    L-receptors -> L-DNa02: hop=${reachLeft.target_hits.left.DNa02}, weight=${reachLeft.target_edge_weights.left.DNa02}`);
    console.log(`    L-receptors -> R-DNa02: hop=${reachLeft.target_hits.right.DNa02}, weight=${reachLeft.target_edge_weights.right.DNa02}`);
    console.log(`    R-receptors -> L-DNa02: hop=${reachRight.target_hits.left.DNa02}, weight=${reachRight.target_edge_weights.left.DNa02}`);
    console.log(`    R-receptors -> R-DNa02: hop=${reachRight.target_hits.right.DNa02}, weight=${reachRight.target_edge_weights.right.DNa02}\n`);
  }

  // Cross-hemisphere summary
  const tactileL = results.populations["tactile T1"].left_receptors.reachability;
  const tactileR = results.populations["tactile T1"].right_receptors.reachability;

  const rightStructurallyReachable =
    tactileR.target_hits.right.DNa02 > 0 ||
    tactileR.target_hits.right.DNa01 > 0 ||
    tactileR.target_hits.right.DNp09 > 0;

  results.summary = {
    right_steering_structurally_reachable: rightStructurallyReachable,
    classification: rightStructurallyReachable
      ? "STRUCTURALLY PRESENT BUT DYNAMICALLY SILENT"
      : "STRUCTURALLY ABSENT",
    min_hops_from_receptors: {
      left_receptors_to_left_DNa02: tactileL.target_hits.left.DNa02,
      right_receptors_to_right_DNa02: tactileR.target_hits.right.DNa02,
      left_receptors_to_left_DNp09: tactileL.target_hits.left.DNp09,
      right_receptors_to_right_DNp09: tactileR.target_hits.right.DNp09,
    },
  };

  console.log(`\n======================================================`);
  console.log(`STRUCTURAL CLASSIFICATION: ${results.summary.classification}`);
  console.log(`Left tactile -> Left DNa02: ${results.summary.min_hops_from_receptors.left_receptors_to_left_DNa02} hops`);
  console.log(`Right tactile -> Right DNa02: ${results.summary.min_hops_from_receptors.right_receptors_to_right_DNa02} hops`);
  console.log(`======================================================\n`);

  const outPath = path.join(ROOT, "artifacts", "steering_asymmetry", "graph_reachability.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`Artifact written to: ${outPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
