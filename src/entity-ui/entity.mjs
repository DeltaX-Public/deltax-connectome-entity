import { executiveSource, sourceCopy, listValue } from './state.mjs';

const $ = (id) => document.getElementById(id);
const textify = (v) => {
  if (v == null || v === '') return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') return v.task ?? v.name ?? v.id ?? v.label ?? JSON.stringify(v);
  return String(v);
};
const put = (id, v) => { $(id).textContent = textify(v); };
const vals = (v) => listValue(v).map((x) => (typeof x === 'object'
  ? (x.label ?? x.substrate_candidate_id ?? x.name ?? x.id ?? JSON.stringify(x))
  : x));
const list = (id, v, empty) => {
  const a = vals(v);
  $(id).innerHTML = a.length ? a.map((x) => `<li>${x}</li>`).join('') : `<li class="muted">${empty}</li>`;
};

const state = {
  playback: null,
  ledger: null,
  frameIndex: 0,
  running: false,
  timer: null,
  elapsed: 0,
  events: [],
  lesion: null,
  checkpoint: null,
};

function log(msg) {
  state.events.unshift(msg);
  $('run-log').innerHTML = state.events.slice(0, 6).map((x) => `<li>${x}</li>`).join('') || '<li class="muted">Ready.</li>';
}

function currentFrame() {
  const frames = state.playback?.frames;
  if (!frames?.length) return null;
  return frames[Math.min(state.frameIndex, frames.length - 1)];
}

function source(d) {
  const s = executiveSource(d?.executive_source);
  const b = $('executive-badge');
  b.textContent = 'SOURCE: ' + s;
  b.className = 'badge ' + s;
  $('source-note').textContent = sourceCopy(s);
  $('authority-tag').textContent = s === 'canonical_api'
    ? 'CANONICAL AUTHORITY'
    : s === 'local_runtime'
      ? 'LOCAL RUNTIME'
      : s === 'stub'
        ? 'STUB · NOT DELTAX'
        : 'NO AUTHORITY';
  put('goal', d?.goal ?? d?.current_goal ?? d?.objective);
  put('modulation', d?.modulation && Object.keys(d.modulation).length ? JSON.stringify(d.modulation) : (d?.modulation ?? '—'));
  put('executive-output', d?.executive_output ?? d?.output ?? d?.disposition);
  put('vetoes', Array.isArray(d?.vetoed) ? (d.vetoed.length ? d.vetoed.map((x) => x.substrate_candidate_id ?? x.id).join(', ') : 'none') : d?.vetoes);
  list('candidates', d?.candidates, 'No candidate ledger loaded.');
  list('contradictions', d?.contradictions, 'No contradiction ledger loaded.');
  const hist = d?.transition_history ?? [];
  $('history').innerHTML = hist.length
    ? hist.map((x) => `<span>${typeof x === 'string' ? x : textify(x)}</span>`).join('')
    : '<span class="muted">No transitions loaded.</span>';
}

function telemetry(d) {
  const t = d?.telemetry ?? d?.substrate ?? {};
  const r = t.regions ?? d?.regional_activity ?? {};
  const a = Object.entries(r);
  $('activity-bars').innerHTML = a.length
    ? a.slice(0, 10).map(([n, v]) => `<div class="activity-bar" style="height:${Math.max(5, Math.min(100, Number(v) || 0))}%"><em>${n}</em></div>`).join('')
    : '<div class="empty-state">Waiting for harness telemetry…</div>';
  put('spike-total', t.spikes ?? t.spike_count);
  put('sensory-value', t.sensory ?? r.sensory);
  put('descending-value', t.descending ?? r.descending);
  $('intervention-callout').classList.toggle('hidden', !(d?.intervention_active ?? d?.intervention));
}

function worldPanel(d) {
  const w = d?.world ?? {};
  const ev = w.events ?? d?.world_events ?? [];
  put('objective', w.objective ?? d?.objective ?? 'objective · unavailable');
  put('world-mode', w.mode ?? d?.mode ?? 'observe');
  put('event-count', Array.isArray(ev) ? ev.length : (d?.event_count ?? 0));
  put('rover-status', w.rover_status ?? d?.rover_status ?? 'idle');
  list('world-events', ev, 'No mutation events in view.');
}

function drawArena(frame) {
  const c = $('world-canvas');
  const x = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  const arena = state.playback?.arena ?? { width: 10, height: 5, obstacles: [], goalRegion: { xMin: 8, xMax: 9, yMin: 1, yMax: 3 }, hazard: { cells: [] } };
  const cols = arena.width || 10;
  const rows = arena.height || 5;
  const pad = 18;
  const cell = Math.min((w - pad * 2) / cols, (h - pad * 2) / rows);
  const ox = (w - cell * cols) / 2;
  const oy = (h - cell * rows) / 2;

  x.fillStyle = '#07131a';
  x.fillRect(0, 0, w, h);

  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const px = ox + gx * cell;
      const py = oy + gy * cell;
      x.strokeStyle = '#163541';
      x.strokeRect(px, py, cell, cell);
    }
  }

  const goal = arena.goalRegion || {};
  x.fillStyle = '#1d4d3a88';
  for (let gy = goal.yMin ?? 0; gy <= (goal.yMax ?? -1); gy += 1) {
    for (let gx = goal.xMin ?? 0; gx <= (goal.xMax ?? -1); gx += 1) {
      x.fillRect(ox + gx * cell, oy + gy * cell, cell, cell);
    }
  }

  for (const o of arena.obstacles || []) {
    x.fillStyle = '#2a3a45';
    x.fillRect(ox + o.x * cell + 2, oy + o.y * cell + 2, cell - 4, cell - 4);
  }

  const door = frame?.door ?? { x: 5, closed: true };
  x.fillStyle = door.closed ? '#ffbf69' : '#5ee0d155';
  x.fillRect(ox + (door.x ?? 5) * cell + 4, oy + 0 * cell + 2, cell - 8, cell * rows - 4);
  x.fillStyle = '#071018';
  x.font = '10px monospace';
  x.fillText(door.closed ? 'DOOR' : 'OPEN', ox + (door.x ?? 5) * cell + 6, oy + cell * 0.6);

  for (const hz of (frame?.hazard?.cells ?? arena.hazard?.cells ?? [])) {
    x.fillStyle = '#7a2e2e88';
    x.fillRect(ox + hz.x * cell + 3, oy + hz.y * cell + 3, cell - 6, cell - 6);
  }

  const body = frame?.body ?? { x: 1, y: 2 };
  const bx = ox + body.x * cell + cell * 0.15;
  const by = oy + body.y * cell + cell * 0.2;
  x.fillStyle = '#80a9ff';
  x.fillRect(bx, by, cell * 0.7, cell * 0.45);
  x.fillStyle = '#5ee0d1';
  x.beginPath();
  x.arc(bx + cell * 0.18, by + cell * 0.55, cell * 0.12, 0, 7);
  x.arc(bx + cell * 0.52, by + cell * 0.55, cell * 0.12, 0, 7);
  x.fill();

  x.fillStyle = '#8da1aa';
  x.font = '12px monospace';
  const label = state.lesion
    ? `lesion: ${state.lesion}`
    : (frame?.note ? `step ${frame.step} · ${frame.note}` : 'Broken World grid');
  x.fillText(label, 14, 20);
}

function viewModelFromFrame(frame) {
  const pb = state.playback;
  const decision = frame?.decision ?? pb?.decision_summary;
  const candidates = frame?.candidates
    ?? decision?.permitted?.map((p) => ({ ...p, label: p.substrate_candidate_id }))
    ?? [];
  return {
    executive_source: decision?.executive_source ?? pb?.executive_source ?? 'disabled',
    objective: pb?.objective,
    goal: pb?.objective,
    disposition: decision?.disposition,
    executive_output: decision?.disposition,
    modulation: decision?.modulation ?? {},
    vetoed: decision?.vetoed ?? [],
    candidates,
    contradictions: (frame?.last_events || [])
      .filter((e) => e.type === 'CONTRADICTION')
      .map((e) => e.type),
    transition_history: [
      ...(frame?.last_events || []).map((e) => e.type),
      decision?.disposition,
    ].filter(Boolean),
    telemetry: frame?.telemetry,
    world: {
      objective: pb?.objective,
      mode: frame?.phase ?? 'playback',
      events: (frame?.last_events || []).map((e) => `${e.type}${e.detail != null ? ': ' + textify(e.detail) : ''}`),
      rover_status: state.running ? 'moving' : (frame?.reached_goal ? 'goal' : 'idle'),
    },
    event_count: frame?.last_events?.length ?? 0,
    intervention: frame?.note === 'executive_decision',
  };
}

function render() {
  const frame = currentFrame();
  if (state.playback && frame) {
    const model = viewModelFromFrame(frame);
    state.ledger = model;
    source(model);
    telemetry(model);
    worldPanel(model);
    drawArena(frame);
    $('checkpoint-empty').hidden = true;
  } else {
    source(state.ledger || {});
    telemetry(state.ledger || {});
    worldPanel(state.ledger || {});
    drawArena(null);
  }
}

function time(s) {
  const m = Math.floor(s / 60);
  const q = (s % 60).toFixed(1).padStart(4, '0');
  return `t+${String(m).padStart(2, '0')}:${q}`;
}

function setRunning(v) {
  state.running = v;
  $('run-state').textContent = v ? 'RUNNING' : 'PAUSED';
  $('run-state').classList.toggle('running', v);
}

function stopTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

function playStep() {
  if (!state.playback?.frames?.length) return;
  if (state.frameIndex >= state.playback.frames.length - 1) {
    setRunning(false);
    stopTimer();
    put('rover-status', currentFrame()?.reached_goal ? 'goal reached' : 'idle');
    log('playback complete');
    $('control-status').textContent = 'Playback finished. Reset and Start again, or regenerate with npm run demo:observatory.';
    render();
    return;
  }
  state.frameIndex += 1;
  state.elapsed += 0.35;
  put('sim-time', time(state.elapsed));
  const fr = currentFrame();
  if (fr?.note === 'executive_decision') {
    log(`DeltaX ${fr.decision?.disposition} via ${fr.decision?.executive_source}`);
    $('runtime-mode').value = fr.decision?.executive_source === 'local_runtime' ? 'local_runtime' : (fr.decision?.executive_source || 'stub');
  } else if (fr?.door && fr.note) {
    log(`step ${fr.step}: ${fr.note}`);
  }
  render();
}

$('start-btn').onclick = () => {
  if (!state.playback?.frames?.length) {
    log('no playback artifact — run npm run demo:observatory');
    $('control-status').textContent = 'Missing artifacts/observatory/latest-playback.json. Generate it with the harness, then refresh.';
    return;
  }
  if (state.frameIndex >= state.playback.frames.length - 1) {
    state.frameIndex = 0;
    state.elapsed = 0;
  }
  setRunning(true);
  stopTimer();
  state.timer = setInterval(playStep, 350);
  log('playback started — rover crosses Broken World; executive fires when door opens');
  $('control-status').textContent = 'Playing harness frames. Badge follows recorded executive_source (local_runtime or stub).';
  render();
};

$('pause-btn').onclick = () => {
  setRunning(false);
  stopTimer();
  log('playback paused');
};

$('reset-btn').onclick = () => {
  setRunning(false);
  stopTimer();
  state.frameIndex = 0;
  state.elapsed = 0;
  state.events = [];
  state.lesion = null;
  put('sim-time', time(0));
  render();
  log('reset to frame 0');
};

$('runtime-mode').onchange = (e) => {
  log('runtime selected: ' + e.target.value);
  $('control-status').textContent = 'Dropdown is a preference hint. Badge follows the playback artifact source.';
};

$('mutate-btn').onclick = () => {
  log('world mutation is baked into playback (door opens mid-run)');
  $('control-status').textContent = 'Door opening is already in the recorded frames around step 3.';
};

$('checkpoint-btn').onclick = () => {
  state.checkpoint = { frameIndex: state.frameIndex, elapsed: state.elapsed, lesion: state.lesion };
  log('local checkpoint @ frame ' + state.frameIndex);
};

$('restore-btn').onclick = () => {
  if (!state.checkpoint) return log('restore skipped: no local checkpoint');
  state.frameIndex = state.checkpoint.frameIndex;
  state.elapsed = state.checkpoint.elapsed;
  state.lesion = state.checkpoint.lesion;
  render();
  log('checkpoint restored');
};

$('lesion-btn').onclick = () => {
  state.lesion = $('lesion-target').value;
  render();
  log('lesion overlay: ' + state.lesion);
  $('control-status').textContent = 'Lesion is an experimenter overlay on the local view; causal evidence still comes from harness artifacts.';
};
$('clear-lesion-btn').onclick = () => {
  state.lesion = null;
  render();
  log('lesion cleared');
};

$('export-btn').onclick = () => {
  const rows = [
    {
      type: 'observatory_export',
      exported_at: new Date().toISOString(),
      executive_source: executiveSource(state.ledger?.executive_source),
      frame_index: state.frameIndex,
      playback: state.playback,
      local_events: state.events,
    },
    { type: 'honesty_note', text: 'Neural activity is telemetry; stub is not genuine DeltaX; local_runtime is not canonical_api.' },
  ].map(JSON.stringify).join('\n') + '\n';
  const blob = new Blob([rows], { type: 'application/x-ndjson' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'entity-observatory-run.jsonl';
  a.click();
  log('JSONL export downloaded');
};

async function load() {
  try {
    const r = await fetch('./artifacts/observatory/latest-playback.json');
    if (!r.ok) throw new Error('no playback');
    state.playback = await r.json();
    state.frameIndex = 0;
    $('connection-state').textContent = 'PLAYBACK READY';
    $('runtime-mode').value = state.playback.executive_source === 'local_runtime'
      ? 'local_runtime'
      : (state.playback.executive_source || 'disabled');
    log(`loaded ${state.playback.frames.length} frames · ${state.playback.executive_source}`);
    $('control-status').textContent = 'Hit Start run to watch the rover, door open, and executive decision.';
    render();
    return;
  } catch {
    /* fall through */
  }
  try {
    const r = await fetch('./artifacts/checkpoints/causal-intervention-8.json');
    if (!r.ok) throw new Error('no artifact');
    const raw = await r.json();
    state.ledger = {
      executive_source: 'disabled',
      objective: textify(raw.objective),
      goal: textify(raw.objective),
      telemetry: { regions: {}, spikes: '—' },
      world: { objective: textify(raw.objective), mode: 'artifact', events: [], rover_status: 'idle' },
    };
    $('connection-state').textContent = 'ARTIFACT LOADED';
    $('control-status').textContent = 'Only a static checkpoint is present. Run: npm run demo:observatory';
    render();
  } catch {
    $('connection-state').textContent = 'NO TELEMETRY';
    render();
  }
}

render();
load();
