import test from "node:test";
import assert from "node:assert/strict";
import { ConnectomeRuntime } from "../src/connectome/runtime.mjs";
import { PLASTICITY_RULES } from "../src/connectome/plasticity_overlay.mjs";
import { runStandardizedIsolatedProbe } from "../src/connectome/isolated_probe.mjs";

test("Probe Isolation Repair: Zero state mutation on training runtime (DEF-02)", () => {
  const rt = new ConnectomeRuntime({
    seed: 18100,
    substepsPerTick: 1,
    plasticity: {
      enabled: true,
      rule: PLASTICITY_RULES.SUBTHRESHOLD_ELIGIBILITY_MODULATED_HEBBIAN,
    },
  });

  // Prime some state in the network
  rt.excite([100], 50.0);
  for (let s = 0; s < 15; s++) rt.step();

  // Snapshot before probe
  const snapBefore = rt.snapshot();
  const stepsBefore = rt.net._steps;
  const hashBefore = rt.plasticity ? rt.plasticity.getHash() : null;

  // Run 6 multimodal standardized probes
  const sensorySets = [
    [100, 101],
    [200, 201],
    [300, 301],
    [400, 401],
    [500, 501],
    [600, 601],
  ];

  for (const sSet of sensorySets) {
    const probeRes = runStandardizedIsolatedProbe(rt, sSet);
    assert.ok(probeRes !== null, "Probe must return readout object");
  }

  // Verify training runtime state after all 6 probes
  const snapAfter = rt.snapshot();
  const stepsAfter = rt.net._steps;
  const hashAfter = rt.plasticity ? rt.plasticity.getHash() : null;

  assert.equal(stepsAfter, stepsBefore, "Simulation step count _steps must not change during probing");
  assert.equal(hashAfter, hashBefore, "Plasticity state hash must not change during probing");
  assert.equal(snapAfter.t, snapBefore.t, "Simulation time t must not advance during probing");

  // Deep comparison of neural state vectors
  assert.deepEqual(snapAfter.r, snapBefore.r, "Firing rate vector net.r must be bit-identical");
  assert.deepEqual(snapAfter.inp, snapBefore.inp, "Input vector net.inp must be bit-identical");
  assert.deepEqual(snapAfter.u, snapBefore.u, "Depression vector net.u must be bit-identical");
  assert.deepEqual(snapAfter.A, snapBefore.A, "Adaptation vector net.A must be bit-identical");
  assert.deepEqual(snapAfter.out, snapBefore.out, "Output vector net.out must be bit-identical");
});
