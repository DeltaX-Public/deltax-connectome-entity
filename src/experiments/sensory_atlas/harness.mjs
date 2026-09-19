/**
 * Sensory Response Atlas Direct Stimulation Harness.
 *
 * Interrogates the intact connectome RateNetwork directly by presenting controlled
 * sensory receptor drives and measuring downstream whole-network, descending neuron (DN),
 * and candidate action field dynamics over time.
 *
 * ARCHITECTURAL HONESTY:
 * - Independent of ChangedWorld, maze geometry, or rover body mechanics.
 * - Zero DeltaX executive intervention (pure substrate interrogation).
 * - Zero navigation or route-planning logic.
 * - Supports constant, pulsed, jittered, sparse, and lateralized stimulus patterns.
 */

import { ConnectomeRuntime } from "../../connectome/runtime.mjs";
import { ConnectomeCandidateBridge } from "../../connectome/candidate_bridge.mjs";
import { createShuffledConnectome } from "../../connectome/shuffled_control.mjs";

export class SensoryAtlasHarness {
  constructor(opts = {}) {
    this.seed = opts.seed ?? 7000;
    this.baselineSteps = opts.baselineSteps ?? 10;   // 10 ms pre-stimulus baseline
    this.stimulusSteps = opts.stimulusSteps ?? 25;   // 25 ms stimulus presentation
    this.postSteps = opts.postSteps ?? 25;           // 25 ms post-stimulus settling
    this.totalSteps = this.baselineSteps + this.stimulusSteps + this.postSteps; // 60 ms total
    this.bridge = new ConnectomeCandidateBridge();
    this.runtime = null;
  }

  /**
   * Initialize or retrieve the ConnectomeRuntime.
   */
  initRuntime(seed = this.seed, isShuffled = false, silencedNeurons = null) {
    const runtime = new ConnectomeRuntime({
      seed,
      substepsPerTick: 1, // Single 1ms substeps for fine temporal resolution
      plasticityEnabled: false, // Strict: No plasticity during atlas characterization
    });

    if (isShuffled) {
      const shuffled = createShuffledConnectome(runtime.data, seed);
      runtime.net.indices.set(shuffled.indices);
      runtime.net.recomputeInput();
    }

    if (silencedNeurons && silencedNeurons.size > 0) {
      for (const idx of silencedNeurons) {
        runtime.silencedNeurons.add(idx);
        runtime.net.silenced[idx] = 1;
      }
    }

    this.runtime = runtime;
    return runtime;
  }

  /**
   * Look up sensor indices by bodymap group name.
   */
  getSensorIndices(groupName) {
    if (!this.runtime) this.initRuntime();
    const bm = this.runtime.data.bodymap;

    // Direct match in bodymap.sensors
    const sensor = bm.sensors?.find((s) => s.name === groupName);
    if (sensor) return sensor.idx || [];

    // Photoreceptors
    if (groupName === "photoreceptors left") {
      const eye = bm.eyes?.find((e) => e.side === "left");
      return eye?.idx || [];
    }
    if (groupName === "photoreceptors right") {
      const eye = bm.eyes?.find((e) => e.side === "right");
      return eye?.idx || [];
    }
    if (groupName === "photoreceptors" || groupName === "photoreceptors bilateral") {
      const all = [];
      if (bm.eyes) {
        for (const e of bm.eyes) if (e.idx) all.push(...e.idx);
      }
      return all;
    }

    return [];
  }

  /**
   * Run a single direct stimulation trial.
   *
   * @param {Object} config Stimulation configuration
   * @param {string|Array<number>} config.population Sensor group name or explicit neuron indices
   * @param {number} [config.intensity] Firing rate in Hz (default 100 Hz)
   * @param {string} [config.pattern] 'CONSTANT' | 'PULSED' | 'JITTERED' | 'SPARSE' | 'DISTRIBUTED'
   * @param {string} [config.laterality] 'SYMMETRIC' | 'LEFT_ONLY' | 'RIGHT_ONLY' | 'ASYMMETRIC'
   * @param {Object} [config.asymmetricDrives] Explicit left/right drives { leftHz, rightHz, leftPop, rightPop }
   * @param {number} [config.seed] Simulation seed
   * @param {boolean} [config.isShuffled] Whether to evaluate shuffled connectome control
   * @param {Set<number>} [config.silencedNeurons] Specific neurons to silence
   * @returns {Object} Comprehensive trial trace and summary metrics
   */
  async runTrial(config = {}) {
    const seed = config.seed ?? this.seed;
    const isShuffled = !!config.isShuffled;
    const silenced = config.silencedNeurons || null;

    const runtime = this.initRuntime(seed, isShuffled, silenced);
    runtime.net.reset();

    const intensity = config.intensity ?? 100.0;
    const pattern = config.pattern ?? "CONSTANT";
    const laterality = config.laterality ?? "SYMMETRIC";

    // Resolve target sensory drives
    const leftDriveMap = new Map();
    const rightDriveMap = new Map();

    if (laterality === "ASYMMETRIC" && config.asymmetricDrives) {
      const { leftPop, rightPop, leftHz, rightHz } = config.asymmetricDrives;
      const lIdx = typeof leftPop === "string" ? this.getSensorIndices(leftPop) : leftPop;
      const rIdx = typeof rightPop === "string" ? this.getSensorIndices(rightPop) : rightPop;
      for (const i of lIdx) leftDriveMap.set(i, leftHz);
      for (const i of rIdx) rightDriveMap.set(i, rightHz);
    } else if (laterality === "LEFT_ONLY") {
      const popName = typeof config.population === "string" ? config.population : null;
      const leftName = popName ? (popName.includes("left") ? popName : `${popName} left`) : null;
      const idxList = leftName ? this.getSensorIndices(leftName) : config.population;
      for (const i of idxList) leftDriveMap.set(i, intensity);
    } else if (laterality === "RIGHT_ONLY") {
      const popName = typeof config.population === "string" ? config.population : null;
      const rightName = popName ? (popName.includes("right") ? popName : `${popName} right`) : null;
      const idxList = rightName ? this.getSensorIndices(rightName) : config.population;
      for (const i of idxList) rightDriveMap.set(i, intensity);
    } else {
      // SYMMETRIC or standard
      if (typeof config.population === "string") {
        const baseName = config.population.replace(/\s+(left|right)$/, "");
        const lIdx = this.getSensorIndices(`${baseName} left`);
        const rIdx = this.getSensorIndices(`${baseName} right`);
        if (lIdx.length > 0 || rIdx.length > 0) {
          for (const i of lIdx) leftDriveMap.set(i, intensity);
          for (const i of rIdx) rightDriveMap.set(i, intensity);
        } else {
          const direct = this.getSensorIndices(config.population);
          for (const i of direct) leftDriveMap.set(i, intensity);
        }
      } else if (Array.isArray(config.population)) {
        for (const i of config.population) leftDriveMap.set(i, intensity);
      }
    }

    // Merge base drive map
    const baseDrives = new Map([...leftDriveMap, ...rightDriveMap]);

    // Handle SPATIAL patterns (Sparse vs Distributed)
    let activeDrives = baseDrives;
    if (pattern === "SPARSE") {
      const entries = Array.from(baseDrives.entries());
      const sparseCount = Math.max(1, Math.floor(entries.length * 0.25)); // 25% of neurons
      const boostFactor = entries.length / sparseCount; // Equal total energy budget
      activeDrives = new Map();
      for (let i = 0; i < sparseCount; i++) {
        activeDrives.set(entries[i][0], entries[i][1] * boostFactor);
      }
    }

    const timeSeries = [];
    const baselineDnReadouts = [];
    const stimulusDnReadouts = [];
    const postDnReadouts = [];

    // Deterministic RNG for jitter
    let rngState = seed;
    const rng = () => {
      rngState = (rngState * 1664525 + 1013904223) | 0;
      return ((rngState >>> 0) / 4294967296);
    };

    let peakDnLeft = 0;
    let peakDnRight = 0;
    let peakDnForward = 0;
    let peakDnBackward = 0;
    let peakDnEscape = 0;
    let peakDnGroom = 0;

    let onsetStep = null;
    let settlingStep = null;

    // Simulation Loop (1 ms per step)
    for (let step = 1; step <= this.totalSteps; step++) {
      const isBaseline = step <= this.baselineSteps;
      const isStimulus = step > this.baselineSteps && step <= (this.baselineSteps + this.stimulusSteps);
      const isPost = step > (this.baselineSteps + this.stimulusSteps);

      // Determine step drive based on pattern
      if (isStimulus) {
        if (pattern === "CONSTANT" || pattern === "SPARSE" || pattern === "DISTRIBUTED") {
          runtime.setSensoryDrives(activeDrives);
        } else if (pattern === "PULSED") {
          // 5ms ON / 5ms OFF pulse train
          const pulsePhase = (step - this.baselineSteps) % 10;
          if (pulsePhase < 5) {
            runtime.setSensoryDrives(activeDrives);
          } else {
            runtime.sensoryDrives.clear();
          }
        } else if (pattern === "JITTERED") {
          // Bounded jitter +/- 30%
          const jittered = new Map();
          for (const [idx, rate] of activeDrives.entries()) {
            const jitterScale = 0.70 + rng() * 0.60; // [0.70, 1.30]
            jittered.set(idx, +(rate * jitterScale).toFixed(2));
          }
          runtime.setSensoryDrives(jittered);
        }
      } else {
        runtime.sensoryDrives.clear();
      }

      // Single 1ms recurrent step
      runtime.step(1);

      // Readouts
      const dn = runtime.getDescendingNeuronReadouts();
      const candidates = this.bridge.generateCandidates(dn, step);

      const fwdRate = dn.forward?.weighted_mean || 0;
      const backRate = dn.backward?.weighted_mean || 0;
      const turnLRate = dn.turn_left?.weighted_mean || 0;
      const turnRRate = dn.turn_right?.weighted_mean || 0;
      const escapeRate = Math.max(dn.escape?.mean_rate || 0, dn.takeoff?.weighted_mean || 0);
      const groomRate = dn.groom?.weighted_mean || 0;

      if (turnLRate > peakDnLeft) peakDnLeft = turnLRate;
      if (turnRRate > peakDnRight) peakDnRight = turnRRate;
      if (fwdRate > peakDnForward) peakDnForward = fwdRate;
      if (backRate > peakDnBackward) peakDnBackward = backRate;
      if (escapeRate > peakDnEscape) peakDnEscape = escapeRate;
      if (groomRate > peakDnGroom) peakDnGroom = groomRate;

      // Candidate strengths
      const candStrengths = {};
      for (const c of candidates) {
        candStrengths[c.action_class] = c.activation_strength;
      }

      // Candidate Entropy H = -sum(p * log2(p))
      const strengthsArr = Object.values(candStrengths);
      const sumS = strengthsArr.reduce((a, b) => a + b, 0);
      let entropy = 0;
      for (const s of strengthsArr) {
        const p = s / sumS;
        if (p > 0) entropy -= p * Math.log2(p);
      }

      // Identify winning candidate
      let maxStrength = -1;
      let winningCandidate = "safe_noop";
      for (const c of candidates) {
        if (c.activation_strength > maxStrength) {
          maxStrength = c.activation_strength;
          winningCandidate = c.action_class;
        }
      }

      // Measure onset latency (first step where DN differential or rate exceeds threshold)
      if (isStimulus && onsetStep === null) {
        if (turnLRate > 0.1 || turnRRate > 0.1 || fwdRate > 0.1 || escapeRate > 0.1 || groomRate > 0.1) {
          onsetStep = step - this.baselineSteps;
        }
      }

      // Measure settling time (post-stimulus return to baseline)
      if (isPost && settlingStep === null) {
        if (turnLRate < 0.1 && turnRRate < 0.1 && fwdRate < 0.1 && escapeRate < 0.1 && groomRate < 0.1) {
          settlingStep = step - (this.baselineSteps + this.stimulusSteps);
        }
      }

      const activeNeuronCount = runtime.net.r.reduce((acc, r) => acc + (r > 0 ? 1 : 0), 0);

      const stepRecord = {
        step,
        time_ms: step,
        phase: isBaseline ? "BASELINE" : isStimulus ? "STIMULUS" : "POST",
        active_neuron_count: activeNeuronCount,
        dn_rates: {
          forward: +fwdRate.toFixed(3),
          backward: +backRate.toFixed(3),
          turn_left: +turnLRate.toFixed(3),
          turn_right: +turnRRate.toFixed(3),
          escape: +escapeRate.toFixed(3),
          groom: +groomRate.toFixed(3),
        },
        candidate_strengths: candStrengths,
        candidate_entropy: +entropy.toFixed(4),
        winning_candidate: winningCandidate,
      };

      timeSeries.push(stepRecord);

      if (isBaseline) baselineDnReadouts.push(stepRecord.dn_rates);
      else if (isStimulus) stimulusDnReadouts.push(stepRecord.dn_rates);
      else if (isPost) postDnReadouts.push(stepRecord.dn_rates);
    }

    // Aggregate metrics
    const meanOf = (arr, key) => (arr.length ? arr.reduce((a, b) => a + b[key], 0) / arr.length : 0);

    const meanStimulusLeft = meanOf(stimulusDnReadouts, "turn_left");
    const meanStimulusRight = meanOf(stimulusDnReadouts, "turn_right");
    const meanStimulusFwd = meanOf(stimulusDnReadouts, "forward");
    const meanStimulusBack = meanOf(stimulusDnReadouts, "backward");
    const meanStimulusEscape = meanOf(stimulusDnReadouts, "escape");
    const meanStimulusGroom = meanOf(stimulusDnReadouts, "groom");

    const steeringBias = +(meanStimulusLeft - meanStimulusRight).toFixed(3);
    const peakLeftRightDiff = +(peakDnLeft - peakDnRight).toFixed(3);

    // Winner distribution across stimulus phase
    const stimWinners = timeSeries.slice(this.baselineSteps, this.baselineSteps + this.stimulusSteps).map((s) => s.winning_candidate);
    const winnerCounts = {};
    for (const w of stimWinners) winnerCounts[w] = (winnerCounts[w] || 0) + 1;

    let dominantWinner = "halt";
    let dominantCount = 0;
    for (const [w, c] of Object.entries(winnerCounts)) {
      if (c > dominantCount) {
        dominantCount = c;
        dominantWinner = w;
      }
    }

    return {
      population: config.population,
      intensity,
      pattern,
      laterality,
      seed,
      isShuffled,
      silencedNeuronsCount: silenced ? silenced.size : 0,
      peaks: {
        turn_left: +peakDnLeft.toFixed(3),
        turn_right: +peakDnRight.toFixed(3),
        forward: +peakDnForward.toFixed(3),
        backward: +peakDnBackward.toFixed(3),
        escape: +peakDnEscape.toFixed(3),
        groom: +peakDnGroom.toFixed(3),
        peak_left_right_diff: peakLeftRightDiff,
      },
      stimulus_means: {
        turn_left: +meanStimulusLeft.toFixed(3),
        turn_right: +meanStimulusRight.toFixed(3),
        forward: +meanStimulusFwd.toFixed(3),
        backward: +meanStimulusBack.toFixed(3),
        escape: +meanStimulusEscape.toFixed(3),
        groom: +meanStimulusGroom.toFixed(3),
      },
      steering_bias: steeringBias,
      onset_latency_ms: onsetStep ?? -1,
      settling_time_ms: settlingStep ?? -1,
      dominant_winner: dominantWinner,
      dominant_winner_fraction: +(dominantCount / this.stimulusSteps).toFixed(3),
      winner_distribution: winnerCounts,
      mean_candidate_entropy: +(timeSeries.slice(this.baselineSteps, this.baselineSteps + this.stimulusSteps).reduce((a, s) => a + s.candidate_entropy, 0) / this.stimulusSteps).toFixed(4),
      time_series: timeSeries,
    };
  }
}
