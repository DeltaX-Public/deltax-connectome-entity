// Derive compact arena tiers from the actual Cycles mesh; retain normals/irradiance/UVs.
// node scripts/pack_fly_arena.mjs (rerun after pack_fly_realtime.mjs)
import fs from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import { decodeBlenderFly } from '../src/fly-decode.js';
const dir = 'public/body/blender';
const metaBytes = await fs.readFile(`${dir}/fly.json`), packed = await fs.readFile(`${dir}/fly.mesh`);
const binary = gunzipSync(packed), meta = JSON.parse(metaBytes);
const asset = await decodeBlenderFly(meta, binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength));
await MeshoptSimplifier.ready;
let offset = 0;
const chunks = [], stats = {};
function store(array) {
  const descriptor = { offset, length:array.length, type:array.constructor.name };
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  chunks.push(bytes); offset += bytes.length;
  const padding = (4-offset%4)%4; if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
  return descriptor;
}
const levels = {};
for (const [level, ratio, error] of [['low', .018, .035], ['medium', .09, .015]]) {
  levels[level] = asset.parts.map(part => {
    const {position,normal,aCyclesLight} = part.attributes;
    const attrs = new Float32Array(position.length*2);
    for (let i=0; i<position.length/3; i++) for(let k=0;k<3;k++) {
      attrs[i*6+k]=normal[i*3+k]/32767;
      attrs[i*6+3+k]=Math.sqrt(aCyclesLight[i*3+k]);
    }
    // Preserve silhouettes and baked transport. Small articulated parts keep at least 24 triangles.
    const target = Math.max(72, Math.floor(part.index.length*ratio/3)*3);
    const [index, measuredError] = MeshoptSimplifier.simplifyWithAttributes(part.index,position,3,attrs,6,
      [.15,.15,.15,.08,.08,.08],null,target,error,['Permissive']);
    const [remap, count] = MeshoptSimplifier.compactMesh(index);
    const attributes = {};
    for (const [name, array] of Object.entries(part.attributes)) {
      const size = name==='uv'?2:3, compact = new array.constructor(count*size);
      for(let i=0;i<remap.length;i++) if(remap[i]!==0xffffffff)
        for(let k=0;k<size;k++) compact[remap[i]*size+k]=array[i*size+k];
      attributes[name] = store(compact);
    }
    return {geom:part.geom,attributes,index:store(index),error:measuredError,bounds:part.bounds};
  });
  stats[level] = levels[level].reduce((n,p)=>n+p.index.length/3,0);
}
const manifest = {version:1,sourceHash:createHash('sha256').update(metaBytes).update(packed).digest('hex'),levels,triangles:stats};
await fs.writeFile(`${dir}/arena.json`,JSON.stringify(manifest));
const compressed = gzipSync(Buffer.concat(chunks), {level:9});
await fs.writeFile(`${dir}/arena.mesh`, compressed);
console.log(JSON.stringify({triangles:stats,bytes:compressed.length}));
