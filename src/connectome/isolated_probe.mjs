import { ConnectomeRuntime } from "./runtime.mjs";
import { computeSubthresholdPostsynapticFactor } from "./plasticity_overlay.mjs";
import { generateCandidates_C_IndependentAxes } from "./candidate_readouts.mjs";

const DEFAULT_INTENSITY = 100.0;
const RIGHT_DNA02 = 332;
const LEFT_DNA02 = 130496;
const RIGHT_AN03A008 = 2937;

/**
 * Standardized sensory probe measuring descending readout and internal subthreshold state.
 * STRICT NON-MUTATION GUARANTEE:
 * This probe executes exclusively on an isolated ephemeral clone created from a snapshot.
 * The training runtime's state (rates, input caches, eligibility traces, step counter,
 * sensory drives, and plasticity state) is 100% bit-identical before and after probing.
 *
 * @param {ConnectomeRuntime} trainingRuntime The active training runtime (remains completely untouched)
 * @param {Array<number>|Set<number>} driveSensorIndices Sensor indices to drive
 * @param {Object} [options]
 * @param {number} [options.intensity=100.0] Firing rate drive in Hz
 * @param {number} [options.totalSteps=60] Total simulation steps
 * @param {Array<number>} [options.stimWindow=[11, 35]] Active stimulation window [start, end]
 * @returns {Object} Probe readout metrics
 */
export function runStandardizedIsolatedProbe(
  trainingRuntime,
  driveSensorIndices,
  options = {}
) {
  const intensity = options.intensity ?? DEFAULT_INTENSITY;
  const totalSteps = options.totalSteps ?? 60;
  const stimWindow = options.stimWindow ?? [11, 35];

  // 1. Capture snapshot of training runtime
  const snap = trainingRuntime.snapshot();

  // 2. Instantiate isolated ephemeral clone with plasticity disabled during probe
  const probeRuntime = new ConnectomeRuntime({
    seed: trainingRuntime.seed,
    substepsPerTick: trainingRuntime.substepsPerTick,
    plasticity: false,
  });

  // 3. Restore training state (and learned weights if plasticity was active) onto clone
  probeRuntime.restore(snap);
  if (snap.plasticity && probeRuntime.plasticity) {
    probeRuntime.plasticity.restore(snap.plasticity);
    probeRuntime.plasticity.config.enabled = false; // Never accumulate traces during probes
  } else if (snap.plasticity && !probeRuntime.plasticity) {
    // Clone does not have plasticity overlay, but need weights synchronized
    // Synchronize weights array if snap.plasticity contains modified weights
    if (snap.plasticity.deltaW && snap.plasticity.deltaW.length > 0) {
      for (const [edgeIdx, deltaVal] of snap.plasticity.deltaW) {
        const baseW = probeRuntime.data.weights[edgeIdx];
        const eff = baseW + deltaVal;
        const wasZero = probeRuntime.net.weights[edgeIdx] === 0;
        probeRuntime.net.weights[edgeIdx] = (wasZero && eff < 5) ? 0 : eff;
      }
      probeRuntime.net.recomputeInput();
    }
  }

  // 4. Reset neural activations on the ephemeral clone for clean measurement
  probeRuntime.net.reset();
  probeRuntime.net.ext.fill(0);
  probeRuntime.sensoryDrives.clear();

  const driveMap = new Map();
  const sensorArray = driveSensorIndices instanceof Set ? Array.from(driveSensorIndices) : driveSensorIndices;
  for (const idx of sensorArray) driveMap.set(idx, intensity);

  let sumRightDNa02 = 0;
  let sumLeftDNa02 = 0;
  let sumRightAN03A008 = 0;
  let sumCandRight = 0;
  let sumCandLeft = 0;
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
      sumCandRight += (cands.find((c) => c.action === "TURN_RIGHT")?.confidence || 0);
      sumCandLeft += (cands.find((c) => c.action === "TURN_LEFT")?.confidence || 0);
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
  return {
    right_dna02_rate: +(sumRightDNa02 / denom).toFixed(4),
    left_dna02_rate: +(sumLeftDNa02 / denom).toFixed(4),
    right_an03a008_rate: +(sumRightAN03A008 / denom).toFixed(4),
    cand_right_turn: +(sumCandRight / denom).toFixed(4),
    cand_left_turn: +(sumCandLeft / denom).toFixed(4),
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
  };
}
