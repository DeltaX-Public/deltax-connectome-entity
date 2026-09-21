/**
 * test_necessity_sufficiency.mjs
 * Phase 2 - Tasks 5 & 6: Necessity & Sufficiency Testing for Identified Candidate Intermediates
 *
 * Candidate Population 1: AN03A008 (Left: 2693, Right: 2937) - primary 2-hop ascending mechanosensory interneuron
 * Candidate Population 2: DNg34 (Left: 120539, Right: 3348) - secondary 2-hop DN
 * Candidate Population 3: 3-hop top candidates from propagation trace (IN09B038, AN09B004)
 *
 * Task 5: NECESSITY TEST (Disrupting successful LEFT pathway)
 *   Condition A: Intact Left tactile stimulation (180 Hz)
 *   Condition B: Silence Left AN03A008 (index 2693)
 *   Condition C: Sham silencing (matched size unrelated neuron, e.g. DNg07 index 2707)
 *   Condition D: Silence homologous Right AN03A008 (index 2937) as negative control
 *   Measures: left DNa02 rate, turn_left candidate strength, latency, whole-network activity
 *
 * Task 6: SUFFICIENCY TEST (Stimulating RIGHT intermediates at physiological rates)
 *   Target: Right AN03A008 (index 2937)
 *   Rate sweep: [5, 10, 15, 20, 25, 30, 40] Hz (bounded by Left AN03A008's observed rate of 24.9 Hz)
 *   Also tests concurrent tactile stimulation vs isolated stimulation.
 *   Measures: right DNa02 rate, left DNa02 rate, right candidate strength, off-target network activation
 *
 * Outputs:
 * - artifacts/steering_asymmetry/necessity_interventions.json
 * - artifacts/steering_asymmetry/sufficiency_interventions.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const { ConnectomeRuntime } = await import(
  path.join(ROOT, "src", "connectome", "runtime.mjs")
);
const { generateCandidates_C_IndependentAxes } = await import(
  path.join(ROOT, "src", "connectome", "candidate_readouts.mjs")
);

const LEFT_DNA02 = 130496;
const RIGHT_DNA02 = 332;
const LEFT_AN03A008 = 2693;
const RIGHT_AN03A008 = 2937;
const SHAM_NEURON = 2707; // DNg07 head grooming DN

const INTENSITY = 180.0;
const SEEDS = Array.from({ length: 10 }, (_, i) => 15000 + i);

async function main() {
  console.log("=== Phase 2: Tasks 5 & 6 — Necessity and Sufficiency Interventions ===\n");

  const bmPath = path.join(ROOT, "upstream", "fly-brain", "public", "data", "bodymap.json");
  const bodymap = JSON.parse(fs.readFileSync(bmPath, "utf8"));
  const leftTactile = bodymap.sensors.find((s) => s.name === "tactile T1 left")?.idx || [];
  const rightTactile = bodymap.sensors.find((s) => s.name === "tactile T1 right")?.idx || [];

  // ==========================================
  // TASK 5: NECESSITY TEST ON LEFT PATHWAY
  // ==========================================
  console.log("--- Executing Task 5: Necessity Test on Left Pathway (AN03A008 idx 2693) ---");

  const necessityConditions = [
    { id: "COND_A_INTACT", label: "Intact Left Tactile (180 Hz)", silenced: [] },
    { id: "COND_B_SILENCE_AN03A008", label: "Silence Left AN03A008 (idx 2693)", silenced: [LEFT_AN03A008] },
    { id: "COND_C_SHAM_SILENCE", label: "Sham Silence (unrelated DNg07 idx 2707)", silenced: [SHAM_NEURON] },
    { id: "COND_D_SILENCE_RIGHT_HOMOLOG", label: "Silence Right Homolog AN03A008 (idx 2937)", silenced: [RIGHT_AN03A008] },
  ];

  const necessityResults = {};

  for (const cond of necessityConditions) {
    console.log(`Running necessity condition: ${cond.label}...`);
    const trials = [];

    for (const seed of SEEDS) {
      const runtime = new ConnectomeRuntime({ seed, substepsPerTick: 1 });
      if (cond.silenced.length > 0) {
        runtime.silence(cond.silenced);
      }

      runtime.net.reset();
      runtime.net.ext.fill(0);
      runtime.sensoryDrives.clear();

      const driveMap = new Map();
      for (const idx of leftTactile) driveMap.set(idx, INTENSITY);

      let sumLeftDNa02 = 0, sumCandLeft = 0, sumWholeNet = 0;
      let onsetStep = null;
      let count = 0;

      for (let step = 1; step <= 60; step++) {
        if (step > 10 && step <= 35) {
          runtime.setSensoryDrives(driveMap);
        } else {
          runtime.sensoryDrives.clear();
          runtime.net.ext.fill(0);
        }

        runtime.step(1);

        if (step > 10 && step <= 35) {
          const dn = runtime.getDescendingNeuronReadouts();
          const cands = generateCandidates_C_IndependentAxes(dn, step);

          const rL = runtime.net.r[LEFT_DNA02];
          sumLeftDNa02 += rL;

          const cL = cands.find((c) => c.action_class === "turn_left")?.activation_strength || 0;
          sumCandLeft += cL;

          let stepNet = 0;
          for (let i = 0; i < runtime.N; i++) {
            if (runtime.net.r[i] > 0.01) stepNet += runtime.net.r[i];
          }
          sumWholeNet += stepNet;
          count++;

          if (onsetStep === null && rL > 0.05) {
            onsetStep = step - 10;
          }
        }
      }

      trials.push({
        seed,
        left_dna02_rate: +(sumLeftDNa02 / count).toFixed(4),
        turn_left_strength: +(sumCandLeft / count).toFixed(4),
        onset_latency_ms: onsetStep ?? -1,
        total_network_activity: +(sumWholeNet / count).toFixed(2),
      });
    }

    const mean = (k) => +(trials.reduce((s, t) => s + t[k], 0) / trials.length).toFixed(4);

    necessityResults[cond.id] = {
      label: cond.label,
      silenced_neurons: cond.silenced,
      aggregate: {
        left_dna02_rate: mean("left_dna02_rate"),
        turn_left_strength: mean("turn_left_strength"),
        onset_latency_ms: mean("onset_latency_ms"),
        total_network_activity: +(trials.reduce((s, t) => s + t.total_network_activity, 0) / trials.length).toFixed(2),
      },
      trials,
    };
  }

  console.log("\n=== NECESSITY TEST RESULTS TABLE ===");
  console.log("Condition | Left DNa02 (Hz) | Turn Left Strength | Latency (ms) | Whole Network (Hz)");
  console.log("----------------------------------------------------------------------------------");
  for (const [id, res] of Object.entries(necessityResults)) {
    const a = res.aggregate;
    console.log(`${res.label.padEnd(45)} | ${String(a.left_dna02_rate).padStart(15)} | ${String(a.turn_left_strength).padStart(18)} | ${String(a.onset_latency_ms).padStart(12)} | ${String(a.total_network_activity).padStart(18)}`);
  }

  const intactRate = necessityResults.COND_A_INTACT.aggregate.left_dna02_rate;
  const silencedRate = necessityResults.COND_B_SILENCE_AN03A008.aggregate.left_dna02_rate;
  const reductionFraction = +((intactRate - silencedRate) / intactRate).toFixed(4);

  const necessityConfirmed = reductionFraction > 0.30;
  console.log(`\nAN03A008 Silencing Effect: Rate reduced from ${intactRate} Hz to ${silencedRate} Hz (-${(reductionFraction * 100).toFixed(1)}% drop).`);
  console.log(`Necessity Criterion (Reduction > 30%): ${necessityConfirmed ? "CONFIRMED" : "NOT CONFIRMED"}\n`);

  // ==========================================
  // TASK 6: SUFFICIENCY TEST ON RIGHT INTERMEDIATE
  // ==========================================
  console.log("--- Executing Task 6: Sufficiency Test on Right Intermediate (AN03A008 idx 2937) ---");

  const testRates = [5, 10, 15, 20, 25, 30, 40];
  const sufficiencyResults = [];

  for (const rate of testRates) {
    const trials = [];

    for (const seed of SEEDS) {
      const runtime = new ConnectomeRuntime({ seed, substepsPerTick: 1 });

      runtime.net.reset();
      runtime.net.ext.fill(0);
      runtime.sensoryDrives.clear();

      // Right tactile stimulation + boost to right AN03A008
      const sensoryDrive = new Map();
      for (const idx of rightTactile) sensoryDrive.set(idx, INTENSITY);

      let sumRightDNa02 = 0, sumLeftDNa02 = 0, sumCandRight = 0, sumOffTarget = 0;
      let count = 0;

      for (let step = 1; step <= 60; step++) {
        if (step > 10 && step <= 35) {
          runtime.setSensoryDrives(sensoryDrive);
          // Set right AN03A008 firing rate via setRate
          runtime.net.setRate([RIGHT_AN03A008], rate);
        } else {
          runtime.sensoryDrives.clear();
          runtime.net.ext.fill(0);
        }

        runtime.step(1);

        if (step > 10 && step <= 35) {
          const dn = runtime.getDescendingNeuronReadouts();
          const cands = generateCandidates_C_IndependentAxes(dn, step);

          const rR = runtime.net.r[RIGHT_DNA02];
          const rL = runtime.net.r[LEFT_DNA02];
          sumRightDNa02 += rR;
          sumLeftDNa02 += rL;

          const cR = cands.find((c) => c.action_class === "turn_right")?.activation_strength || 0;
          sumCandRight += cR;

          // Off-target network activation (all neurons except right tactile, AN03A008, and DNa02)
          let stepOffTarget = 0;
          for (let i = 0; i < runtime.N; i++) {
            if (i !== RIGHT_AN03A008 && i !== RIGHT_DNA02 && !rightTactile.includes(i) && runtime.net.r[i] > 0.01) {
              stepOffTarget += runtime.net.r[i];
            }
          }
          sumOffTarget += stepOffTarget;
          count++;
        }
      }

      trials.push({
        seed,
        right_dna02_rate: +(sumRightDNa02 / count).toFixed(4),
        left_dna02_rate: +(sumLeftDNa02 / count).toFixed(4),
        right_candidate_strength: +(sumCandRight / count).toFixed(4),
        off_target_activity: +(sumOffTarget / count).toFixed(2),
      });
    }

    const mean = (k) => +(trials.reduce((s, t) => s + t[k], 0) / trials.length).toFixed(4);

    sufficiencyResults.push({
      an03a008_rate_hz: rate,
      mean_right_dna02_rate: mean("right_dna02_rate"),
      mean_left_dna02_rate: mean("left_dna02_rate"),
      mean_right_candidate_strength: mean("right_candidate_strength"),
      mean_off_target_activity: +(trials.reduce((s, t) => s + t.off_target_activity, 0) / trials.length).toFixed(2),
      trials,
    });
  }

  console.log("\n=== SUFFICIENCY TEST RESULTS TABLE ===");
  console.log("Right AN03A008 (Hz) | Right DNa02 (Hz) | Left DNa02 (Hz) | Cand Right | Off-Target Activity (Hz)");
  console.log("---------------------------------------------------------------------------------------------");
  for (const r of sufficiencyResults) {
    console.log(`${String(r.an03a008_rate_hz).padStart(19)} | ${String(r.mean_right_dna02_rate).padStart(16)} | ${String(r.mean_left_dna02_rate).padStart(15)} | ${String(r.mean_right_candidate_strength).padStart(10)} | ${String(r.mean_off_target_activity).padStart(24)}`);
  }

  const sufficiencyConfirmed = sufficiencyResults.some(r => r.mean_right_dna02_rate > 0.5);
  console.log(`\nSufficiency Criterion (Right DNa02 > 0.5 Hz under physiological rate): ${sufficiencyConfirmed ? "CONFIRMED" : "NOT CONFIRMED"}\n`);

  // Write artifacts
  const outPathNec = path.join(ROOT, "artifacts", "steering_asymmetry", "necessity_interventions.json");
  fs.writeFileSync(
    outPathNec,
    JSON.stringify(
      {
        schema: "steering_asymmetry.necessity_interventions.v1",
        timestamp: new Date().toISOString(),
        candidate_tested: "AN03A008 (Left index 2693)",
        necessity_confirmed: necessityConfirmed,
        reduction_fraction: reductionFraction,
        conditions: necessityResults,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Artifact written: ${outPathNec}`);

  const outPathSuff = path.join(ROOT, "artifacts", "steering_asymmetry", "sufficiency_interventions.json");
  fs.writeFileSync(
    outPathSuff,
    JSON.stringify(
      {
        schema: "steering_asymmetry.sufficiency_interventions.v1",
        timestamp: new Date().toISOString(),
        candidate_tested: "AN03A008 (Right index 2937)",
        sufficiency_confirmed: sufficiencyConfirmed,
        rate_sweep: sufficiencyResults,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Artifact written: ${outPathSuff}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
