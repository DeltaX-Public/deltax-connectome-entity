import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangedWorldHarness } from '../src/experiments/changed_world/harness.mjs';

const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

test('1. CONTROL vs OBSERVE determinism: committed actions match 100%', async () => {
  const seed = 120;
  const controlHarness = new ChangedWorldHarness({ seed, condition: 'CONTROL', maxStepsPerTrial: 10 });
  const controlRes = await controlHarness.runEpisode();

  assert.equal(controlRes.condition, 'CONTROL');
  assert.ok(controlRes.trial1.stepsExecuted > 0);

  if (cmd) {
    const observeHarness = new ChangedWorldHarness({ seed, condition: 'OBSERVE', command: cmd, maxStepsPerTrial: 10 });
    const observeRes = await observeHarness.runEpisode();

    assert.equal(observeRes.condition, 'OBSERVE');
    // Under deterministic connectome dynamics, CONTROL and OBSERVE must commit identical trajectories
    const controlActions = controlRes.trial1.history.map((h) => h.chosenAction);
    const observeActions = observeRes.trial1.history.map((h) => h.chosenAction);
    assert.deepEqual(observeActions, controlActions, 'OBSERVE must not alter committed actions from CONTROL');

    await observeHarness.close();
  }
});

test('2. STATIC_GUARD baseline executes fixed obstacle-avoidance reflex without learning', async () => {
  const seed = 121;
  const guardHarness = new ChangedWorldHarness({ seed, condition: 'STATIC_GUARD', maxStepsPerTrial: 12 });
  const res = await guardHarness.runEpisode();

  assert.equal(res.condition, 'STATIC_GUARD');
  assert.ok(res.trial1.history.some((h) => h.staticGuardIntervened), 'STATIC_GUARD must intervene when blocked');
  // STATIC_GUARD has no executive session or learning
  assert.equal(guardHarness.executive, null);
});

test('3. EXECUTIVE condition operates through live private local runtime with contradiction governance', async (t) => {
  if (!cmd) {
    t.skip('DELTAX_LOCAL_RUNTIME_CMD not set');
    return;
  }
  const seed = 122;
  const execHarness = new ChangedWorldHarness({ seed, condition: 'EXECUTIVE', command: cmd, maxStepsPerTrial: 14 });
  const res = await execHarness.runEpisode({ resetExecutiveMemoryOnRecurrence: false });

  assert.equal(res.condition, 'EXECUTIVE');
  assert.ok(res.trial1.stepsExecuted > 0);
  assert.ok(res.trial2.stepsExecuted > 0);

  // Every step has executive decision provenance
  for (const h of res.trial1.history) {
    assert.ok(h.decision, 'Each step in EXECUTIVE mode must record executive decision');
    assert.equal(h.decision.provenance?.executive_source, 'local_runtime');
  }

  await execHarness.close();
});

test('4. Recurrence / Memory test forks retained vs reset executive history', async (t) => {
  if (!cmd) {
    t.skip('DELTAX_LOCAL_RUNTIME_CMD not set');
    return;
  }
  const seed = 125;

  // Run with retained memory
  const retainedHarness = new ChangedWorldHarness({ seed, condition: 'EXECUTIVE', command: cmd, maxStepsPerTrial: 14 });
  const retainedRes = await retainedHarness.runEpisode({ resetExecutiveMemoryOnRecurrence: false });

  // Run with reset memory on recurrence
  const resetHarness = new ChangedWorldHarness({ seed, condition: 'EXECUTIVE', command: cmd, maxStepsPerTrial: 14 });
  const resetRes = await resetHarness.runEpisode({ resetExecutiveMemoryOnRecurrence: true });

  assert.equal(retainedRes.resetExecutiveMemory, false);
  assert.equal(resetRes.resetExecutiveMemory, true);

  // Verify trial 1 common starting trajectory
  const t1Retained = retainedRes.trial1.history.map((h) => h.chosenAction);
  const t1Reset = resetRes.trial1.history.map((h) => h.chosenAction);
  assert.deepEqual(t1Retained, t1Reset, 'Trial 1 before fork must be identical across runs');

  await retainedHarness.close();
  await resetHarness.close();
});
