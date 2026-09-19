/**
 * test/phase4c_generalization.test.mjs
 * Invariant and unit tests for Phase IV-C Repaired Environment Suite and Candidate Selectors.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENVIRONMENT_SUITE, TemporalNonMarkovianWorld } from '../src/worlds/changed_world/environment_suite.mjs';
import {
  CONTROLLER_TYPES,
  selectCandidate,
  createPrng,
  FAILURE_TAXONOMY,
  classifyFailure,
} from '../src/controllers/candidate_selectors.mjs';
import { DIAGNOSTIC_FORKS, attributeFailureCausally } from '../src/experiments/changed_world/diagnostic_forks.mjs';

test('1. Environment Generalization Suite contains valid, schema-compliant environments', () => {
  const envKeys = Object.keys(ENVIRONMENT_SUITE);
  assert.ok(envKeys.length >= 10, 'Suite must contain at least 10 environments');

  for (const key of envKeys) {
    const envDef = ENVIRONMENT_SUITE[key];
    assert.ok(envDef.id, `Environment ${key} must have an id`);
    assert.ok(envDef.name, `Environment ${key} must have a name`);
    assert.ok(typeof envDef.createWorld === 'function', `Environment ${key} must have createWorld()`);

    const world = envDef.createWorld({ seed: 42 });
    assert.ok(world.width > 0 && world.height > 0);
    assert.ok(world.startPos);
    assert.ok(world.goalRegion);
    const obs = world.observe();
    assert.ok(obs.visual_field);
    assert.ok(obs.lateral_sensors);
  }
});

test('2. ENV_1B_TRUE_RIGHT_REQUIRED blocks North passage and has enclosed perimeter', () => {
  const world = ENVIRONMENT_SUITE.ENV_1B_TRUE_RIGHT_REQUIRED.createWorld();
  // North at (5, 2) is blocked
  assert.equal(world.isObstacle(5, 2), true, 'North passage at (5, 2) must be blocked');
  // South at (5, 4) is open
  assert.equal(world.isObstacle(5, 4), false, 'South passage at (5, 4) must be open');
  // Perimeter boundaries are solid
  assert.equal(world.isObstacle(0, 3), true, 'West boundary at x=0 must be closed');
  assert.equal(world.isObstacle(5, 0), true, 'North boundary at y=0 must be closed');
  assert.equal(world.isObstacle(5, 6), true, 'South boundary at y=6 must be closed');
});

test('3. True Turn-Polarity Pair: ENV_POLARITY_LEFT and ENV_POLARITY_RIGHT are exact geometric mirrors', () => {
  const worldL = ENVIRONMENT_SUITE.ENV_POLARITY_LEFT.createWorld();
  const worldR = ENVIRONMENT_SUITE.ENV_POLARITY_RIGHT.createWorld();

  // ENV_POLARITY_LEFT: South blocked at (5, 4), North open at (5, 2)
  assert.equal(worldL.isObstacle(5, 4), true, 'South passage must be blocked in LEFT world');
  assert.equal(worldL.isObstacle(5, 2), false, 'North passage must be open in LEFT world');
  assert.equal(worldL.goalRegion.yMin, 1);
  assert.equal(worldL.goalRegion.yMax, 2);

  // ENV_POLARITY_RIGHT: North blocked at (5, 2), South open at (5, 4)
  assert.equal(worldR.isObstacle(5, 2), true, 'North passage must be blocked in RIGHT world');
  assert.equal(worldR.isObstacle(5, 4), false, 'South passage must be open in RIGHT world');
  assert.equal(worldR.goalRegion.yMin, 4);
  assert.equal(worldR.goalRegion.yMax, 5);

  // Exact horizontal symmetry verification
  for (let x = 0; x < 11; x++) {
    for (let y = 0; y < 7; y++) {
      const obsL = worldL.isObstacle(x, y);
      const obsR = worldR.isObstacle(x, 6 - y);
      assert.equal(obsL, obsR, `Symmetry mismatch at (${x}, ${y}) vs (${x}, ${6 - y})`);
    }
  }
});

test('4. ENV_CHOICE_WITH_REVERSAL requires opposite turn polarities at sequential obstacles', () => {
  const world = ENVIRONMENT_SUITE.ENV_CHOICE_WITH_REVERSAL.createWorld();
  // First obstacle: North open at (4, 2), South blocked at (4, 4)
  assert.equal(world.isObstacle(4, 2), false, 'First obstacle must allow LEFT bypass at (4, 2)');
  assert.equal(world.isObstacle(4, 4), true, 'First obstacle must block RIGHT bypass at (4, 4)');

  // Second obstacle: East blocked at (9, 1), South open at (8, 2)
  assert.equal(world.isObstacle(9, 1), true, 'Second obstacle must block straight at (9, 1)');
  assert.equal(world.isObstacle(8, 2), false, 'Second obstacle must allow RIGHT exit at (8, 2)');
});

test('5. ENV_TEMPORAL_NON_MARKOVIAN provides 100% bit-exact observations at junction J between trials', () => {
  const world = new TemporalNonMarkovianWorld();
  world.body.x = 3;
  world.body.y = 3;
  world.body.heading = 0;

  // Trial 1 observation at (3, 3)
  const obs1 = JSON.stringify(world.observe());

  // Trial 2 (changed) observation at (3, 3)
  world.isChanged = true;
  const obs2 = JSON.stringify(world.observe());

  assert.equal(obs1, obs2, 'Sensory observation at junction J must be bit-exact identical between trials');
  // Downstream paths differ:
  assert.equal(world.isObstacle(6, 1), true, 'Trial 2 must have North blocked downstream');
  assert.equal(world.isObstacle(6, 5), false, 'Trial 2 must have South open downstream');
});

test('6. Executive candidate selector enforces strict match and SAFE_NOOP fallback on invalid ID', () => {
  const candidates = [
    { id: 'cand_fwd_1', substrate_candidate_id: 'sc_fwd_1', action_class: 'locomotion_forward', activation_strength: 0.9, forbidden: false, is_executable: true },
    { id: 'cand_left_1', substrate_candidate_id: 'sc_left_1', action_class: 'turn_left', activation_strength: 0.5, forbidden: false, is_executable: true },
    { id: 'cand_noop', substrate_candidate_id: 'sc_noop', action_class: 'safe_noop', activation_strength: 0.1, provenance_type: 'FALLBACK', forbidden: false, is_executable: true },
  ];

  // Matched decision
  const validDecision = {
    selected_action_id: 'cand_left_1',
    vetoed: [],
    permitted: [{ id: 'cand_left_1' }],
  };
  const matched = selectCandidate({
    controller: CONTROLLER_TYPES.DELTAX_EXECUTIVE,
    candidates,
    executiveDecision: validDecision,
  });
  assert.equal(matched.id, 'cand_left_1');
  assert.equal(matched.telemetry.candidate_match_found, true);
  assert.equal(matched.telemetry.fallback_used, false);

  // Mismatched decision (invalid ID never offered by connectome)
  const invalidDecision = {
    selected_action_id: 'hallucinated_teleport_action',
    vetoed: [],
    permitted: [],
  };
  const mismatched = selectCandidate({
    controller: CONTROLLER_TYPES.DELTAX_EXECUTIVE,
    candidates,
    executiveDecision: invalidDecision,
  });
  // Must NOT pick candidates[0] (forward)! Must pick declared fallback (safe_noop)
  assert.equal(mismatched.id, 'cand_noop');
  assert.equal(mismatched.telemetry.candidate_match_found, false);
  assert.equal(mismatched.telemetry.mismatch_reason, 'ID_NOT_IN_CANDIDATE_FIELD');
  assert.equal(mismatched.telemetry.fallback_used, true);
  assert.equal(mismatched.telemetry.fallback_candidate_id, 'cand_noop');
});

test('7. classifyFailure correctly separates limit cycles from candidate absence and selection failures', () => {
  // 1. Limit cycle
  const cyclicHistory = [
    { position: { x: 5, y: 3, heading: 0 }, candidates: [{ action_class: 'turn_left' }] },
    { position: { x: 5, y: 3, heading: 3 }, candidates: [{ action_class: 'turn_left' }] },
    { position: { x: 5, y: 3, heading: 0 }, candidates: [{ action_class: 'turn_left' }] },
    { position: { x: 5, y: 3, heading: 3 }, candidates: [{ action_class: 'turn_left' }] },
    { position: { x: 5, y: 3, heading: 0 }, candidates: [{ action_class: 'turn_left' }] },
  ];
  const failCyclic = classifyFailure({
    reachedGoal: false,
    history: cyclicHistory,
    controller: CONTROLLER_TYPES.SUBSTRATE_TOP,
  });
  assert.equal(failCyclic, FAILURE_TAXONOMY.SUBSTRATE_DYNAMICS_LIMIT_CYCLE);

  // 2. Simple reflex failure when candidates existed
  const failReflex = classifyFailure({
    reachedGoal: false,
    history: cyclicHistory,
    controller: CONTROLLER_TYPES.SIMPLE_REFLEX,
  });
  assert.equal(failReflex, FAILURE_TAXONOMY.CONTROLLER_SELECTION_FAILURE);

  // 3. Substrate candidate absence at decisive fork
  const decisiveForkLog = [{
    position: { x: 5, y: 3, heading: 0 },
    candidates: {
      turn_left: { raw_rate_hz: 14.5, strength: 1.0, forbidden: false },
      turn_right: { raw_rate_hz: 0.0, strength: 0.0, forbidden: false },
    },
  }];
  const failAbsence = classifyFailure({
    reachedGoal: false,
    history: cyclicHistory,
    forkCandidateLogs: decisiveForkLog,
    controller: CONTROLLER_TYPES.DELTAX_EXECUTIVE,
  });
  assert.equal(failAbsence, FAILURE_TAXONOMY.SUBSTRATE_CANDIDATE_ABSENCE);
});

test('8. Evaluator-only diagnostic fork metadata cannot be read by controllers or observe()', () => {
  // Verify observe() returns clean physical sensory packet with zero diagnostic metadata
  for (const [key, envDef] of Object.entries(ENVIRONMENT_SUITE)) {
    const world = envDef.createWorld();
    const obs = world.observe();
    const serialized = JSON.stringify(obs);

    assert.equal(serialized.includes('necessary_action_class'), false, `observe() leaked metadata in ${key}`);
    assert.equal(serialized.includes('valid_action_classes'), false, `observe() leaked metadata in ${key}`);
    assert.equal(serialized.includes('DIAGNOSTIC_FORKS'), false, `observe() leaked metadata in ${key}`);
    assert.equal(serialized.includes('fork_id'), false, `observe() leaked metadata in ${key}`);
  }

  // Verify candidate selection input cannot access diagnostic forks
  const candidate = { id: 'c1', action_class: 'turn_left', activation_strength: 1.0 };
  const decision = selectCandidate({
    controller: CONTROLLER_TYPES.SIMPLE_REFLEX,
    candidates: [candidate],
    senses: { visual_field: { obstacle_ahead: false } },
  });
  assert.equal(decision.necessary_action_class, undefined);
  assert.equal(decision.diagnostic_metadata, undefined);
});

test('9. attributeFailureCausally correctly attributes right-turn absence in right-required worlds', () => {
  const decisiveForkLog = [{
    position: { x: 5, y: 3, heading: 0 },
    candidates: {
      turn_left: { raw_rate_hz: 14.5, strength: 1.0, forbidden: false },
      turn_right: { raw_rate_hz: 0.0, strength: 0.0, forbidden: false },
    },
  }];

  const attribution = attributeFailureCausally({
    environmentId: 'ENV_POLARITY_RIGHT',
    controller: 'DELTAX_EXECUTIVE',
    reachedGoal: false,
    forkCandidateLogs: decisiveForkLog,
    actionCounts: { forward: 35, left: 35, right: 0 },
  });

  assert.equal(attribution.category, 'SUBSTRATE_CANDIDATE_ABSENCE');
  assert.equal(attribution.causal_layer, 'substrate_candidate_generation');
  assert.equal(attribution.necessary_action, 'turn_right');
});
