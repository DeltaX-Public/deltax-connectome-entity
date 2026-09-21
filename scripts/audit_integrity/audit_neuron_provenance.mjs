import fs from "fs";
import path from "path";

export function auditNeuronProvenance() {
  console.log("=== LANE 2.3: NEURON IDENTITIES & MORPHOLOGY PROVENANCE AUDIT ===");

  const metaPath = path.join(process.cwd(), "upstream/fly-brain/public/data/meta.json");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  console.log(`Loaded meta.json with ${Object.keys(meta).length} top-level fields.`);

  // Check key neurons: AN03A008 right (2937), DNa02 right (332), left DNa02 (130496)
  const targetIndices = [2937, 332, 130496, 541, 1048, 6, 0];
  const names = meta.names || meta.types || [];
  const bodyIds = meta.bodyIds || meta.rootIds || [];
  const superclasses = meta.superclasses || [];

  for (const idx of targetIndices) {
    const name = names[idx] || "Unknown";
    const bodyId = bodyIds[idx] || "Unknown";
    const superclass = superclasses[idx] || "Unknown";
    console.log(`Neuron idx ${idx}: Name=${name}, BodyID=${bodyId}, Superclass=${superclass}`);
  }

  // Check size / morphology data provenance
  const sizePath = path.join(process.cwd(), "upstream/fly-brain/public/data/neuron_size.bin");
  if (fs.existsSync(sizePath)) {
    const sizeBuffer = fs.readFileSync(sizePath);
    const sizeArr = new Float32Array(sizeBuffer.buffer, sizeBuffer.byteOffset, sizeBuffer.byteLength / 4);
    console.log(`\nNeuron size buffer: ${sizeArr.length} neurons.`);
    for (const idx of targetIndices) {
      console.log(`Neuron idx ${idx} volume (voxels): ${sizeArr[idx]}`);
    }
  }
}

auditNeuronProvenance();
