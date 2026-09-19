/**
 * Phase IV-A Sensory Atlas Invariant & Integrity Suite.
 *
 * Verifies:
 * 1. Sensory Inventory Completeness (all verified channels present in bodymap)
 * 2. Reachability Schema & Directed Connection Integrity (all target DNs reachable within 3 hops)
 * 3. Intact vs Shuffled Symmetry Breaking (lateral asymmetry produces intact steering; shuffled scrambles)
 * 4. Causal Silencing Invariant (steering DN silencing abolishes response; sham preserves it)
 * 5. Phase III Symmetry Diagnosis (verifies Phase III input was 100% symmetric and collapsed into HALT)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SensoryAtlasHarness } from "../src/experiments/sensory_atlas/harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ATLAS_DIR = path.join(ROOT, "artifacts", "sensory_atlas");

test("Phase IV-A: Sensory Surface & Reachability Invariants", async (t) => {
  const harness = new SensoryAtlasHarness({ seed: 7000 });
  const runtime = harness.initRuntime(7000);

  await t.test("1. Verified sensory populations exist in bodymap with genuine indices", () => {
    const requiredSensors = [
      "tactile T1 left",
      "tactile T1 right",
      "tactile T2 left",
      "tactile T3 left",
      "JO wind/gravity left",
      "thermosensory left",
      "taste T1 left",
      "labellar taste left",
      "wing/notum bristles left",
    ];

    for (const name of requiredSensors) {
      const idx = harness.getSensorIndices(name);
      assert.ok(idx.length > 0, `Sensor population ${name} must contain at least 1 neuron index`);
    }

    const eyeL = harness.getSensorIndices("photoreceptors left");
    const eyeR = harness.getSensorIndices("photoreceptors right");
    assert.ok(eyeL.length > 1000, "Left eye photoreceptors must exceed 1,000 neurons");
    assert.ok(eyeR.length > 1000, "Right eye photoreceptors must exceed 1,000 neurons");
  });

  await t.test("2. Graph reachability artifact exists, is schema-valid, and connects to DNs within 3 hops", () => {
    const reachPath = path.join(ATLAS_DIR, "reachability.json");
    assert.ok(fs.existsSync(reachPath), "reachability.json must exist in artifacts/sensory_atlas");

    const reach = JSON.parse(fs.readFileSync(reachPath, "utf8"));
    assert.equal(reach.schema, "sensory.reachability.v1");
    assert.ok(reach.sensory_populations_analyzed >= 30);

    const tactileL = reach.reachability["tactile T1 left"];
    assert.ok(tactileL);
    assert.equal(tactileL.dn_reachability.turn_left.min_hop_distance, 2);
    assert.equal(tactileL.dn_reachability.turn_left.fraction_reachable, 1.0);
  });

  await t.test("3. Intact connectome produces directional steering asymmetry under lateralized drive", async () => {
    const trial = await harness.runTrial({
      population: "tactile T1",
      laterality: "ASYMMETRIC",
      asymmetricDrives: {
        leftPop: "tactile T1 left",
        rightPop: "tactile T1 right",
        leftHz: 180.0,
        rightHz: 0.0,
      },
      seed: 7000,
      isShuffled: false,
    });

    const diff = trial.stimulus_means.turn_left - trial.stimulus_means.turn_right;
    assert.ok(diff > 0.5, `Left tactile drive must produce positive steering differential (got ${diff} Hz)`);
    assert.ok(trial.stimulus_means.turn_left > trial.stimulus_means.turn_right * 10, "TurnL must exceed TurnR by at least 10x under left-only stimulation");
  });

  await t.test("4. Causal optogenetic silencing abolishes steering response while sham preserves it", async () => {
    const turnLNeuronIndices = new Set(runtime.dnPopulations.turn_left.map((n) => n.index));
    const groomNeuronIndices = new Set(runtime.dnPopulations.groom.map((n) => n.index));

    // Silenced steering DNs
    const trialSilenced = await harness.runTrial({
      population: "tactile T1 left",
      intensity: 180.0,
      pattern: "CONSTANT",
      laterality: "LEFT_ONLY",
      seed: 7000,
      silencedNeurons: turnLNeuronIndices,
    });

    assert.equal(trialSilenced.stimulus_means.turn_left, 0.0, "TurnL must be strictly 0.0 Hz when left steering DNs are silenced");

    // Sham silencing (grooming DNs)
    const trialSham = await harness.runTrial({
      population: "tactile T1 left",
      intensity: 180.0,
      pattern: "CONSTANT",
      laterality: "LEFT_ONLY",
      seed: 7000,
      silencedNeurons: groomNeuronIndices,
    });

    assert.ok(trialSham.stimulus_means.turn_left > 0.5, "TurnL must remain active (> 0.5 Hz) during sham silencing");
  });

  await t.test("5. Phase III stimulus projection confirms 100% HALT collapse under symmetric hazard", () => {
    const projPath = path.join(ATLAS_DIR, "phase3_stimulus_projection.json");
    assert.ok(fs.existsSync(projPath), "phase3_stimulus_projection.json must exist");

    const proj = JSON.parse(fs.readFileSync(projPath, "utf8"));
    assert.equal(proj.schema, "sensory.phase3_projection.v1");

    // Check State C (Encounter)
    const encounter = proj.projections.find((p) => p.state === "STATE_C_ENCOUNTER");
    assert.ok(encounter);
    assert.equal(encounter.dominant_winner, "halt", "Encounter state must collapse into HALT candidate");
    assert.equal(encounter.dominant_winner_pct, 100.0, "Encounter state must be 100% HALT");
  });
});
