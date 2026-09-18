/**
 * Connectome Candidate Bridge.
 * Transforms measured descending-neuron population activity from the whole-CNS connectome
 * into a bounded field of candidate actions for DeltaX evaluation.
 *
 * PRESERVES STRICT PROVENANCE:
 * Originating neuron populations, neuron indices, raw Hz, and normalization methods
 * are explicitly attached to every emitted candidate.
 *
 * ZERO SEMANTIC SHORTCUTS:
 * Candidate activation strengths are computed purely from biological population readouts.
 */

export class ConnectomeCandidateBridge {
  constructor(opts = {}) {
    this.fwdScale = opts.fwdScale ?? 15.0;
    this.turnScale = opts.turnScale ?? 20.0;
    this.escapeScale = opts.escapeScale ?? 50.0;
    this.groomScale = opts.groomScale ?? 40.0;
  }

  /**
   * Generate candidate action field from connectome descending neuron readouts.
   *
   * @param {Object} dnReadouts Output of ConnectomeRuntime.getDescendingNeuronReadouts()
   * @param {number} tick Integer step / tick sequence
   * @returns {Array<Object>} Array of schema-valid candidate action objects
   */
  generateCandidates(dnReadouts, tick = 1) {
    const candidates = [];

    // 1. Locomotion Forward (DNg100, DNg97, DNp09, DNa05, DNa07, DNp26, DNa01, DNa02)
    const fwd = dnReadouts.forward || { weighted_mean: 0, neurons: [], types: [] };
    const fwdStrength = +(1 - Math.exp(-fwd.weighted_mean / this.fwdScale)).toFixed(3);
    candidates.push({
      id: `cand_fwd_${tick}`,
      substrate_candidate_id: `sub_dn_forward_${tick}`,
      action_class: "locomotion_forward",
      actuator_action: "forward",
      provenance_type: "MEASURED_NEURAL",
      activation_strength: Math.max(0.05, Math.min(1.0, fwdStrength)),
      originating_population: fwd.types,
      originating_neuron_indices: fwd.neurons.map((n) => n.index),
      raw_activity_measure: {
        mean_rate_hz: fwd.mean_rate,
        max_rate_hz: fwd.max_rate,
        weighted_mean_hz: fwd.weighted_mean,
      },
      normalization_method: "1 - exp(-weighted_mean / fwdScale)",
      tick,
      description: "Forward walking drive from descending locomotor command neurons",
    });

    // 2. Halt / Balance (Stopping reflex / Antagonism)
    const haltStrength = +(Math.max(0.1, 1.0 - (fwdStrength * 0.85))).toFixed(3);
    candidates.push({
      id: `cand_halt_${tick}`,
      substrate_candidate_id: `sub_dn_halt_${tick}`,
      action_class: "halt",
      actuator_action: "stop",
      provenance_type: "DERIVED_NEURAL",
      activation_strength: Math.min(1.0, haltStrength),
      originating_population: ["MDN", "DNa02"],
      originating_neuron_indices: (dnReadouts.backward?.neurons || []).map((n) => n.index),
      raw_activity_measure: {
        forward_suppression: +(1.0 - fwdStrength).toFixed(3),
        backward_antagonism: dnReadouts.backward?.weighted_mean || 0,
      },
      normalization_method: "max(0.1, 1.0 - (fwdStrength * 0.85))",
      tick,
      description: "Halt / standing balance posture derived from backward antagonism and forward suppression",
    });

    // 3. Turn Left (DNa02, DNa01, DNp09 - Left Hemisphere)
    const turnL = dnReadouts.turn_left || { weighted_mean: 0, neurons: [], types: [] };
    const turnLStrength = +(1 - Math.exp(-turnL.weighted_mean / this.turnScale)).toFixed(3);
    candidates.push({
      id: `cand_turn_left_${tick}`,
      substrate_candidate_id: `sub_dn_turn_left_${tick}`,
      action_class: "turn_left",
      actuator_action: "left",
      provenance_type: "MEASURED_NEURAL",
      activation_strength: Math.max(0.05, Math.min(1.0, turnLStrength)),
      originating_population: turnL.types,
      originating_neuron_indices: turnL.neurons.map((n) => n.index),
      raw_activity_measure: {
        mean_rate_hz: turnL.mean_rate,
        max_rate_hz: turnL.max_rate,
        weighted_mean_hz: turnL.weighted_mean,
      },
      normalization_method: "1 - exp(-weighted_mean / turnScale)",
      tick,
      description: "Leftward turning torque driven by ipsilateral steering DNs (DNa02/DNa01/DNp09)",
    });

    // 4. Turn Right (DNa02, DNa01, DNp09 - Right Hemisphere)
    const turnR = dnReadouts.turn_right || { weighted_mean: 0, neurons: [], types: [] };
    const turnRStrength = +(1 - Math.exp(-turnR.weighted_mean / this.turnScale)).toFixed(3);
    candidates.push({
      id: `cand_turn_right_${tick}`,
      substrate_candidate_id: `sub_dn_turn_right_${tick}`,
      action_class: "turn_right",
      actuator_action: "right",
      provenance_type: "MEASURED_NEURAL",
      activation_strength: Math.max(0.05, Math.min(1.0, turnRStrength)),
      originating_population: turnR.types,
      originating_neuron_indices: turnR.neurons.map((n) => n.index),
      raw_activity_measure: {
        mean_rate_hz: turnR.mean_rate,
        max_rate_hz: turnR.max_rate,
        weighted_mean_hz: turnR.weighted_mean,
      },
      normalization_method: "1 - exp(-weighted_mean / turnScale)",
      tick,
      description: "Rightward turning torque driven by contralateral steering DNs (DNa02/DNa01/DNp09)",
    });

    // 5. Giant Fibre Escape (DNp01 / DNp02 / DNp04)
    const gf = dnReadouts.escape || { mean_rate: 0, neurons: [], types: [] };
    const to = dnReadouts.takeoff || { weighted_mean: 0, neurons: [], types: [] };
    const escapeRate = Math.max(gf.mean_rate || 0, to.weighted_mean || 0);
    const escapeStrength = +(Math.min(1.0, escapeRate / this.escapeScale)).toFixed(3);
    if (escapeStrength > 0.1 || gf.neurons.length > 0) {
      candidates.push({
        id: `cand_escape_${tick}`,
        substrate_candidate_id: `sub_dn_escape_${tick}`,
        action_class: "giant_fiber_escape",
        actuator_action: "stop",
        provenance_type: "MEASURED_NEURAL",
        activation_strength: Math.max(0.05, escapeStrength),
        originating_population: [...gf.types, ...to.types],
        originating_neuron_indices: [...gf.neurons, ...to.neurons].map((n) => n.index),
        raw_activity_measure: {
          giant_fibre_hz: gf.mean_rate,
          takeoff_hz: to.weighted_mean,
        },
        normalization_method: "min(1.0, max(gf_hz, to_hz) / escapeScale)",
        tick,
        description: "Giant fibre escape reflex / ballistic takeoff from looming threat",
      });
    }

    // 6. Grooming (DNg07, DNg08)
    const groom = dnReadouts.groom || { weighted_mean: 0, neurons: [], types: [] };
    const groomStrength = +(Math.min(1.0, groom.weighted_mean / this.groomScale)).toFixed(3);
    candidates.push({
      id: `cand_groom_${tick}`,
      substrate_candidate_id: `sub_dn_groom_${tick}`,
      action_class: "groom",
      actuator_action: "stop",
      provenance_type: "MEASURED_NEURAL",
      activation_strength: Math.max(0.05, groomStrength),
      originating_population: groom.types,
      originating_neuron_indices: groom.neurons.map((n) => n.index),
      raw_activity_measure: {
        mean_rate_hz: groom.mean_rate,
        weighted_mean_hz: groom.weighted_mean,
      },
      normalization_method: "min(1.0, weighted_mean / groomScale)",
      tick,
      description: "Front-leg antennal / head grooming sweep",
    });

    // 7. Declared Safety Fallback (SAFE_NOOP)
    // Declared in the candidate field before governance; eligible only if ordinary candidates are vetoed
    candidates.push({
      id: `cand_safe_noop_${tick}`,
      substrate_candidate_id: `sub_fallback_safe_noop_${tick}`,
      action_class: "safe_noop",
      actuator_action: "stop",
      provenance_type: "FALLBACK",
      activation_strength: 0.01,
      originating_population: ["DECLARED_SAFETY_SPEC"],
      originating_neuron_indices: [],
      raw_activity_measure: { fallback_floor: 0.01 },
      normalization_method: "declared_constant_floor",
      tick,
      description: "Declared fallback candidate: zero motor actuation when ordinary candidates are excluded",
    });

    return candidates;
  }
}
