import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

/** Append-only experimenter ledger, separate from DeltaX authority. */
export class EventLedger {
  constructor(events = []) { this._events = clone(events) ?? []; this._cursor = this._events.length; }
  get events() { return clone(this._events); }
  get position() { return this._cursor; }
  record(event) {
    const entry = { id: event.id ?? `event-${this._events.length + 1}`, sequence: this._events.length, ...clone(event) };
    this._events.push(entry); this._cursor = this._events.length; return clone(entry);
  }
  since(position = 0) { return this._events.slice(position).map(clone); }
  snapshot() { return { position: this._cursor, events: this.events }; }
  restore(snapshot = {}) { this._events = clone(snapshot.events ?? []).slice(0, snapshot.position ?? 0); this._cursor = this._events.length; }
  exportJSON() { return JSON.stringify(this._events, null, 2); }
}

function plainState(value) {
  if (!value || typeof value === 'function') return {};
  try { return clone(value); } catch { return { unavailable: true }; }
}

function adapterState(adapter) {
  if (!adapter) return { present: false };
  const state = typeof adapter.checkpointState === 'function' ? adapter.checkpointState() : typeof adapter.exportState === 'function' ? adapter.exportState() : {};
  let ledger;
  if (typeof adapter.exportLedgerJSON === 'function') { try { ledger = JSON.parse(adapter.exportLedgerJSON()); } catch { ledger = { unavailable: true }; } }
  return { present: true, type: adapter.constructor?.name ?? 'DeltaXAdapter', state: plainState(state), ledger };
}
function selectedSummary(runtime, fallback) {
  if (!runtime) return fallback;
  if (typeof runtime.inspect === 'function') return plainState(runtime.inspect());
  if (typeof runtime.summary === 'function') return plainState(runtime.summary());
  return plainState(runtime.inspect ?? runtime.summary ?? fallback);
}

function diffValues(left, right, prefix = '') {
  if (JSON.stringify(left) === JSON.stringify(right)) return [];
  if (left && right && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
    const paths = [];
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) paths.push(...diffValues(left[key], right[key], prefix ? `${prefix}.${key}` : key));
    return paths;
  }
  return [{ path: prefix || '$', control: left, intervention: right }];
}

/** Thin experimenter harness; perturb() never calls a runtime actuator. */
export class NeurocontrolHarness {
  constructor({ runtime = {}, adapter = null, environment = {}, seeds = {}, objective = null, runId = 'run-stub', ledger = null, checkpointDir = 'artifacts/checkpoints' } = {}) {
    this.runtime = runtime; this.adapter = adapter; this.environment = clone(environment); this.seeds = clone(seeds); this.objective = clone(objective); this.runId = runId;
    this.ledger = ledger ?? new EventLedger(); this.checkpointDir = checkpointDir;
    this.perturbations = { silencedPopulations: [], excitedPopulations: [], regionalGain: {}, maskedConnections: [], sensoryChannels: {} };
    this._checkpointCount = 0;
  }
  inspect() {
    const fallback = { membrane: plainState(this.runtime.membrane), firing: plainState(this.runtime.firing), selectedPopulations: plainState(this.runtime.selectedPopulations), sensoryInjection: plainState(this.runtime.sensoryInjection), descendingActivity: plainState(this.runtime.descendingActivity), modulation: plainState(this.runtime.modulation), mode: this.runtime.mode ?? 'stub' };
    const raw = selectedSummary(this.runtime, fallback);
    return { membrane: raw.membrane ?? raw.membraneSummary ?? fallback.membrane, firing: raw.firing ?? raw.firingSummary ?? fallback.firing, selectedPopulations: raw.selectedPopulations ?? raw.populations ?? fallback.selectedPopulations, sensoryInjection: raw.sensoryInjection ?? raw.sensory ?? fallback.sensoryInjection, descendingActivity: raw.descendingActivity ?? raw.descending ?? fallback.descendingActivity, modulation: raw.modulation ?? raw.modulationState ?? fallback.modulation, mode: raw.mode ?? fallback.mode, perturbations: clone(this.perturbations), actor: 'EXPERIMENTER', authority: 'OBSERVATION_ONLY' };
  }

  _log(type, payload) { return this.ledger.record({ type, layer: 'experimenter', actor: 'EXPERIMENTER', payload: clone(payload) }); }

  perturb(operation = {}) {
    const op = clone(operation);
    if (!op.type) throw new Error('perturbation type is required');
    if (op.actor && op.actor !== 'EXPERIMENTER') throw new Error('perturbations are experimenter-only');
    const id = op.id ?? `perturb-${this.ledger.position + 1}`;
    const record = { ...op, id, actor: 'EXPERIMENTER', declarative: true };
    switch (op.type) {
      case 'silence_population':
      case 'excite_population': {
        if (!op.population) throw new Error('population is required');
        const key = op.type === 'silence_population' ? 'silencedPopulations' : 'excitedPopulations';
        this.perturbations[key] = [...new Set([...this.perturbations[key], op.population])]; break;
      }
      case 'scale_regional_gain':
        if (!op.region || typeof op.scale !== 'number') throw new Error('region and numeric scale are required');
        this.perturbations.regionalGain[op.region] = op.scale; break;
      case 'mask_connection':
        if (!op.connection) throw new Error('connection is required');
        this.perturbations.maskedConnections = [...new Set([...this.perturbations.maskedConnections, op.connection])]; break;
      case 'set_sensory_channel':
        if (!op.channel || typeof op.enabled !== 'boolean') throw new Error('channel and enabled are required');
        this.perturbations.sensoryChannels[op.channel] = { enabled: op.enabled, replacement: op.replacement ?? null }; break;
      default: throw new Error(`unsupported perturbation type: ${op.type}`);
    }
    this._log('neurocontrol_perturb', record); return clone(record);
  }

  _substrateSnapshot() { return typeof this.runtime.checkpointState === 'function' ? plainState(this.runtime.checkpointState()) : this.inspect(); }
  checkpoint({ id = null } = {}) {
    fs.mkdirSync(this.checkpointDir, { recursive: true });
    this._checkpointCount += 1;
    const checkpointId = id ?? `${this.runId}-checkpoint-${this._checkpointCount}`;
    this._log('neurocontrol_checkpoint', { checkpointId });
    const inspection = this.inspect();
    const substrate = this._substrateSnapshot();
    const bundle = {
      schema: 'neurocontrol.checkpoint.v1', checkpoint_id: checkpointId, run_id: this.runId, created_by: 'EXPERIMENTER',
      seeds: clone(this.seeds), objective: clone(this.objective), substrate,
      neural_summary_refs: { membrane: inspection.membrane, firing: inspection.firing, selectedPopulations: inspection.selectedPopulations, sensoryInjection: inspection.sensoryInjection, descendingActivity: inspection.descendingActivity, modulation: inspection.modulation, mode: inspection.mode },
      deltax_adapter: adapterState(this.adapter), environment: clone(this.environment), perturbations: clone(this.perturbations), event_ledger: this.ledger.snapshot(),
      reproducibility: { perturbation_digest: hash(this.perturbations), substrate_digest: hash(substrate) }
    };
    const relPath = path.relative(process.cwd(), path.resolve(this.checkpointDir, `${checkpointId}.json`));
    const filePath = path.resolve(this.checkpointDir, `${checkpointId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(bundle, null, 2) + '\n');
    this._lastCheckpoint = clone(bundle);
    return { ...clone(bundle), path: relPath };
  }
  restore(checkpoint) {
    const bundle = typeof checkpoint === 'string' ? JSON.parse(fs.readFileSync(checkpoint, 'utf8')) : clone(checkpoint);
    if (bundle.schema !== 'neurocontrol.checkpoint.v1') throw new Error('unsupported checkpoint schema');
    if (typeof this.runtime.restore === 'function') this.runtime.restore(clone(bundle.substrate));
    this.environment = clone(bundle.environment); this.seeds = clone(bundle.seeds); this.objective = clone(bundle.objective);
    this.perturbations = clone(bundle.perturbations ?? this.perturbations); this.ledger.restore(bundle.event_ledger);
    this._log('neurocontrol_restore', { checkpointId: bundle.checkpoint_id, ledgerPosition: bundle.event_ledger.position });
    this._lastCheckpoint = clone(bundle);
    return { checkpoint_id: bundle.checkpoint_id, run_id: bundle.run_id, ledger_position: this.ledger.position, actor: 'EXPERIMENTER' };
  }

  _defaultReplay(mode, input) {
    const p = this.perturbations;
    const activeGain = Object.values(p.regionalGain).reduce((product, value) => product * value, 1);
    return { packet: { kind: 'executive_packet', mode, input: clone(input ?? null), authority: 'DeltaX' }, output: { selectedPopulations: [...p.excitedPopulations].sort(), silencedPopulations: [...p.silencedPopulations].sort(), regionalGain: activeGain, maskedConnections: [...p.maskedConnections].sort(), sensoryChannels: clone(p.sensoryChannels) }, deterministic_stub: true };
  }
  run(mode = 'CONTROL', input = null) {
    const before = this.ledger.position;
    const result = typeof this.runtime.replay === 'function' ? this.runtime.replay({ mode, input: clone(input), perturbations: clone(this.perturbations), seeds: clone(this.seeds), objective: clone(this.objective) }) : this._defaultReplay(mode, input);
    const run = { mode, actor: 'EXPERIMENTER', authority: 'OBSERVATION_AND_REPLAY', packets: clone(result), perturbations: clone(this.perturbations), ledger_position_before: before, ledger_position_after: this.ledger.position };
    this._log('neurocontrol_run', { mode, perturbationDigest: hash(this.perturbations) }); return run;
  }

  compare(checkpoint, { interventions = [], input = null, outputPath = null } = {}) {
    const base = typeof checkpoint === 'string' ? JSON.parse(fs.readFileSync(checkpoint, 'utf8')) : clone(checkpoint);
    this.restore(base); const control = this.run('CONTROL', input);
    this.restore(base); for (const intervention of interventions) this.perturb(intervention);
    const intervention = this.run('INTERVENTION', input); const divergence = diffValues(control.packets, intervention.packets);
    const differential = { schema: 'neurocontrol.compare.v1', checkpoint_id: base.checkpoint_id, run_id: this.runId, actor: 'EXPERIMENTER', control, intervention, diverged: divergence.length > 0, divergence: { paths: divergence, reason: divergence.length ? 'intervention changed replay output' : 'no observed difference' } };
    this._log('neurocontrol_compare', { checkpointId: base.checkpoint_id, diverged: differential.diverged });
    const filePath = path.resolve(outputPath ?? this.checkpointDir, `${base.checkpoint_id}-compare.json`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, JSON.stringify(differential, null, 2) + '\n');
    return { ...differential, path: filePath };
  }
}

export const createNeurocontrol = (options) => new NeurocontrolHarness(options);
