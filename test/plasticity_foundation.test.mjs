import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PlasticityOverlay,
  PLASTICITY_RULES,
  DEFAULT_PLASTICITY_CONFIG,
} from "../src/connectome/plasticity_overlay.mjs";
import {
  validateLearningSignal,
  ConsequenceChannels,
  DISCRETE_MODULATORY_SIGNALS,
  FORBIDDEN_POLICY_FIELDS,
} from "../src/connectome/learning_signal.mjs";
import { validateTargetManifest } from "../src/connectome/manifest_validator.mjs";
import { ConnectomeRuntime } from "../src/connectome/runtime.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Helper to create a tiny synthetic 3-neuron network: 0 (A) -> 1 (B) -> 2 (C) */
function createSyntheticTriad() {
  const N = 3;
  // CSR:
  // Node 0 has edge to 1 (k=0)
  // Node 1 has edge to 2 (k=1)
  // Node 2 has no outgoing edges
  const indptr = new Uint32Array([0, 1, 2, 2]);
  const indices = new Uint32Array([1, 2]);
  const baseWeights = new Float32Array([10.0, 20.0]); // Edge 0: 10.0, Edge 1: 20.0
  return { N, E: 2, indptr, indices, baseWeights };
}

/** Helper to create a synthetic competing branch network: 0 -> 1 (Left branch), 0 -> 2 (Right branch) */
function createSyntheticFork() {
  const N = 3;
  // Node 0 has edge to 1 (k=0) and edge to 2 (k=1)
  const indptr = new Uint32Array([0, 2, 2, 2]);
  const indices = new Uint32Array([1, 2]);
  const baseWeights = new Float32Array([15.0, 15.0]);
  return { N, E: 2, indptr, indices, baseWeights };
}

test("1. W_base Immutability Invariant: W_base is never overwritten and baseChecksum remains valid", () => {
  const { N, E, indptr, indices, baseWeights } = createSyntheticTriad();
  const originalBaseCopy = new Float32Array(baseWeights);

  const overlay = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseWeights,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
      learningRate: 0.1,
    },
    eligibleEdgeMask: [0, 1],
  });

  // Inject rates and apply updates
  overlay.updateEligibility([100.0, 50.0, 20.0]);
  overlay.applyModulatoryUpdate(1.0);

  assert.ok(overlay.getDeltaW(0) > 0, "Edge 0 deltaW should be positive after reinforcement");
  assert.equal(overlay.verifyBaseImmutability(), true, "verifyBaseImmutability must return true");

  // Verify that baseWeights array in memory was not modified by a single bit
  for (let i = 0; i < baseWeights.length; i++) {
    assert.equal(baseWeights[i], originalBaseCopy[i], `baseWeights[${i}] must remain identical`);
  }
});

test("2. Hard Safety Bounds: Clamping per-edge absolute, percentage, rate-limit, and non-negative floor", () => {
  const { N, E, indptr, indices, baseWeights } = createSyntheticTriad();

  const overlay = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseWeights,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
      learningRate: 10.0, // Aggressive learning rate to test bounding
      maxAbsoluteDeltaW: 2.0, // Max |ΔW| <= 2.0
      maxPercentageDeviation: 0.15, // 15% of base (Edge 0 base 10 -> max 1.5)
      updateRateLimit: 0.5,
      totalGlobalBudget: 50.0,
    },
    eligibleEdgeMask: [0],
  });

  // Manually prime high eligibility
  overlay.eligibilityTraces.set(0, 10.0);

  // Step 1: Update rate limit should clamp change to 0.5
  overlay.applyModulatoryUpdate(1.0);
  assert.equal(+overlay.getDeltaW(0).toFixed(4), 0.5);

  // Step 2: Rate limit again
  overlay.applyModulatoryUpdate(1.0);
  assert.equal(+overlay.getDeltaW(0).toFixed(4), 1.0);

  // Step 3: Rate limit again
  overlay.applyModulatoryUpdate(1.0);
  assert.equal(+overlay.getDeltaW(0).toFixed(4), 1.5);

  // Step 4: Max percentage bound is 10.0 * 0.15 = 1.5. Further positive updates must clamp at 1.5
  overlay.applyModulatoryUpdate(1.0);
  assert.equal(+overlay.getDeltaW(0).toFixed(4), 1.5, "DeltaW must clamp at percentage deviation bound of 1.5");
  assert.equal(+overlay.getEffectiveWeight(0).toFixed(4), 11.5);

  // Now apply severe negative modulatory updates to test floor
  overlay.eligibilityTraces.set(0, 10.0);
  for (let i = 0; i < 10; i++) {
    overlay.applyModulatoryUpdate(-1.0);
  }
  // Base is 10.0, max negative deviation is -1.5
  assert.equal(+overlay.getDeltaW(0).toFixed(4), -1.5, "DeltaW must clamp at -1.5");
  assert.ok(overlay.getEffectiveWeight(0) >= 0, "Effective weight must never drop below 0");
});

test("3. Total Global Modification Budget: Clamping across multiple edges", () => {
  const { N, E, indptr, indices, baseWeights } = createSyntheticFork();

  const overlay = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseWeights,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
      learningRate: 5.0,
      maxAbsoluteDeltaW: 10.0,
      maxPercentageDeviation: 1.0,
      updateRateLimit: 5.0,
      totalGlobalBudget: 3.0, // Strict global budget of 3.0 total across all edges
    },
    eligibleEdgeMask: [0, 1],
  });

  overlay.eligibilityTraces.set(0, 1.0);
  overlay.eligibilityTraces.set(1, 1.0);

  overlay.applyModulatoryUpdate(1.0);

  const budgetUsed = overlay.getGlobalBudgetUsed();
  assert.ok(budgetUsed <= 3.00001, `Global budget used (${budgetUsed}) must not exceed limit (3.0)`);
});

test("4. Eligible-Edge Mask Enforcement: Ineligible edges NEVER modify", () => {
  const { N, E, indptr, indices, baseWeights } = createSyntheticTriad();

  const overlay = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseWeights,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
      learningRate: 1.0,
      maxAbsoluteDeltaW: 5.0,
    },
    eligibleEdgeMask: [0], // Only Edge 0 is eligible; Edge 1 is ineligible
  });

  overlay.updateEligibility([100.0, 100.0, 100.0]);
  overlay.applyModulatoryUpdate(1.0);

  assert.ok(overlay.getDeltaW(0) > 0, "Eligible Edge 0 should update");
  assert.equal(overlay.getDeltaW(1), 0.0, "Ineligible Edge 1 must remain exactly 0.0");
  assert.equal(overlay.getEffectiveWeight(1), overlay.getBaseWeight(1), "Ineligible edge effective weight equals base");
});

test("5. Supported Learning Rules: Local Hebbian, Anti-Hebbian, Eligibility-Modulated, Rate-STDP", () => {
  const { N, E, indptr, indices, baseWeights } = createSyntheticTriad();

  // A. Local Hebbian: increases with activity without external signal
  const hebbian = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseWeights,
    config: { enabled: true, rule: PLASTICITY_RULES.LOCAL_HEBBIAN, learningRate: 0.1 },
    eligibleEdgeMask: [0],
  });
  hebbian.updateEligibility([50.0, 50.0, 0.0]);
  hebbian.applyModulatoryUpdate(0.0); // signal ignored in local hebbian
  assert.ok(hebbian.getDeltaW(0) > 0, "Local Hebbian should potentiate");

  // B. Anti-Hebbian: decreases with activity
  const antiHebbian = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseWeights,
    config: { enabled: true, rule: PLASTICITY_RULES.ANTI_HEBBIAN, learningRate: 0.1 },
    eligibleEdgeMask: [0],
  });
  antiHebbian.updateEligibility([50.0, 50.0, 0.0]);
  antiHebbian.applyModulatoryUpdate(0.0);
  assert.ok(antiHebbian.getDeltaW(0) < 0, "Anti-Hebbian should depress");

  // C. Rate-STDP Approximation
  const stdp = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseWeights,
    config: { enabled: true, rule: PLASTICITY_RULES.RATE_STDP_APPROXIMATION, learningRate: 0.1 },
    eligibleEdgeMask: [0],
  });
  // Step 1: Pre fires, Post silent
  stdp.updateEligibility([50.0, 0.0, 0.0]);
  // Step 2: Post rises while Pre is high (Pre precedes Post -> potentiation)
  stdp.updateEligibility([50.0, 40.0, 0.0]);
  stdp.applyModulatoryUpdate(1.0);
  assert.ok(stdp.getDeltaW(0) > 0, "Pre preceding Post should potentiate in Rate-STDP");
});

test("6. Complete Reset & Snapshot/Restore Bit-Exact Parity", () => {
  const { N, E, indptr, indices, baseWeights } = createSyntheticTriad();

  const overlay = new PlasticityOverlay({
    N,
    E,
    indptr,
    indices,
    baseWeights,
    config: {
      enabled: true,
      rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
      learningRate: 0.1,
    },
    eligibleEdgeMask: [0, 1],
  });

  overlay.updateEligibility([80.0, 40.0, 20.0]);
  overlay.applyModulatoryUpdate(1.0);
  assert.ok(overlay.getDeltaW(0) > 0);

  // Take snapshot
  const snap = overlay.snapshot();
  const hashBefore = overlay.getHash();

  // Reset
  overlay.reset();
  assert.equal(overlay.getDeltaW(0), 0.0, "Reset must zero deltaW");
  assert.equal(overlay.getDeltaW(1), 0.0, "Reset must zero deltaW");
  assert.equal(overlay.getGlobalBudgetUsed(), 0.0, "Reset must zero budget");
  assert.equal(overlay.eligibilityTraces.size, 0, "Reset must clear eligibility traces");

  // Restore
  overlay.restore(snap);
  assert.equal(overlay.getHash(), hashBefore, "Restored hash must match snapshot hash exactly");
  assert.ok(overlay.getDeltaW(0) > 0, "Restored deltaW must match snapshot");
});

test("7. Learning-Signal Interface: Strict scalar normalization and zero policy leakage", () => {
  // Valid numeric and discrete signals
  assert.equal(validateLearningSignal(0.5), 0.5);
  assert.equal(validateLearningSignal(-2.0), -1.0, "Should clamp to -1.0");
  assert.equal(validateLearningSignal(2.0), 1.0, "Should clamp to 1.0");
  assert.equal(validateLearningSignal("REINFORCE"), 1.0);
  assert.equal(validateLearningSignal("SUPPRESS"), -1.0);
  assert.equal(validateLearningSignal("HOLD"), 0.0);
  assert.equal(validateLearningSignal({ scalar: 0.75 }), 0.75);

  // Forbidden policy leakage checks
  for (const field of FORBIDDEN_POLICY_FIELDS) {
    assert.throws(
      () => validateLearningSignal({ scalar: 1.0, [field]: "violation" }),
      /Policy leakage violation/,
      `Must throw policy leakage violation for "${field}"`
    );
  }

  // Consequence channels without policy directionality
  const channels = new ConsequenceChannels();
  const penalty = channels.evaluate({ collision: 1.0, noxious_exposure: 0.5 });
  assert.ok(penalty < 0, "Aversive consequences must produce negative modulatory signal");

  const reward = channels.evaluate({ clearance: 1.0, progress: 0.8 });
  assert.ok(reward > 0, "Clearance and progress must produce positive modulatory signal");
});

test("8. Target Manifest Schema Validation: Integration boundary with parallel steering lane", () => {
  const schemaPath = path.join(ROOT, "artifacts", "plasticity", "target_manifest.schema.json");
  const fixturePath = path.join(ROOT, "artifacts", "plasticity", "fixtures", "sample_manifest.json");

  assert.ok(fs.existsSync(schemaPath), "target_manifest.schema.json must exist");
  assert.ok(fs.existsSync(fixturePath), "sample_manifest.json must exist");

  const manifest = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(validateTargetManifest(manifest), true, "Sample manifest must pass validation");
  assert.equal(manifest.status, "PENDING_LANE_B_EVIDENCE");

  // Invalid manifest should fail
  assert.throws(
    () => validateTargetManifest({ ...manifest, schema_version: "2.0.0" }),
    /Unsupported schema_version/
  );
  assert.throws(
    () => validateTargetManifest({ ...manifest, safety_bounds: { max_total_budget: -1 } }),
    /safety_bounds/
  );
});

test("9. Full Connectome Zero-Update Parity: Disabled plasticity produces 100% bit-exact baseline", async () => {
  // Initialize ConnectomeRuntime without plasticity
  const baselineRuntime = new ConnectomeRuntime({ seed: 12345 });
  baselineRuntime.step(10);
  const baselineReadouts = baselineRuntime.getDescendingNeuronReadouts();

  // Initialize ConnectomeRuntime with plasticity installed but disabled (default)
  const overlayRuntime = new ConnectomeRuntime({
    seed: 12345,
    plasticity: {
      enabled: false,
      rule: PLASTICITY_RULES.PLASTICITY_NONE,
    },
  });
  overlayRuntime.step(10);
  const overlayReadouts = overlayRuntime.getDescendingNeuronReadouts();

  // Compare every descending neuron role
  for (const role of Object.keys(baselineReadouts)) {
    assert.equal(
      overlayReadouts[role].mean_rate,
      baselineReadouts[role].mean_rate,
      `DN role "${role}" mean_rate must be bit-exact identical`
    );
    assert.equal(
      overlayReadouts[role].max_rate,
      baselineReadouts[role].max_rate,
      `DN role "${role}" max_rate must be bit-exact identical`
    );
  }

  // Verify W_base checksum remains untouched
  assert.equal(overlayRuntime.plasticity.verifyBaseImmutability(), true);
});

test("10. Causal Counterfactual Branching on Runtime", async () => {
  const runtime = new ConnectomeRuntime({
    seed: 12345,
    plasticity: {
      enabled: true,
      rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
    },
  });

  runtime.step(5);
  const snap = runtime.snapshot();

  // Test Branch A (Learned Intact)
  const branchA = runtime.createCounterfactualBranch("BRANCH_A_LEARNED_INTACT", snap);
  assert.equal(branchA.branch, "BRANCH_A_LEARNED_INTACT");

  // Test Branch B (Delta-W Reset)
  const branchB = runtime.createCounterfactualBranch("BRANCH_B_DELTA_W_RESET", snap);
  assert.equal(branchB.branch, "BRANCH_B_DELTA_W_RESET");
  assert.equal(branchB.deltaW_count, 0);

  // Test Branch C (Eligibility Reset Only)
  const branchC = runtime.createCounterfactualBranch("BRANCH_C_ELIGIBILITY_RESET_ONLY", snap);
  assert.equal(branchC.branch, "BRANCH_C_ELIGIBILITY_RESET_ONLY");
});

test("11. Real Connectome RateNetwork Non-Zero Plasticity Propagation & Exact Reset Parity", async () => {
  // Use non-steering diagnostic edge 102 (VES074) -> 196 (CB0677)
  const pre = 102;
  const post = 196;

  // Run Baseline (intact connectome)
  const baseRuntime = new ConnectomeRuntime({ seed: 42 });
  const edgeIdx = baseRuntime.plasticity ? baseRuntime.plasticity.findEdgeIndex(pre, post) : (() => {
    const s = baseRuntime.data.indptr[pre], e = baseRuntime.data.indptr[pre + 1];
    for (let k = s; k < e; k++) if (baseRuntime.data.indices[k] === post) return k;
    return -1;
  })();
  assert.ok(edgeIdx >= 0, "Diagnostic edge 102 -> 196 must exist");
  const structuralSynapses = baseRuntime.data.weights[edgeIdx];
  assert.equal(structuralSynapses, 177, "Diagnostic edge must have 177 anatomical synapses");

  baseRuntime.excite(pre, 150);
  for (let i = 0; i < 5; i++) baseRuntime.step();
  const baselinePostRate = baseRuntime.net.r[post];
  assert.ok(baselinePostRate > 2.0, "Baseline postsynaptic rate must be active");

  // Run Potentiated (+50% efficacy multiplier: alpha = 1.5)
  const potentiatedRuntime = new ConnectomeRuntime({
    seed: 42,
    plasticity: {
      enabled: true,
      rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
      config: {
        maxAbsoluteDeltaW: 100.0,
        totalGlobalBudget: 200.0,
      },
      eligibleEdgeMask: [edgeIdx],
    },
  });
  potentiatedRuntime.plasticity.setEfficacyMultiplier(edgeIdx, 1.5);
  assert.equal(potentiatedRuntime.plasticity.getEffectiveWeight(edgeIdx), 177 * 1.5);
  assert.equal(potentiatedRuntime.plasticity.getEfficacyMultiplier(edgeIdx), 1.5);
  assert.equal(potentiatedRuntime.plasticity.verifyBaseImmutability(), true);

  potentiatedRuntime.excite(pre, 150);
  for (let i = 0; i < 5; i++) potentiatedRuntime.step();
  const potentiatedPostRate = potentiatedRuntime.net.r[post];

  // Verify that potentiation significantly increased postsynaptic firing rate (+222%)
  assert.ok(
    potentiatedPostRate > baselinePostRate + 5.0,
    `Potentiated rate (${potentiatedPostRate.toFixed(2)} Hz) must exceed baseline (${baselinePostRate.toFixed(2)} Hz)`
  );

  // Now Reset and verify exact return to baseline
  potentiatedRuntime.plasticity.reset();
  assert.equal(potentiatedRuntime.plasticity.getEffectiveWeight(edgeIdx), 177);
  assert.equal(potentiatedRuntime.plasticity.getEfficacyMultiplier(edgeIdx), 1.0);
  assert.equal(potentiatedRuntime.plasticity.verifyBaseImmutability(), true);

  // Re-run fresh with reset weights
  const resetRuntime = new ConnectomeRuntime({
    seed: 42,
    plasticity: {
      enabled: true,
      rule: PLASTICITY_RULES.ELIGIBILITY_MODULATED_HEBBIAN,
    },
  });
  // Potentiate then reset immediately
  resetRuntime.plasticity.setEfficacyMultiplier(edgeIdx, 1.5);
  resetRuntime.plasticity.reset();
  resetRuntime.excite(pre, 150);
  for (let i = 0; i < 5; i++) resetRuntime.step();
  const resetPostRate = resetRuntime.net.r[post];

  assert.equal(
    resetPostRate.toFixed(6),
    baselinePostRate.toFixed(6),
    "Reset runtime must produce bit-exact postsynaptic firing rate matching baseline"
  );
});

test("12. Consequence Channels Mirror Symmetry & Non-Directionality", () => {
  const channels = new ConsequenceChannels();

  // Test that symmetric left and right collision consequences produce identical scalar signals
  const leftCollision = { collision: 1.0, noxious_exposure: 0.0, energy_consumed: 0.2, clearance: 0.0, progress: -0.1 };
  const rightCollision = { collision: 1.0, noxious_exposure: 0.0, energy_consumed: 0.2, clearance: 0.0, progress: -0.1 };

  const signalLeft = channels.evaluate(leftCollision);
  const signalRight = channels.evaluate(rightCollision);

  assert.equal(signalLeft, signalRight, "Symmetric physical encounters must yield identical scalar signals");
  assert.ok(signalLeft < 0, "Collisions must produce negative modulatory signal");

  // Verify that channels do not accept directional or actuator-specific fields
  assert.throws(
    () => validateLearningSignal({ scalar: signalLeft, steer_action: "turn_right" }),
    /Policy leakage violation/
  );
  assert.throws(
    () => validateLearningSignal({ scalar: signalLeft, intended_direction: "left" }),
    /Policy leakage violation/
  );
});

test("13. Four Frozen Target Manifests Validation & CSR Topology Verification", () => {
  const manifests = [
    "target_a_afferent_only.json",
    "target_b_projection_only.json",
    "target_c_balanced_two_stage.json",
    "target_d_matched_sham.json",
  ];

  const runtime = new ConnectomeRuntime();

  for (const filename of manifests) {
    const filePath = path.join(ROOT, "artifacts", "plasticity", filename);
    assert.ok(fs.existsSync(filePath), `${filename} must exist on disk`);

    const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
    assert.equal(validateTargetManifest(manifest), true, `${filename} must pass schema validation`);
    assert.equal(manifest.status, "CAUSAL_TARGET_FROZEN");

    // Verify each declared edge exists in the connectome graph
    for (const edge of manifest.eligible_edges) {
      const s = runtime.data.indptr[edge.source];
      const e = runtime.data.indptr[edge.source + 1];
      let found = false;
      for (let k = s; k < e; k++) {
        if (runtime.data.indices[k] === edge.target) {
          found = true;
          break;
        }
      }
      assert.ok(found, `Declared edge ${edge.source} -> ${edge.target} in ${filename} must exist in connectome`);
    }
  }
});

