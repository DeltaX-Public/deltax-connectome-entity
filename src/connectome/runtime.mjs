/**
 * Connectome Neural Runtime.
 * Direct interface to the Janelia fruit fly connectome (165,122 neurons, 10.5M synapses).
 * Executes biological recurrent firing-rate dynamics, sensory injection, population readouts,
 * snapshot/restore for causal branching, and targeted neural population silencing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const UPSTREAM = path.resolve(ROOT, "upstream", "fly-brain");

// Import upstream connectome components
const { loadAll } = await import(path.join(UPSTREAM, "scripts", "lib_node.mjs"));
const { RateNetwork, RATE_DEFAULTS } = await import(path.join(UPSTREAM, "src", "ratenet.js"));
const { DN_ROLES } = await import(path.join(UPSTREAM, "src", "sim", "motor.js"));
import { PlasticityOverlay, PLASTICITY_RULES } from "./plasticity_overlay.mjs";

export class ConnectomeRuntime {
  constructor(opts = {}) {
    this.opts = opts;
    this.seed = opts.seed ?? 42;
    this.substepsPerTick = opts.substepsPerTick ?? 10; // 10 ms biological simulation per step

    // Change working directory context temporarily if needed to load data
    const origCwd = process.cwd();
    process.chdir(UPSTREAM);
    try {
      this.data = loadAll();
    } finally {
      process.chdir(origCwd);
    }

    this.N = this.data.N;
    this.E = this.data.E;

    // Neuron size data
    const sizePath = path.join(UPSTREAM, "public", "data", "neuron_size.bin");
    this.size = fs.existsSync(sizePath)
      ? new Float32Array(fs.readFileSync(sizePath).buffer.slice(0))
      : null;

    // Initialize RateNetwork
    this.net = new RateNetwork(
      this.N,
      this.data.indptr,
      this.data.indices,
      this.data.weights,
      this.data.nt,
      this.size,
      { seed: this.seed, ...opts.rateParams }
    );

    // If plasticity is enabled, ensure this.net.weights is a Float32Array so fractional efficacy multipliers are preserved
    if (opts.plasticity && !(this.net.weights instanceof Float32Array)) {
      this.net.weights = new Float32Array(this.net.weights);
    }

    // Optional Phase IV-D Plasticity Overlay (default: null / disabled)
    this.plasticity = opts.plasticity
      ? new PlasticityOverlay({
          N: this.N,
          E: this.E,
          indptr: this.data.indptr,
          indices: this.data.indices,
          baseSynapseCounts: this.data.weights.slice(),
          netWeights: this.net.weights,
          netInp: this.net.inp,
          netTheta: this.net.theta,
          net: this.net,
          config: opts.plasticity.config ? { ...opts.plasticity, ...opts.plasticity.config } : opts.plasticity,
          eligibleEdgeMask: opts.plasticity.eligibleEdgeMask,
        })
      : null;

    // Map DN populations by role
    this.dnPopulations = this._buildDNMap();

    // Track active perturbations
    this.silencedNeurons = new Set();
    this.excitedNeurons = new Map(); // id -> rate_hz
    this.sensoryDrives = new Map();  // id -> rate_hz
  }

  _buildDNMap() {
    const byType = (t, s) => this.data.byType(t, s);
    const pop = (roles, s) =>
      Object.entries(roles).flatMap(([t, w]) => byType(t, s).map((i) => ({ index: i, type: t, weight: w })));

    return {
      forward: pop(DN_ROLES.forward),
      backward: pop(DN_ROLES.backward),
      turn_left: pop(DN_ROLES.turn, 1),
      turn_right: pop(DN_ROLES.turn, 2),
      groom: pop(DN_ROLES.groom),
      escape: pop(DN_ROLES.escape),
      takeoff: pop(DN_ROLES.takeoff),
      courtP: pop(DN_ROLES.courtP),
      courtDN: pop(DN_ROLES.courtDN),
    };
  }

  /**
   * Set sensory drive firing rates for specific neuron indices.
   * @param {Map<number, number> | Array<[number, number]> | Object} drives Map of neuronIndex -> rateHz
   */
  setSensoryDrives(drives) {
    this.sensoryDrives.clear();
    const entries = drives instanceof Map
      ? drives.entries()
      : Array.isArray(drives)
      ? drives
      : Object.entries(drives).map(([k, v]) => [Number(k), v]);

    for (const [idx, hz] of entries) {
      if (idx >= 0 && idx < this.N) {
        this.sensoryDrives.set(idx, hz);
      }
    }
  }

  /**
   * Step the connectome recurrent network forward.
   * @param {number} numSubsteps Number of 1ms simulation substeps
   */
  step(numSubsteps = this.substepsPerTick) {
    // Apply sensory drives
    for (const [idx, hz] of this.sensoryDrives.entries()) {
      if (!this.silencedNeurons.has(idx)) {
        this.net.setRate([idx], hz);
      }
    }

    // Apply excited population boosts
    for (const [idx, hz] of this.excitedNeurons.entries()) {
      if (!this.silencedNeurons.has(idx)) {
        this.net.setRate([idx], hz);
      }
    }

    // Ensure silenced neurons have 0 rate and silenced mask
    for (const idx of this.silencedNeurons) {
      this.net.silenced[idx] = 1;
      this.net.r[idx] = 0;
      this.net.ext[idx] = 0;
    }

    let activeTotal = 0;
    for (let s = 0; s < numSubsteps; s++) {
      activeTotal += this.net.step();
    }

    // Update eligibility traces if plasticity is active
    if (this.plasticity && this.plasticity.config.enabled) {
      this.plasticity.updateEligibility(this.net.r, this.net.inp, this.net.theta);
    }

    return {
      tick: Math.round(this.net.t / this.substepsPerTick),
      sim_time_ms: this.net.t,
      mean_active_neurons: activeTotal / numSubsteps,
    };
  }

  /**
   * Read out descending neuron population metrics.
   */
  getDescendingNeuronReadouts() {
    const readouts = {};

    for (const [role, neurons] of Object.entries(this.dnPopulations)) {
      if (neurons.length === 0) {
        readouts[role] = { mean_rate: 0, max_rate: 0, weighted_mean: 0, count: 0, neurons: [] };
        continue;
      }

      let sum = 0;
      let maxRate = 0;
      let weightedSum = 0;
      let weightSum = 0;
      const neuronDetails = [];

      for (const n of neurons) {
        const rate = this.net.r[n.index];
        sum += rate;
        weightedSum += rate * n.weight;
        weightSum += n.weight;
        if (rate > maxRate) maxRate = rate;

        neuronDetails.push({
          index: n.index,
          type: n.type,
          weight: n.weight,
          rate_hz: +rate.toFixed(2),
          silenced: this.silencedNeurons.has(n.index),
        });
      }

      const allSilenced = neurons.length > 0 && neurons.every((n) => this.silencedNeurons.has(n.index));

      readouts[role] = {
        mean_rate: +(sum / neurons.length).toFixed(3),
        max_rate: +maxRate.toFixed(3),
        weighted_mean: +(weightSum > 0 ? weightedSum / weightSum : 0).toFixed(3),
        count: neurons.length,
        neurons: neuronDetails,
        types: [...new Set(neurons.map((n) => n.type))],
        all_silenced: allSilenced,
      };
    }

    return readouts;
  }

  /**
   * Optogenetic / synaptic silencing of specific neurons or populations.
   * @param {number[] | string} targets Neuron indices or population type name (e.g. "DNa02", "DNp01")
   */
  silence(targets) {
    let indices = [];
    if (typeof targets === "number") {
      indices = [targets];
    } else if (typeof targets === "string") {
      indices = this.data.byType(targets, 0);
    } else if (Array.isArray(targets)) {
      indices = targets.flatMap((t) => (typeof t === "number" ? [t] : typeof t === "string" ? this.data.byType(t, 0) : []));
    }

    for (const i of indices) {
      this.silencedNeurons.add(i);
      this.net.silenced[i] = 1;
      this.net.r[i] = 0;
      this.net.ext[i] = 0;
    }
    return { silenced_count: indices.length, target_indices: indices };
  }

  /**
   * Clear all neural silencing perturbations.
   */
  clearSilencing() {
    for (const i of this.silencedNeurons) {
      this.net.silenced[i] = 0;
    }
    this.silencedNeurons.clear();
  }

  /**
   * Excite target neurons with external drive current.
   */
  excite(targets, rateHz = 100) {
    let indices = [];
    if (typeof targets === "number") {
      indices = [targets];
    } else if (typeof targets === "string") {
      indices = this.data.byType(targets, 0);
    } else if (Array.isArray(targets)) {
      indices = targets.flatMap((t) => (typeof t === "number" ? [t] : typeof t === "string" ? this.data.byType(t, 0) : []));
    }

    for (const i of indices) {
      this.excitedNeurons.set(i, rateHz);
    }
    return { excited_count: indices.length, target_indices: indices, rate_hz: rateHz };
  }

  /**
   * Complete bit-exact snapshot of the connectome state.
   */
  snapshot() {
    return {
      schema: "connectome.runtime.snapshot.v1",
      seed: this.seed,
      t: this.net.t,
      steps: this.net._steps,
      r: Array.from(this.net.r),
      inp: Array.from(this.net.inp),
      ext: Array.from(this.net.ext),
      trace: Array.from(this.net.trace),
      spikeCount: Array.from(this.net.spikeCount),
      A: Array.from(this.net.A),
      u: Array.from(this.net.u),
      out: Array.from(this.net.out),
      silenced: Array.from(this.silencedNeurons),
      excited: Array.from(this.excitedNeurons.entries()),
      sensoryDrives: Array.from(this.sensoryDrives.entries()),
      rateParams: { ...this.net.p },
      plasticity: this.plasticity ? this.plasticity.snapshot() : null,
    };
  }

  /**
   * Restore bit-exact state from snapshot.
   */
  restore(snap) {
    if (!snap || typeof snap !== "object" || snap.schema !== "connectome.runtime.snapshot.v1") {
      throw new Error(`Invalid snapshot schema: ${snap?.schema}`);
    }
    if (!snap.r || snap.r.length !== this.N) {
      throw new Error(`Snapshot dimension mismatch: expected N=${this.N}, got ${snap.r?.length}`);
    }
    this.net.t = snap.t;
    if (snap.steps !== undefined) {
      this.net._steps = snap.steps;
    }
    this.net.r.set(snap.r);
    this.net.inp.set(snap.inp);
    this.net.ext.set(snap.ext);
    this.net.trace.set(snap.trace);
    if (snap.spikeCount && this.net.spikeCount) {
      this.net.spikeCount.set(snap.spikeCount);
    }
    this.net.A.set(snap.A);
    this.net.u.set(snap.u);
    this.net.out.set(snap.out);

    this.clearSilencing();
    if (snap.silenced) {
      for (const i of snap.silenced) {
        this.silence([i]);
      }
    }

    this.excitedNeurons.clear();
    if (snap.excited) {
      for (const [i, hz] of snap.excited) {
        this.excitedNeurons.set(i, hz);
      }
    }

    this.sensoryDrives.clear();
    if (snap.sensoryDrives) {
      for (const [i, hz] of snap.sensoryDrives) {
        this.sensoryDrives.set(i, hz);
      }
    }

    if (snap.plasticity && this.plasticity) {
      this.plasticity.restore(snap.plasticity);
    }
    this.net.recomputeInput();

    return true;
  }

  /**
   * Create an exact, faithful clone of this runtime for probing.
   * Preserves:
   * - Exact active weights as Float32Array (no fractional weight truncation).
   * - Effective edge policy and eligible edge mask.
   * - Resolved neuron parameters (a, theta, tau, rmax, preFactor, sizeScale, silenced, sensory, p).
   * - Optogenetic silencing and active neural perturbations.
   *
   * Distinguishes:
   * A. "FRESH_EVOKED": Deliberately resets neural rates, inputs, drives, and steps for evoked-response stimulus.
   * B. "CONTINUATION": Preserves complete dynamical state (r, inp, u, A, out, t, _steps, sensoryDrives).
   *
   * @param {Object} [options]
   * @param {"FRESH_EVOKED"|"CONTINUATION"} [options.probeType="FRESH_EVOKED"]
   * @param {boolean} [options.disablePlasticity=true] Whether to disable learning during probe
   * @returns {ConnectomeRuntime} Faithful isolated clone
   */
  cloneForProbe({ probeType = "FRESH_EVOKED", disablePlasticity = true } = {}) {
    if (probeType !== "FRESH_EVOKED" && probeType !== "CONTINUATION") {
      throw new Error(`Invalid probeType: '${probeType}'. Must be 'FRESH_EVOKED' or 'CONTINUATION'.`);
    }

    // 1. Initialize clone with exact rateParams
    const clone = new ConnectomeRuntime({
      seed: this.seed,
      substepsPerTick: this.substepsPerTick,
      rateParams: { ...this.net.p },
      plasticity: this.plasticity
        ? {
            config: {
              ...this.plasticity.config,
              enabled: !disablePlasticity,
              rule: disablePlasticity ? PLASTICITY_RULES.PLASTICITY_NONE : this.plasticity.config.rule,
            },
            eligibleEdgeMask: this.plasticity.eligibleEdgeMask
              ? new Set(this.plasticity.eligibleEdgeMask)
              : null,
          }
        : false,
    });

    // 2. Ensure clone active weights are Float32Array and exact copy of active weights
    if (!(clone.net.weights instanceof Float32Array)) {
      clone.net.weights = new Float32Array(this.net.weights.length);
    }
    clone.net.weights.set(this.net.weights);

    // 3. Copy resolved neuron parameters
    clone.net.a.set(this.net.a);
    clone.net.theta.set(this.net.theta);
    clone.net.tau.set(this.net.tau);
    clone.net.rmax.set(this.net.rmax);
    clone.net.preFactor.set(this.net.preFactor);
    clone.net.sizeScale.set(this.net.sizeScale);
    clone.net.silenced.set(this.net.silenced);
    clone.net.sensory.set(this.net.sensory);

    // 4. Synchronize plasticity overlay on clone if present
    if (this.plasticity && clone.plasticity) {
      clone.plasticity.effectiveEdgePolicy = this.plasticity.effectiveEdgePolicy;
      for (const [k, v] of this.plasticity.deltaW.entries()) {
        clone.plasticity.deltaW.set(k, v);
      }
      for (const [k, v] of this.plasticity.alpha.entries()) {
        clone.plasticity.alpha.set(k, v);
      }
      if (probeType === "CONTINUATION") {
        for (const [k, v] of this.plasticity.eligibilityTraces.entries()) {
          clone.plasticity.eligibilityTraces.set(k, v);
        }
      } else {
        clone.plasticity.eligibilityTraces.clear();
      }
      clone.plasticity.verifyBaseImmutability();
    }

    // 5. Apply state according to declared probe type
    clone.clearSilencing();
    for (const i of this.silencedNeurons) {
      clone.silence([i]);
    }

    if (probeType === "FRESH_EVOKED") {
      clone.net.reset();
      clone.net.ext.fill(0);
      clone.sensoryDrives.clear();
      clone.excitedNeurons.clear();
      clone.net._steps = 0;
      clone.net.recomputeInput();
    } else {
      // CONTINUATION: complete state preservation
      clone.net.t = this.net.t;
      clone.net._steps = this.net._steps;
      clone.net.r.set(this.net.r);
      clone.net.inp.set(this.net.inp);
      clone.net.ext.set(this.net.ext);
      clone.net.trace.set(this.net.trace);
      clone.net.spikeCount.set(this.net.spikeCount);
      clone.net.A.set(this.net.A);
      clone.net.u.set(this.net.u);
      clone.net.out.set(this.net.out);
      clone.sensoryDrives = new Map(this.sensoryDrives);
      clone.excitedNeurons = new Map(this.excitedNeurons);
    }

    return clone;
  }

  /**
   * Causal Counterfactual Branching for Plasticity (Phase IV-D).
   * Supports branches:
   *   BRANCH_A_LEARNED_INTACT: Full restore including ΔW and eligibility.
   *   BRANCH_B_DELTA_W_RESET: Resets ΔW to zero, testing behavior without weight modifications.
   *   BRANCH_C_ELIGIBILITY_RESET_ONLY: Retains ΔW but clears eligibility traces.
   *   BRANCH_D_EXECUTIVE_RESET_DELTA_W_RETAINED: Restores connectome with ΔW intact, flags executive reset.
   *   BRANCH_E_SHAM_RESET: Restores connectome with eligibility traces zeroed as a sham control.
   *
   * @param {string} branchType
   * @param {Object} snap Snapshot object
   */
  createCounterfactualBranch(branchType, snap = null) {
    if (snap) {
      this.restore(snap);
    }
    if (!this.plasticity) {
      return { branch: branchType, deltaW_active: false };
    }

    switch (branchType) {
      case "BRANCH_A_LEARNED_INTACT":
        // Full restore intact
        break;
      case "BRANCH_B_DELTA_W_RESET":
        this.plasticity.reset();
        break;
      case "BRANCH_C_ELIGIBILITY_RESET_ONLY":
        this.plasticity.resetEligibilityOnly();
        break;
      case "BRANCH_D_EXECUTIVE_RESET_DELTA_W_RETAINED":
        // Connectome has ΔW intact
        break;
      case "BRANCH_E_SHAM_RESET":
        this.plasticity.resetEligibilityOnly();
        break;
      default:
        throw new Error(`Unknown counterfactual branch type: ${branchType}`);
    }
    this.net.recomputeInput();

    return {
      branch: branchType,
      deltaW_count: this.plasticity.deltaW.size,
      global_budget_used: this.plasticity.getGlobalBudgetUsed(),
      hash: this.plasticity.getHash(),
    };
  }
}
