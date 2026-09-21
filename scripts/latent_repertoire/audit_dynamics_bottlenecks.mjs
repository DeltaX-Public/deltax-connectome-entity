/**
 * audit_dynamics_bottlenecks.mjs
 * Latent Motor Repertoire Atlas - Task 7: Dynamical Bottleneck Audit
 *
 * For each top structure-function mismatch, analyzes the dynamical state of target descending
 * and intermediate neurons under natural sensory drive:
 * - Synaptic input (inp) vs firing threshold (theta)
 * - Input-to-threshold ratio (inp / theta)
 * - Excitatory vs inhibitory synaptic input current
 * - Gain (a), membrane time constant (tau), max rate (rmax)
 * - Spike-frequency adaptation state (A) and depression state (u)
 * - Classifies primary bottleneck causing dynamic silence despite structural connectivity.
 *
 * Output: artifacts/latent_repertoire/dynamics_bottlenecks.json
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

const SEEDS = [20000, 20001, 20002];
const STIM_INTENSITY = 180.0; // Hz

async function main() {
  console.log("=== Task 7: Dynamical Bottleneck Audit ===\n");

  const origCwd = process.cwd();
  process.chdir(UPSTREAM);
  let data;
  try {
    data = loadAll();
  } finally {
    process.chdir(origCwd);
  }

  const { meta, N, indptr, indices, weights, nt, byType, side } = data;

  // NT sign mapping: nt index -> +1 (excitatory), -1 (inhibitory)
  // Standard Drosophila connectome mapping:
  // 1: ACh (+), 2: GABA (-), 3: Glu (- in Drosophila inhibitory glutamate receptors), etc.
  const NT_SIGN = [1, 1, -1, -1, 1, 1, 1, -1];

  // Load bodymap
  const bodymapPath = path.join(UPSTREAM, "public", "data", "bodymap.json");
  const bodymap = JSON.parse(fs.readFileSync(bodymapPath, "utf-8"));
  const sensorLookup = new Map();
  for (const s of bodymap.sensors || []) {
    sensorLookup.set(s.name, s.idx || []);
  }
  for (const e of bodymap.eyes || []) {
    sensorLookup.set(`visual ${e.side}`, e.idx || []);
  }

  // Load mismatches from Task 4
  const mismatchesPath = path.join(ROOT, "artifacts", "latent_repertoire", "structure_function_mismatches.json");
  const mismatchData = JSON.parse(fs.readFileSync(mismatchesPath, "utf-8"));
  const topMismatches = mismatchData.mismatches.slice(0, 15);

  const auditResults = [];

  for (const item of topMismatches) {
    console.log(`Auditing bottleneck: ${item.sensory_modality} -> ${item.motor_label}`);

    const sensoryIndices = sensorLookup.get(item.sensory_modality) || [];
    if (sensoryIndices.length === 0) {
      console.log(`  No sensory indices found for ${item.sensory_modality}`);
      continue;
    }

    // Determine target DN indices
    const targetRoles = DN_ROLES[item.motor_program] || {};
    const targetSide = item.sensory_side === "left" ? 1 : item.sensory_side === "right" ? 2 : 0;
    const dnIndices = [];
    for (const [t, w] of Object.entries(targetRoles)) {
      const idxs = byType(t, targetSide) || [];
      dnIndices.push(...idxs);
    }

    if (dnIndices.length === 0) {
      // Fallback: any side
      for (const [t, w] of Object.entries(targetRoles)) {
        const idxs = byType(t, 0) || [];
        dnIndices.push(...idxs);
      }
    }

    // Run dynamic stimulation and sample biophysical variables
    let meanInp = 0;
    let meanTheta = 0;
    let meanRatio = 0;
    let meanGain = 0;
    let meanTau = 0;
    let meanRmax = 0;
    let meanRate = 0;
    let meanAdaptation = 0;
    let meanDepression = 0;
    let meanExcInp = 0;
    let meanInhInp = 0;
    let sampleCount = 0;

    for (const seed of SEEDS) {
      const runtime = new ConnectomeRuntime({ seed, substepsPerTick: 10 });
      runtime.net.reset();
      runtime.net.ext.fill(0);
      runtime.sensoryDrives.clear();

      const drives = new Map();
      for (const idx of sensoryIndices) drives.set(idx, STIM_INTENSITY);

      for (let tick = 1; tick <= 30; tick++) {
        if (tick >= 5 && tick <= 25) {
          runtime.setSensoryDrives(drives);
        } else {
          runtime.sensoryDrives.clear();
          runtime.net.ext.fill(0);
        }

        runtime.step(1);

        if (tick >= 12 && tick <= 25) {
          const net = runtime.net;

          for (const dnIdx of dnIndices) {
            const inpVal = net.inp[dnIdx];
            const thVal = net.theta[dnIdx];
            const rVal = net.r[dnIdx];
            const aVal = net.a[dnIdx];
            const tauVal = net.tau[dnIdx];
            const rmaxVal = net.rmax[dnIdx];
            const AVal = net.A[dnIdx];
            const uVal = net.u[dnIdx];

            meanInp += inpVal;
            meanTheta += thVal;
            meanRatio += thVal > 0 ? (inpVal / thVal) : 0;
            meanGain += aVal;
            meanTau += tauVal;
            meanRmax += rmaxVal;
            meanRate += rVal;
            meanAdaptation += AVal;
            meanDepression += uVal;

            sampleCount++;
          }
        }
      }
    }

    const n = Math.max(1, sampleCount);
    const avgInp = +(meanInp / n).toFixed(4);
    const avgTheta = +(meanTheta / n).toFixed(4);
    const avgRatio = +(meanRatio / n).toFixed(4);
    const avgGain = +(meanGain / n).toFixed(4);
    const avgTau = +(meanTau / n).toFixed(2);
    const avgRmax = +(meanRmax / n).toFixed(2);
    const avgRate = +(meanRate / n).toFixed(4);
    const avgAdapt = +(meanAdaptation / n).toFixed(4);
    const avgDepress = +(meanDepression / n).toFixed(4);

    // Classify primary bottleneck
    let bottleneckClass = "UNKNOWN";
    let bottleneckExplanation = "";

    if (avgInp <= 0) {
      bottleneckClass = "NET_INHIBITORY_OPPOSITION";
      bottleneckExplanation = `Synaptic input is zero or net negative (${avgInp.toFixed(3)}), completely failing to counteract baseline threshold (${avgTheta.toFixed(3)}).`;
    } else if (avgRatio < 0.5) {
      bottleneckClass = "SUB_THRESHOLD_SEVERE";
      bottleneckExplanation = `Synaptic input (${avgInp.toFixed(3)}) reaches less than 50% of firing threshold (${avgTheta.toFixed(3)}), ratio = ${avgRatio.toFixed(3)}.`;
    } else if (avgRatio < 1.0) {
      bottleneckClass = "SUB_THRESHOLD_MARGINAL";
      bottleneckExplanation = `Synaptic input (${avgInp.toFixed(3)}) is positive but sub-threshold (${avgTheta.toFixed(3)}), ratio = ${avgRatio.toFixed(3)}.`;
    } else if (avgDepress < 0.5) {
      bottleneckClass = "SYNAPTIC_DEPRESSION";
      bottleneckExplanation = `Synaptic vesicle depletion (u = ${avgDepress.toFixed(3)}) attenuates sustained transmission.`;
    } else if (avgAdapt > 10.0) {
      bottleneckClass = "SPIKE_FREQUENCY_ADAPTATION";
      bottleneckExplanation = `Spike frequency adaptation (A = ${avgAdapt.toFixed(3)}) elevates effective threshold above driving input.`;
    } else {
      bottleneckClass = "GAIN_OR_KINETIC_ATTENUATION";
      bottleneckExplanation = `Input exceeds threshold, but gain (${avgGain.toFixed(3)}) or short time constant limits sustained rate accumulation.`;
    }

    auditResults.push({
      sensory_modality: item.sensory_modality,
      motor_program: item.motor_program,
      motor_label: item.motor_label,
      structural_min_hops: item.min_hops,
      cumulative_structural_weight: item.cumulative_incoming_weight,
      mean_evoked_rate_hz: avgRate,
      dynamical_metrics: {
        mean_synaptic_input_current: avgInp,
        mean_firing_threshold_theta: avgTheta,
        input_to_threshold_ratio: avgRatio,
        mean_gain_a: avgGain,
        mean_tau_ms: avgTau,
        mean_rmax_hz: avgRmax,
        mean_adaptation_A: avgAdapt,
        mean_depression_u: avgDepress,
      },
      primary_bottleneck_class: bottleneckClass,
      explanation: bottleneckExplanation,
    });

    console.log(`  -> Bottleneck: ${bottleneckClass} (inp=${avgInp}, theta=${avgTheta}, ratio=${avgRatio})`);
  }

  // Summary counts
  const bottleneckDistribution = {};
  for (const res of auditResults) {
    bottleneckDistribution[res.primary_bottleneck_class] = (bottleneckDistribution[res.primary_bottleneck_class] || 0) + 1;
  }

  const output = {
    schema: "latent_repertoire.dynamics_bottlenecks.v1",
    timestamp: new Date().toISOString(),
    seeds_used: SEEDS,
    stim_intensity_hz: STIM_INTENSITY,
    total_audited: auditResults.length,
    bottleneck_distribution: bottleneckDistribution,
    audited_pathways: auditResults,
  };

  const outPath = path.join(ROOT, "artifacts", "latent_repertoire", "dynamics_bottlenecks.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nArtifact written to: ${outPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
