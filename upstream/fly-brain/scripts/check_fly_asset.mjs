// Verify the actual shipped v3 payload against the original procedural anatomy, not just counts.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { Texture } from 'three';
import { createFlyAppearance } from '../src/fly-appearance.js';
import { createBlenderFly } from '../src/fly-blender.js';
import { decodeBlenderFly } from '../src/fly-decode.js';
const arrayBuffer = b => b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const meta = JSON.parse(await fs.readFile('public/body/blender/fly.json','utf8'));
assert.equal(meta.sourceScan, undefined, 'The browser must not download the source sampler');
const decoded = await decodeBlenderFly(meta,arrayBuffer(gunzipSync(await fs.readFile('public/body/blender/fly.mesh'))));
const original = createFlyAppearance(JSON.parse(await fs.readFile('public/body/fly_hd.json','utf8')),arrayBuffer(await fs.readFile('public/body/fly_hd.bin')));
const detail = new Texture();
detail.toJSON = () => { throw new Error('Material variants must share the detail texture without serializing it'); };
const fly = createBlenderFly({meta,...decoded}, detail);
assert.equal(fly.meshes.length,85);
assert.equal(fly.meshes.reduce((s,m)=>s+m.geometry.index.count/3,0),1169030);
const sourceHairs=[...original.hairGroups,...original.sexComb],hairs=[...fly.hairGroups,...fly.sexComb];
assert.equal(hairs.length,sourceHairs.length);
for(const [i,hair] of hairs.entries()) {
  const source=sourceHairs[i];
  assert.equal(hair.name,source.name);assert.equal(hair.parent.name,source.parent.name);
  assert.equal(hair.count,source.count);assert.equal(hair.castShadow,source.castShadow);
  assert.deepEqual(hair.instanceMatrix.array,source.instanceMatrix.array.subarray(0,source.count*16),`Exact hair transforms: ${hair.name}`);
  assert.deepEqual(hair.boundingSphere,source.boundingSphere,`Culling bounds: ${hair.name}`);
  assert.equal(hair.geometry.attributes.aHairLight.count,hair.count);
}
for(const sex of ['m','f']) {
  original.pigment(sex);fly.pigment(sex);
  for(const [i,t] of fly.tergites.entries())assert.deepEqual(t.mat.userData.u.uBand.value,original.tergites[i].mat.userData.u.uBand.value);
}
for(const mesh of fly.meshes) {
  const uniforms=mesh.material.userData.u;
  if (uniforms) assert.equal(uniforms.uCuticleDetail.value, detail);
  const g=mesh.geometry;
  for(const a of Object.values(g.attributes))assert.ok(a.array.every(Number.isFinite),`Finite ${mesh.name} attribute`);
  assert.ok(g.index.array.every(i=>i<g.attributes.position.count));
  assert.ok(g.boundingSphere.radius>0);
}
console.log(JSON.stringify({passed:true,triangles:1169030,hairs:hairs.reduce((s,m)=>s+m.count,0),exactHairTransforms:true,bandingPreserved:true}));
