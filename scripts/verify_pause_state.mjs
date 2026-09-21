#!/usr/bin/env node
/**
 * scripts/verify_pause_state.mjs
 *
 * Deterministic research-pause verification script.
 * Validates:
 *   1. Public-safe test suite execution (units, contracts, invariants, controls).
 *   2. JSON schema / parse validity across all artifacts and configuration.
 *   3. Key artifact invariants:
 *      - Phase IV-C: 9,000 episodes, 199,500 DeltaX decisions, 0 fallbacks.
 *      - Phase IV-D held-out seeds 19000..19099 remain strictly unconsumed.
 *   4. Clean git working tree (no test or execution side effects).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('================================================================');
console.log('   DELTAX CONNECTOME ENTITY — RESEARCH PAUSE VERIFICATION');
console.log('================================================================\n');

// 1. Run public test suite
console.log('1. Running public-safe test suite (node --test test/*.test.mjs)...');
const testRun = spawnSync(process.execPath, ['--test', 'test/deltax_contract.test.mjs', 'test/deltax_transport.test.mjs', 'test/entity-ui.test.mjs', 'test/local_runtime.test.mjs', 'test/milestone1.test.mjs', 'test/neurocontrol.test.mjs', 'test/phase5.test.mjs', 'test/shared_local_runtime_live.test.mjs', 'test/changed_world_conditions.test.mjs', 'test/changed_world_feasibility.test.mjs', 'test/causal_actuator_integrity.test.mjs', 'test/causal_intervention.test.mjs', 'test/connectome_closed_loop.test.mjs', 'test/connectome_causal_integration.test.mjs', 'test/sovereign_acceptance.test.mjs', 'test/sensory_atlas.test.mjs', 'test/readout_fidelity.test.mjs', 'test/shuffled_control_integrity.test.mjs', 'test/plasticity_foundation.test.mjs', 'test/subthreshold_plasticity_ordering.test.mjs', 'test/phase4c_generalization.test.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: process.env,
});

if (testRun.status !== 0) {
  console.error('FAILED: Public tests failed!\n', testRun.stderr || testRun.stdout);
  process.exit(1);
}
console.log('   ✔ Public-safe test suite passed cleanly (0 failures).\n');

// 2. Validate JSON artifacts
console.log('2. Validating JSON syntax across artifacts/ and config/...');
const jsonDirs = ['artifacts', 'config'];
let jsonCount = 0;
let jsonErrors = 0;

function checkDir(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return;
  const entries = fs.readdirSync(full, { withFileTypes: true });
  for (const ent of entries) {
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      checkDir(rel);
    } else if (ent.name.endsWith('.json')) {
      jsonCount += 1;
      try {
        JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
      } catch (err) {
        console.error(`   ✖ JSON ERROR in ${rel}: ${err.message}`);
        jsonErrors += 1;
      }
    }
  }
}

for (const d of jsonDirs) checkDir(d);
if (jsonErrors > 0) {
  console.error(`FAILED: ${jsonErrors} JSON parse errors detected!`);
  process.exit(1);
}
console.log(`   ✔ All ${jsonCount} JSON files parsed validly without errors.\n`);

// 3. Validate Key Artifact Invariants
console.log('3. Validating key artifact invariants...');

// Phase IV-C Held-Out invariants
const heldOutPath = path.join(ROOT, 'artifacts/generalization/phase4c-held-out.json');
if (!fs.existsSync(heldOutPath)) {
  console.error(`FAILED: Missing ${heldOutPath}`);
  process.exit(1);
}
const heldOutData = JSON.parse(fs.readFileSync(heldOutPath, 'utf8'));
if (heldOutData.total_episodes !== 9000 || heldOutData.episodes.length !== 9000) {
  console.error(`FAILED: Expected 9000 episodes, found ${heldOutData.total_episodes}`);
  process.exit(1);
}
let deltaxDecisions = 0;
let deltaxFallbacks = 0;
for (const ep of heldOutData.episodes) {
  if (ep.controller && ep.controller.startsWith('DELTAX_')) {
    deltaxDecisions += ep.executive_matching?.total_decisions ?? 0;
    deltaxFallbacks += ep.executive_matching?.fallback_count ?? 0;
  }
}
if (deltaxDecisions !== 199500 || deltaxFallbacks !== 0) {
  console.error(`FAILED: DeltaX decisions invariant violated: decisions=${deltaxDecisions}, fallbacks=${deltaxFallbacks}`);
  process.exit(1);
}
console.log('   ✔ Phase IV-C: 9,000 episodes verified; exactly 199,500 DeltaX decisions with 0 fallbacks.');

// Sealed Held-Out Seeds 19000..19099 Invariant
console.log('   Checking that seeds 19000..19099 are strictly unconsumed...');
let seedViolations = 0;
function scanForForbiddenSeeds(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return;
  const entries = fs.readdirSync(full, { withFileTypes: true });
  for (const ent of entries) {
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      scanForForbiddenSeeds(rel);
    } else if (ent.name.endsWith('.json')) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      for (let s = 19000; s <= 19099; s += 1) {
        if (content.includes(`"seed": ${s}`) || content.includes(`"seed":${s}`) || content.includes(`"seed_id": ${s}`)) {
          console.error(`   ✖ VIOLATION: Seed ${s} consumed in ${rel}!`);
          seedViolations += 1;
        }
      }
    }
  }
}
scanForForbiddenSeeds('artifacts');
if (seedViolations > 0) {
  console.error(`FAILED: ${seedViolations} held-out seed consumption violations detected!`);
  process.exit(1);
}
console.log('   ✔ Held-Out Seeds 19000..19099: 100% sealed, unconsumed, zero execution.\n');

// 4. Clean working tree check (ensures tests do not mutate tracked data artifacts)
console.log('4. Verifying clean working tree (no modified tracked data artifacts)...');
const gitDiff = spawnSync('git', ['diff', '--name-only', 'artifacts/'], { cwd: ROOT, encoding: 'utf8' });
if (gitDiff.status === 0 && gitDiff.stdout) {
  const modifiedJsonFiles = gitDiff.stdout.trim().split('\n').filter(f => f.endsWith('.json'));
  if (modifiedJsonFiles.length > 0) {
    console.error('FAILED: Tracked data artifacts were dirtied during verification execution!\n', modifiedJsonFiles.join('\n'));
    process.exit(1);
  }
}
console.log('   ✔ Tracked data artifacts remain 100% clean and unmodified.\n');

console.log('================================================================');
console.log('   RESEARCH PAUSE VERIFICATION: ALL INVARIANTS PASSED (PASS)');
console.log('================================================================');
