// Cycles diffuse transport on real subdivided geometry; camera-dependent gloss stays live.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { createFlyAppearance } from './fly-appearance.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export async function loadBlenderFly(base, progress = () => {}) {
  const [meta, response] = await Promise.all([
    fetch(`${base}body/blender/fly.json`).then(r => { if (!r.ok) throw new Error('Blender mesh metadata unavailable'); return r.json(); }),
    fetch(`${base}body/blender/fly.mesh`),
  ]);
  if (!response.ok) throw new Error('Blender mesh unavailable');
  let loaded = 0; const size = +response.headers.get('content-length');
  const stream = response.body.pipeThrough(new TransformStream({ transform(chunk, controller) {
    loaded += chunk.byteLength; progress(size ? `loading Blender body ${Math.min(100, loaded / size * 100).toFixed(0)}%` : `loading Blender body ${(loaded / 1e6).toFixed(1)} MB`); controller.enqueue(chunk);
  } })).pipeThrough(new DecompressionStream('gzip'));
  const binary = await new Response(stream).arrayBuffer();
  progress('decoding Blender detail');
  const worker = new Worker(new URL('./fly-decode.worker.js', import.meta.url), { type: 'module' });
  try {
    const prepared = await new Promise((resolve, reject) => {
      worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data.prepared);
      worker.onerror = event => reject(new Error(event.message || 'Blender mesh decoder failed'));
      worker.onmessageerror = () => reject(new Error('Blender mesh transfer failed'));
      worker.postMessage({ meta, binary }, [binary]);
    });
    return { meta, ...prepared };
  } finally { worker.terminate(); }
}

function makeGeometries(parts) {
  const geometries = {};
  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    for (const [name, array] of Object.entries(part.attributes))
      geometry.setAttribute(name, new THREE.BufferAttribute(array, name === 'uv' ? 2 : 3, name === 'normal'));
    geometry.setIndex(new THREE.BufferAttribute(part.index, 1));
    const b = part.bounds;
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3().fromArray(b.min), new THREE.Vector3().fromArray(b.max));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3().fromArray(b.center), b.radius);
    geometries[part.geom] = geometry;
  }
  return geometries;
}

export async function loadArenaDetail(base) {
  const [meta, response] = await Promise.all([
    fetch(`${base}body/blender/arena.json`).then(r => { if (!r.ok) throw new Error('Arena detail metadata unavailable'); return r.json(); }),
    fetch(`${base}body/blender/arena.mesh`),
  ]);
  if (!response.ok || meta.version !== 1) throw new Error('Arena detail unavailable');
  const binary = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const types = { Float32Array, Int16Array, Uint32Array };
  const read = d => new types[d.type](binary,d.offset,d.length);
  return Object.fromEntries(Object.entries(meta.levels).map(([level, parts]) => [level, makeGeometries(parts.map(p => ({
    ...p, index:read(p.index), attributes:Object.fromEntries(Object.entries(p.attributes).map(([name,d])=>[name,read(d)])),
  })))]));
}

export function createBlenderFly(asset, detailTexture, levels = null) {
  const geometries = makeGeometries(asset.parts);
  const appearance = createFlyAppearance(asset.meta, null, null, detailTexture, { geometries, hairs: asset.hairs, levels });
  applyBlenderFly(appearance, asset);
  return appearance;
}

function applyBlenderFly(appearance, { meta, hairs }) {
  const materialParts = new Map();
  const materialVariants = new Map();
  for (const part of meta.parts) {
    const mesh = appearance.meshes.find(m => m.name === part.geom);
    if (!/membrane/.test(part.geom)) {
      if (!/^abdomen/.test(part.geom)) {
        const original = mesh.material, key = `${original.uuid}:${part.surface.name}`;
        if (!materialVariants.has(key)) {
          // Material.copy JSON-serializes userData. That would PNG-encode the shared
          // cuticle texture for each variant, only to discard it when restoring uniforms.
          const source = Object.create(original); source.userData = {};
          const material = new original.constructor().copy(source);
          material.userData = original.userData;
          material.onBeforeCompile = original.onBeforeCompile;
          material.customProgramCacheKey = original.customProgramCacheKey;
          materialVariants.set(key, material);
        }
        mesh.material = materialVariants.get(key);
      }
      materialParts.set(mesh.material, part);
      const female = appearance.femaleMats.get(mesh.material);
      if (female) materialParts.set(female, part);
    }
  }
  for (const [material, part] of materialParts) {
    const surface = part.surface;
    material.color.setRGB(...surface.color, THREE.LinearSRGBColorSpace);
    material.roughness = surface.roughness;
    material.ior = surface.ior;
    material.specularIntensity = 1;
    material.clearcoat = surface.coat;
    material.clearcoatRoughness = surface.coatRoughness;
    material.sheen = 0;
    if (material.userData.u) {
      material.userData.u.uBump.value = .8;
      material.userData.u.uDark.value.setRGB(.017, .006, .002, THREE.LinearSRGBColorSpace);
    }
    const compile = material.onBeforeCompile, cacheKey = material.customProgramCacheKey();
    material.customProgramCacheKey = () => `${cacheKey}-cycles-vertex-v1`;
    material.onBeforeCompile = shader => {
      compile.call(material, shader);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aCyclesLight; varying vec3 vCyclesLight;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCyclesLight = aCyclesLight;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCyclesLight;')
        .replace('diffuseColor.rgb *= .68 + .6 * mott;', 'diffuseColor.rgb *= .55 + .75 * clamp((mott - .18) / .64, 0., 1.);')
        .replace(/vec3 bumpNormal\([\s\S]*?return normalize\(abs\(fDet\) \* surf_norm - vGrad\); }/, `vec3 bumpNormal(vec3 surf_pos, vec3 surf_norm, float h, float faceDirection) {
          vec3 dx = dFdx(surf_pos), dy = dFdy(surf_pos);
          vec3 r1 = cross(dy, surf_norm), r2 = cross(surf_norm, dx);
          float determinant = dot(dx, r1) * faceDirection;
          vec3 gradient = sign(determinant) * (dFdx(h) * r1 + dFdy(h) * r2);
          return normalize(abs(determinant) * surf_norm - gradient);
        }`)
        .replace('vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;', 'vec3 totalDiffuse = diffuseColor.rgb * vCyclesLight;');
    };
    material.needsUpdate = true;
  }
  const hairVariants = new Map();
  for (const [index, hair] of [...appearance.hairGroups, ...appearance.sexComb].entries()) {
    const pale = /labrum|antenna|haltere/.test(hair.name), comb = /sexcomb/.test(hair.name);
    const variant = `${hair.material.uuid}:${comb ? 'comb' : pale ? 'pale' : 'amber'}`;
    if (!hairVariants.has(variant)) hairVariants.set(variant, hair.material.clone());
    hair.material = hairVariants.get(variant);
    hair.material.color.setRGB(...(comb ? [.021, .008, .002] : pale ? [.45, .29, .11] : [.135, .067, .021]), THREE.LinearSRGBColorSpace);
    hair.material.roughness = .36;
    hair.material.sheen = .15;
    const baked = hairs[index];
    if (baked) {
      if (baked.count !== hair.count || baked.name !== hair.name) throw new Error(`Hair bake mismatch: ${hair.name}`);
      hair.geometry = hair.geometry.clone();
      hair.geometry.setAttribute('aHairLight', new THREE.InstancedBufferAttribute(baked.light, 3));
      if (!hair.material.userData.cyclesHair) {
        hair.material.userData.cyclesHair = true;
        hair.material.customProgramCacheKey = () => 'cycles-hair-v1';
        hair.material.onBeforeCompile = shader => {
          shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aHairLight; varying vec3 vHairLight;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairLight = aHairLight;');
          shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHairLight;')
            .replace('vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;', 'vec3 totalDiffuse = diffuseColor.rgb * vHairLight;');
        };
        hair.material.needsUpdate = true;
      }
    }
  }
  appearance.blender = meta;
}

export function blenderLights(scene, meta, offset) {
  RectAreaLightUniformsLib.init();
  const lights = meta.lights.map(source => {
    // Equal-area square for the Cycles disk diffuser. Both engines use radiance here.
    const width = source.size * Math.sqrt(Math.PI) / 2;
    const light = new THREE.RectAreaLight(new THREE.Color().setRGB(...source.color, THREE.LinearSRGBColorSpace), source.power / (Math.PI * width * width), width, width);
    const matrix = new THREE.Matrix4().fromArray(source.matrix);
    matrix.decompose(light.position, light.quaternion, light.scale);
    light.position.add(offset); light.name = source.name; scene.add(light); return light;
  });
  return lights;
}

// The same AgX / Medium High Contrast transform used by the .blend, sampled by Blender.
// Input is scene-linear HDR; the table stores display sRGB. No second tone/gamma transform.
export async function blenderOutput(base) {
  const lookup = await new THREE.TextureLoader().loadAsync(`${base}body/blender/agx-look.png`);
  lookup.colorSpace = THREE.NoColorSpace; lookup.minFilter = lookup.magFilter = THREE.LinearFilter; lookup.generateMipmaps = false;
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null }, lookup: { value: lookup } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `#include <packing>
      uniform sampler2D tDiffuse, lookup, tBlur, tDepth; varying vec2 vUv;
      uniform bool focusEnabled;
      uniform float focus, aperture, maxblur, nearClip, farClip, width;
      vec3 displayColor(vec3 linearColor) {
        vec3 p = clamp((log2(max(linearColor, vec3(exp2(-12.)))) + 12.) / 20., 0., 1.) * 47.;
        float b = floor(p.b);
        vec2 uv = vec2((b * 48. + p.r + .5) / (48. * 48.), (p.g + .5) / 48.);
        return mix(texture2D(lookup, uv).rgb, texture2D(lookup, uv + vec2(min(1., 47.-b)/48., 0.)).rgb, fract(p.b));
      }
      void main(){
        vec3 color = texture2D(tDiffuse, vUv).rgb;
        if (focusEnabled) {
          float z = perspectiveDepthToViewZ(texture2D(tDepth, vUv).x, nearClip, farClip);
          float radius = min(abs(focus + z) * aperture, maxblur) * .4 * width;
          color = mix(color, texture2D(tBlur, vUv).rgb, smoothstep(.5, 1.5, radius));
        }
        gl_FragColor=vec4(displayColor(color),1.);
      }`,
  });
}
