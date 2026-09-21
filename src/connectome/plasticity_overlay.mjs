/**
 * Plasticity Overlay Module (Phase IV-D Foundation).
 *
 * Core Architectural Principle:
 *   W_base is immutable measured connectome topology.
 *   W_effective(t) = W_base + ΔW(t).
 *   Plasticity may ONLY modify ΔW.
 *   W_base is NEVER overwritten.
 *
 * Requirements:
 *   - Reversible & resettable to exact baseline (ΔW = 0).
 *   - Checkpointable & branchable for causal counterfactual analysis.
 *   - Hard bounded per edge, per step, and across global network budget.
 *   - Strict eligible edge masking.
 *   - Auditability & cryptographic provenance.
 *   - Sparse edge representation (no dense matrices).
 *   - Bit-identical to baseline when disabled (PLASTICITY_NONE / OFF).
 */

import crypto from "node:crypto";
import { validateLearningSignal } from "./learning_signal.mjs";

export const PLASTICITY_RULES = Object.freeze({
  PLASTICITY_NONE: "PLASTICITY_NONE",
  LOCAL_HEBBIAN: "LOCAL_HEBBIAN",
  ANTI_HEBBIAN: "ANTI_HEBBIAN",
  ELIGIBILITY_MODULATED_HEBBIAN: "ELIGIBILITY_MODULATED_HEBBIAN",
  SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN: "SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN",
  RATE_STDP_APPROXIMATION: "RATE_STDP_APPROXIMATION",
});

/**
 * Compute bounded model-local normalized pre-threshold synaptic input factor psi_i(t).
 *
 * orientation:
 *   j = presynaptic neuron
 *   i = postsynaptic neuron
 *
 * local postsynaptic bootstrap state:
 *   x_i(t) = max(0, inp_i(t) / theta_i)
 *
 * bounded local postsynaptic factor:
 *   psi_i(t) = clamp(tanh(x_i(t)) + r_i(t) / 100, 0, 1)
 *
 * Safety requirements:
 *   - 0 <= psi <= 1
 *   - No NaN, No Infinity
 *   - theta <= 0 fails closed (returns 0.0)
 *
 * @param {number} inp Postsynaptic model-local pre-threshold synaptic input (net.inp[i])
 * @param {number} theta Postsynaptic intrinsic firing threshold (net.theta[i])
 * @param {number} r Postsynaptic firing rate (net.r[i])
 * @returns {number} Bounded factor in [0, 1]
 */
export function computeSubthresholdPostsynapticFactor(inp, theta, r) {
  if (typeof theta !== "number" || theta <= 0 || !Number.isFinite(theta)) {
    return 0.0;
  }
  const validInp = (typeof inp === "number" && Number.isFinite(inp)) ? inp : 0.0;
  const x = Math.max(0.0, validInp / theta);

  const validR = (typeof r === "number" && Number.isFinite(r)) ? Math.max(0.0, r) : 0.0;
  const rNorm = validR / 100.0;

  const rawPsi = Math.tanh(x) + rNorm;
  return Math.min(1.0, Math.max(0.0, rawPsi));
}

export const EFFECTIVE_EDGE_POLICIES = Object.freeze({
  MODEL_A_RETAINED_ONLY: "MODEL_A_RETAINED_ONLY",
  MODEL_B_EXPLICIT_REVIVAL: "MODEL_B_EXPLICIT_REVIVAL",
});

export const DEFAULT_PLASTICITY_CONFIG = Object.freeze({
  enabled: false,
  rule: PLASTICITY_RULES.PLASTICITY_NONE,
  learningRate: 0.01,
  passiveDecay: 0.0,
  traceDecay: 0.05,
  maxAbsoluteDeltaW: 5.0,
  maxPercentageDeviation: 1.0, // 100% max change relative to base weight
  totalGlobalBudget: 100.0,    // Total sum of |ΔW| across network
  updateRateLimit: 0.5,        // Max change per edge per update step
  updateFrequency: 1,          // Interval of steps between updates
  effectiveEdgePolicy: EFFECTIVE_EDGE_POLICIES.MODEL_A_RETAINED_ONLY,
});

export class PlasticityOverlay {
  /**
   * @param {Object} params
   * @param {number} params.N Neuron count
   * @param {number} params.E Edge count
   * @param {TypedArray} params.indptr CSR row pointers (length N+1)
   * @param {TypedArray} params.indices CSR column targets (length E)
   * @param {TypedArray} params.baseWeights Measured connectome base weights (length E)
   * @param {Object} [params.config] Plasticity configuration and safety bounds
   * @param {Set<number>|Uint8Array|Array<number>} [params.eligibleEdgeMask] Eligible edge index set
   */
  /**
   * @param {Object} params
   * @param {number} params.N Neuron count
   * @param {number} params.E Edge count
   * @param {TypedArray} params.indptr CSR row pointers (length N+1)
   * @param {TypedArray} params.indices CSR column targets (length E)
   * @param {TypedArray} [params.baseSynapseCounts] Measured connectome base anatomical synapse counts (S_ij)
   * @param {TypedArray} [params.baseWeights] Alias for baseSynapseCounts (length E)
   * @param {TypedArray} [params.netWeights] Active weights array used in RateNetwork propagation (Float32Array)
   * @param {TypedArray} [params.netInp] Model-local synaptic input array from RateNetwork (Float32Array)
   * @param {TypedArray} [params.netTheta] Intrinsic threshold array from RateNetwork (Float32Array)
   * @param {Object} [params.config] Plasticity configuration and safety bounds
   * @param {Set<number>|Uint8Array|Array<number>} [params.eligibleEdgeMask] Eligible edge index set
   */
  constructor({
    N,
    E,
    indptr,
    indices,
    baseSynapseCounts = null,
    baseWeights = null,
    netWeights = null,
    netInp = null,
    netTheta = null,
    net = null,
    config = {},
    eligibleEdgeMask = null,
  }) {
    const structuralCounts = baseSynapseCounts ?? baseWeights;
    if (!structuralCounts || structuralCounts.length === 0) {
      throw new Error("baseSynapseCounts (or baseWeights) is required and must not be empty.");
    }
    if (!indptr || !indices) {
      throw new Error("CSR indptr and indices arrays are required.");
    }

    this.N = N ?? (indptr.length - 1);
    this.E = E ?? structuralCounts.length;
    this.indptr = indptr;
    this.indices = indices;
    // S_ij: immutable measured anatomical synapse counts
    // If netWeights is provided and identical by reference to structuralCounts, ensure structuralCounts is a frozen copy!
    if (netWeights && netWeights === structuralCounts) {
      this.baseSynapseCounts = structuralCounts.slice();
    } else {
      this.baseSynapseCounts = structuralCounts;
    }
    this.baseWeights = this.baseSynapseCounts; // backwards-compatible alias

    // Optional reference to RateNetwork active weights array for in-place propagation syncing
    this.netWeights = netWeights;
    this.initialActiveWeights = netWeights ? netWeights.slice() : null;

    // Optional reference to RateNetwork input and threshold vectors for subthreshold bootstrap plasticity
    this.netInp = netInp;
    this.netTheta = netTheta;
    this.net = net;

    // Configuration with hard safety defaults
    this.config = {
      ...DEFAULT_PLASTICITY_CONFIG,
      ...config,
    };
    this.effectiveEdgePolicy = this.config.effectiveEdgePolicy || EFFECTIVE_EDGE_POLICIES.MODEL_A_RETAINED_ONLY;

    // Record initial base weights checksum to guarantee immutability across 100% of buffer
    this.baseChecksum = this._computeBaseChecksum();

    // Dimensionless efficacy multipliers: Map<edgeIndex, alpha_ij(t)> where alpha_ij(0) = 1.0
    this.alpha = new Map();

    // Sparse delta-W in coupling units: Map<edgeIndex, deltaValue> where deltaW = S_ij * (alpha - 1.0)
    this.deltaW = new Map();

    // Sparse eligibility traces: Map<edgeIndex, traceValue>
    this.eligibilityTraces = new Map();

    // Eligible edge mask (if null, no edges eligible unless explicitly permitted)
    this.eligibleEdgeMask = null;
    if (eligibleEdgeMask) {
      this.setEligibleEdgeMask(eligibleEdgeMask);
    }

    // Prior rates for derivative / STDP approximation
    this.prevRates = null;

    // Provenance logging (explainability records)
    this.provenanceLog = [];
    this.stepCount = 0;
  }

  _computeBaseChecksum() {
    // Full-buffer SHA-256 for deterministic immutability guarantee across 100% of baseWeights
    const len = this.baseWeights.length;
    const h = crypto.createHash("sha256");
    h.update(Buffer.from(this.baseWeights.buffer, this.baseWeights.byteOffset, this.baseWeights.byteLength));
    h.update(`len:${len}`);
    return h.digest("hex");
  }

  /**
   * Synchronize incremental synaptic input cache when active weight changes on edge k.
   * Δinp[target] = preFactor[source] * out[source] * ΔW_active
   */
  _syncWeightDelta(edgeIndex, oldActiveWeight, newActiveWeight) {
    const deltaW = newActiveWeight - oldActiveWeight;
    if (Math.abs(deltaW) < 1e-12) return;
    if (this.net && this.net.inp && this.net.out && this.net.preFactor) {
      const source = this._findSourceNeuron(edgeIndex);
      const target = this.indices[edgeIndex];
      const oj = this.net.out[source];
      if (oj !== 0) {
        this.net.inp[target] += this.net.preFactor[source] * oj * deltaW;
      }
    }
  }

  /**
   * Compute active runtime weight respecting effectiveEdgePolicy and baseline filtering.
   */
  _computeActiveWeight(edgeIndex, baseW, candidateDeltaW) {
    const eff = baseW + candidateDeltaW;
    const wasZero = this.initialActiveWeights && this.initialActiveWeights[edgeIndex] === 0;
    if (wasZero) {
      if (this.effectiveEdgePolicy === EFFECTIVE_EDGE_POLICIES.MODEL_A_RETAINED_ONLY) {
        return 0;
      } else if (this.effectiveEdgePolicy === EFFECTIVE_EDGE_POLICIES.MODEL_B_EXPLICIT_REVIVAL) {
        return eff >= 5 ? eff : 0;
      }
    }
    return eff;
  }

  /**
   * Verifies that W_base has not suffered a single in-place modification.
   * @returns {boolean} True if W_base is strictly identical to initial state
   */
  verifyBaseImmutability() {
    const current = this._computeBaseChecksum();
    if (current !== this.baseChecksum) {
      throw new Error("CRITICAL SAFETY VIOLATION: W_base connectome weights were modified!");
    }
    return true;
  }

  /**
   * Configure eligible edge mask.
   * @param {Set<number>|Array<number>|Uint8Array} mask
   */
  setEligibleEdgeMask(mask) {
    if (mask instanceof Set) {
      this.eligibleEdgeMask = new Set(mask);
    } else if (Array.isArray(mask)) {
      this.eligibleEdgeMask = new Set(mask);
    } else if (mask instanceof Uint8Array) {
      const s = new Set();
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] === 1) s.add(i);
      }
      this.eligibleEdgeMask = s;
    } else {
      throw new Error("Invalid eligible edge mask format.");
    }
  }

  isEligibleEdge(edgeIndex) {
    if (!this.config.enabled) return false;
    if (this.config.rule === PLASTICITY_RULES.PLASTICITY_NONE) return false;
    if (!this.eligibleEdgeMask) return false;
    return this.eligibleEdgeMask.has(edgeIndex);
  }

  /**
   * Find CSR edge index for source -> target connection.
   * @param {number} source Source neuron index
   * @param {number} target Target neuron index
   * @returns {number} Edge index in CSR, or -1 if not found
   */
  findEdgeIndex(source, target) {
    if (source < 0 || source >= this.N) return -1;
    const start = this.indptr[source];
    const end = this.indptr[source + 1];
    for (let k = start; k < end; k++) {
      if (this.indices[k] === target) {
        return k;
      }
    }
    return -1;
  }

  /**
   * Get immutable structural anatomical synapse count S_ij.
   * @param {number} edgeIndex
   * @returns {number}
   */
  getStructuralSynapseCount(edgeIndex) {
    if (edgeIndex < 0 || edgeIndex >= this.E) return 0;
    return this.baseSynapseCounts[edgeIndex];
  }

  /**
   * Get immutable base weight W_base[k] (alias for getStructuralSynapseCount).
   * @param {number} edgeIndex
   * @returns {number}
   */
  getBaseWeight(edgeIndex) {
    return this.getStructuralSynapseCount(edgeIndex);
  }

  /**
   * Get current dimensionless efficacy multiplier alpha_ij(t) (baseline = 1.0).
   * @param {number} edgeIndex
   * @returns {number}
   */
  getEfficacyMultiplier(edgeIndex) {
    if (this.alpha.has(edgeIndex)) return this.alpha.get(edgeIndex);
    if (this.deltaW.has(edgeIndex)) {
      const baseW = this.baseSynapseCounts[edgeIndex];
      return baseW > 0 ? (baseW + this.deltaW.get(edgeIndex)) / baseW : 1.0;
    }
    return 1.0;
  }

  /**
   * Get current delta efficacy (alpha_ij - 1.0).
   * @param {number} edgeIndex
   * @returns {number}
   */
  getDeltaEfficacy(edgeIndex) {
    return this.getEfficacyMultiplier(edgeIndex) - 1.0;
  }

  /**
   * Set or modulate efficacy multiplier alpha_ij for an edge.
   * W_effective = S_ij * alpha_ij.
   * @param {number} edgeIndex
   * @param {number} alpha Dimensionless efficacy multiplier (e.g. 1.5 = +50% efficacy)
   */
  setEfficacyMultiplier(edgeIndex, alpha) {
    if (!this.config.enabled || this.config.rule === PLASTICITY_RULES.PLASTICITY_NONE) {
      return false;
    }
    if (!Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= this.E) return false;
    if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha < 0) return false;

    // Mask enforcement: ineligible edges cannot be modified
    if (!this.eligibleEdgeMask || this.eligibleEdgeMask.size === 0 || !this.eligibleEdgeMask.has(edgeIndex)) {
      return false;
    }

    // Model A: efficacy changes on retained connections only
    if (this.effectiveEdgePolicy === EFFECTIVE_EDGE_POLICIES.MODEL_A_RETAINED_ONLY) {
      if (this.initialActiveWeights && this.initialActiveWeights[edgeIndex] === 0) {
        return false;
      }
    }

    const baseW = this.baseSynapseCounts[edgeIndex];
    let candidateDeltaW = baseW * (alpha - 1.0);

    // Enforce safety bounds
    if (this.config.maxPercentageDeviation !== undefined && Number.isFinite(this.config.maxPercentageDeviation)) {
      const maxDelta = baseW * this.config.maxPercentageDeviation;
      candidateDeltaW = Math.max(-maxDelta, Math.min(maxDelta, candidateDeltaW));
    }
    if (this.config.maxAbsoluteDeltaW !== undefined && Number.isFinite(this.config.maxAbsoluteDeltaW)) {
      candidateDeltaW = Math.max(-this.config.maxAbsoluteDeltaW, Math.min(this.config.maxAbsoluteDeltaW, candidateDeltaW));
    }
    candidateDeltaW = Math.max(-baseW, candidateDeltaW);

    // Global budget check
    const oldDeltaW = this.deltaW.get(edgeIndex) ?? 0.0;
    const currentBudget = this.getGlobalBudgetUsed();
    const budgetDelta = Math.abs(candidateDeltaW) - Math.abs(oldDeltaW);
    if (this.config.totalGlobalBudget !== undefined && Number.isFinite(this.config.totalGlobalBudget)) {
      if (currentBudget + budgetDelta > this.config.totalGlobalBudget) {
        const remainingBudget = Math.max(0, this.config.totalGlobalBudget - (currentBudget - Math.abs(oldDeltaW)));
        const sign = candidateDeltaW >= 0 ? 1 : -1;
        candidateDeltaW = sign * Math.min(Math.abs(candidateDeltaW), remainingBudget);
      }
    }

    const effectiveAlpha = baseW > 0 ? (baseW + candidateDeltaW) / baseW : 1.0;

    if (Math.abs(candidateDeltaW) < 1e-6) {
      this.alpha.delete(edgeIndex);
      this.deltaW.delete(edgeIndex);
      if (this.netWeights) {
        const oldW = this.netWeights[edgeIndex];
        const newW = this.initialActiveWeights ? this.initialActiveWeights[edgeIndex] : baseW;
        this.netWeights[edgeIndex] = newW;
        this._syncWeightDelta(edgeIndex, oldW, newW);
      }
    } else {
      this.alpha.set(edgeIndex, effectiveAlpha);
      this.deltaW.set(edgeIndex, candidateDeltaW);
      if (this.netWeights) {
        const oldW = this.netWeights[edgeIndex];
        const newW = this._computeActiveWeight(edgeIndex, baseW, candidateDeltaW);
        this.netWeights[edgeIndex] = newW;
        this._syncWeightDelta(edgeIndex, oldW, newW);
      }
    }
    this.verifyBaseImmutability();
    return true;
  }

  /**
   * Get current delta-W value ΔW[k] in coupling units: S_ij * (alpha - 1.0).
   * @param {number} edgeIndex
   * @returns {number}
   */
  getDeltaW(edgeIndex) {
    return this.deltaW.get(edgeIndex) ?? 0.0;
  }

  /**
   * Get current effective weight W_effective(t) = S_ij * alpha_ij(t).
   * Strictly clamped non-negative (synapse count floor = 0).
   * @param {number} edgeIndex
   * @returns {number}
   */
  getEffectiveWeight(edgeIndex) {
    if (edgeIndex < 0 || edgeIndex >= this.E) return 0;
    const base = this.baseSynapseCounts[edgeIndex];
    const delta = this.deltaW.get(edgeIndex) ?? 0.0;
    return Math.max(0, base + delta);
  }

  getEffectiveWeightByNeurons(source, target) {
    const k = this.findEdgeIndex(source, target);
    if (k === -1) return 0;
    return this.getEffectiveWeight(k);
  }

  /**
   * Stored efficacy budget: total sum of |ΔW_k| across all modified edges in deltaW.
   * @returns {number}
   */
  getStoredEfficacyBudget() {
    let total = 0;
    for (const delta of this.deltaW.values()) {
      total += Math.abs(delta);
    }
    return total;
  }

  /**
   * Active coupling budget: total sum of actual changes in active synaptic weight in the network.
   * sum_k |W_active[k] - W_initialActive[k]|
   * @returns {number}
   */
  getActiveCouplingBudget() {
    if (!this.netWeights || !this.initialActiveWeights) {
      return this.getStoredEfficacyBudget();
    }
    let total = 0;
    for (const edgeIdx of this.deltaW.keys()) {
      const activeW = this.netWeights[edgeIdx];
      const initW = this.initialActiveWeights[edgeIdx];
      total += Math.abs(activeW - initW);
    }
    return total;
  }

  /**
   * Anatomically present edge activation: count of edges where initial active weight was 0
   * (e.g. filtered out by minSyn) but current active weight is > 0.
   * In Model A, this is strictly 0. In Model B, this counts revived edges.
   * @returns {number}
   */
  getActivatedEdgeCount() {
    if (!this.netWeights || !this.initialActiveWeights) return 0;
    let count = 0;
    for (const edgeIdx of this.deltaW.keys()) {
      if (this.initialActiveWeights[edgeIdx] === 0 && this.netWeights[edgeIdx] > 0) {
        count++;
      }
    }
    return count;
  }

  /**
   * Current total global modification budget used: sum(|ΔW_k|).
   * @returns {number}
   */
  getGlobalBudgetUsed() {
    return this.getStoredEfficacyBudget();
  }

  /**
   * Update local eligibility traces based on presynaptic and postsynaptic neural activity.
   * e_ij(t) = e_ij(t-1) * (1 - traceDecay) + local_activity(t)
   *
   * @param {Float32Array|Array<number>} currentRates Firing rates of all N neurons
   * @param {Float32Array|Array<number>} [currentInp] Model-local synaptic inputs of all N neurons
   * @param {Float32Array|Array<number>} [currentTheta] Intrinsic thresholds of all N neurons
   */
  updateEligibility(currentRates, currentInp = null, currentTheta = null) {
    if (!this.config.enabled || !this.eligibleEdgeMask || this.eligibleEdgeMask.size === 0) {
      return;
    }

    const { traceDecay, rule } = this.config;
    const isSTDP = rule === PLASTICITY_RULES.RATE_STDP_APPROXIMATION;
    const isSubthreshold = rule === PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN;

    const inpVector = currentInp || this.netInp;
    const thetaVector = currentTheta || this.netTheta;

    for (const edgeIdx of this.eligibleEdgeMask) {
      // Find source neuron for this edge
      const source = this._findSourceNeuron(edgeIdx);
      const target = this.indices[edgeIdx];
      if (source === -1 || target === -1) continue;

      const rPre = currentRates[source] || 0.0;
      const rPost = currentRates[target] || 0.0;

      let coincidence = 0.0;
      if (isSTDP) {
        // Temporal derivative approximation
        const prevPre = this.prevRates ? (this.prevRates[source] || 0.0) : rPre;
        const prevPost = this.prevRates ? (this.prevRates[target] || 0.0) : rPost;
        const dPre = rPre - prevPre;
        const dPost = rPost - prevPost;
        // Standard rate-STDP: Pre active while Post rises -> potentiation; Post active while Pre rises -> depression
        coincidence = ((rPre * dPost) - (rPost * dPre)) / 10000.0;
      } else if (isSubthreshold) {
        // Model-local normalized pre-threshold synaptic input: x_i(t) = max(0, inp_i(t) / theta_i)
        // psi_i(t) = clamp(tanh(x_i(t)) + r_i(t) / 100, 0, 1)
        const inpPost = inpVector ? (inpVector[target] || 0.0) : 0.0;
        const thetaPost = thetaVector ? (thetaVector[target] || 0.0) : 0.0;
        const psi = computeSubthresholdPostsynapticFactor(inpPost, thetaPost, rPost);
        coincidence = (rPre / 100.0) * psi;
      } else {
        // Standard rate coincidence
        coincidence = (rPre / 100.0) * (rPost / 100.0);
      }

      const prevTrace = this.eligibilityTraces.get(edgeIdx) ?? 0.0;
      const updatedTrace = prevTrace * (1.0 - traceDecay) + coincidence;

      if (Math.abs(updatedTrace) < 1e-6) {
        this.eligibilityTraces.delete(edgeIdx);
      } else {
        this.eligibilityTraces.set(edgeIdx, updatedTrace);
      }
    }

    // Cache current rates for derivative computation
    if (isSTDP) {
      if (!this.prevRates || this.prevRates.length !== currentRates.length) {
        this.prevRates = new Float32Array(currentRates.length);
      }
      this.prevRates.set(currentRates);
    }
  }

  _findSourceNeuron(edgeIndex) {
    // Binary search over indptr to find row where indptr[row] <= edgeIndex < indptr[row+1]
    let low = 0;
    let high = this.N - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (edgeIndex < this.indptr[mid]) {
        high = mid - 1;
      } else if (edgeIndex >= this.indptr[mid + 1]) {
        low = mid + 1;
      } else {
        return mid;
      }
    }
    return -1;
  }

  /**
   * Apply modulatory learning signal g_t in [-1, 1] to all eligible edges.
   * Strictly enforces bounds and provenance logging.
   *
   * @param {number|string|Object} rawSignal Modulatory learning signal
   * @param {number} [step] Timestep
   * @returns {number} Number of edges modified
   */
  applyModulatoryUpdate(rawSignal, step = ++this.stepCount) {
    if (!this.config.enabled) return 0;
    if (this.config.rule === PLASTICITY_RULES.PLASTICITY_NONE) return 0;
    if (!this.eligibleEdgeMask || this.eligibleEdgeMask.size === 0) return 0;

    const {
      rule,
      learningRate,
      passiveDecay,
      maxAbsoluteDeltaW,
      maxPercentageDeviation,
      totalGlobalBudget,
      updateRateLimit,
    } = this.config;

    // Validate learning signal and assert zero policy leakage
    const g_t = validateLearningSignal(rawSignal);
    const isUnmodulated = rule === PLASTICITY_RULES.LOCAL_HEBBIAN || rule === PLASTICITY_RULES.ANTI_HEBBIAN;
    if (!isUnmodulated && g_t === 0.0 && passiveDecay === 0.0) return 0;

    let modifiedCount = 0;
    let currentGlobalBudget = this.getGlobalBudgetUsed();

    for (const edgeIdx of this.eligibleEdgeMask) {
      // Model A: efficacy changes on retained connections only
      if (this.effectiveEdgePolicy === EFFECTIVE_EDGE_POLICIES.MODEL_A_RETAINED_ONLY) {
        if (this.initialActiveWeights && this.initialActiveWeights[edgeIdx] === 0) {
          continue;
        }
      }

      const source = this._findSourceNeuron(edgeIdx);
      const target = this.indices[edgeIdx];
      const baseW = this.baseWeights[edgeIdx];
      const deltaWBefore = this.deltaW.get(edgeIdx) ?? 0.0;
      const eligibility = this.eligibilityTraces.get(edgeIdx) ?? 0.0;

      let proposedChange = 0.0;

      switch (rule) {
        case PLASTICITY_RULES.LOCAL_HEBBIAN:
          // Activity coincidence without external modulatory gate
          proposedChange = learningRate * eligibility - passiveDecay * deltaWBefore;
          break;
        case PLASTICITY_RULES.ANTI_HEBBIAN:
          // Anti-hebbian suppression
          proposedChange = -learningRate * eligibility - passiveDecay * deltaWBefore;
          break;
        case PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN:
        case PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN:
        case PLASTICITY_RULES.RATE_STDP_APPROXIMATION:
          // Gated by scalar modulatory signal g_t
          proposedChange = learningRate * g_t * eligibility - passiveDecay * deltaWBefore;
          break;
        default:
          proposedChange = 0.0;
      }

      if (Math.abs(proposedChange) < 1e-7) continue;

      // 1. Clamp to per-step update rate limit
      let boundedChange = Math.max(-updateRateLimit, Math.min(updateRateLimit, proposedChange));

      // 2. Candidate new deltaW
      let candidateDeltaW = deltaWBefore + boundedChange;

      // 3. Absolute delta-W bound
      candidateDeltaW = Math.max(-maxAbsoluteDeltaW, Math.min(maxAbsoluteDeltaW, candidateDeltaW));

      // 4. Percentage deviation bound relative to base weight
      const maxDeltaFromBase = baseW * maxPercentageDeviation;
      candidateDeltaW = Math.max(-maxDeltaFromBase, Math.min(maxDeltaFromBase, candidateDeltaW));

      // 5. Non-negative synapse count floor (W_effective >= 0)
      candidateDeltaW = Math.max(-baseW, candidateDeltaW);

      // Re-derive applied change
      boundedChange = candidateDeltaW - deltaWBefore;

      // 6. Global budget clamp
      const budgetDelta = Math.abs(candidateDeltaW) - Math.abs(deltaWBefore);
      if (currentGlobalBudget + budgetDelta > totalGlobalBudget) {
        // Clamp to remaining budget
        const remainingBudget = Math.max(0, totalGlobalBudget - currentGlobalBudget);
        if (remainingBudget <= 0) {
          boundedChange = 0;
          candidateDeltaW = deltaWBefore;
        } else {
          const sign = boundedChange > 0 ? 1 : -1;
          boundedChange = sign * Math.min(Math.abs(boundedChange), remainingBudget);
          candidateDeltaW = deltaWBefore + boundedChange;
        }
      }

      if (Math.abs(boundedChange) > 1e-7) {
        const candidateAlpha = baseW > 0 ? (baseW + candidateDeltaW) / baseW : 1.0;
        if (Math.abs(candidateDeltaW) < 1e-7) {
          this.deltaW.delete(edgeIdx);
          this.alpha.delete(edgeIdx);
          if (this.netWeights) {
            const oldW = this.netWeights[edgeIdx];
            const newW = this.initialActiveWeights ? this.initialActiveWeights[edgeIdx] : baseW;
            this.netWeights[edgeIdx] = newW;
            this._syncWeightDelta(edgeIdx, oldW, newW);
          }
        } else {
          this.deltaW.set(edgeIdx, candidateDeltaW);
          this.alpha.set(edgeIdx, candidateAlpha);
          if (this.netWeights) {
            const oldW = this.netWeights[edgeIdx];
            const newW = this._computeActiveWeight(edgeIdx, baseW, candidateDeltaW);
            this.netWeights[edgeIdx] = newW;
            this._syncWeightDelta(edgeIdx, oldW, newW);
          }
        }
        currentGlobalBudget += (Math.abs(candidateDeltaW) - Math.abs(deltaWBefore));
        modifiedCount++;

        // Append provenance record
        this.provenanceLog.push({
          step,
          edgeIndex: edgeIdx,
          source,
          target,
          baseWeight: baseW,
          structuralSynapseCount: baseW,
          deltaWBefore,
          efficacyMultiplier: candidateAlpha,
          eligibility,
          modulatorySignal: g_t,
          proposedChange,
          boundedAppliedChange: boundedChange,
          deltaWAfter: candidateDeltaW,
          effectiveWeightAfter: baseW + candidateDeltaW,
          rule,
        });
      }
    }

    // Verify immutability after updates
    this.verifyBaseImmutability();

    return modifiedCount;
  }

  /**
   * Reset ΔW exactly to zero, clearing all weight alterations.
   * Guarantees exact return to W_base.
   */
  reset() {
    if (this.netWeights) {
      for (const edgeIdx of this.deltaW.keys()) {
        this.netWeights[edgeIdx] = this.initialActiveWeights ? this.initialActiveWeights[edgeIdx] : this.baseSynapseCounts[edgeIdx];
      }
      for (const edgeIdx of this.alpha.keys()) {
        this.netWeights[edgeIdx] = this.initialActiveWeights ? this.initialActiveWeights[edgeIdx] : this.baseSynapseCounts[edgeIdx];
      }
    }
    this.alpha.clear();
    this.deltaW.clear();
    this.eligibilityTraces.clear();
    if (this.prevRates) this.prevRates.fill(0);
    this.stepCount = 0;
    if (this.net && typeof this.net.recomputeInput === "function") {
      this.net.recomputeInput();
    }
    this.verifyBaseImmutability();
  }

  /**
   * Reset eligibility traces only, preserving learned ΔW.
   */
  resetEligibilityOnly() {
    this.eligibilityTraces.clear();
    if (this.prevRates) this.prevRates.fill(0);
  }

  /**
   * Compute deterministic SHA-256 hash of current ΔW and eligibility state.
   * @returns {string}
   */
  getHash() {
    const h = crypto.createHash("sha256");
    h.update(this.baseChecksum);

    // Sort deltaW keys for deterministic hashing
    const sortedDeltas = Array.from(this.deltaW.entries()).sort((a, b) => a[0] - b[0]);
    for (const [k, v] of sortedDeltas) {
      h.update(`d:${k}:${v.toFixed(6)}`);
    }

    const sortedTraces = Array.from(this.eligibilityTraces.entries()).sort((a, b) => a[0] - b[0]);
    for (const [k, v] of sortedTraces) {
      h.update(`e:${k}:${v.toFixed(6)}`);
    }

    return h.digest("hex");
  }

  /**
   * Snapshot current plasticity state for causal counterfactual branching.
   */
  snapshot() {
    return {
      timestamp: Date.now(),
      step: this.stepCount,
      config: { ...this.config },
      deltaW: Array.from(this.deltaW.entries()),
      alpha: Array.from(this.alpha.entries()),
      eligibilityTraces: Array.from(this.eligibilityTraces.entries()),
      eligibleEdgeMask: this.eligibleEdgeMask ? Array.from(this.eligibleEdgeMask) : null,
      globalBudgetUsed: this.getGlobalBudgetUsed(),
      hash: this.getHash(),
    };
  }

  /**
   * Restore plasticity state from a snapshot.
   * @param {Object} snap Snapshot object
   */
  restore(snap) {
    if (!snap || typeof snap !== "object") {
      throw new Error("Invalid snapshot provided to restore: must be an object.");
    }
    if (!Array.isArray(snap.deltaW) || !Array.isArray(snap.eligibilityTraces)) {
      throw new Error("Invalid snapshot schema: deltaW and eligibilityTraces must be arrays.");
    }

    // 1. Pre-validate EVERYTHING before mutating live state
    const validatedDeltas = [];
    for (const entry of snap.deltaW) {
      if (!Array.isArray(entry) || entry.length < 2) {
        throw new Error(`Invalid snapshot deltaW entry: ${JSON.stringify(entry)}`);
      }
      const edgeIdx = Number(entry[0]);
      const deltaVal = Number(entry[1]);
      if (!Number.isInteger(edgeIdx) || edgeIdx < 0 || edgeIdx >= this.E) {
        throw new Error(`Invalid edge index in snapshot deltaW: ${entry[0]}`);
      }
      if (!Number.isFinite(deltaVal)) {
        throw new Error(`Invalid deltaW value in snapshot: ${entry[1]}`);
      }
      validatedDeltas.push([edgeIdx, deltaVal]);
    }

    const validatedTraces = [];
    for (const entry of snap.eligibilityTraces) {
      if (!Array.isArray(entry) || entry.length < 2) {
        throw new Error(`Invalid snapshot eligibility trace entry: ${JSON.stringify(entry)}`);
      }
      const edgeIdx = Number(entry[0]);
      const traceVal = Number(entry[1]);
      if (!Number.isInteger(edgeIdx) || edgeIdx < 0 || edgeIdx >= this.E) {
        throw new Error(`Invalid edge index in snapshot eligibility trace: ${entry[0]}`);
      }
      if (!Number.isFinite(traceVal)) {
        throw new Error(`Invalid trace value in snapshot: ${entry[1]}`);
      }
      validatedTraces.push([edgeIdx, traceVal]);
    }

    let validatedAlphas = null;
    if (snap.alpha) {
      if (!Array.isArray(snap.alpha)) {
        throw new Error("Invalid snapshot alpha: must be an array.");
      }
      validatedAlphas = [];
      for (const entry of snap.alpha) {
        if (!Array.isArray(entry) || entry.length < 2) {
          throw new Error(`Invalid snapshot alpha entry: ${JSON.stringify(entry)}`);
        }
        const edgeIdx = Number(entry[0]);
        const alphaVal = Number(entry[1]);
        if (!Number.isInteger(edgeIdx) || edgeIdx < 0 || edgeIdx >= this.E || !Number.isFinite(alphaVal)) {
          throw new Error(`Invalid alpha entry in snapshot: ${JSON.stringify(entry)}`);
        }
        validatedAlphas.push([edgeIdx, alphaVal]);
      }
    }

    // 2. Pre-validation passed. Restore policy & configuration FIRST
    if (snap.config) {
      this.config = { ...this.config, ...snap.config };
      if (this.config.effectiveEdgePolicy) {
        this.effectiveEdgePolicy = this.config.effectiveEdgePolicy;
      }
    }
    if (snap.eligibleEdgeMask) {
      this.eligibleEdgeMask = new Set(snap.eligibleEdgeMask);
    }

    // 3. Revert current modifications in netWeights
    if (this.netWeights) {
      for (const edgeIdx of this.deltaW.keys()) {
        this.netWeights[edgeIdx] = this.initialActiveWeights ? this.initialActiveWeights[edgeIdx] : this.baseSynapseCounts[edgeIdx];
      }
      for (const edgeIdx of this.alpha.keys()) {
        this.netWeights[edgeIdx] = this.initialActiveWeights ? this.initialActiveWeights[edgeIdx] : this.baseSynapseCounts[edgeIdx];
      }
    }
    this.deltaW.clear();
    this.alpha.clear();

    // 4. Apply validated deltaW and alpha, reconstructing active weights under restored policy
    for (const [edgeIdx, deltaVal] of validatedDeltas) {
      this.deltaW.set(edgeIdx, deltaVal);
      const baseW = this.baseSynapseCounts[edgeIdx];
      const alphaVal = baseW > 0 ? (baseW + deltaVal) / baseW : 1.0;
      this.alpha.set(edgeIdx, alphaVal);
      if (this.netWeights) {
        this.netWeights[edgeIdx] = this._computeActiveWeight(edgeIdx, baseW, deltaVal);
      }
    }
    if (validatedAlphas) {
      for (const [edgeIdx, alphaVal] of validatedAlphas) {
        this.alpha.set(edgeIdx, alphaVal);
      }
    }

    this.eligibilityTraces.clear();
    for (const [edgeIdx, traceVal] of validatedTraces) {
      this.eligibilityTraces.set(edgeIdx, traceVal);
    }

    this.stepCount = snap.step || 0;
    if (this.net && typeof this.net.recomputeInput === "function") {
      this.net.recomputeInput();
    }
    this.verifyBaseImmutability();
  }
}
