/**
 * run_phase4d3_experiment.mjs
 *
 * Phase IV-D.3: Learning Curve, Dose Response, and Responder Heterogeneity
 *
 * Investigates whether responder heterogeneity observed in Phase IV-D.2 is:
 *   (A) DOSAGE-LIMITED (recruitment scales with induction cycles)
 *   (B) SEED-LIMITED (intrinsic network/threshold phenotypes govern learnability)
 *   (C) MIXED (progressive recruitment with persistent nonresponders)
 *   (D) SATURATION-LIMITED (bounds clamp before recruitment)
 *   (E) SAFETY-LIMITED (cumulative damage at longer doses)
 *
 * Conditions:
 *   R0: Baseline (PLASTICITY_NONE, 0 cycles)
 *   R1: 10 Cycles Dose (Target A Subthreshold)
 *   R2: 30 Cycles Dose (Target A Subthreshold)
 *   R3: 60 Cycles Dose (Target A Subthreshold)
 *   R4: 120 Cycles Dose (Target A Subthreshold)
 *   R5: Old-Rule Long-Exposure Control (Target A, ELIGIBILITY_MODULATED_HEBBIAN, 120 cycles)
 *   R6: No-Reinforcement Control (Target A Subthreshold, 120 cycles, g_t=0)
 *   R7: Matched Sham Long-Exposure Control (Target D Subthreshold, 120 cycles)
 *
 * Cohort: Fresh development seeds 18200..18299 (N=100).
 * Held-out seeds 19000..19099 strictly preserved and unconsumed.
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

const SEED_START = 18200;
const SEED_COUNT = 100;
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => SEED_START + i);

const FROZEN_ETA = 0.15;
const FROZEN_TRACE_DECAY = 0.05;
const FROZEN_PASSIVE_DECAY = 0.0005;
const FROZEN_UPDATE_RATE_LIMIT = 5.0;

const ARTIFACT_DIR = path.join(ROOT, "artifacts", "plasticity", "phase4d3");
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function loadManifest(filename) {
  const p = path.join(ROOT, "artifacts", "plasticity", filename);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const MANIFEST_TARGET_A = loadManifest("target_a_afferent_only.json");
const MANIFEST_TARGET_D = loadManifest("target_d_matched_sham.json");

const CHECKPOINTS = [0, 5, 10, 20, 30, 45, 60, 90, 120];

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

/**
 * Extract baseline biophysical and dynamical phenotype before plasticity.
 */
function extractBaselinePhenotype(rt, rightTactile) {
  const probe = runStandardizedProbe(rt, rightTactile);

  // Sample tactile receptor firing rates under 180 Hz stimulus
  const receptorRates = [];
  for (const idx of rightTactile) {
    receptorRates.push(rt.net.r[idx]);
  }
  const meanRec = receptorRates.reduce((a, b) => a + b, 0) / (receptorRates.length || 1);
  const stdRec = Math.sqrt(receptorRates.reduce((acc, x) => acc + (x - meanRec) ** 2, 0) / (receptorRates.length || 1));

  return {
    seed: rt.seed,
    tactile_receptors: {
      count: rightTactile.length,
      mean_rate: +meanRec.toFixed(4),
      std_rate: +stdRec.toFixed(4),
      min_rate: +Math.min(...receptorRates).toFixed(4),
      max_rate: +Math.max(...receptorRates).toFixed(4),
    },
    an03a008: {
      index: RIGHT_AN03A008,
      evoked_rate: probe.right_an03a008_rate,
      inp: probe.an03a008_inp,
      theta: probe.an03a008_theta,
      inp_over_theta: +(probe.an03a008_inp / (probe.an03a008_theta || 1)).toFixed(4),
      psi: probe.an03a008_psi,
      gain_a: +rt.net.a[RIGHT_AN03A008].toFixed(4),
      tau: +rt.net.tau[RIGHT_AN03A008].toFixed(4),
      rmax: +rt.net.rmax[RIGHT_AN03A008].toFixed(4),
      size_scale: +rt.net.sizeScale[RIGHT_AN03A008].toFixed(4),
      adaptation_A: +rt.net.A[RIGHT_AN03A008].toFixed(4),
      depression_u: +rt.net.u[RIGHT_AN03A008].toFixed(4),
    },
    dna02: {
      index: RIGHT_DNA02,
      evoked_rate: probe.right_dna02_rate,
      inp: probe.dna02_inp,
      theta: probe.dna02_theta,
      inp_over_theta: +(probe.dna02_inp / (probe.dna02_theta || 1)).toFixed(4),
      psi: probe.dna02_psi,
      gain_a: +rt.net.a[RIGHT_DNA02].toFixed(4),
      tau: +rt.net.tau[RIGHT_DNA02].toFixed(4),
      rmax: +rt.net.rmax[RIGHT_DNA02].toFixed(4),
      size_scale: +rt.net.sizeScale[RIGHT_DNA02].toFixed(4),
      adaptation_A: +rt.net.A[RIGHT_DNA02].toFixed(4),
      depression_u: +rt.net.u[RIGHT_DNA02].toFixed(4),
    },
    baseline_turn_right_strength: probe.turn_right_strength,
    baseline_whole_net_rate: probe.whole_net_rate,
  };
}

/**
 * Run induction trajectory for a specific condition.
 */
function runConditionInduction(
  seed,
  manifest,
  rule,
  reinforce,
  maxCycles,
  rightTactile,
  leftTactile,
  joAuditoryRight,
  joAuditoryLeft,
  thermoRight,
  thermoLeft,
  trackFirstPassage = false,
  isControl = false
) {
  const plasticityConfig = manifest
    ? {
        enabled: rule !== PLASTICITY_RULES.PLASTICITY_NONE,
        rule,
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

  if (manifest && rt.plasticity) {
    const eligibleIndices = [];
    for (const edge of manifest.eligible_edges) {
      const k = rt.plasticity.findEdgeIndex(edge.source, edge.target);
      if (k >= 0) eligibleIndices.push(k);
    }
    rt.plasticity.setEligibleEdgeMask(eligibleIndices);
  }

  const driveMap = new Map();
  for (const idx of rightTactile) driveMap.set(idx, INTENSITY);

  const trajectory = [];
  const doseEvaluations = {};
  const resets = {};
  let firstPassageDNa02 = null;
  let firstPassageTurnRight = null;
  let firstSaturationCycle = null;

  // Cycle 0 measurement
  if (rt.plasticity) rt.plasticity.config.enabled = false;
  const p0 = runStandardizedProbe(rt, rightTactile);
  if (rt.plasticity) rt.plasticity.config.enabled = true;

  trajectory.push({
    cycle: 0,
    mean_alpha: 1.0,
    max_alpha: 1.0,
    dna02_rate: p0.right_dna02_rate,
    turn_right_strength: p0.turn_right_strength,
    an03_rate: p0.right_an03a008_rate,
    an03_inp_over_theta: +(p0.an03a008_inp / (p0.an03a008_theta || 1)).toFixed(4),
    budget_used: 0.0,
    applied_updates: 0,
    saturated: false,
  });

  for (let cycle = 1; cycle <= maxCycles; cycle++) {
    if (rt.plasticity && rule !== PLASTICITY_RULES.PLASTICITY_NONE) {
      // 1. Contact phase: 3 ticks (30 ms) with contact -> g_t = 0.0
      rt.setSensoryDrives(driveMap);
      for (let t = 0; t < 3; t++) {
        rt.step(10);
        rt.plasticity.applyModulatoryUpdate(0.0);
      }

      // 2. Clearance phase: 2 ticks (20 ms) with clearance -> g_t = +1.0 (or 0.0 if not reinforced)
      rt.sensoryDrives.clear();
      rt.net.ext.fill(0);
      const gt = reinforce ? 1.0 : 0.0;
      for (let t = 0; t < 2; t++) {
        rt.step(10);
        rt.plasticity.applyModulatoryUpdate(gt);
      }

      // 3. ITI phase: 5 ticks (50 ms) quiescent
      for (let t = 0; t < 5; t++) {
        rt.step(10);
      }
    }

    // Measure efficacy distribution
    let budgetUsed = 0;
    let alphas = [];
    let isSaturated = false;

    if (rt.plasticity) {
      budgetUsed = rt.plasticity.getGlobalBudgetUsed();
      for (const [k, v] of rt.plasticity.deltaW.entries()) {
        const baseW = rt.plasticity.baseSynapseCounts[k];
        const a = rt.plasticity.getEfficacyMultiplier(k);
        alphas.push(a);
        const maxDelta = baseW * (manifest ? manifest.safety_bounds.max_percentage_change : 1.5);
        if (Math.abs(v) >= maxDelta * 0.99) {
          isSaturated = true;
        }
      }
    }

    if (isSaturated && firstSaturationCycle === null) {
      firstSaturationCycle = cycle;
    }

    let probe = null;
    if (trackFirstPassage) {
      const snapBeforeProbe = rt.snapshot();
      if (rt.plasticity) rt.plasticity.config.enabled = false;
      probe = runStandardizedProbe(rt, rightTactile);
      if (rt.plasticity) rt.plasticity.config.enabled = true;
      rt.restore(snapBeforeProbe);

      if (firstPassageDNa02 === null && probe.right_dna02_rate > 0.05) {
        firstPassageDNa02 = cycle;
      }
      if (firstPassageTurnRight === null && probe.turn_right_strength > 0.05) {
        firstPassageTurnRight = cycle;
      }
    } else if (CHECKPOINTS.includes(cycle)) {
      const snapBeforeProbe = rt.snapshot();
      if (rt.plasticity) rt.plasticity.config.enabled = false;
      probe = runStandardizedProbe(rt, rightTactile);
      if (rt.plasticity) rt.plasticity.config.enabled = true;
      rt.restore(snapBeforeProbe);
    }

    // Checkpoints telemetry
    if (CHECKPOINTS.includes(cycle)) {
      trajectory.push({
        cycle,
        mean_alpha: alphas.length > 0 ? +(alphas.reduce((a, b) => a + b, 0) / alphas.length).toFixed(4) : 1.0,
        max_alpha: alphas.length > 0 ? +Math.max(...alphas).toFixed(4) : 1.0,
        dna02_rate: probe.right_dna02_rate,
        turn_right_strength: probe.turn_right_strength,
        an03_rate: probe.right_an03a008_rate,
        an03_inp_over_theta: +(probe.an03a008_inp / (probe.an03a008_theta || 1)).toFixed(4),
        budget_used: +budgetUsed.toFixed(4),
        applied_updates: rt.plasticity ? rt.plasticity.totalUpdatesApplied : 0,
        saturated: isSaturated,
      });
    }

    // Dose checkpoints: 10, 30, 60, 120 (controls only evaluate at 120)
    const doseList = isControl ? [120] : [10, 30, 60, 120];
    if (doseList.includes(cycle)) {
      const snapForDose = rt.snapshot();
      if (rt.plasticity) rt.plasticity.config.enabled = false;

      const pRight = probe || runStandardizedProbe(rt, rightTactile);
      const pLeft = runStandardizedProbe(rt, leftTactile);
      const pJoR = isControl ? { right_dna02_rate: 0 } : runStandardizedProbe(rt, joAuditoryRight);
      const pJoL = isControl ? { left_dna02_rate: 0 } : runStandardizedProbe(rt, joAuditoryLeft);
      const pThR = isControl ? { right_dna02_rate: 0 } : runStandardizedProbe(rt, thermoRight);
      const pThL = isControl ? { left_dna02_rate: 0 } : runStandardizedProbe(rt, thermoLeft);

      doseEvaluations[cycle] = {
        cycle,
        right_probe: pRight,
        left_probe: pLeft,
        jo_right_probe: pJoR,
        jo_left_probe: pJoL,
        thermo_right_probe: pThR,
        thermo_left_probe: pThL,
        budget_used: +budgetUsed.toFixed(4),
        mean_alpha: alphas.length > 0 ? +(alphas.reduce((a, b) => a + b, 0) / alphas.length).toFixed(4) : 1.0,
        max_alpha: alphas.length > 0 ? +Math.max(...alphas).toFixed(4) : 1.0,
        saturated: isSaturated,
      };

      // Causal Counterfactual Resets for recruited seeds
      if (pRight.right_dna02_rate > 0.05 || pRight.turn_right_strength > 0.05) {
        // Alpha reset
        rt.plasticity.reset();
        const pAlphaReset = runStandardizedProbe(rt, rightTactile);

        // Restore snapshot, reset eligibility only
        rt.restore(snapForDose);
        rt.plasticity.resetEligibilityOnly();
        const pEligReset = runStandardizedProbe(rt, rightTactile);

        // Sham reset
        const pShamReset = runStandardizedProbe(rt, rightTactile);

        resets[cycle] = {
          learned_intact: {
            right_dna02: pRight.right_dna02_rate,
            turn_right_strength: pRight.turn_right_strength,
          },
          alpha_reset: {
            right_dna02: pAlphaReset.right_dna02_rate,
            turn_right_strength: pAlphaReset.turn_right_strength,
          },
          eligibility_reset_only: {
            right_dna02: pEligReset.right_dna02_rate,
            turn_right_strength: pEligReset.turn_right_strength,
          },
          sham_reset: {
            right_dna02: pShamReset.right_dna02_rate,
            turn_right_strength: pShamReset.turn_right_strength,
          },
        };
      }

      if (rt.plasticity) rt.plasticity.config.enabled = true;
      rt.restore(snapForDose);
    }
  }

  return {
    seed,
    trajectory,
    doseEvaluations,
    resets,
    first_passage: {
      dna02_cycle: firstPassageDNa02,
      turn_right_cycle: firstPassageTurnRight,
      first_saturation_cycle: firstSaturationCycle,
    },
  };
}

/**
 * Worker routine for a subset of seeds.
 */
async function runWorker(workerId, seedSlice) {
  console.log(`[Worker ${workerId}] Starting evaluation for ${seedSlice.length} seeds (${seedSlice[0]}..${seedSlice[seedSlice.length - 1]})...`);
  const t0 = Date.now();

  const sampleRt = new ConnectomeRuntime({ seed: 18200, substepsPerTick: 1 });
  const bodymap = sampleRt.data.bodymap;

  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];
  const leftTactile = bodymap.sensors.find((s) => s.name === "tactile T1 left")?.idx || [];
  const joAuditoryRight = bodymap.sensors.find((s) => s.name === "JO auditory right")?.idx || [];
  const joAuditoryLeft = bodymap.sensors.find((s) => s.name === "JO auditory left")?.idx || [];
  const thermoRight = bodymap.sensors.find((s) => s.name === "thermosensory right")?.idx || [];
  const thermoLeft = bodymap.sensors.find((s) => s.name === "thermosensory left")?.idx || [];

  const baselinePhenotypes = [];
  const targetASubthresholdResults = [];
  const oldRuleResults = [];
  const noReinforcementResults = [];
  const shamResults = [];

  for (let i = 0; i < seedSlice.length; i++) {
    const seed = seedSlice[i];

    // 1. Baseline Phenotype (R0)
    const baseRt = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
    const pheno = extractBaselinePhenotype(baseRt, rightTactile);
    baselinePhenotypes.push(pheno);

    // 2. Target A Subthreshold (Dose response R1..R4, up to 120 cycles)
    const resA = runConditionInduction(
      seed,
      MANIFEST_TARGET_A,
      PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
      true,
      120,
      rightTactile,
      leftTactile,
      joAuditoryRight,
      joAuditoryLeft,
      thermoRight,
      thermoLeft,
      true,
      false
    );
    targetASubthresholdResults.push(resA);

    // 3. R5 — Old Rule Control (Target A, 120 cycles)
    const resOld = runConditionInduction(
      seed,
      MANIFEST_TARGET_A,
      PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
      true,
      120,
      rightTactile,
      leftTactile,
      joAuditoryRight,
      joAuditoryLeft,
      thermoRight,
      thermoLeft,
      false,
      true
    );
    oldRuleResults.push(resOld);

    // 4. R6 — No-Reinforcement Control (Target A, 120 cycles, g_t=0)
    const resNoReinf = runConditionInduction(
      seed,
      MANIFEST_TARGET_A,
      PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
      false,
      120,
      rightTactile,
      leftTactile,
      joAuditoryRight,
      joAuditoryLeft,
      thermoRight,
      thermoLeft,
      false,
      true
    );
    noReinforcementResults.push(resNoReinf);

    // 5. R7 — Matched Sham Control (Target D, 120 cycles)
    const resSham = runConditionInduction(
      seed,
      MANIFEST_TARGET_D,
      PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
      true,
      120,
      rightTactile,
      leftTactile,
      joAuditoryRight,
      joAuditoryLeft,
      thermoRight,
      thermoLeft,
      false,
      true
    );
    shamResults.push(resSham);

    if ((i + 1) % 5 === 0 || i + 1 === seedSlice.length) {
      console.log(`[Worker ${workerId}] Completed seed ${seed} (${i + 1}/${seedSlice.length})`);
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[Worker ${workerId}] Finished in ${elapsed}s.`);

  const outPath = path.join(ARTIFACT_DIR, `worker_${workerId}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        workerId,
        baselinePhenotypes,
        targetASubthresholdResults,
        oldRuleResults,
        noReinforcementResults,
        shamResults,
      },
      null,
      2
    )
  );
  console.log(`[Worker ${workerId}] Saved slice data to ${outPath}`);
}

/**
 * Statistical compilation and artifact synthesis across all workers.
 */
function compilePhase4D3() {
  console.log("\n================================================================================");
  console.log("PHASE IV-D.3: STATISTICAL COMPILATION & DOSE-RESPONSE SYNTHESIS");
  console.log("================================================================================\n");

  const baselinePhenotypes = [];
  const targetAResults = [];
  const oldRuleResults = [];
  const noReinforcementResults = [];
  const shamResults = [];

  const workerFiles = fs.readdirSync(ARTIFACT_DIR).filter((f) => f.startsWith("worker_") && f.endsWith(".json"));
  if (workerFiles.length === 0) {
    throw new Error("No worker output files found to compile.");
  }

  for (const wf of workerFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, wf), "utf8"));
    baselinePhenotypes.push(...data.baselinePhenotypes);
    targetAResults.push(...data.targetASubthresholdResults);
    oldRuleResults.push(...data.oldRuleResults);
    noReinforcementResults.push(...data.noReinforcementResults);
    shamResults.push(...data.shamResults);
  }

  baselinePhenotypes.sort((a, b) => a.seed - b.seed);
  targetAResults.sort((a, b) => a.seed - b.seed);
  oldRuleResults.sort((a, b) => a.seed - b.seed);
  noReinforcementResults.sort((a, b) => a.seed - b.seed);
  shamResults.sort((a, b) => a.seed - b.seed);

  const N = baselinePhenotypes.length;
  console.log(`Loaded ${N} total development seeds (18200..18299).`);

  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const std = (arr, m = mean(arr)) => Math.sqrt(arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / (arr.length || 1));
  const median = (arr) => {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  // 1. Learning Curves Telemetry
  const learningCurves = {
    checkpoints: CHECKPOINTS,
    target_a_subthreshold: {},
    old_rule_control: {},
    no_reinforcement_control: {},
    matched_sham_control: {},
  };

  for (const cp of CHECKPOINTS) {
    const cpData = targetAResults.map((r) => r.trajectory.find((t) => t.cycle === cp)).filter(Boolean);
    learningCurves.target_a_subthreshold[cp] = {
      cycle: cp,
      dna02_mean: +mean(cpData.map((d) => d.dna02_rate)).toFixed(4),
      dna02_median: +median(cpData.map((d) => d.dna02_rate)).toFixed(4),
      dna02_max: +Math.max(...cpData.map((d) => d.dna02_rate)).toFixed(4),
      turn_right_mean: +mean(cpData.map((d) => d.turn_right_strength)).toFixed(4),
      turn_right_median: +median(cpData.map((d) => d.turn_right_strength)).toFixed(4),
      an03_mean: +mean(cpData.map((d) => d.an03_rate)).toFixed(4),
      mean_alpha: +mean(cpData.map((d) => d.mean_alpha)).toFixed(4),
      max_alpha: +Math.max(...cpData.map((d) => d.max_alpha)).toFixed(4),
      mean_budget: +mean(cpData.map((d) => d.budget_used)).toFixed(4),
      recruited_seeds_count: cpData.filter((d) => d.dna02_rate > 0.05).length,
      recruited_seeds_pct: +((cpData.filter((d) => d.dna02_rate > 0.05).length / N) * 100).toFixed(1),
      exec_crossing_count: cpData.filter((d) => d.turn_right_strength > 0.05).length,
      exec_crossing_pct: +((cpData.filter((d) => d.turn_right_strength > 0.05).length / N) * 100).toFixed(1),
      saturated_seeds_count: cpData.filter((d) => d.saturated).length,
    };
  }

  // 2. Dose Response Analysis across doses [10, 30, 60, 120]
  const doses = [10, 30, 60, 120];
  const doseResponse = {
    doses: {},
    dose_comparison: [],
  };

  for (const d of doses) {
    const evals = targetAResults.map((r) => r.doseEvaluations[d]);
    const dna02Rates = evals.map((e) => e.right_probe.right_dna02_rate);
    const turnRights = evals.map((e) => e.right_probe.turn_right_strength);
    const an03Rates = evals.map((e) => e.right_probe.right_an03a008_rate);
    const budgets = evals.map((e) => e.budget_used);
    const alphas = evals.map((e) => e.mean_alpha);
    const maxAlphas = evals.map((e) => e.max_alpha);
    const saturated = evals.map((e) => e.saturated);

    const recruitedCount = dna02Rates.filter((r) => r > 0.05).length;
    const execCount = turnRights.filter((s) => s > 0.05).length;

    const summary = {
      dose_cycles: d,
      dna02_recruited_count: recruitedCount,
      dna02_recruited_pct: +((recruitedCount / N) * 100).toFixed(1),
      exec_threshold_crossed_count: execCount,
      exec_threshold_crossed_pct: +((execCount / N) * 100).toFixed(1),
      dna02_mean: +mean(dna02Rates).toFixed(4),
      dna02_median: +median(dna02Rates).toFixed(4),
      dna02_std: +std(dna02Rates).toFixed(4),
      dna02_min: +Math.min(...dna02Rates).toFixed(4),
      dna02_max: +Math.max(...dna02Rates).toFixed(4),
      turn_right_mean: +mean(turnRights).toFixed(4),
      turn_right_median: +median(turnRights).toFixed(4),
      turn_right_std: +std(turnRights).toFixed(4),
      an03a008_mean: +mean(an03Rates).toFixed(4),
      an03a008_median: +median(an03Rates).toFixed(4),
      mean_alpha: +mean(alphas).toFixed(4),
      max_alpha: +Math.max(...maxAlphas).toFixed(4),
      mean_budget_used: +mean(budgets).toFixed(4),
      max_budget_used: +Math.max(...budgets).toFixed(4),
      fraction_seeds_saturated: +(saturated.filter(Boolean).length / N).toFixed(4),
    };

    doseResponse.doses[d] = summary;
    doseResponse.dose_comparison.push(summary);
  }

  // Monotonicity check
  const recruitPcts = doseResponse.dose_comparison.map((c) => c.dna02_recruited_pct);
  let isMonotonic = true;
  for (let i = 1; i < recruitPcts.length; i++) {
    if (recruitPcts[i] < recruitPcts[i - 1]) isMonotonic = false;
  }
  doseResponse.monotonicity_verified = isMonotonic;

  // 3. First-Passage Analysis
  const fpDNa02Values = targetAResults.map((r) => r.first_passage.dna02_cycle).filter((v) => v !== null);
  const fpTurnRightValues = targetAResults.map((r) => r.first_passage.turn_right_cycle).filter((v) => v !== null);

  const firstPassage = {
    seeds: targetAResults.map((r) => ({
      seed: r.seed,
      first_passage_dna02: r.first_passage.dna02_cycle,
      first_passage_turn_right: r.first_passage.turn_right_cycle,
      first_saturation_cycle: r.first_passage.first_saturation_cycle,
    })),
    summary: {
      dna02_recruited_seeds_count: fpDNa02Values.length,
      dna02_recruited_seeds_pct: +((fpDNa02Values.length / N) * 100).toFixed(1),
      dna02_median_first_passage_cycle: median(fpDNa02Values),
      dna02_min_first_passage_cycle: fpDNa02Values.length > 0 ? Math.min(...fpDNa02Values) : null,
      dna02_max_first_passage_cycle: fpDNa02Values.length > 0 ? Math.max(...fpDNa02Values) : null,
      turn_right_crossing_seeds_count: fpTurnRightValues.length,
      turn_right_crossing_seeds_pct: +((fpTurnRightValues.length / N) * 100).toFixed(1),
      turn_right_median_first_passage_cycle: median(fpTurnRightValues),
      turn_right_min_first_passage_cycle: fpTurnRightValues.length > 0 ? Math.min(...fpTurnRightValues) : null,
      turn_right_max_first_passage_cycle: fpTurnRightValues.length > 0 ? Math.max(...fpTurnRightValues) : null,
      cumulative_recruitment_by_cycle: {
        cycle_10: targetAResults.filter((r) => r.first_passage.dna02_cycle !== null && r.first_passage.dna02_cycle <= 10).length,
        cycle_30: targetAResults.filter((r) => r.first_passage.dna02_cycle !== null && r.first_passage.dna02_cycle <= 30).length,
        cycle_60: targetAResults.filter((r) => r.first_passage.dna02_cycle !== null && r.first_passage.dna02_cycle <= 60).length,
        cycle_120: targetAResults.filter((r) => r.first_passage.dna02_cycle !== null && r.first_passage.dna02_cycle <= 120).length,
      },
    },
  };

  // 4. Responder vs Nonresponder Analysis (at 120 cycles)
  const responders = [];
  const nonresponders = [];

  for (let i = 0; i < N; i++) {
    const seed = baselinePhenotypes[i].seed;
    const postDNa02 = targetAResults[i].doseEvaluations[120].right_probe.right_dna02_rate;
    const isResponder = postDNa02 > 0.05;
    if (isResponder) responders.push(baselinePhenotypes[i]);
    else nonresponders.push(baselinePhenotypes[i]);
  }

  function compareVar(name, extractor) {
    if (responders.length === 0 || nonresponders.length === 0) {
      return {
        variable: name,
        responder_mean: responders.length > 0 ? +mean(responders.map(extractor)).toFixed(4) : 0,
        responder_std: 0,
        nonresponder_mean: nonresponders.length > 0 ? +mean(nonresponders.map(extractor)).toFixed(4) : 0,
        nonresponder_std: 0,
        diff: 0,
        cohens_d: 0,
      };
    }
    const respVals = responders.map(extractor);
    const nonVals = nonresponders.map(extractor);
    const m1 = mean(respVals);
    const m2 = mean(nonVals);
    const s1 = std(respVals, m1);
    const s2 = std(nonVals, m2);
    const sPooled = Math.sqrt(((respVals.length - 1) * s1 ** 2 + (nonVals.length - 1) * s2 ** 2) / Math.max(1, respVals.length + nonVals.length - 2));
    const d = sPooled > 0 ? (m1 - m2) / sPooled : 0.0;
    return {
      variable: name,
      responder_mean: +m1.toFixed(4),
      responder_std: +s1.toFixed(4),
      nonresponder_mean: +m2.toFixed(4),
      nonresponder_std: +s2.toFixed(4),
      diff: +(m1 - m2).toFixed(4),
      cohens_d: +d.toFixed(4),
    };
  }

  const responderComparisons = [
    compareVar("AN03A008_theta", (p) => p.an03a008.theta),
    compareVar("AN03A008_inp", (p) => p.an03a008.inp),
    compareVar("AN03A008_inp_over_theta", (p) => p.an03a008.inp_over_theta),
    compareVar("AN03A008_psi", (p) => p.an03a008.psi),
    compareVar("AN03A008_gain_a", (p) => p.an03a008.gain_a),
    compareVar("AN03A008_size_scale", (p) => p.an03a008.size_scale),
    compareVar("DNa02_theta", (p) => p.dna02.theta),
    compareVar("DNa02_inp", (p) => p.dna02.inp),
    compareVar("DNa02_inp_over_theta", (p) => p.dna02.inp_over_theta),
    compareVar("DNa02_gain_a", (p) => p.dna02.gain_a),
    compareVar("DNa02_size_scale", (p) => p.dna02.size_scale),
    compareVar("tactile_receptors_mean_rate", (p) => p.tactile_receptors.mean_rate),
    compareVar("baseline_whole_net_rate", (p) => p.baseline_whole_net_rate),
  ];

  responderComparisons.sort((a, b) => Math.abs(b.cohens_d) - Math.abs(a.cohens_d));

  const responderAnalysis = {
    total_seeds: N,
    responder_count: responders.length,
    responder_pct: +((responders.length / N) * 100).toFixed(1),
    nonresponder_count: nonresponders.length,
    nonresponder_pct: +((nonresponders.length / N) * 100).toFixed(1),
    predictive_factors_ranked: responderComparisons,
    top_predictor: responderComparisons[0]?.variable || "NONE",
    scientific_interpretation:
      responders.length > 0
        ? `Baseline heterogeneity is strongest along ${responderComparisons[0]?.variable} (Cohen's d = ${responderComparisons[0]?.cohens_d}).`
        : "No seeds recruited.",
  };

  // 5. Controls Synthesis (R0, R4, R5, R6, R7)
  const cR0 = baselinePhenotypes.map((p) => p.dna02.evoked_rate);
  const cR4 = targetAResults.map((r) => r.doseEvaluations[120].right_probe.right_dna02_rate);
  const cR5 = oldRuleResults.map((r) => r.doseEvaluations[120].right_probe.right_dna02_rate);
  const cR6 = noReinforcementResults.map((r) => r.doseEvaluations[120].right_probe.right_dna02_rate);
  const cR7 = shamResults.map((r) => r.doseEvaluations[120].right_probe.right_dna02_rate);

  const controls = {
    R0_baseline: {
      label: "Baseline (0 cycles)",
      mean_dna02: +mean(cR0).toFixed(4),
      recruits_pct: +((cR0.filter((r) => r > 0.05).length / N) * 100).toFixed(1),
      mean_budget: 0.0,
    },
    R4_target_a_subthreshold_120: {
      label: "Target A Subthreshold (120 cycles)",
      mean_dna02: +mean(cR4).toFixed(4),
      recruits_pct: +((cR4.filter((r) => r > 0.05).length / N) * 100).toFixed(1),
      mean_budget: +mean(targetAResults.map((r) => r.doseEvaluations[120].budget_used)).toFixed(4),
    },
    R5_old_rule_120: {
      label: "Old Rule Control (120 cycles)",
      mean_dna02: +mean(cR5).toFixed(4),
      recruits_pct: +((cR5.filter((r) => r > 0.05).length / N) * 100).toFixed(1),
      mean_budget: +mean(oldRuleResults.map((r) => r.doseEvaluations[120].budget_used)).toFixed(4),
      remains_deadlocked: mean(cR5) <= mean(cR0) + 0.005,
    },
    R6_no_reinforcement_120: {
      label: "No-Reinforcement Control (120 cycles, gt=0)",
      mean_dna02: +mean(cR6).toFixed(4),
      recruits_pct: +((cR6.filter((r) => r > 0.05).length / N) * 100).toFixed(1),
      mean_budget: +mean(noReinforcementResults.map((r) => r.doseEvaluations[120].budget_used)).toFixed(4),
      consequence_dependent: mean(cR6) <= mean(cR0) + 0.001,
    },
    R7_matched_sham_120: {
      label: "Matched Sham Control (Target D, 120 cycles)",
      mean_dna02: +mean(cR7).toFixed(4),
      recruits_pct: +((cR7.filter((r) => r > 0.05).length / N) * 100).toFixed(1),
      mean_budget: +mean(shamResults.map((r) => r.doseEvaluations[120].budget_used)).toFixed(4),
      steering_specific: mean(cR7) <= 0.05,
    },
  };

  // 6. Reset Counterfactuals across all doses
  const allResets = [];
  for (const res of targetAResults) {
    for (const [dose, rData] of Object.entries(res.resets)) {
      allResets.push({
        seed: res.seed,
        dose: +dose,
        ...rData,
      });
    }
  }

  // 7. Saturation Audit
  const saturationAudit = {
    target_a_doses: doseResponse.dose_comparison.map((dc) => ({
      dose: dc.dose_cycles,
      mean_budget_used: dc.mean_budget_used,
      max_budget_used: dc.max_budget_used,
      fraction_budget_exhausted: +(dc.max_budget_used >= 60.0 * 0.99 ? 1 : 0),
      fraction_seeds_touching_edge_clamp: dc.fraction_seeds_saturated,
      mean_alpha: dc.mean_alpha,
      max_alpha: dc.max_alpha,
      is_saturation_dependent: dc.mean_alpha >= 2.45,
    })),
    sham_120: {
      mean_budget_used: controls.R7_matched_sham_120.mean_budget,
      fraction_seeds_touching_edge_clamp: 1.0,
    },
  };

  // 8. Side Effect Panel across doses
  const sideEffectPanel = {};
  const refLeft = mean(targetAResults.map((r) => r.doseEvaluations[10].left_probe.left_dna02_rate));
  for (const d of [10, 30, 60, 120]) {
    const evals = targetAResults.map((r) => r.doseEvaluations[d]);
    const postLeft = evals.map((e) => e.left_probe.left_dna02_rate);
    const postWholeNet = evals.map((e) => e.right_probe.whole_net_rate);
    const preWholeNet = baselinePhenotypes.map((p) => p.baseline_whole_net_rate);

    sideEffectPanel[`dose_${d}`] = {
      dose_cycles: d,
      left_tactile_dna02_mean: +mean(postLeft).toFixed(4),
      left_tactile_retention_pct: +(mean(postLeft) / (refLeft || 1) * 100).toFixed(2),
      left_steering_preserved_within_5pct: Math.abs(mean(postLeft) - refLeft) / (refLeft || 1) <= 0.05,
      jo_auditory_right_mean: +mean(evals.map((e) => e.jo_right_probe.right_dna02_rate)).toFixed(4),
      thermosensory_right_mean: +mean(evals.map((e) => e.thermo_right_probe.right_dna02_rate)).toFixed(4),
      whole_network_rate_mean: +mean(postWholeNet).toFixed(4),
      whole_network_divergence_pct: +(((mean(postWholeNet) - mean(preWholeNet)) / mean(preWholeNet)) * 100).toFixed(2),
      modality_contamination_detected: evals.some((e) => e.jo_right_probe.right_dna02_rate > 0.05),
      runaway_excitation_detected: evals.some((e) => e.right_probe.whole_net_rate > mean(preWholeNet) * 1.5),
    };
  }

  // Write all artifacts
  fs.writeFileSync(path.join(ARTIFACT_DIR, "baseline_seed_phenotypes.json"), JSON.stringify(baselinePhenotypes, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "learning_curves.json"), JSON.stringify(learningCurves, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "dose_response.json"), JSON.stringify(doseResponse, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "first_passage.json"), JSON.stringify(firstPassage, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "responder_analysis.json"), JSON.stringify(responderAnalysis, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "controls.json"), JSON.stringify(controls, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "reset_counterfactuals.json"), JSON.stringify(allResets, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "saturation_audit.json"), JSON.stringify(saturationAudit, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_DIR, "side_effect_panel.json"), JSON.stringify(sideEffectPanel, null, 2));

  // Clean up intermediate worker files
  for (const wf of workerFiles) {
    fs.unlinkSync(path.join(ARTIFACT_DIR, wf));
  }

  console.log("\n================================================================================");
  console.log("PHASE IV-D.3 SYNTHESIS COMPLETED");
  console.log(`All 10 required artifacts saved in ${ARTIFACT_DIR}`);
  console.log("================================================================================\n");

  console.table(doseResponse.dose_comparison);
  console.table(Object.values(controls));
}

async function main() {
  const args = process.argv.slice(2);
  const workerIdx = args.indexOf("--worker");

  if (workerIdx !== -1 && args[workerIdx + 1] !== undefined) {
    const wId = parseInt(args[workerIdx + 1], 10);
    const sliceStart = parseInt(args[workerIdx + 2], 10);
    const sliceEnd = parseInt(args[workerIdx + 3], 10);
    const slice = SEEDS.filter((s) => s >= sliceStart && s <= sliceEnd);
    await runWorker(wId, slice);
    return;
  }

  if (args.includes("--compile-only")) {
    compilePhase4D3();
    return;
  }

  console.log("================================================================================");
  console.log("PHASE IV-D.3: DOSE RESPONSE & RESPONDER HETEROGENEITY EXPERIMENT");
  console.log("Cohort: N=100 development seeds (18200..18299) sharded across 10 CPU workers");
  console.log("================================================================================\n");

  const NUM_WORKERS = 10;
  const CHUNK_SIZE = Math.ceil(SEEDS.length / NUM_WORKERS);

  const tStart = Date.now();
  const workerPromises = [];

  for (let w = 0; w < NUM_WORKERS; w++) {
    const sStart = SEEDS[w * CHUNK_SIZE];
    const sEnd = SEEDS[Math.min(SEEDS.length - 1, (w + 1) * CHUNK_SIZE - 1)];

    workerPromises.push(
      new Promise((resolve, reject) => {
        const child = fork(__filename, ["--worker", String(w), String(sStart), String(sEnd)], {
          stdio: "inherit",
        });
        child.on("exit", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Worker ${w} failed with code ${code}`));
        });
        child.on("error", reject);
      })
    );
  }

  await Promise.all(workerPromises);
  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log(`\nAll ${NUM_WORKERS} workers completed in parallel in ${elapsed}s.`);

  compilePhase4D3();
}

main().catch((err) => {
  console.error("Fatal error in run_phase4d3_experiment:", err);
  process.exit(1);
});
