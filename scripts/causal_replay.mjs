/**
 * Phase III: Causal Counterfactual Replay Script (Audited V2)
 *
 * Checkpoints identical physical & neural substrate state immediately before
 * environmental mutation at Step 4 (position (5, 3), heading 0).
 *
 * Forks into 4 counterfactual branches:
 *   - Branch A (Intact Closed Loop): Sovereign DeltaX with restored executive persistent state.
 *   - Branch B (Executive Memory Reset): Sovereign DeltaX with fresh executive state (A vs B isolated).
 *   - Branch C (Targeted Substrate Silencing): Silencing of steering DNs (DNa02, DNa01, DNp09; count=6) with restored executive.
 *   - Branch D (Sham Control Silencing): Silencing of non-steering DNs (DNp01, DNp02, DNp04; count=6) with restored executive.
 *
 * Output: artifacts/changed_world/causal-replay-branches.json
 */

import { ChangedWorld } from "../src/worlds/changed_world/world.mjs";
import { ConnectomeRuntime } from "../src/connectome/runtime.mjs";
import { ConnectomeSensoryTransduction } from "../src/connectome/sensory_transduction.mjs";
import { ConnectomeCandidateBridge } from "../src/connectome/candidate_bridge.mjs";
import { createExecutive } from "../src/deltax/index.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

export async function runCausalReplay({ seed = 4000 } = {}) {
  if (!cmd) {
    throw new Error("DELTAX_LOCAL_RUNTIME_CMD required for causal replay; refusing silent fallback");
  }

  console.log("\n=======================================================");
  console.log("     PHASE III CAUSAL COUNTERFACTUAL REPLAY (AUDITED V2)");
  console.log(`     Evaluation Seed: ${seed}`);
  console.log("=======================================================\n");

  const sharedExec = createExecutive({ mode: "local_runtime", command: cmd });
  const ping = await sharedExec.ping();
  console.log("DeltaX Provider Connected:", ping.provenance);

  // ── Step 1: Run baseline up to pre-mutation checkpoint (Step 4, pos (5,3)) ──
  const baselineWorld = new ChangedWorld({ seed, changeAtStep: 5, initialEnergy: 50 });
  const baselineRuntime = new ConnectomeRuntime({ seed, substepsPerTick: 10 });
  const transduction = new ConnectomeSensoryTransduction(baselineRuntime.data);
  const bridge = new ConnectomeCandidateBridge();

  const baselineSessionId = `causal_replay_seed_${seed}_${Date.now()}`;
  const baselineHistory = [];

  for (let step = 1; step <= 4; step++) {
    const senses = baselineWorld.observe();
    const st = baselineWorld.currentState();
    const drives = transduction.transduce({
      visual_field: senses.visual_field,
      collision: senses.collision,
      gradients: senses.gradients,
      proximity: senses.proximity,
      body: st.body,
    });
    baselineRuntime.setSensoryDrives(drives);
    baselineRuntime.step(10);

    const dnReadouts = baselineRuntime.getDescendingNeuronReadouts();
    const candidates = bridge.generateCandidates(dnReadouts, step);

    const packet = {
      session_id: baselineSessionId,
      condition: "EXECUTIVE",
      step_id: step,
      objective: "navigate_to_goal_with_coherence",
      environment_state_summary: {
        corridor: senses.visual_field.corridor,
        front_obstacle_distance: senses.visual_field.front_distance,
        obstacle_ahead: senses.visual_field.obstacle_ahead,
        nearest_obstacle: senses.proximity.nearest_distance,
        hazard_gradient: senses.gradients.hazard,
        energy_remaining: st.energy,
      },
      substrate_state_summary: {
        step: st.step,
        heading: st.body.heading,
        descending_forward_hz: dnReadouts.forward?.weighted_mean || 0,
        descending_turn_l_hz: dnReadouts.turn_left?.weighted_mean || 0,
        descending_turn_r_hz: dnReadouts.turn_right?.weighted_mean || 0,
      },
      candidate_actions: candidates,
      detected_contradictions: [],
      active_constraints: ["sandbox"],
      available_executive_actions: ["PERMIT", "VETO", "MODULATE", "DEFER", "ESCALATE"],
    };
    await sharedExec.decide(packet);

    const res = baselineWorld.applyAction("forward");
    baselineHistory.push({
      step,
      position: { x: baselineWorld.body.x, y: baselineWorld.body.y, heading: baselineWorld.body.heading },
      status: res.status,
    });
  }

  // Pre-mutation checkpoint at step 4
  const checkpointPos = { x: baselineWorld.body.x, y: baselineWorld.body.y, heading: baselineWorld.body.heading };
  const checkpointEnergy = baselineWorld.energy;
  const connectomeSnapshot = baselineRuntime.snapshot();
  const executiveCheckpoint = await sharedExec.checkpoint(baselineSessionId);

  console.log(`Checkpoint Created at Step 4: pos=(${checkpointPos.x}, ${checkpointPos.y}, h=${checkpointPos.heading}), energy=${checkpointEnergy}`);
  console.log(`Executive Checkpoint State: tick=${executiveCheckpoint?.state?.tick}, tnm_events=${executiveCheckpoint?.state?.tnm_events?.length}`);

  // ── Helper to run a branch post-checkpoint ────────────────────────────────
  async function runBranch({ branchId, name, perturbationFn, restoreExecutive = true }) {
    console.log(`\nExecuting ${branchId}: ${name}...`);

    // Restore identical physical world state
    const world = new ChangedWorld({ seed, changeAtStep: 5, initialEnergy: 50 });
    for (let s = 1; s <= 4; s++) world.applyAction("forward");

    // Restore bit-exact connectome neural snapshot
    const runtime = new ConnectomeRuntime({ seed, substepsPerTick: 10 });
    runtime.restore(connectomeSnapshot);

    // Apply specific perturbation if any
    let perturbationDetails = null;
    if (perturbationFn) {
      perturbationDetails = perturbationFn(runtime);
    }

    // Configure branch executive session
    const branchSessionId = `branch_${branchId.toLowerCase()}_${Date.now()}`;
    let startingTick = 0;
    if (restoreExecutive && executiveCheckpoint?.state) {
      await sharedExec.restore(branchSessionId, executiveCheckpoint.state);
      startingTick = executiveCheckpoint.state.tick;
    }

    const branchHistory = [...baselineHistory];
    let collisionCount = 0;
    let hazardCount = 0;

    for (let step = 5; step <= 25; step++) {
      if (world.isGoal()) break;

      const senses = world.observe();
      const st = world.currentState();
      const isBlocked = senses.visual_field.obstacle_ahead || senses.collision.blocked;
      const isHazard = senses.gradients.hazard;
      if (isHazard) hazardCount++;

      const drives = transduction.transduce({
        visual_field: senses.visual_field,
        collision: senses.collision,
        gradients: senses.gradients,
        proximity: senses.proximity,
        body: st.body,
      });
      runtime.setSensoryDrives(drives);
      runtime.step(10);

      const dnReadouts = runtime.getDescendingNeuronReadouts();
      const candidates = bridge.generateCandidates(dnReadouts, step);

      // Enforce hard physical impossibility for forward locomotion
      if (isBlocked) {
        for (const c of candidates) {
          if (c.action_class === "locomotion_forward") c.forbidden = true;
        }
      }

      const topCand = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength)[0];

      const contradictions = [];
      if (isBlocked) {
        contradictions.push({ expected: "corridor_clear", observed: "obstacle_collision", severity: "high" });
      }
      if (isHazard) {
        contradictions.push({ expected: "safe_passage", observed: "hazard_cell", severity: "medium" });
      }

      const packet = {
        session_id: branchSessionId,
        condition: "EXECUTIVE",
        step_id: step,
        objective: "navigate_to_goal_with_coherence",
        environment_state_summary: {
          corridor: senses.visual_field.corridor,
          front_obstacle_distance: senses.visual_field.front_distance,
          obstacle_ahead: senses.visual_field.obstacle_ahead,
          nearest_obstacle: senses.proximity.nearest_distance,
          hazard_gradient: senses.gradients.hazard,
          energy_remaining: st.energy,
        },
        substrate_state_summary: {
          step: st.step,
          heading: st.body.heading,
          descending_forward_hz: dnReadouts.forward?.weighted_mean || 0,
          descending_turn_l_hz: dnReadouts.turn_left?.weighted_mean || 0,
          descending_turn_r_hz: dnReadouts.turn_right?.weighted_mean || 0,
        },
        candidate_actions: candidates,
        detected_contradictions: contradictions,
        active_constraints: contradictions.length > 0 ? ["sandbox", "no_repeated_wall_impact"] : ["sandbox"],
        available_executive_actions: ["PERMIT", "VETO", "MODULATE", "DEFER", "ESCALATE"],
      };

      const decision = await sharedExec.decide(packet);
      const vetoedIds = new Set((decision.vetoed || []).map((v) => v.id || v.substrate_candidate_id));
      const admitted = candidates.filter(
        (c) => !vetoedIds.has(c.id) && !vetoedIds.has(c.substrate_candidate_id) && !c.forbidden
      );
      const selected = candidates.find(
        (c) => c.id === decision.selected_action_id || c.substrate_candidate_id === decision.selected_action_id
      );

      // Strict unassisted candidate selection: follow DeltaX decision without harness rescue
      let chosenCandidate = null;
      if (selected && !selected.forbidden && !vetoedIds.has(selected.id) && !vetoedIds.has(selected.substrate_candidate_id)) {
        chosenCandidate = selected;
      } else if (admitted.length > 0) {
        chosenCandidate = admitted[0];
      } else {
        chosenCandidate = candidates.find((c) => c.provenance_type === "FALLBACK") || topCand;
      }

      if (!chosenCandidate || !candidates.some((c) => c.id === chosenCandidate.id && c.substrate_candidate_id === chosenCandidate.substrate_candidate_id)) {
        throw new Error(`Causal integrity violation in ${branchId}`);
      }

      const chosenAction = chosenCandidate.actuator_action || (
        chosenCandidate.action_class === "locomotion_forward" ? "forward" :
        chosenCandidate.action_class === "turn_left" ? "left" :
        chosenCandidate.action_class === "turn_right" ? "right" : "stop"
      );

      const res = world.applyAction(chosenAction);
      if (res.status === "BLOCKED") collisionCount++;

      branchHistory.push({
        step,
        action: chosenAction,
        status: res.status,
        position: { x: world.body.x, y: world.body.y, heading: world.body.heading },
        energy: world.energy,
        chosenCandidateClass: chosenCandidate.action_class,
        disposition: decision.disposition ?? decision.selected_disposition,
      });
    }

    const reachedGoal = world.isGoal();
    const finalOutcome = reachedGoal ? "COMPLETED_RECOVERY" : (collisionCount > 5 ? "STALLED" : "TIMEOUT");
    console.log(`  Result: ${finalOutcome} (steps=${branchHistory.length}, reachedGoal=${reachedGoal}, collisions=${collisionCount})`);

    return {
      branchId,
      name,
      startingTick,
      perturbationDetails,
      reachedGoal,
      finalOutcome,
      stepsExecuted: branchHistory.length,
      finalEnergy: world.energy,
      collisionCount,
      hazardCount,
      history: branchHistory,
    };
  }

  // ── Branch A: Intact Closed Loop (Retained Executive State) ───────────────
  const branchA = await runBranch({
    branchId: "BRANCH_A",
    name: "Intact Sovereign Closed Loop (Retained Executive State)",
    restoreExecutive: true,
    perturbationFn: null,
  });

  // ── Branch B: Executive Memory Reset at Fork Point (Fresh Executive State) ──
  const branchB = await runBranch({
    branchId: "BRANCH_B",
    name: "Executive Memory Reset at Fork Point (Fresh Executive State)",
    restoreExecutive: false,
    perturbationFn: null,
  });

  // ── Branch C: Targeted Steering Silencing (DNa02, DNa01, DNp09; count=6) ──
  const branchC = await runBranch({
    branchId: "BRANCH_C",
    name: "Targeted Steering Substrate Silencing (DNa02, DNa01, DNp09; count=6; Retained Executive)",
    restoreExecutive: true,
    perturbationFn: (rt) => {
      const silencedTypes = ["DNa02", "DNa01", "DNp09"];
      const res = rt.silence(silencedTypes);
      return {
        silenced_types: silencedTypes,
        silenced_count: res.silenced_count,
        functional_classification: "Descending steering torque command neurons (ipsilateral & contralateral)",
      };
    },
  });

  // ── Branch D: Sham Control Silencing (DNp01, DNp02, DNp04; count=6) ────────
  const branchD = await runBranch({
    branchId: "BRANCH_D",
    name: "Sham Control Silencing (DNp01, DNp02, DNp04; count=6; Retained Executive)",
    restoreExecutive: true,
    perturbationFn: (rt) => {
      const shamTypes = ["DNp01", "DNp02", "DNp04"];
      const res = rt.silence(shamTypes);
      return {
        sham_types: shamTypes,
        silenced_count: res.silenced_count,
        functional_classification: "Non-steering descending command neurons (giant fibre escape and takeoff; matched count=6)",
      };
    },
  });

  if (sharedExec.transport?.close) {
    await sharedExec.transport.close();
  }

  const causalReplayReport = {
    schema: "deltax-causal-replay-branches-v2",
    generated_at: new Date().toISOString(),
    seed,
    fork_step: 4,
    fork_position: checkpointPos,
    branches: {
      BRANCH_A: branchA,
      BRANCH_B: branchB,
      BRANCH_C: branchC,
      BRANCH_D: branchD,
    },
    findings: {
      branch_a_intact: branchA.finalOutcome,
      branch_b_memory_reset: branchB.finalOutcome,
      branch_c_targeted_silencing: branchC.finalOutcome,
      branch_d_sham_silencing: branchD.finalOutcome,
      comparisons: {
        "A_vs_B": {
          description: "Differs strictly by executive persistent state (restored vs fresh) under identical neural and physical state",
          branch_a_outcome: branchA.finalOutcome,
          branch_b_outcome: branchB.finalOutcome,
          branch_a_collisions: branchA.collisionCount,
          branch_b_collisions: branchB.collisionCount,
        },
        "C_vs_D": {
          description: "Differs strictly by targeted steering silencing vs matched count sham non-steering silencing under identical executive and physical state",
          branch_c_outcome: branchC.finalOutcome,
          branch_d_outcome: branchD.finalOutcome,
          branch_c_collisions: branchC.collisionCount,
          branch_d_collisions: branchD.collisionCount,
        },
      },
    },
  };

  const artifactDir = join(ROOT, "artifacts", "changed_world");
  mkdirSync(artifactDir, { recursive: true });
  const outFile = join(artifactDir, "causal-replay-branches.json");
  writeFileSync(outFile, JSON.stringify(causalReplayReport, null, 2) + "\n");
  console.log(`\nCausal Replay Artifact written to: ${outFile}\n`);

  return causalReplayReport;
}

if (process.argv[1] && process.argv[1].endsWith("causal_replay.mjs")) {
  runCausalReplay().catch((err) => {
    console.error("Causal replay failed:", err);
    process.exit(1);
  });
}

