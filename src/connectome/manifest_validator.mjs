/**
 * Manifest Validator for Plasticity Target Manifests.
 * Validates target manifest objects against artifacts/plasticity/target_manifest.schema.json.
 */

export function validateTargetManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Target manifest must be a non-null object.");
  }

  const requiredFields = [
    "manifest_id",
    "schema_version",
    "status",
    "source_evidence_artifact",
    "rationale",
    "eligible_populations",
    "eligible_edges",
    "safety_bounds",
    "created_at",
  ];

  for (const field of requiredFields) {
    if (!(field in manifest)) {
      throw new Error(`Target manifest missing required field: "${field}"`);
    }
  }

  if (manifest.schema_version !== "1.0.0") {
    throw new Error(`Unsupported schema_version: "${manifest.schema_version}". Expected "1.0.0".`);
  }

  const validStatuses = ["PENDING_LANE_B_EVIDENCE", "CAUSAL_TARGET_FROZEN", "DEPRECATED"];
  if (!validStatuses.includes(manifest.status)) {
    throw new Error(`Invalid status: "${manifest.status}". Expected one of: ${validStatuses.join(", ")}`);
  }

  if (!Array.isArray(manifest.eligible_populations)) {
    throw new Error("eligible_populations must be an array.");
  }
  for (const pop of manifest.eligible_populations) {
    if (!pop.population_name || !pop.role || !Array.isArray(pop.neuron_indices)) {
      throw new Error(`Invalid population entry: ${JSON.stringify(pop)}`);
    }
  }

  if (!Array.isArray(manifest.eligible_edges)) {
    throw new Error("eligible_edges must be an array.");
  }
  const validDirections = ["POTENTIATION_ONLY", "DEPRESSION_ONLY", "BIDIRECTIONAL"];
  for (const edge of manifest.eligible_edges) {
    if (typeof edge.source !== "number" || typeof edge.target !== "number") {
      throw new Error(`Invalid edge connection: ${JSON.stringify(edge)}`);
    }
    if (!validDirections.includes(edge.allowed_direction)) {
      throw new Error(`Invalid allowed_direction: "${edge.allowed_direction}". Expected: ${validDirections.join(", ")}`);
    }
  }

  const { safety_bounds } = manifest;
  if (!safety_bounds || typeof safety_bounds !== "object") {
    throw new Error("safety_bounds must be an object.");
  }
  if (typeof safety_bounds.max_total_budget !== "number" || safety_bounds.max_total_budget <= 0) {
    throw new Error("safety_bounds.max_total_budget must be a positive number.");
  }
  if (typeof safety_bounds.max_edge_delta !== "number" || safety_bounds.max_edge_delta <= 0) {
    throw new Error("safety_bounds.max_edge_delta must be a positive number.");
  }
  if (typeof safety_bounds.max_percentage_change !== "number" || safety_bounds.max_percentage_change <= 0) {
    throw new Error("safety_bounds.max_percentage_change must be a positive number.");
  }

  return true;
}
