/**
 * readout_fidelity_evaluation.mjs
 * Evaluates information preservation and causal counterfactuals across:
 *   READOUT_A_CURRENT, READOUT_B_UPSTREAM_REFERENCE, and READOUT_C_INDEPENDENT_AXES.
 *
 * Replays frozen neural responses from Phase IV-A artifacts:
 *   - lateralization.json
 *   - phase3_stimulus_projection.json
 *   - aversive_characterization.json
 *   - dose_response.json
 *
 * Computes:
 *   - Spearman rank correlation (neural vs candidate)
 *   - Steering sign preservation
 *   - Left/Right differential preservation
 *   - Candidate entropy
 *   - Dead-zone & saturation fractions
 *   - State collapse counts
 *   - Winner distributions across readouts
 *
 * Outputs: artifacts/readout/fidelity_evaluation.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConnectomeCandidateBridge, READOUT_MODES } from '../src/connectome/candidate_bridge.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const atlasDir = path.join(repoRoot, 'artifacts', 'sensory_atlas');
const outDir = path.join(repoRoot, 'artifacts', 'readout');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Helper: Spearman Rank Correlation
function rankArray(arr) {
  const sorted = arr.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
  const ranks = new Array(arr.length);
  for (let i = 0; i < sorted.length; i++) {
    ranks[sorted[i].idx] = i + 1;
  }
  return ranks;
}

function spearmanCorrelation(x, y) {
  if (x.length !== y.length || x.length < 2) return 0;
  const rx = rankArray(x);
  const ry = rankArray(y);
  const n = x.length;
  let d2 = 0;
  for (let i = 0; i < n; i++) {
    const diff = rx[i] - ry[i];
    d2 += diff * diff;
  }
  return 1 - (6 * d2) / (n * (n * n - 1));
}

function computeCandidateEntropy(candidates) {
  const strengths = candidates.map((c) => Math.max(1e-9, c.activation_strength || 0));
  const sum = strengths.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  const probs = strengths.map((s) => s / sum);
  return -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0);
}

function makeDnReadoutObject({ forward = 0, backward = 0, turn_left = 0, turn_right = 0, escape = 0, groom = 0 }) {
  return {
    forward: {
      weighted_mean: forward,
      mean_rate: forward,
      neurons: [{ index: 1, type: 'DNg100' }],
      types: ['DNg100'],
    },
    backward: {
      weighted_mean: backward,
      mean_rate: backward,
      neurons: [{ index: 2, type: 'MDN' }],
      types: ['MDN'],
    },
    turn_left: {
      weighted_mean: turn_left,
      mean_rate: turn_left,
      neurons: [{ index: 3, type: 'DNa02', silenced: false }],
      types: ['DNa02'],
    },
    turn_right: {
      weighted_mean: turn_right,
      mean_rate: turn_right,
      neurons: [{ index: 4, type: 'DNa02', silenced: false }],
      types: ['DNa02'],
    },
    escape: {
      mean_rate: escape,
      neurons: [{ index: 5, type: 'DNp01' }],
      types: ['DNp01'],
    },
    takeoff: {
      weighted_mean: 0,
      neurons: [],
      types: [],
    },
    groom: {
      weighted_mean: groom,
      mean_rate: groom,
      neurons: [{ index: 7, type: 'DNg07' }],
      types: ['DNg07'],
    },
  };
}

const bridgeA = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_A_CURRENT });
const bridgeB = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_B_UPSTREAM_REFERENCE });
const bridgeC = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES });

// Load frozen lateralization dataset
const latData = JSON.parse(fs.readFileSync(path.join(atlasDir, 'lateralization.json'), 'utf8'));
const intactResults = latData.results?.intact || {};

// Collect all empirical neural points from lateralization sweeps
const neuralTestPoints = [];
for (const [popName, sweepList] of Object.entries(intactResults)) {
  for (const item of sweepList) {
    neuralTestPoints.push({
      population: popName,
      label: item.label,
      forward: item.forward_hz || 0,
      backward: item.backward_hz || 0,
      turn_left: item.turn_left_hz || 0,
      turn_right: item.turn_right_hz || 0,
      escape: item.escape_hz || 0,
      groom: 0,
      net_steering_hz: (item.turn_left_hz || 0) - (item.turn_right_hz || 0),
    });
  }
}

// Load Phase III projection dataset
const projData = JSON.parse(fs.readFileSync(path.join(atlasDir, 'phase3_stimulus_projection.json'), 'utf8'));
for (const pt of (projData.projection_results || [])) {
  neuralTestPoints.push({
    population: `phase3_${pt.condition}`,
    label: `step_${pt.step}`,
    forward: pt.dn_activity?.forward_locomotion_hz || 0,
    backward: pt.dn_activity?.backward_mdn_hz || 0,
    turn_left: pt.dn_activity?.turn_left_hz || 0,
    turn_right: pt.dn_activity?.turn_right_hz || 0,
    escape: pt.dn_activity?.escape_takeoff_hz || 0,
    groom: 0,
    net_steering_hz: (pt.dn_activity?.turn_left_hz || 0) - (pt.dn_activity?.turn_right_hz || 0),
  });
}

console.log(`Loaded ${neuralTestPoints.length} empirical neural states from Phase IV-A atlas.`);

function evaluateReadout(name, bridgeInstance) {
  let signMatches = 0;
  let signEvaluated = 0;
  const rawDiffs = [];
  const candDiffs = [];
  const entropies = [];
  const winnerCounts = {};
  const rankingsSeen = new Set();
  let saturationCount = 0;
  let totalCandidatesEvaluated = 0;
  let deadZoneCount = 0;

  const pointRecords = [];

  for (const pt of neuralTestPoints) {
    const dn = makeDnReadoutObject(pt);
    const candidates = bridgeInstance.generateCandidates(dn, 1);
    const sorted = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength);
    const winner = sorted[0];
    winnerCounts[winner.action_class] = (winnerCounts[winner.action_class] || 0) + 1;

    // Rank signature
    const rankSignature = sorted.map((c) => c.action_class).join('>');
    rankingsSeen.add(rankSignature);

    const entropy = computeCandidateEntropy(candidates);
    entropies.push(entropy);

    // Steering preservation
    const candTurnL = candidates.find((c) => c.action_class === 'turn_left')?.activation_strength || 0;
    const candTurnR = candidates.find((c) => c.action_class === 'turn_right')?.activation_strength || 0;
    const candDiff = candTurnL - candTurnR;

    if (Math.abs(pt.net_steering_hz) > 0.05) {
      signEvaluated++;
      if (Math.sign(pt.net_steering_hz) === Math.sign(candDiff)) {
        signMatches++;
      }
    }
    rawDiffs.push(pt.net_steering_hz);
    candDiffs.push(candDiff);

    // Saturation and dead zones
    for (const c of candidates) {
      totalCandidatesEvaluated++;
      if (c.activation_strength >= 0.95) saturationCount++;
      if (c.activation_strength <= 0.05 && c.action_class !== 'safe_noop') deadZoneCount++;
    }

    pointRecords.push({
      population: pt.population,
      label: pt.label,
      neural: {
        fwd: pt.forward,
        back: pt.backward,
        turnL: pt.turn_left,
        turnR: pt.turn_right,
        diff: +pt.net_steering_hz.toFixed(3),
      },
      winner: winner.action_class,
      winner_strength: winner.activation_strength,
      winner_provenance: winner.provenance_type,
      cand_diff: +candDiff.toFixed(3),
      entropy: +entropy.toFixed(3),
      ranking: sorted.map((c) => `${c.action_class}(${c.activation_strength})`).slice(0, 3),
    });
  }

  const spearmanSteering = spearmanCorrelation(rawDiffs, candDiffs);
  const signPreservationRate = signEvaluated > 0 ? signMatches / signEvaluated : 1.0;
  const meanEntropy = entropies.reduce((a, b) => a + b, 0) / entropies.length;
  const saturationFraction = saturationCount / totalCandidatesEvaluated;
  const deadZoneFraction = deadZoneCount / totalCandidatesEvaluated;

  return {
    readout_name: name,
    total_states_evaluated: neuralTestPoints.length,
    sign_preservation_rate: +signPreservationRate.toFixed(4),
    spearman_steering_correlation: +spearmanSteering.toFixed(4),
    mean_entropy: +meanEntropy.toFixed(3),
    unique_rank_orderings: rankingsSeen.size,
    collapsed_state_ratio: +(1 - rankingsSeen.size / neuralTestPoints.length).toFixed(3),
    saturation_fraction: +saturationFraction.toFixed(3),
    dead_zone_fraction: +deadZoneFraction.toFixed(3),
    winner_distribution: winnerCounts,
    sample_records: pointRecords.slice(0, 10),
  };
}

const evalA = evaluateReadout('READOUT_A_CURRENT', bridgeA);
const evalB = evaluateReadout('READOUT_B_UPSTREAM_REFERENCE', bridgeB);
const evalC = evaluateReadout('READOUT_C_INDEPENDENT_AXES', bridgeC);

// Causal counterfactual comparison on pure unilateral tactile stimulation (T1 L=180, R=0)
const unilateralTactile = neuralTestPoints.find((p) => p.population === 'tactile T1' && p.label === 'L=180 / R=0');
const counterfactual = {
  stimulus: 'Unilateral Tactile T1 (L=180 Hz, R=0 Hz)',
  neural_state: unilateralTactile,
  outcomes: {
    READOUT_A_CURRENT: bridgeA.generateCandidates(makeDnReadoutObject(unilateralTactile), 1).map((c) => ({
      action: c.action_class,
      strength: c.activation_strength,
      provenance: c.provenance_type,
    })),
    READOUT_B_UPSTREAM_REFERENCE: bridgeB.generateCandidates(makeDnReadoutObject(unilateralTactile), 1).map((c) => ({
      action: c.action_class,
      strength: c.activation_strength,
      provenance: c.provenance_type,
    })),
    READOUT_C_INDEPENDENT_AXES: bridgeC.generateCandidates(makeDnReadoutObject(unilateralTactile), 1).map((c) => ({
      action: c.action_class,
      strength: c.activation_strength,
      provenance: c.provenance_type,
    })),
  },
};

const report = {
  timestamp: new Date().toISOString(),
  neural_corpus_size: neuralTestPoints.length,
  comparison: {
    READOUT_A_CURRENT: evalA,
    READOUT_B_UPSTREAM_REFERENCE: evalB,
    READOUT_C_INDEPENDENT_AXES: evalC,
  },
  causal_counterfactual: counterfactual,
};

fs.writeFileSync(path.join(outDir, 'fidelity_evaluation.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('Saved fidelity evaluation to artifacts/readout/fidelity_evaluation.json');

console.log('\n--- INFORMATION PRESERVATION COMPARISON ---');
console.table([
  {
    Readout: 'READOUT_A_CURRENT',
    'Sign Pres.': `${(evalA.sign_preservation_rate * 100).toFixed(1)}%`,
    'Spearman ρ': evalA.spearman_steering_correlation,
    Entropy: evalA.mean_entropy,
    'Unique Ranks': evalA.unique_rank_orderings,
    'Winner Dist': JSON.stringify(evalA.winner_distribution),
  },
  {
    Readout: 'READOUT_B_UPSTREAM_REFERENCE',
    'Sign Pres.': `${(evalB.sign_preservation_rate * 100).toFixed(1)}%`,
    'Spearman ρ': evalB.spearman_steering_correlation,
    Entropy: evalB.mean_entropy,
    'Unique Ranks': evalB.unique_rank_orderings,
    'Winner Dist': JSON.stringify(evalB.winner_distribution),
  },
  {
    Readout: 'READOUT_C_INDEPENDENT_AXES',
    'Sign Pres.': `${(evalC.sign_preservation_rate * 100).toFixed(1)}%`,
    'Spearman ρ': evalC.spearman_steering_correlation,
    Entropy: evalC.mean_entropy,
    'Unique Ranks': evalC.unique_rank_orderings,
    'Winner Dist': JSON.stringify(evalC.winner_distribution),
  },
]);
