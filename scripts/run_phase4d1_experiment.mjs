/**
 * run_phase4d1_experiment.mjs
 *
 * Phase IV-D.1: First Substrate Learning Experiment
 * Tactile-to-Right-Steering Plasticity
 *
 * Tests whether bounded experience-dependent efficacy plasticity can cause
 * right tactile input to reliably recruit the existing right-steering motor circuit.
 *
 * Conditions:
 *   P0: Fixed Baseline (PLASTICITY_NONE)
 *   P1: Ungated Local Control (Target C, LOCAL_HEBBIAN)
 *   P2: Afferent Gated (Target A, ELIGIBILITY_MODULATED_HEBBIAN)
 *   P3: Projection Gated (Target B, ELIGIBILITY_MODULATED_HEBBIAN)
 *   P4: Balanced Two-Stage Gated (Target C, ELIGIBILITY_MODULATED_HEBBIAN)
 *   P5: Matched Sham Control (Target D, ELIGIBILITY_MODULATED_HEBBIAN)
 *
 * Development cohort: Seeds 18000..18049 (N=50).
 * Held-out seeds strictly preserved and unconsumed.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const { ConnectomeRuntime } = await import(
  path.join(ROOT, "src", "connectome", "runtime.mjs")
);
const { generateCandidates_C_IndependentAxes } = await import(
  path.join(ROOT, "src", "connectome", "candidate_readouts.mjs")
);
const { PLASTICITY_RULES } = await import(
  path.join(ROOT, "src", "connectome", "plasticity_overlay.mjs")
);

const RIGHT_DNA02 = 332;
const LEFT_DNA02 = 130496;
const RIGHT_AN03A008 = 2937;
const SHAM_NEURON = 4306;
const INTENSITY = 180.0;
const SEED_START = 18000;
const SEED_COUNT = 50;
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => SEED_START + i);

const FROZEN_ETA = 0.15;
const FROZEN_TRACE_DECAY = 0.05;
const FROZEN_PASSIVE_DECAY = 0.0005;
const FROZEN_UPDATE_RATE_LIMIT = 5.0;
const FROZEN_GLOBAL_BUDGET = 420.0;
const INDUCTION_CYCLES = 30;

function loadManifest(filename) {
  const p = path.join(ROOT, "artifacts", "plasticity", filename);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const MANIFESTS = {
  TARGET_A: loadManifest("target_a_afferent_only.json"),
  TARGET_B: loadManifest("target_b_projection_only.json"),
  TARGET_C: loadManifest("target_c_balanced_two_stage.json"),
  TARGET_D: loadManifest("target_d_matched_sham.json"),
};

const CONDITIONS = [
  { id: "P0", label: "Fixed Baseline", rule: PLASTICITY_RULES.PLASTICITY_NONE, manifestKey: null },
  { id: "P1", label: "Ungated Local Control", rule: PLASTICITY_RULES.LOCAL_HEBBIAN, manifestKey: "TARGET_C" },
  { id: "P2", label: "Afferent Gated", rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN, manifestKey: "TARGET_A" },
  { id: "P3", label: "Projection Gated", rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN, manifestKey: "TARGET_B" },
  { id: "P4", label: "Balanced Two-Stage Gated", rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN, manifestKey: "TARGET_C" },
  { id: "P5", label: "Matched Sham Control", rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN, manifestKey: "TARGET_D" },
];

/** Standardized Probe */
function runStandardizedProbe(runtime, driveSensorIndices, intensity = INTENSITY, totalSteps = 60, stimWindow = [11, 35]) {
  runtime.net.reset();
  runtime.net.ext.fill(0);
  runtime.sensoryDrives.clear();

  const driveMap = new Map();
  for (const idx of driveSensorIndices) driveMap.set(idx, intensity);

  let sumRightDNa02 = 0;
  let sumLeftDNa02 = 0;
  let sumRightAN03A008 = 0;
  let sumCandRight = 0;
  let sumCandLeft = 0;
  let sumFwdRate = 0;
  let sumWholeNetRate = 0;
  let latencyStep = null;
  let count = 0;

  for (let step = 1; step <= totalSteps; step++) {
    if (step >= stimWindow[0] && step <= stimWindow[1]) {
      runtime.setSensoryDrives(driveMap);
    } else {
      runtime.sensoryDrives.clear();
      runtime.net.ext.fill(0);
    }

    runtime.step(1);

    if (step >= stimWindow[0] && step <= stimWindow[1]) {
      const dn = runtime.getDescendingNeuronReadouts();
      const cands = generateCandidates_C_IndependentAxes(dn, step);

      const rR = runtime.net.r[RIGHT_DNA02];
      const rL = runtime.net.r[LEFT_DNA02];
      const rAN = runtime.net.r[RIGHT_AN03A008];

      sumRightDNa02 += rR;
      sumLeftDNa02 += rL;
      sumRightAN03A008 += rAN;

      const cR = cands.find((c) => c.action_class === "turn_right")?.activation_strength || 0.01;
      const cL = cands.find((c) => c.action_class === "turn_left")?.activation_strength || 0.01;
      const cFwd = dn.forward?.mean_rate || 0;

      sumCandRight += cR;
      sumCandLeft += cL;
      sumFwdRate += cFwd;

      // Latency detection: first step where right DNa02 exceeds 0.05 Hz
      if (latencyStep === null && rR > 0.05) {
        latencyStep = step - stimWindow[0] + 1;
      }

      // Sample whole network activity
      let netSum = 0;
      for (let i = 0; i < runtime.N; i++) netSum += runtime.net.r[i];
      sumWholeNetRate += netSum / runtime.N;

      count++;
    }
  }

  // Clear sensory drives after probe
  runtime.sensoryDrives.clear();
  runtime.net.ext.fill(0);

  return {
    right_dna02_rate: +(sumRightDNa02 / count).toFixed(4),
    left_dna02_rate: +(sumLeftDNa02 / count).toFixed(4),
    right_an03a008_rate: +(sumRightAN03A008 / count).toFixed(4),
    turn_right_strength: +(sumCandRight / count).toFixed(4),
    turn_left_strength: +(sumCandLeft / count).toFixed(4),
    forward_rate: +(sumFwdRate / count).toFixed(4),
    whole_net_rate: +(sumWholeNetRate / count).toFixed(4),
    latency_ms: latencyStep !== null ? latencyStep : null,
  };
}

async function runExperiment() {
  console.log("================================================================================");
  console.log("PHASE IV-D.1: FIRST SUBSTRATE LEARNING EXPERIMENT");
  console.log("Tactile-to-Right-Steering Plasticity (N=50 Development Seeds)");
  console.log("================================================================================\n");

  const sampleRuntime = new ConnectomeRuntime({ seed: 18000, substepsPerTick: 1 });
  const bodymap = sampleRuntime.data.bodymap;

  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];
  const leftTactile = bodymap.sensors.find((s) => s.name === "tactile T1 left")?.idx || [];
  const joAuditory = bodymap.sensors.find((s) => s.name === "JO auditory right")?.idx || [];
  const thermosensory = bodymap.sensors.find((s) => s.name === "thermosensory right")?.idx || [];

  console.log(`Sensory populations: Right Tactile (${rightTactile.length}), Left Tactile (${leftTactile.length}), JO (${joAuditory.length}), Thermo (${thermosensory.length})`);

  const baselineResults = [];
  const inductionUpdatesLog = [];
  const postInductionResults = [];
  const resetCounterfactuals = [];
  const snapshotsArchive = {}; // representative seeds: 18000, 18025, 18049

  const REPRESENTATIVE_SEEDS = [18000, 18025, 18049];

  for (const cond of CONDITIONS) {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`Condition ${cond.id}: ${cond.label} (${cond.rule})`);
    console.log(`--------------------------------------------------------------------------------`);

    const manifest = cond.manifestKey ? MANIFESTS[cond.manifestKey] : null;

    for (let sIdx = 0; sIdx < SEEDS.length; sIdx++) {
      const seed = SEEDS[sIdx];
      const isRepresentative = REPRESENTATIVE_SEEDS.includes(seed);

      // 1. Create ConnectomeRuntime
      const plasticityConfig = manifest
        ? {
            enabled: cond.rule !== PLASTICITY_RULES.PLASTICITY_NONE,
            rule: cond.rule,
            learningRate: FROZEN_ETA,
            traceDecay: FROZEN_TRACE_DECAY,
            passiveDecay: FROZEN_PASSIVE_DECAY,
            updateRateLimit: FROZEN_UPDATE_RATE_LIMIT,
            totalGlobalBudget: manifest.safety_bounds.max_total_budget,
            maxAbsoluteDeltaW: manifest.safety_bounds.max_edge_delta,
            maxPercentageDeviation: manifest.safety_bounds.max_percentage_change,
          }
        : null;

      const rt = new ConnectomeRuntime({
        seed,
        substepsPerTick: 1,
        plasticity: plasticityConfig,
      });

      // Set eligible edge mask from manifest
      let eligibleEdgeIndices = [];
      if (manifest && rt.plasticity) {
        for (const edge of manifest.eligible_edges) {
          const k = rt.plasticity.findEdgeIndex(edge.source, edge.target);
          if (k >= 0) eligibleEdgeIndices.push(k);
        }
        rt.plasticity.setEligibleEdgeMask(eligibleEdgeIndices);
      }

      // 2. Pre-Induction Baseline Measurements
      const preRightProbe = runStandardizedProbe(rt, rightTactile);
      const preLeftProbe = runStandardizedProbe(rt, leftTactile);
      const preJoProbe = runStandardizedProbe(rt, joAuditory);
      const preThermoProbe = runStandardizedProbe(rt, thermosensory);

      baselineResults.push({
        seed,
        condition_id: cond.id,
        right_probe: preRightProbe,
        left_probe: preLeftProbe,
        jo_probe: preJoProbe,
        thermo_probe: preThermoProbe,
        alpha_baseline: 1.0,
      });

      // 3. Learning Induction (if enabled)
      let initialSnapshot = null;
      let midSnapshot = null;
      let postSnapshot = null;

      if (isRepresentative && rt.plasticity) {
        initialSnapshot = rt.plasticity.snapshot();
      }

      if (cond.rule !== PLASTICITY_RULES.PLASTICITY_NONE && rt.plasticity) {
        const driveMap = new Map();
        for (const idx of rightTactile) driveMap.set(idx, INTENSITY);

        for (let cycle = 0; cycle < INDUCTION_CYCLES; cycle++) {
          // Mid-learning snapshot at cycle 15
          if (isRepresentative && cycle === 15) {
            midSnapshot = rt.plasticity.snapshot();
          }

          // Onset Phase: 3 ticks (30 ms) with contact = 1.0 -> g_t = 0.0 (HOLD)
          rt.setSensoryDrives(driveMap);
          for (let t = 0; t < 3; t++) {
            rt.step(10);
            if (cond.rule === PLASTICITY_RULES.LOCAL_HEBBIAN) {
              rt.plasticity.applyModulatoryUpdate(0.0); // unmodulated Hebbian updates on coincidence
            } else {
              rt.plasticity.applyModulatoryUpdate(0.0); // g_t = 0 HOLD
            }
          }

          // Clearance Phase: 2 ticks (20 ms) with contact = 0.0 -> clearance = 1.0 -> g_t = +1.0 (REINFORCE)
          rt.sensoryDrives.clear();
          rt.net.ext.fill(0);
          for (let t = 0; t < 2; t++) {
            rt.step(10);
            if (cond.rule === PLASTICITY_RULES.LOCAL_HEBBIAN) {
              rt.plasticity.applyModulatoryUpdate(0.0);
            } else {
              rt.plasticity.applyModulatoryUpdate(1.0); // g_t = +1.0 REINFORCE upon clearance
            }
          }

          // ITI Phase: 5 ticks (50 ms) quiescent rest
          for (let t = 0; t < 5; t++) {
            rt.step(10);
          }
        }

        if (isRepresentative) {
          postSnapshot = rt.plasticity.snapshot();
          snapshotsArchive[`${cond.id}_seed_${seed}`] = {
            initial: initialSnapshot,
            mid: midSnapshot,
            post: postSnapshot,
          };
        }

        // Log sample of provenance records for seed 18000
        if (seed === 18000 && rt.plasticity.provenanceLog.length > 0) {
          inductionUpdatesLog.push({
            condition_id: cond.id,
            seed,
            total_updates_logged: rt.plasticity.provenanceLog.length,
            sample_updates: rt.plasticity.provenanceLog.slice(-10),
          });
        }
      }

      // 4. Post-Induction Testing (Freeze Plasticity Updates)
      if (rt.plasticity) {
        rt.plasticity.config.enabled = false;
      }

      const postRightProbe = runStandardizedProbe(rt, rightTactile);
      const postLeftProbe = runStandardizedProbe(rt, leftTactile);
      const postJoProbe = runStandardizedProbe(rt, joAuditory);
      const postThermoProbe = runStandardizedProbe(rt, thermosensory);

      // Collect Efficacy Distribution
      const efficacyDistribution = {};
      let saturatedEdgesCount = 0;
      let totalBudgetUsed = 0;

      if (rt.plasticity) {
        totalBudgetUsed = rt.plasticity.getGlobalBudgetUsed();
        for (const [k, v] of rt.plasticity.deltaW.entries()) {
          const baseW = rt.plasticity.baseSynapseCounts[k];
          const alpha = rt.plasticity.getEfficacyMultiplier(k);
          efficacyDistribution[k] = {
            base_synapses: baseW,
            delta_w: +v.toFixed(4),
            alpha: +alpha.toFixed(4),
            effective_weight: +(baseW + v).toFixed(4),
          };
          // Check if saturated at manifest bound
          const maxAllowedDelta = baseW * (manifest ? manifest.safety_bounds.max_percentage_change : 1.5);
          if (Math.abs(v) >= maxAllowedDelta * 0.99) {
            saturatedEdgesCount++;
          }
        }
      }

      postInductionResults.push({
        seed,
        condition_id: cond.id,
        right_probe: postRightProbe,
        left_probe: postLeftProbe,
        jo_probe: postJoProbe,
        thermo_probe: postThermoProbe,
        total_budget_used: +totalBudgetUsed.toFixed(4),
        saturated_edges: saturatedEdgesCount,
        deltaW_count: rt.plasticity ? rt.plasticity.deltaW.size : 0,
        efficacy_distribution: efficacyDistribution,
      });

      // 5. Causal Counterfactual Reset Testing (for plastic conditions P1..P5)
      if (rt.plasticity && cond.rule !== PLASTICITY_RULES.PLASTICITY_NONE) {
        // A. LEARNED_INTACT: Already measured as postRightProbe

        // B. EFFICACY_RESET: Reset alpha -> 1.0 (deltaW = 0)
        rt.plasticity.reset();
        const resetProbe = runStandardizedProbe(rt, rightTactile);

        // C. ELIGIBILITY_RESET_ONLY
        // Re-apply learned alpha from snapshot to test eligibility reset only
        if (postSnapshot) {
          rt.plasticity.restore(postSnapshot);
          rt.plasticity.resetEligibilityOnly();
          const eligResetProbe = runStandardizedProbe(rt, rightTactile);

          // D. SHAM_RESET (Equivalent overhead without changing weights)
          const shamResetProbe = runStandardizedProbe(rt, rightTactile);

          resetCounterfactuals.push({
            seed,
            condition_id: cond.id,
            learned_intact: {
              right_dna02: postRightProbe.right_dna02_rate,
              turn_right_strength: postRightProbe.turn_right_strength,
            },
            efficacy_reset: {
              right_dna02: resetProbe.right_dna02_rate,
              turn_right_strength: resetProbe.turn_right_strength,
            },
            eligibility_reset_only: {
              right_dna02: eligResetProbe.right_dna02_rate,
              turn_right_strength: eligResetProbe.turn_right_strength,
            },
            sham_reset: {
              right_dna02: shamResetProbe.right_dna02_rate,
              turn_right_strength: shamResetProbe.turn_right_strength,
            },
          });
        } else {
          resetCounterfactuals.push({
            seed,
            condition_id: cond.id,
            learned_intact: {
              right_dna02: postRightProbe.right_dna02_rate,
              turn_right_strength: postRightProbe.turn_right_strength,
            },
            efficacy_reset: {
              right_dna02: resetProbe.right_dna02_rate,
              turn_right_strength: resetProbe.turn_right_strength,
            },
          });
        }
      }

      if ((sIdx + 1) % 10 === 0) {
        process.stdout.write(`  [${cond.id}] Seed ${seed} (${sIdx + 1}/${SEEDS.length}) done.\n`);
      }
    }
  }

  // 6. Summary Statistical Analysis
  console.log("\n================================================================================");
  console.log("STATISTICAL COMPILATION & CRITERIA EVALUATION");
  console.log("================================================================================\n");

  const conditionSummary = {};
  const targetComparison = {};
  const saturationAudit = {};

  for (const cond of CONDITIONS) {
    const cPre = baselineResults.filter((r) => r.condition_id === cond.id);
    const cPost = postInductionResults.filter((r) => r.condition_id === cond.id);

    const preDNa02 = cPre.map((r) => r.right_probe.right_dna02_rate);
    const postDNa02 = cPost.map((r) => r.right_probe.right_dna02_rate);
    const diffDNa02 = postDNa02.map((post, i) => post - preDNa02[i]);

    const preTurnRight = cPre.map((r) => r.right_probe.turn_right_strength);
    const postTurnRight = cPost.map((r) => r.right_probe.turn_right_strength);
    const diffTurnRight = postTurnRight.map((post, i) => post - preTurnRight[i]);

    const preAN03A008 = cPre.map((r) => r.right_probe.right_an03a008_rate);
    const postAN03A008 = cPost.map((r) => r.right_probe.right_an03a008_rate);

    const postLeftDNa02 = cPost.map((r) => r.left_probe.left_dna02_rate);
    const preLeftDNa02 = cPre.map((r) => r.left_probe.left_dna02_rate);

    const postWholeNet = cPost.map((r) => r.right_probe.whole_net_rate);
    const preWholeNet = cPre.map((r) => r.right_probe.whole_net_rate);
    const offTargetPct = postWholeNet.map((post, i) => ((post - preWholeNet[i]) / (preWholeNet[i] || 1)) * 100);

    const budgets = cPost.map((r) => r.total_budget_used);
    const satCounts = cPost.map((r) => r.saturated_edges);

    // Helpers
    const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = (arr, m = mean(arr)) => Math.sqrt(arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / arr.length);
    const median = (arr) => {
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };

    const meanPreDNa02 = mean(preDNa02);
    const meanPostDNa02 = mean(postDNa02);
    const meanDiffDNa02 = mean(diffDNa02);
    const stdDiffDNa02 = std(diffDNa02, meanDiffDNa02);

    const meanPreTurnRight = mean(preTurnRight);
    const meanPostTurnRight = mean(postTurnRight);
    const meanDiffTurnRight = mean(diffTurnRight);
    const stdDiffTurnRight = std(diffTurnRight, meanDiffTurnRight);

    const meanPreAN03A008 = mean(preAN03A008);
    const meanPostAN03A008 = mean(postAN03A008);

    const meanOffTarget = mean(offTargetPct);
    const meanLeftDNa02Post = mean(postLeftDNa02);
    const meanLeftDNa02Pre = mean(preLeftDNa02);

    // Criteria checks
    const recruitsRightDNa02 = cPost.filter((r) => r.right_probe.right_dna02_rate > 0.10).length;
    const crossesExecThreshold = cPost.filter((r) => r.right_probe.turn_right_strength > 0.05).length;
    const totalSaturatedSeeds = satCounts.filter((c) => c > 0).length;

    conditionSummary[cond.id] = {
      condition_id: cond.id,
      label: cond.label,
      rule: cond.rule,
      manifest: cond.manifestKey,
      N: SEED_COUNT,
      right_dna02: {
        pre_mean: +meanPreDNa02.toFixed(4),
        post_mean: +meanPostDNa02.toFixed(4),
        diff_mean: +meanDiffDNa02.toFixed(4),
        diff_std: +stdDiffDNa02.toFixed(4),
        median: +median(postDNa02).toFixed(4),
        recruits_count: recruitsRightDNa02,
        recruits_pct: +((recruitsRightDNa02 / SEED_COUNT) * 100).toFixed(1),
      },
      turn_right_strength: {
        pre_mean: +meanPreTurnRight.toFixed(4),
        post_mean: +meanPostTurnRight.toFixed(4),
        diff_mean: +meanDiffTurnRight.toFixed(4),
        diff_std: +stdDiffTurnRight.toFixed(4),
        median: +median(postTurnRight).toFixed(4),
        crosses_exec_threshold_count: crossesExecThreshold,
        crosses_exec_threshold_pct: +((crossesExecThreshold / SEED_COUNT) * 100).toFixed(1),
      },
      right_an03a008: {
        pre_mean: +meanPreAN03A008.toFixed(4),
        post_mean: +meanPostAN03A008.toFixed(4),
        diff_mean: +(meanPostAN03A008 - meanPreAN03A008).toFixed(4),
      },
      off_target_network: {
        mean_divergence_pct: +meanOffTarget.toFixed(2),
        within_safety_bound: Math.abs(meanOffTarget) <= 10.0,
      },
      left_steering_preservation: {
        left_dna02_pre_mean: +meanLeftDNa02Pre.toFixed(4),
        left_dna02_post_mean: +meanLeftDNa02Post.toFixed(4),
        preserved: meanLeftDNa02Post >= meanLeftDNa02Pre * 0.85,
      },
      budget_and_saturation: {
        mean_budget_used: +mean(budgets).toFixed(4),
        seeds_with_saturation: totalSaturatedSeeds,
      },
      preregistered_verdict: {
        criterion_1_dna02_increase: meanPostDNa02 > meanPreDNa02 + 0.05,
        criterion_2_exec_strength: crossesExecThreshold >= 25,
        criterion_3_replication_rate: crossesExecThreshold >= 25,
        criterion_4_sham_negative: cond.id === "P5" ? crossesExecThreshold === 0 : true,
        criterion_5_off_target_safe: Math.abs(meanOffTarget) <= 10.0,
        criterion_6_left_preserved: meanLeftDNa02Post >= meanLeftDNa02Pre * 0.85,
      },
    };

    console.log(`Condition ${cond.id} (${cond.label}):`);
    console.log(`  Right DNa02: Pre = ${meanPreDNa02.toFixed(4)} Hz -> Post = ${meanPostDNa02.toFixed(4)} Hz (Diff: +${meanDiffDNa02.toFixed(4)} Hz)`);
    console.log(`  turn_right Strength: Pre = ${meanPreTurnRight.toFixed(4)} -> Post = ${meanPostTurnRight.toFixed(4)} (Crosses >0.05: ${crossesExecThreshold}/${SEED_COUNT})`);
    console.log(`  Right AN03A008: Pre = ${meanPreAN03A008.toFixed(2)} Hz -> Post = ${meanPostAN03A008.toFixed(2)} Hz`);
    console.log(`  Off-target Divergence: ${meanOffTarget.toFixed(2)}% | Budget Used: ${mean(budgets).toFixed(2)} | Saturated Seeds: ${totalSaturatedSeeds}/${SEED_COUNT}`);
  }

  // Target Comparison (A vs B vs C vs D)
  targetComparison.overview = {
    target_a_afferent_only: {
      condition: "P2",
      mean_dna02_diff: conditionSummary.P2.right_dna02.diff_mean,
      mean_turn_right_post: conditionSummary.P2.turn_right_strength.post_mean,
      success_count: conditionSummary.P2.turn_right_strength.crosses_exec_threshold_count,
    },
    target_b_projection_only: {
      condition: "P3",
      mean_dna02_diff: conditionSummary.P3.right_dna02.diff_mean,
      mean_turn_right_post: conditionSummary.P3.turn_right_strength.post_mean,
      success_count: conditionSummary.P3.turn_right_strength.crosses_exec_threshold_count,
    },
    target_c_balanced_two_stage: {
      condition: "P4",
      mean_dna02_diff: conditionSummary.P4.right_dna02.diff_mean,
      mean_turn_right_post: conditionSummary.P4.turn_right_strength.post_mean,
      success_count: conditionSummary.P4.turn_right_strength.crosses_exec_threshold_count,
    },
    target_d_matched_sham: {
      condition: "P5",
      mean_dna02_diff: conditionSummary.P5.right_dna02.diff_mean,
      mean_turn_right_post: conditionSummary.P5.turn_right_strength.post_mean,
      success_count: conditionSummary.P5.turn_right_strength.crosses_exec_threshold_count,
    },
  };

  // Saturation Audit
  saturationAudit.overview = {
    P1_ungated_local: {
      mean_budget: conditionSummary.P1.budget_and_saturation.mean_budget_used,
      saturated_seeds: conditionSummary.P1.budget_and_saturation.seeds_with_saturation,
    },
    P2_afferent_gated: {
      mean_budget: conditionSummary.P2.budget_and_saturation.mean_budget_used,
      saturated_seeds: conditionSummary.P2.budget_and_saturation.seeds_with_saturation,
    },
    P3_projection_gated: {
      mean_budget: conditionSummary.P3.budget_and_saturation.mean_budget_used,
      saturated_seeds: conditionSummary.P3.budget_and_saturation.seeds_with_saturation,
    },
    P4_balanced_two_stage: {
      mean_budget: conditionSummary.P4.budget_and_saturation.mean_budget_used,
      saturated_seeds: conditionSummary.P4.budget_and_saturation.seeds_with_saturation,
    },
    P5_matched_sham: {
      mean_budget: conditionSummary.P5.budget_and_saturation.mean_budget_used,
      saturated_seeds: conditionSummary.P5.budget_and_saturation.seeds_with_saturation,
    },
  };

  // Save Artifacts
  const outDir = path.join(ROOT, "artifacts", "plasticity", "phase4d1");
  fs.writeFileSync(path.join(outDir, "baseline.json"), JSON.stringify(baselineResults, null, 2));
  fs.writeFileSync(path.join(outDir, "induction_updates.json"), JSON.stringify(inductionUpdatesLog, null, 2));
  fs.writeFileSync(path.join(outDir, "post_induction.json"), JSON.stringify(postInductionResults, null, 2));
  fs.writeFileSync(path.join(outDir, "reset_counterfactuals.json"), JSON.stringify(resetCounterfactuals, null, 2));
  fs.writeFileSync(path.join(outDir, "condition_summary.json"), JSON.stringify(conditionSummary, null, 2));
  fs.writeFileSync(path.join(outDir, "target_comparison.json"), JSON.stringify(targetComparison, null, 2));
  fs.writeFileSync(path.join(outDir, "saturation_audit.json"), JSON.stringify(saturationAudit, null, 2));

  console.log(`\nAll 7 Phase IV-D.1 artifacts successfully written to: ${outDir}`);
}

runExperiment().catch((err) => {
  console.error("CRITICAL RUNTIME ERROR in Phase IV-D.1 experiment:", err);
  process.exit(1);
});
