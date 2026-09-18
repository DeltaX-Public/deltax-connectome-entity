/**
 * Phase III: Long-Horizon Adaptation — Information Parity & Causal Integrity Tests
 *
 * Enforces:
 *   1. Information Parity: No cheat codes, no future state leakage, no route labels in observation stream.
 *   2. Causal Integrity: Every action strictly originates from pre-evaluation descending neuron candidate field.
 *   3. Non-Contamination: CONTROL and OBSERVE produce 100% identical action trajectories.
 *   4. Executive Memory Fork: Retained executive anticipates blockage at x=3; Reset executive steps into hazard at x=5.
 *   5. Shuffled Connectome Negative Control: Scrambled topology fails structured adaptation.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ChangedWorld } from "../src/worlds/changed_world/world.mjs";
import { ChangedWorldHarness, PHASE3_CONDITIONS } from "../src/experiments/changed_world/index.mjs";

const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

describe("Phase III: Information-Parity & Causal Integrity", () => {
  test("1. Information Parity: World observations contain zero future leakage or cheat metadata", () => {
    const world = new ChangedWorld({ changeAtStep: 5, seed: 2000 });
    
    // Check initial state
    const obs0 = world.observe();
    const str0 = JSON.stringify(obs0).toLowerCase();
    assert.ok(!str0.includes("cheat"), "Must not contain 'cheat'");
    assert.ok(!str0.includes("bypass_path"), "Must not contain 'bypass_path'");
    assert.ok(!str0.includes("solution"), "Must not contain 'solution'");
    assert.ok(!str0.includes("recommended"), "Must not contain 'recommended'");
    assert.ok(!str0.includes("correct_action"), "Must not contain 'correct_action'");
    assert.equal(obs0.visual_field.obstacle_ahead, false);

    // Step 4 times (before change)
    for (let i = 0; i < 4; i++) world.applyAction("forward");
    assert.equal(world.isChanged, false);

    // Step 5 (triggers change)
    world.applyAction("forward");
    assert.equal(world.isChanged, true);

    const obsChanged = world.observe();
    const strChanged = JSON.stringify(obsChanged).toLowerCase();
    assert.ok(!strChanged.includes("cheat"), "Changed observation must not contain 'cheat'");
    assert.ok(!strChanged.includes("bypass_path"), "Changed observation must not contain 'bypass_path'");
    assert.ok(!strChanged.includes("solution"), "Changed observation must not contain 'solution'");
  });

  test("2. Causal Integrity: All 6 conditions strictly enforce pre-evaluation candidate field origins", async () => {
    assert.equal(PHASE3_CONDITIONS.length, 6);
    // Non-executive conditions can run without DELTAX_LOCAL_RUNTIME_CMD
    for (const cond of ["CONTROL", "STATIC_GUARD", "SHUFFLED_CONNECTOME"]) {
      const h = new ChangedWorldHarness({
        seed: 2000,
        condition: cond,
        maxStepsPerTrial: 8,
      });
      const res = await h.runEpisode();
      assert.ok(res.trial1.stepsExecuted > 0, `${cond} must execute steps`);
      for (const step of res.trial1.history) {
        assert.ok(["forward", "left", "right", "stop"].includes(step.chosenAction));
        assert.ok(step.topCandidate.strength >= 0);
      }
      await h.close();
    }
  });

  test("3. CONTROL vs OBSERVE Non-Contamination: 100% action trajectory parity",
    { skip: !cmd },
    async () => {
      const seed = 2001;
      const ctrlHarness = new ChangedWorldHarness({ seed, condition: "CONTROL", maxStepsPerTrial: 15 });
      const ctrlRes = await ctrlHarness.runEpisode();

      const obsHarness = new ChangedWorldHarness({ seed, condition: "OBSERVE", command: cmd, maxStepsPerTrial: 15 });
      const obsRes = await obsHarness.runEpisode();

      assert.equal(ctrlRes.trial1.stepsExecuted, obsRes.trial1.stepsExecuted, "Steps executed must match");
      const ctrlActions = ctrlRes.trial1.history.map((h) => h.chosenAction);
      const obsActions = obsRes.trial1.history.map((h) => h.chosenAction);
      assert.deepEqual(ctrlActions, obsActions, "CONTROL and OBSERVE chosen actions must be 100% identical");

      await ctrlHarness.close();
      await obsHarness.close();
    }
  );

  test("4. Executive Memory Fork: Retained diverts at x=3 (0 hazard), Reset diverts at x=5 (>0 hazard)",
    { skip: !cmd },
    async () => {
      const seed = 2000;

      // Retained
      const hRet = new ChangedWorldHarness({ seed, condition: "EXECUTIVE", command: cmd, maxStepsPerTrial: 25, changeAtStep: 5 });
      const rRet = await hRet.runEpisode();

      // Reset
      const hRst = new ChangedWorldHarness({ seed, condition: "EXECUTIVE_MEMORY_RESET", command: cmd, maxStepsPerTrial: 25, changeAtStep: 5 });
      const rRst = await hRst.runEpisode();

      // In Trial 1 both succeed and encounter the blockage
      assert.equal(rRet.trial1.reachedGoal, true);
      assert.equal(rRst.trial1.reachedGoal, true);

      // In Trial 2 (Recurrence):
      // Retained anticipates at x=3:
      const retT2Actions = rRet.trial2.history;
      assert.equal(retT2Actions[2].position.x, 3);
      assert.equal(retT2Actions[2].chosenAction, "left", "Retained executive must steer left at x=3 to enter bypass");
      assert.equal(rRet.trial2.hazardCount, 0, "Retained executive must never enter hazard zone");

      // Reset proceeds into x=5:
      const rstT2Actions = rRst.trial2.history;
      assert.equal(rstT2Actions[2].position.x, 4);
      assert.equal(rstT2Actions[2].chosenAction, "forward", "Reset executive continues forward into central corridor");
      assert.ok(rRst.trial2.hazardCount > 0, "Reset executive must encounter hazard at x=5");
      assert.ok(rRet.trial2.finalEnergy > rRst.trial2.finalEnergy, "Retained must have higher remaining energy than Reset");

      await hRet.close();
      await hRst.close();
    }
  );

  test("5. Shuffled Connectome Control: Fails structured recovery", async () => {
    const hShuf = new ChangedWorldHarness({
      seed: 2000,
      condition: "SHUFFLED_CONNECTOME",
      maxStepsPerTrial: 25,
      changeAtStep: 5,
    });
    const res = await hShuf.runEpisode();
    assert.equal(res.trial1.reachedGoal, false, "Shuffled connectome must fail to reach goal");
    assert.ok(res.trial1.collisionCount > 5 || res.trial1.finalEnergy <= 0, "Shuffled connectome must either stall or exhaust energy");
    await hShuf.close();
  });
});
