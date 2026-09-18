import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangedWorld } from '../src/worlds/changed_world/world.mjs';

test('1. Initial world feasibility: central corridor reaches goal directly', () => {
  const world = new ChangedWorld({ changeAtStep: 99 }); // Keep open
  assert.equal(world.isGoal(), false);

  // 8 steps forward along y=3 reaches x=9, y=3 (Goal)
  for (let i = 0; i < 8; i++) {
    const res = world.applyAction('forward');
    assert.equal(res.status, 'MOVED');
  }

  assert.equal(world.currentState().body.x, 9);
  assert.equal(world.currentState().body.y, 3);
  assert.equal(world.isGoal(), true, 'Must reach goal along central route when open');
});

test('2. Unexpected change blocks central route and prevents forward motion', () => {
  const world = new ChangedWorld({ changeAtStep: 4 });

  // Steps 1..3: move to x=4, y=3
  world.applyAction('forward');
  world.applyAction('forward');
  world.applyAction('forward');
  assert.equal(world.isChanged, false);

  // Step 4: triggers mutation; blockage placed at (6, 3)
  world.applyAction('forward'); // reaches x=5, y=3
  assert.equal(world.isChanged, true);
  assert.equal(world.currentState().body.x, 5);

  // Step 5: attempting forward into (6, 3) must be BLOCKED
  const res = world.applyAction('forward');
  assert.equal(res.status, 'BLOCKED');
  assert.equal(world.currentState().body.x, 5, 'Body must remain at x=5 after collision');
  assert.equal(world.lastCollision, true);
});

test('3. Task feasibility proof: bypass route reaches goal in changed world', () => {
  const world = new ChangedWorld({ changeAtStep: 4 });

  // Move to x=3, y=3
  world.applyAction('forward'); // x=2
  world.applyAction('forward'); // x=3

  // Turn left (North) at passage opening (x=3)
  world.applyAction('left'); // heading=3 (North)
  world.applyAction('forward'); // x=3, y=2 (passage)
  world.applyAction('forward'); // x=3, y=1 (North corridor)

  // Turn right (East) and move along north bypass
  world.applyAction('right'); // heading=0 (East)
  for (let i = 0; i < 5; i++) {
    const res = world.applyAction('forward'); // x=4, 5, 6, 7, 8 (y=1)
    assert.equal(res.status, 'MOVED');
  }

  // At x=8, y=1: turn right (South) through passage opening
  world.applyAction('right'); // heading=1 (South)
  world.applyAction('forward'); // x=8, y=2
  world.applyAction('forward'); // x=8, y=3

  // Turn left (East) into goal region
  world.applyAction('left'); // heading=0 (East)
  world.applyAction('forward'); // x=9, y=3 (Goal!)

  assert.equal(world.isGoal(), true, 'Bypass route must successfully reach goal around blockage');
});

test('4. Observation honesty: no solution leaks or fake executive states', () => {
  const world = new ChangedWorld({ changeAtStep: 3 });
  world.applyAction('forward');
  world.applyAction('forward');
  world.applyAction('forward');

  const obs = world.observe();
  const obsJson = JSON.stringify(obs);

  assert.doesNotMatch(obsJson, /solution|cheat|correct_action|recommended|bypass_path/i);
  assert.equal(typeof obs.visual_field.front_distance, 'number');
  assert.equal(typeof obs.proximity.nearest_distance, 'number');
  assert.equal(typeof obs.collision.blocked, 'boolean');
});
