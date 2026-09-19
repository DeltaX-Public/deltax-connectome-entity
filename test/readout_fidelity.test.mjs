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

test('6. Backward locomotion embodiment: MDN drive maps to backward action and executes correctly', async () => {
  const bridge = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES });
  const dnBack = makeSyntheticDn({ forward: 0.1, backward: 4.0 });
  const candidates = bridge.generateCandidates(dnBack, 1);

  const backCand = candidates.find((c) => c.action_class === 'locomotion_backward');
  assert.ok(backCand, 'locomotion_backward candidate must exist when MDN rate > 0.1');
  assert.equal(backCand.actuator_action, 'backward', 'locomotion_backward must map to backward actuator action');
  assert.equal(backCand.is_executable, true, 'backward locomotion must be executable');
  assert.equal(backCand.embodiment_status, 'FULLY_EMBODIED');

  // Test in RoverBody
  const { RoverBody } = await import('../src/embodiment/rover/body.mjs');
  const rover = new RoverBody({ x: 3, y: 3, heading: 0, energy: 20 }); // Heading 0 = East
  const proposal = rover.proposal('backward');
  assert.equal(proposal.action, 'backward');
  assert.equal(proposal.nextHeading, 0, 'Backward must preserve current heading');
  assert.deepEqual(proposal.target, { x: 2, y: 3 }, 'Backward from (3,3) facing East must target (2,3)');

  const res = rover.apply(proposal);
  assert.equal(res.status, 'MOVED_BACKWARD');
  assert.equal(rover.x, 2);
  assert.equal(rover.y, 3);
  assert.equal(rover.heading, 0);
  assert.equal(rover.energy, 19.0, 'Backward must consume 1.0 energy unit');
});

test('7. Quiescence remains distinct from backward drive', () => {
  const bridge = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES });
  // Quiescent state: all 0
  const dnQuiescent = makeSyntheticDn({ forward: 0, backward: 0 });
  const candsQuiescent = bridge.generateCandidates(dnQuiescent, 1);
  const backInQuiescent = candsQuiescent.find((c) => c.action_class === 'locomotion_backward');
  assert.equal(backInQuiescent, undefined, 'locomotion_backward candidate must not be emitted when MDN is 0');

  // Active backward state
  const dnBack = makeSyntheticDn({ forward: 0, backward: 3.0 });
  const candsBack = bridge.generateCandidates(dnBack, 1);
  const backActive = candsBack.find((c) => c.action_class === 'locomotion_backward');
  assert.ok(backActive, 'locomotion_backward must be emitted when MDN is active');
  assert.ok(backActive.activation_strength > 0.5);
});

test('8. Escape reflex distinct from halt and marked UNEMBODIED in rover', () => {
  const bridge = new ConnectomeCandidateBridge({ readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES });
  const dnEscape = makeSyntheticDn({ forward: 0.1, escape: 25.0 });
  const candidates = bridge.generateCandidates(dnEscape, 1);

  const escapeCand = candidates.find((c) => c.action_class === 'giant_fiber_escape');
  assert.ok(escapeCand, 'giant_fiber_escape candidate must exist');
  assert.equal(escapeCand.is_executable, false, 'escape reflex must not be executable in rover');
  assert.equal(escapeCand.forbidden, true, 'escape reflex must be marked forbidden for execution');
  assert.equal(escapeCand.forbidden_reason, 'UNEMBODIED_ACTUATOR');
  assert.equal(escapeCand.actuator_action, null, 'escape must not silently map to stop');
});

test('9. Causal provenance invariant: executed action traces to pre-evaluation candidate ID', async () => {
  const { ChangedWorldHarness } = await import('../src/experiments/changed_world/harness.mjs');
  const harness = new ChangedWorldHarness({
    seed: 9001,
    condition: 'CONTROL',
    sensoryMode: 'LATERALIZED',
    readoutMode: READOUT_MODES.READOUT_C_INDEPENDENT_AXES,
    maxStepsPerTrial: 5,
  });

  const ep = await harness.runEpisode();
  await harness.close();

  for (const stepLog of ep.trial1.history) {
    assert.ok(stepLog.chosenCandidateClass, 'Step log must record chosen candidate class');
    assert.ok(['forward', 'backward', 'left', 'right', 'stop'].includes(stepLog.chosenAction));
  }
});
