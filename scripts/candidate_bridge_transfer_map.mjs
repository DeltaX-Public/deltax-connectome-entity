/**
 * candidate_bridge_transfer_map.mjs
 * Systematically audits ConnectomeCandidateBridge as an input-output transfer function.
 * Sweeps descending-neuron (DN) activity fields and records candidate activations,
 * rankings, winner boundaries, rank distortions, and saturation levels.
 *
 * Outputs: artifacts/readout/bridge-transfer-map.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConnectomeCandidateBridge } from '../src/connectome/candidate_bridge.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'artifacts', 'readout');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function makeDnReadouts({
  forward = 0,
  backward = 0,
  turn_left = 0,
  turn_right = 0,
  escape = 0,
  takeoff = 0,
  groom = 0,
} = {}) {
  return {
    forward: {
      weighted_mean: forward,
      mean_rate: forward,
      max_rate: forward,
      neurons: [{ index: 1, type: 'DNg100' }],
      types: ['DNg100'],
    },
    backward: {
      weighted_mean: backward,
      mean_rate: backward,
      max_rate: backward,
      neurons: [{ index: 2, type: 'MDN' }],
      types: ['MDN'],
    },
    turn_left: {
      weighted_mean: turn_left,
      mean_rate: turn_left,
      max_rate: turn_left,
      neurons: [{ index: 3, type: 'DNa02', silenced: false }],
      types: ['DNa02'],
    },
    turn_right: {
      weighted_mean: turn_right,
      mean_rate: turn_right,
      max_rate: turn_right,
      neurons: [{ index: 4, type: 'DNa02', silenced: false }],
      types: ['DNa02'],
    },
    escape: {
      mean_rate: escape,
      neurons: [{ index: 5, type: 'DNp01' }],
      types: ['DNp01'],
    },
    takeoff: {
      weighted_mean: takeoff,
      neurons: [{ index: 6, type: 'DNp02' }],
      types: ['DNp02'],
    },
    groom: {
      weighted_mean: groom,
      mean_rate: groom,
      neurons: [{ index: 7, type: 'DNg07' }],
      types: ['DNg07'],
    },
  };
}

const bridge = new ConnectomeCandidateBridge();

// 1. Single-axis sweeps (0 to 50 Hz in steps of 1 Hz)
const singleAxisSweeps = {};
const sweepAxes = ['forward', 'backward', 'turn_left', 'turn_right', 'escape', 'groom'];

for (const axis of sweepAxes) {
  const steps = [];
  for (let hz = 0; hz <= 50; hz += 1) {
    const dn = makeDnReadouts({ [axis]: hz });
    const candidates = bridge.generateCandidates(dn, hz);
    const sorted = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength);
    const candMap = {};
    for (const c of candidates) {
      candMap[c.action_class] = c.activation_strength;
    }
    steps.push({
      hz,
      candidates: candMap,
      winner: sorted[0]?.action_class || null,
      winner_strength: sorted[0]?.activation_strength || 0,
      ranking: sorted.map((c) => c.action_class),
    });
  }
  singleAxisSweeps[axis] = steps;
}

// 2. 2D sweep: Forward vs Turn Left (0 to 30 Hz by 1 Hz)
const grid2D = [];
for (let fwd = 0; fwd <= 30; fwd += 2) {
  for (let tl = 0; tl <= 30; tl += 2) {
    const dn = makeDnReadouts({ forward: fwd, turn_left: tl });
    const candidates = bridge.generateCandidates(dn, 1);
    const sorted = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength);
    const candMap = {};
    for (const c of candidates) {
      candMap[c.action_class] = c.activation_strength;
    }
    grid2D.push({
      forward_hz: fwd,
      turn_left_hz: tl,
      winner: sorted[0]?.action_class || null,
      winner_strength: sorted[0]?.activation_strength || 0,
      candidates: candMap,
      turn_left_rank: sorted.findIndex((c) => c.action_class === 'turn_left') + 1,
      halt_rank: sorted.findIndex((c) => c.action_class === 'halt') + 1,
    });
  }
}

// 3. Central HALT Hypothesis Test Cases A through E
const testCases = [
  {
    case_id: 'A',
    description: 'forward=low, backward=low, turn_left=high, turn_right=low',
    dn: { forward: 0.2, backward: 0.0, turn_left: 5.0, turn_right: 0.1 },
  },
  {
    case_id: 'B',
    description: 'forward=low, backward=high, turn_left=high, turn_right=low',
    dn: { forward: 0.2, backward: 6.0, turn_left: 5.0, turn_right: 0.1 },
  },
  {
    case_id: 'C',
    description: 'forward=high, backward=low, turn_left=high, turn_right=low',
    dn: { forward: 20.0, backward: 0.0, turn_left: 5.0, turn_right: 0.1 },
  },
  {
    case_id: 'D',
    description: 'forward=low, backward=low, turn_left=low, turn_right=low (quiescence)',
    dn: { forward: 0.0, backward: 0.0, turn_left: 0.0, turn_right: 0.0 },
  },
  {
    case_id: 'E',
    description: 'forward=low, escape=high',
    dn: { forward: 0.2, backward: 0.0, escape: 35.0 },
  },
];

const testCaseResults = testCases.map((tc) => {
  const dn = makeDnReadouts(tc.dn);
  const candidates = bridge.generateCandidates(dn, 1);
  const sorted = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength);
  const candMap = {};
  for (const c of candidates) {
    candMap[c.action_class] = {
      strength: c.activation_strength,
      provenance: c.provenance_type,
      actuator: c.actuator_action,
      method: c.normalization_method,
    };
  }
  return {
    case_id: tc.case_id,
    description: tc.description,
    input_dn: tc.dn,
    winner: sorted[0]?.action_class || null,
    winner_actuator: sorted[0]?.actuator_action || null,
    winner_provenance: sorted[0]?.provenance_type || null,
    ranking: sorted.map((c) => ({
      action: c.action_class,
      actuator: c.actuator_action,
      strength: c.activation_strength,
      provenance: c.provenance_type,
    })),
    candidates: candMap,
  };
});

// 4. Critical Transfer Metrics
// Threshold crossing: at what turn_left rate does turn_left overtake halt if forward = 0?
let turnLeftOvertakeFwd0 = null;
for (let hz = 0; hz <= 200; hz += 0.5) {
  const dn = makeDnReadouts({ forward: 0, turn_left: hz });
  const candidates = bridge.generateCandidates(dn, 1);
  const sorted = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength);
  if (sorted[0].action_class === 'turn_left') {
    turnLeftOvertakeFwd0 = hz;
    break;
  }
}

// Dead-zone and saturation analysis
const forwardSweep = singleAxisSweeps.forward;
const fwdSaturationHz = forwardSweep.find((s) => s.candidates.locomotion_forward >= 0.95)?.hz || null;
const turnSweep = singleAxisSweeps.turn_left;
const turnSaturationHz = turnSweep.find((s) => s.candidates.turn_left >= 0.95)?.hz || null;

const summary = {
  timestamp: new Date().toISOString(),
  bridge_scales: {
    fwdScale: bridge.fwdScale,
    turnScale: bridge.turnScale,
    escapeScale: bridge.escapeScale,
    groomScale: bridge.groomScale,
  },
  key_findings: {
    halt_origin: 'DERIVED_NEURAL, formula: max(0.1, 1.0 - (fwdStrength * 0.85))',
    halt_at_zero_fwd: singleAxisSweeps.forward[0].candidates.halt,
    turn_left_overtake_hz_at_zero_fwd: turnLeftOvertakeFwd0,
    turn_left_max_strength_possible: +(1 - Math.exp(-Infinity)).toFixed(3),
    turn_left_strength_at_5hz: singleAxisSweeps.turn_left[5].candidates.turn_left,
    turn_left_strength_at_10hz: singleAxisSweeps.turn_left[10].candidates.turn_left,
    fwd_saturation_hz: fwdSaturationHz,
    turn_saturation_hz: turnSaturationHz,
  },
  test_cases: testCaseResults,
  single_axis_sweeps: singleAxisSweeps,
  forward_vs_turn_left_2d: grid2D,
};

const outPath = path.join(outDir, 'bridge-transfer-map.json');
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
console.log(`Saved CandidateBridge transfer map to ${outPath}`);
console.log(`Key Finding: When forward=0, haltStrength is ${summary.key_findings.halt_at_zero_fwd}`);
console.log(`Key Finding: TurnLeft overtaking threshold at forward=0: ${turnLeftOvertakeFwd0 ?? 'NEVER (HALT permanently dominates)'}`);
for (const tc of testCaseResults) {
  console.log(`Case ${tc.case_id} (${tc.description}) -> Winner: ${tc.winner} (${tc.ranking[0].strength}, ${tc.winner_provenance})`);
}
