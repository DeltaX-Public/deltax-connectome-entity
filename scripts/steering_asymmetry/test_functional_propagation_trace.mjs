/**
 * test_functional_propagation_trace.mjs
 * Phase 2 - Task 10: Time-Resolved Causal Trace of Candidate Functional Pathways
 *
 * Tracks the identified candidate pathway millisecond-by-millisecond (1 ms resolution):
 *   tactile T1 -> AN03A008 -> DNa02
 *
 * Simultaneously records at each time step t = 1..60 ms:
 * - Receptor mean activity (Hz)
 * - Intermediate AN03A008 activity (Hz)
 * - Recurrent excitatory support into AN03A008 (model units)
 * - Direct inhibitory input into AN03A008 and DNa02 (model units)
 * - DNa02 activity (Hz)
 *
 * Compares Left pathway vs Right pathway to isolate temporal precedence and exact divergence point.
 *
 * Output: artifacts/steering_asymmetry/functional_propagation_trace.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const { ConnectomeRuntime } = await import(
  path.join(ROOT, "src", "connectome", "runtime.mjs")
);

const LEFT_DNA02 = 130496;
const RIGHT_DNA02 = 332;
const LEFT_AN03A008 = 2693;
const RIGHT_AN03A008 = 2937;

const INTENSITY = 180.0;
const SEED = 15000;

async function main() {
  console.log("=== Phase 2 - Task 10: Time-Resolved Causal Pathway Trace ===\n");

  const runtime = new ConnectomeRuntime({ seed: SEED, substepsPerTick: 1 });
  const { indptr, indices, weights, nt, bodymap } = runtime.data;
  const leftTactile = bodymap.sensors.find((s) => s.name === "tactile T1 left")?.idx || [];
  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];

  function recordPathwayTrace(targetReceptors, anIdx, dna02Idx) {
    runtime.net.reset();
    runtime.net.ext.fill(0);
    runtime.sensoryDrives.clear();

    const driveMap = new Map();
    for (const idx of targetReceptors) driveMap.set(idx, INTENSITY);

    const msRecords = [];

    for (let step = 1; step <= 60; step++) {
      if (step > 10 && step <= 35) {
        runtime.setSensoryDrives(driveMap);
      } else {
        runtime.sensoryDrives.clear();
        runtime.net.ext.fill(0);
      }

      runtime.step(1);
      const r = runtime.net.r;

      // Receptor mean rate
      let recSum = 0;
      for (const idx of targetReceptors) recSum += r[idx];
      const meanRecHz = +(recSum / targetReceptors.length).toFixed(2);

      // Intermediate AN03A008 rate
      const anHz = +r[anIdx].toFixed(4);

      // DNa02 rate
      const dna02Hz = +r[dna02Idx].toFixed(4);

      // Recurrent excitatory and inhibitory inputs into AN03A008 and DNa02
      // In ratenet: inp[i] is precomputed total signed synaptic input
      const anSynapticInp = +runtime.net.inp[anIdx].toFixed(4);
      const dna02SynapticInp = +runtime.net.inp[dna02Idx].toFixed(4);

      msRecords.push({
        step,
        time_ms: step,
        phase: step <= 10 ? "BASELINE" : step <= 35 ? "STIMULUS" : "POST",
        receptor_mean_hz: meanRecHz,
        intermediate_an03a008_hz: anHz,
        intermediate_synaptic_input: anSynapticInp,
        dna02_hz: dna02Hz,
        dna02_synaptic_input: dna02SynapticInp,
      });
    }

    return msRecords;
  }

  console.log("Recording Left Pathway Trace (Left Tactile -> Left AN03A008 -> Left DNa02)...");
  const leftTrace = recordPathwayTrace(leftTactile, LEFT_AN03A008, LEFT_DNA02);

  console.log("Recording Right Pathway Trace (Right Tactile -> Right AN03A008 -> Right DNa02)...");
  const rightTrace = recordPathwayTrace(rightTactile, RIGHT_AN03A008, RIGHT_DNA02);

  // Compare step-by-step
  const comparison = [];
  let firstDivergenceStep = null;
  let divergenceComponent = null;

  for (let s = 0; s < 60; s++) {
    const l = leftTrace[s];
    const r = rightTrace[s];
    const step = l.step;

    const anDiff = +(l.intermediate_an03a008_hz - r.intermediate_an03a008_hz).toFixed(4);
    const dnDiff = +(l.dna02_hz - r.dna02_hz).toFixed(4);

    if (step > 10 && firstDivergenceStep === null) {
      if (Math.abs(anDiff) > 1.0) {
        firstDivergenceStep = step;
        divergenceComponent = "Intermediate AN03A008 activation";
      } else if (Math.abs(dnDiff) > 0.05) {
        firstDivergenceStep = step;
        divergenceComponent = "DNa02 response";
      }
    }

    comparison.push({
      step,
      time_ms: step,
      phase: l.phase,
      left_path: {
        receptors_hz: l.receptor_mean_hz,
        an03a008_hz: l.intermediate_an03a008_hz,
        an03a008_inp: l.intermediate_synaptic_input,
        dna02_hz: l.dna02_hz,
        dna02_inp: l.dna02_synaptic_input,
      },
      right_path: {
        receptors_hz: r.receptor_mean_hz,
        an03a008_hz: r.intermediate_an03a008_hz,
        an03a008_inp: r.intermediate_synaptic_input,
        dna02_hz: r.dna02_hz,
        dna02_inp: r.dna02_synaptic_input,
      },
      an03a008_divergence_hz: anDiff,
      dna02_divergence_hz: dnDiff,
    });
  }

  console.log(`\nFirst Causal Divergence on AN03A008 Pathway:`);
  console.log(`  Step: ${firstDivergenceStep} ms (${firstDivergenceStep ? firstDivergenceStep - 10 : 0} ms post-stimulus onset)`);
  console.log(`  Component: ${divergenceComponent}\n`);

  console.log("Sample Time Points (Stimulus onset t=10..18 ms):");
  console.table(
    comparison.slice(9, 20).map((c) => ({
      ms: c.step,
      L_rec: c.left_path.receptors_hz,
      R_rec: c.right_path.receptors_hz,
      L_AN: c.left_path.an03a008_hz,
      R_AN: c.right_path.an03a008_hz,
      L_DNa02: c.left_path.dna02_hz,
      R_DNa02: c.right_path.dna02_hz,
    }))
  );

  const output = {
    schema: "steering_asymmetry.functional_propagation_trace.v1",
    timestamp: new Date().toISOString(),
    seed: SEED,
    pathway: {
      left: "tactile T1 left -> AN03A008 (idx 2693) -> left DNa02 (idx 130496)",
      right: "tactile T1 right -> AN03A008 (idx 2937) -> right DNa02 (idx 332)",
    },
    first_causal_divergence: {
      step: firstDivergenceStep,
      latency_ms: firstDivergenceStep ? firstDivergenceStep - 10 : null,
      component: divergenceComponent,
    },
    trace: comparison,
  };

  const outPath = path.join(ROOT, "artifacts", "steering_asymmetry", "functional_propagation_trace.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nArtifact written: ${outPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
