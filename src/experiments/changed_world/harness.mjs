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
import { ConnectomeSensoryTransduction, TRANSDUCTION_MODES } from "../../connectome/sensory_transduction.mjs";
import { ConnectomeCandidateBridge, READOUT_MODES } from "../../connectome/candidate_bridge.mjs";
import { createShuffledConnectome } from "../../connectome/shuffled_control.mjs";
import { createExecutive } from "../../deltax/index.mjs";
import { CONTROLLER_TYPES, selectCandidate, createPrng } from "../../controllers/candidate_selectors.mjs";

function computeEntropy(candidates) {
  const strengths = (candidates || []).map((c) => Math.max(1e-9, c.activation_strength || 0));
  const sum = strengths.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  const probs = strengths.map((s) => s / sum);
  return -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0);
}

export const PHASE3_CONDITIONS = Object.freeze([
  "CONTROL",
  "OBSERVE",
  "STATIC_GUARD",
  "EXECUTIVE",
  "EXECUTIVE_MEMORY_RESET",
  "SHUFFLED_CONNECTOME",
]);

export class ChangedWorldHarness {
  constructor({
    seed = 2000,
    condition = "EXECUTIVE", // CONTROL | OBSERVE | STATIC_GUARD | EXECUTIVE | EXECUTIVE_MEMORY_RESET | SHUFFLED_CONNECTOME
    command = process.env.DELTAX_LOCAL_RUNTIME_CMD,
    maxStepsPerTrial = 35,
    changeAtStep = 18,
    executive = null,
    sensoryMode = TRANSDUCTION_MODES.SYMMETRIC,
    readoutMode = READOUT_MODES.READOUT_A_CURRENT,
    worldFactory = null,
    controllerType = null,
  } = {}) {
    this.seed = seed;
    this.condition = condition;
    this.command = command;
    this.maxStepsPerTrial = maxStepsPerTrial;
    this.changeAtStep = changeAtStep;
    this.sensoryMode = sensoryMode;
    this.readoutMode = readoutMode;
    this.worldFactory = worldFactory;
    this.controllerType = controllerType;
    this.prng = createPrng(seed);

    if (!PHASE3_CONDITIONS.includes(condition)) {
      throw new Error(`Invalid condition: ${condition}`);
    }

    const needsExecutive = ["OBSERVE", "EXECUTIVE", "EXECUTIVE_MEMORY_RESET"].includes(condition);
    if (needsExecutive && !command && !executive) {
      throw new Error("DELTAX_LOCAL_RUNTIME_CMD is required for OBSERVE and EXECUTIVE conditions; refusing silent stub fallback");
    }

    // 1. World instance
    this.world = typeof this.worldFactory === "function"
      ? this.worldFactory({ changeAtStep: this.changeAtStep, seed: this.seed, initialEnergy: 50 })
      : new ChangedWorld({
          changeAtStep: this.changeAtStep,
          seed: this.seed,
          initialEnergy: 50,
        });

    // 2. Connectome substrate
    this.runtime = new ConnectomeRuntime({ seed: this.seed, substepsPerTick: 10 });
    if (condition === "SHUFFLED_CONNECTOME") {
      this.runtime.data = createShuffledConnectome(this.runtime.data, this.seed);
      this.runtime.net.weights = this.runtime.data.weights;
      this.runtime.net.indices = this.runtime.data.indices;
      this.runtime.net.indptr = this.runtime.data.indptr;
    }

    this.transduction = new ConnectomeSensoryTransduction(this.runtime.data, null, { mode: this.sensoryMode });
    this.bridge = new ConnectomeCandidateBridge({ readoutMode: this.readoutMode });

    // 3. Executive connection (for OBSERVE, EXECUTIVE, EXECUTIVE_MEMORY_RESET)
    this.sessionId = `phase3_${condition.toLowerCase()}_seed_${seed}_${Date.now()}`;
    this.executive = executive || (
      needsExecutive && this.command
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
   * @param {boolean} [opts.resetExecutiveMemoryOnRecurrence=null] Override memory retention
   */
  async runEpisode({ resetExecutiveMemoryOnRecurrence = null } = {}) {
    const episodeStart = Date.now();
    const shouldResetMemory = resetExecutiveMemoryOnRecurrence ?? (this.condition === "EXECUTIVE_MEMORY_RESET");

    // --- TRIAL 1: Baseline Settling + Stable Experience + Unexpected Change + Recovery ---
    const trial1 = await this._runTrial({
      trialNum: 1,
      isRecurrence: false,
    });

    let trial1Checkpoint = null;
    if (this.executive && typeof this.executive.checkpoint === "function") {
      try {
        trial1Checkpoint = await this.executive.checkpoint(this.sessionId);
      } catch (err) {
        trial1Checkpoint = { error: err.message };
      }
    }

    // --- FORK FOR RECURRENCE ---
    this.world.resetForRecurrence({ preserveChanged: true });

    let trial2SessionId = this.sessionId;
    let resetReceipt = null;
    let stateLineage = "RETAINED_CONTINUATION";

    if (shouldResetMemory && this.executive) {
      trial2SessionId = `${this.sessionId}_trial2_reset_${Date.now()}`;
      stateLineage = "DISCONTINUOUS_FRESH_SESSION";
      if (typeof this.executive.reset === "function") {
        try {
          resetReceipt = await this.executive.reset(trial2SessionId);
        } catch (err) {
          resetReceipt = { error: err.message };
        }
      }
    }

    let trial2PreflightCheckpoint = null;
    if (this.executive && typeof this.executive.checkpoint === "function") {
      try {
        trial2PreflightCheckpoint = await this.executive.checkpoint(trial2SessionId);
      } catch (err) {
        trial2PreflightCheckpoint = { error: err.message };
      }
    }

    // --- TRIAL 2: Recurrence in Changed World ---
    const trial2 = await this._runTrial({
      trialNum: 2,
      isRecurrence: true,
      sessionIdOverride: trial2SessionId,
    });

    const episodeWallTimeMs = Date.now() - episodeStart;
    const totalSimulatedTimeMs = (trial1.stepsExecuted + trial2.stepsExecuted) * 10;
    const totalSteps = trial1.stepsExecuted + trial2.stepsExecuted;
    const bothReachedGoal = trial1.reachedGoal && trial2.reachedGoal;
    const collisionReduction = trial1.collisionCount - trial2.collisionCount;
    const recurrenceSpeedup = trial1.stepsExecuted - trial2.stepsExecuted;

    return {
      seed: this.seed,
      condition: this.condition,
      resetExecutiveMemory: shouldResetMemory,
      totalSimulatedTimeMs,
      totalSteps,
      bothReachedGoal,
      collisionReduction,
      recurrenceSpeedup,
      episodeWallTimeMs,
      executiveLineage: {
        condition: this.condition,
        shouldResetMemory,
        stateLineage,
        trial1SessionId: this.sessionId,
        trial2SessionId,
        trial1Checkpoint: trial1Checkpoint?.state ? {
          session_id: trial1Checkpoint.session_id,
          tick: trial1Checkpoint.state.tick,
          tnm_event_count: trial1Checkpoint.state.tnm_events?.length ?? 0,
        } : trial1Checkpoint,
        resetReceipt: resetReceipt ? {
          type: resetReceipt.type,
          session_id: resetReceipt.session_id,
          provenance: resetReceipt.provenance,
        } : null,
        trial2PreflightCheckpoint: trial2PreflightCheckpoint?.state ? {
          session_id: trial2PreflightCheckpoint.session_id,
          tick: trial2PreflightCheckpoint.state.tick,
          tnm_event_count: trial2PreflightCheckpoint.state.tnm_events?.length ?? 0,
        } : trial2PreflightCheckpoint,
      },
      trial1,
      trial2,
      summary: {
        trial1ReachedGoal: trial1.reachedGoal,
        trial2ReachedGoal: trial2.reachedGoal,
        trial1Steps: trial1.stepsExecuted,
        trial2Steps: trial2.stepsExecuted,
        trial1Collisions: trial1.collisionCount,
        trial2Collisions: trial2.collisionCount,
        trial1EnergyUsed: trial1.energyUsed,
        trial2EnergyUsed: trial2.energyUsed,
        trial1RecoveryStep: trial1.recoveryStep,
        trial2RecoveryStep: trial2.recoveryStep,
        trial1RepeatedMistakes: trial1.repeatedMistakeCount,
        trial2RepeatedMistakes: trial2.repeatedMistakeCount,
      },
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
    let arbitrationCount = 0;
    let fallbackCount = 0;
    let repeatedActions = 0;
    let lastAction = null;
    let stepsToInitialStable = null;
    let contradictionOnsetStep = null;
    let totalContradictions = 0;
    let connectomeSimTimeMs = 0;
    let deltaxIpcTimeMs = 0;
    let decisionTickTimeMs = 0;
    let firstExecutivePacket = null;
    const session = sessionIdOverride || this.sessionId;

    for (let step = 1; step <= this.maxStepsPerTrial; step++) {
      if (this.world.isGoal()) break;

      const tickStart = Date.now();

      // 1. Physical world observation
      const senses = this.world.observe();
      const st = this.world.currentState();
      const isBlocked = senses.visual_field.obstacle_ahead || senses.collision.blocked;
      const isHazard = senses.gradients.hazard;

      if (isHazard) hazardCount++;

      // 2. Transduce sensory inputs to connectome drives
      const sensoryDrives = this.transduction.transduce({
        visual_field: senses.visual_field,
        collision: senses.collision,
        gradients: senses.gradients,
        proximity: senses.proximity,
        lateral_sensors: senses.lateral_sensors,
        body: st.body,
      });
      this.runtime.setSensoryDrives(sensoryDrives);

      // 3. Step biological connectome (10ms)
      const simStart = Date.now();
      this.runtime.step(10);
      connectomeSimTimeMs += (Date.now() - simStart);

      // 4. Generate candidate actions
      const dnReadouts = this.runtime.getDescendingNeuronReadouts();
      const candidates = this.bridge.generateCandidates(dnReadouts, step);

      // Hard physical constraints:
      // 1. Forward locomotion is physically impossible when blocked ahead
      // 2. Unembodied actions are rejected as actuator-unavailable
      for (const c of candidates) {
        if (isBlocked && c.action_class === "locomotion_forward") {
          c.forbidden = true;
          c.forbidden_reason = "BLOCKED_AHEAD";
        }
        if (c.embodiment_status === "UNEMBODIED" || c.is_executable === false) {
          c.forbidden = true;
          c.forbidden_reason = "UNEMBODIED_ACTUATOR";
        }
      }

      const topCandidate = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength)[0];

      let chosenCandidate = null;
      let decision = null;
      let staticGuardIntervened = false;

      // 5. Condition / Controller Logic
      if (this.controllerType && [CONTROLLER_TYPES.SUBSTRATE_TOP, CONTROLLER_TYPES.SIMPLE_REFLEX, CONTROLLER_TYPES.STOCHASTIC_WEIGHTED].includes(this.controllerType)) {
        chosenCandidate = selectCandidate({
          controller: this.controllerType,
          candidates,
          senses,
          prng: this.prng,
        });
      } else if (this.condition === "CONTROL" || this.condition === "SHUFFLED_CONNECTOME") {
        chosenCandidate = topCandidate;

      } else if (this.condition === "STATIC_GUARD") {
        // Fixed nonlearning reflex: intervenes on direct physical obstacle collision/detection
        if (isBlocked) {
          staticGuardIntervened = true;
          const steerCand = candidates.find((c) => !c.forbidden && ["turn_left", "turn_right"].includes(c.action_class)) ||
                            candidates.find((c) => c.provenance_type === "FALLBACK");
          chosenCandidate = steerCand || topCandidate;
        } else {
          chosenCandidate = topCandidate;
        }

      } else if (this.condition === "OBSERVE") {
        const contradictions = [];
        if (isBlocked) {
          contradictions.push({ expected: "corridor_clear", observed: "obstacle_collision", severity: "high" });
          if (contradictionOnsetStep === null) contradictionOnsetStep = step;
          totalContradictions++;
        }
        if (isHazard) {
          contradictions.push({ expected: "safe_passage", observed: "hazard_cell", severity: "medium" });
          totalContradictions++;
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

        if (!firstExecutivePacket) {
          firstExecutivePacket = JSON.parse(JSON.stringify(packet));
        }

        const ipcStart = Date.now();
        decision = await this.executive.decide(packet);
        deltaxIpcTimeMs += (Date.now() - ipcStart);

        chosenCandidate = topCandidate;

      } else if (["EXECUTIVE", "EXECUTIVE_MEMORY_RESET"].includes(this.condition)) {
        const contradictions = [];
        if (isBlocked) {
          contradictions.push({ expected: "corridor_clear", observed: "obstacle_collision", severity: "high" });
          if (contradictionOnsetStep === null) contradictionOnsetStep = step;
          totalContradictions++;
        }
        if (isHazard) {
          contradictions.push({ expected: "safe_passage", observed: "hazard_cell", severity: "medium" });
          totalContradictions++;
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

        if (!firstExecutivePacket) {
          firstExecutivePacket = JSON.parse(JSON.stringify(packet));
        }

        const ipcStart = Date.now();
        decision = await this.executive.decide(packet);
        deltaxIpcTimeMs += (Date.now() - ipcStart);

        const disp = decision.disposition ?? decision.selected_disposition ?? "DEFER";
        if (dispositionCounts[disp] != null) dispositionCounts[disp]++;
        if (disp === "VETO") vetoCount++;
        if (disp === "MODULATE") modulationCount++;
        if (disp === "DEFER") deferCount++;
        if (disp === "PERMIT") permitCount++;

        const vetoedIds = new Set((decision.vetoed || []).map((v) => v.id || v.substrate_candidate_id));
        const admitted = candidates.filter(
          (c) => !vetoedIds.has(c.id) && !vetoedIds.has(c.substrate_candidate_id) && !c.forbidden
        );
        const selected = candidates.find(
          (c) => c.id === decision.selected_action_id || c.substrate_candidate_id === decision.selected_action_id
        );

        // Strict unassisted candidate selection: Follow DeltaX decision wherever non-forbidden and unvetoed.
        // Zero harness-side steering overrides. If DeltaX selects halt, the entity halts.
        if (selected && !selected.forbidden && !vetoedIds.has(selected.id) && !vetoedIds.has(selected.substrate_candidate_id)) {
          chosenCandidate = selected;
        } else if (admitted.length > 0) {
          chosenCandidate = admitted[0];
        } else {
          chosenCandidate = candidates.find((c) => c.provenance_type === "FALLBACK") || topCandidate;
        }
      }

      // Causal Integrity Assertion: chosen candidate MUST exist in pre-evaluation candidate field
      if (!chosenCandidate || !candidates.some((c) => c.id === chosenCandidate.id && c.substrate_candidate_id === chosenCandidate.substrate_candidate_id)) {
        throw new Error(`Causal integrity violation: candidate ${chosenCandidate?.id} was not present in pre-evaluation candidate field`);
      }

      if (chosenCandidate.provenance_type === "FALLBACK") fallbackCount++;
      if (chosenCandidate.id !== topCandidate.id) arbitrationCount++;

      const chosenAction = chosenCandidate.actuator_action || this._mapCandidateToRover(chosenCandidate.action_class);

      if (chosenAction === lastAction) repeatedActions++;
      lastAction = chosenAction;

      if (stepsToInitialStable === null && chosenAction === "forward") {
        stepsToInitialStable = step;
      }

      // 6. Apply action in physical world
      const res = this.world.applyAction(chosenAction);
      if (res.status === "BLOCKED") collisionCount++;

      decisionTickTimeMs += (Date.now() - tickStart);

      history.push({
        step,
        trialNum,
        phase: res.phase,
        chosenAction,
        chosenCandidateClass: chosenCandidate.action_class,
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
          selected_action_id: decision.selected_action_id,
          provenance: decision.provenance,
        } : null,
        staticGuardIntervened,
        isChanged: this.world.isChanged,
        reachedGoal: this.world.isGoal(),
      });
    }

    const worldState = this.world.currentState();
    const finalOutcome = this.world.isGoal()
      ? (worldState.recoveryStep ? "RECOVERED_AND_COMPLETED" : "COMPLETED_DIRECT")
      : (this.world.energy <= 0 ? "ENERGY_DEPLETED" : (collisionCount > 5 ? "STALLED_AT_OBSTACLE" : "TIMEOUT"));

    return {
      trialNum,
      isRecurrence,
      stepsExecuted: history.length,
      reachedGoal: this.world.isGoal(),
      initialEnergy: 50,
      finalEnergy: this.world.energy,
      energyUsed: +(50 - this.world.energy).toFixed(1),
      collisionCount,
      hazardCount,
      repeatedActions,
      dispositionCounts,
      vetoCount,
      modulationCount,
      deferCount,
      permitCount,
      arbitrationCount,
      fallbackCount,
      contradictionCount: totalContradictions,
      stepsToInitialStable: stepsToInitialStable ?? this.maxStepsPerTrial,
      worldChangeStep: worldState.worldChangeStep,
      firstPostChangeFailureStep: worldState.firstPostChangeFailureStep,
      contradictionOnsetStep,
      recoveryStep: worldState.recoveryStep,
      repeatedMistakeCount: worldState.repeatedMistakeCount,
      finalOutcome,
      latencies: {
        connectomeSimTimeMs,
        deltaxIpcTimeMs,
        decisionTickTimeMs,
        meanTickMs: +(decisionTickTimeMs / Math.max(1, history.length)).toFixed(2),
      },
      firstExecutivePacket,
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
      case "locomotion_backward": return "backward";
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
