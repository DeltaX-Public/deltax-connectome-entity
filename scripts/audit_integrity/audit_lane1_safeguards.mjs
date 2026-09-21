import { ConnectomeRuntime } from "../../src/connectome/runtime.mjs";
import { PLASTICITY_RULES } from "../../src/connectome/plasticity_overlay.mjs";
import crypto from "crypto";

export function auditSafeguards() {
  console.log("\n=======================================================");
  console.log("LANE 1.5: SAFEGUARDS & IMMUTABILITY AUDIT");
  console.log("=======================================================");

  const rt = new ConnectomeRuntime({
    seed: 18100,
    substepsPerTick: 1,
    plasticity: {
      enabled: true,
      rule: PLASTICITY_RULES.LOCAL_HEBBIAN,
      learningRate: 0.1,
      totalGlobalBudget: 10.0,
      maxAbsoluteDeltaW: 5.0,
      maxPercentageDeviation: 0.5,
    },
  });

  const p = rt.plasticity;
  console.log(`Plasticity baseWeights length: ${p.baseWeights.length} edges (${p.baseWeights.byteLength} bytes)`);
  console.log(`Original baseChecksum: ${p.baseChecksum}`);

  // Test 1: Mutate an edge past the 100,000 byte prefix
  // 100,000 bytes = 50,000 uint16 elements
  const safeIndex = 60000;
  const originalVal = p.baseWeights[safeIndex];
  console.log(`\nTesting prefix bypass: Mutating baseWeights[${safeIndex}] (byte offset ${safeIndex * 2}) from ${originalVal} to ${originalVal + 10}...`);

  p.baseWeights[safeIndex] += 10;
  let detected = false;
  try {
    p.verifyBaseImmutability();
    console.log("  CRITICAL FLAW: verifyBaseImmutability() returned TRUE! Mutation past 100,000 bytes was NOT detected!");
  } catch (err) {
    detected = true;
    console.log("  Mutation was detected.");
  }
  // Revert mutation
  p.baseWeights[safeIndex] = originalVal;

  // Test 2: Full Buffer SHA-256 reference
  const fullHash = () => {
    const h = crypto.createHash("sha256");
    h.update(Buffer.from(p.baseWeights.buffer, p.baseWeights.byteOffset, p.baseWeights.byteLength));
    return h.digest("hex");
  };
  const correctChecksum1 = fullHash();
  p.baseWeights[safeIndex] += 10;
  const correctChecksum2 = fullHash();
  p.baseWeights[safeIndex] = originalVal;
  console.log(`Full-buffer hash detects mutation: ${correctChecksum1 !== correctChecksum2}`);

  // Test 3: setEfficacyMultiplier bounds & eligibility bypass
  console.log("\nTesting setEfficacyMultiplier bypass:");
  const ineligibleEdge = 12345; // An edge not in eligibleEdgeMask
  p.setEligibleEdgeMask(new Set([100])); // only edge 100 is eligible
  console.log(`  Eligible edges: [100]`);
  console.log(`  isEligibleEdge(12345): ${p.isEligibleEdge(ineligibleEdge)}`);

  // Try to set efficacy multiplier on ineligible edge:
  const res = p.setEfficacyMultiplier(ineligibleEdge, 50.0); // massive 5000% boost on ineligible edge!
  console.log(`  setEfficacyMultiplier(12345, 50.0) succeeded: ${res}`);
  console.log(`  DeltaW on ineligible edge: ${p.getDeltaW(ineligibleEdge)}`);
  console.log(`  Global budget used: ${p.getGlobalBudgetUsed()} (Max budget was 10.0!)`);
  console.log(`  CRITICAL FLAW: setEfficacyMultiplier completely bypassed eligibility mask, budget ceiling, and max percentage deviation!`);

  // Test 4: Resolved adaptation and depression settings
  console.log("\nTesting resolved biophysical settings:");
  console.log(`  RateNetwork p.adaptK: ${rt.net.p.adaptK} (Spike-frequency adaptation effect: ${rt.net.p.adaptK > 0 ? "Active" : "INACTIVE / ZERO"})`);
  console.log(`  RateNetwork p.depU:   ${rt.net.p.depU} (Short-term synaptic depression effect: ${rt.net.p.depU > 0 ? "Active" : "INACTIVE / ZERO"})`);
}

auditSafeguards();
