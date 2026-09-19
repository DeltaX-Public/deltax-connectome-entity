/**
 * Learning-Signal and Consequence Interface (Phase IV-D Foundation).
 *
 * Enforces strict information boundaries between executive policy, physical consequences,
 * and synaptic plasticity:
 *
 * 1. Narrow Modulatory Interface:
 *    g_t in [-1.0, 1.0] or discrete { HOLD: 0.0, REINFORCE: +1.0, SUPPRESS: -1.0 }.
 *
 * 2. Zero Policy Leakage:
 *    Signals MUST NOT encode target neuron IDs, synapse IDs, turn directions,
 *    action labels (e.g. "turn right", "left"), maze route coordinates, or target weights.
 *
 * 3. Physical Consequence Channels:
 *    Consequences are strictly grounded in physical body metrics (collision, noxious stimulation,
 *    energy depletion, spatial clearance, physical progress).
 */

export const DISCRETE_MODULATORY_SIGNALS = Object.freeze({
  HOLD: 0.0,
  REINFORCE: 1.0,
  SUPPRESS: -1.0,
});

/**
 * Forbidden semantic properties that must never appear in a learning signal packet.
 */
export const FORBIDDEN_POLICY_FIELDS = Object.freeze([
  "target_neuron_id",
  "target_neuron",
  "target_neurons",
  "synapse_id",
  "edge_id",
  "desired_direction",
  "turn_direction",
  "turn_right",
  "turn_left",
  "forward",
  "action_label",
  "action",
  "route_coordinates",
  "maze_solution",
  "target_weight",
  "target_weights",
  "policy",
  "steer_action",
  "intended_direction",
]);

/**
 * Validates that a learning signal object or value is strictly scalar and free of policy leakage.
 * @param {number|string|Object} signal
 * @returns {number} Normalized scalar in [-1.0, 1.0]
 */
export function validateLearningSignal(signal) {
  if (typeof signal === "number") {
    if (!Number.isFinite(signal)) {
      throw new Error(`Invalid non-finite learning signal: ${signal}`);
    }
    return Math.max(-1.0, Math.min(1.0, signal));
  }

  if (typeof signal === "string") {
    const upper = signal.toUpperCase().trim();
    if (upper in DISCRETE_MODULATORY_SIGNALS) {
      return DISCRETE_MODULATORY_SIGNALS[upper];
    }
    throw new Error(`Unrecognized discrete learning signal: "${signal}". Expected HOLD, REINFORCE, or SUPPRESS.`);
  }

  if (typeof signal === "object" && signal !== null) {
    // Check for forbidden semantic leakage
    for (const forbidden of FORBIDDEN_POLICY_FIELDS) {
      if (forbidden in signal) {
        throw new Error(`Policy leakage violation: forbidden property "${forbidden}" detected in learning signal.`);
      }
    }

    if (typeof signal.scalar === "number") {
      return Math.max(-1.0, Math.min(1.0, signal.scalar));
    }
    if (typeof signal.modulatory_signal === "number") {
      return Math.max(-1.0, Math.min(1.0, signal.modulatory_signal));
    }
    if (typeof signal.type === "string" && signal.type.toUpperCase() in DISCRETE_MODULATORY_SIGNALS) {
      return DISCRETE_MODULATORY_SIGNALS[signal.type.toUpperCase()];
    }
  }

  throw new Error(`Invalid learning signal specification: ${JSON.stringify(signal)}`);
}

/**
 * Generic physical consequence channels.
 * Translates embodied sensations into a scalar modulatory drive without policy directionality.
 */
export class ConsequenceChannels {
  constructor({
    collisionPenalty = 1.0,
    noxiousPenalty = 0.8,
    energyPenalty = 0.05,
    clearanceReward = 0.5,
    progressReward = 0.7,
  } = {}) {
    this.collisionPenalty = collisionPenalty;
    this.noxiousPenalty = noxiousPenalty;
    this.energyPenalty = energyPenalty;
    this.clearanceReward = clearanceReward;
    this.progressReward = progressReward;
  }

  /**
   * Derive a scalar modulatory signal g_t in [-1, 1] purely from physical consequences.
   * @param {Object} metrics
   * @param {number} [metrics.collision] Collision count or contact intensity [0, 1]
   * @param {number} [metrics.noxious_exposure] Aversive sensory stimulation level [0, 1]
   * @param {number} [metrics.energy_consumed] Delta energy consumed
   * @param {number} [metrics.clearance] Local clearance distance achieved
   * @param {number} [metrics.progress] Scalar progress toward goal [-1, 1]
   * @returns {number} g_t in [-1, 1]
   */
  evaluate({
    collision = 0,
    noxious_exposure = 0,
    energy_consumed = 0,
    clearance = 0,
    progress = 0,
  } = {}) {
    let drive = 0.0;

    // Aversive consequences drive suppression
    if (collision > 0) {
      drive -= this.collisionPenalty * Math.min(1.0, collision);
    }
    if (noxious_exposure > 0) {
      drive -= this.noxiousPenalty * Math.min(1.0, noxious_exposure);
    }
    if (energy_consumed > 0) {
      drive -= this.energyPenalty * Math.min(2.0, energy_consumed);
    }

    // Beneficial physical progress drives reinforcement
    if (clearance > 0) {
      drive += this.clearanceReward * Math.min(1.0, clearance);
    }
    if (progress !== 0) {
      drive += this.progressReward * Math.max(-1.0, Math.min(1.0, progress));
    }

    // Clamp strictly to [-1.0, 1.0]
    return Math.max(-1.0, Math.min(1.0, drive));
  }
}
