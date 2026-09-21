#!/usr/bin/env node
/**
 * scripts/verify_pause_state.mjs
 *
 * Deterministic research-pause verification script.
 * Validates:
 *   1. Full test suite execution across all test/*.test.mjs files via deterministic discovery.
 *      - Confirms zero test failures.
 *      - Explicitly reports private-runtime skip counts when DELTAX_LOCAL_RUNTIME_CMD is unset.
 *   2. JSON syntax across all JSON files in artifacts/ and config/.
 *   3. Release Evidence Manifest bit-exact integrity:
 *      - Verifies exact byte size and SHA-256 digest for all 19 primary release artifacts.
 *   4. Key empirical invariants:
 *      - Phase IV-C: exactly 9,000 episodes, 199,500 DeltaX decisions, 0 fallbacks.
 *      - Parsed JSON seed audit: confirms no committed empirical records consume seeds 19000..19099.
 *   5. Clean-tree and git status parity:
 *      - Requires a clean tree before execution and compares status afterward to detect side effects.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('================================================================');
console.log('   DELTAX CONNECTOME ENTITY — RESEARCH PAUSE VERIFICATION');
console.log('================================================================\n');

function readGitStatus() {
  const result = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    console.error('FAILED: Unable to read repository working-tree status.');
    console.error(result.error?.message || result.stderr || result.stdout);
    process.exit(1);
  }
  return result.stdout;
}

function readGitHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    console.error('FAILED: Unable to read repository HEAD.');
    console.error(result.error?.message || result.stderr || result.stdout);
    process.exit(1);
  }
  return result.stdout.trim();
}

// 0. Require and capture a clean initial working tree state
const beforeGitStatus = readGitStatus();
if (beforeGitStatus.trim() !== '') {
  console.error('FAILED: Research-pause verification must start from a clean working tree.');
  console.error(beforeGitStatus);
  process.exit(1);
}
const beforeGitHead = readGitHead();

let finalParityCheckCompleted = false;
process.on('exit', exitCode => {
  if (finalParityCheckCompleted) return;
  const statusResult = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  const headResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  const statusUnavailable = statusResult.error || statusResult.status !== 0;
  const headUnavailable = headResult.error || headResult.status !== 0;
  const statusChanged = !statusUnavailable && statusResult.stdout !== beforeGitStatus;
  const headChanged = !headUnavailable && headResult.stdout.trim() !== beforeGitHead;
  if (statusUnavailable || headUnavailable || statusChanged || headChanged) {
    console.error('FAILED: Repository state could not be proven unchanged on verifier exit.');
    if (statusUnavailable) {
      console.error(statusResult.error?.message || statusResult.stderr || statusResult.stdout);
    } else if (statusChanged) {
      console.error('Before:\n' + beforeGitStatus);
      console.error('After:\n' + statusResult.stdout);
    }
    if (headUnavailable) {
      console.error(headResult.error?.message || headResult.stderr || headResult.stdout);
    } else if (headChanged) {
      console.error(`HEAD before: ${beforeGitHead}`);
      console.error(`HEAD after:  ${headResult.stdout.trim()}`);
    }
    if (exitCode === 0) process.exitCode = 1;
  }
});

// 1. Run all test/*.test.mjs files via deterministic discovery
const testDir = path.join(ROOT, 'test');
const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.mjs'))
  .sort()
  .map(f => path.join('test', f));

console.log(`1. Running public-safe test suite (${testFiles.length} test files discovered)...`);
const testRun = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...testFiles], {
  cwd: ROOT,
  encoding: 'utf8',
  env: process.env,
});

if (testRun.error || testRun.signal || testRun.status !== 0) {
  console.error('FAILED: Public tests failed!\n', testRun.stderr || testRun.stdout);
  if (testRun.error) console.error(testRun.error.message);
  process.exit(1);
}

// Parse uniquely anchored top-level TAP summary fields. Missing or duplicate
// fields are a verification failure; never substitute expected values.
function parseTapSummaryField(field) {
  const matches = [...testRun.stdout.matchAll(new RegExp(`^# ${field} (\\d+)\\s*$`, 'gm'))];
  if (matches.length !== 1) {
    console.error(`FAILED: Expected exactly one top-level TAP "${field}" summary field; found ${matches.length}.`);
    console.error(testRun.stdout);
    process.exit(1);
  }
  return Number(matches[0][1]);
}

const totalTests = parseTapSummaryField('tests');
const passCount = parseTapSummaryField('pass');
const failCount = parseTapSummaryField('fail');
const skipCount = parseTapSummaryField('skipped');
if (failCount !== 0) {
  console.error(`FAILED: Test output reported ${failCount} failed tests despite a zero exit status.`);
  process.exit(1);
}

if (passCount + failCount + skipCount !== totalTests) {
  console.error(`FAILED: TAP totals are inconsistent: tests=${totalTests}, pass=${passCount}, fail=${failCount}, skipped=${skipCount}.`);
  process.exit(1);
}

console.log(`   ✔ Test suite passed cleanly (${totalTests} tests: ${passCount} passed, ${failCount} failed, ${skipCount} skipped).`);
if (!process.env.DELTAX_LOCAL_RUNTIME_CMD) {
  console.log(`   ℹ Notice: DELTAX_LOCAL_RUNTIME_CMD is unset; ${skipCount} private-runtime-dependent integration tests were skipped (expected in public environment).\n`);
} else {
  console.log('');
}

// 2. Validate JSON syntax across all JSON files in artifacts/ and config/
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

// 3. Verify SHA-256 and byte sizes for all 19 primary artifacts in Release Evidence Manifest
console.log('3. Verifying 19 primary artifacts against Release Evidence Manifest...');
const PRIMARY_MANIFEST_ARTIFACTS = [
  ['artifacts/generalization/phase4c-held-out.json', 29704844, 'be87e26a72f547975e5b4f52fd41729e535e9ebc80e0b70e43fc3eeccbf1665f'],
  ['artifacts/generalization/phase4c-generalization-held_out.json', 31382843, '4ec41208872f6b0d7aebd3af7eb1eeda10a901430368072d0e4502dd13abadaf'],
  ['artifacts/generalization/phase4c-failure-attribution-held_out.json', 58183, 'aa5c2eb735c710b39a1065161f6a98d702a3eba5394d028bbb2d8aa35b1f39fe'],
  ['artifacts/generalization/phase4c-development.json', 8951094, 'be4f30844d9324bf0c513310dd07267205a57236a1bbd7c8700c8d18655a26d2'],
  ['artifacts/steering_asymmetry/validation.json', 36546, 'd31e361767046b8d2b644cbd11ee9e86a4ebf4d76f9a5d7bed4eb8e3800c4c20'],
  ['artifacts/steering_asymmetry/validation_17000_17099.json', 36261, '8b9c738adcfb57c2dcfa34535dc60e44771ef56f042d518b0d4b82c7e5483395'],
  ['artifacts/steering_asymmetry/plasticity_target_candidate.json', 5626, '85104c02a684f295f0e9f770dba5c83a3d2b122c5da3596dd2d0d815f6cc3a4c'],
  ['artifacts/latent_repertoire/validation/bilateral_validation_20200_20299.json', 5494, '9e3565abcc11d4f075637f68ea114675723fd2ad2530216f93331d46588aac66'],
  ['artifacts/latent_repertoire/sensory_motor_matrix.json', 27977, 'bc2a0ec3228673838068499b1517310893d492d1891e3bbd5a40bbe085490705'],
  ['artifacts/latent_repertoire/intermediate_rescue.json', 23324, 'a0384af28f2dc9e9ddc1c026961c1c681b38e7c3fd7b9b14bd0b839738826556'],
  ['artifacts/plasticity/phase4d1/protocol_frozen.json', 4012, '6eeb6357ce1f92c995c139fa17bf6dbd6c19e66c794620de384ac7632fd436d8'],
  ['artifacts/plasticity/phase4d1/condition_summary.json', 7980, '085ba532df4eca2578fda221df2d5c1b082d23b17a9fd024e605a78f40f15f1b'],
  ['artifacts/plasticity/phase4d1b/local_subthreshold_state_audit.json', 3360, '5750d321550c4f9c79269d46e8f97f62d77f283bd0f16a6ddb13b47d1126c596'],
  ['artifacts/plasticity/phase4d2/protocol_frozen.json', 4663, 'a19c695d9d49d21e25002165504b1fafe7eefd4c0c1c34558681b24f0d7c79df'],
  ['artifacts/plasticity/phase4d2/condition_summary.json', 11388, '8052ee967946cbafb8571001b32b570b3b403ca89f6a1f95302282e23218df0a'],
  ['artifacts/plasticity/phase4d3/protocol_frozen.json', 4026, 'c00947f938d31f5b54484a0de3a41e8a4d5b21a6b0000e8ffb1021e01db72c17'],
  ['artifacts/plasticity/phase4d3/dose_response.json', 5243, '50c98d0dd788584392909c7712f81d0e82543d307a56046484404c57254580a4'],
  ['artifacts/plasticity/target_a_afferent_only.json', 2736, '6a9223a2e0cab2e233b90abaf1bfa924a22cfd0e4b9ada7d04aeb137967f176b'],
  ['artifacts/plasticity/target_c_balanced_two_stage.json', 3148, '4a61ae85d8ef8efe725010ba3515d190e4ec6a5c64c2fb82fb7e0037e1116574'],
];

let manifestErrors = 0;
for (const [relPath, expSize, expSha] of PRIMARY_MANIFEST_ARTIFACTS) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`   ✖ Missing manifest artifact: ${relPath}`);
    manifestErrors += 1;
    continue;
  }
  const buf = fs.readFileSync(fullPath);
  const actualSize = buf.length;
  const actualSha = crypto.createHash('sha256').update(buf).digest('hex');
  if (actualSize !== expSize || actualSha !== expSha) {
    console.error(`   ✖ Integrity mismatch in ${relPath}: size ${actualSize} (expected ${expSize}), sha ${actualSha} (expected ${expSha})`);
    manifestErrors += 1;
  }
}
if (manifestErrors > 0) {
  console.error(`FAILED: ${manifestErrors} primary manifest artifacts failed integrity checks!`);
  process.exit(1);
}
console.log(`   ✔ All ${PRIMARY_MANIFEST_ARTIFACTS.length} primary release manifest artifacts verified bit-for-bit (SHA-256 and size matched).\n`);

// 4. Validate Empirical Invariants & Seed Reservation
console.log('4. Validating empirical invariants & held-out seed preservation...');

// Phase IV-C Held-Out Invariants
const heldOutPath = path.join(ROOT, 'artifacts/generalization/phase4c-held-out.json');
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
console.log('   ✔ Phase IV-C: exactly 9,000 episodes verified; exactly 199,500 DeltaX decisions with 0 fallbacks.');

// Parsed JSON Seed Audit for Reserved Range 19000..19099
const RESERVED_SEED_MIN = 19000;
const RESERVED_SEED_MAX = 19099;
const RESERVATION_METADATA_LEAVES = new Map([
  ['artifacts/plasticity/phase4d2/protocol_frozen.json#/seed_cohort/held_out_preserved_seed_range', '19000..19099'],
  ['artifacts/plasticity/phase4d3/protocol_frozen.json#/seed_cohort/held_out_preserved_seed_range', '19000..19099'],
]);

function isReservedSeedValue(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= RESERVED_SEED_MIN && value <= RESERVED_SEED_MAX;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const numericValue = Number(value);
    return numericValue >= RESERVED_SEED_MIN && numericValue <= RESERVED_SEED_MAX;
  }
  if (typeof value === 'string') {
    const rangeMatch = value.match(/^(\d+)\.\.(\d+)$/);
    if (rangeMatch) {
      const rangeStart = Number(rangeMatch[1]);
      const rangeEnd = Number(rangeMatch[2]);
      return rangeStart <= RESERVED_SEED_MAX && rangeEnd >= RESERVED_SEED_MIN;
    }
  }
  return false;
}

function toJsonPointer(keyPath) {
  if (!keyPath) return '#';
  const segments = keyPath
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map(segment => segment.replace(/~/g, '~0').replace(/\//g, '~1'));
  return `#/${segments.join('/')}`;
}

function isAuthorizedReservationMetadata(filePath, keyPath, value) {
  const expectedValue = RESERVATION_METADATA_LEAVES.get(`${filePath}${toJsonPointer(keyPath)}`);
  return expectedValue !== undefined && value === expectedValue;
}

function findConsumedSeeds(obj, filePath, keyPath = '') {
  let violations = [];
  if (obj === null || typeof obj !== 'object') return violations;

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      if (isReservedSeedValue(item)) {
        violations.push({ file: filePath, key: `${keyPath}[${idx}]`, val: item });
      } else if (item !== null && typeof item === 'object') {
        violations.push(...findConsumedSeeds(item, filePath, `${keyPath}[${idx}]`));
      }
    });
  } else {
    for (const [k, v] of Object.entries(obj)) {
      const currentPath = keyPath ? `${keyPath}.${k}` : k;
      // Ignore only exact file + JSON-path reservation declarations with their
      // expected value. Never skip a subtree because its name contains "held_out".
      if (isAuthorizedReservationMetadata(filePath, currentPath, v)) {
        continue;
      }
      if (isReservedSeedValue(v)) {
        violations.push({ file: filePath, key: currentPath, val: v });
      } else if (v !== null && typeof v === 'object') {
        violations.push(...findConsumedSeeds(v, filePath, currentPath));
      }
    }
  }
  return violations;
}

// Deterministic guard against the historical false-negative mode: result
// containers named "held_out" must still be inspected for consumed seeds.
const seedAuditSelfChecks = [
  [findConsumedSeeds({ held_out_results: [{ seed: 19000 }] }, '<self-check>'), 1],
  [findConsumedSeeds({ held_out_results: [{ seed: 19099 }] }, '<self-check>'), 1],
  [findConsumedSeeds({ held_out_results: [{ seed: 18999 }, { seed: 19100 }] }, '<self-check>'), 0],
  [findConsumedSeeds({ held_out_results: [{ id: 19000 }] }, '<self-check>'), 1],
  [findConsumedSeeds({ reserved_results: { nested: { value: '19000' } } }, '<self-check>'), 1],
  [findConsumedSeeds(
    { seed_cohort: { held_out_preserved_seed_range: '19000..19099' } },
    'artifacts/plasticity/phase4d2/protocol_frozen.json',
  ), 0],
];
if (seedAuditSelfChecks.some(([violations, expectedCount]) => violations.length !== expectedCount)) {
  console.error('FAILED: Reserved-seed audit regression self-check failed.');
  process.exit(1);
}

let seedViolations = [];
function scanDirForConsumedSeeds(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return;
  for (const ent of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      scanDirForConsumedSeeds(rel);
    } else if (ent.name.endsWith('.json')) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
        seedViolations.push(...findConsumedSeeds(data, rel));
      } catch (err) {
        console.error(`FAILED: Seed audit could not parse ${rel}: ${err.message}`);
        process.exit(1);
      }
    }
  }
}
scanDirForConsumedSeeds('artifacts');
if (seedViolations.length > 0) {
  console.error(`FAILED: ${seedViolations.length} consumed seed violations detected in empirical records!`);
  for (const v of seedViolations) {
    console.error(`   ✖ Consumed seed ${v.val} at ${v.key} in ${v.file}`);
  }
  process.exit(1);
}
console.log('   ✔ No committed empirical records were found consuming the reserved seed range (19000..19099).\n');

// 5. Clean working tree and status parity check
console.log('5. Verifying clean working tree parity (zero test/verification mutations)...');
const afterGitStatus = readGitStatus();
const afterGitHead = readGitHead();
if (afterGitStatus !== beforeGitStatus || afterGitHead !== beforeGitHead) {
  finalParityCheckCompleted = true;
  console.error('FAILED: Verification execution modified the repository state!');
  console.error('Before:\n' + beforeGitStatus);
  console.error('After:\n' + afterGitStatus);
  console.error(`HEAD before: ${beforeGitHead}`);
  console.error(`HEAD after:  ${afterGitHead}`);
  process.exit(1);
}
if (afterGitStatus.trim() !== '') {
  finalParityCheckCompleted = true;
  console.error('FAILED: Working tree is not clean after verification.');
  console.error(afterGitStatus);
  process.exit(1);
}
finalParityCheckCompleted = true;
console.log('   ✔ Working tree was clean before verification and remains clean afterward.\n');

console.log('================================================================');
console.log('   RESEARCH PAUSE VERIFICATION: ALL INVARIANTS PASSED (PASS)');
console.log('================================================================');
