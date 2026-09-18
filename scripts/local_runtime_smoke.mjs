/**
 * Short live smoke against the shared private JSONL provider.
 * Requires DELTAX_LOCAL_RUNTIME_CMD. Never silent-stub.
 */
import { createExecutive } from '../src/deltax/index.mjs';

const cmd = process.env.DELTAX_LOCAL_RUNTIME_CMD;
if (!cmd) {
  console.error('DELTAX_LOCAL_RUNTIME_CMD is required for demo:local-runtime; refusing silent stub fallback');
  process.exit(1);
}

const exec = createExecutive({ mode: 'local_runtime', command: cmd });
const decision = await exec.decide({
  objective: 'survive',
  environment_state_summary: { hazard: 0.05 },
  substrate_state_summary: { mood: 'feeding' },
  candidate_actions: [
    { substrate_candidate_id: 'c-feed', action_class: 'feeding', activation_strength: 0.9 },
  ],
  available_executive_actions: ['PERMIT', 'VETO', 'MODULATE', 'DEFER', 'ESCALATE'],
});
await exec.transport?.close?.();

if (decision.executive_source !== 'local_runtime') {
  console.error('expected executive_source local_runtime, got', decision.executive_source);
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  executive_source: decision.executive_source,
  disposition: decision.disposition ?? decision.selected_disposition,
  provenance: decision.provenance,
}, null, 2));
