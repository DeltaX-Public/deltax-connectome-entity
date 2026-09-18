import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { LocalRuntimeDeltaXAdapter, JsonlLocalRuntimeTransport } from '../src/deltax/local_runtime.mjs';
import { createExecutive } from '../src/deltax/index.mjs';
import { BrokenWorld } from '../src/worlds/broken_world/world.mjs';
import { runLocalRuntime } from '../scripts/experiment.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;

test('1. Fresh sovereign closed-loop run against local runtime', async (t) => {
  if (!cmd) {
    t.skip('DELTAX_LOCAL_RUNTIME_CMD not set');
    return;
  }
  const result = await runLocalRuntime({ env: { DELTAX_LOCAL_RUNTIME_CMD: cmd }, steps: 8 });
  assert.equal(result.mode, 'local_runtime');
  assert.equal(result.executiveSource, 'local_runtime');
  assert.equal(result.steps, 8);
  assert.ok(result.history.length === 8);
  for (const h of result.history) {
    assert.equal(h.decision.executive_source, 'local_runtime');
    assert.ok(['PERMIT', 'VETO', 'MODULATE', 'DEFER', 'ESCALATE'].includes(h.decision.disposition));
    assert.ok(h.decision.provenance?.tick_id > 0);
  }
});

test('2. Candidate provenance enforcement (rejects missing substrate_candidate_id)', async (t) => {
  if (!cmd) {
    t.skip('DELTAX_LOCAL_RUNTIME_CMD not set');
    return;
  }
  const adapter = new LocalRuntimeDeltaXAdapter({ command: cmd });
  await assert.rejects(
    async () => {
      await adapter.decide({
        objective: 'test',
        candidate_actions: [{ id: 'bad_cand', action_class: 'locomotion' }],
      });
    },
    /substrate_candidate_id/i,
  );
  await adapter.transport.close?.();
});

test('3. Strict failure on missing or dead provider (never silent stub fallback)', async (t) => {
  assert.throws(
    () => new LocalRuntimeDeltaXAdapter({ command: '' }),
    (err) => err.code === 'LOCAL_RUNTIME_UNAVAILABLE',
  );

  const badAdapter = new LocalRuntimeDeltaXAdapter({ command: '/nonexistent/deltax/binary_12345' });
  await assert.rejects(
    async () => {
      await badAdapter.decide({
        candidate_actions: [{ substrate_candidate_id: 'sub_1', action_class: 'locomotion' }],
      });
    },
    (err) => err.code === 'LOCAL_RUNTIME_UNAVAILABLE',
  );
  await badAdapter.transport.close?.();
});

test('4. Session isolation and OBSERVE non-contamination', async (t) => {
  if (!cmd) {
    t.skip('DELTAX_LOCAL_RUNTIME_CMD not set');
    return;
  }
  const runId = 'iso_test_' + Date.now();
  const adapter = new LocalRuntimeDeltaXAdapter({ command: cmd, sessionId: runId });

  // Step 1: Executive tick
  const r1 = await adapter.decide({
    session_id: runId,
    condition: 'EXECUTIVE',
    candidate_actions: [{ substrate_candidate_id: 'sub_e1', action_class: 'locomotion' }],
  });
  const tick1 = r1.provenance?.tick_id;

  // Step 2: OBSERVE tick (must not increment executive session tick count)
  const rObs = await adapter.decide({
    session_id: runId,
    condition: 'OBSERVE',
    candidate_actions: [{ substrate_candidate_id: 'sub_o1', action_class: 'locomotion' }],
  });

  // Step 3: Executive tick 2
  const r2 = await adapter.decide({
    session_id: runId,
    condition: 'EXECUTIVE',
    candidate_actions: [{ substrate_candidate_id: 'sub_e2', action_class: 'locomotion' }],
  });
  const tick2 = r2.provenance?.tick_id;

  assert.equal(tick2, tick1 + 1, 'OBSERVE must not advance executive session tick sequence');
  await adapter.transport.close?.();
});

test('5. Checkpoint, restore, and session replay', async (t) => {
  if (!cmd) {
    t.skip('DELTAX_LOCAL_RUNTIME_CMD not set');
    return;
  }
  const sessionA = 'session_ckpt_' + Date.now();
  const adapter = new LocalRuntimeDeltaXAdapter({ command: cmd, sessionId: sessionA });

  // Tick 1
  const r1 = await adapter.decide({
    session_id: sessionA,
    candidate_actions: [{ substrate_candidate_id: 'sub_1', action_class: 'locomotion' }],
  });
  assert.equal(r1.provenance?.tick_id, 1);

  // Checkpoint session
  const ckptResp = await adapter.checkpoint(sessionA);
  assert.equal(ckptResp.type, 'checkpoint_ack');
  assert.equal(ckptResp.state?.tick, 1);

  // Tick 2
  const r2 = await adapter.decide({
    session_id: sessionA,
    candidate_actions: [{ substrate_candidate_id: 'sub_2', action_class: 'locomotion' }],
  });
  assert.equal(r2.provenance?.tick_id, 2);

  // Restore to tick 1 in a new session
  const sessionRestored = sessionA + '_restored';
  const restoreResp = await adapter.restore(sessionRestored, ckptResp.state);
  assert.equal(restoreResp.type, 'restore_ack');

  // Replay tick 2 on restored session
  const rReplay = await adapter.decide({
    session_id: sessionRestored,
    candidate_actions: [{ substrate_candidate_id: 'sub_2', action_class: 'locomotion' }],
  });
  assert.equal(rReplay.provenance?.tick_id, 2);

  await adapter.transport.close?.();
});

test('6. Public / private repository boundary verification', () => {
  const forbiddenPatterns = [
    /DeltaX_Runtime_Architecture_Specification.*\.docx/i,
    /deltax_unified_governance.*\.yaml/i,
    /coherence_mathematics.*\.docx/i,
  ];

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (['.git', 'node_modules', '.venv'].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      for (const pat of forbiddenPatterns) {
        assert.ok(!pat.test(e.name), 'Forbidden proprietary filename found in repo: ' + full);
      }
      if (e.isDirectory()) scan(full);
    }
  }

  scan(ROOT);
});
