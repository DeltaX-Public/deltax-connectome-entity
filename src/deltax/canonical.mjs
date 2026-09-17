import { EventLedger } from './adapter.mjs';

const DEFAULT_SENSITIVE_KEYS = ['token', 'secret', 'password', 'authorization', 'api_key', 'apikey'];
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

export function redactSensitive(value, sensitiveKeys = DEFAULT_SENSITIVE_KEYS) {
  const keys = sensitiveKeys.map((key) => String(key).toLowerCase());
  if (Array.isArray(value)) return value.map((entry) => redactSensitive(entry, keys));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [keys.some((sensitive) => key.toLowerCase().includes(sensitive)) ? '[REDACTED]' : key, keys.some((sensitive) => key.toLowerCase().includes(sensitive)) ? '[REDACTED]' : redactSensitive(entry, keys)]));
}

export class JsonHttpTransport {
  constructor({ baseUrl = process.env.DELTAX_API_URL, fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
    this.baseUrl = baseUrl?.replace(/\/$/, ''); this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs;
  }
  async request(packet) {
    if (!this.baseUrl) throw new Error('DELTAX_API_URL is required for canonical_api');
    if (typeof this.fetchImpl !== 'function') throw new Error('fetch is unavailable for canonical_api transport');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/v1/execute`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(packet), signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) { throw new Error(`DeltaX canonical_api request failed: ${error.message}`); }
    finally { clearTimeout(timer); }
  }
}

/** Transport boundary: canonical API semantics stay outside this repository. */
export class CanonicalDeltaXAdapter {
  constructor({ mode = process.env.DELTAX_EXECUTIVE ?? 'auto', apiUrl = process.env.DELTAX_API_URL, transport = null, stub = null, sensitiveKeys = DEFAULT_SENSITIVE_KEYS, ledger = null } = {}) {
    this.mode = mode; this.sensitiveKeys = sensitiveKeys; this.ledger = ledger ?? new EventLedger();
    this.transport = transport ?? new JsonHttpTransport({ baseUrl: apiUrl }); this.stub = stub;
    this.executive_source = mode === 'disabled' ? 'disabled' : (mode === 'stub' || mode === 'STUB' || mode === 'CI' ? 'stub' : (apiUrl ? 'canonical_api' : 'stub'));
    if ((mode === 'DELTAX' || mode === 'DELTAX_DEBUG') && !apiUrl) throw new Error('DELTAX mode requires DELTAX_API_URL; refusing silent stub fallback');
    if (mode === 'auto' && apiUrl) this.executive_source = 'canonical_api';
  }

  status() { return { executive_source: this.executive_source, mode: this.mode, api_url_configured: this.executive_source === 'canonical_api' }; }
  _record(type, payload) { return this.ledger.record({ layer: 'deltax_transport', type, executive_source: this.executive_source, payload: redactSensitive(payload, this.sensitiveKeys) }); }
  async decide(packet = {}) {
    this._record('deltax_request', { request: packet });
    let decision;
    if (this.executive_source === 'disabled') decision = { decision: null, executive_source: 'disabled', disabled: true };
    else if (this.executive_source === 'stub') decision = this.stub ? await this.stub(packet) : { decision: 'stub', executive_source: 'stub', packet: clone(packet) };
    else decision = await this.transport.request(packet);
    const result = { ...clone(decision), executive_source: this.executive_source };
    this._record('deltax_decision', { request: packet, response: result });
    return result;
  }

  exportExperiment() { return { status: this.status(), packets: this.ledger.events }; }
  exportLedgerJSON() { return JSON.stringify(this.ledger.events, null, 2); }
}
