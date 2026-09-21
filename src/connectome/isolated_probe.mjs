import crypto from "node:crypto";
import { ConnectomeRuntime } from "./runtime.mjs";
import { computeSubthresholdPostsynapticFactor, EFFECTIVE_EDGE_POLICIES } from "./plasticity_overlay.mjs";
import { generateCandidates_C_IndependentAxes } from "./candidate_readouts.mjs";

export const DEFAULT_PROBE_INTENSITY = 180.0;
const RIGHT_DNA02 = 332;
const LEFT_DNA02 = 130496;
const RIGHT_AN03A008 = 2937;

/**
 * Assert canonical candidate schema correctness.
 * Telemetry must conform strictly to documented Phase IV candidate structure:
 * - action_class: string (e.g. "turn_right", "turn_left", "locomotion_forward", "locomotion_backward", "halt")
 * - activation_strength: finite number in [0, 1]
 * - originating_population: Array
 * - originating_neuron_indices: Array
 *
 * @param {Object} cand
 * @throws {Error} If candidate telemetry is missing or malformed
 */
export function assertValidCandidate(cand) {
  if (!cand || typeof cand !== "object") {
    throw new Error(`Malformed candidate telemetry: candidate must be an object, got ${typeof cand}`);
  }
  if (typeof cand.id !== "string" || cand.id.length === 0) {
    throw new Error("Malformed candidate telemetry: missing or invalid 'id'");
  }
  if (typeof cand.action_class !== "string" || cand.action_class.length === 0) {
    throw new Error("Malformed candidate telemetry: missing or invalid 'action_class'");
  }
  if (
    typeof cand.activation_strength !== "number" ||
    !Number.isFinite(cand.activation_strength) ||
    cand.activation_strength < 0 ||
    cand.activation_strength > 1.0001
  ) {
    throw new Error(
      `Malformed candidate telemetry: 'activation_strength' must be a finite number in [0, 1], got ${cand.activation_strength}`
    );
  }
  if (!Array.isArray(cand.originating_population)) {
    throw new Error("Malformed candidate telemetry: missing 'originating_population' array");
  }
  if (!Array.isArray(cand.originating_neuron_indices)) {
    throw new Error("Malformed candidate telemetry: missing 'originating_neuron_indices' array");
  }
  return true;
}

/**
 * Extract verified candidate telemetry for a given action class.
 * Keeps legitimate zero activity distinct from malformed or absent telemetry.
 *
 * @param {Array<Object>} candidates
 * @param {string} targetActionClass
 * @returns {{ present: boolean, activation_strength: number, candidate: Object|null }}
 */
export function extractCandidateTelemetry(candidates, targetActionClass) {
  if (!Array.isArray(candidates)) {
    throw new Error(`Malformed candidates collection: expected Array, got ${typeof candidates}`);
  }
  for (const cand of candidates) {
    assertValidCandidate(cand);
  }
  const match = candidates.find((c) => c.action_class === targetActionClass);
  if (!match) {
    return { present: false, activation_strength: 0.0, candidate: null };
  }
  return { present: true, activation_strength: match.activation_strength, candidate: match };
}

/**
 * Standardized sensory probe measuring descending readout and internal subthreshold state.
 * STRICT NON-MUTATION AND FIDELITY GUARANTEES:
 * 1. Probes execute exclusively on an isolated ephemeral clone created via `trainingRuntime.cloneForProbe()`.
 * 2. Active synaptic weights are preserved in floating-point representation (Float32Array), avoiding integer truncation.
 * 3. Declared effectiveEdgePolicy (Model A vs Model B) is preserved and respected.
 * 4. Training runtime state (r, inp, u, A, out, step counter, sensory drives, plasticity state) is 100% bit-identical
 *    before and after probing.
 *
 * Distinguishes:
 * A. "FRESH_EVOKED" (default): Fresh-state evoked-response probe; deliberately resets neural state.
 * B. "CONTINUATION": Continuation probe; preserves complete dynamical state.
 *
 * @param {ConnectomeRuntime} trainingRuntime The active training runtime (remains completely untouched)
 * @param {Array<number>|Set<number>} driveSensorIndices Sensor indices to drive
 * @param {Object} [options]
 * @param {"FRESH_EVOKED"|"CONTINUATION"} [options.probeType="FRESH_EVOKED"] Probe type
 * @param {number} [options.intensity=180.0] Firing rate drive in Hz
 * @param {number} [options.totalSteps=60] Total simulation steps
 * @param {Array<number>} [options.stimWindow=[11, 35]] Active stimulation window [start, end]
 * @returns {Object} Probe readout metrics
 */
export function runStandardizedIsolatedProbe(
  trainingRuntime,
  driveSensorIndices,
  options = {}
) {
  const intensity = options.intensity ?? DEFAULT_PROBE_INTENSITY;
  const totalSteps = options.totalSteps ?? 60;
  const stimWindow = options.stimWindow ?? [11, 35];
  const probeType = options.probeType ?? "FRESH_EVOKED";

  // 1. Create faithful isolated clone with learning disabled
  const probeRuntime = trainingRuntime.cloneForProbe({
    probeType,
    disablePlasticity: true,
  });

  // 2. Configure sensory stimulation drive map
  const driveMap = new Map();
  const sensorArray = driveSensorIndices instanceof Set ? Array.from(driveSensorIndices) : driveSensorIndices;
  for (const idx of sensorArray) {
    driveMap.set(idx, intensity);
  }

  let sumRightDNa02 = 0;
  let sumLeftDNa02 = 0;
  let sumRightAN03A008 = 0;
  let sumCandRight = 0;
  let sumCandLeft = 0;
  let sumCandFwd = 0;
  let sumCandBwd = 0;
  let sumCandHalt = 0;
  let sumFwdRate = 0;
  let sumBwdRate = 0;
  let sumWholeNetRate = 0;
  let latencyStep = null;
  let count = 0;

  let sumAn03Inp = 0;
  let sumAn03Theta = 0;
  let sumAn03Psi = 0;
  let sumDna02Inp = 0;
  let sumDna02Theta = 0;
  let sumDna02Psi = 0;

  for (let step = 1; step <= totalSteps; step++) {
    if (step >= stimWindow[0] && step <= stimWindow[1]) {
      probeRuntime.setSensoryDrives(driveMap);
    } else {
      probeRuntime.sensoryDrives.clear();
      probeRuntime.net.ext.fill(0);
    }

    probeRuntime.step(1);

    if (step >= stimWindow[0] && step <= stimWindow[1]) {
      const dn = probeRuntime.getDescendingNeuronReadouts();
      const cands = generateCandidates_C_IndependentAxes(dn, step);

      // Verify schema and extract typed candidate activations
      const rightTurnTel = extractCandidateTelemetry(cands, "turn_right");
      const leftTurnTel = extractCandidateTelemetry(cands, "turn_left");
      const fwdTel = extractCandidateTelemetry(cands, "locomotion_forward");
      const bwdTel = extractCandidateTelemetry(cands, "locomotion_backward");
      const haltTel = extractCandidateTelemetry(cands, "halt");

      const rR = probeRuntime.net.r[RIGHT_DNA02] || 0.0;
      const rL = probeRuntime.net.r[LEFT_DNA02] || 0.0;
      const rAN = probeRuntime.net.r[RIGHT_AN03A008] || 0.0;

      const anInp = probeRuntime.net.inp[RIGHT_AN03A008] || 0.0;
      const anTheta = probeRuntime.net.theta[RIGHT_AN03A008] || 0.0;
      const anPsi = computeSubthresholdPostsynapticFactor(anInp, anTheta, rAN);

      const dna02Inp = probeRuntime.net.inp[RIGHT_DNA02] || 0.0;
      const dna02Theta = probeRuntime.net.theta[RIGHT_DNA02] || 0.0;
      const dna02Psi = computeSubthresholdPostsynapticFactor(dna02Inp, dna02Theta, rR);

      if (rR > 0.05 && latencyStep === null) {
        latencyStep = step - stimWindow[0] + 1;
      }

      sumRightDNa02 += rR;
      sumLeftDNa02 += rL;
      sumRightAN03A008 += rAN;
      sumCandRight += rightTurnTel.activation_strength;
      sumCandLeft += leftTurnTel.activation_strength;
      sumCandFwd += fwdTel.activation_strength;
      sumCandBwd += bwdTel.activation_strength;
      sumCandHalt += haltTel.activation_strength;

      sumFwdRate += (dn.forward?.totalRate || 0);
      sumBwdRate += (dn.backward?.totalRate || 0);

      let netR = 0;
      for (let i = 0; i < probeRuntime.N; i++) netR += probeRuntime.net.r[i];
      sumWholeNetRate += (netR / probeRuntime.N);

      sumAn03Inp += anInp;
      sumAn03Theta += anTheta;
      sumAn03Psi += anPsi;
      sumDna02Inp += dna02Inp;
      sumDna02Theta += dna02Theta;
      sumDna02Psi += dna02Psi;

      count++;
    }
  }

  const denom = Math.max(1, count);
  const weightBuffer = Buffer.from(
    probeRuntime.net.weights.buffer,
    probeRuntime.net.weights.byteOffset,
    probeRuntime.net.weights.byteLength
  );
  const weightHash = crypto.createHash("sha256").update(weightBuffer).digest("hex");

  return {
    probe_type: probeType,
    intensity_hz: intensity,
    dt_ms: probeRuntime.net.p.dt,
    stim_window: stimWindow,
    measurement_window: stimWindow,
    effective_edge_policy: probeRuntime.plasticity ? probeRuntime.plasticity.effectiveEdgePolicy : "NONE",
    right_dna02_rate: +(sumRightDNa02 / denom).toFixed(4),
    left_dna02_rate: +(sumLeftDNa02 / denom).toFixed(4),
    right_an03a008_rate: +(sumRightAN03A008 / denom).toFixed(4),
    turn_right_strength: +(sumCandRight / denom).toFixed(4),
    turn_left_strength: +(sumCandLeft / denom).toFixed(4),
    forward_strength: +(sumCandFwd / denom).toFixed(4),
    backward_strength: +(sumCandBwd / denom).toFixed(4),
    halt_strength: +(sumCandHalt / denom).toFixed(4),
    latency_step: latencyStep,
    forward_rate: +(sumFwdRate / denom).toFixed(4),
    backward_rate: +(sumBwdRate / denom).toFixed(4),
    whole_net_rate: +(sumWholeNetRate / denom).toFixed(4),
    an03a008_inp: +(sumAn03Inp / denom).toFixed(4),
    an03a008_theta: +(sumAn03Theta / denom).toFixed(4),
    an03a008_psi: +(sumAn03Psi / denom).toFixed(4),
    dna02_inp: +(sumDna02Inp / denom).toFixed(4),
    dna02_theta: +(sumDna02Theta / denom).toFixed(4),
    dna02_psi: +(sumDna02Psi / denom).toFixed(4),
    active_coupling_budget: probeRuntime.plasticity ? +probeRuntime.plasticity.getActiveCouplingBudget().toFixed(4) : 0.0,
    stored_efficacy_budget: probeRuntime.plasticity ? +probeRuntime.plasticity.getStoredEfficacyBudget().toFixed(4) : 0.0,
    revived_edge_count: probeRuntime.plasticity ? probeRuntime.plasticity.getActivatedEdgeCount() : 0,
    active_weights_hash: weightHash,
  };
}
