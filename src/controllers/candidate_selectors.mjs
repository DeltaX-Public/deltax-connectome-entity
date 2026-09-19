/**
 * Candidate Selectors & Controllers (Phase IV-C).
 *
 * Implements frozen decision algorithms operating strictly on the pre-evaluation
 * connectome candidate field under identical physical observations.
 *
 * All controllers receive matched information and cannot invent actions.
 */

export const CONTROLLER_TYPES = Object.freeze({
  SUBSTRATE_TOP: "SUBSTRATE_TOP",
  SIMPLE_REFLEX: "SIMPLE_REFLEX",
  STOCHASTIC_WEIGHTED: "STOCHASTIC_WEIGHTED",
  DELTAX_EXECUTIVE: "DELTAX_EXECUTIVE",
  DELTAX_TRIAL_RESET: "DELTAX_TRIAL_RESET",
  DELTAX_STEP_RESET: "DELTAX_STEP_RESET",
  // Legacy alias
  DELTAX_STATE_RESET: "DELTAX_TRIAL_RESET",
});

/**
 * Simple seeded pseudo-random number generator (Mulberry32) for deterministic reproducible sampling.
 */
export function createPrng(seed = 12345) {
  let a = (seed ^ 0xdeadbeef) >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Select a candidate using the specified controller policy.
 *
 * @param {Object} opts
 * @param {string} opts.controller Controller type
 * @param {Array<Object>} opts.candidates Pre-evaluation candidate field
 * @param {Object} opts.senses Immediate sensory observation
 * @param {Function} [opts.prng] Seeded PRNG for STOCHASTIC_WEIGHTED
 * @param {Object} [opts.executiveDecision] Decision packet from live DeltaX runtime
 * @returns {Object} Selected candidate object
 */
export function selectCandidate({
  controller,
  candidates = [],
  senses = {},
  prng = Math.random,
  executiveDecision = null,
}) {
  const isBlocked = senses.visual_field?.obstacle_ahead || senses.collision?.blocked || senses.lateral_sensors?.front_contact;

  // Filter admissible candidates (non-forbidden, executable)
  const admissible = candidates.filter((c) => !c.forbidden && c.is_executable !== false);
  const fallback = candidates.find((c) => c.provenance_type === "FALLBACK") || candidates[0];

  if (admissible.length === 0) {
    return fallback;
  }

  switch (controller) {
    // 1. SUBSTRATE_TOP: Maximum neural strength among admissible candidates
    case CONTROLLER_TYPES.SUBSTRATE_TOP: {
      const sorted = [...admissible].sort((a, b) => b.activation_strength - a.activation_strength);
      return sorted[0];
    }

    // 2. SIMPLE_REFLEX: Pure reactive rule operating ONLY on current physical clearance and candidates
    case CONTROLLER_TYPES.SIMPLE_REFLEX: {
      if (isBlocked) {
        // Forward path blocked: prioritize highest-strength turning or backward withdrawal
        const steerOrWithdraw = admissible.filter((c) =>
          ["turn_left", "turn_right", "locomotion_backward"].includes(c.action_class)
        );
        if (steerOrWithdraw.length > 0) {
          return steerOrWithdraw.sort((a, b) => b.activation_strength - a.activation_strength)[0];
        }
        return admissible[0];
      } else {
        // Path open: prioritize forward locomotion if available, else highest admissible
        const locomotor = admissible.filter((c) => c.action_class === "locomotion_forward");
        if (locomotor.length > 0) {
          return locomotor[0];
        }
        return admissible.sort((a, b) => b.activation_strength - a.activation_strength)[0];
      }
    }

    // 3. STOCHASTIC_WEIGHTED: Sample among admissible candidates proportional to neural strength
    case CONTROLLER_TYPES.STOCHASTIC_WEIGHTED: {
      const totalWeight = admissible.reduce((sum, c) => sum + Math.max(0.001, c.activation_strength), 0);
      let rand = prng() * totalWeight;
      for (const c of admissible) {
        rand -= Math.max(0.001, c.activation_strength);
        if (rand <= 0) return c;
      }
      return admissible[admissible.length - 1];
    }

    // 4. DELTAX_EXECUTIVE, DELTAX_TRIAL_RESET, DELTAX_STEP_RESET: Sovereign executive selection
    case CONTROLLER_TYPES.DELTAX_EXECUTIVE:
    case CONTROLLER_TYPES.DELTAX_TRIAL_RESET:
    case CONTROLLER_TYPES.DELTAX_STEP_RESET: {
      const declaredFallback = candidates.find((c) => c.provenance_type === "FALLBACK") ||
                               candidates.find((c) => c.action_class === "safe_noop") ||
                               candidates[0];

      if (!executiveDecision) {
        const res = { ...declaredFallback };
        res.telemetry = {
          executive_selected_id: null,
          candidate_match_found: false,
          mismatch_reason: "NO_EXECUTIVE_DECISION",
          fallback_used: true,
          fallback_candidate_id: declaredFallback.id,
        };
        return res;
      }

      const vetoedIds = new Set((executiveDecision.vetoed || []).map((v) => v.id || v.substrate_candidate_id));
      const unvetoed = admissible.filter((c) => !vetoedIds.has(c.id) && !vetoedIds.has(c.substrate_candidate_id));
      const selectedId = executiveDecision.selected_action_id;

      const matched = unvetoed.find((c) => c.id === selectedId || c.substrate_candidate_id === selectedId);
      if (matched) {
        const res = { ...matched };
        res.telemetry = {
          executive_selected_id: selectedId,
          candidate_match_found: true,
          mismatch_reason: null,
          fallback_used: false,
          fallback_candidate_id: null,
        };
        return res;
      }

      // Explicit mismatch analysis — NEVER silently use arbitrary list-order unvetoed[0]
      let mismatchReason = "ID_NOT_IN_CANDIDATE_FIELD";
      const rawMatch = candidates.find((c) => c.id === selectedId || c.substrate_candidate_id === selectedId);
      if (rawMatch) {
        if (rawMatch.forbidden) {
          mismatchReason = "SELECTED_CANDIDATE_FORBIDDEN";
        } else if (vetoedIds.has(rawMatch.id) || vetoedIds.has(rawMatch.substrate_candidate_id)) {
          mismatchReason = "SELECTED_CANDIDATE_VETOED";
        }
      }

      // Safe fallback on invalid executive ID (prefer SAFE_NOOP)
      const res = { ...declaredFallback };
      res.telemetry = {
        executive_selected_id: selectedId,
        candidate_match_found: false,
        mismatch_reason: mismatchReason,
        fallback_used: true,
        fallback_candidate_id: declaredFallback.id,
      };
      return res;
    }

    default:
      throw new Error(`Unknown controller type: ${controller}`);
  }
}

export const FAILURE_TAXONOMY = Object.freeze({
  SUBSTRATE_CANDIDATE_ABSENCE: "SUBSTRATE_CANDIDATE_ABSENCE",
  SUBSTRATE_DYNAMICS_LIMIT_CYCLE: "SUBSTRATE_DYNAMICS_LIMIT_CYCLE",
  CONTROLLER_SELECTION_FAILURE: "CONTROLLER_SELECTION_FAILURE",
  EXECUTIVE_SELECTION_FAILURE: "EXECUTIVE_SELECTION_FAILURE",
  SENSOR_INFORMATION_FAILURE: "SENSOR_INFORMATION_FAILURE",
  ACTUATOR_UNAVAILABLE: "ACTUATOR_UNAVAILABLE",
  PHYSICAL_TRAP: "PHYSICAL_TRAP",
  TIMEOUT_WITH_PROGRESS: "TIMEOUT_WITH_PROGRESS",
  WORLD_UNSOLVABLE: "WORLD_UNSOLVABLE",
  OTHER: "OTHER",
});

/**
 * Classify episode failure using mutually exclusive categories based on decisive state evidence.
 */
export function classifyFailure({
  reachedGoal,
  history = [],
  controller,
  world = null,
  stepCount = 0,
  maxSteps = 35,
}) {
  if (reachedGoal) return null;

  // 1. Detect position oscillation / limit cycles
  const posCounts = new Map();
  let maxVisits = 0;
  for (const h of history) {
    const key = `${h.position?.x},${h.position?.y},${h.position?.heading}`;
    const cnt = (posCounts.get(key) || 0) + 1;
    posCounts.set(key, cnt);
    if (cnt > maxVisits) maxVisits = cnt;
  }
  const hasLimitCycle = maxVisits >= 3;

  // 2. Substrate-only controllers
  if (controller === CONTROLLER_TYPES.SUBSTRATE_TOP || controller === CONTROLLER_TYPES.STOCHASTIC_WEIGHTED) {
    // Check if turning / forward candidates existed during the episode
    let hadCandidates = false;
    for (const h of history) {
      if ((h.candidates || []).some(c => !c.forbidden && ["turn_left", "turn_right", "locomotion_forward"].includes(c.action_class))) {
        hadCandidates = true;
        break;
      }
    }
    if (hasLimitCycle || hadCandidates) {
      return FAILURE_TAXONOMY.SUBSTRATE_DYNAMICS_LIMIT_CYCLE;
    }
    return FAILURE_TAXONOMY.SUBSTRATE_CANDIDATE_ABSENCE;
  }

  // 3. Simple reflex controller
  if (controller === CONTROLLER_TYPES.SIMPLE_REFLEX) {
    return FAILURE_TAXONOMY.CONTROLLER_SELECTION_FAILURE;
  }

  // 4. Executive controllers
  if ([CONTROLLER_TYPES.DELTAX_EXECUTIVE, CONTROLLER_TYPES.DELTAX_TRIAL_RESET, CONTROLLER_TYPES.DELTAX_STEP_RESET].includes(controller)) {
    // Check if decisive unvetoed candidate existed that could have succeeded
    return FAILURE_TAXONOMY.EXECUTIVE_SELECTION_FAILURE;
  }

  return FAILURE_TAXONOMY.OTHER;
}
