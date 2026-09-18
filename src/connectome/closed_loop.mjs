/**
 * Connectome Closed-Loop Recursive Harness.
 * Complete 12-step recursive decision loop:
 *   Sensory Transduction → Recurrent Connectome → Candidate Bridge → DeltaX Evaluation → Action Actuation → Consequence & Contradiction Detection.
 *
 * Supports conditions: CONTROL, OBSERVE, EXECUTIVE, SHAM, SHUFFLED_CONNECTOME.
 */
import { BrokenWorld } from "../worlds/broken_world/world.mjs";
import { ConnectomeRuntime } from "./runtime.mjs";
import { ConnectomeSensoryTransduction } from "./sensory_transduction.mjs";
import { ConnectomeCandidateBridge } from "./candidate_bridge.mjs";
import { createShuffledConnectome } from "./shuffled_control.mjs";
import { createExecutive } from "../deltax/index.mjs";

function computeEntropy(candidates) {
  const strengths = (candidates || []).map((c) => Math.max(1e-9, c.activation_strength || 0));
  const sum = strengths.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  const probs = strengths.map((s) => s / sum);
  return -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0);
}

export class ConnectomeClosedLoop {
  constructor(opts = {}) {
    this.opts = opts;
    this.seed = opts.seed ?? 100;
    this.condition = opts.condition ?? "EXECUTIVE"; // CONTROL | OBSERVE | EXECUTIVE | SHAM | SHUFFLED_CONNECTOME
    this.steps = opts.steps ?? 12;
    this.runId = opts.runId ?? `connectome_${this.condition.toLowerCase()}_${this.seed}_${Date.now()}`;
    this.ablateContradictions = opts.ablateContradictions ?? false;
    this.command = opts.command || process.env.DELTAX_LOCAL_RUNTIME_CMD;

    // 1. World instance
    this.world = opts.world || this._createSeededWorld(this.seed);

    // 2. Connectome runtime
    this.runtime = new ConnectomeRuntime({ seed: this.seed });
    if (this.condition === "SHUFFLED_CONNECTOME") {
      this.runtime.data = createShuffledConnectome(this.runtime.data, this.seed);
      this.runtime.net.weights = this.runtime.data.weights;
      this.runtime.net.indices = this.runtime.data.indices;
      this.runtime.net.indptr = this.runtime.data.indptr;
    }

    // 3. Sensory Transduction & Candidate Bridge
    this.transduction = new ConnectomeSensoryTransduction(this.runtime.data);
    this.bridge = new ConnectomeCandidateBridge();

    // 4. Executive adapter
    this.executive = this.command
      ? createExecutive({ mode: "local_runtime", command: this.command, sessionId: this.runId })
      : null;
  }

  _createSeededWorld(seed) {
    const mutationStep = 2 + (seed % 4);
    const hazardX = 5 + (seed % 3);
    const initialEnergy = 18 + (seed % 5);

    const world = new BrokenWorld({ externalMutationAt: mutationStep });
    world.hazard = { cells: [{ x: hazardX, y: 2 }], cost: 2 };
    world.energy = initialEnergy;
    world.body.energy = initialEnergy;
    world.start();
    return world;
  }

  /**
   * Run the full closed-loop trajectory across steps.
   */
  async run() {
    const history = [];
    const dispositionCounts = { PERMIT: 0, VETO: 0, MODULATE: 0, DEFER: 0, ESCALATE: 0 };
    let vetoCount = 0;
    let modulationCount = 0;
    let deferCount = 0;
    let permitCount = 0;
    let arbitrationCount = 0;
    let hazardEncounters = 0;
    let contradictionEvents = 0;
    let repeatedLoops = 0;
    let fallbackCount = 0;
    const stepLatencies = [];
    let lastAction = null;
    const t0 = Date.now();

    for (let i = 0; i < this.steps; i++) {
      const stepStart = Date.now();
      const stepNum = i + 1;

      // 1. Observe physical world state
      const senses = this.world.observe();
      const st = this.world.currentState();
      const isHazard = senses.gradients?.hazard === true;
      if (isHazard) hazardEncounters++;

      // 2. Transduce world observations to biological sensory receptor rates
      const sensoryDrives = this.transduction.transduce({
        visual_field: senses.visual_field,
        collision: senses.collision,
        gradients: senses.gradients,
        proximity: senses.proximity,
        body: st.body,
      });
      this.runtime.setSensoryDrives(sensoryDrives);

      // 3. Step the 165k-neuron recurrent connectome network (10ms biological time)
      const simInfo = this.runtime.step(10);

      // 4. Measure descending neuron populations and form Candidate Action Field
      const dnReadouts = this.runtime.getDescendingNeuronReadouts();
      const candidates = this.bridge.generateCandidates(dnReadouts, stepNum);
      const substrateWinner = [...candidates].sort((a, b) => b.activation_strength - a.activation_strength)[0];
      const entropyBefore = computeEntropy(candidates);

      // 5. Build canonical DeltaX packet & evaluate
      let chosenAction = "stop";
      let chosenCandidate = null;
      let decision = null;

      const detectedContradictions = [];
      if (!this.ablateContradictions) {
        if (st.energy < 3) {
          detectedContradictions.push({
            type: "energy_depletion",
            severity: "high",
            remaining: st.energy,
          });
          contradictionEvents++;
        }
        if (isHazard) {
          detectedContradictions.push({
            type: "hazard_proximity",
            severity: "critical",
            loc: { x: st.body.x, y: st.body.y },
          });
          contradictionEvents++;
        }
      }

      const packet = {
        session_id: this.sessionId,
        condition: this.condition,
        step_id: stepNum,
        objective: "reach_goal_with_coherence",
        environment_state_summary: {
          hazard: isHazard,
          door_closed: this.world.arena.door.closed,
          wall_ahead: senses.visual_field?.wall_ahead || false,
        },
        substrate_state_summary: {
          energy: st.energy,
          heading: st.body.heading,
          step: st.step,
          mean_active_neurons: simInfo.mean_active_neurons,
          descending_forward_hz: dnReadouts.forward?.weighted_mean || 0,
          descending_turn_l_hz: dnReadouts.turn_left?.weighted_mean || 0,
          descending_turn_r_hz: dnReadouts.turn_right?.weighted_mean || 0,
        },
        candidate_actions: candidates,
        detected_contradictions: detectedContradictions,
        active_constraints: isHazard ? ["sandbox", "no_hidden_actuator"] : ["sandbox"],
        available_executive_actions: ["PERMIT", "VETO", "MODULATE", "DEFER", "ESCALATE"],
      };

      if (!this.executive || this.condition === "CONTROL") {
        // Pure substrate choice: no DeltaX governance
        chosenCandidate = substrateWinner;
      } else {
        decision = await this.executive.decide(packet);
        const disp = decision.disposition ?? decision.selected_disposition ?? "DEFER";
        if (dispositionCounts[disp] != null) dispositionCounts[disp]++;

        if (disp === "VETO") vetoCount++;
        if (disp === "MODULATE") modulationCount++;
        if (disp === "DEFER") deferCount++;
        if (disp === "PERMIT") permitCount++;

        if (this.condition === "OBSERVE") {
          // OBSERVE condition: DeltaX records evaluation ephemerally, never alters execution
          chosenCandidate = substrateWinner;
        } else {
          // EXECUTIVE condition: strict intersection of candidate field and permitted candidate set
          const permittedSubIds = new Set((decision.permitted || []).map((p) => p.substrate_candidate_id || p.id));
          const permittedCandidates = candidates.filter(
            (c) => permittedSubIds.has(c.substrate_candidate_id) || permittedSubIds.has(c.id)
          );

          if (permittedCandidates.length > 0) {
            // Select by governed priority or activation strength
            const selectedActionId = decision.selected_action_id;
            chosenCandidate =
              permittedCandidates.find((c) => c.id === selectedActionId || c.substrate_candidate_id === selectedActionId) ||
              [...permittedCandidates].sort((a, b) => b.activation_strength - a.activation_strength)[0];

            if (chosenCandidate.id !== substrateWinner.id) {
              arbitrationCount++;
            }
          } else {
            // All neural candidates vetoed or excluded: select declared safe fallback
            chosenCandidate =
              candidates.find((c) => c.provenance_type === "FALLBACK") ||
              candidates.find((c) => c.action_class === "safe_noop");
            fallbackCount++;
          }
        }
      }

      // Causal Integrity Assertion: chosen candidate MUST exist in pre-evaluation candidate field
      if (!chosenCandidate || !candidates.some((c) => c.id === chosenCandidate.id && c.substrate_candidate_id === chosenCandidate.substrate_candidate_id)) {
        throw new Error(`Causal integrity violation: candidate ${chosenCandidate?.id} was not present in pre-evaluation candidate field`);
      }

      // Actuator command strictly derives from the chosen candidate's actuator mapping
      chosenAction = chosenCandidate.actuator_action || this._mapActionClassToRover(chosenCandidate.action_class);

      if (chosenAction === lastAction) repeatedLoops++;
      lastAction = chosenAction;

      // 6. Actuate action in the physical world & record consequence
      const actionResult = this.world.applyAction(chosenAction);
      const stepDuration = Date.now() - stepStart;
      stepLatencies.push(stepDuration);

      const permittedSubIds = new Set((decision?.permitted || []).map((p) => p.substrate_candidate_id || p.id));
      const entropyAfter = (this.condition === "EXECUTIVE" && decision?.permitted?.length)
        ? computeEntropy(candidates.filter((c) => permittedSubIds.has(c.substrate_candidate_id) || permittedSubIds.has(c.id)))
        : entropyBefore;

      history.push({
        step: stepNum,
        chosen_action: chosenAction,
        action_result: actionResult.status,
        substrate_winner: {
          id: substrateWinner.id,
          action_class: substrateWinner.action_class,
          strength: substrateWinner.activation_strength,
        },
        chosen_candidate: {
          id: chosenCandidate.id,
          substrate_candidate_id: chosenCandidate.substrate_candidate_id,
          action_class: chosenCandidate.action_class,
          actuator_action: chosenCandidate.actuator_action,
          provenance_type: chosenCandidate.provenance_type,
          strength: chosenCandidate.activation_strength,
        },
        winner_before: { id: substrateWinner.id, action_class: substrateWinner.action_class },
        winner_after: { id: chosenCandidate.id, action_class: chosenCandidate.action_class },
        entropy_before: +entropyBefore.toFixed(3),
        entropy_after: +entropyAfter.toFixed(3),
        step_latency_ms: stepDuration,
        candidates: candidates.map((c) => ({
          id: c.id,
          substrate_candidate_id: c.substrate_candidate_id,
          action: c.action_class,
          actuator_action: c.actuator_action,
          provenance_type: c.provenance_type,
          strength: c.activation_strength,
          provenance: {
            originating_population: c.originating_population,
            raw_measure: c.raw_activity_measure,
          },
        })),
        decision: decision ? {
          disposition: decision.disposition ?? decision.selected_disposition,
          provenance: decision.provenance,
          permitted: decision.permitted,
          vetoed: decision.vetoed,
        } : null,
        world_state: this.world.currentState(),
        reached_goal: this.world.isGoal(),
      });
    }

    const latencyMs = Date.now() - t0;
    const hardInterventionCount = vetoCount + modulationCount + deferCount;
    const sortedLatencies = [...stepLatencies].sort((a, b) => a - b);
    const medianLatency = sortedLatencies.length ? sortedLatencies[Math.floor(sortedLatencies.length / 2)] : 0;
    const p95Latency = sortedLatencies.length ? sortedLatencies[Math.min(sortedLatencies.length - 1, Math.floor(sortedLatencies.length * 0.95))] : 0;
    const minLatency = sortedLatencies.length ? sortedLatencies[0] : 0;
    const maxLatency = sortedLatencies.length ? sortedLatencies[sortedLatencies.length - 1] : 0;

    return {
      run_id: this.runId,
      seed: this.seed,
      condition: this.condition,
      steps: this.steps,
      reached_goal: this.world.isGoal(),
      final_energy: this.world.energy,
      hazard_encounters: hazardEncounters,
      contradiction_events: contradictionEvents,
      repeated_action_loops: repeatedLoops,
      disposition_counts: dispositionCounts,
      veto_count: vetoCount,
      modulation_count: modulationCount,
      defer_count: deferCount,
      permit_count: permitCount,
      arbitration_count: arbitrationCount,
      fallback_count: fallbackCount,
      hard_intervention_count: hardInterventionCount,
      intervention_rate: +( hardInterventionCount / this.steps ).toFixed(3),
      arbitration_rate: +( arbitrationCount / this.steps ).toFixed(3),
      total_executive_influence_rate: +( (hardInterventionCount + arbitrationCount) / this.steps ).toFixed(3),
      latency_ms: latencyMs,
      step_latency_ms: {
        min: minLatency,
        max: maxLatency,
        median: medianLatency,
        p95: p95Latency,
      },
      history,
    };
  }

  _mapActionClassToRover(actionClass) {
    switch (actionClass) {
      case "locomotion_forward": return "forward";
      case "locomotion_backward": return "stop";
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
