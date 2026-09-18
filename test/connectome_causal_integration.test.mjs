import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { ConnectomeRuntime } from "../src/connectome/runtime.mjs";
import { ConnectomeSensoryTransduction } from "../src/connectome/sensory_transduction.mjs";
import { ConnectomeCandidateBridge } from "../src/connectome/candidate_bridge.mjs";
import { ConnectomeClosedLoop } from "../src/connectome/closed_loop.mjs";
import { createShuffledConnectome } from "../src/connectome/shuffled_control.mjs";
import { createExecutive } from "../src/deltax/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

test("1. Live Connectome Decision Loop: Sensory -> Recurrent Substrate -> DN Candidates -> DeltaX -> Action", async (t) => {
  if (!cmd) {
    t.skip("DELTAX_LOCAL_RUNTIME_CMD not set");
    return;
  }

  const loop = new ConnectomeClosedLoop({ seed: 100, condition: "EXECUTIVE", steps: 4, command: cmd });
  const result = await loop.run();
  await loop.close();

  assert.equal(result.condition, "EXECUTIVE");
  assert.equal(result.steps, 4);
  assert.equal(result.history.length, 4);

  for (const h of result.history) {
    assert.ok(h.candidates.length >= 4, "Must generate at least 4 candidates");
    assert.ok(["locomotion_forward", "turn_left", "turn_right", "halt", "giant_fiber_escape", "groom"].includes(h.substrate_winner.action_class));
    assert.ok(h.decision, "DeltaX must produce a decision");
    assert.ok(["PERMIT", "VETO", "MODULATE", "DEFER", "ESCALATE"].includes(h.decision.disposition));
    assert.equal(h.decision.provenance?.executive_source, "local_runtime");
  }
});

test("2. Candidate Provenance Integrity (originating populations & zero semantic cheats)", () => {
  const runtime = new ConnectomeRuntime({ seed: 100 });
  const bridge = new ConnectomeCandidateBridge();

  runtime.step(5);
  const dnReadouts = runtime.getDescendingNeuronReadouts();
  const candidates = bridge.generateCandidates(dnReadouts, 1);

  assert.ok(candidates.length >= 4);
  for (const c of candidates) {
    assert.ok(c.id, "Candidate must have id");
    assert.ok(c.substrate_candidate_id, "Candidate must have substrate_candidate_id");
    assert.ok(c.action_class, "Candidate must have action_class");
    assert.ok(typeof c.activation_strength === "number", "activation_strength must be numeric");
    assert.ok(c.originating_population.length > 0, "Must declare originating neuron population");
    assert.ok(["MEASURED_NEURAL", "DERIVED_NEURAL", "FALLBACK"].includes(c.provenance_type), "Must declare valid provenance_type");
    assert.ok(c.actuator_action, "Must declare actuator_action");
    if (c.provenance_type !== "FALLBACK") {
      assert.ok(c.originating_neuron_indices.length > 0, "Must declare individual neuron indices for neural candidates");
    }
    assert.ok(c.raw_activity_measure, "Must include raw activity measure");
    assert.ok(c.normalization_method, "Must include normalization method");

    // Semantic cheat assertions: candidate generator must NOT contain environment cheats
    assert.strictEqual(c.isBlocked, undefined, "isBlocked cheat must not exist on candidate");
    assert.strictEqual(c.isHazard, undefined, "isHazard cheat must not exist on candidate");
    assert.strictEqual(c.optimalRoute, undefined, "optimalRoute cheat must not exist on candidate");
  }
});

test("3. OBSERVE Condition Purity & Non-Contamination", async (t) => {
  if (!cmd) {
    t.skip("DELTAX_LOCAL_RUNTIME_CMD not set");
    return;
  }

  const loopObs = new ConnectomeClosedLoop({ seed: 100, condition: "OBSERVE", steps: 4, command: cmd });
  const resObs = await loopObs.run();
  await loopObs.close();

  // In OBSERVE mode, intervention rate must be exactly 0
  assert.equal(resObs.intervention_rate, 0.0);
  assert.equal(resObs.veto_count, 0);
  assert.equal(resObs.modulation_count, 0);
});

test("4. Real Causal Neural Intervention (Optogenetic silencing causes behavioral divergence)", async (t) => {
  const runtime = new ConnectomeRuntime({ seed: 100 });
  const transduction = new ConnectomeSensoryTransduction(runtime.data);
  const bridge = new ConnectomeCandidateBridge();

  // Transduce forward sensory drives
  const drives = transduction.transduce({
    visual_field: { nearest_obstacle_distance: 5.0, corridor: "west_corridor" },
    gradients: { food_signal: 0.9, energy: 20 },
    collision: { blocked: false },
  });
  runtime.setSensoryDrives(drives);
  runtime.step(10);
  const snap = runtime.snapshot();

  // Branch A: unperturbed forward continuation
  runtime.step(10);
  const dnIntact = runtime.getDescendingNeuronReadouts();
  const cIntact = bridge.generateCandidates(dnIntact, 2);

  // Branch B: restore & silence forward command neurons DNg100/DNg97/DNp09
  runtime.restore(snap);
  runtime.silence("DNg100");
  runtime.silence("DNg97");
  runtime.silence("DNp09");
  runtime.silence("DNa05");
  runtime.step(10);
  const dnSilenced = runtime.getDescendingNeuronReadouts();
  const cSilenced = bridge.generateCandidates(dnSilenced, 2);

  const intactFwdStrength = cIntact.find(c => c.action_class === "locomotion_forward")?.activation_strength || 0;
  const silencedFwdStrength = cSilenced.find(c => c.action_class === "locomotion_forward")?.activation_strength || 0;

  assert.ok(
    dnSilenced.forward.weighted_mean < dnIntact.forward.weighted_mean || silencedFwdStrength < intactFwdStrength,
    "Silencing descending locomotor neurons must causally suppress forward candidate strength"
  );
});

test("5. Shuffled Connectome Control (Degree-Preserving Circuit Scrambling)", () => {
  const runtime = new ConnectomeRuntime({ seed: 100 });
  const originalWeightsSum = runtime.data.weights.reduce((a, b) => a + b, 0);
  const shuffled = createShuffledConnectome(runtime.data, 9999);

  const shuffledWeightsSum = shuffled.weights.reduce((a, b) => a + b, 0);
  assert.equal(shuffled.N, runtime.data.N);
  assert.equal(shuffled.indptr.length, runtime.data.indptr.length);
  assert.equal(shuffledWeightsSum, originalWeightsSum, "Degree and weight distribution must be preserved");
  assert.equal(shuffled.is_shuffled, true);
});

test("6. Public / Private Repository Boundary Protection", () => {
  const forbidden = [
    /DeltaX_Runtime_Architecture_Specification.*\.docx/i,
    /deltax_unified_governance.*\.yaml/i,
    /coherence_mathematics.*\.docx/i,
    /active_canon.*\.docx/i,
  ];

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if ([".git", "node_modules", ".venv", "artifacts"].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      for (const pat of forbidden) {
        assert.ok(!pat.test(e.name), "Forbidden proprietary file found: " + full);
      }
      if (e.isDirectory()) scan(full);
    }
  }

  scan(ROOT);
});
