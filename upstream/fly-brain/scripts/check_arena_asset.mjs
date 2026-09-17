import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const dir='public/body/blender';
const [meta,mesh,json,compressed]=await Promise.all(['fly.json','fly.mesh','arena.json','arena.mesh'].map(n=>fs.readFile(`${dir}/${n}`)));
const source=JSON.parse(meta), arena=JSON.parse(json), raw=gunzipSync(compressed);
const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength), types={Float32Array,Int16Array,Uint32Array};
assert.equal(arena.sourceHash,createHash('sha256').update(meta).update(mesh).digest('hex'),'Regenerate arena tiers when the Blender source changes');
for(const [level,parts] of Object.entries(arena.levels)) {
  assert.deepEqual(parts.map(p=>p.geom),source.parts.map(p=>p.geom));
  let triangles=0;
  for(const part of parts) {
    const read=d=>new types[d.type](buffer,d.offset,d.length);
    const count=part.attributes.position.length/3, index=read(part.index);
    assert.ok(index.length%3===0&&index.every(i=>i<count),`${part.geom}: valid topology`);
    for(const [name,descriptor] of Object.entries(part.attributes)) {
      const array=read(descriptor);
      assert.equal(array.length,count*(name==='uv'?2:3));
      assert.ok(array.every(Number.isFinite),`${part.geom}: finite ${name}`);
    }
    assert.ok(part.attributes.aCyclesLight,'Keep baked illumination at every tier');
    if(part.geom==='head_red')assert.ok(part.attributes.aSmooth);
    if(part.geom.includes('membrane'))assert.ok(part.attributes.uv);
    triangles+=index.length/3;
  }
  assert.equal(triangles,arena.triangles[level]);
}
assert.ok(arena.triangles.low<25000&&arena.triangles.medium<120000);
console.log(JSON.stringify({parts:source.parts.length,triangles:arena.triangles,bytes:compressed.length,sourceHash:arena.sourceHash}));
