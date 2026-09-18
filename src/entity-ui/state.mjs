export const EXECUTIVE_SOURCES = ['canonical_api', 'local_runtime', 'stub', 'disabled'];
export function executiveSource(value) { return EXECUTIVE_SOURCES.includes(value) ? value : 'disabled'; }
export function sourceCopy(source) {
  return {
    canonical_api: 'Canonical API response; provenance is available in the ledger.',
    local_runtime: 'Shared private local JSONL provider; labeled local_runtime, not canonical_api.',
    stub: 'Stub selected; this is not genuine DeltaX output.',
    disabled: 'No executive authority is active.',
  }[executiveSource(source)];
}
export function listValue(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
