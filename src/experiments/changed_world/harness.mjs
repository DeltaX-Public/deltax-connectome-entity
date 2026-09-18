/**
 * Changed World Behavioral Experiment Harness.
 * Implements the 4-condition comparison (CONTROL, OBSERVE, STATIC_GUARD, EXECUTIVE)
 * and the targeted memory/recurrence test on the biological connectome substrate.
 *
 * NO STUB MISTAKES: Requires live DELTAX_LOCAL_RUNTIME_CMD or fails loudly.
 * NO FABRICATION: Candidate behaviors originate purely from descending neurons.
 */
import { ChangedWorld } from "../../worlds/changed_world/world.mjs";
import { ConnectomeRuntime } from "../../connectome/runtime.mjs";
import { ConnectomeSensoryTransduction } from "../../connectome/sensory_transduction.mjs";
import { ConnectomeCandidateBridge } from "../../connectome/candidate_bridge.mjs";
import { createExecutive } from "../../deltax/index.mjs";

export class ChangedWorldHarness {
  constructor({
    seed = 100,
    condition = "EXECUTIVE", // CONTROL | OBSERVE | STATIC_GUARD | EXECUTIVE
    command = process.env.DELTAX_LOCAL_RUNTIME_CMD,
    maxStepsPerTrial = 16,
    changeAtStep = 4,
    executive = null,
  } = {}) {
    this.seed = seed;
    this.condition = condition;
    this.command = command;
    this.maxStepsPerTrial = maxStepsPerTrial;
    this.changeAtStep = changeAtStep;

    if (!["CONTROL", "OBSERVE", "STATIC_GUARD", "EXECUTIVE"].includes(condition)) {
      throw new Error(`Invalid condition: ${condition}`);
    }

    if (["OBSERVE", "EXECUTIVE"].includes(condition) && !command && !executive) {
      throw new Error("DELTAX_LOCAL_RUNTIME_CMD is required for OBSERVE and EXECUTIVE conditions; refusing silent stub fallback");
    }

    // 1. World instance
    this.world = new ChangedWorld({
      changeAtStep: this.changeAtStep,
      seed: this.seed,
      initialEnergy: 30,
    });

    // 2. Connectome substrate
    this.runtime = new ConnectomeRuntime({ seed: this.seed, substepsPerTick: 10 });
    this.transduction = new ConnectomeSensoryTransduction(this.runtime.data);
    this.bridge = new ConnectomeCandidateBridge();

    // 3. Executive connection (only for OBSERVE and EXECUTIVE)
    this.sessionId = `changed_world_${condition.toLowerCase()}_seed_${seed}_${Date.now()}`;
    this.executive = executive || (
      ["OBSERVE", "EXECUTIVE"].includes(condition) && this.command
        ? createExecutive({
            mode: "local_runtime",
            command: this.command,
            sessionId: this.sessionId,
          })
        : null
    );
  }

  /**
   * Run an episode consisting of:
   *   Trial 1 (Familiarization + Unexpected Change)
   *   Trial 2 (Recurrence in Changed World)
   *
   * @param {Object} opts
   * @param {boolean} [opts.resetExecutiveMemoryOnRecurrence=false] For memory ablation test
   */
  async runEpisode({ resetExecutiveMemoryOnRecurrence = false } = {}) {
    const t0 = Date.now();

    // --- TRIAL 1: Familiarization & Unexpected Change ---
    const trial1 = await this._runTrial({
      trialNum: 1,
      isRecurrence: false,
    });

    // --- SNAPSHOT & FORK FOR RECURRENCE ---
    const connectomeSnapshot = this.runtime.snapshot();
    let deltaXSnapshot = null;
    if (this.executive && this.condition === "EXECUTIVE") {
      deltaXSnapshot = await this.executive.checkpoint(this.sessionId);
    }

    // Reset world for recurrence (preserving changed blockage state)
    this.world.resetForRecurrence({ preserveChanged: true });

    // Handle memory condition for Trial 2
    let trial2SessionId = this.sessionId;
    if (resetExecutiveMemoryOnRecurrence && this.executive) {
      trial2SessionId = `${this.sessionId}_trial2_reset_${Date.now()}`;
      // In reset condition, executive starts fresh with no prior session memory
    }

    // --- TRIAL 2: Recurrence in Changed World ---
    const trial2 = await this._runTrial({
      trialNum: 2,
      isRecurrence: true,
      sessionIdOverride: trial2SessionId,
    });

    const totalLatencyMs = Date.now() - t0;

    return {
      seed: this.seed,
      condition: this.condition,
      resetExecutiveMemory: resetExecutiveMemoryOnRecurrence,
      trial1,
      trial2,
      divergenceFromControl: {
        trial1Diverged: trial1.divergedFromControl,
        trial2Diverged: trial2.divergedFromControl,
      },
      recurrencePerformance: {
        trial1ReachedGoal: trial1.reachedGoal,
        trial2ReachedGoal: trial2.reachedGoal,
        trial1Collisions: trial1.collisionCount,
        trial2Collisions: trial2.collisionCount,
        trial1Steps: trial1.stepsExecuted,
        trial2Steps: trial2.stepsExecuted,
        collisionReduction: trial1.collisionCount - trial2.collisionCount,
        progressResumed: trial2.reachedGoal && trial2.stepsExecuted <= trial1.stepsExecuted,
      },
      totalLatencyMs,
    };
  }

  async _runTrial({ trialNum = 1, isRecurrence = false, sessionIdOverride = null } = {}) {
    const history = [];
    const dispositionCounts = { PERMIT: 0, VETO: 0, MODULATE: 0, DEFER: 0, ESCALATE: 0 };
    let collisionCount = 0;
    let hazardCount = 0;
    let vetoCount = 0;
    let modulationCount = 0;
    let deferCount = 0;
    let permitCount = 0;
    let repeatedActions = 0;
    let lastAction = null;
    const session = sessionIdOverride || this.sessionId;

    for (let step = 1; step <= this.maxStepsPerTrial; step++) {
      if (this.world.isGoal()) break;

      // 1. Physical world observation
      const senses = this.world.observe();
      const st = this.world.currentState();
      const isBlocked = senses.visual_field.obstacle_ahead || senses.collision.blocked;
      const isHazard = senses.gradients.hazard;

      if (isHazard) hazardCount++;

      // 2. Transduce observation to biological receptor firing rates
      const sensoryDrives = this.transduction.transduce({
        visual_field: senses.visual_field,
        collision: senses.collision,
        gradients: senses.gradients,
        proximity: senses.proximity,
        body: st.body,
      });
      this.runtime.setSensoryDrives(sensoryDrives);

      // 3. Step biological connectome (10ms)
      this.runtime.step(10);

      // 4. Read descending neuron populations & form candidates
      const dnReadouts = this.runtime.getDescendingNeuronReadouts();
      const candidates = this.bridge.generateCandidates(dnReadouts, step);
      const topCandidate = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength)[0];

      let chosenAction = "stop";
      let chosenCandidate = null;
      let decision = null;
      let staticGuardIntervened = false;

      // 5. Condition Logic
      if (this.condition === "CONTROL") {
        // Pure connectome proposal
        chosenCandidate = topCandidate;

      } else if (this.condition === "STATIC_GUARD") {
        // Baseline: Fixed, nonlearning rule filter
        // If obstacle directly ahead, veto forward and select steering alternative from candidates
        if (isBlocked) {
          staticGuardIntervened = true;
          const steerCand = candidates.find((c) => c.action_class === "turn_left") || candidates.find((c) => c.action_class === "turn_right") || candidates.find((c) => c.provenance_type === "FALLBACK");
          chosenCandidate = steerCand;
        } else {
          chosenCandidate = topCandidate;
        }

      } else if (this.condition === "OBSERVE") {
        // DeltaX evaluates ephemerally; cannot alter chosen action
        const contradictions = [];
        if (isBlocked) {
          contradictions.push({ expected: "corridor_clear", observed: "obstacle_collision", severity: "high" });
        }

        const packet = this._buildExecutivePacket({
          sessionId: session,
          condition: "OBSERVE",
          step,
          senses,
          st,
          candidates,
          contradictions,
          dnReadouts,
        });

        decision = await this.executive.decide(packet);
        const disp = decision.disposition ?? decision.selected_disposition ?? "DEFER";
        if (dispositionCounts[disp] != null) dispositionCounts[disp]++;

        // Action remains strictly the unguided substrate winner
        chosenCandidate = topCandidate;

      } else if (this.condition === "EXECUTIVE") {
        // Real sovereign DeltaX governance
        const contradictions = [];
        if (isBlocked) {
          contradictions.push({ expected: "corridor_clear", observed: "obstacle_collision", severity: "high" });
        }
        if (isHazard) {
          contradictions.push({ expected: "safe_passage", observed: "hazard_cell", severity: "medium" });
        }

        const packet = this._buildExecutivePacket({
          sessionId: session,
          condition: "EXECUTIVE",
          step,
          senses,
          st,
          candidates,
          contradictions,
          dnReadouts,
        });

        decision = await this.executive.decide(packet);
        const disp = decision.disposition ?? decision.selected_disposition ?? "DEFER";
        if (dispositionCounts[disp] != null) dispositionCounts[disp]++;

        if (disp === "VETO") vetoCount++;
        if (disp === "MODULATE") modulationCount++;
        if (disp === "DEFER") deferCount++;
        if (disp === "PERMIT") permitCount++;

        // Apply governed selection strictly from intersection of candidate field and permitted set
        const permittedSubIds = new Set((decision.permitted || []).map((p) => p.substrate_candidate_id || p.id));
        const permittedCandidates = candidates.filter(
          (c) => permittedSubIds.has(c.substrate_candidate_id) || permittedSubIds.has(c.id)
        );

        if (permittedCandidates.length > 0) {
          const selectedActionId = decision.selected_action_id;
          chosenCandidate =
            permittedCandidates.find((c) => c.id === selectedActionId || c.substrate_candidate_id === selectedActionId) ||
            [...permittedCandidates].sort((a, b) => b.activation_strength - a.activation_strength)[0];
        } else {
          // All neural candidates vetoed: select declared safe fallback
          chosenCandidate =
            candidates.find((c) => c.provenance_type === "FALLBACK") ||
            candidates.find((c) => c.action_class === "safe_noop");
        }
      }

      // Strict Causal Assertion: chosen candidate MUST exist in pre-evaluation candidate field
      if (!chosenCandidate || !candidates.some((c) => c.id === chosenCandidate.id && c.substrate_candidate_id === chosenCandidate.substrate_candidate_id)) {
        throw new Error(`Causal integrity violation: candidate ${chosenCandidate?.id} was not present in pre-evaluation candidate field`);
      }

      chosenAction = chosenCandidate.actuator_action || this._mapCandidateToRover(chosenCandidate.action_class);

      if (chosenAction === lastAction) repeatedActions++;
      lastAction = chosenAction;

      // 6. Apply action in physical world
      const res = this.world.applyAction(chosenAction);
      if (res.status === "BLOCKED") collisionCount++;

      history.push({
        step,
        trialNum,
        chosenAction,
        status: res.status,
        position: { x: this.world.body.x, y: this.world.body.y, heading: this.world.body.heading },
        energy: this.world.energy,
        topCandidate: {
          action: topCandidate.action_class,
          strength: topCandidate.activation_strength,
          dn_forward_hz: dnReadouts.forward?.weighted_mean || 0,
        },
        decision: decision ? {
          disposition: decision.disposition ?? decision.selected_disposition,
          provenance: decision.provenance,
        } : null,
        staticGuardIntervened,
        isChanged: this.world.isChanged,
        reachedGoal: this.world.isGoal(),
      });
    }

    return {
      trialNum,
      isRecurrence,
      stepsExecuted: history.length,
      reachedGoal: this.world.isGoal(),
      finalEnergy: this.world.energy,
      collisionCount,
      hazardCount,
      repeatedActions,
      dispositionCounts,
      vetoCount,
      modulationCount,
      interventionRate: +( (vetoCount + modulationCount + deferCount) / Math.max(1, history.length) ).toFixed(3),
      history,
    };
  }

  _buildExecutivePacket({ sessionId, condition, step, senses, st, candidates, contradictions, dnReadouts }) {
    return {
      session_id: sessionId,
      condition,
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
  }

  _mapCandidateToRover(actionClass) {
    switch (actionClass) {
      case "locomotion_forward": return "forward";
      case "turn_left": return "left";
      case "turn_right": return "right";
      case "halt": return "stop";
      case "giant_fiber_escape": return "stop";
      case "groom": return "stop";
      case "safe_noop": return "stop";
      default: return "stop";
    }
  }

  async close() {
    if (this.executive?.transport?.close) {
      await this.executive.transport.close();
    }
  }
}
