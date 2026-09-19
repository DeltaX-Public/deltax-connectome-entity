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

import {
  READOUT_MODES,
  generateCandidates_A_Current,
  generateCandidates_B_Upstream,
  generateCandidates_C_IndependentAxes,
} from "./candidate_readouts.mjs";

export { READOUT_MODES };

export class ConnectomeCandidateBridge {
  constructor(opts = {}) {
    this.readoutMode = opts.readoutMode ?? READOUT_MODES.READOUT_A_CURRENT;
    if (this.readoutMode === READOUT_MODES.READOUT_C_INDEPENDENT_AXES) {
      this.fwdScale = opts.fwdScale ?? 3.0;
      this.turnScale = opts.turnScale ?? 1.5;
      this.backScale = opts.backScale ?? 3.0;
      this.escapeScale = opts.escapeScale ?? 30.0;
      this.groomScale = opts.groomScale ?? 20.0;
    } else {
      this.fwdScale = opts.fwdScale ?? 15.0;
      this.turnScale = opts.turnScale ?? 20.0;
      this.escapeScale = opts.escapeScale ?? 50.0;
      this.groomScale = opts.groomScale ?? 40.0;
    }
  }


  /**
   * Generate candidate action field from connectome descending neuron readouts.
   *
   * @param {Object} dnReadouts Output of ConnectomeRuntime.getDescendingNeuronReadouts()
   * @param {number} tick Integer step / tick sequence
   * @returns {Array<Object>} Array of schema-valid candidate action objects
   */
  generateCandidates(dnReadouts, tick = 1) {
    if (this.readoutMode === READOUT_MODES.READOUT_B_UPSTREAM_REFERENCE) {
      return generateCandidates_B_Upstream(dnReadouts, tick);
    }
    if (this.readoutMode === READOUT_MODES.READOUT_C_INDEPENDENT_AXES) {
      return generateCandidates_C_IndependentAxes(dnReadouts, tick, {
        fwdScale: this.fwdScale,
        turnScale: this.turnScale,
        backScale: this.backScale,
        escapeScale: this.escapeScale,
        groomScale: this.groomScale,
      });
    }
    return generateCandidates_A_Current(dnReadouts, tick, {
      fwdScale: this.fwdScale,
      turnScale: this.turnScale,
      escapeScale: this.escapeScale,
      groomScale: this.groomScale,
    });
  }
}


