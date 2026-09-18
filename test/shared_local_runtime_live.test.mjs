import assert from 'node:assert/strict';
import { LocalRuntimeDeltaXAdapter } from '../src/deltax/local_runtime.mjs';

const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;
if (!cmd) {
  console.log('shared_local_runtime_live tests: SKIP (set DELTAX_LOCAL_RUNTIME_CMD to run)');
  process.exit(0);
}

const adapter = new LocalRuntimeDeltaXAdapter({ command: cmd });
const decision = await adapter.decide({
  objective: 'survive',
  environment_state_summary: { hazard: 0.05 },
  substrate_state_summary: { mood: 'feeding' },
  candidate_actions: [{ substrate_candidate_id: 'c-feed', action_class: 'feeding', activation_strength: 0.9 }],
  available_executive_actions: ['PERMIT', 'VETO', 'MODULATE', 'DEFER', 'ESCALATE'],
});
assert.equal(decision.executive_source, 'local_runtime');
assert.ok(['PERMIT', 'VETO', 'MODULATE', 'DEFER', 'ESCALATE'].includes(decision.disposition));
assert.equal(decision.provenance?.executive_source, 'local_runtime');
await adapter.transport.close?.();
console.log('shared_local_runtime_live tests: PASS', decision.disposition);
