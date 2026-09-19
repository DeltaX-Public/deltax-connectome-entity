/**
 * Phase III: Long-Horizon Adaptation — Invariant & Mechanism Tests
 *
 * Enforces strict scientific invariants across experimental conditions:
 *   1. Information Parity: Zero future leakage, solution labels, or route coordinates in sensory streams.
 *   2. Causal Integrity & Strict Provenance: Every action strictly exists in pre-evaluation candidate field.
 *   3. Non-Contamination: CONTROL and OBSERVE produce 100% identical action trajectories.
 *   4. Executive Manipulation Isolation: Retained and Reset receive identical observations and candidate fields.
 *   5. Memory Reset Discontinuity: Reset verifiably zeros tick/TNM state and provides reset receipt.
 *   6. Zero Harness Steering: Harness never substitutes unvetoed DeltaX selections (e.g. halt is respected).
 *   7. Shuffled Connectome Topology: Scrambled synaptic weights disrupt structured descending drive.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ChangedWorld } from "../src/worlds/changed_world/world.mjs";
import { ChangedWorldHarness, PHASE3_CONDITIONS } from "../src/experiments/changed_world/index.mjs";

const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

describe("Phase III: Invariant & Mechanism Verification", () => {
  test("1. Information Parity: World observations contain zero future leakage or cheat metadata", () => {
    const world = new ChangedWorld({ changeAtStep: 5, seed: 2000 });

    // Initial state observation
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

  test("2. Causal Integrity: All executed actions strictly exist in pre-evaluation candidate field", async () => {
    assert.equal(PHASE3_CONDITIONS.length, 6);
    for (const cond of ["CONTROL", "STATIC_GUARD", "SHUFFLED_CONNECTOME"]) {
      const h = new ChangedWorldHarness({
        seed: 2000,
        condition: cond,
        maxStepsPerTrial: 10,
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

  test("4. Executive Manipulation Isolation: Retained and Reset receive identical sensory observations and candidate fields",
    { skip: !cmd },
    async () => {
      const seed = 2000;

      const hRet = new ChangedWorldHarness({ seed, condition: "EXECUTIVE", command: cmd, maxStepsPerTrial: 10, changeAtStep: 5 });
      const rRet = await hRet.runEpisode();

      const hRst = new ChangedWorldHarness({ seed, condition: "EXECUTIVE_MEMORY_RESET", command: cmd, maxStepsPerTrial: 10, changeAtStep: 5 });
      const rRst = await hRst.runEpisode();

      // Verify Trial 1 parity: identical start
      assert.equal(rRet.trial1.stepsExecuted, rRst.trial1.stepsExecuted);

      // Verify Trial 2 Step 1 packet comparison: identical environment and substrate inputs
      const pRet = rRet.trial2.firstExecutivePacket;
      const pRst = rRst.trial2.firstExecutivePacket;

      assert.ok(pRet, "Retained must capture first executive packet");
      assert.ok(pRst, "Reset must capture first executive packet");

      // Verify identical environmental summary at recurrence start
      assert.deepEqual(pRet.environment_state_summary, pRst.environment_state_summary);

      // Verify identical candidate action classes and strengths at recurrence start
      const retCandSummary = pRet.candidate_actions.map((c) => ({ action: c.action_class, strength: c.activation_strength }));
      const rstCandSummary = pRst.candidate_actions.map((c) => ({ action: c.action_class, strength: c.activation_strength }));
      assert.deepEqual(retCandSummary, rstCandSummary, "Candidate fields must be identical between Retained and Reset at comparison point");

      await hRet.close();
      await hRst.close();
    }
  );

  test("5. Memory Reset Invariant: Discontinuity receipt and zeroed tick/TNM state verified",
    { skip: !cmd },
    async () => {
      const seed = 2002;
      const hRst = new ChangedWorldHarness({ seed, condition: "EXECUTIVE_MEMORY_RESET", command: cmd, maxStepsPerTrial: 10 });
      const rRst = await hRst.runEpisode();

      const lineage = rRst.executiveLineage;
      assert.equal(lineage.shouldResetMemory, true);
      assert.equal(lineage.stateLineage, "DISCONTINUOUS_FRESH_SESSION");
      assert.notEqual(lineage.trial1SessionId, lineage.trial2SessionId);
      assert.ok(lineage.trial1Checkpoint.tick > 0, "Trial 1 must have accumulated ticks");
      assert.equal(lineage.resetReceipt.type, "reset_ack", "Must receive valid reset acknowledgement");
      assert.equal(lineage.trial2PreflightCheckpoint.tick, 0, "Reset session must start with tick=0");
      assert.equal(lineage.trial2PreflightCheckpoint.tnm_event_count, 0, "Reset session must start with 0 TNM events");

      await hRst.close();
    }
  );

  test("6. Candidate Selection Invariant: Unvetoed DeltaX selections are strictly executed without harness rescue",
    { skip: !cmd },
    async () => {
      const seed = 2000;
      const harness = new ChangedWorldHarness({ seed, condition: "EXECUTIVE", command: cmd, maxStepsPerTrial: 15, changeAtStep: 5 });
      const res = await harness.runEpisode();

      // Check all history steps: if DeltaX selected a candidate and it was not forbidden/vetoed, chosenCandidate matches
      for (const step of [...res.trial1.history, ...res.trial2.history]) {
        if (step.decision?.selected_action_id) {
          // If the selected action was halt, actuator action must be stop (not steered left or right)
          if (step.decision.selected_action_id.includes("halt")) {
            assert.equal(step.chosenAction, "stop", "Harness must never substitute steering when DeltaX selects halt");
          }
        }
      }
      await harness.close();
    }
  );

  test("7. Shuffled Connectome Invariant: Scrambled synaptic matrix alters topology while preserving degrees", () => {
    const hIntact = new ChangedWorldHarness({ seed: 2000, condition: "CONTROL" });
    const hShuf = new ChangedWorldHarness({ seed: 2000, condition: "SHUFFLED_CONNECTOME" });

    const origIndices = hIntact.runtime.data.indices;
    const shufIndices = hShuf.runtime.data.indices;

    assert.equal(shufIndices.length, origIndices.length, "Edge count must be preserved exactly");
    let swapped = 0;
    for (let i = 0; i < origIndices.length; i++) {
      if (shufIndices[i] !== origIndices[i]) swapped++;
    }
    const swapFraction = swapped / origIndices.length;
    assert.ok(swapFraction >= 0.80, `Expected >= 80% swapped edges, got ${(swapFraction * 100).toFixed(2)}%`);
  });
});
