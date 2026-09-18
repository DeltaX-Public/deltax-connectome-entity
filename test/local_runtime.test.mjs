import assert from 'node:assert/strict';
import { LocalRuntimeDeltaXAdapter, JsonlLocalRuntimeTransport } from '../src/deltax/local_runtime.mjs';
import { createExecutive } from '../src/deltax/index.mjs';

// Missing command fails loudly (no silent stub)
assert.throws(
  () => new LocalRuntimeDeltaXAdapter({ command: undefined }),
  /DELTAX_LOCAL_RUNTIME_CMD|refusing silent stub/,
);

// createExecutive local_runtime without cmd fails
assert.throws(
  () => createExecutive({ mode: 'local_runtime', command: undefined }),
  /DELTAX_LOCAL_RUNTIME_CMD|refusing silent stub/,
);

// Mock transport: candidates must include substrate_candidate_id
const mock = {
  async request(packet) {
    return {
      disposition: 'PERMIT',
      permitted: packet.candidate_actions.map((c) => ({ id: c.substrate_candidate_id, substrate_candidate_id: c.substrate_candidate_id })),
      vetoed: [],
      modulation: {},
      unresolved: [],
      provenance: { executive_source: 'local_runtime', runtime_version: '0.1.0', branch_manifest_version: '0.1.0' },
    };
  },
};
const adapter = new LocalRuntimeDeltaXAdapter({ transport: mock, command: 'unused' });
assert.equal(adapter.status().executive_source, 'local_runtime');

await assert.rejects(
  () => adapter.decide({ candidate_actions: [{ action_class: 'walk' }] }),
  /substrate_candidate_id/,
);

const decision = await adapter.decide({
  objective: 'survive',
  environment_state_summary: { hazard: 0.1 },
  substrate_state_summary: { mood: 'walking' },
  candidate_actions: [{ substrate_candidate_id: 'c-walk', action_class: 'walking', activation_strength: 0.8 }],
});
assert.equal(decision.executive_source, 'local_runtime');
assert.equal(decision.disposition, 'PERMIT');
assert.equal(decision.provenance.executive_source, 'local_runtime');

// parseCmd supports multi-arg python -m form
const t = new JsonlLocalRuntimeTransport({ command: '/usr/bin/env echo' });
assert.ok(t.parsed);
assert.equal(t.parsed.file, '/usr/bin/env');

console.log('local_runtime tests: PASS');
