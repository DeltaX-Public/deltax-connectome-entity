/**
 * candidate_readouts.mjs
 * Implements the three governed candidate readout formulations for Phase IV-B:
 * 1. READOUT_A_CURRENT: Frozen baseline candidate bridge (exhibits Central HALT distortion).
 * 2. READOUT_B_UPSTREAM_REFERENCE: Faithful port of upstream motor.js continuous axes to candidate representation.
 * 3. READOUT_C_INDEPENDENT_AXES: Orthogonal translational and rotational dimensions; halt represents true quiescence.
 */

export const READOUT_MODES = Object.freeze({
  READOUT_A_CURRENT: "READOUT_A_CURRENT",
  READOUT_B_UPSTREAM_REFERENCE: "READOUT_B_UPSTREAM_REFERENCE",
  READOUT_C_INDEPENDENT_AXES: "READOUT_C_INDEPENDENT_AXES",
});

/**
 * 1. READOUT_A_CURRENT: Existing CandidateBridge (Frozen baseline)
 */
export function generateCandidates_A_Current(dnReadouts, tick = 1, scales = {}) {
  const fwdScale = scales.fwdScale ?? 15.0;
  const turnScale = scales.turnScale ?? 20.0;
  const escapeScale = scales.escapeScale ?? 50.0;
  const groomScale = scales.groomScale ?? 40.0;

  const candidates = [];

  // Locomotion Forward
  const fwd = dnReadouts.forward || { weighted_mean: 0, neurons: [], types: [] };
  const fwdStrength = +(1 - Math.exp(-fwd.weighted_mean / fwdScale)).toFixed(3);
  candidates.push({
    id: `cand_fwd_${tick}`,
    substrate_candidate_id: `sub_dn_forward_${tick}`,
    action_class: "locomotion_forward",
    actuator_action: "forward",
    provenance_type: "MEASURED_NEURAL",
    activation_strength: Math.max(0.05, Math.min(1.0, fwdStrength)),
    originating_population: fwd.types,
    originating_neuron_indices: (fwd.neurons || []).map((n) => n.index),
    raw_activity_measure: {
      mean_rate_hz: fwd.mean_rate || 0,
      max_rate_hz: fwd.max_rate || 0,
      weighted_mean_hz: fwd.weighted_mean || 0,
    },
    normalization_method: "1 - exp(-weighted_mean / fwdScale)",
    tick,
    description: "Forward walking drive from descending locomotor command neurons",
  });

  // Halt / Balance (Existing formula)
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

  // Turn Left
  const turnL = dnReadouts.turn_left || { weighted_mean: 0, neurons: [], types: [] };
  const turnLSilenced = (turnL.neurons || []).length > 0 && turnL.neurons.every((n) => n.silenced);
  const turnLStrength = turnLSilenced ? 0 : +(1 - Math.exp(-(turnL.weighted_mean || 0) / turnScale)).toFixed(3);
  candidates.push({
    id: `cand_turn_left_${tick}`,
    substrate_candidate_id: `sub_dn_turn_left_${tick}`,
    action_class: "turn_left",
    actuator_action: "left",
    provenance_type: "MEASURED_NEURAL",
    forbidden: turnLSilenced,
    activation_strength: turnLSilenced ? 0 : Math.max(0.05, Math.min(1.0, turnLStrength)),
    originating_population: turnL.types,
    originating_neuron_indices: (turnL.neurons || []).map((n) => n.index),
    raw_activity_measure: {
      mean_rate_hz: turnL.mean_rate || 0,
      max_rate_hz: turnL.max_rate || 0,
      weighted_mean_hz: turnL.weighted_mean || 0,
      silenced: turnLSilenced,
    },
    normalization_method: "1 - exp(-weighted_mean / turnScale)",
    tick,
    description: "Leftward turning torque driven by ipsilateral steering DNs (DNa02/DNa01/DNp09)",
  });

  // Turn Right
  const turnR = dnReadouts.turn_right || { weighted_mean: 0, neurons: [], types: [] };
  const turnRSilenced = (turnR.neurons || []).length > 0 && turnR.neurons.every((n) => n.silenced);
  const turnRStrength = turnRSilenced ? 0 : +(1 - Math.exp(-(turnR.weighted_mean || 0) / turnScale)).toFixed(3);
  candidates.push({
    id: `cand_turn_right_${tick}`,
    substrate_candidate_id: `sub_dn_turn_right_${tick}`,
    action_class: "turn_right",
    actuator_action: "right",
    provenance_type: "MEASURED_NEURAL",
    forbidden: turnRSilenced,
    activation_strength: turnRSilenced ? 0 : Math.max(0.05, Math.min(1.0, turnRStrength)),
    originating_population: turnR.types,
    originating_neuron_indices: (turnR.neurons || []).map((n) => n.index),
    raw_activity_measure: {
      mean_rate_hz: turnR.mean_rate || 0,
      max_rate_hz: turnR.max_rate || 0,
      weighted_mean_hz: turnR.weighted_mean || 0,
      silenced: turnRSilenced,
    },
    normalization_method: "1 - exp(-weighted_mean / turnScale)",
    tick,
    description: "Rightward turning torque driven by contralateral steering DNs (DNa02/DNa01/DNp09)",
  });

  // Giant Fibre Escape
  const gf = dnReadouts.escape || { mean_rate: 0, neurons: [], types: [] };
  const to = dnReadouts.takeoff || { weighted_mean: 0, neurons: [], types: [] };
  const escapeRate = Math.max(gf.mean_rate || 0, to.weighted_mean || 0);
  const escapeStrength = +(Math.min(1.0, escapeRate / escapeScale)).toFixed(3);
  if (escapeStrength > 0.1 || (gf.neurons || []).length > 0) {
    candidates.push({
      id: `cand_escape_${tick}`,
      substrate_candidate_id: `sub_dn_escape_${tick}`,
      action_class: "giant_fiber_escape",
      actuator_action: "stop",
      provenance_type: "MEASURED_NEURAL",
      activation_strength: Math.max(0.05, escapeStrength),
      originating_population: [...(gf.types || []), ...(to.types || [])],
      originating_neuron_indices: [...(gf.neurons || []), ...(to.neurons || [])].map((n) => n.index),
      raw_activity_measure: {
        giant_fibre_hz: gf.mean_rate || 0,
        takeoff_hz: to.weighted_mean || 0,
      },
      normalization_method: "min(1.0, max(gf_hz, to_hz) / escapeScale)",
      tick,
      description: "Giant fibre escape reflex / ballistic takeoff from looming threat",
    });
  }

  // Grooming
  const groom = dnReadouts.groom || { weighted_mean: 0, neurons: [], types: [] };
  const groomStrength = +(Math.min(1.0, (groom.weighted_mean || 0) / groomScale)).toFixed(3);
  candidates.push({
    id: `cand_groom_${tick}`,
    substrate_candidate_id: `sub_dn_groom_${tick}`,
    action_class: "groom",
    actuator_action: "stop",
    provenance_type: "MEASURED_NEURAL",
    activation_strength: Math.max(0.05, groomStrength),
    originating_population: groom.types || [],
    originating_neuron_indices: (groom.neurons || []).map((n) => n.index),
    raw_activity_measure: {
      mean_rate_hz: groom.mean_rate || 0,
      weighted_mean_hz: groom.weighted_mean || 0,
    },
    normalization_method: "min(1.0, weighted_mean / groomScale)",
    tick,
    description: "Front-leg antennal / head grooming sweep",
  });

  // Safe Fallback
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

/**
 * 2. READOUT_B_UPSTREAM_REFERENCE: Mapped from upstream motor.js
 * - Respects net = fwd - 2*back with 4.0 Hz threshold
 * - Steering based on differential (turnL - turnR) / 25.0
 * - Supports pivot turn when v is low and steering is active
 * - Resting stance represents absence of both translation and turn
 */
export function generateCandidates_B_Upstream(dnReadouts, tick = 1) {
  const fwd = dnReadouts.forward || { weighted_mean: 0, neurons: [], types: [] };
  const back = dnReadouts.backward || { weighted_mean: 0, neurons: [], types: [] };
  const turnL = dnReadouts.turn_left || { weighted_mean: 0, neurons: [], types: [] };
  const turnR = dnReadouts.turn_right || { weighted_mean: 0, neurons: [], types: [] };
  const gf = dnReadouts.escape || { mean_rate: 0, neurons: [], types: [] };
  const to = dnReadouts.takeoff || { weighted_mean: 0, neurons: [], types: [] };
  const groom = dnReadouts.groom || { weighted_mean: 0, neurons: [], types: [] };

  const fwdHz = fwd.weighted_mean || 0;
  const backHz = back.weighted_mean || 0;
  const turnLHz = turnL.weighted_mean || 0;
  const turnRHz = turnR.weighted_mean || 0;
  const groomHz = groom.weighted_mean || 0;

  // Upstream parameters: fwdThreshold = 4, fwdScale = 12, turnScale = 25, backMax = 0.35, groomScale = 40
  const grooming = (groomHz / 40.0 > 0.5) && (groomHz > 1.5 * fwdHz);
  const net = fwdHz - 2.0 * backHz;
  const sat = (x) => 1.0 - Math.exp(-x / 12.0);

  let v = 0;
  if (!grooming) {
    if (net > 4.0) {
      v = sat(net - 4.0);
    } else if (backHz > 4.0) {
      v = -0.35 * sat(backHz - 4.0);
    }
  }

  const turnDiff = turnLHz - turnRHz;
  // Normalized steering command in [-0.6, 0.6]
  const turnCmd = Math.max(-0.6, Math.min(0.6, turnDiff / 25.0));

  const candidates = [];

  // Forward Locomotion Candidate
  const fwdStrength = +(Math.max(0.01, v > 0 ? v : 0.01)).toFixed(3);
  candidates.push({
    id: `cand_fwd_${tick}`,
    substrate_candidate_id: `sub_dn_forward_${tick}`,
    action_class: "locomotion_forward",
    actuator_action: "forward",
    provenance_type: "MEASURED_NEURAL",
    activation_strength: fwdStrength,
    originating_population: fwd.types,
    originating_neuron_indices: (fwd.neurons || []).map((n) => n.index),
    raw_activity_measure: { net_hz: +net.toFixed(2), fwd_hz: fwdHz, back_hz: backHz },
    normalization_method: "upstream_v_sat(net - 4)",
    tick,
    description: "Upstream forward drive: net = fwd - 2*back > 4 Hz",
  });

  // Turn Left Candidate (Ipsilateral differential steering)
  const turnLStrength = turnDiff > 0 ? +(Math.min(1.0, turnDiff / 15.0)).toFixed(3) : 0.01;
  const turnLSilenced = (turnL.neurons || []).length > 0 && turnL.neurons.every((n) => n.silenced);
  candidates.push({
    id: `cand_turn_left_${tick}`,
    substrate_candidate_id: `sub_dn_turn_left_${tick}`,
    action_class: "turn_left",
    actuator_action: "left",
    provenance_type: "MEASURED_NEURAL",
    forbidden: turnLSilenced,
    activation_strength: turnLSilenced ? 0 : Math.max(0.01, turnLStrength),
    originating_population: turnL.types,
    originating_neuron_indices: (turnL.neurons || []).map((n) => n.index),
    raw_activity_measure: { turn_diff_hz: +turnDiff.toFixed(2), left_hz: turnLHz, right_hz: turnRHz },
    normalization_method: "min(1.0, max(0, turnL - turnR) / 15)",
    tick,
    description: "Upstream left steering torque from differential bilateral DN drive",
  });

  // Turn Right Candidate (Contralateral differential steering)
  const turnRStrength = turnDiff < 0 ? +(Math.min(1.0, -turnDiff / 15.0)).toFixed(3) : 0.01;
  const turnRSilenced = (turnR.neurons || []).length > 0 && turnR.neurons.every((n) => n.silenced);
  candidates.push({
    id: `cand_turn_right_${tick}`,
    substrate_candidate_id: `sub_dn_turn_right_${tick}`,
    action_class: "turn_right",
    actuator_action: "right",
    provenance_type: "MEASURED_NEURAL",
    forbidden: turnRSilenced,
    activation_strength: turnRSilenced ? 0 : Math.max(0.01, turnRStrength),
    originating_population: turnR.types,
    originating_neuron_indices: (turnR.neurons || []).map((n) => n.index),
    raw_activity_measure: { turn_diff_hz: +(-turnDiff).toFixed(2), left_hz: turnLHz, right_hz: turnRHz },
    normalization_method: "min(1.0, max(0, turnR - turnL) / 15)",
    tick,
    description: "Upstream right steering torque from differential bilateral DN drive",
  });

  // Resting Stance / Halt: Only when translation AND steering are below motor thresholds
  const maxActive = Math.max(v > 0 ? v : 0, Math.abs(turnCmd) / 0.6);
  const restingStanceStrength = +(Math.max(0.05, 1.0 - maxActive)).toFixed(3);
  candidates.push({
    id: `cand_halt_${tick}`,
    substrate_candidate_id: `sub_dn_halt_${tick}`,
    action_class: "halt",
    actuator_action: "stop",
    provenance_type: "DERIVED_NEURAL",
    activation_strength: restingStanceStrength,
    originating_population: ["VNC_STANCE"],
    originating_neuron_indices: [],
    raw_activity_measure: { translation_v: +v.toFixed(3), steering_turn: +turnCmd.toFixed(3) },
    normalization_method: "max(0.05, 1.0 - max(|v|, |turn|/0.6))",
    tick,
    description: "Upstream resting stance: active only when both translation and steering are quiescent",
  });

  // Grooming
  if (grooming) {
    candidates.push({
      id: `cand_groom_${tick}`,
      substrate_candidate_id: `sub_dn_groom_${tick}`,
      action_class: "groom",
      actuator_action: "stop",
      provenance_type: "MEASURED_NEURAL",
      activation_strength: +(Math.min(1.0, groomHz / 40.0)).toFixed(3),
      originating_population: groom.types || [],
      originating_neuron_indices: (groom.neurons || []).map((n) => n.index),
      raw_activity_measure: { groom_hz: groomHz },
      normalization_method: "min(1.0, groom_hz / 40.0)",
      tick,
      description: "Front-leg grooming pattern",
    });
  }

  // Escape reflex
  const escapeRate = Math.max(gf.mean_rate || 0, to.weighted_mean || 0);
  if (escapeRate > 5.0) {
    candidates.push({
      id: `cand_escape_${tick}`,
      substrate_candidate_id: `sub_dn_escape_${tick}`,
      action_class: "giant_fiber_escape",
      actuator_action: "stop",
      provenance_type: "MEASURED_NEURAL",
      activation_strength: +(Math.min(1.0, escapeRate / 50.0)).toFixed(3),
      originating_population: [...(gf.types || []), ...(to.types || [])],
      originating_neuron_indices: [...(gf.neurons || []), ...(to.neurons || [])].map((n) => n.index),
      raw_activity_measure: { giant_fibre_hz: gf.mean_rate || 0 },
      normalization_method: "min(1.0, escape_rate / 50.0)",
      tick,
      description: "Giant fibre escape hop",
    });
  }

  // Safe Fallback
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
    description: "Declared fallback candidate",
  });

  return candidates;
}

/**
 * 3. READOUT_C_INDEPENDENT_AXES: Orthogonal Translational and Rotational Axes
 * - Forward, backward, left, right, escape, groom are strictly MEASURED_NEURAL
 * - Low forward does NOT imply high halt
 * - Halt is DERIVED_NEURAL, representing quiescent balance: 1 - max(all active measured drives)
 * - Safe noop is strictly FALLBACK
 */
export function generateCandidates_C_IndependentAxes(dnReadouts, tick = 1, scales = {}) {
  // Calibrated to the empirical dynamic ranges of whole-CNS connectome descending populations
  const fwdScale = scales.fwdScale ?? 3.0;
  const turnScale = scales.turnScale ?? 1.5;
  const backScale = scales.backScale ?? 3.0;
  const escapeScale = scales.escapeScale ?? 30.0;
  const groomScale = scales.groomScale ?? 20.0;

  const fwd = dnReadouts.forward || { weighted_mean: 0, neurons: [], types: [] };
  const back = dnReadouts.backward || { weighted_mean: 0, neurons: [], types: [] };
  const turnL = dnReadouts.turn_left || { weighted_mean: 0, neurons: [], types: [] };
  const turnR = dnReadouts.turn_right || { weighted_mean: 0, neurons: [], types: [] };
  const gf = dnReadouts.escape || { mean_rate: 0, neurons: [], types: [] };
  const to = dnReadouts.takeoff || { weighted_mean: 0, neurons: [], types: [] };
  const groom = dnReadouts.groom || { weighted_mean: 0, neurons: [], types: [] };

  const fwdHz = fwd.weighted_mean || 0;
  const backHz = back.weighted_mean || 0;
  const turnLHz = turnL.weighted_mean || 0;
  const turnRHz = turnR.weighted_mean || 0;
  const escapeHz = Math.max(gf.mean_rate || 0, to.weighted_mean || 0);
  const groomHz = groom.weighted_mean || 0;

  // Normalized measured strengths: continuous s = 1 - exp(-rate / scale), zero floor
  const fwdStrength = +(1.0 - Math.exp(-fwdHz / fwdScale)).toFixed(3);
  const backStrength = +(1.0 - Math.exp(-backHz / backScale)).toFixed(3);

  // Steering: differential activation between left and right populations
  const turnLSilenced = (turnL.neurons || []).length > 0 && turnL.neurons.every((n) => n.silenced);
  const turnRSilenced = (turnR.neurons || []).length > 0 && turnR.neurons.every((n) => n.silenced);

  // Bilateral differential drive: net torque from ipsilateral vs contralateral contrast
  const diffL = Math.max(0, turnLHz - turnRHz);
  const diffR = Math.max(0, turnRHz - turnLHz);
  const turnLStrength = turnLSilenced ? 0 : +(1.0 - Math.exp(-diffL / turnScale)).toFixed(3);
  const turnRStrength = turnRSilenced ? 0 : +(1.0 - Math.exp(-diffR / turnScale)).toFixed(3);

  const escapeStrength = +(Math.min(1.0, escapeHz / escapeScale)).toFixed(3);
  const groomStrength = +(Math.min(1.0, groomHz / groomScale)).toFixed(3);

  const candidates = [];

  // 1. Locomotion Forward
  candidates.push({
    id: `cand_fwd_${tick}`,
    substrate_candidate_id: `sub_dn_forward_${tick}`,
    action_class: "locomotion_forward",
    actuator_action: "forward",
    provenance_type: "MEASURED_NEURAL",
    activation_strength: Math.min(1.0, fwdStrength),
    originating_population: fwd.types,
    originating_neuron_indices: (fwd.neurons || []).map((n) => n.index),
    raw_activity_measure: { weighted_mean_hz: fwdHz },
    normalization_method: "1 - exp(-fwd_hz / fwdScale)",
    tick,
    description: "Forward walking drive from locomotor descending neurons",
  });

  // 2. Turn Left
  candidates.push({
    id: `cand_turn_left_${tick}`,
    substrate_candidate_id: `sub_dn_turn_left_${tick}`,
    action_class: "turn_left",
    actuator_action: "left",
    provenance_type: "MEASURED_NEURAL",
    forbidden: turnLSilenced,
    activation_strength: turnLSilenced ? 0 : Math.min(1.0, turnLStrength),
    originating_population: turnL.types,
    originating_neuron_indices: (turnL.neurons || []).map((n) => n.index),
    raw_activity_measure: {
      left_hz: turnLHz,
      right_hz: turnRHz,
      diff_hz: +diffL.toFixed(2),
      silenced: turnLSilenced,
    },
    normalization_method: "1 - exp(-max(0, turnL - turnR) / turnScale)",
    tick,
    description: "Leftward steering torque from net ipsilateral descending drive",
  });

  // 3. Turn Right
  candidates.push({
    id: `cand_turn_right_${tick}`,
    substrate_candidate_id: `sub_dn_turn_right_${tick}`,
    action_class: "turn_right",
    actuator_action: "right",
    provenance_type: "MEASURED_NEURAL",
    forbidden: turnRSilenced,
    activation_strength: turnRSilenced ? 0 : Math.min(1.0, turnRStrength),
    originating_population: turnR.types,
    originating_neuron_indices: (turnR.neurons || []).map((n) => n.index),
    raw_activity_measure: {
      left_hz: turnLHz,
      right_hz: turnRHz,
      diff_hz: +diffR.toFixed(2),
      silenced: turnRSilenced,
    },
    normalization_method: "1 - exp(-max(0, turnR - turnL) / turnScale)",
    tick,
    description: "Rightward steering torque from net contralateral descending drive",
  });

  // 4. Backward Locomotion / Aversive Withdrawal (MDN)
  if (backHz > 0.1) {
    candidates.push({
      id: `cand_backward_${tick}`,
      substrate_candidate_id: `sub_dn_backward_${tick}`,
      action_class: "locomotion_backward",
      actuator_action: "stop",
      provenance_type: "MEASURED_NEURAL",
      activation_strength: Math.min(1.0, backStrength),
      originating_population: back.types || ["MDN"],
      originating_neuron_indices: (back.neurons || []).map((n) => n.index),
      raw_activity_measure: { weighted_mean_hz: backHz },
      normalization_method: "1 - exp(-back_hz / backScale)",
      tick,
      description: "Backward walking command from Moonwalker Descending Neurons (MDN)",
    });
  }

  // 5. Giant Fibre Escape
  if (escapeStrength > 0.05 || (gf.neurons || []).length > 0) {
    candidates.push({
      id: `cand_escape_${tick}`,
      substrate_candidate_id: `sub_dn_escape_${tick}`,
      action_class: "giant_fiber_escape",
      actuator_action: "stop",
      provenance_type: "MEASURED_NEURAL",
      activation_strength: escapeStrength,
      originating_population: [...(gf.types || []), ...(to.types || [])],
      originating_neuron_indices: [...(gf.neurons || []), ...(to.neurons || [])].map((n) => n.index),
      raw_activity_measure: { escape_hz: escapeHz },
      normalization_method: "min(1.0, escape_hz / escapeScale)",
      tick,
      description: "Giant fibre escape reflex",
    });
  }

  // 6. Grooming
  if (groomStrength > 0.05) {
    candidates.push({
      id: `cand_groom_${tick}`,
      substrate_candidate_id: `sub_dn_groom_${tick}`,
      action_class: "groom",
      actuator_action: "stop",
      provenance_type: "MEASURED_NEURAL",
      activation_strength: groomStrength,
      originating_population: groom.types || [],
      originating_neuron_indices: (groom.neurons || []).map((n) => n.index),
      raw_activity_measure: { weighted_mean_hz: groomHz },
      normalization_method: "min(1.0, groom_hz / groomScale)",
      tick,
      description: "Front-leg grooming sweep",
    });
  }

  // 7. Halt / Quiescent Stance (DERIVED_NEURAL)
  // Quiescent stance is active only in the absence of active locomotor/steering commands.
  const maxActiveDrive = Math.max(
    fwdStrength,
    backStrength,
    turnLStrength,
    turnRStrength,
    escapeStrength,
    groomStrength
  );
  // Exponential decay with active motor commands: baseline stance is 0.12 when idle
  const quiescence = +(Math.max(0.005, 0.12 * Math.exp(-maxActiveDrive / 0.15))).toFixed(3);
  candidates.push({
    id: `cand_halt_${tick}`,
    substrate_candidate_id: `sub_dn_halt_${tick}`,
    action_class: "halt",
    actuator_action: "stop",
    provenance_type: "DERIVED_NEURAL",
    activation_strength: quiescence,
    originating_population: ["QUIESCENT_STANCE"],
    originating_neuron_indices: [],
    raw_activity_measure: { max_active_neural_drive: maxActiveDrive },
    normalization_method: "max(0.005, 0.12 * exp(-maxActiveDrive / 0.15))",
    tick,
    description: "Quiescent standing posture: active only when translational, steering, and reflex drives are low",
  });

  // 8. Safe Fallback (FALLBACK)
  candidates.push({
    id: `cand_safe_noop_${tick}`,
    substrate_candidate_id: `sub_fallback_safe_noop_${tick}`,
    action_class: "safe_noop",
    actuator_action: "stop",
    provenance_type: "FALLBACK",
    activation_strength: 0.001,
    originating_population: ["DECLARED_SAFETY_SPEC"],
    originating_neuron_indices: [],
    raw_activity_measure: { fallback_floor: 0.001 },
    normalization_method: "declared_constant_floor",
    tick,
    description: "Declared fallback candidate: zero motor actuation when ordinary candidates are excluded",
  });

  return candidates;
}
