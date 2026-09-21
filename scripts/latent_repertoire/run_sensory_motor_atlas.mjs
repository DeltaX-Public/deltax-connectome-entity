/**
 * run_sensory_motor_atlas.mjs
 * Latent Motor Repertoire Atlas - Tasks 2, 3, & 4:
 *
 * 1. Executes the 20 Sensory Channels x 9 Motor Programs stimulation matrix.
 * 2. Computes complete structural reachability (min hops, cumulative weights, intermediate partners).
 * 3. Identifies and ranks Structure/Function Mismatches (structurally reachable but functionally silent).
 *
 * Diagnostic Seeds: 20000..20009 (N=10)
 *
 * Outputs:
 * - artifacts/latent_repertoire/sensory_motor_matrix.json
 * - artifacts/latent_repertoire/structural_reachability.json
 * - artifacts/latent_repertoire/structure_function_mismatches.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const UPSTREAM = path.resolve(ROOT, "upstream", "fly-brain");

const { loadAll } = await import(path.join(UPSTREAM, "scripts", "lib_node.mjs"));
const { DN_ROLES } = await import(path.join(UPSTREAM, "src", "sim", "motor.js"));
const { NT_SIGN } = await import(path.join(UPSTREAM, "src", "ratenet.js"));
const { ConnectomeRuntime } = await import(path.join(ROOT, "src", "connectome", "runtime.mjs"));
const { generateCandidates_C_IndependentAxes } = await import(
  path.join(ROOT, "src", "connectome", "candidate_readouts.mjs")
);

const INTENSITY = 180.0;
const SEEDS = Array.from({ length: 10 }, (_, i) => 20000 + i);

async function main() {
  console.log("=== Tasks 2, 3, & 4: Sensory x Motor Response Matrix & Structural Reachability ===\n");

  const origCwd = process.cwd();
  process.chdir(UPSTREAM);
  let data;
  try {
    data = loadAll();
  } finally {
    process.chdir(origCwd);
  }

  const { N, indptr, indices, weights, nt, side, bodymap, meta, byType } = data;

  // 1. Define Sensory Channels (20 channels, 10 bilateral pairs)
  const SENSORY_CHANNELS = [
    { name: "tactile T1 left", group: "tactile_T1", side: "left", idx: bodymap.sensors.find(s => s.name === "tactile T1 left")?.idx || [] },
    { name: "tactile T1 right", group: "tactile_T1", side: "right", idx: bodymap.sensors.find(s => s.name === "tactile T1 right")?.idx || [] },
    { name: "tactile T2 left", group: "tactile_T2", side: "left", idx: bodymap.sensors.find(s => s.name === "tactile T2 left")?.idx || [] },
    { name: "tactile T2 right", group: "tactile_T2", side: "right", idx: bodymap.sensors.find(s => s.name === "tactile T2 right")?.idx || [] },
    { name: "tactile T3 left", group: "tactile_T3", side: "left", idx: bodymap.sensors.find(s => s.name === "tactile T3 left")?.idx || [] },
    { name: "tactile T3 right", group: "tactile_T3", side: "right", idx: bodymap.sensors.find(s => s.name === "tactile T3 right")?.idx || [] },
    { name: "JO wind/gravity left", group: "jo_wind", side: "left", idx: bodymap.sensors.find(s => s.name === "JO wind/gravity left")?.idx || [] },
    { name: "JO wind/gravity right", group: "jo_wind", side: "right", idx: bodymap.sensors.find(s => s.name === "JO wind/gravity right")?.idx || [] },
    { name: "JO auditory left", group: "jo_auditory", side: "left", idx: bodymap.sensors.find(s => s.name === "JO auditory left")?.idx || [] },
    { name: "JO auditory right", group: "jo_auditory", side: "right", idx: bodymap.sensors.find(s => s.name === "JO auditory right")?.idx || [] },
    { name: "thermosensory left", group: "thermo", side: "left", idx: bodymap.sensors.find(s => s.name === "thermosensory left")?.idx || [] },
    { name: "thermosensory right", group: "thermo", side: "right", idx: bodymap.sensors.find(s => s.name === "thermosensory right")?.idx || [] },
    { name: "taste T1 left", group: "taste_T1", side: "left", idx: bodymap.sensors.find(s => s.name === "taste T1 left")?.idx || [] },
    { name: "taste T1 right", group: "taste_T1", side: "right", idx: bodymap.sensors.find(s => s.name === "taste T1 right")?.idx || [] },
    { name: "visual left", group: "visual", side: "left", idx: bodymap.eyes?.find(e => e.side === "left")?.idx || [] },
    { name: "visual right", group: "visual", side: "right", idx: bodymap.eyes?.find(e => e.side === "right")?.idx || [] },
    { name: "wing/notum bristles left", group: "wing_bristles", side: "left", idx: bodymap.sensors.find(s => s.name === "wing/notum bristles left")?.idx || [] },
    { name: "wing/notum bristles right", group: "wing_bristles", side: "right", idx: bodymap.sensors.find(s => s.name === "wing/notum bristles right")?.idx || [] },
    { name: "haltere left", group: "haltere", side: "left", idx: bodymap.sensors.find(s => s.name === "haltere left")?.idx || [] },
    { name: "haltere right", group: "haltere", side: "right", idx: bodymap.sensors.find(s => s.name === "haltere right")?.idx || [] },
  ];

  console.log(`Audited ${SENSORY_CHANNELS.length} sensory channels.`);

  // 2. Define Motor Output Populations
  const MOTOR_POPULATIONS = [
    {
      id: "forward",
      label: "Forward Locomotion",
      roles: DN_ROLES.forward,
      side_filter: null, // bilateral
    },
    {
      id: "backward",
      label: "Backward Locomotion (MDN)",
      roles: DN_ROLES.backward,
      side_filter: null,
    },
    {
      id: "turn_left",
      label: "Turn Left Steering",
      roles: DN_ROLES.turn,
      side_filter: 1, // Left
    },
    {
      id: "turn_right",
      label: "Turn Right Steering",
      roles: DN_ROLES.turn,
      side_filter: 2, // Right
    },
    {
      id: "escape",
      label: "Giant Fiber Escape (DNp01)",
      roles: DN_ROLES.escape,
      side_filter: null,
    },
    {
      id: "takeoff",
      label: "Looming Takeoff (DNp02, DNp04)",
      roles: DN_ROLES.takeoff,
      side_filter: null,
    },
    {
      id: "groom",
      label: "Anterior Grooming (DNg07, DNg08)",
      roles: DN_ROLES.groom,
      side_filter: null,
    },
    {
      id: "courtP",
      label: "Courtship Song (pIP10)",
      roles: DN_ROLES.courtP,
      side_filter: null,
    },
    {
      id: "courtDN",
      label: "Courtship Pursuit (DNp13)",
      roles: DN_ROLES.courtDN,
      side_filter: null,
    },
  ];

  // Map each motor population to its constituent neuron indices
  for (const m of MOTOR_POPULATIONS) {
    m.neuron_indices = [];
    for (const [type, weight] of Object.entries(m.roles)) {
      const idxs = byType(type, m.side_filter || 0) || [];
      for (const i of idxs) {
        m.neuron_indices.push({ index: i, type, weight });
      }
    }
  }

  // =======================================================
  // PART A: STRUCTURAL REACHABILITY (BFS FOR ALL PAIRS)
  // =======================================================
  console.log("Computing Structural Reachability for all 20 x 9 pairs...");
  const structuralMatrix = {};

  for (const sensor of SENSORY_CHANNELS) {
    structuralMatrix[sensor.name] = {};
    const sourceIndices = sensor.idx;

    if (sourceIndices.length === 0) {
      for (const motor of MOTOR_POPULATIONS) {
        structuralMatrix[sensor.name][motor.id] = { reachable: false, min_hops: -1, cumulative_weight: 0 };
      }
      continue;
    }

    // BFS up to 3 hops
    const dist = new Int8Array(N).fill(-1);
    const hopFrontiers = [];
    let frontier = new Set(sourceIndices);
    for (const idx of sourceIndices) dist[idx] = 0;
    hopFrontiers.push(Array.from(frontier));

    for (let d = 1; d <= 3; d++) {
      const nextFrontier = new Set();
      for (const u of frontier) {
        for (let k = indptr[u]; k < indptr[u + 1]; k++) {
          const v = indices[k];
          if (dist[v] === -1) {
            dist[v] = d;
            nextFrontier.add(v);
          }
        }
      }
      hopFrontiers.push(Array.from(nextFrontier));
      frontier = nextFrontier;
      if (frontier.size === 0) break;
    }

    // Measure reachability to each motor population
    for (const motor of MOTOR_POPULATIONS) {
      const targetIndices = motor.neuron_indices.map(n => n.index);
      let minHop = -1;
      let cumWeight = 0;
      let hits = 0;

      for (const target of targetIndices) {
        if (dist[target] > 0) {
          if (minHop === -1 || dist[target] < minHop) minHop = dist[target];
          hits++;
        }
      }

      // Compute cumulative incoming weight from the last hop before target
      // For each target, sum incoming edges from all nodes in hopFrontiers[minHop - 1]
      if (minHop > 0) {
        const prevHopSet = new Set(hopFrontiers[minHop - 1]);
        for (const target of targetIndices) {
          // find incoming to target
          for (const u of prevHopSet) {
            for (let k = indptr[u]; k < indptr[u + 1]; k++) {
              if (indices[k] === target) {
                cumWeight += weights[k];
              }
            }
          }
        }
      }

      structuralMatrix[sensor.name][motor.id] = {
        reachable: minHop > 0,
        min_hops: minHop,
        target_hits: hits,
        total_targets: targetIndices.length,
        cumulative_incoming_weight: cumWeight,
      };
    }
  }

  // =======================================================
  // PART B: FUNCTIONAL SENSORY x MOTOR RESPONSE MATRIX
  // =======================================================
  console.log("\nExecuting Functional Sensory x Motor Matrix Trials (20 sensory channels x 10 seeds)...");
  const functionalMatrix = {};

  for (const sensor of SENSORY_CHANNELS) {
    functionalMatrix[sensor.name] = {};
    console.log(`Testing sensory channel: ${sensor.name} (${sensor.idx.length} receptors)...`);

    if (sensor.idx.length === 0) {
      for (const motor of MOTOR_POPULATIONS) {
        functionalMatrix[sensor.name][motor.id] = {
          mean_evoked_hz: 0,
          peak_hz: 0,
          onset_latency_ms: -1,
          candidate_strength: 0,
        };
      }
      continue;
    }

    // Run across 10 seeds
    const trialResults = [];
    const driveMap = new Map();
    for (const idx of sensor.idx) driveMap.set(idx, INTENSITY);

    for (const seed of SEEDS) {
      const runtime = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
      runtime.net.reset();
      runtime.net.ext.fill(0);
      runtime.sensoryDrives.clear();

      const timeSeries = [];

      for (let step = 1; step <= 50; step++) {
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

          // Record population rates
          const stepRec = { step };
          for (const motor of MOTOR_POPULATIONS) {
            let sumRate = 0;
            let sumWeight = 0;
            for (const n of motor.neuron_indices) {
              sumRate += runtime.net.r[n.index] * n.weight;
              sumWeight += n.weight;
            }
            const weightedMean = sumWeight > 0 ? sumRate / sumWeight : 0;
            stepRec[motor.id] = weightedMean;
          }

          // Candidate strengths
          stepRec.cand_fwd = cands.find(c => c.action_class === "locomotion_forward")?.activation_strength || 0;
          stepRec.cand_back = cands.find(c => c.action_class === "locomotion_backward")?.activation_strength || 0;
          stepRec.cand_turn_left = cands.find(c => c.action_class === "turn_left")?.activation_strength || 0;
          stepRec.cand_turn_right = cands.find(c => c.action_class === "turn_right")?.activation_strength || 0;
          stepRec.cand_escape = cands.find(c => c.action_class === "giant_fiber_escape")?.activation_strength || 0;
          stepRec.cand_groom = cands.find(c => c.action_class === "groom")?.activation_strength || 0;

          timeSeries.push(stepRec);
        }
      }

      trialResults.push(timeSeries);
    }

    // Aggregate across seeds for each motor population
    for (const motor of MOTOR_POPULATIONS) {
      let grandSum = 0;
      let grandPeak = 0;
      let onsetStepSum = 0;
      let onsetValidCount = 0;

      for (const series of trialResults) {
        const rates = series.map(s => s[motor.id]);
        const meanTrial = rates.reduce((a, b) => a + b, 0) / rates.length;
        const peakTrial = Math.max(...rates);
        grandSum += meanTrial;
        if (peakTrial > grandPeak) grandPeak = peakTrial;

        const firstOver = series.find(s => s[motor.id] > 0.05);
        if (firstOver) {
          onsetStepSum += (firstOver.step - 10);
          onsetValidCount++;
        }
      }

      const meanEvoked = +(grandSum / trialResults.length).toFixed(4);
      const meanPeak = +grandPeak.toFixed(4);
      const avgLatency = onsetValidCount > 0 ? +(onsetStepSum / onsetValidCount).toFixed(1) : -1;

      // Candidate strength mapping where applicable
      let meanCand = 0;
      if (motor.id === "forward") meanCand = +(trialResults.flatMap(s => s.map(x => x.cand_fwd)).reduce((a, b) => a + b, 0) / (trialResults.length * 25)).toFixed(4);
      if (motor.id === "backward") meanCand = +(trialResults.flatMap(s => s.map(x => x.cand_back)).reduce((a, b) => a + b, 0) / (trialResults.length * 25)).toFixed(4);
      if (motor.id === "turn_left") meanCand = +(trialResults.flatMap(s => s.map(x => x.cand_turn_left)).reduce((a, b) => a + b, 0) / (trialResults.length * 25)).toFixed(4);
      if (motor.id === "turn_right") meanCand = +(trialResults.flatMap(s => s.map(x => x.cand_turn_right)).reduce((a, b) => a + b, 0) / (trialResults.length * 25)).toFixed(4);
      if (motor.id === "escape" || motor.id === "takeoff") meanCand = +(trialResults.flatMap(s => s.map(x => x.cand_escape)).reduce((a, b) => a + b, 0) / (trialResults.length * 25)).toFixed(4);
      if (motor.id === "groom") meanCand = +(trialResults.flatMap(s => s.map(x => x.cand_groom)).reduce((a, b) => a + b, 0) / (trialResults.length * 25)).toFixed(4);

      functionalMatrix[sensor.name][motor.id] = {
        mean_evoked_hz: meanEvoked,
        peak_hz: meanPeak,
        onset_latency_ms: avgLatency,
        candidate_strength: meanCand,
      };
    }
  }

  // =======================================================
  // PART C: IDENTIFY STRUCTURE/FUNCTION MISMATCHES
  // =======================================================
  console.log("\nIdentifying Structure/Function Mismatches...");
  const mismatches = [];

  for (const sensor of SENSORY_CHANNELS) {
    for (const motor of MOTOR_POPULATIONS) {
      const struct = structuralMatrix[sensor.name][motor.id];
      const func = functionalMatrix[sensor.name][motor.id];

      // Criteria for Mismatch:
      // 1. Structurally reachable in 2 or 3 hops with non-trivial cumulative incoming weight (>50)
      // 2. Functional mean evoked rate is very weak (<0.05 Hz)
      const hasStrongStructure = struct.reachable && struct.min_hops <= 3 && struct.cumulative_incoming_weight >= 50;
      const hasWeakFunction = func.mean_evoked_hz < 0.05;

      if (hasStrongStructure && hasWeakFunction) {
        // Compute mismatch severity score = cumulative_incoming_weight / (mean_evoked_hz + 0.01)
        const severityScore = +(struct.cumulative_incoming_weight / (func.mean_evoked_hz + 0.005)).toFixed(1);

        mismatches.push({
          sensory_modality: sensor.name,
          sensory_group: sensor.group,
          sensory_side: sensor.side,
          motor_program: motor.id,
          motor_label: motor.label,
          min_hops: struct.min_hops,
          cumulative_incoming_weight: struct.cumulative_incoming_weight,
          mean_evoked_hz: func.mean_evoked_hz,
          peak_hz: func.peak_hz,
          candidate_strength: func.candidate_strength,
          mismatch_severity_score: severityScore,
          classification: func.mean_evoked_hz < 0.005 ? "STRUCTURALLY_PRESENT_BUT_DYNAMICALLY_SILENT" : "STRUCTURALLY_PRESENT_BUT_WEAKLY_RECRUITED",
        });
      }
    }
  }

  // Sort descending by mismatch severity
  mismatches.sort((a, b) => b.mismatch_severity_score - a.mismatch_severity_score);

  console.log(`\nDiscovered ${mismatches.length} total Structure/Function Mismatches across the 20x9 matrix.`);
  console.log("\nTop 15 Structure/Function Mismatches:");
  console.table(
    mismatches.slice(0, 15).map(m => ({
      sensor: m.sensory_modality,
      motor: m.motor_label,
      hops: m.min_hops,
      cum_w: m.cumulative_incoming_weight,
      evoked_hz: m.mean_evoked_hz,
      severity: m.mismatch_severity_score,
      class: m.classification,
    }))
  );

  // Write artifacts
  const outPathStruct = path.join(ROOT, "artifacts", "latent_repertoire", "structural_reachability.json");
  fs.writeFileSync(
    outPathStruct,
    JSON.stringify(
      {
        schema: "latent_repertoire.structural_reachability.v1",
        timestamp: new Date().toISOString(),
        total_sensory_channels: SENSORY_CHANNELS.length,
        total_motor_programs: MOTOR_POPULATIONS.length,
        matrix: structuralMatrix,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`\nArtifact written: ${outPathStruct}`);

  const outPathFunc = path.join(ROOT, "artifacts", "latent_repertoire", "sensory_motor_matrix.json");
  fs.writeFileSync(
    outPathFunc,
    JSON.stringify(
      {
        schema: "latent_repertoire.sensory_motor_matrix.v1",
        timestamp: new Date().toISOString(),
        intensity_hz: INTENSITY,
        seeds: SEEDS,
        matrix: functionalMatrix,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Artifact written: ${outPathFunc}`);

  const outPathMismatch = path.join(ROOT, "artifacts", "latent_repertoire", "structure_function_mismatches.json");
  fs.writeFileSync(
    outPathMismatch,
    JSON.stringify(
      {
        schema: "latent_repertoire.structure_function_mismatches.v1",
        timestamp: new Date().toISOString(),
        total_mismatches: mismatches.length,
        ranking_metric: "mismatch_severity_score = cumulative_incoming_weight / (mean_evoked_hz + 0.005)",
        mismatches,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Artifact written: ${outPathMismatch}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
