import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { executiveSource, sourceCopy } from '../src/entity-ui/state.mjs';

test('entity UI assets exist', () => {
  assert.equal(fs.existsSync('entity.html'), true);
  assert.equal(fs.existsSync('src/entity-ui/styles.css'), true);
  assert.equal(fs.existsSync('src/entity-ui/entity.mjs'), true);
  assert.equal(fs.existsSync('artifacts/observatory/latest-playback.json'), true);
});

test('executive source badge is honest', () => {
  assert.equal(executiveSource('canonical_api'), 'canonical_api');
  assert.equal(executiveSource('local_runtime'), 'local_runtime');
  assert.equal(executiveSource('stub'), 'stub');
  assert.equal(executiveSource('unknown'), 'disabled');
  assert.match(sourceCopy('stub'), /not genuine/);
  assert.match(sourceCopy('local_runtime'), /local_runtime/);
});

test('playback artifact has frames and honest source', () => {
  const pb = JSON.parse(fs.readFileSync('artifacts/observatory/latest-playback.json', 'utf8'));
  assert.ok(pb.frames.length >= 5);
  assert.ok(['local_runtime', 'stub'].includes(pb.executive_source));
  assert.equal(pb.executive_source === 'canonical_api', false);
  assert.ok(pb.frames.some((f) => f.note === 'executive_decision'));
});
