/**
 * propagation_trace.mjs
 * Phase 7: Temporal & Spatial Propagation Trace
 *
 * Captures millisecond-by-millisecond neural activity across the connectome
 * for matched Left vs Right tactile stimulation (180 Hz).
 *
 * Traces activity through concentric synaptic depths:
 *   t0: Receptors (tactile T1)
 *   t1: 1-hop post-synaptic sensory interneurons
 *   t2: 2-hop premotor interneurons
 *   t3: Descending neurons (DNa02, DNa01, DNp09)
 *
 * Localizes the EARLIEST divergence time point and ranks candidate bottleneck populations.
 *
 * Output: artifacts/steering_asymmetry/propagation_trace.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const { ConnectomeRuntime } = await import(
  path.join(ROOT, "src", "connectome", "runtime.mjs")
);

const INTENSITY = 180.0;
const SEED = 15000;
const TOTAL_STEPS = 40; // 10ms baseline + 25ms stim + 5ms post
const STIM_START = 10;
const STIM_END = 35;

async function main() {
  console.log("=== Phase 7: Propagation Trace & Causal Divergence Analysis ===\n");

  const runtime = new ConnectomeRuntime({ seed: SEED, substepsPerTick: 1 });
  const { N, indptr, indices, weights, nt, side, bodymap, meta } = runtime.data;

  const leftTactile = bodymap.sensors.find((s) => s.name === "tactile T1 left")?.idx || [];
  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];

  console.log(`Receptors: Left=${leftTactile.length}, Right=${rightTactile.length}`);

  // Find 1-hop downstream partners
  function get1Hop(sources) {
    const targets = new Set();
    for (const u of sources) {
      for (let k = indptr[u]; k < indptr[u + 1]; k++) {
        targets.add(indices[k]);
      }
    }
    return Array.from(targets);
  }

  const left1Hop = get1Hop(leftTactile);
  const right1Hop = get1Hop(rightTactile);
  const left2Hop = get1Hop(left1Hop);
  const right2Hop = get1Hop(right1Hop);

  console.log(`1-hop downstream: Left=${left1Hop.length}, Right=${right1Hop.length}`);
  console.log(`2-hop downstream: Left=${left2Hop.length}, Right=${right2Hop.length}\n`);

  // Target steering DNs
  const STEERING_DNS = {
    left_DNa02: 130496,
    right_DNa02: 332,
    left_DNa01: 406,
    right_DNa01: 704,
    left_DNp09: 725,
    right_DNp09: 1087,
  };

  // Run simulation and record full layer traces
  function runTrace(stimReceptors) {
    runtime.net.reset();
    runtime.sensoryDrives.clear();

    const drives = new Map();
    for (const idx of stimReceptors) drives.set(idx, INTENSITY);

    const timeTrace = [];

    for (let step = 1; step <= TOTAL_STEPS; step++) {
      if (step > STIM_START && step <= STIM_END) {
        runtime.setSensoryDrives(drives);
      } else {
        runtime.sensoryDrives.clear();
      }

      runtime.step(1);
      const r = runtime.net.r;

      // Layer activity sums
      const sumRates = (indicesArr) => {
        let sum = 0;
        let active = 0;
        for (let i = 0; i < indicesArr.length; i++) {
          const val = r[indicesArr[i]];
          if (val > 0.01) {
            sum += val;
            active++;
          }
        }
        return {
          mean_hz: +(sum / (indicesArr.length || 1)).toFixed(4),
          total_hz: +sum.toFixed(2),
          active_count: active,
        };
      };

      // Global hemispherics
      let leftHemiSum = 0, rightHemiSum = 0;
      for (let i = 0; i < N; i++) {
        if (r[i] > 0.01) {
          if (side[i] === 1) leftHemiSum += r[i];
          else if (side[i] === 2) rightHemiSum += r[i];
        }
      }

      timeTrace.push({
        step,
        receptors: sumRates(stimReceptors),
        downstream_1hop: sumRates(stimReceptors === leftTactile ? left1Hop : right1Hop),
        downstream_2hop: sumRates(stimReceptors === leftTactile ? left2Hop : right2Hop),
        dn_rates: {
          left_DNa02: +r[STEERING_DNS.left_DNa02].toFixed(4),
          right_DNa02: +r[STEERING_DNS.right_DNa02].toFixed(4),
          left_DNp09: +r[STEERING_DNS.left_DNp09].toFixed(4),
          right_DNp09: +r[STEERING_DNS.right_DNp09].toFixed(4),
        },
        hemisphere: {
          left_total_hz: +leftHemiSum.toFixed(2),
          right_total_hz: +rightHemiSum.toFixed(2),
        },
        rate_snapshot: Float32Array.from(r), // for population diffing
      });
    }

    return timeTrace;
  }

  console.log("Running Trace 1: Left Tactile Stimulation...");
  const traceLeft = runTrace(leftTactile);

  console.log("Running Trace 2: Right Tactile Stimulation...");
  const traceRight = runTrace(rightTactile);

  // Find earliest divergence step
  let earliestDivergenceStep = null;
  let divergenceLayer = null;
  const timeSeriesComparison = [];

  for (let s = 0; s < TOTAL_STEPS; s++) {
    const l = traceLeft[s];
    const r = traceRight[s];
    const step = l.step;

    const diff1Hop = Math.abs(l.downstream_1hop.total_hz - r.downstream_1hop.total_hz);
    const diff2Hop = Math.abs(l.downstream_2hop.total_hz - r.downstream_2hop.total_hz);
    const diffDN = Math.abs(l.dn_rates.left_DNa02 - r.dn_rates.right_DNa02);

    if (step > STIM_START && earliestDivergenceStep === null) {
      if (diff1Hop > 10.0) {
        earliestDivergenceStep = step;
        divergenceLayer = "1-hop sensory interneurons";
      } else if (diff2Hop > 10.0) {
        earliestDivergenceStep = step;
        divergenceLayer = "2-hop premotor interneurons";
      } else if (diffDN > 0.05) {
        earliestDivergenceStep = step;
        divergenceLayer = "descending neurons (DN layer)";
      }
    }

    timeSeriesComparison.push({
      step,
      time_ms: step,
      left_stim: {
        receptors_hz: l.receptors.total_hz,
        hop1_hz: l.downstream_1hop.total_hz,
        hop2_hz: l.downstream_2hop.total_hz,
        target_DNa02_hz: l.dn_rates.left_DNa02,
      },
      right_stim: {
        receptors_hz: r.receptors.total_hz,
        hop1_hz: r.downstream_1hop.total_hz,
        hop2_hz: r.downstream_2hop.total_hz,
        target_DNa02_hz: r.dn_rates.right_DNa02,
      },
      hop1_diff_hz: +diff1Hop.toFixed(2),
      hop2_diff_hz: +diff2Hop.toFixed(2),
      dna02_mirror_diff_hz: +diffDN.toFixed(4),
    });
  }

  // Identify bottleneck populations at peak stimulus (step 20)
  const peakStepIdx = 19;
  const ratesL = traceLeft[peakStepIdx].rate_snapshot;
  const ratesR = traceRight[peakStepIdx].rate_snapshot;

  // Group by cell type
  const typeDiffs = {};
  for (let i = 0; i < N; i++) {
    const t = meta.types[i];
    if (!t) continue;
    if (!typeDiffs[t]) {
      typeDiffs[t] = { type: t, left_rate: 0, right_rate: 0, count: 0 };
    }
    typeDiffs[t].count++;
    if (side[i] === 1) typeDiffs[t].left_rate += ratesL[i];
    else if (side[i] === 2) typeDiffs[t].right_rate += ratesR[i];
  }

  const rankedBottlenecks = Object.values(typeDiffs)
    .filter((d) => d.left_rate > 5.0 || d.right_rate > 5.0)
    .map((d) => ({
      type: d.type,
      left_activated_hz: +d.left_rate.toFixed(2),
      right_activated_hz: +d.right_rate.toFixed(2),
      absolute_divergence: +Math.abs(d.left_rate - d.right_rate).toFixed(2),
      dominant_side: d.left_rate > d.right_rate ? "LEFT" : "RIGHT",
    }))
    .sort((a, b) => b.absolute_divergence - a.absolute_divergence)
    .slice(0, 20);

  console.log(`\n======================================================`);
  console.log(`EARLIEST DIVERGENCE: Step ${earliestDivergenceStep} ms (${earliestDivergenceStep - STIM_START} ms post-stimulus onset)`);
  console.log(`DIVERGENCE LOCUS: ${divergenceLayer}`);
  console.log(`======================================================\n`);
  console.log("Top 10 Bottleneck Populations Divergence at t=20ms:");
  console.table(rankedBottlenecks.slice(0, 10));

  // Clean rate_snapshots before serializing
  for (const item of traceLeft) delete item.rate_snapshot;
  for (const item of traceRight) delete item.rate_snapshot;

  const results = {
    schema: "steering_asymmetry.propagation_trace.v1",
    timestamp: new Date().toISOString(),
    seed: SEED,
    intensity_hz: INTENSITY,
    earliest_divergence: {
      step: earliestDivergenceStep,
      latency_from_stim_onset_ms: earliestDivergenceStep ? earliestDivergenceStep - STIM_START : null,
      locus_layer: divergenceLayer,
    },
    top_bottleneck_populations: rankedBottlenecks,
    comparison_time_series: timeSeriesComparison,
  };

  const outPath = path.join(ROOT, "artifacts", "steering_asymmetry", "propagation_trace.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nArtifact written to: ${outPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
