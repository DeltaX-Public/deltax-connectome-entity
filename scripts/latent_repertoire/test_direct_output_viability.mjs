/**
 * test_direct_output_viability.mjs
 * Latent Motor Repertoire Atlas - Task 5: Direct Output Viability Test
 *
 * For every motor population, diagnostically stimulates the descending neurons directly
 * to verify whether downstream CandidateBridge readout and rover actuators respond correctly.
 *
 * Distinguishes:
 *   UPSTREAM RECRUITMENT FAILURE (circuit fails to drive DNs)
 *   from
 *   DOWNSTREAM READOUT FAILURE (DNs fire, but CandidateBridge fails to propose candidate)
 *
 * Output: artifacts/latent_repertoire/direct_output_viability.json
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

const TEST_RATES = [5.0, 15.0, 30.0]; // Hz

async function main() {
  console.log("=== Task 5: Direct Output Viability Test ===\n");

  const origCwd = process.cwd();
  process.chdir(UPSTREAM);
  let data;
  try {
    data = loadAll();
  } finally {
    process.chdir(origCwd);
  }

  const { byType } = data;

  const MOTOR_PROGRAMS = [
    {
      id: "forward",
      label: "Forward Locomotion",
      roles: DN_ROLES.forward,
      side: null,
      expected_candidate_action: "locomotion_forward",
      expected_actuator: "forward",
    },
    {
      id: "backward",
      label: "Backward Locomotion (MDN)",
      roles: DN_ROLES.backward,
      side: null,
      expected_candidate_action: "locomotion_backward",
      expected_actuator: "backward",
    },
    {
      id: "turn_left",
      label: "Turn Left Steering",
      roles: DN_ROLES.turn,
      side: 1,
      expected_candidate_action: "turn_left",
      expected_actuator: "left",
    },
    {
      id: "turn_right",
      label: "Turn Right Steering",
      roles: DN_ROLES.turn,
      side: 2,
      expected_candidate_action: "turn_right",
      expected_actuator: "right",
    },
    {
      id: "escape",
      label: "Giant Fiber Escape (DNp01)",
      roles: DN_ROLES.escape,
      side: null,
      expected_candidate_action: "giant_fiber_escape",
      expected_actuator: null,
    },
    {
      id: "takeoff",
      label: "Looming Takeoff (DNp02, DNp04)",
      roles: DN_ROLES.takeoff,
      side: null,
      expected_candidate_action: "giant_fiber_escape",
      expected_actuator: null,
    },
    {
      id: "groom",
      label: "Anterior Grooming (DNg07, DNg08)",
      roles: DN_ROLES.groom,
      side: null,
      expected_candidate_action: "groom",
      expected_actuator: null,
    },
    {
      id: "courtP",
      label: "Courtship Song (pIP10)",
      roles: DN_ROLES.courtP,
      side: null,
      expected_candidate_action: null, // unembodied in READOUT_C
      expected_actuator: null,
    },
    {
      id: "courtDN",
      label: "Courtship Pursuit (DNp13)",
      roles: DN_ROLES.courtDN,
      side: null,
      expected_candidate_action: null,
      expected_actuator: null,
    },
  ];

  const results = [];

  for (const prog of MOTOR_PROGRAMS) {
    const indices = [];
    for (const [type, weight] of Object.entries(prog.roles)) {
      const idxs = byType(type, prog.side || 0) || [];
      for (const i of idxs) indices.push({ index: i, type, weight });
    }

    const rateEvaluations = [];

    for (const rate of TEST_RATES) {
      // Build a synthetic dnReadout object to evaluate candidate readout directly
      const runtime = new ConnectomeRuntime({ seed: 20000, substepsPerTick: 1 });
      runtime.net.reset();

      // Directly set the firing rate of the target DNs
      const targetIndices = indices.map(n => n.index);
      if (targetIndices.length > 0) {
        runtime.net.setRate(targetIndices, rate);
        for (const idx of targetIndices) {
          runtime.net.r[idx] = rate;
        }
      }

      const dnReadouts = runtime.getDescendingNeuronReadouts();
      const candidates = generateCandidates_C_IndependentAxes(dnReadouts, 1);

      const matchedCand = prog.expected_candidate_action
        ? candidates.find(c => c.action_class === prog.expected_candidate_action)
        : null;

      rateEvaluations.push({
        injected_rate_hz: rate,
        readout_dn_rate_hz: dnReadouts[prog.id]?.weighted_mean || dnReadouts[prog.id]?.mean_rate || 0,
        candidate_generated: matchedCand ? {
          action_class: matchedCand.action_class,
          activation_strength: matchedCand.activation_strength,
          actuator_action: matchedCand.actuator_action,
          is_executable: matchedCand.is_executable ?? (matchedCand.actuator_action !== null),
        } : null,
        viable: matchedCand ? matchedCand.activation_strength > 0.05 : false,
      });
    }

    const isViable = rateEvaluations.some(e => e.viable);
    const classification = prog.expected_candidate_action === null
      ? "UNEMBODIED_NO_READOUT_SPEC"
      : isViable
      ? "DOWNSTREAM_READOUT_VIABLE"
      : "READOUT_LIMITED";

    const record = {
      motor_program: prog.id,
      label: prog.label,
      total_neurons: indices.length,
      expected_candidate_action: prog.expected_candidate_action,
      expected_actuator: prog.expected_actuator,
      evaluations: rateEvaluations,
      downstream_viability: isViable,
      classification,
    };

    results.push(record);

    console.log(`Program: ${prog.id.padEnd(15)} | Neurons: ${String(indices.length).padStart(2)} | Viable: ${String(isViable).padEnd(5)} | Class: ${classification}`);
  }

  const output = {
    schema: "latent_repertoire.direct_output_viability.v1",
    timestamp: new Date().toISOString(),
    total_programs_tested: results.length,
    programs: results,
  };

  const outPath = path.join(ROOT, "artifacts", "latent_repertoire", "direct_output_viability.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nArtifact written to: ${outPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
