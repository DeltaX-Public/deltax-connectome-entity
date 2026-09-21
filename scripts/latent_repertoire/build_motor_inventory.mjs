/**
 * build_motor_inventory.mjs
 * Latent Motor Repertoire Atlas - Task 1: Inventory Motor Output Populations
 *
 * Audits all currently known descending / motor-associated output populations
 * identified or used in deltax-connectome-entity.
 *
 * Captures:
 * - neuron indices and bodyIds
 * - side / hemisphere (1=Left, 2=Right, 3=Midline)
 * - cell type label
 * - superclass
 * - neurotransmitter and sign
 * - CandidateBridge action_class mapping
 * - whether executable in RoverBody ('forward', 'backward', 'left', 'right', 'stop')
 * - embodiment status (FULLY_EMBODIED vs UNEMBODIED)
 * - source citation / literature provenance
 *
 * Output: artifacts/latent_repertoire/motor_population_inventory.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const UPSTREAM = path.resolve(ROOT, "upstream", "fly-brain");

const { loadAll } = await import(path.join(UPSTREAM, "scripts", "lib_node.mjs"));
const { DN_ROLES } = await import(path.join(UPSTREAM, "src", "sim", "motor.js"));
const { NT_SIGN } = await import(path.join(UPSTREAM, "src", "ratenet.js"));

const LITERATURE_CITATIONS = {
  forward: "Cande et al. 2018 (eLife 7:e34275); Bidaye et al. 2014/2020",
  backward: "Bidaye et al. 2014 (Science 344:97-101) - Moonwalker Descending Neurons (MDN)",
  turn_left: "Rayshubskiy et al. 2020 (eLife 9:e62377); Namiki et al. 2018 - Ipsilateral DNa02/DNa01/DNp09 steering",
  turn_right: "Rayshubskiy et al. 2020; Namiki et al. 2018 - Contralateral DNa02/DNa01/DNp09 steering",
  escape: "von Reyn et al. 2014 (Nature Neurosci 17:1341-1348) - Giant Fibre (DNp01/GF) ballistic jump",
  takeoff: "Namiki et al. 2018 (eLife 7:e34272); von Reyn et al. 2014 - Looming-sensitive non-GF escape DNs (DNp02, DNp04)",
  groom: "Seeds et al. 2014 (eLife 3:e02951); Hampel et al. 2015 - Anterior grooming command DNs (DNg07, DNg08)",
  courtP: "Deutsch et al. 2020 (Curr Biol 30:2119-2131) - P1->VNC courtship song interneuron (pIP10 / fru+)",
  courtDN: "Sten et al. 2021; Deutsch et al. 2020 - Courtship pursuit descending neuron (DNp13)",
  halt: "Bidaye et al. 2014/2020; derived neural quiescent standing posture",
};

async function main() {
  console.log("=== Task 1: Inventory Motor Output Populations ===\n");

  const origCwd = process.cwd();
  process.chdir(UPSTREAM);
  let data;
  try {
    data = loadAll();
  } finally {
    process.chdir(origCwd);
  }

  const { N, byType, side, nt, meta, bodyIds } = data;

  const populations = [
    {
      motor_program: "locomotion_forward",
      description: "Forward walking translation drive",
      candidate_bridge_action: "locomotion_forward",
      actuator_action: "forward",
      is_executable_in_rover: true,
      embodiment_status: "FULLY_EMBODIED",
      literature_provenance: LITERATURE_CITATIONS.forward,
      dn_roles_spec: DN_ROLES.forward,
      target_sides: [1, 2], // bilateral
    },
    {
      motor_program: "locomotion_backward",
      description: "Backward walking / aversive withdrawal drive (MDN)",
      candidate_bridge_action: "locomotion_backward",
      actuator_action: "backward",
      is_executable_in_rover: true,
      embodiment_status: "FULLY_EMBODIED",
      literature_provenance: LITERATURE_CITATIONS.backward,
      dn_roles_spec: DN_ROLES.backward,
      target_sides: [1, 2], // bilateral
    },
    {
      motor_program: "turn_left",
      description: "Counter-clockwise / leftward steering torque",
      candidate_bridge_action: "turn_left",
      actuator_action: "left",
      is_executable_in_rover: true,
      embodiment_status: "FULLY_EMBODIED",
      literature_provenance: LITERATURE_CITATIONS.turn_left,
      dn_roles_spec: DN_ROLES.turn,
      target_sides: [1], // hemisphere 1 = Left
    },
    {
      motor_program: "turn_right",
      description: "Clockwise / rightward steering torque",
      candidate_bridge_action: "turn_right",
      actuator_action: "right",
      is_executable_in_rover: true,
      embodiment_status: "FULLY_EMBODIED",
      literature_provenance: LITERATURE_CITATIONS.turn_right,
      dn_roles_spec: DN_ROLES.turn,
      target_sides: [2], // hemisphere 2 = Right
    },
    {
      motor_program: "giant_fiber_escape",
      description: "Ballistic escape jump via Giant Fibre (DNp01)",
      candidate_bridge_action: "giant_fiber_escape",
      actuator_action: null,
      is_executable_in_rover: false,
      embodiment_status: "UNEMBODIED",
      literature_provenance: LITERATURE_CITATIONS.escape,
      dn_roles_spec: DN_ROLES.escape,
      target_sides: [1, 2],
    },
    {
      motor_program: "looming_takeoff",
      description: "Non-GF visual looming evasion / takeoff (DNp02, DNp04)",
      candidate_bridge_action: "giant_fiber_escape", // grouped under escape in READOUT_C
      actuator_action: null,
      is_executable_in_rover: false,
      embodiment_status: "UNEMBODIED",
      literature_provenance: LITERATURE_CITATIONS.takeoff,
      dn_roles_spec: DN_ROLES.takeoff,
      target_sides: [1, 2],
    },
    {
      motor_program: "front_leg_groom",
      description: "Head and anterior grooming sweeps (DNg07, DNg08)",
      candidate_bridge_action: "groom",
      actuator_action: null,
      is_executable_in_rover: false,
      embodiment_status: "UNEMBODIED",
      literature_provenance: LITERATURE_CITATIONS.groom,
      dn_roles_spec: DN_ROLES.groom,
      target_sides: [1, 2],
    },
    {
      motor_program: "courtship_pIP10",
      description: "P1->VNC courtship interneuron drive (pIP10)",
      candidate_bridge_action: "unmapped_courtP",
      actuator_action: null,
      is_executable_in_rover: false,
      embodiment_status: "UNEMBODIED",
      literature_provenance: LITERATURE_CITATIONS.courtP,
      dn_roles_spec: DN_ROLES.courtP,
      target_sides: [1, 2],
    },
    {
      motor_program: "courtship_pursuit_DNp13",
      description: "Courtship pursuit descending drive (DNp13)",
      candidate_bridge_action: "unmapped_courtDN",
      actuator_action: null,
      is_executable_in_rover: false,
      embodiment_status: "UNEMBODIED",
      literature_provenance: LITERATURE_CITATIONS.courtDN,
      dn_roles_spec: DN_ROLES.courtDN,
      target_sides: [1, 2],
    },
    {
      motor_program: "quiescent_halt",
      description: "Standing posture / braking when translation and steering are inactive",
      candidate_bridge_action: "halt",
      actuator_action: "stop",
      is_executable_in_rover: true,
      embodiment_status: "FULLY_EMBODIED",
      literature_provenance: LITERATURE_CITATIONS.halt,
      dn_roles_spec: {},
      target_sides: [1, 2, 3],
    },
  ];

  const auditedInventory = [];

  for (const pop of populations) {
    const constituentNeurons = [];

    for (const [typeName, weight] of Object.entries(pop.dn_roles_spec)) {
      for (const targetSide of pop.target_sides) {
        const indices = byType(typeName, targetSide) || [];
        for (const idx of indices) {
          constituentNeurons.push({
            neuron_index: idx,
            body_id: String(bodyIds[idx]),
            type_label: typeName,
            role_weight: weight,
            side: side[idx],
            side_label: side[idx] === 1 ? "Left" : side[idx] === 2 ? "Right" : "Midline",
            superclass: meta.superclasses ? meta.superclasses[idx] : "descending",
            nt_code: nt[idx],
            nt_sign: NT_SIGN[nt[idx]] || 0,
            nt_name: nt[idx] === 1 ? "acetylcholine (excitatory)" : nt[idx] === 2 ? "GABA (inhibitory)" : nt[idx] === 3 ? "glutamate (inhibitory)" : "other",
          });
        }
      }
    }

    const record = {
      motor_program: pop.motor_program,
      description: pop.description,
      candidate_bridge_action: pop.candidate_bridge_action,
      actuator_action: pop.actuator_action,
      is_executable_in_rover: pop.is_executable_in_rover,
      embodiment_status: pop.embodiment_status,
      literature_provenance: pop.literature_provenance,
      total_neurons: constituentNeurons.length,
      neurons: constituentNeurons,
    };

    auditedInventory.push(record);

    console.log(`Program: ${pop.motor_program.padEnd(25)} | Neurons: ${String(constituentNeurons.length).padStart(3)} | Embodied: ${pop.embodiment_status.padEnd(14)} | Action: ${pop.actuator_action || "none"}`);
  }

  const output = {
    schema: "latent_repertoire.motor_population_inventory.v1",
    timestamp: new Date().toISOString(),
    total_motor_programs: auditedInventory.length,
    programs: auditedInventory,
  };

  const outPath = path.join(ROOT, "artifacts", "latent_repertoire", "motor_population_inventory.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nArtifact written to: ${outPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
