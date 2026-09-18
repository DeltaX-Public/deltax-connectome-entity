import assert from "node:assert/strict";
import { test } from "node:test";
import { ConnectomeClosedLoop } from "../src/connectome/closed_loop.mjs";
import { ConnectomeCandidateBridge } from "../src/connectome/candidate_bridge.mjs";
import { ConnectomeRuntime } from "../src/connectome/runtime.mjs";

test("1. Candidate provenance typing and declared fallback present before evaluation", () => {
  const runtime = new ConnectomeRuntime({ seed: 42 });
  const bridge = new ConnectomeCandidateBridge();
  runtime.step(5);
  const dnReadouts = runtime.getDescendingNeuronReadouts();
  const candidates = bridge.generateCandidates(dnReadouts, 1);

  assert.ok(candidates.length >= 5, "Candidate field must contain multiple candidates");
  
  const provenanceTypes = new Set(candidates.map((c) => c.provenance_type));
  assert.ok(provenanceTypes.has("MEASURED_NEURAL"), "Must have MEASURED_NEURAL candidates");
  assert.ok(provenanceTypes.has("DERIVED_NEURAL"), "Must have DERIVED_NEURAL candidates");
  assert.ok(provenanceTypes.has("FALLBACK"), "Must have FALLBACK candidate");

  const fallback = candidates.find((c) => c.provenance_type === "FALLBACK");
  assert.ok(fallback, "Declared safe fallback must be present in pre-evaluation candidate field");
  assert.equal(fallback.action_class, "safe_noop");
  assert.equal(fallback.actuator_action, "stop");
  assert.equal(fallback.activation_strength, 0.01);

  for (const c of candidates) {
    assert.ok(c.id, "Candidate must have id");
    assert.ok(c.substrate_candidate_id, "Candidate must have substrate_candidate_id");
    assert.ok(["forward", "left", "right", "stop"].includes(c.actuator_action), `Invalid actuator_action: ${c.actuator_action}`);
  }
});

test("2. ConnectomeClosedLoop strictly enforces pre-evaluation candidate origin", async () => {
  const loop = new ConnectomeClosedLoop({ seed: 42, condition: "CONTROL", steps: 3 });
  const result = await loop.run();

  assert.equal(result.steps, 3);
  for (const h of result.history) {
    assert.ok(h.chosen_candidate, "History must record chosen_candidate");
    assert.ok(h.candidates.some((c) => c.id === h.chosen_candidate.id), "Chosen candidate must exist in candidates array");
    assert.equal(h.chosen_action, h.chosen_candidate.actuator_action, "Chosen action must match chosen candidate's actuator_action");
    assert.equal(h.winner_before.id, h.chosen_candidate.id, "In CONTROL, chosen candidate must be substrate winner");
  }
  await loop.close();
});

test("3. EXECUTIVE mode rejects invented candidate not in candidate field", async () => {
  const loop = new ConnectomeClosedLoop({ seed: 42, condition: "EXECUTIVE", steps: 1 });
  // Mock executive that permits a non-existent candidate ID
  loop.executive = {
    decide: async () => ({
      disposition: "PERMIT",
      permitted: [{ id: "phantom_candidate_never_existed", substrate_candidate_id: "sub_phantom" }],
      selected_action_id: "phantom_candidate_never_existed",
    }),
  };

  // Because the phantom candidate does not exist in candidates, permittedCandidates is empty,
  // so the harness must safely fall back to the declared FALLBACK candidate (safe_noop -> stop),
  // NEVER inventing an actuator command!
  const res = await loop.run();
  assert.equal(res.history[0].chosen_candidate.action_class, "safe_noop");
  assert.equal(res.history[0].chosen_action, "stop");
  assert.equal(res.fallback_count, 1);
  await loop.close();
});

test("4. VETO disposition safely falls back to safe_noop without shortcut", async () => {
  const loop = new ConnectomeClosedLoop({ seed: 42, condition: "EXECUTIVE", steps: 1 });
  // Mock executive that vetoes all candidates
  loop.executive = {
    decide: async () => ({
      disposition: "VETO",
      permitted: [],
      vetoed: [{ id: "cand_fwd_1", substrate_candidate_id: "sub_dn_forward_1", reason: "safety_veto" }],
      selected_action_id: null,
    }),
  };

  const res = await loop.run();
  assert.equal(res.history[0].chosen_candidate.action_class, "safe_noop");
  assert.equal(res.history[0].chosen_action, "stop");
  assert.equal(res.fallback_count, 1);
  await loop.close();
});

test("5. MODULATE disposition does not shortcut to forward or left", async () => {
  const loop = new ConnectomeClosedLoop({ seed: 42, condition: "EXECUTIVE", steps: 1 });
  loop.executive = {
    decide: async () => ({
      disposition: "MODULATE",
      permitted: [],
      modulation: { hint: "slow" },
    }),
  };

  const res = await loop.run();
  // Without permitted candidate under MODULATE, falls back to safe_noop ("stop"), NOT "forward" or "left"
  assert.equal(res.history[0].chosen_action, "stop");
  assert.equal(res.history[0].chosen_candidate.action_class, "safe_noop");
  await loop.close();
});
