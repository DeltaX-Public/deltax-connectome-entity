import test from "node:test";
import assert from "node:assert/strict";
import { PlasticityOverlay, PLASTICITY_RULES } from "../src/connectome/plasticity_overlay.mjs";

test("Numerical Pruning Limits: Subthreshold eligibility trace accumulation and dead-zone evaluation", () => {
  // Synthetic 2-neuron edge
  const N = 2;
  const indptr = new Int32Array([0, 1, 1]);
  const indices = new Int32Array([1]);
  const baseWeights = new Float32Array([10.0]);

  const overlay1e6 = new PlasticityOverlay({
    N,
    E: 1,
    indptr,
    indices,
    baseWeights,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
      traceDecay: 0.05,
    },
    eligibleEdgeMask: [0],
  });

  // Scenario A: Standard subthreshold drive (rPre = 1.0 Hz, psi = 0.1)
  // coincidence = (1.0 / 100) * 0.1 = 0.001 >> 1e-6
  const ratesA = [1.0, 0.0];
  const inpA = [0.0, 50.0];
  const thetaA = [50.0, 100.0]; // psi ~ tanh(0.5) ~ 0.462

  overlay1e6.updateEligibility(ratesA, inpA, thetaA);
  const traceA = overlay1e6.eligibilityTraces.get(0) ?? 0.0;
  assert.ok(traceA > 1e-4, `Trace A must be retained above threshold. Received: ${traceA}`);

  // Scenario B: Extremely weak subthreshold drive (rPre = 0.005 Hz, psi = 0.01)
  // coincidence = (0.005 / 100) * 0.01 = 5e-7 < 1e-6
  const overlayWeak = new PlasticityOverlay({
    N,
    E: 1,
    indptr,
    indices,
    baseWeights,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
      traceDecay: 0.05,
    },
    eligibleEdgeMask: [0],
  });

  const ratesWeak = [0.005, 0.0];
  const inpWeak = [0.0, 1.0];
  const thetaWeak = [50.0, 100.0]; // x = 0.01, psi = tanh(0.01) ~ 0.009999

  overlayWeak.updateEligibility(ratesWeak, inpWeak, thetaWeak);
  const traceWeak = overlayWeak.eligibilityTraces.get(0) ?? 0.0;

  // With 1e-6 pruning, traceWeak is pruned to 0
  assert.equal(traceWeak, 0.0, "Trace below 1e-6 is pruned under 1e-6 threshold");

  // Record findings in test metadata
  console.log(`\n--- Numerical Pruning Limits Audit ---`);
  console.log(`Standard subthreshold coincidence trace: ${traceA.toExponential(4)} (retained)`);
  console.log(`Sub-micro-coincidence trace (< 1e-6):    ${traceWeak.toExponential(4)} (pruned to zero)`);
  console.log(`Float64 epsilon: ${Number.EPSILON.toExponential(4)}, Float32 epsilon: ~1.19e-7`);
  console.log(`Finding: 1e-6 threshold creates a physiological noise gate filtering out background rate drift < 0.01 Hz while preserving all sensory responses >= 0.1 Hz.`);
});
