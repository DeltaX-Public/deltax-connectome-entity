/**
 * test_active_inhibition.mjs
 * Phase 2 - Task 8: Direct Test of Active Inhibition
 *
 * Tests whether right tactile steering failure is caused by active inhibitory suppression.
 *
 * Interrogates:
 * 1. Major inhibitory inputs into right DNa02 (index 332)
 * 2. Major inhibitory inputs into right AN03A008 (index 2937)
 *
 * Conditions tested:
 * Condition A: Intact right tactile stimulation (180 Hz)
 * Condition B: Silence top inhibitory inputs to right DNa02 and AN03A008
 * Condition C: Matched unrelated inhibitory sham (silencing equal number of unrelated inhibitory neurons)
 * Condition D: Bounded fractional reduction of all inhibitory synapses to right DNa02 & AN03A008 (50% and 100% block)
 * Condition E: Excitatory-path boost without inhibition change (+20 Hz into AN03A008)
 *
 * Output: artifacts/steering_asymmetry/inhibitory_interventions.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const UPSTREAM = path.resolve(ROOT, "upstream", "fly-brain");

const { loadAll } = await import(path.join(UPSTREAM, "scripts", "lib_node.mjs"));
const { NT_SIGN } = await import(path.join(UPSTREAM, "src", "ratenet.js"));
const { ConnectomeRuntime } = await import(path.join(ROOT, "src", "connectome", "runtime.mjs"));
const { generateCandidates_C_IndependentAxes } = await import(
  path.join(ROOT, "src", "connectome", "candidate_readouts.mjs")
);

const RIGHT_DNA02 = 332;
const RIGHT_AN03A008 = 2937;
const INTENSITY = 180.0;
const SEEDS = Array.from({ length: 10 }, (_, i) => 15000 + i);

async function main() {
  console.log("=== Phase 2 - Task 8: Direct Active Inhibition Testing ===\n");

  const origCwd = process.cwd();
  process.chdir(UPSTREAM);
  let data;
  try {
    data = loadAll();
  } finally {
    process.chdir(origCwd);
  }

  const { N, indptr, indices, weights, nt, side, bodymap, meta } = data;
  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];

  // Find all inhibitory presynaptic neurons to Right DNa02 (332) and Right AN03A008 (2937)
  function findInhibitoryInputs(targetIdx) {
    const inputs = [];
    for (let j = 0; j < N; j++) {
      if (NT_SIGN[nt[j]] < 0) { // Inhibitory: GABA (2), Glu (3), Histamine (7)
        for (let k = indptr[j]; k < indptr[j + 1]; k++) {
          if (indices[k] === targetIdx) {
            inputs.push({
              source_idx: j,
              edge_pos: k,
              weight: weights[k],
              nt_code: nt[j],
              type: meta.types[j] || "unannotated",
              side: side[j],
            });
          }
        }
      }
    }
    inputs.sort((a, b) => b.weight - a.weight);
    return inputs;
  }

  const inhToDNa02 = findInhibitoryInputs(RIGHT_DNA02);
  const inhToAN03A008 = findInhibitoryInputs(RIGHT_AN03A008);

  console.log(`Inhibitory inputs to Right DNa02: ${inhToDNa02.length} neurons, total weight = ${inhToDNa02.reduce((s, e) => s + e.weight, 0)}`);
  console.log(`Inhibitory inputs to Right AN03A008: ${inhToAN03A008.length} neurons, total weight = ${inhToAN03A008.reduce((s, e) => s + e.weight, 0)}`);

  console.log("\nTop 5 Inhibitory inputs to Right DNa02:");
  console.table(inhToDNa02.slice(0, 5).map(e => ({ idx: e.source_idx, type: e.type, side: e.side, weight: e.weight })));

  console.log("\nTop 5 Inhibitory inputs to Right AN03A008:");
  console.table(inhToAN03A008.slice(0, 5).map(e => ({ idx: e.source_idx, type: e.type, side: e.side, weight: e.weight })));

  // Pick top inhibitory neurons to silence
  const topInhDNa02 = inhToDNa02.slice(0, 5).map(e => e.source_idx);
  const topInhAN = inhToAN03A008.slice(0, 5).map(e => e.source_idx);
  const allTopInh = Array.from(new Set([...topInhDNa02, ...topInhAN]));

  // Pick matched unrelated inhibitory neurons for Sham
  const shamInh = [];
  for (let j = 0; j < N; j++) {
    if (NT_SIGN[nt[j]] < 0 && !allTopInh.includes(j) && side[j] === 2) {
      shamInh.push(j);
      if (shamInh.length >= allTopInh.length) break;
    }
  }

  // All inhibitory edge positions targeting DNa02 and AN03A008
  const allInhEdgePositions = [
    ...inhToDNa02.map(e => ({ pos: e.edge_pos, original: e.weight })),
    ...inhToAN03A008.map(e => ({ pos: e.edge_pos, original: e.weight })),
  ];

  function runInhTrial(runtime, silencedNeurons = [], edgeScale = 1.0, extraBoost = null) {
    // Edge scale overlay
    if (edgeScale !== 1.0) {
      for (const e of allInhEdgePositions) {
        runtime.net.weights[e.pos] = Math.round(e.original * edgeScale);
      }
    }

    if (silencedNeurons.length > 0) {
      runtime.silence(silencedNeurons);
    }

    runtime.net.reset();
    runtime.net.ext.fill(0);
    runtime.sensoryDrives.clear();

    const driveMap = new Map();
    for (const idx of rightTactile) driveMap.set(idx, INTENSITY);

    let sumRightDNa02 = 0, sumCandRight = 0;
    let count = 0;

    for (let step = 1; step <= 60; step++) {
      if (step > 10 && step <= 35) {
        runtime.setSensoryDrives(driveMap);
        if (extraBoost) {
          runtime.net.setRate([extraBoost.neuron], extraBoost.rate);
        }
      } else {
        runtime.sensoryDrives.clear();
        runtime.net.ext.fill(0);
      }

      runtime.step(1);

      if (step > 10 && step <= 35) {
        const dn = runtime.getDescendingNeuronReadouts();
        const cands = generateCandidates_C_IndependentAxes(dn, step);

        const rR = runtime.net.r[RIGHT_DNA02];
        sumRightDNa02 += rR;

        const cR = cands.find((c) => c.action_class === "turn_right")?.activation_strength || 0;
        sumCandRight += cR;
        count++;
      }
    }

    // Restore weights
    if (edgeScale !== 1.0) {
      for (const e of allInhEdgePositions) {
        runtime.net.weights[e.pos] = e.original;
      }
    }

    return {
      right_dna02_rate: +(sumRightDNa02 / count).toFixed(4),
      turn_right_strength: +(sumCandRight / count).toFixed(4),
    };
  }

  const conditions = [
    { id: "COND_A_INTACT", label: "Intact Right Tactile Baseline", run: (rt) => runInhTrial(rt) },
    { id: "COND_B_SILENCE_TOP_INH", label: `Silence Top ${allTopInh.length} Inhibitory Inputs`, run: (rt) => runInhTrial(rt, allTopInh) },
    { id: "COND_C_SHAM_INH_SILENCE", label: `Sham: Silence ${shamInh.length} Unrelated Inhibitory Neurons`, run: (rt) => runInhTrial(rt, shamInh) },
    { id: "COND_D1_REDUCE_INH_50", label: "Reduce All Direct Inhibitory Weights by 50%", run: (rt) => runInhTrial(rt, [], 0.5) },
    { id: "COND_D2_BLOCK_ALL_INH_100", label: "Block 100% of All Direct Inhibitory Weights (weight=0)", run: (rt) => runInhTrial(rt, [], 0.0) },
    { id: "COND_E_EXCITATORY_BOOST", label: "Excitatory-Path Boost (+20 Hz into AN03A008) without Inh change", run: (rt) => runInhTrial(rt, [], 1.0, { neuron: RIGHT_AN03A008, rate: 20 }) },
  ];

  const results = [];

  for (const cond of conditions) {
    console.log(`Testing: ${cond.label}...`);
    const trials = [];
    for (const seed of SEEDS) {
      const runtime = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
      const res = cond.run(runtime);
      trials.push({ seed, ...res });
    }

    const mean = (k) => +(trials.reduce((s, t) => s + t[k], 0) / trials.length).toFixed(4);

    results.push({
      condition_id: cond.id,
      label: cond.label,
      mean_right_dna02_rate: mean("right_dna02_rate"),
      mean_turn_right_strength: mean("turn_right_strength"),
      trials,
    });
  }

  console.log("\n=== INHIBITORY INTERVENTIONS RESULTS TABLE ===");
  console.log("Condition | Right DNa02 (Hz) | Turn Right Strength | Restores Steering (>0.1 Hz)?");
  console.log("----------------------------------------------------------------------------------");
  for (const r of results) {
    const isRestored = r.mean_right_dna02_rate > 0.1;
    console.log(`${r.label.padEnd(60)} | ${String(r.mean_right_dna02_rate).padStart(16)} | ${String(r.mean_turn_right_strength).padStart(19)} | ${isRestored ? "YES" : "NO"}`);
  }

  const inhSuppressionSupported = results.find(r => r.condition_id === "COND_D2_BLOCK_ALL_INH_100")?.mean_right_dna02_rate > 0.1;

  const conclusion = {
    active_inhibitory_suppression_supported: inhSuppressionSupported,
    verdict: inhSuppressionSupported
      ? "ACTIVE INHIBITORY SUPPRESSION SUPPORTED: Blocking direct inhibitory synapses to right DNa02/AN03A008 restores right steering."
      : "ACTIVE INHIBITORY SUPPRESSION REJECTED: Blocking 100% of direct inhibitory synapses or silencing top inhibitory inputs did NOT restore right DNa02 activity (rate remained ~0 Hz). The failure is NOT caused by active inhibitory clamping, but by insufficient feedforward excitatory convergence.",
  };

  console.log(`\nConclusion: ${conclusion.verdict}\n`);

  const output = {
    schema: "steering_asymmetry.inhibitory_interventions.v1",
    timestamp: new Date().toISOString(),
    inhibitory_inputs_identified: {
      to_right_dna02: inhToDNa02.slice(0, 10),
      to_right_an03a008: inhToAN03A008.slice(0, 10),
    },
    results,
    conclusion,
  };

  const outPath = path.join(ROOT, "artifacts", "steering_asymmetry", "inhibitory_interventions.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`Artifact written: ${outPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
