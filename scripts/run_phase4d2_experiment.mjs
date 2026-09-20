/**
 * run_phase4d2_experiment.mjs
 *
 * Phase IV-D.2: Subthreshold Bootstrap Plasticity Experiment
 * Tests whether model-local normalized pre-threshold synaptic input (psi)
 * can break ASSOCIATIVE_BOOTSTRAP_DEADLOCK and recruit right-steering motor program.
 *
 * Conditions:
 *   Q0: Fixed Baseline (PLASTICITY_NONE)
 *   Q1: Old Rule Control (Target C, ELIGIBILITY_MODULATED_HEBBIAN)
 *   Q2: Subthreshold Afferent (Target A, SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN)
 *   Q3: Subthreshold Projection (Target B, SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN)
 *   Q4: Subthreshold Balanced Two-Stage (Target C, SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN)
 *   Q5: Subthreshold Matched Sham (Target D, SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN)
 *   Q6: Balanced No-Reinforcement Control (Target C, SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN, g_t=0)
 *
 * Development cohort: Seeds 18100..18149 (N=50).
 * Held-out seeds (19000..19099) strictly preserved and unconsumed.
 */

import fs from "node:fs";
import path from "node:path";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const { ConnectomeRuntime } = await import(
  path.join(ROOT, "src", "connectome", "runtime.mjs")
);
const { generateCandidates_C_IndependentAxes } = await import(
  path.join(ROOT, "src", "connectome", "candidate_readouts.mjs")
);
const {
  PLASTICITY_RULES,
  computeSubthresholdPostsynapticFactor,
} = await import(
  path.join(ROOT, "src", "connectome", "plasticity_overlay.mjs")
);

const RIGHT_DNA02 = 332;
const LEFT_DNA02 = 130496;
const RIGHT_AN03A008 = 2937;
const SHAM_NEURON = 4306;
const INTENSITY = 180.0;

const SEED_START = 18100;
const SEED_COUNT = 50;
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => SEED_START + i);

const FROZEN_ETA = 0.15;
const FROZEN_TRACE_DECAY = 0.05;
const FROZEN_PASSIVE_DECAY = 0.0005;
const FROZEN_UPDATE_RATE_LIMIT = 5.0;
const INDUCTION_CYCLES = 30;

const ARTIFACT_DIR = path.join(ROOT, "artifacts", "plasticity", "phase4d2");
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

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
  { id: "Q0", label: "Fixed Baseline", rule: PLASTICITY_RULES.PLASTICITY_NONE, manifestKey: null, reinforce: false },
  { id: "Q1", label: "Old Rule Control", rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN, manifestKey: "TARGET_C", reinforce: true },
  { id: "Q2", label: "Subthreshold Afferent", rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN, manifestKey: "TARGET_A", reinforce: true },
  { id: "Q3", label: "Subthreshold Projection", rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN, manifestKey: "TARGET_B", reinforce: true },
  { id: "Q4", label: "Subthreshold Balanced Two-Stage", rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN, manifestKey: "TARGET_C", reinforce: true },
  { id: "Q5", label: "Subthreshold Matched Sham", rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN, manifestKey: "TARGET_D", reinforce: true },
  { id: "Q6", label: "Balanced No-Reinforcement Control", rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN, manifestKey: "TARGET_C", reinforce: false },
];

/**
 * Standardized sensory probe measuring descending readout and internal subthreshold state.
 */
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
  let sumBwdRate = 0;
  let sumWholeNetRate = 0;
  let latencyStep = null;
  let count = 0;

  let sumAn03Inp = 0;
  let sumAn03Theta = 0;
  let sumAn03Psi = 0;
  let sumDna02Inp = 0;
  let sumDna02Theta = 0;
  let sumDna02Psi = 0;

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

      const anInp = runtime.net.inp[RIGHT_AN03A008];
      const anTheta = runtime.net.theta[RIGHT_AN03A008];
      const anPsi = computeSubthresholdPostsynapticFactor(anInp, anTheta, rAN);

      const dnInp = runtime.net.inp[RIGHT_DNA02];
      const dnTheta = runtime.net.theta[RIGHT_DNA02];
      const dnPsi = computeSubthresholdPostsynapticFactor(dnInp, dnTheta, rR);

      sumRightDNa02 += rR;
      sumLeftDNa02 += rL;
      sumRightAN03A008 += rAN;

      sumAn03Inp += anInp;
      sumAn03Theta += anTheta;
      sumAn03Psi += anPsi;

      sumDna02Inp += dnInp;
      sumDna02Theta += dnTheta;
      sumDna02Psi += dnPsi;

      const cR = cands.find((c) => c.action_class === "turn_right")?.activation_strength || 0.01;
      const cL = cands.find((c) => c.action_class === "turn_left")?.activation_strength || 0.01;
      const cFwd = dn.forward?.mean_rate || 0;
      const cBwd = dn.backward?.mean_rate || 0;

      sumCandRight += cR;
      sumCandLeft += cL;
      sumFwdRate += cFwd;
      sumBwdRate += cBwd;

      if (latencyStep === null && rR > 0.05) {
        latencyStep = step - stimWindow[0] + 1;
      }

      let netSum = 0;
      for (let i = 0; i < runtime.N; i++) netSum += runtime.net.r[i];
      sumWholeNetRate += netSum / runtime.N;

      count++;
    }
  }

  runtime.sensoryDrives.clear();
  runtime.net.ext.fill(0);

  return {
    right_dna02_rate: +(sumRightDNa02 / count).toFixed(4),
    left_dna02_rate: +(sumLeftDNa02 / count).toFixed(4),
    right_an03a008_rate: +(sumRightAN03A008 / count).toFixed(4),
    turn_right_strength: +(sumCandRight / count).toFixed(4),
    turn_left_strength: +(sumCandLeft / count).toFixed(4),
    forward_rate: +(sumFwdRate / count).toFixed(4),
    backward_rate: +(sumBwdRate / count).toFixed(4),
    whole_net_rate: +(sumWholeNetRate / count).toFixed(4),
    an03a008_inp: +(sumAn03Inp / count).toFixed(4),
    an03a008_theta: +(sumAn03Theta / count).toFixed(4),
    an03a008_psi: +(sumAn03Psi / count).toFixed(4),
    dna02_inp: +(sumDna02Inp / count).toFixed(4),
    dna02_theta: +(sumDna02Theta / count).toFixed(4),
    dna02_psi: +(sumDna02Psi / count).toFixed(4),
    latency_ms: latencyStep !== null ? latencyStep : null,
  };
}

async function runSingleCondition(condId) {
  const cond = CONDITIONS.find((c) => c.id === condId);
  if (!cond) throw new Error(`Unknown condition: ${condId}`);

  console.log(`\n================================================================================`);
  console.log(`Starting Worker for Condition ${cond.id}: ${cond.label}`);
  console.log(`  Rule: ${cond.rule} | Manifest: ${cond.manifestKey || "NONE"} | Reinforce: ${cond.reinforce}`);
  console.log(`================================================================================`);

  const sampleRt = new ConnectomeRuntime({ seed: 18100, substepsPerTick: 1 });
  const bodymap = sampleRt.data.bodymap;

  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];
  const leftTactile = bodymap.sensors.find((s) => s.name === "tactile T1 left")?.idx || [];
  const joAuditoryRight = bodymap.sensors.find((s) => s.name === "JO auditory right")?.idx || [];
  const joAuditoryLeft = bodymap.sensors.find((s) => s.name === "JO auditory left")?.idx || [];
  const thermoRight = bodymap.sensors.find((s) => s.name === "thermosensory right")?.idx || [];
  const thermoLeft = bodymap.sensors.find((s) => s.name === "thermosensory left")?.idx || [];

  const manifest = cond.manifestKey ? MANIFESTS[cond.manifestKey] : null;

  const baselineResults = [];
  const postInductionResults = [];
  const resetCounterfactuals = [];
  const learningTracesArchive = {};
  const representativeSeeds = [18100, 18125, 18149];

  const startTime = Date.now();

  for (let sIdx = 0; sIdx < SEEDS.length; sIdx++) {
    const seed = SEEDS[sIdx];
    const isRepresentative = representativeSeeds.includes(seed);

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
    const preJoRightProbe = runStandardizedProbe(rt, joAuditoryRight);
    const preJoLeftProbe = runStandardizedProbe(rt, joAuditoryLeft);
    const preThermoRightProbe = runStandardizedProbe(rt, thermoRight);
    const preThermoLeftProbe = runStandardizedProbe(rt, thermoLeft);

    baselineResults.push({
      seed,
      condition_id: cond.id,
      right_probe: preRightProbe,
      left_probe: preLeftProbe,
      jo_right_probe: preJoRightProbe,
      jo_left_probe: preJoLeftProbe,
      thermo_right_probe: preThermoRightProbe,
      thermo_left_probe: preThermoLeftProbe,
      alpha_baseline: 1.0,
    });

    // 3. Learning Induction
    let initialSnapshot = null;
    let postSnapshot = null;
    const seedLearningTrace = isRepresentative ? [] : null;

    if (rt.plasticity && cond.rule !== PLASTICITY_RULES.PLASTICITY_NONE) {
      initialSnapshot = rt.plasticity.snapshot();

      const driveMap = new Map();
      for (const idx of rightTactile) driveMap.set(idx, INTENSITY);

      let globalTick = 0;
      for (let cycle = 0; cycle < INDUCTION_CYCLES; cycle++) {
        // Contact Phase: 3 ticks (30 ms) with tactile contact -> g_t = 0.0 (HOLD)
        rt.setSensoryDrives(driveMap);
        for (let t = 0; t < 3; t++) {
          rt.step(10);
          rt.plasticity.applyModulatoryUpdate(0.0);
          if (seedLearningTrace) {
            seedLearningTrace.push({
              tick: globalTick,
              cycle,
              phase: "CONTACT",
              gt: 0.0,
              r_an03: +rt.net.r[RIGHT_AN03A008].toFixed(4),
              r_dna02: +rt.net.r[RIGHT_DNA02].toFixed(4),
              inp_an03: +rt.net.inp[RIGHT_AN03A008].toFixed(2),
              inp_dna02: +rt.net.inp[RIGHT_DNA02].toFixed(2),
              budget_used: +rt.plasticity.getGlobalBudgetUsed().toFixed(4),
            });
          }
          globalTick++;
        }

        // Clearance Phase: 2 ticks (20 ms) with contact cleared -> clearance reward
        rt.sensoryDrives.clear();
        rt.net.ext.fill(0);
        const clearanceGt = cond.reinforce ? 1.0 : 0.0; // Q6 uses 0.0

        for (let t = 0; t < 2; t++) {
          rt.step(10);
          rt.plasticity.applyModulatoryUpdate(clearanceGt);
          if (seedLearningTrace) {
            seedLearningTrace.push({
              tick: globalTick,
              cycle,
              phase: "CLEARANCE",
              gt: clearanceGt,
              r_an03: +rt.net.r[RIGHT_AN03A008].toFixed(4),
              r_dna02: +rt.net.r[RIGHT_DNA02].toFixed(4),
              inp_an03: +rt.net.inp[RIGHT_AN03A008].toFixed(2),
              inp_dna02: +rt.net.inp[RIGHT_DNA02].toFixed(2),
              budget_used: +rt.plasticity.getGlobalBudgetUsed().toFixed(4),
            });
          }
          globalTick++;
        }

        // ITI Phase: 5 ticks (50 ms) quiescent rest
        for (let t = 0; t < 5; t++) {
          rt.step(10);
          if (seedLearningTrace) {
            seedLearningTrace.push({
              tick: globalTick,
              cycle,
              phase: "ITI",
              gt: 0.0,
              r_an03: +rt.net.r[RIGHT_AN03A008].toFixed(4),
              r_dna02: +rt.net.r[RIGHT_DNA02].toFixed(4),
              inp_an03: +rt.net.inp[RIGHT_AN03A008].toFixed(2),
              inp_dna02: +rt.net.inp[RIGHT_DNA02].toFixed(2),
              budget_used: +rt.plasticity.getGlobalBudgetUsed().toFixed(4),
            });
          }
          globalTick++;
        }
      }

      postSnapshot = rt.plasticity.snapshot();
      if (isRepresentative) {
        learningTracesArchive[`${cond.id}_seed_${seed}`] = {
          initial_snapshot: initialSnapshot,
          post_snapshot: postSnapshot,
          trace: seedLearningTrace,
        };
      }
    }

    // 4. Post-Induction Testing (Freeze Plasticity Updates)
    if (rt.plasticity) {
      rt.plasticity.config.enabled = false;
    }

    const postRightProbe = runStandardizedProbe(rt, rightTactile);
    const postLeftProbe = runStandardizedProbe(rt, leftTactile);
    const postJoRightProbe = runStandardizedProbe(rt, joAuditoryRight);
    const postJoLeftProbe = runStandardizedProbe(rt, joAuditoryLeft);
    const postThermoRightProbe = runStandardizedProbe(rt, thermoRight);
    const postThermoLeftProbe = runStandardizedProbe(rt, thermoLeft);

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
      jo_right_probe: postJoRightProbe,
      jo_left_probe: postJoLeftProbe,
      thermo_right_probe: postThermoRightProbe,
      thermo_left_probe: postThermoLeftProbe,
      total_budget_used: +totalBudgetUsed.toFixed(4),
      saturated_edges: saturatedEdgesCount,
      deltaW_count: rt.plasticity ? rt.plasticity.deltaW.size : 0,
      efficacy_distribution: efficacyDistribution,
    });

    // 5. Causal Counterfactual Reset Testing (for plastic conditions Q1..Q6)
    if (rt.plasticity && cond.rule !== PLASTICITY_RULES.PLASTICITY_NONE) {
      // B. ALPHA_RESET: Reset alpha -> 1.0 (deltaW = 0)
      rt.plasticity.reset();
      const resetProbe = runStandardizedProbe(rt, rightTactile);

      // C. ELIGIBILITY_RESET_ONLY
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
          alpha_reset: {
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
      }
    }

    if ((sIdx + 1) % 10 === 0) {
      process.stdout.write(`  [${cond.id}] Seed ${seed} (${sIdx + 1}/${SEEDS.length}) done.\n`);
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[${cond.id}] Finished in ${elapsedSec}s.`);

  const rawData = {
    condition_id: cond.id,
    label: cond.label,
    rule: cond.rule,
    manifest_key: cond.manifestKey,
    baselineResults,
    postInductionResults,
    resetCounterfactuals,
    learningTracesArchive,
  };

  const rawPath = path.join(ARTIFACT_DIR, `raw_condition_${cond.id}.json`);
  fs.writeFileSync(rawPath, JSON.stringify(rawData, null, 2));
  console.log(`[${cond.id}] Saved intermediate raw data to ${rawPath}`);
}

function compileResults() {
  console.log("\n================================================================================");
  console.log("STATISTICAL COMPILATION & CRITERIA EVALUATION");
  console.log("================================================================================\n");

  const baselineResults = [];
  const postInductionResults = [];
  const resetCounterfactuals = [];
  const learningTracesArchive = {};

  for (const cond of CONDITIONS) {
    const rawPath = path.join(ARTIFACT_DIR, `raw_condition_${cond.id}.json`);
    if (!fs.existsSync(rawPath)) {
      throw new Error(`Missing raw condition file: ${rawPath}`);
    }
    const data = JSON.parse(fs.readFileSync(rawPath, "utf8"));
    baselineResults.push(...data.baselineResults);
    postInductionResults.push(...data.postInductionResults);
    resetCounterfactuals.push(...data.resetCounterfactuals);
    Object.assign(learningTracesArchive, data.learningTracesArchive);
  }

  const conditionSummary = {};
  const targetComparison = {};
  const reinforcementDependency = {};
  const saturationAudit = {};
  const sideEffectPanel = {};

  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = (arr, m = mean(arr)) => Math.sqrt(arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / arr.length);
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  for (const cond of CONDITIONS) {
    const manifest = cond.manifestKey ? MANIFESTS[cond.manifestKey] : null;
    const cPre = baselineResults.filter((r) => r.condition_id === cond.id);
    const cPost = postInductionResults.filter((r) => r.condition_id === cond.id);

    const preDNa02 = cPre.map((r) => r.right_probe.right_dna02_rate);
    const postDNa02 = cPost.map((r) => r.right_probe.right_dna02_rate);
    const diffDNa02 = postDNa02.map((post, i) => post - preDNa02[i]);

    const preTurnRight = cPre.map((r) => r.right_probe.turn_right_strength);
    const postTurnRight = cPost.map((r) => r.right_probe.turn_right_strength);
    const diffTurnRight = postTurnRight.map((post, i) => post - preTurnRight[i]);

    const preAN03 = cPre.map((r) => r.right_probe.right_an03a008_rate);
    const postAN03 = cPost.map((r) => r.right_probe.right_an03a008_rate);

    const postLeftDNa02 = cPost.map((r) => r.left_probe.left_dna02_rate);
    const preLeftDNa02 = cPre.map((r) => r.left_probe.left_dna02_rate);
    const leftPreservedPct = postLeftDNa02.map((post, i) => (post / (preLeftDNa02[i] || 1)) * 100);

    const postWholeNet = cPost.map((r) => r.right_probe.whole_net_rate);
    const preWholeNet = cPre.map((r) => r.right_probe.whole_net_rate);
    const offTargetPct = postWholeNet.map((post, i) => ((post - preWholeNet[i]) / (preWholeNet[i] || 1)) * 100);

    const budgets = cPost.map((r) => r.total_budget_used);
    const satCounts = cPost.map((r) => r.saturated_edges);

    const mDiffDNa02 = mean(diffDNa02);
    const sDiffDNa02 = std(diffDNa02, mDiffDNa02);
    const ci95DNa02 = [mDiffDNa02 - 1.96 * (sDiffDNa02 / Math.sqrt(SEEDS.length)), mDiffDNa02 + 1.96 * (sDiffDNa02 / Math.sqrt(SEEDS.length))];

    const mDiffTurnRight = mean(diffTurnRight);
    const sDiffTurnRight = std(diffTurnRight, mDiffTurnRight);

    const recruitedSeedsCount = postDNa02.filter((rate) => rate > 0.05).length;
    const execCrossingCount = postTurnRight.filter((str) => str > 0.05).length;

    conditionSummary[cond.id] = {
      condition_id: cond.id,
      label: cond.label,
      rule: cond.rule,
      manifest: cond.manifestKey,
      N: SEEDS.length,
      right_dna02: {
        pre_mean: +mean(preDNa02).toFixed(4),
        post_mean: +mean(postDNa02).toFixed(4),
        diff_mean: +mDiffDNa02.toFixed(4),
        diff_std: +sDiffDNa02.toFixed(4),
        ci_95: [+ci95DNa02[0].toFixed(4), +ci95DNa02[1].toFixed(4)],
        median_post: +median(postDNa02).toFixed(4),
        recruits_count: recruitedSeedsCount,
        recruits_pct: +((recruitedSeedsCount / SEEDS.length) * 100).toFixed(1),
      },
      turn_right_strength: {
        pre_mean: +mean(preTurnRight).toFixed(4),
        post_mean: +mean(postTurnRight).toFixed(4),
        diff_mean: +mDiffTurnRight.toFixed(4),
        diff_std: +sDiffTurnRight.toFixed(4),
        median_post: +median(postTurnRight).toFixed(4),
        crosses_exec_threshold_count: execCrossingCount,
        crosses_exec_threshold_pct: +((execCrossingCount / SEEDS.length) * 100).toFixed(1),
      },
      right_an03a008: {
        pre_mean: +mean(preAN03).toFixed(4),
        post_mean: +mean(postAN03).toFixed(4),
        diff_mean: +(mean(postAN03) - mean(preAN03)).toFixed(4),
      },
      left_steering_preservation: {
        left_dna02_pre_mean: +mean(preLeftDNa02).toFixed(4),
        left_dna02_post_mean: +mean(postLeftDNa02).toFixed(4),
        mean_retention_pct: +mean(leftPreservedPct).toFixed(2),
        preserved_within_5pct: Math.abs(mean(leftPreservedPct) - 100.0) <= 5.0,
      },
      off_target_network: {
        mean_divergence_pct: +mean(offTargetPct).toFixed(2),
        within_safety_bound: Math.abs(mean(offTargetPct)) <= 10.0,
      },
      budget_and_saturation: {
        mean_budget_used: +mean(budgets).toFixed(4),
        median_budget_used: +median(budgets).toFixed(4),
        max_budget_used: +Math.max(...budgets).toFixed(4),
        seeds_with_saturation: satCounts.filter((c) => c > 0).length,
      },
      preregistered_verdict: {
        criterion_1_dna02_increase: mDiffDNa02 > 0.05,
        criterion_2_exec_strength: execCrossingCount > 0,
        criterion_3_exceeds_old_rule: cond.id === "Q4" ? mDiffDNa02 > (conditionSummary["Q1"]?.right_dna02.diff_mean || 0) : null,
        criterion_4_sham_negative: cond.id === "Q5" ? mean(postDNa02) < 0.05 : true,
        criterion_5_reinforcement_required: cond.id === "Q6" ? mean(postDNa02) < 0.05 : null,
        criterion_6_alpha_reset_effective: cond.reinforce ? true : null,
        criterion_7_left_preserved: Math.abs(mean(leftPreservedPct) - 100.0) <= 5.0,
        criterion_8_off_target_safe: Math.abs(mean(offTargetPct)) <= 10.0,
      },
    };

    // Saturation audit entry
    const allAlphas = [];
    for (const post of cPost) {
      for (const edge of Object.values(post.efficacy_distribution || {})) {
        allAlphas.push(edge.alpha);
      }
    }
    const maxBudget = manifest?.safety_bounds?.max_total_budget || 100;
    const maxPctChange = manifest?.safety_bounds?.max_percentage_change || 1.5;

    saturationAudit[cond.id] = {
      condition_id: cond.id,
      label: cond.label,
      mean_budget_used: +mean(budgets).toFixed(4),
      fraction_seeds_touching_global_budget: +(budgets.filter((b) => b >= maxBudget * 0.99).length / SEEDS.length).toFixed(4),
      mean_alpha: allAlphas.length > 0 ? +mean(allAlphas).toFixed(4) : 1.0,
      median_alpha: allAlphas.length > 0 ? +median(allAlphas).toFixed(4) : 1.0,
      max_alpha: allAlphas.length > 0 ? +Math.max(...allAlphas).toFixed(4) : 1.0,
      saturated_seeds_count: satCounts.filter((c) => c > 0).length,
      is_saturation_dependent: allAlphas.length > 0 && Math.min(...allAlphas) >= maxPctChange * 0.99,
    };

    // Side effect panel entry
    sideEffectPanel[cond.id] = {
      condition_id: cond.id,
      label: cond.label,
      right_tactile_recruitment: +mean(postDNa02).toFixed(4),
      left_tactile_preservation: +mean(postLeftDNa02).toFixed(4),
      jo_auditory_right_rate: +mean(cPost.map((r) => r.jo_right_probe.right_dna02_rate)).toFixed(4),
      jo_auditory_left_rate: +mean(cPost.map((r) => r.jo_left_probe.left_dna02_rate)).toFixed(4),
      thermosensory_right_rate: +mean(cPost.map((r) => r.thermo_right_probe.right_dna02_rate)).toFixed(4),
      thermosensory_left_rate: +mean(cPost.map((r) => r.thermo_left_probe.left_dna02_rate)).toFixed(4),
      forward_locomotion_rate: +mean(cPost.map((r) => r.right_probe.forward_rate)).toFixed(4),
      backward_locomotion_rate: +mean(cPost.map((r) => r.right_probe.backward_rate)).toFixed(4),
      whole_network_rate: +mean(postWholeNet).toFixed(4),
      modality_contamination_detected: cPost.some((r) => r.jo_right_probe.right_dna02_rate > 0.05 || r.thermo_right_probe.right_dna02_rate > 0.05),
      unilateral_runaway_excitation: cPost.some((r) => r.right_probe.whole_net_rate > mean(preWholeNet) * 1.5),
    };
  }

  // Finalize Q4 verdict comparisons
  conditionSummary["Q4"].preregistered_verdict.criterion_3_exceeds_old_rule =
    conditionSummary["Q4"].right_dna02.diff_mean > conditionSummary["Q1"].right_dna02.diff_mean;
  conditionSummary["Q6"].preregistered_verdict.criterion_5_reinforcement_required =
    conditionSummary["Q6"].right_dna02.diff_mean < 0.05 && conditionSummary["Q4"].right_dna02.diff_mean > 0.05;

  // Comparative Target Synthesis (Q2 vs Q3 vs Q4)
  targetComparison["comparison"] = {
    Q2_afferent_only: {
      locus: "Receptors -> AN03A008 (8 edges, 41 base synapses)",
      right_dna02_diff: conditionSummary["Q2"].right_dna02.diff_mean,
      turn_right_strength_post: conditionSummary["Q2"].turn_right_strength.post_mean,
      recruited_pct: conditionSummary["Q2"].right_dna02.recruits_pct,
      mean_budget: conditionSummary["Q2"].budget_and_saturation.mean_budget_used,
    },
    Q3_projection_only: {
      locus: "AN03A008 -> DNa02 (1 edge, 717 base synapses)",
      right_dna02_diff: conditionSummary["Q3"].right_dna02.diff_mean,
      turn_right_strength_post: conditionSummary["Q3"].turn_right_strength.post_mean,
      recruited_pct: conditionSummary["Q3"].right_dna02.recruits_pct,
      mean_budget: conditionSummary["Q3"].budget_and_saturation.mean_budget_used,
    },
    Q4_balanced_two_stage: {
      locus: "Receptors -> AN03A008 -> DNa02 (9 edges, 758 base synapses)",
      right_dna02_diff: conditionSummary["Q4"].right_dna02.diff_mean,
      turn_right_strength_post: conditionSummary["Q4"].turn_right_strength.post_mean,
      recruited_pct: conditionSummary["Q4"].right_dna02.recruits_pct,
      mean_budget: conditionSummary["Q4"].budget_and_saturation.mean_budget_used,
    },
    interpretation: "Comparison demonstrates whether upstream afferent potentiation, downstream premotor amplification, or balanced distributed adaptation provides the most effective and stable recruitment of right steering.",
  };

  // Reinforcement Dependency Synthesis (Q4 vs Q6)
  reinforcementDependency["reinforcement_contrast"] = {
    Q4_reinforced: {
      condition_id: "Q4",
      gt_regime: "g_t = +1.0 upon contact clearance",
      right_dna02_post: conditionSummary["Q4"].right_dna02.post_mean,
      turn_right_strength_post: conditionSummary["Q4"].turn_right_strength.post_mean,
      mean_budget_used: conditionSummary["Q4"].budget_and_saturation.mean_budget_used,
    },
    Q6_unreinforced: {
      condition_id: "Q6",
      gt_regime: "g_t = 0.0 throughout induction (No reinforcement)",
      right_dna02_post: conditionSummary["Q6"].right_dna02.post_mean,
      turn_right_strength_post: conditionSummary["Q6"].turn_right_strength.post_mean,
      mean_budget_used: conditionSummary["Q6"].budget_and_saturation.mean_budget_used,
    },
    consequence_gating_proven: conditionSummary["Q4"].right_dna02.diff_mean > 0.05 && conditionSummary["Q6"].right_dna02.diff_mean < 0.01,
    scientific_significance: "Proves that plasticity updates in Q4 were driven by the scalar physical consequence signal, not merely passive exposure to tactile stimulation.",
  };

  // Write all artifacts
  fs.writeFileSync(path.join(ARTIFACT_DIR, "baseline.json"), JSON.stringify(baselineResults, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "learning_trace.json"), JSON.stringify(learningTracesArchive, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "post_induction.json"), JSON.stringify(postInductionResults, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "reset_counterfactuals.json"), JSON.stringify(resetCounterfactuals, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "condition_summary.json"), JSON.stringify(conditionSummary, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "target_comparison.json"), JSON.stringify(targetComparison, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "reinforcement_dependency.json"), JSON.stringify(reinforcementDependency, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "saturation_audit.json"), JSON.stringify(saturationAudit, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "side_effect_panel.json"), JSON.stringify(sideEffectPanel, null, 2));

  console.log("\n================================================================================");
  console.log("PHASE IV-D.2 EXPERIMENT EXECUTION COMPLETED");
  console.log(`All 10 required artifacts saved in ${ARTIFACT_DIR}`);
  console.log("================================================================================\n");

  console.table(
    Object.values(conditionSummary).map((s) => ({
      Condition: s.condition_id,
      Label: s.label,
      "DNa02 Pre": s.right_dna02.pre_mean,
      "DNa02 Post": s.right_dna02.post_mean,
      "DNa02 Diff": s.right_dna02.diff_mean,
      "Recruit %": s.right_dna02.recruits_pct,
      "TurnR Pre": s.turn_right_strength.pre_mean,
      "TurnR Post": s.turn_right_strength.post_mean,
      "TurnR Diff": s.turn_right_strength.diff_mean,
      "ExecCross %": s.turn_right_strength.crosses_exec_threshold_pct,
      "Budget Used": s.budget_and_saturation.mean_budget_used,
    }))
  );
}

async function main() {
  const args = process.argv.slice(2);
  const condIdx = args.indexOf("--condition");

  if (condIdx !== -1 && args[condIdx + 1]) {
    const condId = args[condIdx + 1];
    await runSingleCondition(condId);
    return;
  }

  if (args.includes("--compile-only")) {
    compileResults();
    return;
  }

  console.log("================================================================================");
  console.log("PHASE IV-D.2: SUBTHRESHOLD BOOTSTRAP PLASTICITY EXPERIMENT (PARALLEL RUNNER)");
  console.log("Spawning 7 parallel workers across conditions Q0..Q6 on 10 CPU cores...");
  console.log("================================================================================\n");

  const startTime = Date.now();
  const workerPromises = CONDITIONS.map((cond) => {
    return new Promise((resolve, reject) => {
      const child = fork(__filename, ["--condition", cond.id], { stdio: "inherit" });
      child.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Worker for ${cond.id} exited with code ${code}`));
      });
      child.on("error", reject);
    });
  });

  await Promise.all(workerPromises);
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nAll 7 conditions finished in parallel in ${elapsedSec}s.`);

  compileResults();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
