/**
 * validate_bilateral_asymmetry_100_seeds.mjs
 * Latent Motor Repertoire Atlas - Tasks 10 & 11: N=100 Seed Bilateral Asymmetry Validation
 *
 * Seeds: 20200..20299 (N = 100 fresh, held-out validation seeds)
 * Evaluates the top bilateral asymmetry cases:
 * - Tactile T1 left/right -> Steering (turn_left vs turn_right)
 * - JO Auditory left/right -> Giant Fiber Escape
 * - JO Wind/gravity left/right -> Steering
 * - Tactile T1 left/right -> Escape
 * - Tactile T1 left/right -> Grooming
 * - Thermosensory left/right -> Steering
 *
 * For each pair reports:
 *   - Left mean rate, Right mean rate
 *   - Dynamical Asymmetry Index (|L-R| / (L+R))
 *   - Structural Asymmetry Index (|W_L - W_R| / (W_L + W_R))
 *   - 95% Confidence Interval of difference (L - R)
 *   - Fraction of seeds preserving direction of asymmetry
 *   - Separation of Structural vs Dynamical Asymmetry
 *
 * Output: artifacts/latent_repertoire/validation/bilateral_validation_20200_20299.json
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

const SEED_START = 20200;
const SEED_COUNT = 100;
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => SEED_START + i);
const STIM_INTENSITY = 180.0; // Hz

async function main() {
  console.log(`=== Tasks 10 & 11: Bilateral Asymmetry Validation (N=${SEED_COUNT} Seeds: ${SEED_START}..${SEED_START + SEED_COUNT - 1}) ===\n`);

  const origCwd = process.cwd();
  process.chdir(UPSTREAM);
  let data;
  try {
    data = loadAll();
  } finally {
    process.chdir(origCwd);
  }

  const { meta, N, indptr, indices, weights, nt, byType, side } = data;

  const bodymapPath = path.join(UPSTREAM, "public", "data", "bodymap.json");
  const bodymap = JSON.parse(fs.readFileSync(bodymapPath, "utf-8"));
  const sensorMap = new Map();
  for (const s of bodymap.sensors || []) sensorMap.set(s.name, s.idx || []);

  // Reachability data for structural weight
  const reachPath = path.join(ROOT, "artifacts", "latent_repertoire", "structural_reachability.json");
  const reachData = JSON.parse(fs.readFileSync(reachPath, "utf-8"));

  const BILATERAL_CASES = [
    {
      id: "tactile_t1_steering",
      label: "Tactile T1 -> Steering (Turn Left vs Turn Right)",
      left_sensor: "tactile T1 left",
      right_sensor: "tactile T1 right",
      left_motor: "turn_left",
      right_motor: "turn_right",
      left_dn_types: ["DNa02", "DNa01", "DNp09"],
      right_dn_types: ["DNa02", "DNa01", "DNp09"],
      left_side: 1,
      right_side: 2,
    },
    {
      id: "jo_auditory_escape",
      label: "JO Auditory -> Giant Fiber Escape (DNp01)",
      left_sensor: "JO auditory left",
      right_sensor: "JO auditory right",
      left_motor: "escape",
      right_motor: "escape",
      left_dn_types: ["DNp01"],
      right_dn_types: ["DNp01"],
      left_side: 0,
      right_side: 0,
    },
    {
      id: "jo_wind_steering",
      label: "JO Wind/Gravity -> Steering (Turn Left vs Turn Right)",
      left_sensor: "JO wind/gravity left",
      right_sensor: "JO wind/gravity right",
      left_motor: "turn_left",
      right_motor: "turn_right",
      left_dn_types: ["DNa02", "DNa01", "DNp09"],
      right_dn_types: ["DNa02", "DNa01", "DNp09"],
      left_side: 1,
      right_side: 2,
    },
    {
      id: "tactile_t1_escape",
      label: "Tactile T1 -> Giant Fiber Escape (DNp01)",
      left_sensor: "tactile T1 left",
      right_sensor: "tactile T1 right",
      left_motor: "escape",
      right_motor: "escape",
      left_dn_types: ["DNp01"],
      right_dn_types: ["DNp01"],
      left_side: 0,
      right_side: 0,
    },
    {
      id: "tactile_t1_groom",
      label: "Tactile T1 -> Anterior Grooming (DNg07, DNg08)",
      left_sensor: "tactile T1 left",
      right_sensor: "tactile T1 right",
      left_motor: "groom",
      right_motor: "groom",
      left_dn_types: ["DNg07", "DNg08"],
      right_dn_types: ["DNg07", "DNg08"],
      left_side: 0,
      right_side: 0,
    },
    {
      id: "thermo_steering",
      label: "Thermosensory -> Steering (Turn Left vs Turn Right)",
      left_sensor: "thermosensory left",
      right_sensor: "thermosensory right",
      left_motor: "turn_left",
      right_motor: "turn_right",
      left_dn_types: ["DNa02", "DNa01", "DNp09"],
      right_dn_types: ["DNa02", "DNa01", "DNp09"],
      left_side: 1,
      right_side: 2,
    },
  ];

  // Helper to get DN indices
  function getDNIndices(types, sideVal) {
    const arr = [];
    for (const t of types) {
      const idxs = byType(t, sideVal) || [];
      arr.push(...idxs);
    }
    return arr;
  }

  // Pre-load DN indices for all cases
  for (const c of BILATERAL_CASES) {
    c.left_dn_indices = getDNIndices(c.left_dn_types, c.left_side);
    c.right_dn_indices = getDNIndices(c.right_dn_types, c.right_side);
    c.left_sensor_indices = sensorMap.get(c.left_sensor) || [];
    c.right_sensor_indices = sensorMap.get(c.right_sensor) || [];

    // Structural weights from reachability matrix
    const rL = reachData.matrix?.[c.left_sensor]?.[c.left_motor] || {};
    const rR = reachData.matrix?.[c.right_sensor]?.[c.right_motor] || {};
    c.struct_weight_left = rL.cumulative_incoming_weight || 0;
    c.struct_weight_right = rR.cumulative_incoming_weight || 0;
    c.struct_asym_index = (c.struct_weight_left + c.struct_weight_right > 0)
      ? Math.abs(c.struct_weight_left - c.struct_weight_right) / (c.struct_weight_left + c.struct_weight_right)
      : 0;

    c.per_seed_results = [];
  }

  console.log(`Executing N=${SEED_COUNT} trials across ${BILATERAL_CASES.length} bilateral pairs...`);

  // Run simulation for each seed
  for (let sIdx = 0; sIdx < SEEDS.length; sIdx++) {
    const seed = SEEDS[sIdx];
    if (sIdx % 20 === 0) console.log(`  Processing seeds ${seed}..${Math.min(SEED_START + SEED_COUNT - 1, seed + 19)}...`);

    for (const c of BILATERAL_CASES) {
      // Run Left Condition
      const runtimeL = new ConnectomeRuntime({ seed, substepsPerTick: 10 });
      runtimeL.net.reset();
      runtimeL.net.ext.fill(0);
      const drivesL = new Map();
      for (const idx of c.left_sensor_indices) drivesL.set(idx, STIM_INTENSITY);

      let leftRateSum = 0;
      let countL = 0;
      for (let tick = 1; tick <= 25; tick++) {
        if (tick >= 5 && tick <= 20) runtimeL.setSensoryDrives(drivesL);
        else runtimeL.sensoryDrives.clear();
        runtimeL.step(1);
        if (tick >= 10 && tick <= 20) {
          let rSum = 0;
          for (const idx of c.left_dn_indices) rSum += runtimeL.net.r[idx];
          leftRateSum += rSum / Math.max(1, c.left_dn_indices.length);
          countL++;
        }
      }
      const meanLeftHz = leftRateSum / countL;

      // Run Right Condition
      const runtimeR = new ConnectomeRuntime({ seed, substepsPerTick: 10 });
      runtimeR.net.reset();
      runtimeR.net.ext.fill(0);
      const drivesR = new Map();
      for (const idx of c.right_sensor_indices) drivesR.set(idx, STIM_INTENSITY);

      let rightRateSum = 0;
      let countR = 0;
      for (let tick = 1; tick <= 25; tick++) {
        if (tick >= 5 && tick <= 20) runtimeR.setSensoryDrives(drivesR);
        else runtimeR.sensoryDrives.clear();
        runtimeR.step(1);
        if (tick >= 10 && tick <= 20) {
          let rSum = 0;
          for (const idx of c.right_dn_indices) rSum += runtimeR.net.r[idx];
          rightRateSum += rSum / Math.max(1, c.right_dn_indices.length);
          countR++;
        }
      }
      const meanRightHz = rightRateSum / countR;

      c.per_seed_results.push({
        seed,
        left_rate_hz: +meanLeftHz.toFixed(4),
        right_rate_hz: +meanRightHz.toFixed(4),
        diff: +(meanLeftHz - meanRightHz).toFixed(4),
      });
    }
  }

  // Statistical Aggregation
  const validationResults = [];

  for (const c of BILATERAL_CASES) {
    const n = c.per_seed_results.length;
    const leftRates = c.per_seed_results.map(r => r.left_rate_hz);
    const rightRates = c.per_seed_results.map(r => r.right_rate_hz);
    const diffs = c.per_seed_results.map(r => r.diff);

    const meanL = leftRates.reduce((a, b) => a + b, 0) / n;
    const meanR = rightRates.reduce((a, b) => a + b, 0) / n;
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;

    // Variance and standard error of difference
    const varDiff = diffs.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / (n - 1);
    const semDiff = Math.sqrt(varDiff / n);
    const ci95Lower = +(meanDiff - 1.96 * semDiff).toFixed(4);
    const ci95Upper = +(meanDiff + 1.96 * semDiff).toFixed(4);

    // Dynamical Asymmetry Index
    const dynAsymIndex = (meanL + meanR > 0)
      ? +((Math.abs(meanL - meanR) / (meanL + meanR)).toFixed(4))
      : 0;

    // Fraction preserving direction of asymmetry
    const expectedPositive = meanDiff > 0;
    const preservingCount = diffs.filter(d => expectedPositive ? d > 0.001 : d < -0.001).length;
    const fractionPreserved = +(preservingCount / n).toFixed(4);

    // Classification of Asymmetry Source
    let asymClass = "SYMMETRIC";
    if (dynAsymIndex > 0.3 && fractionPreserved > 0.90) {
      if (c.struct_asym_index > 0.3) {
        asymClass = "STRUCTURALLY_CONSTRAINED_DYNAMICAL_ASYMMETRY";
      } else {
        asymClass = "PURE_DYNAMICAL_ASYMMETRY_EMERGENT_FROM_SYMMETRIC_WIRING";
      }
    } else if (c.struct_asym_index > 0.4 && dynAsymIndex <= 0.1) {
      asymClass = "STRUCTURAL_ASYMMETRY_WITHOUT_FUNCTIONAL_EFFECT";
    }

    validationResults.push({
      case_id: c.id,
      label: c.label,
      left_sensor: c.left_sensor,
      right_sensor: c.right_sensor,
      left_motor: c.left_motor,
      right_motor: c.right_motor,
      sample_size_N: n,
      seed_range: `${SEED_START}..${SEED_START + SEED_COUNT - 1}`,
      structural_metrics: {
        weight_left: c.struct_weight_left,
        weight_right: c.struct_weight_right,
        structural_asymmetry_index: +c.struct_asym_index.toFixed(4),
      },
      dynamical_metrics: {
        mean_left_rate_hz: +meanL.toFixed(4),
        mean_right_rate_hz: +meanR.toFixed(4),
        mean_difference_hz: +meanDiff.toFixed(4),
        difference_std_error: +semDiff.toFixed(4),
        ci_95_percent: [ci95Lower, ci95Upper],
        dynamical_asymmetry_index: dynAsymIndex,
        fraction_seeds_preserving_direction: fractionPreserved,
      },
      asymmetry_classification: asymClass,
    });

    console.log(`\nCase: ${c.label}`);
    console.log(`  Left=${meanL.toFixed(4)} Hz, Right=${meanR.toFixed(4)} Hz (Diff=${meanDiff.toFixed(4)} Hz, 95% CI=[${ci95Lower}, ${ci95Upper}])`);
    console.log(`  Dynamical Asymmetry Index=${dynAsymIndex}, Structural Asymmetry Index=${c.struct_asym_index.toFixed(4)}`);
    console.log(`  Direction Consistency=${(fractionPreserved * 100).toFixed(1)}% across N=${n} seeds | Class: ${asymClass}`);
  }

  const output = {
    schema: "latent_repertoire.bilateral_validation.v1",
    timestamp: new Date().toISOString(),
    seed_range: `${SEED_START}..${SEED_START + SEED_COUNT - 1}`,
    sample_size_N: SEED_COUNT,
    stim_intensity_hz: STIM_INTENSITY,
    cases: validationResults,
  };

  const outPath = path.join(ROOT, "artifacts", "latent_repertoire", "validation", "bilateral_validation_20200_20299.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nArtifact written: ${outPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
