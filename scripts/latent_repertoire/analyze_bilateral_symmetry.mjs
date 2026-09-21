/**
 * analyze_bilateral_symmetry.mjs
 * Latent Motor Repertoire Atlas - Task 8: Left/Right and Modality Symmetry Analysis
 *
 * 1. Bilateral Homologue Analysis:
 *    For all 10 bilateral sensory channels, compares Left vs Right structural reachability
 *    and functional motor recruitment across all 9 motor populations.
 *    Computes Bilateral Asymmetry Index: |L - R| / (L + R + eps).
 *
 * 2. Cross-Modality Convergence Analysis:
 *    For each motor program, ranks all converging sensory modalities to determine whether
 *    a motor program is uniquely recruited by a specific modality or broadly recruit-able,
 *    and highlights cases where one modality succeeds while an equally connected modality fails.
 *
 * Output: artifacts/latent_repertoire/bilateral_symmetry.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

async function main() {
  console.log("=== Task 8: Bilateral & Modality Symmetry Analysis ===\n");

  const matrixPath = path.join(ROOT, "artifacts", "latent_repertoire", "sensory_motor_matrix.json");
  const reachPath = path.join(ROOT, "artifacts", "latent_repertoire", "structural_reachability.json");

  const matrixData = JSON.parse(fs.readFileSync(matrixPath, "utf-8"));
  const reachData = JSON.parse(fs.readFileSync(reachPath, "utf-8"));

  // Index reachability by `sensorName|motorId`
  const reachMap = new Map();
  for (const [chan, motors] of Object.entries(reachData.matrix || {})) {
    for (const [mId, r] of Object.entries(motors)) {
      reachMap.set(`${chan}|${mId}`, r);
    }
  }

  // Index functional matrix by `sensorName|motorId`
  const funcMap = new Map();
  for (const [chan, motors] of Object.entries(matrixData.matrix || {})) {
    for (const [mId, f] of Object.entries(motors)) {
      funcMap.set(`${chan}|${mId}`, f);
    }
  }

  const BILATERAL_PAIRS = [
    { group: "tactile_T1", label: "Tactile T1", left: "tactile T1 left", right: "tactile T1 right" },
    { group: "tactile_T2", label: "Tactile T2", left: "tactile T2 left", right: "tactile T2 right" },
    { group: "tactile_T3", label: "Tactile T3", left: "tactile T3 left", right: "tactile T3 right" },
    { group: "jo_wind", label: "Johnston's Organ Wind/Gravity", left: "JO wind/gravity left", right: "JO wind/gravity right" },
    { group: "jo_auditory", label: "Johnston's Organ Auditory", left: "JO auditory left", right: "JO auditory right" },
    { group: "thermo", label: "Thermosensory", left: "thermosensory left", right: "thermosensory right" },
    { group: "taste_T1", label: "Taste T1", left: "taste T1 left", right: "taste T1 right" },
    { group: "visual", label: "Visual Eye", left: "visual left", right: "visual right" },
    { group: "wing_bristles", label: "Wing/Notum Bristles", left: "wing/notum bristles left", right: "wing/notum bristles right" },
    { group: "haltere", label: "Haltere Mechanosensory", left: "haltere left", right: "haltere right" },
  ];

  const MOTOR_PROGRAMS = [
    { id: "forward", label: "Forward Locomotion" },
    { id: "backward", label: "Backward Locomotion (MDN)" },
    { id: "turn_left", label: "Turn Left Steering" },
    { id: "turn_right", label: "Turn Right Steering" },
    { id: "escape", label: "Giant Fiber Escape (DNp01)" },
    { id: "takeoff", label: "Looming Takeoff (DNp02, DNp04)" },
    { id: "groom", label: "Anterior Grooming (DNg07, DNg08)" },
    { id: "courtP", label: "Courtship Song (pIP10)" },
    { id: "courtDN", label: "Courtship Pursuit (DNp13)" },
  ];

  // 1. Bilateral Comparisons
  const bilateralResults = [];

  for (const pair of BILATERAL_PAIRS) {
    for (const motor of MOTOR_PROGRAMS) {
      const reachL = reachMap.get(`${pair.left}|${motor.id}`) || {};
      const reachR = reachMap.get(`${pair.right}|${motor.id}`) || {};
      const funcL = funcMap.get(`${pair.left}|${motor.id}`) || {};
      const funcR = funcMap.get(`${pair.right}|${motor.id}`) || {};

      const weightL = reachL.cumulative_incoming_weight || 0;
      const weightR = reachR.cumulative_incoming_weight || 0;
      const rateL = funcL.mean_evoked_hz ?? funcL.mean_evoked_rate_hz ?? 0;
      const rateR = funcR.mean_evoked_hz ?? funcR.mean_evoked_rate_hz ?? 0;
      const candL = funcL.candidate_strength ?? funcL.candidate_activation_strength ?? 0;
      const candR = funcR.candidate_strength ?? funcR.candidate_activation_strength ?? 0;

      const structAsym = (weightL + weightR > 0)
        ? Math.abs(weightL - weightR) / (weightL + weightR)
        : 0;
      const funcAsym = (rateL + rateR > 0)
        ? Math.abs(rateL - rateR) / (rateL + rateR)
        : 0;

      const isMarkedAsym = (structAsym > 0.4 || funcAsym > 0.4);

      bilateralResults.push({
        sensory_group: pair.group,
        sensory_label: pair.label,
        left_channel: pair.left,
        right_channel: pair.right,
        motor_program: motor.id,
        motor_label: motor.label,
        structural: {
          left_hops: reachL.min_hops ?? null,
          right_hops: reachR.min_hops ?? null,
          left_cumulative_weight: weightL,
          right_cumulative_weight: weightR,
          structural_asymmetry_index: +structAsym.toFixed(4),
        },
        functional: {
          left_mean_hz: rateL,
          right_mean_hz: rateR,
          left_candidate_strength: candL,
          right_candidate_strength: candR,
          functional_asymmetry_index: +funcAsym.toFixed(4),
        },
        is_marked_asymmetry: isMarkedAsym,
      });
    }
  }

  // 2. Modality Convergence Analysis
  const modalityConvergence = [];

  for (const motor of MOTOR_PROGRAMS) {
    const channelResponses = [];

    const allChannels = Object.keys(matrixData.matrix || {});
    for (const chan of allChannels) {
      const r = reachMap.get(`${chan}|${motor.id}`) || {};
      const f = funcMap.get(`${chan}|${motor.id}`) || {};
      const side = chan.endsWith("left") ? "left" : chan.endsWith("right") ? "right" : "midline";
      const group = chan.replace(/ (left|right)$/, "");
      const evokedHz = f.mean_evoked_hz ?? f.mean_evoked_rate_hz ?? 0;
      const candStr = f.candidate_strength ?? f.candidate_activation_strength ?? 0;

      channelResponses.push({
        channel: chan,
        group,
        side,
        min_hops: r.min_hops ?? null,
        cumulative_weight: r.cumulative_incoming_weight || 0,
        mean_evoked_hz: evokedHz,
        candidate_strength: candStr,
        is_recruited: evokedHz > 0.1,
      });
    }

    channelResponses.sort((a, b) => b.mean_evoked_hz - a.mean_evoked_hz);

    const recruitedChannels = channelResponses.filter(c => c.is_recruited);
    const silentChannels = channelResponses.filter(c => !c.is_recruited && c.cumulative_weight > 500);

    modalityConvergence.push({
      motor_program: motor.id,
      motor_label: motor.label,
      total_channels_tested: channelResponses.length,
      recruited_channel_count: recruitedChannels.length,
      recruiting_modalities: recruitedChannels.map(c => ({
        channel: c.channel,
        mean_evoked_hz: c.mean_evoked_hz,
        candidate_strength: c.candidate_strength,
      })),
      silent_connected_modalities: silentChannels.map(c => ({
        channel: c.channel,
        cumulative_weight: c.cumulative_weight,
        min_hops: c.min_hops,
      })),
      recruitment_breadth: recruitedChannels.length >= 4
        ? "BROAD_MULTI_MODAL"
        : recruitedChannels.length >= 1
        ? "NARROW_MODALITY_SPECIFIC"
        : "COMPLETELY_SILENT",
    });
  }

  // Filter top asymmetric findings
  const topAsymmetries = bilateralResults
    .filter(r => r.is_marked_asymmetry)
    .sort((a, b) => (b.functional.functional_asymmetry_index + b.structural.structural_asymmetry_index)
                  - (a.functional.functional_asymmetry_index + a.structural.structural_asymmetry_index));

  console.log(`Found ${topAsymmetries.length} marked bilateral asymmetries.`);
  console.log("\nTop 5 Bilateral Asymmetries:");
  for (const asym of topAsymmetries.slice(0, 5)) {
    console.log(`  ${asym.sensory_label} -> ${asym.motor_label}: Func Asym=${asym.functional.functional_asymmetry_index}, Struct Asym=${asym.structural.structural_asymmetry_index} (L=${asym.functional.left_mean_hz}Hz vs R=${asym.functional.right_mean_hz}Hz)`);
  }

  const output = {
    schema: "latent_repertoire.bilateral_symmetry.v1",
    timestamp: new Date().toISOString(),
    total_bilateral_pairs_audited: bilateralResults.length,
    marked_asymmetries_count: topAsymmetries.length,
    top_asymmetries: topAsymmetries,
    bilateral_pairs_detail: bilateralResults,
    modality_convergence: modalityConvergence,
  };

  const outPath = path.join(ROOT, "artifacts", "latent_repertoire", "bilateral_symmetry.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nArtifact written to: ${outPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
