/**
 * test/phase4c_generalization.test.mjs
 * Invariant and unit tests for Phase IV-C Environment Suite and Candidate Selectors.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENVIRONMENT_SUITE } from '../src/worlds/changed_world/environment_suite.mjs';
import { CONTROLLER_TYPES, selectCandidate, createPrng } from '../src/controllers/candidate_selectors.mjs';

test('1. Environment Generalization Suite contains 10 frozen, valid environments', () => {
  const envKeys = Object.keys(ENVIRONMENT_SUITE);
  assert.equal(envKeys.length, 10, 'Suite must contain exactly 10 environments');

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

test('2. ENV_1_MIRROR_RIGHT_REQUIRED blocks North at x=5 and leaves South open', () => {
  const world = ENVIRONMENT_SUITE.ENV_1_MIRROR_RIGHT_REQUIRED.createWorld();
  // North at (5, 2) must be an obstacle
  assert.equal(world.isObstacle(5, 2), true, 'North passage at (5, 2) must be blocked in Mirror Test');
  // South at (5, 4) must NOT be an obstacle
  assert.equal(world.isObstacle(5, 4), false, 'South passage at (5, 4) must be open in Mirror Test');
});

test('3. ENV_8_DEAD_END encloses (5, 3) on three sides, requiring backward movement', () => {
  const world = ENVIRONMENT_SUITE.ENV_8_DEAD_END.createWorld();
  world.triggerEnvironmentChange(); // Drops door at (6, 3)

  // Ahead at (6, 3) is blocked
  assert.equal(world.isObstacle(6, 3), true, 'Ahead (6, 3) must be blocked');
  // Left at (5, 2) is blocked
  assert.equal(world.isObstacle(5, 2), true, 'Left (5, 2) must be blocked');
  // Right at (5, 4) is blocked
  assert.equal(world.isObstacle(5, 4), true, 'Right (5, 4) must be blocked');
  // Behind at (4, 3) is clear!
  assert.equal(world.isObstacle(4, 3), false, 'Behind (4, 3) must be open for withdrawal');
});

test('4. SIMPLE_REFLEX candidate selector obeys obstacle clearance and prioritizes turning/withdrawal when blocked', () => {
  const candidates = [
    { id: 'c1', action_class: 'locomotion_forward', actuator_action: 'forward', activation_strength: 0.8, forbidden: true, is_executable: true },
    { id: 'c2', action_class: 'turn_left', actuator_action: 'left', activation_strength: 0.4, forbidden: false, is_executable: true },
    { id: 'c3', action_class: 'turn_right', actuator_action: 'right', activation_strength: 0.6, forbidden: false, is_executable: true },
    { id: 'c4', action_class: 'halt', actuator_action: 'stop', activation_strength: 0.2, forbidden: false, is_executable: true },
  ];

  // Blocked ahead
  const blockedSenses = { visual_field: { obstacle_ahead: true } };
  const chosenBlocked = selectCandidate({
    controller: CONTROLLER_TYPES.SIMPLE_REFLEX,
    candidates,
    senses: blockedSenses,
  });
  assert.equal(chosenBlocked.action_class, 'turn_right', 'Must choose strongest turning candidate when forward is blocked');

  // Open ahead
  const openCandidates = [
    { id: 'c1', action_class: 'locomotion_forward', actuator_action: 'forward', activation_strength: 0.7, forbidden: false, is_executable: true },
    { id: 'c2', action_class: 'turn_left', actuator_action: 'left', activation_strength: 0.8, forbidden: false, is_executable: true },
  ];
  const openSenses = { visual_field: { obstacle_ahead: false } };
  const chosenOpen = selectCandidate({
    controller: CONTROLLER_TYPES.SIMPLE_REFLEX,
    candidates: openCandidates,
    senses: openSenses,
  });
  assert.equal(chosenOpen.action_class, 'locomotion_forward', 'Must choose forward locomotion when open');
});

test('5. STOCHASTIC_WEIGHTED is deterministic with seeded PRNG', () => {
  const candidates = [
    { id: 'c1', action_class: 'turn_left', activation_strength: 0.3, is_executable: true },
    { id: 'c2', action_class: 'turn_right', activation_strength: 0.7, is_executable: true },
  ];

  const prng1 = createPrng(42);
  const prng2 = createPrng(42);

  const picks1 = Array.from({ length: 10 }, () => selectCandidate({ controller: CONTROLLER_TYPES.STOCHASTIC_WEIGHTED, candidates, prng: prng1 }).id);
  const picks2 = Array.from({ length: 10 }, () => selectCandidate({ controller: CONTROLLER_TYPES.STOCHASTIC_WEIGHTED, candidates, prng: prng2 }).id);

  assert.deepEqual(picks1, picks2, 'Seeded PRNG must produce identical choices');
});
