/**
 * test_intermediate_rescue.mjs
 * Latent Motor Repertoire Atlas - Task 6: Intermediate Rescue Test
 *
 * For top latent candidate pathways (where structural reachability is strong but natural sensory
 * drive produces zero or near-zero recruitment), identifies plausible intermediate bridging populations
 * and stimulates them at physiologically bounded rates (5-40 Hz) across diagnostic seeds (20000..20004).
 *
 * Tests whether providing intermediate drive bypasses the upstream sensory-to-intermediate attenuation
 * and rescues downstream motor population recruitment.
 *
 * Output: artifacts/latent_repertoire/intermediate_rescue.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const UPSTREAM = path.resolve(ROOT, "upstream", "fly-brain");

const { loadAll } = await import(path.join(UPSTREAM, "scripts", "lib_node.mjs"));
const { DN_ROLES } = await import(path.join(UPSTREAM, "src", "sim", "motor.js"));
const { ConnectomeRuntime } = await import(path.join(ROOT, "src", "connectome", "runtime.mjs"));
const { generateCandidates_C_IndependentAxes } = await import(
  path.join(ROOT, "src", "connectome", "candidate_readouts.mjs")
);

const SEEDS = [20000, 20001, 20002, 20003, 20004];
const STIM_RATES = [5.0, 10.0, 20.0, 30.0, 40.0]; // Hz

async function main() {
  console.log("=== Task 6: Intermediate Rescue Test ===\n");

  const origCwd = process.cwd();
  process.chdir(UPSTREAM);
  let data;
  try {
    data = loadAll();
  } finally {
    process.chdir(origCwd);
  }

  const { meta, N, indptr, indices, weights, byType, side } = data;

  // Build reverse adjacency for target DNs: find all presynaptic inputs
  function getPresynapticInputs(targetIndices) {
    const targetSet = new Set(targetIndices);
    const preMap = new Map(); // preIdx -> total incoming weight to targets

    for (let u = 0; u < N; u++) {
      const start = indptr[u];
      const end = indptr[u + 1];
      for (let e = start; e < end; e++) {
        const v = indices[e];
        if (targetSet.has(v)) {
          const w = weights[e];
          preMap.set(u, (preMap.get(u) || 0) + w);
        }
      }
    }
    return preMap;
  }

  // Load bodymap sensors
  const bodymapPath = path.join(UPSTREAM, "public", "data", "bodymap.json");
  const bodymap = JSON.parse(fs.readFileSync(bodymapPath, "utf-8"));
  const sensorMap = new Map();
  for (const s of bodymap.sensors) {
    sensorMap.set(s.name, new Set(s.idx || []));
  }

  // Define target latent programs to evaluate
  const TARGET_TESTS = [
    {
      id: "tactile_right_to_turn_right",
      label: "Tactile T1 Right -> Turn Right Steering (DNa02)",
      sensor_name: "tactile T1 right",
      target_role: "turn_right",
      target_dn_types: ["DNa02"],
      side: 2,
      expected_candidate: "turn_right",
    },
    {
      id: "visual_to_looming_takeoff",
      label: "Visual -> Looming Takeoff (DNp02, DNp04)",
      sensor_name: "visual right",
      target_role: "takeoff",
      target_dn_types: ["DNp02", "DNp04"],
      side: 0,
      expected_candidate: "giant_fiber_escape",
    },
    {
      id: "visual_to_escape_gf",
      label: "Visual -> Giant Fiber Escape (DNp01)",
      sensor_name: "visual left",
      target_role: "escape",
      target_dn_types: ["DNp01"],
      side: 0,
      expected_candidate: "giant_fiber_escape",
    },
    {
      id: "tactile_left_to_escape_gf",
      label: "Tactile T1 Left -> Giant Fiber Escape (DNp01)",
      sensor_name: "tactile T1 left",
      target_role: "escape",
      target_dn_types: ["DNp01"],
      side: 0,
      expected_candidate: "giant_fiber_escape",
    },
    {
      id: "visual_to_forward",
      label: "Visual -> Forward Locomotion (DNg100, DNg97)",
      sensor_name: "visual left",
      target_role: "forward",
      target_dn_types: ["DNg100", "DNg97"],
      side: 0,
      expected_candidate: "locomotion_forward",
    },
  ];

  const testResults = [];

  for (const test of TARGET_TESTS) {
    console.log(`\nEvaluating Rescue for: ${test.label}`);

    // Get target DN indices
    const targetDNIndices = [];
    for (const type of test.target_dn_types) {
      const idxs = byType(type, test.side) || [];
      targetDNIndices.push(...idxs);
    }

    if (targetDNIndices.length === 0) {
      console.log(`  No target DNs found for ${test.id}`);
      continue;
    }

    // Find top presynaptic inputs to these DNs
    const preInputs = getPresynapticInputs(targetDNIndices);
    const sortedInputs = Array.from(preInputs.entries())
      .sort((a, b) => b[1] - a[1]);

    // Filter to find top 3 candidate intermediate neurons (prefer non-sensory interneurons)
    const sensorSet = sensorMap.get(test.sensor_name) || new Set();
    const candidateIntermediates = [];
    for (const [preIdx, weight] of sortedInputs) {
      if (candidateIntermediates.length >= 3) break;
      const t = meta.types[preIdx] || "unknown";
      candidateIntermediates.push({
        index: preIdx,
        type: t,
        weight_to_target: weight,
        is_direct_sensor: sensorSet.has(preIdx),
      });
    }

    console.log(`  Top intermediate candidates for ${test.target_role}:`);
    for (const cand of candidateIntermediates) {
      console.log(`    Neuron ${cand.index} (${cand.type}): weight to DN = ${cand.weight_to_target}`);
    }

    const intermediateEvaluations = [];

    for (const intermediate of candidateIntermediates) {
      const rateSweeps = [];

      for (const rate of STIM_RATES) {
        let sumDnHz = 0;
        let sumCandStrength = 0;
        let sumOffTarget = 0;

        for (const seed of SEEDS) {
          const runtime = new ConnectomeRuntime({ seed, substepsPerTick: 10 });
          runtime.net.reset();
          runtime.net.ext.fill(0);
          runtime.sensoryDrives.clear();

          // Apply intermediate stimulation for 25 ticks (10..35)
          let dnRateSum = 0;
          let candSum = 0;
          let offTargetSum = 0;
          let sampleCount = 0;

          for (let tick = 1; tick <= 40; tick++) {
            if (tick >= 10 && tick <= 35) {
              runtime.net.setRate([intermediate.index], rate);
            } else {
              runtime.net.ext[intermediate.index] = 0;
            }

            runtime.step(1);

            if (tick >= 15 && tick <= 35) {
              const dnReadouts = runtime.getDescendingNeuronReadouts();
              const cands = generateCandidates_C_IndependentAxes(dnReadouts, tick);

              // Target DN rate
              const targetReadout = dnReadouts[test.target_role];
              const dnHz = targetReadout ? (targetReadout.weighted_mean || targetReadout.mean_rate || 0) : 0;
              dnRateSum += dnHz;

              // Candidate strength
              const cand = cands.find(c => c.action_class === test.expected_candidate);
              candSum += cand ? cand.activation_strength : 0;

              // Whole network activity
              let netTotal = 0;
              for (let i = 0; i < runtime.N; i++) netTotal += runtime.net.r[i];
              offTargetSum += netTotal;

              sampleCount++;
            }
          }

          sumDnHz += dnRateSum / sampleCount;
          sumCandStrength += candSum / sampleCount;
          sumOffTarget += offTargetSum / sampleCount;
        }

        const avgDnHz = sumDnHz / SEEDS.length;
        const avgCandStrength = sumCandStrength / SEEDS.length;
        const avgOffTarget = sumOffTarget / SEEDS.length;

        rateSweeps.push({
          stim_rate_hz: rate,
          evoked_dn_rate_hz: +avgDnHz.toFixed(4),
          candidate_activation_strength: +avgCandStrength.toFixed(4),
          off_target_mean_network_hz: +avgOffTarget.toFixed(2),
          rescued: avgDnHz > 0.2 && avgCandStrength > 0.05,
        });
      }

      const anyRescued = rateSweeps.some(s => s.rescued);
      intermediateEvaluations.push({
        intermediate_index: intermediate.index,
        intermediate_type: intermediate.type,
        weight_to_target: intermediate.weight_to_target,
        rate_sweeps: rateSweeps,
        rescue_viable: anyRescued,
      });

      console.log(`    -> Intermed ${intermediate.type} (${intermediate.index}): Viable = ${anyRescued}`);
    }

    const pathwayRescued = intermediateEvaluations.some(e => e.rescue_viable);

    testResults.push({
      test_id: test.id,
      label: test.label,
      sensor: test.sensor_name,
      motor_program: test.target_role,
      target_dn_types: test.target_dn_types,
      target_dn_indices: targetDNIndices,
      intermediates_tested: intermediateEvaluations,
      pathway_rescue_viable: pathwayRescued,
      rescue_classification: pathwayRescued
        ? "INTERMEDIATE_DRIVE_RESCUES_OUTPUT"
        : "INTERMEDIATE_DRIVE_INSUFFICIENT",
    });
  }

  const output = {
    schema: "latent_repertoire.intermediate_rescue.v1",
    timestamp: new Date().toISOString(),
    seeds_used: SEEDS,
    stim_rates_hz: STIM_RATES,
    total_tests: testResults.length,
    tests: testResults,
  };

  const outPath = path.join(ROOT, "artifacts", "latent_repertoire", "intermediate_rescue.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nArtifact written to: ${outPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
