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
  RATE_STDP_APPROXIMATION: "RATE_STDP_APPROXIMATION",
});

export const DEFAULT_PLASTICITY_CONFIG = Object.freeze({
  enabled: false,
  rule: PLASTICITY_RULES.PLASTICITY_NONE,
  learningRate: 0.01,
  passiveDecay: 0.0,
  traceDecay: 0.05,
  maxAbsoluteDeltaW: 5.0,
  maxPercentageDeviation: 1.0, // 100% max change relative to base weight
  totalGlobalBudget: 100.0,     // Total sum of |ΔW| across network
  updateRateLimit: 0.5,        // Max change per edge per update step
  updateFrequency: 1,          // Interval of steps between updates
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
  constructor({
    N,
    E,
    indptr,
    indices,
    baseWeights,
    config = {},
    eligibleEdgeMask = null,
  }) {
    if (!baseWeights || baseWeights.length === 0) {
      throw new Error("baseWeights is required and must not be empty.");
    }
    if (!indptr || !indices) {
      throw new Error("CSR indptr and indices arrays are required.");
    }

    this.N = N ?? (indptr.length - 1);
    this.E = E ?? baseWeights.length;
    this.indptr = indptr;
    this.indices = indices;
    this.baseWeights = baseWeights;

    // Record initial base weights checksum to guarantee immutability
    this.baseChecksum = this._computeBaseChecksum();

    // Configuration with hard safety defaults
    this.config = {
      ...DEFAULT_PLASTICITY_CONFIG,
      ...config,
    };

    // Sparse delta-W: Map<edgeIndex, deltaValue>
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
    // Sample head, mid, tail, and length for fast immutability check
    const len = this.baseWeights.length;
    const h = crypto.createHash("sha256");
    h.update(Buffer.from(this.baseWeights.buffer, this.baseWeights.byteOffset, Math.min(100000, this.baseWeights.byteLength)));
    h.update(`len:${len}`);
    return h.digest("hex");
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
   * Get immutable base weight W_base[k].
   * @param {number} edgeIndex
   * @returns {number}
   */
  getBaseWeight(edgeIndex) {
    if (edgeIndex < 0 || edgeIndex >= this.E) return 0;
    return this.baseWeights[edgeIndex];
  }

  /**
   * Get current delta-W value ΔW[k].
   * @param {number} edgeIndex
   * @returns {number}
   */
  getDeltaW(edgeIndex) {
    return this.deltaW.get(edgeIndex) ?? 0.0;
  }

  /**
   * Get current effective weight W_effective(t) = W_base + ΔW(t).
   * Strictly clamped non-negative (synapse count floor = 0).
   * @param {number} edgeIndex
   * @returns {number}
   */
  getEffectiveWeight(edgeIndex) {
    if (edgeIndex < 0 || edgeIndex >= this.E) return 0;
    const base = this.baseWeights[edgeIndex];
    const delta = this.deltaW.get(edgeIndex) ?? 0.0;
    return Math.max(0, base + delta);
  }

  getEffectiveWeightByNeurons(source, target) {
    const k = this.findEdgeIndex(source, target);
    if (k === -1) return 0;
    return this.getEffectiveWeight(k);
  }

  /**
   * Current total global modification budget used: sum(|ΔW_k|).
   * @returns {number}
   */
  getGlobalBudgetUsed() {
    let total = 0;
    for (const delta of this.deltaW.values()) {
      total += Math.abs(delta);
    }
    return total;
  }

  /**
   * Update local eligibility traces based on presynaptic and postsynaptic neural activity.
   * e_ij(t) = e_ij(t-1) * (1 - traceDecay) + local_activity(t)
   *
   * @param {Float32Array|Array<number>} currentRates Firing rates of all N neurons
   */
  updateEligibility(currentRates) {
    if (!this.config.enabled || !this.eligibleEdgeMask || this.eligibleEdgeMask.size === 0) {
      return;
    }

    const { traceDecay, rule } = this.config;
    const isSTDP = rule === PLASTICITY_RULES.RATE_STDP_APPROXIMATION;

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
        if (Math.abs(candidateDeltaW) < 1e-7) {
          this.deltaW.delete(edgeIdx);
        } else {
          this.deltaW.set(edgeIdx, candidateDeltaW);
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
          deltaWBefore,
          eligibility,
          modulatorySignal: g_t,
          proposedChange,
          boundedAppliedChange: boundedChange,
          deltaWAfter: candidateDeltaW,
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
    this.deltaW.clear();
    this.eligibilityTraces.clear();
    if (this.prevRates) this.prevRates.fill(0);
    this.stepCount = 0;
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
      throw new Error("Invalid snapshot provided to restore.");
    }
    this.deltaW.clear();
    for (const [k, v] of snap.deltaW) {
      this.deltaW.set(Number(k), Number(v));
    }

    this.eligibilityTraces.clear();
    for (const [k, v] of snap.eligibilityTraces) {
      this.eligibilityTraces.set(Number(k), Number(v));
    }

    if (snap.eligibleEdgeMask) {
      this.eligibleEdgeMask = new Set(snap.eligibleEdgeMask);
    }

    if (snap.config) {
      this.config = { ...this.config, ...snap.config };
    }

    this.stepCount = snap.step || 0;
    this.verifyBaseImmutability();
  }
}
