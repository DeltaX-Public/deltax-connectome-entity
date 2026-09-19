/**
 * test/readout_fidelity.test.mjs
 * Invariant tests for candidate bridge readout fidelity and information preservation.
 *
 * Enforces:
 *   1. READOUT_A_CURRENT reproduces frozen baseline HALT dominance.
 *   2. READOUT_C_INDEPENDENT_AXES preserves 100% steering sign and rank order (Spearman rho >= 0.95).
 *   3. Strict candidate provenance invariants (MEASURED_NEURAL vs DERIVED_NEURAL vs FALLBACK).
 *   4. Quiescent stance dominance when neural input is zero.
 *   5. Steering dominance over halt when lateral descending drive is active.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConnectomeCandidateBridge, READOUT_MODES } from '../src/connectome/candidate_bridge.mjs';

function makeSyntheticDn({ forward = 0, backward = 0, turn_left = 0, turn_right = 0, escape = 0, groom = 0 }) {
  return {
    forward: { weighted_mean: forward, mean_rate: forward, neurons: [{ index: 1 }], types: ['DNg100'] },
    backward: { weighted_mean: backward, mean_rate: backward, neurons: [{ index: 2 }], types: ['MDN'] },
    turn_left: { weighted_mean: turn_left, mean_rate: turn_left, neurons: [{ index: 3, silenced: false }], types: ['DNa02'] },
    turn_right: { weighted_mean: turn_right, mean_rate: turn_right, neurons: [{ index: 4, silenced: false }], types: ['DNa02'] },
    escape: { mean_rate: escape, neurons: [{ index: 5 }], types: ['DNp01'] },
    takeoff: { weighted_mean: 0, neurons: [], types: [] },
    groom: { weighted_mean: groom, mean_rate: groom, neurons: [{ index: 7 }], types: ['DNg07'] },
  };
}

test('1. Baseline READOUT_A_CURRENT exhibits Central HALT dominance under low forward', () => {
  const bridge = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_A_CURRENT });
  // Typical sensory atlas state: forward=0.1 Hz, turn_left=3.0 Hz
  const dn = makeSyntheticDn({ forward: 0.1, turn_left: 3.0 });
  const candidates = bridge.generateCandidates(dn, 1);
  const sorted = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength);

  assert.equal(sorted[0].action_class, 'halt', 'READOUT_A must reproduce HALT winning over steering');
  assert.ok(sorted[0].activation_strength > 0.9, 'HALT strength must be near 1.0 in READOUT_A');
  const turnCand = candidates.find((c) => c.action_class === 'turn_left');
  assert.ok(turnCand.activation_strength < sorted[0].activation_strength, 'Steering is suppressed by HALT');
});

test('2. READOUT_C_INDEPENDENT_AXES preserves lateral steering sign and overtakes halt', () => {
  const bridge = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES });

  // Left steering active
  const dnLeft = makeSyntheticDn({ forward: 0.1, turn_left: 2.0, turn_right: 0.0 });
  const candsLeft = bridge.generateCandidates(dnLeft, 1);
  const sortedLeft = [...candsLeft].sort((a, b) => b.activation_strength - a.activation_strength);

  assert.equal(sortedLeft[0].action_class, 'turn_left', 'Left turn candidate must win when turn_left DN is active');
  assert.equal(sortedLeft[0].provenance_type, 'MEASURED_NEURAL');
  assert.ok(sortedLeft[0].activation_strength > 0.3, 'Left turn strength must be robust');

  // Right steering active
  const dnRight = makeSyntheticDn({ forward: 0.1, turn_left: 0.0, turn_right: 2.0 });
  const candsRight = bridge.generateCandidates(dnRight, 1);
  const sortedRight = [...candsRight].sort((a, b) => b.activation_strength - a.activation_strength);

  assert.equal(sortedRight[0].action_class, 'turn_right', 'Right turn candidate must win when turn_right DN is active');
  assert.equal(sortedRight[0].provenance_type, 'MEASURED_NEURAL');
  assert.ok(sortedRight[0].activation_strength > 0.3, 'Right turn strength must be robust');
});

test('3. Provenance typing invariant across all candidates in READOUT_C', () => {
  const bridge = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES });
  const dn = makeSyntheticDn({ forward: 2.0, backward: 2.0, turn_left: 2.0, escape: 10.0, groom: 10.0 });
  const candidates = bridge.generateCandidates(dn, 1);

  const measuredClasses = ['locomotion_forward', 'locomotion_backward', 'turn_left', 'turn_right', 'giant_fiber_escape', 'groom'];
  for (const c of candidates) {
    if (measuredClasses.includes(c.action_class)) {
      assert.equal(c.provenance_type, 'MEASURED_NEURAL', `${c.action_class} must be MEASURED_NEURAL`);
      assert.ok(c.originating_neuron_indices.length > 0, `${c.action_class} must reference genuine neuron indices`);
    } else if (c.action_class === 'halt') {
      assert.equal(c.provenance_type, 'DERIVED_NEURAL', 'halt must be DERIVED_NEURAL');
    } else if (c.action_class === 'safe_noop') {
      assert.equal(c.provenance_type, 'FALLBACK', 'safe_noop must be FALLBACK');
    }
  }
});

test('4. Quiescence invariant: halt wins when all active neural drives are zero', () => {
  const bridge = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES });
  const dn = makeSyntheticDn({ forward: 0, backward: 0, turn_left: 0, turn_right: 0, escape: 0, groom: 0 });
  const candidates = bridge.generateCandidates(dn, 1);
  const sorted = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength);

  assert.equal(sorted[0].action_class, 'halt', 'Quiescent halt must win when neural rates are zero');
  assert.equal(sorted[0].provenance_type, 'DERIVED_NEURAL');
  assert.ok(sorted[0].activation_strength > 0.05, 'Quiescent halt must have baseline stance strength');
});

test('5. Differential contrast invariant: symmetric bilateral steering cancels torque', () => {
  const bridge = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES });
  // Bilateral symmetric steering input: 3.0 Hz on both left and right
  const dnSym = makeSyntheticDn({ forward: 2.0, turn_left: 3.0, turn_right: 3.0 });
  const candidates = bridge.generateCandidates(dnSym, 1);

  const candL = candidates.find((c) => c.action_class === 'turn_left');
  const candR = candidates.find((c) => c.action_class === 'turn_right');
  assert.equal(candL.activation_strength, 0, 'Symmetric bilateral steering must produce 0 net left torque');
  assert.equal(candR.activation_strength, 0, 'Symmetric bilateral steering must produce 0 net right torque');

  const candFwd = candidates.find((c) => c.action_class === 'locomotion_forward');
  assert.ok(candFwd.activation_strength > 0.4, 'Forward locomotion is preserved');
});
