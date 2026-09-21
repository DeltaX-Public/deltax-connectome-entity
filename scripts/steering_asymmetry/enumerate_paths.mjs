/**
 * enumerate_paths.mjs
 * Phase 2 - Task 3 & 4: Two-Hop Candidate Path Enumeration & Left/Right Pathway Matching
 *
 * For RIGHT side (tactile T1 right -> intermediate -> right DNa02 332):
 * Finds every intermediate neuron m that receives >= 1 synapse from a right tactile receptor
 * and sends >= 1 synapse to right DNa02 (332).
 *
 * For LEFT side (tactile T1 left -> intermediate -> left DNa02 130496):
 * Finds every intermediate neuron m' that receives >= 1 synapse from a left tactile receptor
 * and sends >= 1 synapse to left DNa02 (130496).
 *
 * Measures:
 * - neuron index & bodyId
 * - biological cell type / label
 * - receptor -> intermediate total edge weight
 * - number of convergent tactile receptors
 * - intermediate -> DNa02 edge weight
 * - neurotransmitter type & sign (excitatory +1 vs inhibitory -1)
 * - baseline firing rate (Hz)
 * - stimulated firing rate (Hz) under 180 Hz tactile drive
 * - DNa02 contribution estimate: intermediate_rate * intermediate_to_dna02_weight * nt_sign
 *
 * Matches left and right pathways by cell type / homology.
 *
 * Outputs:
 * - artifacts/steering_asymmetry/right_tactile_path_candidates.json
 * - artifacts/steering_asymmetry/matched_left_right_paths.json
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

const LEFT_DNA02 = 130496;
const RIGHT_DNA02 = 332;
const INTENSITY = 180.0;
const SEED = 15000;

async function main() {
  console.log("=== Enumerating Concrete 2-Hop Paths: Sensory -> Intermediate -> DNa02 ===\n");

  const origCwd = process.cwd();
  process.chdir(UPSTREAM);
  let data;
  try {
    data = loadAll();
  } finally {
    process.chdir(origCwd);
  }

  const { N, indptr, indices, weights, nt, side, bodymap, meta, bodyIds } = data;

  const leftTactile = bodymap.sensors.find((s) => s.name === "tactile T1 left")?.idx || [];
  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];
  const leftTactileSet = new Set(leftTactile);
  const rightTactileSet = new Set(rightTactile);

  console.log(`Receptors: Left=${leftTactile.length}, Right=${rightTactile.length}`);

  // Build reverse lookup for DNa02 incoming edges
  // For each neuron j, find if j -> DNa02
  const presynapticToLeftDNa02 = new Map(); // j -> weight
  const presynapticToRightDNa02 = new Map(); // j -> weight

  for (let j = 0; j < N; j++) {
    const start = indptr[j];
    const end = indptr[j + 1];
    for (let k = start; k < end; k++) {
      const v = indices[k];
      const w = weights[k];
      if (v === LEFT_DNA02) presynapticToLeftDNa02.set(j, w);
      if (v === RIGHT_DNA02) presynapticToRightDNa02.set(j, w);
    }
  }

  console.log(`Direct presynaptic partners to Left DNa02: ${presynapticToLeftDNa02.size}`);
  console.log(`Direct presynaptic partners to Right DNa02: ${presynapticToRightDNa02.size}`);

  // Now find which presynaptic partners receive input from tactile receptors
  // We can scan all tactile receptors r, and look at their outgoing edges r -> m
  function find2HopIntermediates(receptorIndices, presynapticToDNa02Map, dna02Idx) {
    const intermediateMap = new Map(); // m -> { m, receptorWeight, receptorCount, dna02Weight, receptors: [] }

    for (const r of receptorIndices) {
      const start = indptr[r];
      const end = indptr[r + 1];
      for (let k = start; k < end; k++) {
        const m = indices[k];
        const w = weights[k];

        if (presynapticToDNa02Map.has(m)) {
          if (!intermediateMap.has(m)) {
            intermediateMap.set(m, {
              index: m,
              body_id: String(bodyIds[m]),
              cell_type: meta.types[m] || "unannotated",
              side: side[m],
              nt_code: nt[m],
              nt_sign: NT_SIGN[nt[m]] ?? 0,
              receptor_to_m_weight: 0,
              convergent_tactile_inputs: 0,
              m_to_dna02_weight: presynapticToDNa02Map.get(m),
              receptors: [],
            });
          }
          const entry = intermediateMap.get(m);
          entry.receptor_to_m_weight += w;
          entry.convergent_tactile_inputs += 1;
          entry.receptors.push({ receptor_idx: r, weight: w });
        }
      }
    }

    return Array.from(intermediateMap.values());
  }

  const rightIntermediates = find2HopIntermediates(rightTactile, presynapticToRightDNa02, RIGHT_DNA02);
  const leftIntermediates = find2HopIntermediates(leftTactile, presynapticToLeftDNa02, LEFT_DNA02);

  console.log(`\nDiscovered 2-hop intermediate neurons:`);
  console.log(`  Right side (tactile T1 right -> m -> right DNa02): ${rightIntermediates.length} pathways`);
  console.log(`  Left side  (tactile T1 left  -> m -> left DNa02):  ${leftIntermediates.length} pathways`);

  // Now measure baseline and stimulated firing rates for these intermediate neurons
  // We run 1 trial of baseline, 1 trial of left tactile stim, 1 trial of right tactile stim
  const runtime = new ConnectomeRuntime({ seed: SEED, substepsPerTick: 1 });

  // Baseline trial (0 Hz stim)
  runtime.net.reset();
  runtime.net.ext.fill(0);
  runtime.sensoryDrives.clear();
  for (let s = 1; s <= 20; s++) runtime.step(1);
  const baselineRates = Float32Array.from(runtime.net.r);

  // Stimulated Left trial (180 Hz)
  runtime.net.reset();
  runtime.net.ext.fill(0);
  runtime.sensoryDrives.clear();
  const leftDrive = new Map();
  for (const idx of leftTactile) leftDrive.set(idx, INTENSITY);
  for (let s = 1; s <= 30; s++) {
    if (s > 10) runtime.setSensoryDrives(leftDrive);
    runtime.step(1);
  }
  const stimLeftRates = Float32Array.from(runtime.net.r);

  // Stimulated Right trial (180 Hz)
  runtime.net.reset();
  runtime.net.ext.fill(0);
  runtime.sensoryDrives.clear();
  const rightDrive = new Map();
  for (const idx of rightTactile) rightDrive.set(idx, INTENSITY);
  for (let s = 1; s <= 30; s++) {
    if (s > 10) runtime.setSensoryDrives(rightDrive);
    runtime.step(1);
  }
  const stimRightRates = Float32Array.from(runtime.net.r);

  // Populate dynamic rates and score pathways
  // Score metric: path_coupling_score = receptor_weight * m_to_dna02_weight * nt_sign
  // functional_drive_estimate = stimulated_rate * m_to_dna02_weight * nt_sign
  function enrichPathways(pathways, stimRates) {
    for (const p of pathways) {
      const idx = p.index;
      p.baseline_rate_hz = +baselineRates[idx].toFixed(3);
      p.stimulated_rate_hz = +stimRates[idx].toFixed(3);
      p.rate_delta_hz = +(p.stimulated_rate_hz - p.baseline_rate_hz).toFixed(3);
      p.structural_coupling_score = +(p.receptor_to_m_weight * p.m_to_dna02_weight * (p.nt_sign || 1)).toFixed(2);
      p.functional_dna02_drive_estimate = +(p.stimulated_rate_hz * p.m_to_dna02_weight * p.nt_sign).toFixed(3);
    }
    // Sort descending by functional drive estimate
    pathways.sort((a, b) => b.structural_coupling_score - a.structural_coupling_score);
  }

  enrichPathways(rightIntermediates, stimRightRates);
  enrichPathways(leftIntermediates, stimLeftRates);

  // Find homologous / closest comparators for each right intermediate
  for (const rPath of rightIntermediates) {
    const match = leftIntermediates.find(l => l.cell_type === rPath.cell_type);
    rPath.left_comparator = match
      ? {
          index: match.index,
          cell_type: match.cell_type,
          receptor_to_m_weight: match.receptor_to_m_weight,
          convergent_tactile_inputs: match.convergent_tactile_inputs,
          m_to_dna02_weight: match.m_to_dna02_weight,
          stimulated_rate_hz: match.stimulated_rate_hz,
          functional_drive: match.functional_dna02_drive_estimate,
        }
      : null;
  }

  // Create matched table
  const matchedPairs = [];
  const allTypes = new Set([...leftIntermediates.map(p => p.cell_type), ...rightIntermediates.map(p => p.cell_type)]);

  for (const type of Array.from(allTypes).sort()) {
    const leftMatches = leftIntermediates.filter(p => p.cell_type === type);
    const rightMatches = rightIntermediates.filter(p => p.cell_type === type);

    matchedPairs.push({
      cell_type: type,
      left_present: leftMatches.length > 0,
      right_present: rightMatches.length > 0,
      left_instances: leftMatches,
      right_instances: rightMatches,
      left_total_structural_coupling: leftMatches.reduce((s, m) => s + m.structural_coupling_score, 0),
      right_total_structural_coupling: rightMatches.reduce((s, m) => s + m.structural_coupling_score, 0),
      left_total_dna02_drive: +leftMatches.reduce((s, m) => s + m.functional_dna02_drive_estimate, 0).toFixed(3),
      right_total_dna02_drive: +rightMatches.reduce((s, m) => s + m.functional_dna02_drive_estimate, 0).toFixed(3),
    });
  }

  matchedPairs.sort((a, b) => b.left_total_dna02_drive - a.left_total_dna02_drive);

  console.log("\n=== TOP 10 RIGHT 2-HOP CANDIDATE PATHWAYS ===");
  console.table(
    rightIntermediates.slice(0, 10).map(p => ({
      index: p.index,
      type: p.cell_type,
      nt_sign: p.nt_sign > 0 ? "EXC(+)" : "INH(-)",
      rec_w: p.receptor_to_m_weight,
      dn_w: p.m_to_dna02_weight,
      conv_inputs: p.convergent_tactile_inputs,
      stim_rate: p.stimulated_rate_hz,
      drive_est: p.functional_dna02_drive_estimate,
    }))
  );

  console.log("\n=== TOP 10 MATCHED LEFT VS RIGHT PATHWAYS ===");
  console.table(
    matchedPairs.slice(0, 10).map(m => ({
      type: m.cell_type,
      L_count: m.left_instances.length,
      R_count: m.right_instances.length,
      L_rec_w: m.left_instances.reduce((s, i) => s + i.receptor_to_m_weight, 0),
      R_rec_w: m.right_instances.reduce((s, i) => s + i.receptor_to_m_weight, 0),
      L_dn_w: m.left_instances.reduce((s, i) => s + i.m_to_dna02_weight, 0),
      R_dn_w: m.right_instances.reduce((s, i) => s + i.m_to_dna02_weight, 0),
      L_stim_hz: +m.left_instances.reduce((s, i) => s + i.stimulated_rate_hz, 0).toFixed(2),
      R_stim_hz: +m.right_instances.reduce((s, i) => s + i.stimulated_rate_hz, 0).toFixed(2),
      L_drive: m.left_total_dna02_drive,
      R_drive: m.right_total_dna02_drive,
    }))
  );

  // Write artifacts
  const outPathRight = path.join(ROOT, "artifacts", "steering_asymmetry", "right_tactile_path_candidates.json");
  fs.writeFileSync(
    outPathRight,
    JSON.stringify(
      {
        schema: "steering_asymmetry.right_tactile_path_candidates.v1",
        timestamp: new Date().toISOString(),
        total_right_2hop_intermediates: rightIntermediates.length,
        ranking_metric: "structural_coupling_score = receptor_weight * m_to_dna02_weight * nt_sign; functional_drive = stimulated_rate * m_to_dna02_weight * nt_sign",
        candidates: rightIntermediates,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`\nArtifact written: ${outPathRight}`);

  const outPathMatched = path.join(ROOT, "artifacts", "steering_asymmetry", "matched_left_right_paths.json");
  fs.writeFileSync(
    outPathMatched,
    JSON.stringify(
      {
        schema: "steering_asymmetry.matched_left_right_paths.v1",
        timestamp: new Date().toISOString(),
        total_left_intermediates: leftIntermediates.length,
        total_right_intermediates: rightIntermediates.length,
        matched_pathways_by_cell_type: matchedPairs,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Artifact written: ${outPathMatched}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
