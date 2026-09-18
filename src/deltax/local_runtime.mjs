/**
 * Local private DeltaX runtime transport (stdin/stdout JSONL).
 * Provenance: executive_source = local_runtime (not canonical_api, not stub).
 * Fail loudly when unavailable — never silent stub fallback.
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { EventLedger } from './adapter.mjs';
import { redactSensitive } from './canonical.mjs';

function parseCmd(cmd) {
  if (!cmd || typeof cmd !== 'string' || !cmd.trim()) return null;
  const parts = cmd.trim().match(/(?:[^\s"]+|"[^"]*")+/g)?.map((p) => p.replace(/^"|"$/g, '')) ?? [];
  if (!parts.length) return null;
  return { file: parts[0], args: parts.slice(1) };
}

export class JsonlLocalRuntimeTransport {
  constructor({
    command = process.env.DELTAX_LOCAL_RUNTIME_CMD,
    timeoutMs = 10_000,
  } = {}) {
    this.parsed = parseCmd(command);
    this.timeoutMs = timeoutMs;
    this.child = null;
    this.rl = null;
    this.pending = null;
  }

  ensureChild() {
    if (this.child && !this.child.killed) return;
    if (!this.parsed) {
      const err = new Error('DELTAX_LOCAL_RUNTIME_CMD is required for local_runtime; refusing silent stub fallback');
      err.code = 'LOCAL_RUNTIME_UNAVAILABLE';
      throw err;
    }
    try {
      this.child = spawn(this.parsed.file, this.parsed.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });
    } catch (e) {
      const err = new Error(`local_runtime spawn failed: ${e.message}; refusing silent stub fallback`);
      err.code = 'LOCAL_RUNTIME_UNAVAILABLE';
      err.cause = e;
      throw err;
    }
    this.child.on('error', (e) => {
      if (this.pending) {
        this.pending.reject(Object.assign(new Error(`local_runtime process error: ${e.message}`), {
          code: 'LOCAL_RUNTIME_UNAVAILABLE',
          cause: e,
        }));
        this.pending = null;
      }
    });
    this.child.on('exit', (code, signal) => {
      if (this.pending) {
        this.pending.reject(Object.assign(
          new Error(`local_runtime exited (code=${code}, signal=${signal})`),
          { code: 'LOCAL_RUNTIME_UNAVAILABLE' },
        ));
        this.pending = null;
      }
      this.child = null;
      this.rl = null;
    });
    this.rl = createInterface({ input: this.child.stdout });
    this.rl.on('line', (line) => {
      if (!this.pending) return;
      const { resolve, reject, timer } = this.pending;
      this.pending = null;
      clearTimeout(timer);
      try {
        resolve(JSON.parse(line));
      } catch (e) {
        reject(Object.assign(new Error(`local_runtime bad JSONL: ${e.message}`), {
          code: 'LOCAL_RUNTIME_BAD_RESPONSE',
          cause: e,
        }));
      }
    });
  }

  async request(packet) {
    this.ensureChild();
    if (this.pending) throw new Error('local_runtime: overlapping requests not supported');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = null;
        reject(Object.assign(new Error(`local_runtime timed out after ${this.timeoutMs}ms`), {
          code: 'LOCAL_RUNTIME_TIMEOUT',
        }));
      }, this.timeoutMs);
      this.pending = { resolve, reject, timer };
      try {
        this.child.stdin.write(`${JSON.stringify(packet)}\n`);
      } catch (e) {
        clearTimeout(timer);
        this.pending = null;
        reject(Object.assign(new Error(`local_runtime write failed: ${e.message}`), {
          code: 'LOCAL_RUNTIME_UNAVAILABLE',
          cause: e,
        }));
      }
    });
  }

  async close() {
    if (this.rl) this.rl.close();
    if (this.child && !this.child.killed) {
      this.child.stdin?.end();
      this.child.kill('SIGTERM');
    }
    this.child = null;
  }
}

/** Adapter that talks to the shared private local runtime provider. */
export class LocalRuntimeDeltaXAdapter {
  constructor({
    mode = process.env.DELTAX_EXECUTIVE ?? 'local_runtime',
    command = process.env.DELTAX_LOCAL_RUNTIME_CMD,
    transport = null,
    ledger = null,
    sensitiveKeys = ['token', 'secret', 'password', 'authorization', 'api_key', 'apikey'],
  } = {}) {
    this.mode = mode;
    this.sensitiveKeys = sensitiveKeys;
    this.ledger = ledger ?? new EventLedger();
    this.executive_source = 'local_runtime';
    if (!transport && !command) {
      throw Object.assign(
        new Error('local_runtime requires DELTAX_LOCAL_RUNTIME_CMD; refusing silent stub fallback'),
        { code: 'LOCAL_RUNTIME_UNAVAILABLE' },
      );
    }
    this.transport = transport ?? new JsonlLocalRuntimeTransport({ command });
  }

  status() {
    return {
      executive_source: this.executive_source,
      mode: this.mode,
      local_runtime_configured: true,
    };
  }

  _record(type, payload) {
    return this.ledger.record({
      layer: 'deltax_transport',
      type,
      executive_source: this.executive_source,
      payload: redactSensitive(payload, this.sensitiveKeys),
    });
  }

  async decide(packet = {}) {
    const candidates = packet.candidate_actions || packet.candidates || [];
    for (const c of candidates) {
      if (!c || !c.substrate_candidate_id) {
        throw new Error('connectome-origin required: every candidate needs substrate_candidate_id before local_runtime evaluation');
      }
    }
    this._record('deltax_request', { request: packet });
    const decision = await this.transport.request(packet);
    const result = {
      ...decision,
      executive_source: 'local_runtime',
      selected_disposition: decision.disposition ?? decision.selected_disposition,
    };
    this._record('deltax_decision', { request: packet, response: result });
    return result;
  }

  exportExperiment() {
    return { status: this.status(), packets: this.ledger.events };
  }
}
