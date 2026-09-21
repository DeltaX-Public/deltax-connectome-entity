/**
 * classify_repertoire.mjs
 * Latent Motor Repertoire Atlas - Task 9: Repertoire Classification & Plasticity Amenability
 *
 * Integrates evidence from Tasks 1-8 to classify each audited motor program into:
 *   - EXPRESSED
 *   - LATENT
 *   - READOUT_LIMITED
 *   - STRUCTURALLY_LIMITED
 *   - UNRESOLVED
 *
 * For each LATENT pathway, documents theoretical plasticity amenability:
 *   - afferent efficacy plasticity
 *   - intermediate efficacy plasticity
 *   - projection efficacy plasticity
 *   - none of the above
 *
 * Output: artifacts/latent_repertoire/classification.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

async function main() {
  console.log("=== Task 9: Latent Repertoire Classification ===\n");

  const invPath = path.join(ROOT, "artifacts", "latent_repertoire", "motor_population_inventory.json");
  const matrixPath = path.join(ROOT, "artifacts", "latent_repertoire", "sensory_motor_matrix.json");
  const reachPath = path.join(ROOT, "artifacts", "latent_repertoire", "structural_reachability.json");
  const directPath = path.join(ROOT, "artifacts", "latent_repertoire", "direct_output_viability.json");
  const rescuePath = path.join(ROOT, "artifacts", "latent_repertoire", "intermediate_rescue.json");
  const bottlesPath = path.join(ROOT, "artifacts", "latent_repertoire", "dynamics_bottlenecks.json");
  const asymPath = path.join(ROOT, "artifacts", "latent_repertoire", "bilateral_symmetry.json");

  const inv = JSON.parse(fs.readFileSync(invPath, "utf-8"));
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8"));
  const reach = JSON.parse(fs.readFileSync(reachPath, "utf-8"));
  const direct = JSON.parse(fs.readFileSync(directPath, "utf-8"));
  const rescue = fs.existsSync(rescuePath) ? JSON.parse(fs.readFileSync(rescuePath, "utf-8")) : { tests: [] };
  const bottles = fs.existsSync(bottlesPath) ? JSON.parse(fs.readFileSync(bottlesPath, "utf-8")) : { audited_pathways: [] };
  const asym = fs.existsSync(asymPath) ? JSON.parse(fs.readFileSync(asymPath, "utf-8")) : { modality_convergence: [] };

  const directMap = new Map();
  for (const p of direct.programs) directMap.set(p.motor_program, p);

  const convergenceMap = new Map();
  for (const c of asym.modality_convergence || []) convergenceMap.set(c.motor_program, c);

  const ID_MAP = {
    locomotion_forward: "forward",
    locomotion_backward: "backward",
    turn_left: "turn_left",
    turn_right: "turn_right",
    giant_fiber_escape: "escape",
    looming_takeoff: "takeoff",
    front_leg_groom: "groom",
    courtship_pIP10: "courtP",
    courtship_pursuit_DNp13: "courtDN",
    quiescent_halt: "halt",
  };

  const classifications = [];

  for (const prog of inv.programs || []) {
    const popId = ID_MAP[prog.motor_program] || prog.motor_program;
    const dRecord = directMap.get(popId) || {};
    const convRecord = convergenceMap.get(popId) || {};

    // Get all sensory trials for this motor program
    const trials = Object.values(matrix.matrix || {}).map(m => m[popId]).filter(Boolean);
    const reachRecords = Object.values(reach.matrix || {}).map(r => r[popId]).filter(Boolean);

    const maxEvokedHz = Math.max(0, ...trials.map(t => t.mean_evoked_hz ?? t.mean_evoked_rate_hz ?? 0));
    const maxCandStrength = Math.max(0, ...trials.map(t => t.candidate_strength ?? t.candidate_activation_strength ?? 0));
    const totalStructWeight = reachRecords.reduce((sum, r) => sum + (r.cumulative_incoming_weight || 0), 0);
    const minHops = reachRecords.length > 0 ? Math.min(...reachRecords.map(r => r.min_hops || 999)) : 999;

    const isDownstreamViable = dRecord.downstream_viability === true;
    const isCandidateMapped = prog.embodiment_status === "FULLY_EMBODIED" || prog.candidate_bridge_action !== null;

    let repertoireClass = "UNRESOLVED";
    let rationale = "";
    let theoreticalPlasticityAmenability = "none of the above";

    if (!isCandidateMapped) {
      // Unembodied / no candidate mapping
      if (totalStructWeight > 0 && maxEvokedHz > 0.5) {
        repertoireClass = "READOUT_LIMITED";
        rationale = "DNs fire or can be recruited, but CandidateBridge has no candidate action specification.";
      } else if (totalStructWeight > 0) {
        repertoireClass = "LATENT";
        rationale = "Structurally connected, but unembodied in readout and unrecruited by natural tested drive.";
        theoreticalPlasticityAmenability = "intermediate efficacy plasticity";
      } else {
        repertoireClass = "STRUCTURALLY_LIMITED";
        rationale = "No meaningful structural connectivity found from tested sensory channels.";
      }
    } else if (maxEvokedHz >= 0.5 && maxCandStrength >= 0.1) {
      repertoireClass = "EXPRESSED";
      rationale = `Robustly recruited by at least one natural sensory channel (peak evoked rate = ${maxEvokedHz.toFixed(2)} Hz, candidate strength = ${maxCandStrength.toFixed(3)}).`;
      theoreticalPlasticityAmenability = "none of the above";
    } else if (totalStructWeight > 0 && isDownstreamViable && maxEvokedHz < 0.2) {
      repertoireClass = "LATENT";
      rationale = `Structurally present (${totalStructWeight} cumulative weight, ${minHops} hops) and downstream readout is viable upon direct stimulation, but natural sensory drive fails to evoke motor activity (peak rate = ${maxEvokedHz.toFixed(2)} Hz).`;

      // Determine plasticity amenability
      if (minHops <= 2) {
        theoreticalPlasticityAmenability = "afferent efficacy plasticity";
      } else if (minHops === 3) {
        theoreticalPlasticityAmenability = "intermediate efficacy plasticity";
      } else {
        theoreticalPlasticityAmenability = "projection efficacy plasticity";
      }
    } else if (maxEvokedHz >= 0.2 && maxCandStrength < 0.05 && isCandidateMapped) {
      repertoireClass = "READOUT_LIMITED";
      rationale = `Target DNs show detectable firing (${maxEvokedHz.toFixed(2)} Hz), but CandidateBridge threshold/scaling fails to generate an active candidate.`;
    } else if (totalStructWeight === 0 || minHops > 4) {
      repertoireClass = "STRUCTURALLY_LIMITED";
      rationale = "Insufficient structural connectivity from tested sensory modalities.";
    } else {
      repertoireClass = "STRUCTURALLY_PRESENT_BUT_WEAKLY_RECRUITED";
      rationale = `Weakly evoked (${maxEvokedHz.toFixed(2)} Hz) and produces sub-threshold candidate activation.`;
      theoreticalPlasticityAmenability = "intermediate efficacy plasticity";
    }

    const dnTypes = Array.from(new Set((prog.neurons || []).map(n => n.type_label)));

    classifications.push({
      motor_program_id: prog.motor_program,
      label: prog.description,
      neuron_count: prog.total_neurons,
      dn_types: dnTypes,
      candidate_action: prog.candidate_bridge_action,
      repertoire_classification: repertoireClass,
      rationale,
      evidence_summary: {
        min_structural_hops: minHops < 999 ? minHops : null,
        cumulative_structural_weight: totalStructWeight,
        peak_evoked_rate_hz: +maxEvokedHz.toFixed(4),
        peak_candidate_strength: +maxCandStrength.toFixed(4),
        downstream_direct_viability: isDownstreamViable,
        candidate_mapped: isCandidateMapped,
      },
      theoretical_plasticity_amenability: theoreticalPlasticityAmenability,
    });

    console.log(`Program: ${prog.motor_program.padEnd(25)} -> ${repertoireClass.padEnd(20)} | Plasticity: ${theoreticalPlasticityAmenability}`);
  }

  const classCounts = {};
  for (const c of classifications) {
    classCounts[c.repertoire_classification] = (classCounts[c.repertoire_classification] || 0) + 1;
  }

  // 2. Pathway-Level Classifications (20 sensory channels x 9 motor programs = 180 pathways)
  const pathwayClassifications = [];
  const pathwayCounts = {
    ROBUSTLY_EXPRESSIBLE: 0,
    STRUCTURALLY_PRESENT_BUT_WEAKLY_RECRUITED: 0,
    STRUCTURALLY_PRESENT_BUT_DYNAMICALLY_SILENT: 0,
    READOUT_LIMITED: 0,
    STRUCTURALLY_UNREACHABLE: 0,
  };

  const channelNames = Object.keys(matrix.matrix || {});
  for (const chan of channelNames) {
    for (const prog of inv.programs || []) {
      const popId = ID_MAP[prog.motor_program] || prog.motor_program;
      if (popId === "halt") continue; // halt is derived neural

      const r = reach.matrix?.[chan]?.[popId] || {};
      const f = matrix.matrix?.[chan]?.[popId] || {};
      const d = directMap.get(popId) || {};

      const hops = r.min_hops ?? null;
      const weight = r.cumulative_incoming_weight || 0;
      const evokedHz = f.mean_evoked_hz ?? f.mean_evoked_rate_hz ?? 0;
      const candStrength = f.candidate_strength ?? f.candidate_activation_strength ?? 0;
      const isCandidateMapped = prog.candidate_bridge_action !== null &&
                                !prog.candidate_bridge_action.startsWith("unmapped_");

      let pClass = "STRUCTURALLY_UNREACHABLE";
      let plasticityAmenable = "none of the above";

      if (hops === null || weight === 0 || hops > 3) {
        pClass = "STRUCTURALLY_UNREACHABLE";
      } else if (!isCandidateMapped) {
        pClass = "READOUT_LIMITED";
      } else if (evokedHz >= 0.5 && candStrength >= 0.1) {
        pClass = "ROBUSTLY_EXPRESSIBLE";
      } else if (evokedHz > 0.05) {
        pClass = "STRUCTURALLY_PRESENT_BUT_WEAKLY_RECRUITED";
        plasticityAmenable = "intermediate efficacy plasticity";
      } else {
        pClass = "STRUCTURALLY_PRESENT_BUT_DYNAMICALLY_SILENT";
        if (hops <= 2) {
          plasticityAmenable = "afferent efficacy plasticity";
        } else {
          plasticityAmenable = "intermediate efficacy plasticity";
        }
      }

      pathwayCounts[pClass] = (pathwayCounts[pClass] || 0) + 1;

      pathwayClassifications.push({
        sensory_channel: chan,
        motor_program: prog.motor_program,
        motor_id: popId,
        min_hops: hops,
        cumulative_weight: weight,
        mean_evoked_hz: +evokedHz.toFixed(4),
        candidate_strength: +candStrength.toFixed(4),
        classification: pClass,
        theoretical_plasticity_amenability: plasticityAmenable,
      });
    }
  }

  console.log("\nPathway-level Class Distribution (180 pathways):");
  for (const [k, v] of Object.entries(pathwayCounts)) {
    console.log(`  ${k.padEnd(45)}: ${String(v).padStart(3)} (${((v / pathwayClassifications.length) * 100).toFixed(1)}%)`);
  }

  const output = {
    schema: "latent_repertoire.classification.v1",
    timestamp: new Date().toISOString(),
    total_programs: classifications.length,
    program_classification_counts: classCounts,
    program_classifications: classifications,
    total_pathways: pathwayClassifications.length,
    pathway_classification_counts: pathwayCounts,
    pathway_classifications: pathwayClassifications,
  };

  const outPath = path.join(ROOT, "artifacts", "latent_repertoire", "classification.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nArtifact written to: ${outPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
