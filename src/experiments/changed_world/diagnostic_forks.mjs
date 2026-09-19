/**
 * Evaluator-Only Diagnostic Fork Metadata and Causal Attribution.
 *
 * CRITICAL GOVERNANCE INVARIANT:
 * This metadata is strictly evaluator-only for offline causal failure attribution.
 * It must NEVER enter:
 *   - sensory observations (world.observe())
 *   - candidate action objects (bridge.generateCandidates())
 *   - executive packets (harness._buildExecutivePacket())
 *   - controller inputs (selectCandidate())
 *   - runtime or actuator models
 */

export const DIAGNOSTIC_FORKS = Object.freeze({
  ENV_1B_TRUE_RIGHT_REQUIRED: Object.freeze({
    id: "ENV_1B_TRUE_RIGHT_REQUIRED",
    forks: Object.freeze([
      {
        fork_id: "FORK_ENV_1B_CENTRAL_BLOCKAGE",
        position: { x: 5, y: 3, heading: 0 },
        isBlocked: true,
        necessary_action_class: "turn_right",
        valid_action_classes: ["turn_right"],
        description: "Confronting blocked central passage at (5, 3); North corridor is sealed wall. Only South passage is open via right turn.",
      },
    ]),
  }),

  ENV_POLARITY_LEFT: Object.freeze({
    id: "ENV_POLARITY_LEFT",
    forks: Object.freeze([
      {
        fork_id: "FORK_POLARITY_LEFT_BLOCKAGE",
        position: { x: 5, y: 3, heading: 0 },
        isBlocked: true,
        necessary_action_class: "turn_left",
        valid_action_classes: ["turn_left"],
        description: "Confronting blocked central passage at (5, 3); South wall is solid. North passage is open via left turn.",
      },
    ]),
  }),

  ENV_POLARITY_RIGHT: Object.freeze({
    id: "ENV_POLARITY_RIGHT",
    forks: Object.freeze([
      {
        fork_id: "FORK_POLARITY_RIGHT_BLOCKAGE",
        position: { x: 5, y: 3, heading: 0 },
        isBlocked: true,
        necessary_action_class: "turn_right",
        valid_action_classes: ["turn_right"],
        description: "Confronting blocked central passage at (5, 3); North wall is solid. South passage is open via right turn.",
      },
    ]),
  }),

  ENV_CHOICE_WITH_REVERSAL: Object.freeze({
    id: "ENV_CHOICE_WITH_REVERSAL",
    forks: Object.freeze([
      {
        fork_id: "FORK_REVERSAL_BARRIER_1",
        position: { x: 4, y: 3, heading: 0 },
        isBlocked: true,
        necessary_action_class: "turn_left",
        valid_action_classes: ["turn_left"],
        description: "First barrier blocks central/south routes; North corridor open via left turn.",
      },
      {
        fork_id: "FORK_REVERSAL_BARRIER_2",
        position: { x: 8, y: 1, heading: 0 },
        isBlocked: true,
        necessary_action_class: "turn_right",
        valid_action_classes: ["turn_right"],
        description: "North corridor terminates at (9, 1); passage to goal requires right turn back toward South.",
      },
    ]),
  }),

  ENV_TEMPORAL_NON_MARKOVIAN: Object.freeze({
    id: "ENV_TEMPORAL_NON_MARKOVIAN",
    forks: Object.freeze([
      {
        fork_id: "FORK_JUNCTION_J_TRIAL1",
        trialNum: 1,
        position: { x: 3, y: 3, heading: 0 },
        isBlocked: true,
        necessary_action_class: "turn_left",
        valid_action_classes: ["turn_left"],
        description: "Junction J facing East in Trial 1; North corridor is open downstream to goal.",
      },
      {
        fork_id: "FORK_JUNCTION_J_TRIAL2",
        trialNum: 2,
        position: { x: 3, y: 3, heading: 0 },
        isBlocked: true,
        necessary_action_class: "turn_right",
        valid_action_classes: ["turn_right"],
        description: "Junction J facing East in Trial 2; North corridor blocked downstream; South corridor open via right turn.",
      },
    ]),
  }),
});

/**
 * Causal failure attribution engine for post-hoc episode analysis.
 * Analyzes whether the necessary candidate was available in the pre-evaluation candidate field
 * at declared diagnostic forks.
 */
export function attributeFailureCausally({
  environmentId,
  controller,
  reachedGoal,
  history = [],
  actionCounts = null,
  forkCandidateLogs = [],
  stepCount = 0,
  maxSteps = 35,
}) {
  if (reachedGoal) return null;

  // Check if this environment has declared diagnostic forks
  const diagnosticConfig = DIAGNOSTIC_FORKS[environmentId];
  if (diagnosticConfig) {
    // 1. Check direct fork candidate logs if available
    for (const fork of diagnosticConfig.forks) {
      const necessaryAction = fork.necessary_action_class;

      // Find initial decisive visit to this fork
      const matchedLog = forkCandidateLogs.find((f) =>
        f.position?.x === fork.position.x &&
        f.position?.y === fork.position.y &&
        f.position?.heading === fork.position.heading &&
        (!fork.trialNum || f.trialNum === fork.trialNum)
      );

      if (matchedLog) {
        const candData = matchedLog.candidates?.[necessaryAction];
        const isAbsentOrSubthreshold = !candData || candData.forbidden || (candData.strength <= 0);

        if (isAbsentOrSubthreshold) {
          return {
            category: "SUBSTRATE_CANDIDATE_ABSENCE",
            causal_layer: "substrate_candidate_generation",
            detail: `Necessary candidate '${necessaryAction}' was absent or sub-threshold (strength=${candData?.strength ?? 0}, rate=${candData?.raw_rate_hz ?? 0} Hz) at decisive fork ${fork.fork_id}`,
            fork_id: fork.fork_id,
            necessary_action: necessaryAction,
          };
        }
      }
    }

    // 2. Check if the environment requires an action class that was never executed or available
    const requiresRightTurn = diagnosticConfig.forks.some((f) => f.necessary_action_class === "turn_right");
    if (requiresRightTurn) {
      const hadRightTurn = (actionCounts && actionCounts.right > 0) ||
                           history.some((h) => h.chosenAction === "right" || h.chosenCandidateClass === "turn_right");
      if (!hadRightTurn) {
        return {
          category: "SUBSTRATE_CANDIDATE_ABSENCE",
          causal_layer: "substrate_candidate_generation",
          detail: `Environment ${environmentId} requires 'turn_right' for goal reach, but zero right turns were generated across the episode due to connectome steering asymmetry`,
          fork_id: diagnosticConfig.forks.find((f) => f.necessary_action_class === "turn_right")?.fork_id,
          necessary_action: "turn_right",
        };
      }
    }
  }

  // Non-diagnostic worlds or general failure analysis:
  // Detect position oscillation / limit cycles
  const posCounts = new Map();
  let maxVisits = 0;
  for (const h of history) {
    const key = `${h.position?.x},${h.position?.y},${h.position?.heading}`;
    const cnt = (posCounts.get(key) || 0) + 1;
    posCounts.set(key, cnt);
    if (cnt > maxVisits) maxVisits = cnt;
  }
  const hasLimitCycle = maxVisits >= 3 || (actionCounts && actionCounts.left >= 10 && actionCounts.forward <= 10);

  if (["SUBSTRATE_TOP", "STOCHASTIC_WEIGHTED"].includes(controller)) {
    if (hasLimitCycle) {
      return {
        category: "SUBSTRATE_DYNAMICS_LIMIT_CYCLE",
        causal_layer: "substrate_recurrent_dynamics",
        detail: "Unregulated substrate entered rotational or translational limit cycle",
      };
    }
    return {
      category: "SUBSTRATE_CANDIDATE_ABSENCE",
      causal_layer: "substrate_candidate_generation",
      detail: "Substrate failed to generate admissible forward/turning candidates",
    };
  }

  if (controller === "SIMPLE_REFLEX") {
    return {
      category: "CONTROLLER_SELECTION_FAILURE",
      causal_layer: "reflex_selection",
      detail: "Simple reflex heuristic made ineffective action choice",
    };
  }

  if (["DELTAX_EXECUTIVE", "DELTAX_TRIAL_RESET", "DELTAX_STEP_RESET"].includes(controller)) {
    return {
      category: "EXECUTIVE_SELECTION_FAILURE",
      causal_layer: "executive_selection",
      detail: "DeltaX executive selected an action sequence that timed out or failed",
    };
  }

  return {
    category: "OTHER",
    causal_layer: "unspecified",
    detail: "Unclassified failure",
  };
}
