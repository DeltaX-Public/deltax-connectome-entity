// Shared scan geometry, cuticle, eyes, wing films and procedural anatomy for fly.html and arena.html.
import * as THREE from 'three';

// Blender-authored seamless data tile: relief, roughness and pigment in RGB. One shared mip chain.
export async function loadCuticleDetail(url) {
  const tex = await new THREE.TextureLoader().loadAsync(url);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ---------------- shader helpers ----------------
const NOISE_GLSL = /* glsl */`
float fhash(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(fhash(i), fhash(i + vec3(1,0,0)), f.x), mix(fhash(i + vec3(0,1,0)), fhash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(fhash(i + vec3(0,0,1)), fhash(i + vec3(1,0,1)), f.x), mix(fhash(i + vec3(0,1,1)), fhash(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 bumpNormal(vec3 surf_pos, vec3 surf_norm, float h, float faceDirection){   // h: relief height in scene units
  vec2 dHdxy = vec2(dFdx(h), dFdy(h)) / max(length(fwidth(surf_pos)), 1e-7);
  vec3 vSigmaX = normalize(dFdx(surf_pos)), vSigmaY = normalize(dFdy(surf_pos));
  vec3 R1 = cross(vSigmaY, surf_norm), R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad); }`;

// Cuticle: sclerotised chitin with a velvet of microtrichia (sheen), fine microsculpture (procedural bump in
// body coordinates, faded out before it aliases), low-frequency mottling, and optional tergite banding.
function cuticle({ color, roughness = 0.42, sheen = 0.1, sheenColor = '#ad813e', clearcoat = 0, bump = 0.6, band = null, detailTexture = null }) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness, sheen, sheenRoughness: 0.8, sheenColor: new THREE.Color(sheenColor), clearcoat, clearcoatRoughness: 0.6, specularIntensity: 0.65, ior: 1.46 });
  const u = { uBump: { value: bump }, uBandOn: { value: band ? 1 : 0 }, uBand: { value: new THREE.Vector4() }, uDark: { value: new THREE.Color('#2a170c') } };
  if (band) u.uBand.value.set(band.y0, band.y1, band.frac, 0);
  if (detailTexture) u.uCuticleDetail = { value: detailTexture };
  m.userData.u = u;
  m.customProgramCacheKey = () => detailTexture ? 'fly-cuticle-blender-v1' : 'fly-cuticle-procedural-v1';
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj, vObjN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position; vObjN = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vObj, vObjN; uniform float uBump, uBandOn; uniform vec4 uBand; uniform vec3 uDark;\n${NOISE_GLSL}
      ${detailTexture ? `uniform sampler2D uCuticleDetail;
      vec3 cuticleDetail(vec3 p, vec3 n) {
        vec3 w = pow(abs(normalize(n)), vec3(4.)); w /= max(dot(w, vec3(1.)), 1e-5);
        return texture2D(uCuticleDetail, p.yz * 48.).rgb * w.x
             + texture2D(uCuticleDetail, p.xz * 48.).rgb * w.y
             + texture2D(uCuticleDetail, p.xy * 48.).rgb * w.z;
      }` : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${detailTexture ? 'vec3 surfaceDetail = cuticleDetail(vObj, vObjN);' : ''}
        float mott = ${detailTexture ? 'surfaceDetail.b' : 'vnoise(vObj * 95.) * .65 + vnoise(vObj * 320.) * .35'};
        float grainLod = 1. - smoothstep(.35, 1., length(fwidth(vObj)) * 1100.);
        float grain = ${detailTexture ? 'surfaceDetail.r' : 'vnoise(vObj * 1100.)'};
        diffuseColor.rgb *= .68 + .6 * mott;
        diffuseColor.rgb *= 1. + (grain - .5) * .2 * grainLod;
        if (uBandOn > .5) { float t = (vObj.y - uBand.x) / (uBand.y - uBand.x);
          float edge = 1. - uBand.z + .05 * (vnoise(vObj * 400.) - .5) + .08 * abs(vObj.x) / max(uBand.y - uBand.x, 1e-4);
          diffuseColor.rgb = mix(diffuseColor.rgb, uDark * (.7 + .6 * mott), smoothstep(edge - .06, edge + .02, t)); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + ${detailTexture ? '(surfaceDetail.g - .46) * .85' : '(mott - .5) * .28 + (grain - .5) * .18 * grainLod'}, .23, .8);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float footprint = length(fwidth(vObj));
          float relief = ${detailTexture ? 'grain' : 'vnoise(vObj * vec3(430., 650., 430.)) * (1. - smoothstep(.4, 1.2, footprint * 650.))'};
          float fine = grain * grainLod;
          float h = ${detailTexture ? 'relief * .00022' : '(relief * .00020 + fine * .000065)'} * uBump;
          normal = bumpNormal(-vViewPosition, normal, h, faceDirection); }`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        #if NUM_DIR_LIGHTS > 0
          // A small warm wrap term approximates shallow scattering through amber cuticle.
          // This does not refract the background through the otherwise opaque body.
          float wrap = pow(clamp(.45 - dot(normal, directionalLights[0].direction) * .5, 0., 1.), 3.);
          reflectedLight.directDiffuse += diffuseColor.rgb * directionalLights[0].color * vec3(1., .63, .28) * .1 * wrap;
        #endif`);
  };
  return m;
}

// Compound eye: the scan's individual lenses catch small highlights; pigment darkens softly where
// the smoothed eye normal faces the camera (pseudopupil), without a painted black pupil.
function eyeMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: '#ae2812', roughness: 0.25, clearcoat: 0.28, clearcoatRoughness: 0.12, sheen: 0, specularIntensity: 0.7, ior: 1.46 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aSmooth; varying vec3 vSmooth; varying vec3 vObj;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 smoothNormal = aSmooth;
        #ifdef USE_BATCHING
          smoothNormal = mat3(batchingMatrix) * smoothNormal;
        #endif
        #ifdef USE_INSTANCING
          smoothNormal = mat3(instanceMatrix) * smoothNormal;
        #endif
        vSmooth = normalize(normalMatrix * smoothNormal); vObj = position;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vSmooth; varying vec3 vObj;\n${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float facing = dot(normalize(vSmooth), normalize(vViewPosition));
        float pupil = smoothstep(.955, .995, facing);
        diffuseColor.rgb *= (.72 + .45 * vnoise(vObj * 180.)) * mix(1., .72, pupil);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.35, .02, .01), .25 * (1. - smoothstep(.1, .6, facing)));`);
  };
  return m;
}

// Wing membrane: thin-film iridescence with a thickness map (thicker at the base and along the veins' axis, thinning
// towards the tip), restrained reflections over a nearly clear membrane (premultiplied output),
// grazing-angle opacity and sparse microtrichia speckle.
function membraneMaterial(thicknessMap) {
  const m = new THREE.MeshPhysicalMaterial({ color: '#b6ab87', roughness: 0.28, metalness: 0, transparent: true, opacity: 0.025, side: THREE.DoubleSide, depthWrite: false,
    iridescence: 0.65, iridescenceIOR: 1.56, iridescenceThicknessRange: [120, 560], iridescenceThicknessMap: thicknessMap, specularIntensity: 0.45, envMapIntensity: 0.4 });
  m.forceSinglePass = true;
  m.blending = THREE.CustomBlending; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vObj;\n${NOISE_GLSL}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.a *= mix(.9 + .5 * step(.93, fhash(floor(vObj * 9000.))), 1., smoothstep(.2, .6, length(fwidth(vObj)) * 9000.));')
      .replace('#include <opaque_fragment>', `
        vec3 wSpec = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
        float fresnel = .04 + .96 * pow(1. - abs(dot(normal, normalize(vViewPosition))), 5.);
        float alpha = clamp(diffuseColor.a + fresnel * .18, 0., .35);
        gl_FragColor = vec4((outgoingLight - wSpec) * diffuseColor.a + wSpec * .45, alpha);`);
  };
  return m;
}

// ---------------- geometry utilities ----------------
function sampler(geo) {   // area-weighted random surface points with interpolated normals
  const P = geo.attributes.position.array, N = geo.attributes.normal.array, I = geo.index.array, nt = I.length / 3;
  const cum = new Float64Array(nt); let tot = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < nt; t++) { a.fromArray(P, I[3 * t] * 3); b.fromArray(P, I[3 * t + 1] * 3).sub(a); c.fromArray(P, I[3 * t + 2] * 3).sub(a); tot += b.cross(c).length() / 2; cum[t] = tot; }
  return { area: tot, sample(rand, pos, nrm) {
    const r = rand() * tot; let lo = 0, hi = nt - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
    let u = rand(), v = rand(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w = 1 - u - v;
    const i0 = I[3 * lo] * 3, i1 = I[3 * lo + 1] * 3, i2 = I[3 * lo + 2] * 3;
    pos.set(P[i0] * w + P[i1] * u + P[i2] * v, P[i0 + 1] * w + P[i1 + 1] * u + P[i2 + 1] * v, P[i0 + 2] * w + P[i1 + 2] * u + P[i2 + 2] * v);
    nrm.set(N[i0] * w + N[i1] * u + N[i2] * v, N[i0 + 1] * w + N[i1 + 1] * u + N[i2 + 1] * v, N[i0 + 2] * w + N[i1 + 2] * u + N[i2 + 2] * v).normalize();
  } };
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// one seta: a tapered, gently curved spine along +Y (curving towards +X), base at the origin
function setaGeometry(radial = 4, segs = 5) {
  const pos = [], idx = [];
  for (let s = 0; s <= segs; s++) { const t = s / segs, r = Math.pow(1 - t, 0.9) * (1 - 0.15 * t) + 0.02, x = 0.28 * t * t;
    for (let k = 0; k < radial; k++) { const a = k / radial * Math.PI * 2; pos.push(x + Math.cos(a) * r * 0.5 / 10, t, Math.sin(a) * r * 0.5 / 10); } }
  for (let s = 0; s < segs; s++) for (let k = 0; k < radial; k++) { const a = s * radial + k, b = s * radial + (k + 1) % radial; idx.push(a, a + radial, b, b, a + radial, b + radial); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const SETA = setaGeometry();
const SETA_LOW = setaGeometry(3, 2);
// the template has unit length and base radius 0.05, so an instance is scaled (radius / 0.05, length, radius / 0.05)
const _X = new THREE.Vector3(), _Y = new THREE.Vector3(), _Z = new THREE.Vector3(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();
function setaMatrix(out, pos, dir, bendTo, len, radius) {
  _Y.copy(dir).normalize(); _X.copy(bendTo).addScaledVector(_Y, -_Y.dot(bendTo));
  if (_X.lengthSq() < 1e-12) _X.set(1, 0, 0).addScaledVector(_Y, -_Y.x); _X.normalize(); _Z.crossVectors(_X, _Y);
  out.makeBasis(_X, _Y, _Z); _s.set(radius / 0.05, len, radius / 0.05); out.scale(_s); out.setPosition(pos); return out;
}


// Blender supplies worker-decoded geometry and exact baked hair placements through `prepared`.
// The offline exporter retains the original scan-based procedural path.
export function createFlyAppearance(json, bin, low = null, detailTexture = null, prepared = null) {
const makeCuticle = options => cuticle({ ...options, detailTexture });
// body hierarchy from world poses: local = parentWorld⁻¹ · world
const root = new THREE.Group();
const bodies = {}, localPose = { rest: {}, spread: {} };
const worldOf = (pose, name) => { const a = json.poses[pose][name]; return { p: new THREE.Vector3(a[0], a[1], a[2]), q: new THREE.Quaternion(a[4], a[5], a[6], a[3]) }; };
for (const pose of ['rest', 'spread']) for (const name of Object.keys(json.poses[pose])) {
  const w = worldOf(pose, name), par = json.parents[name];
  if (!par || par === 'world') { localPose[pose][name] = w; continue; }
  const pw = worldOf(pose, par), iq = pw.q.clone().invert();
  localPose[pose][name] = { p: w.p.clone().sub(pw.p).applyQuaternion(iq), q: iq.multiply(w.q) };
}
// the spring-reference pose crouches the legs; keep the standing reference pose for everything but the folded wings
for (const name of Object.keys(localPose.rest)) if (!/^wing_/.test(name)) localPose.rest[name] = localPose.spread[name];
for (const [name, sign] of [['wing_left', 1], ['wing_right', -1]])
  localPose.rest[name].q.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.22, 0.16 * sign, 'ZYX')));
for (const name of Object.keys(json.poses.rest)) { const g = new THREE.Group(); g.name = name; bodies[name] = g; }
for (const [name, g] of Object.entries(bodies)) { const par = json.parents[name]; (par && bodies[par] ? bodies[par] : root).add(g); const l = localPose.rest[name]; g.position.copy(l.p); g.quaternion.copy(l.q); }

// palette (wild-type Canton-S under white light)
const C = { tan: '#c99445', thorax: '#b48945', leg: '#cba65d', pale: '#dbc38c', bristle: '#2b1a0e', vein: '#725635', claw: '#342215' };
const mats = {
  thorax: makeCuticle({ color: C.thorax, roughness: 0.46, sheen: 0.12, bump: 1.3 }),
  head: makeCuticle({ color: C.tan, roughness: 0.4, sheen: 0.1, bump: 1.05 }),
  antenna: makeCuticle({ color: '#895c2c', roughness: 0.43, sheen: 0.12, bump: 1.1 }),
  leg: makeCuticle({ color: C.leg, roughness: 0.37, sheen: 0.08, bump: 0.65 }),
  pale: makeCuticle({ color: C.pale, roughness: 0.4, sheen: 0.08, bump: 0.5 }),
  bristle: new THREE.MeshPhysicalMaterial({ color: C.bristle, roughness: 0.54, clearcoat: 0, specularIntensity: 0.5 }),
  ocelli: new THREE.MeshPhysicalMaterial({ color: '#3a1d0c', roughness: 0.25, clearcoat: 0.35, clearcoatRoughness: 0.18 }),
  eye: eyeMaterial(),
  vein: new THREE.MeshPhysicalMaterial({ color: C.vein, roughness: 0.62, clearcoat: 0, transparent: true, opacity: 0.64, side: THREE.DoubleSide }),
  claw: new THREE.MeshPhysicalMaterial({ color: C.claw, roughness: 0.42, clearcoat: 0.08 }),
};
mats.vein.forceSinglePass = true;
const hairMats = {
  dark: new THREE.MeshPhysicalMaterial({ color: '#352414', roughness: 0.58, sheen: 0.1, sheenColor: new THREE.Color('#8a5a30'), sheenRoughness: 0.7 }),
  gold: new THREE.MeshPhysicalMaterial({ color: '#76532b', roughness: 0.6, sheen: 0.12, sheenColor: new THREE.Color('#b0834e'), sheenRoughness: 0.7 }),
  pale: new THREE.MeshPhysicalMaterial({ color: '#9a7846', roughness: 0.65, sheen: 0.1, sheenColor: new THREE.Color('#d8b890'), sheenRoughness: 0.7 }),
  comb: new THREE.MeshPhysicalMaterial({ color: '#160e08', roughness: 0.4, clearcoat: 0.1, clearcoatRoughness: 0.4 }),
};
for (const [name, material] of Object.entries(hairMats)) material.name = name;

const geoms = {}, meshes = [], tergites = [], hairGroups = [];
function wingThickness(geo) {   // planar UVs in the wing plane + a thickness map for the interference colours
  geo.computeBoundingBox(); const bb = geo.boundingBox, P = geo.attributes.position.array, uv = new Float32Array(P.length / 3 * 2);
  for (let i = 0; i < P.length / 3; i++) { uv[2 * i] = (P[3 * i] - bb.min.x) / (bb.max.x - bb.min.x); uv[2 * i + 1] = (P[3 * i + 1] - bb.min.y) / (bb.max.y - bb.min.y); }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
const thickTex = (() => {   // u across the chord, v along the span; base (v=1) thick, tip (v=0) thin, with slow ripples
  const W = 128, H = 256, d = new Uint8Array(W * H * 4), r = rng(7);
  const bumps = Array.from({ length: 14 }, () => [r(), r(), 0.05 + r() * 0.15, r() - 0.5]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = x / W, v = y / H;
    let t = 0.18 + 0.6 * Math.pow(v, 1.6) + 0.12 * Math.sin(u * 7 + v * 11) * (1 - v);
    for (const [bx, by, br, ba] of bumps) t += ba * 0.25 * Math.exp(-((u - bx) ** 2 + (v - by) ** 2) / (br * br));
    const val = Math.max(0, Math.min(255, t * 255)); const o = 4 * (y * W + x); d[o] = d[o + 1] = d[o + 2] = val; d[o + 3] = 255; }
  const tex = new THREE.DataTexture(d, W, H); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true; return tex;
})();
const membrane = membraneMaterial(thickTex);

for (const p of json.parts) {
  const geo = prepared?.geometries[p.geom] || new THREE.BufferGeometry();
  if (!prepared) {
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bin, p.vOff, p.vCount * 3), 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(bin, p.iOff, p.iCount), 1));
    geo.computeVertexNormals();
  }
  geoms[p.geom] = geo;
  const n = p.geom, body = p.body; let mat;
  if (n === 'head_red') { mat = mats.eye; if (!geo.hasAttribute('aSmooth')) addSmoothEyeNormals(geo); }
  else if (n === 'head_ocelli') mat = mats.ocelli;
  else if (/black|bristle/.test(n)) mat = mats.bristle;
  else if (/membrane/.test(n)) { if (!geo.hasAttribute('uv')) wingThickness(geo); mat = membrane; }
  else if (/wing_.*brown/.test(n)) mat = mats.vein;
  else if (/claw/.test(n)) mat = mats.claw;
  else if (/lower/.test(n)) mat = mats.pale;
  else if (/^abdomen/.test(n)) { geo.computeBoundingBox(); const bb = geo.boundingBox;
    mat = makeCuticle({ color: C.tan, roughness: 0.43, sheen: 0.1, band: { y0: p.bandBounds?.[0] ?? bb.min.y, y1: p.bandBounds?.[1] ?? bb.max.y, frac: 0.3 } }); tergites.push({ n, mat }); }
  else if (/coxa|femur|tibia|tarsus|haltere/.test(n)) mat = mats.leg;
  else if (/^antenna/.test(n)) mat = mats.antenna;
  else if (/thorax/.test(n)) mat = mats.thorax;
  else mat = mats.head;
  const mesh = new THREE.Mesh(geo, mat); mesh.name = n; mesh.castShadow = !/membrane/.test(n); mesh.receiveShadow = !/membrane/.test(n);
  if (/membrane/.test(n)) mesh.renderOrder = 2;
  bodies[body].add(mesh); meshes.push(mesh);
}

// eye pseudopupil needs the eye's overall curvature, not the facet normals: fit a sphere per eye
function addSmoothEyeNormals(geo) {
  const P = geo.attributes.position.array, n = P.length / 3, out = new Float32Array(P.length);
  for (const side of [-1, 1]) {
    const idx = []; for (let i = 0; i < n; i++) if (Math.sign(P[3 * i]) === side) idx.push(i);
    // linear least squares: x²+y²+z² = 2ax + 2by + 2cz + d
    const A = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), M = new Float64Array(16), rhs = new Float64Array(4);
    for (const i of idx) { const x = P[3 * i], y = P[3 * i + 1], z = P[3 * i + 2], row = [2 * x, 2 * y, 2 * z, 1], s = x * x + y * y + z * z;
      for (let r = 0; r < 4; r++) { rhs[r] += row[r] * s; for (let c = 0; c < 4; c++) M[4 * r + c] += row[r] * row[c]; } }
    A.set(...M); A.invert(); const e = A.elements; // column-major
    const sol = [0, 1, 2].map(r => e[r] * rhs[0] + e[4 + r] * rhs[1] + e[8 + r] * rhs[2] + e[12 + r] * rhs[3]);
    for (const i of idx) { const v = new THREE.Vector3(P[3 * i] - sol[0], P[3 * i + 1] - sol[1], P[3 * i + 2] - sol[2]).normalize(); out.set([v.x, v.y, v.z], 3 * i); }
  }
  geo.setAttribute('aSmooth', new THREE.BufferAttribute(out, 3));
}

// ---------------- setae ----------------
const sexComb = [];
if (prepared) {
  for (const hair of prepared.hairs) {
    const im = new THREE.InstancedMesh(SETA, hairMats[hair.material], hair.count);
    im.instanceMatrix = new THREE.InstancedBufferAttribute(hair.matrices, 16);
    im.name = hair.name; im.castShadow = hair.castShadow;
    im.boundingSphere = new THREE.Sphere(new THREE.Vector3().fromArray(hair.bounds.center), hair.bounds.radius);
    bodies[hair.body].add(im);
    (hair.material === 'comb' ? sexComb : hairGroups).push(im);
  }
} else {
// Direction conventions in each body frame: setae lean along `comb` (distal on legs, posterior on the abdomen),
// lying at 50–75° from the surface normal like real socketed bristles.
const restWorld = name => worldOf('rest', name);
function combOf(name) {
  const child = Object.keys(json.parents).find(c => json.parents[c] === name && !/haltere|wing|coxa|head|abdomen$/.test(c));
  if (child) return localPose.rest[child].p.clone().normalize();
  return new THREE.Vector3(0, Math.sign(localPose.rest[name].p.y) || 1, 0);
}
function addSetae(body, geomName, { density, len: [l0, l1], radius, mat, lean = [0.9, 1.25], comb = combOf(body), seed = 1, filter = null, cap = 6000 }) {
  const geo = geoms[geomName]; if (!geo) return;
  const s = sampler(geo), count = Math.min(cap, Math.round(s.area * density)), rand = rng(seed + geomName.length * 131);
  const im = new THREE.InstancedMesh(SETA, mat, count); im.castShadow = radius >= 0.0004;   // fine setae cast no visible shadow
  const pos = new THREE.Vector3(), nrm = new THREE.Vector3(), dir = new THREE.Vector3(), tan = new THREE.Vector3(); let k = 0;
  for (let tries = 0; k < count && tries < count * 4; tries++) {
    s.sample(rand, pos, nrm); if (filter && !filter(pos, nrm)) continue;
    tan.copy(comb).addScaledVector(nrm, -nrm.dot(comb)); if (tan.lengthSq() < 1e-8) tan.set(nrm.y, -nrm.x, 0); tan.normalize();
    const a = lean[0] + (lean[1] - lean[0]) * rand(), jitter = (rand() - 0.5) * 0.5;
    tan.applyAxisAngle(nrm, jitter);
    dir.copy(nrm).multiplyScalar(Math.cos(a)).addScaledVector(tan, Math.sin(a));
    pos.addScaledVector(nrm, -radius * 0.5);
    im.setMatrixAt(k++, setaMatrix(_m, pos, dir, tan, l0 + (l1 - l0) * rand(), radius * (0.8 + 0.4 * rand())));
  }
  im.count = k; im.name = `setae:${geomName}`; bodies[body].add(im); hairGroups.push(im); return im;
}

const legBodies = Object.keys(bodies).filter(n => /^(coxa|femur|tibia|tarsus\d?)_T\d_(left|right)$/.test(n));
for (const b of legBodies) {
  const tars = /tarsus/.test(b), tib = /tibia/.test(b);
  addSetae(b, b, { density: tars ? 380000 : tib ? 230000 : 150000, len: tars ? [0.0022, 0.0042] : [0.003, 0.0065], radius: 0.00022, mat: hairMats.gold, lean: [1.0, 1.35], seed: b.length });
  if (tib || /femur/.test(b)) addSetae(b, b, { density: 22000, len: [0.008, 0.014], radius: 0.00042, mat: hairMats.dark, lean: [0.75, 1.05], seed: 99 + b.length });
}
// abdomen: short setae over each tergite, a row of long bristles along its posterior margin, sparse hairs on sternites
for (const t of tergites) {
  const n = t.n, geo = geoms[n]; if (n === 'abdomen_8') { addSetae('abdomen_7', n, { density: 180000, len: [0.004, 0.009], radius: 0.0003, mat: hairMats.dark, comb: new THREE.Vector3(0, 1, 0) }); continue; }
  const body = n, bb = geo.boundingBox, H = bb.max.y - bb.min.y;
  addSetae(body, n, { density: 170000, len: [0.004, 0.0075], radius: 0.00028, mat: hairMats.dark, comb: new THREE.Vector3(0, 1, 0), filter: (p, nr) => nr.z > -0.35 });
  addSetae(body, n, { density: 140000, len: [0.011, 0.018], radius: 0.0004, mat: hairMats.dark, comb: new THREE.Vector3(0, 1, 0), lean: [0.85, 1.1], seed: 5,
    filter: (p, nr) => p.y > bb.max.y - H * 0.16 && nr.z > -0.2, cap: 160 });
  if (geoms[`${n}_lower`]) addSetae(body, `${n}_lower`, { density: 60000, len: [0.003, 0.006], radius: 0.00022, mat: hairMats.pale, comb: new THREE.Vector3(0, 1, 0) });
}
// head capsule, pleura, halteres, labellum, antennae
addSetae('head', 'head', { density: 300000, len: [0.0006, 0.0018], radius: 0.00007, mat: hairMats.gold, comb: new THREE.Vector3(0, 1, 0.4).normalize(), cap: 9000 });
addSetae('thorax', 'thorax', { density: 60000, len: [0.003, 0.006], radius: 0.00022, mat: hairMats.dark, comb: new THREE.Vector3(-1, 0, 0), filter: (p, n) => n.z < 0.3 });
for (const sd of ['left', 'right']) {
  addSetae(`haltere_${sd}`, `haltere_${sd}`, { density: 400000, len: [0.0015, 0.003], radius: 0.00015, mat: hairMats.gold });
  addSetae(`labrum_${sd}`, `labrum_${sd}_lower`, { density: 500000, len: [0.002, 0.004], radius: 0.00016, mat: hairMats.pale, lean: [0.4, 0.8] });
  addSetae(`antenna_${sd}`, `antenna_${sd}`, { density: 700000, len: [0.0012, 0.0025], radius: 0.0001, mat: hairMats.pale, lean: [0.9, 1.3], cap: 2500 });
}
// interommatidial bristles: one short hair at roughly every third facet
addSetae('head', 'head_red', { density: 60000, len: [0.0016, 0.0024], radius: 0.00007, mat: hairMats.dark, lean: [0.25, 0.55], comb: new THREE.Vector3(0, 0, -1), cap: 2400, seed: 3 });

// wing margin: outline of the membrane in its plane (angular extremes around the centroid) with outward bristles
function addWingMargin(sd) {
  const geo = geoms[`wing_${sd}_membrane`], P = geo.attributes.position.array, n = P.length / 3;
  const c = new THREE.Vector3(); for (let i = 0; i < n; i++) c.x += P[3 * i] / n, c.y += P[3 * i + 1] / n, c.z += P[3 * i + 2] / n;
  const bins = 720, far = new Array(bins).fill(null);
  for (let i = 0; i < n; i++) { const dx = P[3 * i] - c.x, dy = P[3 * i + 1] - c.y, b = Math.floor((Math.atan2(dy, dx) / (2 * Math.PI) + 0.5) * bins) % bins, r = dx * dx + dy * dy;
    if (!far[b] || r > far[b][3]) far[b] = [P[3 * i], P[3 * i + 1], P[3 * i + 2], r]; }
  const pts = far.filter(Boolean), rand = rng(sd.length * 17), im = new THREE.InstancedMesh(SETA, hairMats.dark, pts.length * 3); let k = 0;
  const pos = new THREE.Vector3(), out = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1);
  for (let j = 0; j < pts.length; j++) {
    const a = pts[j], b = pts[(j + 1) % pts.length], z = pts[(j + pts.length - 1) % pts.length];
    for (let h = 0; h < 3; h++) { const t = rand();
      pos.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
      out.set(pos.x - c.x, pos.y - c.y, 0).normalize();
      const tipward = Math.max(0, -(pos.y - c.y) / 0.13);                 // span runs along −y: margin hairs lengthen toward the tip
      out.addScaledVector(new THREE.Vector3(b[0] - z[0], b[1] - z[1], 0).normalize(), 0.6 + 0.3 * rand()).normalize();
      im.setMatrixAt(k++, setaMatrix(_m, pos, out, up, 0.003 + 0.003 * tipward * rand() + 0.0015 * rand(), 0.00012)); } }
  im.count = k; im.name = `setae:wing_${sd}`; bodies[`wing_${sd}`].add(im); hairGroups.push(im);
}
addWingMargin('left'); addWingMargin('right');

// male sex comb: ~10 thick, blunt, black teeth in a row across the distal basitarsus, on its anterior-ventral face
for (const sd of ['left', 'right']) {
  const b = `tarsus_T1_${sd}`, geo = geoms[b]; geo.computeBoundingBox(); const bb = geo.boundingBox, P = geo.attributes.position.array, N = geo.attributes.normal.array;
  const w = restWorld(b), toLocal = w.q.clone().invert();
  const want = new THREE.Vector3(0.7, 0, -0.7).applyQuaternion(toLocal).normalize();   // world anterior + ventral
  const distal = new THREE.Vector3(0, 1, 0), im = new THREE.InstancedMesh(SETA, hairMats.comb, 11); im.castShadow = true;
  const teeth = 11, pos = new THREE.Vector3(), nrm = new THREE.Vector3(), dir = new THREE.Vector3();
  for (let k = 0; k < teeth; k++) {
    const y = bb.min.y + (bb.max.y - bb.min.y) * (0.55 + 0.38 * k / (teeth - 1)); let best = -Infinity;
    for (let i = 0; i < P.length / 3; i++) { if (Math.abs(P[3 * i + 1] - y) > 0.0008) continue; const v = N[3 * i] * want.x + N[3 * i + 1] * want.y + N[3 * i + 2] * want.z;
      if (v > best) { best = v; pos.fromArray(P, 3 * i); nrm.fromArray(N, 3 * i); } }
    pos.addScaledVector(distal, -0.0012 * Math.sin(k / (teeth - 1) * Math.PI));          // gentle arc like the real row
    dir.copy(nrm).multiplyScalar(0.45).addScaledVector(distal, 0.9).normalize();
    im.setMatrixAt(k, setaMatrix(_m, pos, dir, nrm.clone().negate(), 0.0042 + 0.0008 * Math.sin(k / (teeth - 1) * Math.PI), 0.00055));
  }
  im.name = `sexcomb:${sd}`; bodies[b].add(im); sexComb.push(im);
}
}


  // Immutable buffers are shared by all arena flies. Only transforms, draw counts and sex differ.
  const lowGeoms = prepared?.levels?.low || {};
  const mediumGeoms = prepared?.levels?.medium || {};
  if (low) for (const p of low.json.parts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(low.bin, p.vOff, p.vCount * 3), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(low.bin, p.iOff, p.iCount), 1));
    g.computeVertexNormals();
    if (p.geom === 'head_red') addSmoothEyeNormals(g);
    if (/membrane/.test(p.geom)) wingThickness(g);
    g.computeBoundingSphere(); lowGeoms[p.geom] = g;
  }
  for (const m of [...hairGroups, ...sexComb]) { if (!m.boundingSphere) m.computeBoundingSphere(); m.userData.fullCount = m.count; }
  for (const m of meshes) { if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); m.matrixAutoUpdate = false; }
  function pigment(sex, list = tergites) {
    for (const { n, mat } of list) mat.userData.u.uBand.value.z = sex === 'm' && /abdomen_(6|7|8)$/.test(n) ? 1.2 : n === 'abdomen' ? 0.18 : 0.32;
  }
  pigment('m');
  const femaleMats = new Map();
  for (const { n, mat } of tergites) {
    const b = mat.userData.u.uBand.value;
    const fm = makeCuticle({ color: C.tan, roughness: 0.43, sheen: 0.1, band: { y0: b.x, y1: b.y, frac: n === 'abdomen' ? 0.18 : 0.32 } });
    femaleMats.set(mat, fm);
  }
  const lowHairs = new Map();
  function instantiate(sex = 'm') {
    const group = new THREE.Group(), instanceBodies = {}, surface = [], hairs = [], combs = [];
    group.matrixAutoUpdate = false;
    for (const [name, source] of Object.entries(bodies)) {
      const g = new THREE.Group(); g.name = name; g.matrixAutoUpdate = false; group.add(g); instanceBodies[name] = g;
      for (const src of source.children) {
        if (!src.isMesh) continue;
        const mat = sex === 'f' ? femaleMats.get(src.material) || src.material : src.material;
        let m;
        if (src.isInstancedMesh) {
          m = new THREE.InstancedMesh(src.geometry, mat, 0);
          m.instanceMatrix = src.instanceMatrix; m.count = src.count;
          m.boundingSphere = src.boundingSphere; m.userData.fullCount = src.count;
          m.userData.longSetae = src.castShadow;
          m.userData.high = src.geometry;
          if (!lowHairs.has(src.geometry)) {
            const lowHair = SETA_LOW.clone();
            if (src.geometry.hasAttribute('aHairLight')) lowHair.setAttribute('aHairLight', src.geometry.getAttribute('aHairLight'));
            lowHairs.set(src.geometry, lowHair);
          }
          m.userData.low = lowHairs.get(src.geometry);
          if (src.name.startsWith('sexcomb:')) { m.visible = sex === 'm'; combs.push(m); }
          else hairs.push(m);
        } else {
          m = new THREE.Mesh(src.geometry, mat);
          m.userData.high = src.geometry; m.userData.low = lowGeoms[src.name] || src.geometry;
          m.userData.medium = mediumGeoms[src.name] || (src.name === 'head_red' ? src.geometry : m.userData.low);
          surface.push(m);
        }
        m.name = src.name; m.castShadow = src.castShadow; m.receiveShadow = src.receiveShadow;
        m.renderOrder = src.renderOrder; m.matrixAutoUpdate = false; g.add(m);
      }
    }
    // Bounds always describe the full hair population, even while a smaller prefix is drawn.
    // At intermediate distances retain long bristles; subpixel fuzz is represented by cuticle sheen.
    let tier = -1;
    function setDetail(pixels) {
      const macro = pixels > (tier === 2 ? 270 : 330);
      const nearby = pixels > (tier >= 1 ? 85 : 110);
      const next = macro ? 2 : nearby ? 1 : 0;
      if (next === tier) return false;
      tier = next;
      for (const m of surface) m.geometry = next === 2 ? m.userData.high : next === 1 ? m.userData.medium : m.userData.low;
      for (const m of hairs) {
        m.visible = next === 2 || next === 1 && m.userData.longSetae;
        m.geometry = next === 2 ? m.userData.high : m.userData.low;
        m.count = m.userData.fullCount;
        m.castShadow = false;
      }
      for (const m of combs) m.visible = sex === 'm' && next > 0;
      return true;
    }
    setDetail(0);
    return { group, bodies: instanceBodies, meshes: surface, hairs, sexComb: combs, setDetail, getDetail: () => tier };
  }
  return { root, bodies, localPose, meshes, tergites, hairGroups, sexComb, pigment, instantiate, lowGeoms, mediumGeoms, femaleMats };
}
