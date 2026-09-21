import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deltax-causal-test-'));
const file = path.join(tmpDir, 'causal-intervention-8.differential.json');
let report;

test('demo emits checkpoint/control/intervention/restore differential', (t) => {
  t.after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });
  const run = spawnSync(process.execPath, ['scripts/causal_intervention_demo.mjs'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      INTERVENTION_OUT_DIR: tmpDir,
      CHECKPOINT_OUT_DIR: tmpDir,
    }
  });
  assert.equal(run.status, 0, run.stderr);
  report = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(report.differential.altered, true);
  assert.equal(report.recovery.status, 'RECOVERED');
});
test('intervention has substrate proposals before DeltaX and no bypass', () => {
  assert.equal(report.isolation_metric.every_intervention_step_has_pre_deltax_proposal, true);
  assert.equal(report.isolation_metric.deltaX_bypass_count, 0);
  for (const step of report.intervention_run.steps) {
    assert.ok(step.substrate_proposals_before_deltax.length > 0);
    assert.equal(step.deltax.authority, 'DeltaX');
    assert.equal(step.deltax.bypass, false);
  }
});
test('authority labels separate experimenter perturbation from DeltaX', () => {
  assert.equal(report.perturbation.actor, 'EXPERIMENTER');
  assert.equal(report.perturbation.authority, 'EXPERIMENTER');
  assert.equal(report.control_run.authority, 'EXPERIMENTER_RUN');
  assert.equal(report.intervention_run.steps[0].deltax.actor, 'DeltaX');
  assert.equal(report.claims.biological_memory_trace, false);
});
