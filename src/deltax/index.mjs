export {MODES,EventLedger,DeltaXStub,DeltaXAdapter,createAdapter} from './adapter.mjs';
export {DeltaXReferenceAdapter,DISPOSITIONS,MODULATION_CLASSES} from './contract.mjs';
export { CanonicalDeltaXAdapter, JsonHttpTransport, redactSensitive } from './canonical.mjs';
export { LocalRuntimeDeltaXAdapter, JsonlLocalRuntimeTransport } from './local_runtime.mjs';

import { createAdapter as createLegacyAdapter } from './adapter.mjs';
import { CanonicalDeltaXAdapter } from './canonical.mjs';
import { LocalRuntimeDeltaXAdapter } from './local_runtime.mjs';

/**
 * Select executive transport from env/options.
 * Modes: stub | DELTAX/canonical_api | local_runtime | disabled
 * local_runtime fails loudly when DELTAX_LOCAL_RUNTIME_CMD is missing.
 */
export function createExecutive(options = {}) {
  const mode = (options.mode ?? process.env.DELTAX_EXECUTIVE ?? 'stub').toString();
  const normalized = mode.toLowerCase();
  if (normalized === 'local_runtime') {
    return new LocalRuntimeDeltaXAdapter({ ...options, mode: 'local_runtime' });
  }
  if (normalized === 'disabled') {
    return new CanonicalDeltaXAdapter({ ...options, mode: 'disabled' });
  }
  if (normalized === 'stub' || normalized === 'ci') {
    return new CanonicalDeltaXAdapter({ ...options, mode: 'stub' });
  }
  if (normalized === 'deltax' || normalized === 'deltax_debug' || normalized === 'canonical_api') {
    return new CanonicalDeltaXAdapter({ ...options, mode: 'DELTAX' });
  }
  // Fall back to existing adapter factory for UPSTREAM/SUBSTRATE_ONLY styles
  return createLegacyAdapter(options);
}
