import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const { ConnectomeRuntime } = await import(
  path.join(ROOT, "src", "connectome", "runtime.mjs")
);
const {
  PlasticityOverlay,
  PLASTICITY_RULES,
  EFFECTIVE_EDGE_POLICIES,
  DEFAULT_PLASTICITY_CONFIG,
} = await import(
  path.join(ROOT, "src", "connectome", "plasticity_overlay.mjs")
);
const {
  runStandardizedIsolatedProbe,
  assertValidCandidate,
  extractCandidateTelemetry,
} = await import(
  path.join(ROOT, "src", "connectome", "isolated_probe.mjs")
);
const { generateCandidates_C_IndependentAxes } = await import(
  path.join(ROOT, "src", "connectome", "candidate_readouts.mjs")
);

test("Fidelity 1: Fractional learned weights survive clone exactly in Float32 representation", () => {
  // Find an edge with base weight >= 10 that is retained under minSyn=5
  const probeRuntimeInit = new ConnectomeRuntime({ seed: 18100 });
  let retainedEdgeIdx = -1;
  for (let k = 0; k < probeRuntimeInit.E; k++) {
    if (probeRuntimeInit.net.weights[k] >= 10) {
      retainedEdgeIdx = k;
      break;
    }
  }
  assert.ok(retainedEdgeIdx >= 0, "Must find a retained edge");

  const runtime = new ConnectomeRuntime({
    seed: 18100,
    substepsPerTick: 1,
    plasticity: {
      config: {
        enabled: true,
        rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
        maxAbsoluteDeltaW: 20.0,
      },
      eligibleEdgeMask: [retainedEdgeIdx],
    },
  });

  // Assign fractional learned deltaW to eligible retained edge
  const baseW = runtime.plasticity.getBaseWeight(retainedEdgeIdx);
  const targetFractionalW = baseW + 3.141592;
  const alpha = targetFractionalW / baseW;
  const success = runtime.plasticity.setEfficacyMultiplier(retainedEdgeIdx, alpha);
  assert.equal(success, true, "Must successfully set efficacy on retained edge");

  const activeWTraining = runtime.net.weights[retainedEdgeIdx];
  assert.ok(Math.abs(activeWTraining - targetFractionalW) < 1e-4, "Training weight should hold float value");

  // Create isolated clone
  const clone = runtime.cloneForProbe({ probeType: "FRESH_EVOKED", disablePlasticity: true });

  assert.ok(clone.net.weights instanceof Float32Array, "Clone net.weights MUST be Float32Array");
  const activeWClone = clone.net.weights[retainedEdgeIdx];
  assert.equal(activeWClone, activeWTraining, "Clone must preserve exact float active weight without integer truncation");
});

test("Fidelity 2: Initially filtered edge obeys Model A and Model B declared policies", () => {
  // Edge with base synapse count 3 (filtered out under minSyn=5)
  // Let's create a minimal CSR fixture
  const N = 4;
  const E = 3;
  const indptr = new Int32Array([0, 2, 3, 3, 3]);
  const indices = new Int32Array([1, 2, 3]);
  const baseSynapses = new Uint16Array([10, 3, 8]); // Edge 1 has base 3 (< 5)
  const initialActive = new Float32Array([10, 0, 8]); // Edge 1 filtered out to 0

  // Model A: Retained Only
  const netWeightsA = initialActive.slice();
  const overlayA = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseSynapseCounts: baseSynapses,
    netWeights: netWeightsA,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.LOCAL_HEBBIAN,
      effectiveEdgePolicy: EFFECTIVE_EDGE_POLICIES.MODEL_A_RETAINED_ONLY,
    },
    eligibleEdgeMask: [0, 1, 2],
  });

  // Attempt to modify filtered edge 1 in Model A
  const resA = overlayA.setEfficacyMultiplier(1, 2.0);
  assert.equal(resA, false, "Model A must reject modification on filtered non-retained connection");
  assert.equal(netWeightsA[1], 0, "Model A filtered connection must remain strictly 0");
  assert.equal(overlayA.getActiveCouplingBudget(), 0, "Model A active coupling budget must be 0");
  assert.equal(overlayA.getActivatedEdgeCount(), 0, "Model A revived edge count must be 0");

  // Model B: Explicit Revival
  const netWeightsB = initialActive.slice();
  const overlayB = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseSynapseCounts: baseSynapses,
    netWeights: netWeightsB,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.LOCAL_HEBBIAN,
      effectiveEdgePolicy: EFFECTIVE_EDGE_POLICIES.MODEL_B_EXPLICIT_REVIVAL,
      maxAbsoluteDeltaW: 10.0,
      totalGlobalBudget: 100.0,
    },
    eligibleEdgeMask: [0, 1, 2],
  });

  // Potentiate edge 1: base=3, alpha=2.0 -> eff=6.0 >= 5 -> revives!
  const resB = overlayB.setEfficacyMultiplier(1, 2.0);
  assert.equal(resB, true, "Model B allows modification of eligible edges");
  assert.equal(netWeightsB[1], 6.0, "Model B must activate edge once effective weight >= 5");
  assert.equal(overlayB.getActiveCouplingBudget(), 6.0, "Model B reports active coupling change of 6.0");
  assert.equal(overlayB.getActivatedEdgeCount(), 1, "Model B reports exactly 1 revived edge");
});

test("Fidelity 3: Nondefault runtime parameters preserved in clone", () => {
  const customRateParams = {
    dt: 0.25,
    b: 2.5,
    snap: 0.02,
  };

  const runtime = new ConnectomeRuntime({
    seed: 18100,
    rateParams: customRateParams,
  });

  const clone = runtime.cloneForProbe({ probeType: "FRESH_EVOKED" });

  assert.equal(clone.net.p.dt, 0.25, "dt preserved in clone");
  assert.equal(clone.net.p.b, 2.5, "b preserved in clone");
  assert.equal(clone.net.p.snap, 0.02, "snap preserved in clone");
});

test("Fidelity 4: Snapshot inventory captures _steps, sensoryDrives, and spikeCount", () => {
  const runtime = new ConnectomeRuntime({ seed: 18100 });
  runtime.setSensoryDrives(new Map([[149560, 150.0]]));
  runtime.step(); // runs 1 tick = 10 substeps

  const snap = runtime.snapshot();
  assert.ok("steps" in snap, "Snapshot must contain steps");
  assert.equal(snap.steps, 10, "Snapshot steps must match net._steps (10 substeps)");
  assert.ok("sensoryDrives" in snap, "Snapshot must contain sensoryDrives");
  assert.equal(snap.sensoryDrives.length, 1);
  assert.equal(snap.sensoryDrives[0][0], 149560);
  assert.equal(snap.sensoryDrives[0][1], 150.0);

  const target = new ConnectomeRuntime({ seed: 18100 });
  target.restore(snap);

  assert.equal(target.net._steps, 10, "Restored steps must match");
  assert.equal(target.sensoryDrives.get(149560), 150.0, "Restored sensory drive must match");
});

test("Fidelity 5: Continuation probe preserves complete dynamical state across recomputation", () => {
  const runtime = new ConnectomeRuntime({ seed: 18100 });
  runtime.setSensoryDrives(new Map([[149560, 180.0]]));
  runtime.step(10);

  // Take continuation clone
  const clone = runtime.cloneForProbe({ probeType: "CONTINUATION", disablePlasticity: true });

  assert.equal(clone.net.t, runtime.net.t, "Continuation probe preserves time t");
  assert.equal(clone.net._steps, runtime.net._steps, "Continuation probe preserves _steps");

  // Direct array comparison of rates and inputs
  let maxRateDiff = 0;
  let maxInpDiff = 0;
  for (let i = 0; i < runtime.N; i++) {
    maxRateDiff = Math.max(maxRateDiff, Math.abs(clone.net.r[i] - runtime.net.r[i]));
    maxInpDiff = Math.max(maxInpDiff, Math.abs(clone.net.inp[i] - runtime.net.inp[i]));
  }
  assert.equal(maxRateDiff, 0, "All rates bit-identical in continuation clone");
  assert.equal(maxInpDiff, 0, "All inputs bit-identical in continuation clone");

  // Trigger input recompute on clone
  clone.net.recomputeInput();
  let maxRecomputeDiff = 0;
  for (let i = 0; i < runtime.N; i++) {
    maxRecomputeDiff = Math.max(maxRecomputeDiff, Math.abs(clone.net.inp[i] - runtime.net.inp[i]));
  }
  assert.ok(maxRecomputeDiff < 1e-3, "Input recomputation matches training input cache");
});

test("Fidelity 6: Telemetry schema validation with positive, zero, and malformed controls", () => {
  // 1. Positive control: synthetic DN readout with strong turn_right drive
  const syntheticDNPositive = {
    turn_right: {
      weighted_mean: 4.5,
      mean_rate: 4.5,
      types: ["DNa02"],
      neurons: [{ index: 332, silenced: false }],
    },
    turn_left: { weighted_mean: 0.0, mean_rate: 0.0, types: [], neurons: [] },
    forward: { weighted_mean: 0.0, mean_rate: 0.0, types: [], neurons: [] },
    backward: { weighted_mean: 0.0, mean_rate: 0.0, types: [], neurons: [] },
  };

  const candsPos = generateCandidates_C_IndependentAxes(syntheticDNPositive, 1);
  const telPos = extractCandidateTelemetry(candsPos, "turn_right");
  assert.equal(telPos.present, true, "Positive control must propose turn_right");
  assert.ok(telPos.activation_strength > 0.5, "Positive control activation strength must be strong");
  assert.equal(telPos.candidate.action_class, "turn_right", "action_class must be turn_right");
  assert.ok(assertValidCandidate(telPos.candidate), "Schema validation must pass");

  // 2. Zero control: quiescent turn_right (left is stronger)
  const syntheticDNZero = {
    turn_right: { weighted_mean: 0.0, mean_rate: 0.0, types: ["DNa02"], neurons: [{ index: 332, silenced: false }] },
    turn_left: { weighted_mean: 5.0, mean_rate: 5.0, types: ["DNa02"], neurons: [{ index: 130496, silenced: false }] },
    forward: { weighted_mean: 0.0, mean_rate: 0.0, types: [], neurons: [] },
    backward: { weighted_mean: 0.0, mean_rate: 0.0, types: [], neurons: [] },
  };
  const candsZero = generateCandidates_C_IndependentAxes(syntheticDNZero, 1);
  const telZero = extractCandidateTelemetry(candsZero, "turn_right");
  assert.equal(telZero.present, true);
  assert.equal(telZero.activation_strength, 0, "Differential contrast should produce legitimate 0 turn_right");

  // 3. Malformed controls: must throw schema assertion errors
  assert.throws(() => {
    assertValidCandidate({ id: "cand_1", action: "TURN_RIGHT", confidence: 0.8 });
  }, /missing or invalid 'action_class'/, "Must reject legacy 'action'/'confidence' schema");

  assert.throws(() => {
    assertValidCandidate({ id: "cand_1", action_class: "turn_right", activation_strength: "not-a-number" });
  }, /'activation_strength' must be a finite number/, "Must reject non-number activation strength");

  assert.throws(() => {
    extractCandidateTelemetry([{ id: "bad", action_class: "turn_right" }], "turn_right");
  }, /'activation_strength' must be a finite number/, "Must fail closed on malformed candidate");
});

test("Fidelity 7: Safety defaults and mutation rejection invariants", () => {
  // Verify default limits
  assert.equal(DEFAULT_PLASTICITY_CONFIG.maxAbsoluteDeltaW, 5.0, "Production default maxAbsoluteDeltaW must be 5.0");
  assert.equal(DEFAULT_PLASTICITY_CONFIG.totalGlobalBudget, 100.0, "Production default totalGlobalBudget must be 100.0");

  const N = 3;
  const E = 2;
  const indptr = new Int32Array([0, 1, 2, 2]);
  const indices = new Int32Array([1, 2]);
  const baseSynapses = new Uint16Array([10, 10]);

  const overlay = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseSynapseCounts: baseSynapses,
    config: {
      enabled: false, // Disabled
      rule: PLASTICITY_RULES.PLASTICITY_NONE,
    },
    eligibleEdgeMask: [0],
  });

  // Rejects when disabled
  assert.equal(overlay.setEfficacyMultiplier(0, 1.5), false, "Must reject when disabled");

  overlay.config.enabled = true;
  overlay.config.rule = PLASTICITY_RULES.LOCAL_HEBBIAN;

  // Rejects invalid edge indices
  assert.equal(overlay.setEfficacyMultiplier(-1, 1.5), false, "Must reject negative edge index");
  assert.equal(overlay.setEfficacyMultiplier(100, 1.5), false, "Must reject out-of-range edge index");
  assert.equal(overlay.setEfficacyMultiplier(0.5, 1.5), false, "Must reject non-integer edge index");

  // Rejects ineligible edge
  assert.equal(overlay.setEfficacyMultiplier(1, 1.5), false, "Must reject ineligible edge 1");

  // Rejects non-finite values
  assert.equal(overlay.setEfficacyMultiplier(0, NaN), false, "Must reject NaN");
  assert.equal(overlay.setEfficacyMultiplier(0, Infinity), false, "Must reject Infinity");
  assert.equal(overlay.setEfficacyMultiplier(0, -1.0), false, "Must reject negative alpha");

  // Failed restore leaves receiver unchanged
  overlay.setEfficacyMultiplier(0, 1.2);
  const initialAlpha = overlay.getEfficacyMultiplier(0);
  assert.throws(() => {
    overlay.restore({ deltaW: [["bad_edge", 5.0]], eligibilityTraces: [] });
  });
  assert.equal(overlay.getEfficacyMultiplier(0), initialAlpha, "Failed restore must leave receiver untouched");
});
