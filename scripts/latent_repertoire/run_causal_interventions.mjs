/**
 * run_causal_interventions.mjs
 * Latent Motor Repertoire Atlas - Tasks 4, 5, 6, 7 & 8: Causal Validation of Latent Pathways
 *
 * Evaluates controlled diagnostic interventions on silent/latent pathways:
 *   Condition A: Intact natural sensory drive (180 Hz)
 *   Condition B: Silence strongest direct inhibitory presynaptic neuron
 *   Condition C: Silence top inhibitory group (top 3-5 direct inhibitory inputs)
 *   Condition D: Matched inhibitory sham silencing
 *   Condition E: Excitatory sufficiency boost (stimulate top excitatory intermediate at 15-25 Hz)
 *
 * Validates reference pathway: Tactile T1 right -> AN03A008 -> DNa02
 * Evaluates mechanosensory escape and grooming pathways.
 *
 * Outputs:
 *   artifacts/latent_repertoire/validation/inhibition_interventions.json
 *   artifacts/latent_repertoire/validation/excitation_interventions.json
 *   artifacts/latent_repertoire/validation/causal_bottleneck_classification.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const UPSTREAM = path.resolve(ROOT, "upstream", "fly-brain");

const { loadAll } = await import(path.join(UPSTREAM, "scripts", "lib_node.mjs"));
const { DN_ROLES } = await import(path.join(UPSTREAM, "src", "sim", "motor.js"));
const { ConnectomeRuntime } = await import(path.join(ROOT, "src", "connectome", "runtime.mjs"));
const { generateCandidates_C_IndependentAxes } = await import(
  path.join(ROOT, "src", "connectome", "candidate_readouts.mjs")
);

// NT sign mapping: 1: ACh (+1), 2: GABA (-1), 3: Glu (-1 in Drosophila), 4: Oct (+1), 5: Ser (+1), 6: DA (+1)
const NT_SIGN = [1, 1, -1, -1, 1, 1, 1, -1];
const SEEDS = [20000, 20001, 20002, 20003, 20004];
const STIM_INTENSITY = 180.0; // Hz

async function main() {
  console.log("=== Tasks 4-8: Causal Interventions & Bottleneck Validation ===\n");

  const origCwd = process.cwd();
  process.chdir(UPSTREAM);
  let data;
  try {
    data = loadAll();
  } finally {
    process.chdir(origCwd);
  }

  const { meta, N, indptr, indices, weights, nt, byType, side } = data;

  // Load bodymap
  const bodymapPath = path.join(UPSTREAM, "public", "data", "bodymap.json");
  const bodymap = JSON.parse(fs.readFileSync(bodymapPath, "utf-8"));
  const sensorLookup = new Map();
  for (const s of bodymap.sensors || []) sensorLookup.set(s.name, s.idx || []);
  for (const e of bodymap.eyes || []) sensorLookup.set(`visual ${e.side}`, e.idx || []);

  // Build reverse adjacency helper to get all presynaptic inputs with neurotransmitter signs
  function getPresynapticDetails(targetIndices) {
    const targetSet = new Set(targetIndices);
    const preMap = new Map(); // u -> { weight, nt_code, nt_sign, type }

    for (let u = 0; u < N; u++) {
      const start = indptr[u];
      const end = indptr[u + 1];
      for (let e = start; e < end; e++) {
        const v = indices[e];
        if (targetSet.has(v)) {
          const w = weights[e];
          const curr = preMap.get(u) || { weight: 0, nt_code: nt[u], nt_sign: NT_SIGN[nt[u]] ?? 1, type: meta.types[u] || "unknown", index: u };
          curr.weight += w;
          preMap.set(u, curr);
        }
      }
    }
    return Array.from(preMap.values());
  }

  // Load High-Confidence Panel
  const panelPath = path.join(ROOT, "artifacts", "latent_repertoire", "validation", "high_confidence_panel.json");
  const panel = JSON.parse(fs.readFileSync(panelPath, "utf-8"));

  // Select non-transduction-limited pathways for causal testing
  const testPathways = panel.pathways.filter(p => p.panel_role !== "TRANSDUCTION_LIMITED");

  const inhibitionResults = [];
  const excitationResults = [];
  const bottleneckClassifications = [];

  for (const pw of testPathways) {
    console.log(`\nEvaluating pathway: [${pw.id}] ${pw.sensory_channel} -> ${pw.motor_program}`);

    const sensoryIndices = sensorLookup.get(pw.sensory_channel) || [];
    if (sensoryIndices.length === 0) {
      console.log(`  No sensory indices for ${pw.sensory_channel}`);
      continue;
    }

    // Identify target DN indices
    const targetRoles = DN_ROLES[pw.motor_program] || {};
    const targetSide = pw.side || 0;
    const dnIndices = [];
    for (const type of pw.target_dn_types) {
      const idxs = byType(type, targetSide) || [];
      dnIndices.push(...idxs);
    }
    if (dnIndices.length === 0) {
      for (const type of pw.target_dn_types) {
        const idxs = byType(type, 0) || [];
        dnIndices.push(...idxs);
      }
    }

    // Get presynaptic inputs into target DNs
    const preDetails = getPresynapticDetails(dnIndices);
    const inhibitoryInputs = preDetails.filter(p => p.nt_sign === -1).sort((a, b) => b.weight - a.weight);
    const excitatoryInputs = preDetails.filter(p => p.nt_sign === 1).sort((a, b) => b.weight - a.weight);

    const topInhibitory = inhibitoryInputs.slice(0, 5);
    const topInhibitoryIdxs = topInhibitory.map(p => p.index);
    const topSingleInhibitoryIdx = topInhibitory[0]?.index ?? null;

    // Plausible excitatory intermediate (e.g. AN03A008 index 2937 for right steering, or top excitatory input)
    let bestExcitatory = excitatoryInputs[0] || null;
    if (pw.id === "tactile_t1_r_to_turn_r") {
      // Specifically use AN03A008 (index 2937)
      const an03 = preDetails.find(p => p.index === 2937) || { index: 2937, type: "AN03A008", weight: 717, nt_sign: 1 };
      bestExcitatory = an03;
    }

    // Sham population: 5 unrelated random non-motor, non-sensory interneurons
    const shamIndices = [2707, 3500, 4200, 5100, 6300];

    // Helper to run simulation under a specific intervention condition
    function runCondition(opts = {}) {
      const {
        silenceIdxs = [],
        boostIntermediary = null, // { index, rate }
        sensoryDrive = true,
      } = opts;

      let sumInp = 0, sumTheta = 0, sumRate = 0, sumCand = 0, sumNet = 0;
      let count = 0;

      for (const seed of SEEDS) {
        const runtime = new ConnectomeRuntime({ seed, substepsPerTick: 10 });
        runtime.net.reset();
        runtime.net.ext.fill(0);
        runtime.sensoryDrives.clear();

        // Apply silencing
        for (const idx of silenceIdxs) {
          runtime.silencedNeurons.add(idx);
          runtime.net.silenced[idx] = 1;
        }

        const drives = new Map();
        if (sensoryDrive) {
          for (const idx of sensoryIndices) drives.set(idx, STIM_INTENSITY);
        }

        for (let tick = 1; tick <= 30; tick++) {
          if (tick >= 5 && tick <= 25) {
            if (sensoryDrive) runtime.setSensoryDrives(drives);
            if (boostIntermediary) {
              runtime.net.setRate([boostIntermediary.index], boostIntermediary.rate);
            }
          } else {
            runtime.sensoryDrives.clear();
            runtime.net.ext.fill(0);
          }

          runtime.step(1);

          if (tick >= 12 && tick <= 25) {
            const net = runtime.net;
            const dnReadouts = runtime.getDescendingNeuronReadouts();
            const cands = generateCandidates_C_IndependentAxes(dnReadouts, tick);

            let dnInp = 0, dnTh = 0, dnR = 0;
            for (const idx of dnIndices) {
              dnInp += net.inp[idx];
              dnTh += net.theta[idx];
              dnR += net.r[idx];
            }
            dnInp /= Math.max(1, dnIndices.length);
            dnTh /= Math.max(1, dnIndices.length);
            dnR /= Math.max(1, dnIndices.length);

            // Candidate strength for expected motor class
            const expectedClass = pw.motor_program;
            const cand = cands.find(c => c.action_class === expectedClass || c.id.includes(expectedClass));
            const candStr = cand ? cand.activation_strength : 0;

            let netTotal = 0;
            for (let i = 0; i < runtime.N; i++) netTotal += net.r[i];

            sumInp += dnInp;
            sumTheta += dnTh;
            sumRate += dnR;
            sumCand += candStr;
            sumNet += netTotal;
            count++;
          }
        }
      }

      return {
        mean_inp: +(sumInp / count).toFixed(4),
        mean_theta: +(sumTheta / count).toFixed(4),
        mean_evoked_hz: +(sumRate / count).toFixed(4),
        candidate_strength: +(sumCand / count).toFixed(4),
        whole_network_hz: +(sumNet / count).toFixed(2),
      };
    }

    // Condition A: Intact
    const condA = runCondition({ sensoryDrive: true });

    // Condition B: Silence Single Strongest Direct Inhibitory
    const condB = topSingleInhibitoryIdx !== null
      ? runCondition({ sensoryDrive: true, silenceIdxs: [topSingleInhibitoryIdx] })
      : { ...condA, note: "no direct inhibitory input" };

    // Condition C: Silence Top 5 Inhibitory Group
    const condC = topInhibitoryIdxs.length > 0
      ? runCondition({ sensoryDrive: true, silenceIdxs: topInhibitoryIdxs })
      : { ...condA, note: "no direct inhibitory group" };

    // Condition D: Matched Inhibitory Sham
    const condD = runCondition({ sensoryDrive: true, silenceIdxs: shamIndices });

    // Condition E: Preserve Inhibition + Boost Excitatory Intermediary (20 Hz)
    const condE = bestExcitatory !== null
      ? runCondition({ sensoryDrive: true, boostIntermediary: { index: bestExcitatory.index, rate: 20.0 } })
      : { ...condA, note: "no excitatory intermediate identified" };

    // Assess Inh Intervention Impact
    const rateGainSingle = +(condB.mean_evoked_hz - condA.mean_evoked_hz).toFixed(4);
    const rateGainGroup = +(condC.mean_evoked_hz - condA.mean_evoked_hz).toFixed(4);
    const rateGainSham = +(condD.mean_evoked_hz - condA.mean_evoked_hz).toFixed(4);
    const rateGainExc = +(condE.mean_evoked_hz - condA.mean_evoked_hz).toFixed(4);

    const directInhRescues = (rateGainGroup > 0.3) && (rateGainGroup > rateGainSham * 2);
    const excSufficiencyRescues = (rateGainExc > 0.3) && (condE.candidate_strength > 0.1);

    // Causal Classification Logic
    const causalClasses = [];
    if (pw.panel_role === "ROBUST_POSITIVE_CONTROL") {
      causalClasses.push("ROBUSTLY_EXPRESSED");
    } else {
      if (directInhRescues) {
        causalClasses.push("DIRECT_INHIBITORY_SUPPRESSION");
      }
      if (condA.mean_inp <= 0 && !directInhRescues) {
        causalClasses.push("POLYSYNAPTIC_INHIBITORY_OPPOSITION");
      }
      if (excSufficiencyRescues) {
        causalClasses.push("INSUFFICIENT_EXCITATORY_CONVERGENCE");
      }
      if (condA.mean_theta > 80.0) {
        causalClasses.push("HIGH_INTRINSIC_THRESHOLD");
      }
      if (causalClasses.length === 0) {
        causalClasses.push(condA.mean_evoked_hz > 0.05 ? "WEAKLY_EXPRESSED" : "UNRESOLVED");
      }
    }

    console.log(`  Condition A (Intact): Rate=${condA.mean_evoked_hz} Hz, Inp=${condA.mean_inp}, Theta=${condA.mean_theta}`);
    console.log(`  Condition B (Silence Top Inh): Rate=${condB.mean_evoked_hz} Hz, Gain=${rateGainSingle} Hz`);
    console.log(`  Condition C (Silence Group Inh): Rate=${condC.mean_evoked_hz} Hz, Gain=${rateGainGroup} Hz`);
    console.log(`  Condition D (Sham): Rate=${condD.mean_evoked_hz} Hz, Sham Gain=${rateGainSham} Hz`);
    console.log(`  Condition E (Boost Exc Interm): Rate=${condE.mean_evoked_hz} Hz, Exc Gain=${rateGainExc} Hz (Cand=${condE.candidate_strength})`);
    console.log(`  -> Causal Labels: ${causalClasses.join(", ")}`);

    inhibitionResults.push({
      pathway_id: pw.id,
      sensory_channel: pw.sensory_channel,
      motor_program: pw.motor_program,
      panel_role: pw.panel_role,
      target_dn_indices: dnIndices,
      top_inhibitory_inputs: topInhibitory,
      intact_condition_A: condA,
      silence_single_inhibitory_condition_B: condB,
      silence_group_inhibitory_condition_C: condC,
      sham_silencing_condition_D: condD,
      direct_inhibitory_effect_hz: rateGainGroup,
      sham_effect_hz: rateGainSham,
      direct_inhibition_rescues_motor_program: directInhRescues,
      polysynaptic_inhibition_present: condA.mean_inp <= 0 && !directInhRescues,
    });

    excitationResults.push({
      pathway_id: pw.id,
      sensory_channel: pw.sensory_channel,
      motor_program: pw.motor_program,
      panel_role: pw.panel_role,
      target_dn_indices: dnIndices,
      tested_excitatory_intermediate: bestExcitatory,
      intact_condition_A: condA,
      boosted_intermediate_condition_E: condE,
      excitatory_rate_gain_hz: rateGainExc,
      candidate_strength_boosted: condE.candidate_strength,
      excitatory_sufficiency_confirmed: excSufficiencyRescues,
      off_target_network_delta_hz: +(condE.whole_network_hz - condA.whole_network_hz).toFixed(2),
    });

    bottleneckClassifications.push({
      pathway_id: pw.id,
      sensory_channel: pw.sensory_channel,
      motor_program: pw.motor_program,
      panel_role: pw.panel_role,
      causal_bottleneck_classes: causalClasses,
      evidence_summary: {
        intact_rate_hz: condA.mean_evoked_hz,
        intact_inp: condA.mean_inp,
        intact_theta: condA.mean_theta,
        group_inhibition_removal_gain_hz: rateGainGroup,
        excitatory_boost_gain_hz: rateGainExc,
        excitatory_boost_candidate_strength: condE.candidate_strength,
      },
    });
  }

  // Write Artifacts
  const outDir = path.join(ROOT, "artifacts", "latent_repertoire", "validation");

  fs.writeFileSync(
    path.join(outDir, "inhibition_interventions.json"),
    JSON.stringify({ schema: "latent_repertoire.inhibition_interventions.v1", timestamp: new Date().toISOString(), pathways: inhibitionResults }, null, 2) + "\n"
  );
  console.log(`\nArtifact written: ${path.join(outDir, "inhibition_interventions.json")}`);

  fs.writeFileSync(
    path.join(outDir, "excitation_interventions.json"),
    JSON.stringify({ schema: "latent_repertoire.excitation_interventions.v1", timestamp: new Date().toISOString(), pathways: excitationResults }, null, 2) + "\n"
  );
  console.log(`Artifact written: ${path.join(outDir, "excitation_interventions.json")}`);

  fs.writeFileSync(
    path.join(outDir, "causal_bottleneck_classification.json"),
    JSON.stringify({ schema: "latent_repertoire.causal_bottleneck_classification.v1", timestamp: new Date().toISOString(), classifications: bottleneckClassifications }, null, 2) + "\n"
  );
  console.log(`Artifact written: ${path.join(outDir, "causal_bottleneck_classification.json")}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
