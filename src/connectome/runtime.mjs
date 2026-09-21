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
import { PlasticityOverlay } from "./plasticity_overlay.mjs";

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
          config: opts.plasticity.config || opts.plasticity,
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
      r: Array.from(this.net.r),
      inp: Array.from(this.net.inp),
      ext: Array.from(this.net.ext),
      trace: Array.from(this.net.trace),
      A: Array.from(this.net.A),
      u: Array.from(this.net.u),
      out: Array.from(this.net.out),
      silenced: Array.from(this.silencedNeurons),
      excited: Array.from(this.excitedNeurons.entries()),
      plasticity: this.plasticity ? this.plasticity.snapshot() : null,
    };
  }

  /**
   * Restore bit-exact state from snapshot.
   */
  restore(snap) {
    if (snap.schema !== "connectome.runtime.snapshot.v1") {
      throw new Error(`Invalid snapshot schema: ${snap.schema}`);
    }
    this.net.t = snap.t;
    this.net.r.set(snap.r);
    this.net.inp.set(snap.inp);
    this.net.ext.set(snap.ext);
    this.net.trace.set(snap.trace);
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

    if (snap.plasticity && this.plasticity) {
      this.plasticity.restore(snap.plasticity);
    }

    return true;
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
  createCounterfactualBranch(branchType, snap) {
    this.restore(snap);
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

    return {
      branch: branchType,
      deltaW_count: this.plasticity.deltaW.size,
      global_budget_used: this.plasticity.getGlobalBudgetUsed(),
      hash: this.plasticity.getHash(),
    };
  }
}
