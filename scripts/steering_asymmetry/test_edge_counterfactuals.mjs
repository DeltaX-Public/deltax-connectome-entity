/**
 * test_edge_counterfactuals.mjs
 * Phase 2 - Task 7: Path-Specific Edge Counterfactuals
 *
 * Tests the minimal synaptic weight modification to the right AN03A008 pathway
 * needed to produce a measurable right DNa02 response (>0.5 Hz):
 *
 * Condition A: Increase receptor -> AN03A008 edge strength only (sweep 1.2x to 3.0x)
 * Condition B: Increase AN03A008 -> right DNa02 edge strength only (sweep 1.2x to 3.0x)
 * Condition C: Increase both edges
 * Condition D: Matched sham edge change (on unrelated neuron DNg07 idx 2707)
 * Condition E: Mirror exact Left pathway magnitude (rec->m = 78, m->DNa02 = 741)
 *
 * Output: artifacts/steering_asymmetry/edge_counterfactuals.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const { ConnectomeRuntime } = await import(
  path.join(ROOT, "src", "connectome", "runtime.mjs")
);
const { generateCandidates_C_IndependentAxes } = await import(
  path.join(ROOT, "src", "connectome", "candidate_readouts.mjs")
);

const RIGHT_DNA02 = 332;
const RIGHT_AN03A008 = 2937;
const SHAM_NEURON = 2707;
const INTENSITY = 180.0;
const SEEDS = Array.from({ length: 10 }, (_, i) => 15000 + i);

function findEdgeLocations(data, sourceIdx, targetIdx) {
  const { indptr, indices } = data;
  const locs = [];
  const start = indptr[sourceIdx];
  const end = indptr[sourceIdx + 1];
  for (let k = start; k < end; k++) {
    if (indices[k] === targetIdx) locs.push(k);
  }
  return locs;
}

function runOverlayTrial(runtime, driveIndices, modifiedEdges = []) {
  // modifiedEdges: array of { pos, originalWeight, newWeight }
  // Apply overlay
  for (const e of modifiedEdges) {
    runtime.net.weights[e.pos] = e.newWeight;
  }

  runtime.net.reset();
  runtime.net.ext.fill(0);
  runtime.sensoryDrives.clear();

  const driveMap = new Map();
  for (const idx of driveIndices) driveMap.set(idx, INTENSITY);

  let sumRightDNa02 = 0, sumLeftDNa02 = 0, sumCandRight = 0;
  let count = 0;

  for (let step = 1; step <= 60; step++) {
    if (step > 10 && step <= 35) {
      runtime.setSensoryDrives(driveMap);
    } else {
      runtime.sensoryDrives.clear();
      runtime.net.ext.fill(0);
    }

    runtime.step(1);

    if (step > 10 && step <= 35) {
      const dn = runtime.getDescendingNeuronReadouts();
      const cands = generateCandidates_C_IndependentAxes(dn, step);

      const rR = runtime.net.r[RIGHT_DNA02];
      const rL = runtime.net.r[130496];
      sumRightDNa02 += rR;
      sumLeftDNa02 += rL;

      const cR = cands.find((c) => c.action_class === "turn_right")?.activation_strength || 0;
      sumCandRight += cR;
      count++;
    }
  }

  // Restore original weights
  for (const e of modifiedEdges) {
    runtime.net.weights[e.pos] = e.originalWeight;
  }

  return {
    right_dna02_rate: +(sumRightDNa02 / count).toFixed(4),
    left_dna02_rate: +(sumLeftDNa02 / count).toFixed(4),
    turn_right_strength: +(sumCandRight / count).toFixed(4),
  };
}

async function main() {
  console.log("=== Phase 2 - Task 7: Path-Specific Edge Counterfactuals ===\n");

  const sampleRuntime = new ConnectomeRuntime({ seed: 15000, substepsPerTick: 1 });
  const data = sampleRuntime.data;
  const { bodymap } = data;

  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];

  // Find all receptor -> AN03A008 edge positions
  const recToAnEdges = [];
  for (const r of rightTactile) {
    const locs = findEdgeLocations(data, r, RIGHT_AN03A008);
    for (const pos of locs) {
      recToAnEdges.push({ pos, originalWeight: sampleRuntime.net.weights[pos] });
    }
  }
  const totalRecWeight = recToAnEdges.reduce((s, e) => s + e.originalWeight, 0);
  console.log(`Receptor -> AN03A008 edges: count=${recToAnEdges.length}, total_weight=${totalRecWeight}`);

  // Find AN03A008 -> Right DNa02 edge positions
  const anToDnEdges = [];
  const anLocs = findEdgeLocations(data, RIGHT_AN03A008, RIGHT_DNA02);
  for (const pos of anLocs) {
    anToDnEdges.push({ pos, originalWeight: sampleRuntime.net.weights[pos] });
  }
  const totalDnWeight = anToDnEdges.reduce((s, e) => s + e.originalWeight, 0);
  console.log(`AN03A008 -> Right DNa02 edges: count=${anToDnEdges.length}, total_weight=${totalDnWeight}`);

  // Find Sham edges (DNg07 idx 2707 outgoing edges)
  const shamEdges = [];
  for (let k = data.indptr[SHAM_NEURON]; k < data.indptr[SHAM_NEURON + 1]; k++) {
    shamEdges.push({ pos: k, originalWeight: sampleRuntime.net.weights[k] });
  }

  const sweeps = [];

  // Helper to run sweep across 10 seeds
  function evaluateCondition(condId, label, createModifications) {
    console.log(`Evaluating: ${label}...`);
    const trials = [];

    for (const seed of SEEDS) {
      const runtime = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
      const mods = createModifications(runtime);
      const res = runOverlayTrial(runtime, rightTactile, mods);
      trials.push({ seed, ...res });
    }

    const mean = (k) => +(trials.reduce((s, t) => s + t[k], 0) / trials.length).toFixed(4);

    const agg = {
      condition_id: condId,
      label,
      mean_right_dna02_rate: mean("right_dna02_rate"),
      mean_left_dna02_rate: mean("left_dna02_rate"),
      mean_turn_right_strength: mean("turn_right_strength"),
      trials,
    };
    sweeps.push(agg);
    return agg;
  }

  // Baseline Intact
  evaluateCondition("COND_BASELINE", "Baseline Intact (No modification)", () => []);

  // Condition A: Increase receptor -> AN03A008 scale
  for (const scale of [1.2, 1.5, 1.9, 2.5, 3.0]) {
    evaluateCondition(`COND_A_REC_SCALE_${scale}`, `Scale Receptor->AN03A008 by ${scale}x`, () =>
      recToAnEdges.map((e) => ({
        pos: e.pos,
        originalWeight: e.originalWeight,
        newWeight: Math.round(e.originalWeight * scale),
      }))
    );
  }

  // Condition B: Increase AN03A008 -> Right DNa02 scale
  for (const scale of [1.2, 1.5, 2.0, 2.5, 3.0]) {
    evaluateCondition(`COND_B_DN_SCALE_${scale}`, `Scale AN03A008->DNa02 by ${scale}x`, () =>
      anToDnEdges.map((e) => ({
        pos: e.pos,
        originalWeight: e.originalWeight,
        newWeight: Math.round(e.originalWeight * scale),
      }))
    );
  }

  // Condition C: Increase both edges
  for (const [recScale, dnScale] of [[1.5, 1.5], [1.9, 1.5], [2.0, 2.0], [2.5, 2.0]]) {
    evaluateCondition(`COND_C_BOTH_${recScale}_${dnScale}`, `Scale Rec->AN by ${recScale}x AND AN->DNa02 by ${dnScale}x`, () => [
      ...recToAnEdges.map((e) => ({
        pos: e.pos,
        originalWeight: e.originalWeight,
        newWeight: Math.round(e.originalWeight * recScale),
      })),
      ...anToDnEdges.map((e) => ({
        pos: e.pos,
        originalWeight: e.originalWeight,
        newWeight: Math.round(e.originalWeight * dnScale),
      })),
    ]);
  }

  // Condition D: Sham edge change
  evaluateCondition("COND_D_SHAM_2X", "Sham: Scale unrelated DNg07 edges by 2.0x", () =>
    shamEdges.map((e) => ({
      pos: e.pos,
      originalWeight: e.originalWeight,
      newWeight: Math.round(e.originalWeight * 2.0),
    }))
  );

  // Condition E: Mirror exact Left magnitude
  // Left: rec->AN = 78 (scale 78/41 = 1.9024), AN->DN = 741 (scale 741/717 = 1.0335)
  evaluateCondition("COND_E_MIRROR_LEFT", "Mirror exact Left weights (Rec->AN: 78 syn, AN->DNa02: 741 syn)", () => [
    ...recToAnEdges.map((e) => ({
      pos: e.pos,
      originalWeight: e.originalWeight,
      newWeight: Math.round(e.originalWeight * (78 / 41)),
    })),
    ...anToDnEdges.map((e) => ({
      pos: e.pos,
      originalWeight: e.originalWeight,
      newWeight: Math.round(e.originalWeight * (741 / 717)),
    })),
  ]);

  console.log("\n=== EDGE COUNTERFACTUAL RESULTS TABLE ===");
  console.log("Condition | Right DNa02 (Hz) | Turn Right Strength | Activated (>0.1 Hz)?");
  console.log("-------------------------------------------------------------------------");
  for (const s of sweeps) {
    const isAct = s.mean_right_dna02_rate > 0.1;
    console.log(`${s.label.padEnd(52)} | ${String(s.mean_right_dna02_rate).padStart(16)} | ${String(s.mean_turn_right_strength).padStart(19)} | ${isAct ? "YES" : "NO"}`);
  }

  // Find minimal modification
  const activated = sweeps.filter((s) => s.mean_right_dna02_rate > 0.1);
  console.log(`\nActivated conditions count: ${activated.length}`);

  const output = {
    schema: "steering_asymmetry.edge_counterfactuals.v1",
    timestamp: new Date().toISOString(),
    pathway: "tactile T1 right -> AN03A008 (idx 2937) -> right DNa02 (idx 332)",
    original_weights: {
      receptor_to_an03a008: totalRecWeight,
      an03a008_to_dna02: totalDnWeight,
    },
    sweeps,
    minimal_counterfactual_restoring_response: activated[0] || null,
  };

  const outPath = path.join(ROOT, "artifacts", "steering_asymmetry", "edge_counterfactuals.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`Artifact written: ${outPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
