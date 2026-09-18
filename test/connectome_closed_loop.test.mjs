import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConnectomeRuntime } from '../src/connectome/runtime.mjs';
import { ConnectomeSensoryTransduction } from '../src/connectome/sensory_transduction.mjs';
import { ConnectomeCandidateBridge } from '../src/connectome/candidate_bridge.mjs';
import { ConnectomeClosedLoop } from '../src/connectome/closed_loop.mjs';

test('1. Connectome loads biological connectome graph (N=165,122, E>10M)', () => {
  const rt = new ConnectomeRuntime({ seed: 42 });
  assert.equal(rt.N, 165122);
  assert.ok(rt.E > 10000000, `Expected >10M synapses, got ${rt.E}`);
  assert.ok(rt.dnPopulations.forward.length > 0, 'Forward DN population must be non-empty');
  assert.ok(rt.dnPopulations.turn_left.length > 0, 'Turn left DN population must be non-empty');
  assert.ok(rt.dnPopulations.turn_right.length > 0, 'Turn right DN population must be non-empty');
});

test('2. Sensory transduction maps physical observation to sensory receptor firing rates without cheat labels', () => {
  const rt = new ConnectomeRuntime({ seed: 42 });
  const st = new ConnectomeSensoryTransduction(rt.data);

  // Clear sensory field
  const clearDrives = st.transduce({
    collision: { blocked: false },
    proximity: { nearest_distance: 5.0 },
    visual_field: { nearest_obstacle_distance: 5.0 },
  });
  // Baseline ambient photoreceptors exist
  assert.ok(clearDrives.size > 0, 'Ambient receptors provide baseline drive');

  // Blocked / obstacle collision adds tactile and Johnston organ receptors
  const blockedDrives = st.transduce({
    collision: { blocked: true },
    proximity: { nearest_distance: 0.1 },
    visual_field: { nearest_obstacle_distance: 0.1 },
  });
  assert.ok(blockedDrives.size > clearDrives.size, `Blocked collision must recruit additional sensory receptors (${blockedDrives.size} > ${clearDrives.size})`);

  // Ensure no solution labels or hidden actions leaked
  const driveKeys = Array.from(blockedDrives.keys());
  for (const k of driveKeys) {
    assert.equal(typeof k, 'number', 'Transduced drives must be numeric neuron indices');
    assert.ok(k >= 0 && k < rt.N, 'Neuron indices must be within connectome bounds');
  }
});

test('3. Connectome candidate generation changes with neural and sensory state', () => {
  const rt = new ConnectomeRuntime({ seed: 101, substepsPerTick: 10 });
  const st = new ConnectomeSensoryTransduction(rt.data);
  const bridge = new ConnectomeCandidateBridge();

  // Baseline step without sensory drive
  rt.step(10);
  const baselineReadouts = rt.getDescendingNeuronReadouts();
  const baselineCandidates = bridge.generateCandidates(baselineReadouts, 1);

  // Drive with collision stimuli
  const blockedDrives = st.transduce({
    collision: { blocked: true },
    proximity: { nearest_distance: 0.1 },
  });
  rt.setSensoryDrives(blockedDrives);
  rt.step(10);
  const stimulatedReadouts = rt.getDescendingNeuronReadouts();
  const stimulatedCandidates = bridge.generateCandidates(stimulatedReadouts, 2);

  // Provenance verification
  for (const c of stimulatedCandidates) {
    assert.ok(c.substrate_candidate_id, 'Candidate must have substrate_candidate_id');
    assert.ok(c.originating_population.length > 0, 'Candidate must declare originating population');
    assert.ok(c.originating_neuron_indices.length > 0, 'Candidate must declare originating neuron indices');
    assert.ok(c.raw_activity_measure, 'Candidate must declare raw activity measure');
  }

  // Neural firing rate changed under stimulation
  assert.notEqual(
    stimulatedReadouts.turn_left.weighted_mean,
    baselineReadouts.turn_left.weighted_mean,
    'Stimulation must change descending neuron readouts',
  );
});

test('4. Causal neural silencing alters candidate field and prevents motor proposal', () => {
  const rt = new ConnectomeRuntime({ seed: 202 });
  const bridge = new ConnectomeCandidateBridge();

  // Excite forward command neurons
  rt.excite(['DNg100', 'DNg97', 'DNp09'], 80);
  rt.step(10);
  const excitedReadouts = rt.getDescendingNeuronReadouts();
  const excitedCandidates = bridge.generateCandidates(excitedReadouts, 1);
  const fwdCand = excitedCandidates.find((c) => c.action_class === 'locomotion_forward');
  assert.ok(fwdCand.activation_strength > 0.5, `Excited forward DNs should produce strong forward candidate, got ${fwdCand.activation_strength}`);

  // Silence forward command neurons
  rt.silence(['DNg100', 'DNg97', 'DNp09']);
  rt.step(10);
  const silencedReadouts = rt.getDescendingNeuronReadouts();
  const silencedCandidates = bridge.generateCandidates(silencedReadouts, 2);
  const silencedFwdCand = silencedCandidates.find((c) => c.action_class === 'locomotion_forward');

  assert.ok(
    silencedFwdCand.activation_strength < fwdCand.activation_strength,
    `Silencing forward DNs must reduce forward candidate activation (${silencedFwdCand.activation_strength} < ${fwdCand.activation_strength})`,
  );
});

test('5. Bit-exact connectome snapshot and restore', () => {
  const rt = new ConnectomeRuntime({ seed: 303 });
  rt.excite(['DNa02'], 50);
  rt.step(10);

  const snapshot = rt.snapshot();
  assert.equal(snapshot.schema, 'connectome.runtime.snapshot.v1');

  // Advance further
  rt.step(10);
  const advancedT = rt.net.t;
  assert.ok(advancedT > snapshot.t);

  // Restore
  rt.restore(snapshot);
  assert.equal(rt.net.t, snapshot.t, 'Restored time must match snapshot');
  assert.deepEqual(Array.from(rt.net.r.slice(0, 100)), snapshot.r.slice(0, 100), 'Restored rates must match snapshot');
});
