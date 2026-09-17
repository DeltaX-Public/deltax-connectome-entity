// Export the same posed scan and procedural setae used in both browser pages for Blender.
// node scripts/export_fly_blender.mjs /tmp/fly-blender/appearance.json
import fs from 'node:fs/promises';
import path from 'node:path';
import { createFlyAppearance } from '../src/fly-appearance.js';
const out = process.argv[2] || '/tmp/fly-blender/appearance.json';
const json = JSON.parse(await fs.readFile('public/body/fly_hd.json', 'utf8'));
const raw = await fs.readFile('public/body/fly_hd.bin');
const appearance = createFlyAppearance(json, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
appearance.root.updateMatrixWorld(true);
const hairs = [...appearance.hairGroups, ...appearance.sexComb];
const g = hairs[0].geometry;
const result = {
  parts: appearance.meshes.map(m => ({ name: m.name, matrix: m.matrixWorld.toArray() })),
  hairTemplate: { positions: Array.from(g.attributes.position.array), indices: Array.from(g.index.array) },
  hairs: hairs.map(m => ({ name: m.name, matrix: m.matrixWorld.toArray(), count: m.count,
    instances: Array.from(m.instanceMatrix.array.subarray(0, m.count * 16)), color: m.material.color.toArray() })),
};
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, JSON.stringify(result));
console.log(JSON.stringify({ out, parts: result.parts.length, hairs: hairs.reduce((n, m) => n + m.count, 0) }));
