import fs from 'node:fs';
import path from 'node:path';
import { createNeurocontrol } from '../src/neurocontrol/index.mjs';

const args = Object.fromEntries(process.argv.slice(2).filter((x) => x.startsWith('--')).map((x) => {
  const [key, ...rest] = x.slice(2).split('='); return [key, rest.join('=') || true];
}));
const mode = args.mode || 'stub';
const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
if (mode === 'canonical_api') {
  if (args.recorded) {
    console.log(JSON.stringify({ mode, replayable: true, source: 'recorded_packets', packets: readJson(args.recorded) }, null, 2));
  } else {
    console.log(JSON.stringify({ mode, replayable: false,
      reason: 'canonical_api replay requires recorded executive packets when the API is unavailable' }, null, 2));
  }
  process.exit(0);
}
if (!args.checkpoint || !args.events) {
  console.error('Usage: node scripts/replay_run.mjs --mode=stub --seed=N --checkpoint=FILE --events=FILE');
  process.exit(2);
}
const checkpointFile = readJson(args.checkpoint);
const checkpoint = checkpointFile.neurocontrol_checkpoint || checkpointFile;
const events = readJson(args.events);
const nc = createNeurocontrol({ seeds: { seed: Number(args.seed ?? checkpointFile.seeds?.seed ?? 0) } });
nc.restore(checkpoint);
const packets = [];
for (const event of events) {
  if (event.type === 'silence_population' || event.type === 'excite_population' || event.type === 'scale_regional_gain') {
    packets.push({ actor: 'EXPERIMENTER', authority: 'EXPERIMENTER', perturbation: nc.perturb(event) });
  } else {
    const run = nc.run(event.mode || 'CONTROL', event.input ?? event);
      packets.push(run.packets);
  }
}
console.log(JSON.stringify({ schema: 'replay_run.v1', mode: 'stub', deterministic: true, packets }, null, 2));
