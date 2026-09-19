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
  DELTAX_STATE_RESET: "DELTAX_STATE_RESET",
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

    // 4. DELTAX_EXECUTIVE & DELTAX_STATE_RESET: Sovereign executive selection
    case CONTROLLER_TYPES.DELTAX_EXECUTIVE:
    case CONTROLLER_TYPES.DELTAX_STATE_RESET: {
      if (!executiveDecision) {
        // Fallback to top admissible if executive decision unavailable
        return admissible[0];
      }
      const vetoedIds = new Set((executiveDecision.vetoed || []).map((v) => v.id || v.substrate_candidate_id));
      const unvetoed = admissible.filter((c) => !vetoedIds.has(c.id) && !vetoedIds.has(c.substrate_candidate_id));
      const selectedId = executiveDecision.selected_action_id;

      const matched = unvetoed.find((c) => c.id === selectedId || c.substrate_candidate_id === selectedId);
      if (matched) return matched;
      if (unvetoed.length > 0) return unvetoed[0];
      return fallback;
    }

    default:
      throw new Error(`Unknown controller type: ${controller}`);
  }
}
