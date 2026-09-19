/**
 * Phase IV-A Graph Reachability Map.
 *
 * Computes structural topological reachability from biological sensory receptor
 * populations to descending motor command neuron populations (DNs):
 * - Minimum directed hop distance
 * - Number and fraction of reachable DN neurons
 * - Hops distribution (depth 1..6)
 * - Synaptic path counts and aggregate weight along early reachable routes
 * - Neurotransmitter composition of incoming afferents (excitatory ACh/Oct vs inhibitory GABA/Glu)
 *
 * Saves machine-readable artifact to artifacts/sensory_atlas/reachability.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const UPSTREAM = path.resolve(ROOT, "upstream", "fly-brain");
const OUT_DIR = path.join(ROOT, "artifacts", "sensory_atlas");

process.chdir(UPSTREAM);
const { loadAll } = await import(path.join(UPSTREAM, "scripts", "lib_node.mjs"));
const { DN_ROLES } = await import(path.join(UPSTREAM, "src", "sim", "motor.js"));

const NT_NAMES = ["ACh", "GABA", "Glu", "Oct", "Ser", "DA", "Tyr"];
const NT_SIGNS = [1, -1, -1, 1, 0, 0, 0]; // 1: excitatory, -1: inhibitory, 0: modulatory

async function runReachabilityAnalysis() {
  console.log("=== Loading Whole-CNS Connectome Graph for Reachability Analysis ===");
  const data = loadAll();
  const N = data.N;
  const E = data.E;
  console.log(`Loaded Graph: N = ${N.toLocaleString()} neurons, E = ${E.toLocaleString()} synapses`);

  // 1. Build DN Target Populations
  const byType = (t, s = 0) => data.byType(t, s);
  const pop = (roles, s) =>
    Object.entries(roles).flatMap(([t, w]) => byType(t, s).map((i) => ({ index: i, type: t, weight: w })));

  const dnTargets = {
    forward: pop(DN_ROLES.forward),
    backward: pop(DN_ROLES.backward),
    turn_left: pop(DN_ROLES.turn, 1),
    turn_right: pop(DN_ROLES.turn, 2),
    groom: pop(DN_ROLES.groom),
    escape: pop(DN_ROLES.escape),
    takeoff: pop(DN_ROLES.takeoff),
  };

  console.log("\nDescending Target Populations:");
  for (const [name, list] of Object.entries(dnTargets)) {
    console.log(`  ${name.padEnd(12)}: ${list.length} neurons (${list.map((n) => n.type).filter((v, i, a) => a.indexOf(v) === i).join(", ")})`);
  }

  // 2. Inventory Usable Sensory Populations
  const sensoryPops = {};

  for (const s of data.bodymap.sensors) {
    sensoryPops[s.name] = s.idx;
  }

  // Eyes / photoreceptors
  if (data.bodymap.eyes) {
    for (const e of data.bodymap.eyes) {
      const name = e.side === "left" ? "photoreceptors left" : "photoreceptors right";
      sensoryPops[name] = e.idx || [];
    }
  }

  // Priority sensor populations for the atlas
  const PRIORITY_SENSORS = [
    "tactile T1 left",
    "tactile T1 right",
    "tactile T2 left",
    "tactile T2 right",
    "tactile T3 left",
    "tactile T3 right",
    "chordotonal T1 left",
    "chordotonal T1 right",
    "taste T1 left",
    "taste T1 right",
    "labellar taste left",
    "labellar taste right",
    "thermosensory left",
    "thermosensory right",
    "hygrosensory left",
    "hygrosensory right",
    "JO wind/gravity left",
    "JO wind/gravity right",
    "JO auditory left",
    "JO auditory right",
    "wing/notum bristles left",
    "wing/notum bristles right",
    "haltere left",
    "haltere right",
    "ORN_DA2 left", // Geosmin (aversive)
    "ORN_DA2 right",
    "ORN_V left",   // CO2 (aversive)
    "ORN_V right",
    "ORN_DM1 left", // Apple / food odor
    "ORN_DM1 right",
    "ORN_DA1 left", // Pheromone
    "ORN_DA1 right",
    "photoreceptors left",
    "photoreceptors right",
  ];

  console.log(`\nAnalyzing Reachability across ${PRIORITY_SENSORS.length} sensory populations...`);

  const MAX_DEPTH = 6;
  const reachabilityMatrix = {};

  for (const sensorName of PRIORITY_SENSORS) {
    const sIndices = sensoryPops[sensorName];
    if (!sIndices || sIndices.length === 0) {
      console.warn(`Warning: sensory population ${sensorName} not found or empty`);
      continue;
    }

    const tStart = Date.now();

    // Multi-source BFS up to MAX_DEPTH
    const dist = new Int8Array(N).fill(-1);
    const pathCount = new Float64Array(N); // counts directed walks (capped/scaled)
    let frontier = new Int32Array(sIndices);

    for (const idx of sIndices) {
      dist[idx] = 0;
      pathCount[idx] = 1.0;
    }

    // Record incoming synaptic properties for neurons reached at each hop
    const hopIncomingSynapses = Array.from({ length: MAX_DEPTH + 1 }, () => []);

    for (let hop = 1; hop <= MAX_DEPTH; hop++) {
      const nextFrontier = [];
      for (let f = 0; f < frontier.length; f++) {
        const u = frontier[f];
        const uPaths = pathCount[u];
        const uNt = data.nt[u];

        for (let k = data.indptr[u], endK = data.indptr[u + 1]; k < endK; k++) {
          const v = data.indices[k];
          const w = data.weights[k];

          if (dist[v] === -1) {
            dist[v] = hop;
            nextFrontier.push(v);
          }

          if (dist[v] === hop) {
            pathCount[v] = Math.min(1e12, pathCount[v] + uPaths);
            hopIncomingSynapses[hop].push({
              source: u,
              target: v,
              weight: w,
              nt: uNt,
            });
          }
        }
      }
      frontier = new Int32Array(nextFrontier);
      if (frontier.length === 0) break;
    }

    reachabilityMatrix[sensorName] = {
      sensor_name: sensorName,
      sensor_neuron_count: sIndices.length,
      dn_reachability: {},
    };

    // Evaluate each DN role
    for (const [dnRole, dnList] of Object.entries(dnTargets)) {
      const totalDn = dnList.length;
      let reachableCount = 0;
      let minHop = null;
      const hopCounts = {};
      let totalPaths = 0;

      let achSynapses = 0;
      let gabaSynapses = 0;
      let gluSynapses = 0;
      let otherSynapses = 0;
      let totalWeight = 0;

      for (const dnNeuron of dnList) {
        const d = dist[dnNeuron.index];
        if (d > 0 && d <= MAX_DEPTH) {
          reachableCount++;
          if (minHop === null || d < minHop) minHop = d;
          hopCounts[d] = (hopCounts[d] || 0) + 1;
          totalPaths += pathCount[dnNeuron.index];
        }
      }

      // Analyze incoming synapses onto these DN neurons
      if (reachableCount > 0) {
        const dnIndexSet = new Set(dnList.map((d) => d.index));
        for (let h = minHop; h <= Math.min(MAX_DEPTH, (minHop || 1) + 1); h++) {
          for (const syn of hopIncomingSynapses[h]) {
            if (dnIndexSet.has(syn.target)) {
              totalWeight += syn.weight;
              const nt = syn.nt;
              if (nt === 0) achSynapses += syn.weight;
              else if (nt === 1) gabaSynapses += syn.weight;
              else if (nt === 2) gluSynapses += syn.weight;
              else otherSynapses += syn.weight;
            }
          }
        }
      }

      const fractionReachable = +(reachableCount / totalDn).toFixed(3);
      const excWeight = achSynapses;
      const inhWeight = gabaSynapses + gluSynapses;
      const excFraction = totalWeight > 0 ? +(excWeight / totalWeight).toFixed(3) : 0;
      const inhFraction = totalWeight > 0 ? +(inhWeight / totalWeight).toFixed(3) : 0;

      reachabilityMatrix[sensorName].dn_reachability[dnRole] = {
        dn_role: dnRole,
        dn_total_neurons: totalDn,
        dn_reachable_neurons: reachableCount,
        fraction_reachable: fractionReachable,
        min_hop_distance: minHop,
        has_directed_route: reachableCount > 0,
        hops_distribution: hopCounts,
        estimated_paths_sum: totalPaths,
        early_synaptic_weight: totalWeight,
        neurotransmitter_profile: {
          excitatory_synapses: excWeight,
          inhibitory_synapses: inhWeight,
          excitatory_fraction: excFraction,
          inhibitory_fraction: inhFraction,
        },
      };
    }

    const elapsed = Date.now() - tStart;
    process.stdout.write(`  [✓] ${sensorName.padEnd(28)} (N=${sIndices.length}) in ${elapsed}ms\n`);
  }

  // Save JSON artifact
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "reachability.json");
  const reportData = {
    schema: "sensory.reachability.v1",
    timestamp: new Date().toISOString(),
    connectome: { N, E },
    max_bfs_depth: MAX_DEPTH,
    sensory_populations_analyzed: PRIORITY_SENSORS.length,
    dn_target_populations: Object.keys(dnTargets),
    reachability: reachabilityMatrix,
  };

  fs.writeFileSync(outPath, JSON.stringify(reportData, null, 2));
  console.log(`\n=== Reachability Analysis Complete. Saved to ${outPath} ===\n`);

  // Print Summary Markdown Table for Key Pairs
  console.log("### Summary Reachability Matrix (Min Hop / Fraction Reachable)");
  console.log("| Sensory Population | Turn Left | Turn Right | Forward | Backward | Escape | Groom |");
  console.log("| :--- | :---: | :---: | :---: | :---: | :---: | :---: |");

  for (const sName of [
    "tactile T1 left", "tactile T1 right",
    "thermosensory left", "thermosensory right",
    "JO wind/gravity left", "JO wind/gravity right",
    "taste T1 left", "taste T1 right",
    "photoreceptors left", "photoreceptors right",
    "ORN_DA2 left", "ORN_V left"
  ]) {
    const r = reachabilityMatrix[sName]?.dn_reachability;
    if (!r) continue;
    const fmt = (role) => {
      const entry = r[role];
      if (!entry || !entry.has_directed_route) return "—";
      return `${entry.min_hop_distance}h (${(entry.fraction_reachable * 100).toFixed(0)}%)`;
    };
    console.log(`| **${sName}** | ${fmt("turn_left")} | ${fmt("turn_right")} | ${fmt("forward")} | ${fmt("backward")} | ${fmt("escape")} | ${fmt("groom")} |`);
  }
}

runReachabilityAnalysis().catch((err) => {
  console.error("Error in reachability analysis:", err);
  process.exit(1);
});
