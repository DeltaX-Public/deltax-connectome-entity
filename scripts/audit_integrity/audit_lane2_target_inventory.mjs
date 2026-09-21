import { ConnectomeRuntime } from "../../src/connectome/runtime.mjs";
import fs from "fs";
import path from "path";

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relPath), "utf8"));
}

export function auditTargetInventory() {
  console.log("=== LANE 2.1 & 2.2: TARGET INVENTORY & EFFECTIVE GRAPH AUDIT ===");

  const targetA = loadJson("artifacts/plasticity/target_a_afferent_only.json");
  const targetB = loadJson("artifacts/plasticity/target_b_projection_only.json");
  const targetC = loadJson("artifacts/plasticity/target_c_balanced_two_stage.json");
  const targetD = loadJson("artifacts/plasticity/target_d_matched_sham.json");
  const escapeManifest = loadJson("artifacts/latent_repertoire/escape_replication/proposed_target_manifest.json");

  const rt = new ConnectomeRuntime({ seed: 18100, substepsPerTick: 1, plasticity: false });

  const inventory = [];

  const checkEdge = (group, manifestName, source, target, claimedBaseWeight, notes = "") => {
    let k = -1;
    const start = rt.data.indptr[source];
    const end = rt.data.indptr[source + 1];
    for (let idx = start; idx < end; idx++) {
      if (rt.data.indices[idx] === target) {
        k = idx;
        break;
      }
    }
    let anatomicalWeight = 0;
    let runtimeWeight = 0;

    if (k >= 0) {
      anatomicalWeight = rt.data.weights[k];
      runtimeWeight = rt.net.weights[k];
    }

    const minSyn = rt.net.p.minSyn;
    const isFiltered = runtimeWeight === 0 && anatomicalWeight > 0;
    const canPlasticityRevive = isFiltered && anatomicalWeight > 0;

    const record = {
      group,
      manifest: manifestName,
      source,
      target,
      edgeIndex: k,
      claimedWeight: claimedBaseWeight,
      anatomicalWeight,
      minSynSetting: minSyn,
      activeRuntimeWeight: runtimeWeight,
      isFilteredByMinSyn: isFiltered,
      canPlasticityRevive,
      notes,
    };
    inventory.push(record);
    return record;
  };

  console.log("\n--- Auditing Target A (Afferent Only) ---");
  for (const e of targetA.eligible_edges) {
    const rec = checkEdge("STEERING_TARGET_A", "target_a_afferent_only.json", e.source, e.target, e.notes);
    console.log(`  Edge ${e.source} -> ${e.target}: Raw Synapses=${rec.anatomicalWeight}, Runtime Weight=${rec.activeRuntimeWeight} (Filtered: ${rec.isFilteredByMinSyn})`);
  }

  console.log("\n--- Auditing Target B (Projection Only) ---");
  for (const e of targetB.eligible_edges) {
    const rec = checkEdge("STEERING_TARGET_B", "target_b_projection_only.json", e.source, e.target, e.notes);
    console.log(`  Edge ${e.source} -> ${e.target}: Raw Synapses=${rec.anatomicalWeight}, Runtime Weight=${rec.activeRuntimeWeight} (Filtered: ${rec.isFilteredByMinSyn})`);
  }

  console.log("\n--- Auditing Target D (Sham) ---");
  for (const e of targetD.eligible_edges) {
    const rec = checkEdge("STEERING_TARGET_D_SHAM", "target_d_matched_sham.json", e.source, e.target, e.notes);
    console.log(`  Edge ${e.source} -> ${e.target}: Raw Synapses=${rec.anatomicalWeight}, Runtime Weight=${rec.activeRuntimeWeight} (Filtered: ${rec.isFilteredByMinSyn})`);
  }

  console.log("\n--- Auditing Proposed Escape Manifest Targets ---");
  for (const [grpKey, grp] of Object.entries(escapeManifest.target_groups)) {
    console.log(`\nGroup: ${grpKey} (${grp.label})`);
    for (const e of grp.edges) {
      const rec = checkEdge(`ESCAPE_${grpKey}`, "escape_proposed_manifest", e.source_index, e.target_index, e.baseline_weight, `${e.source_type} -> ${e.target_type}`);
      console.log(`  Edge ${e.source_index} (${e.source_type}) -> ${e.target_index} (${e.target_type}): Raw Synapses=${rec.anatomicalWeight}, Runtime Weight=${rec.activeRuntimeWeight} (Filtered: ${rec.isFilteredByMinSyn})`);
    }
  }

  const outputPath = path.join(process.cwd(), "artifacts", "plasticity", "effective_graph_target_inventory.json");
  fs.writeFileSync(outputPath, JSON.stringify(inventory, null, 2));
  console.log(`\nSaved inventory with ${inventory.length} audited edges to ${outputPath}`);
  return inventory;
}

auditTargetInventory();
