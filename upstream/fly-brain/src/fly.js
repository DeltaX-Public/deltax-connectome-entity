// Anatomy viewer: the flybody Drosophila scan at full resolution, rendered as a macro photograph.
// Geometry (cuticle, compound eye facets, macro/microchaetae of head and notum, wing veins) is the scan;
// what the scan leaves out is added procedurally from the literature: leg and abdominal setae, the
// posterior tergite bristle rows, interommatidial bristles, wing-margin bristles, the male sex comb,
// sex-specific tergite pigmentation, wing thin-film interference and the eye's deep pseudopupil.
import * as THREE from 'three';
import { loadCuticleDetail } from './fly-appearance.js';
import { loadBlenderFly, createBlenderFly, blenderLights, blenderOutput } from './fly-blender.js';
import { RenderResolution } from './render-resolution.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { MacroFocusPass } from './macro-focus.js';
import { createWingBlurMaterial, lightWingBlur } from './wing-blur.js';
const BASE = import.meta.env.BASE_URL;
const $ = s => document.querySelector(s);
const status = s => { $('#status').textContent = s; };

// ---------------- anatomy notes (hover) ----------------
const ANATOMY = [
  [/head_red/, 'Compound eye', 'About 750 ommatidia, each a corneal lens over eight photoreceptors (R1–R8). The brick red is screening pigment (drosopterins + ommochromes). The dark spot that follows you is the deep pseudopupil: the ommatidia looking straight at you.'],
  [/head_ocelli/, 'Ocelli', 'Three simple eyes on the vertex triangle; wide-field light sensors that help stabilise flight attitude.'],
  [/^head/, 'Head capsule', 'Frons, vertex and gena. The long bristles (orbitals, verticals, postverticals, ocellars) are stereotyped macrochaetae, each a single mechanosensory neuron.'],
  [/antenna/, 'Antenna', 'Scape, pedicel and funiculus (third segment, covered in olfactory sensilla), ending in the branched arista. The pedicel houses Johnston’s organ, which hears courtship song and senses wind and gravity.'],
  [/rostrum|haustellum/, 'Proboscis', 'Rostrum and haustellum: the extensible mouthparts, folded under the head at rest.'],
  [/labrum/, 'Labellum', 'Paired sponge-like lobes with pseudotracheae for sucking fluids, lined with gustatory bristles (taste neurons for sugar, bitter, water, salt).'],
  [/wing_.*membrane/, 'Wing membrane', 'Two cuticle sheets a few hundred nm thick. Thin-film interference paints the stable wing interference pattern seen against dark backgrounds; each cell carries one microtrichium.'],
  [/wing_/, 'Wing veins', 'Costa, longitudinal veins L1–L5 and the anterior and posterior cross-veins. The costa bears the triple row of margin bristles; the posterior margin a fringe of fine hairs.'],
  [/haltere/, 'Haltere', 'Reduced hindwing: a club that beats in antiphase with the wings and senses body rotation through Coriolis forces, like a gyroscope.'],
  [/thorax_black/, 'Notal bristles', 'Rows of microchaetae and the paired macrochaetae (dorsocentrals, scutellars, supra-alars…), the classic bristle map of Drosophila genetics.'],
  [/thorax/, 'Thorax', 'Pro-, meso- and metathorax fused into a box packed with indirect flight muscles; the dorsal notum ends in the scutellum.'],
  [/abdomen_8/, 'Terminalia', 'Genital and anal plates at the tip of the abdomen.'],
  [/abdomen.*lower/, 'Sternites', 'Pale, soft ventral plates of the abdomen, joined to the tergites by flexible pleural membrane.'],
  [/abdomen/, 'Abdominal tergite', 'Each dorsal plate has a pigmented posterior band and a row of bristles on its hind margin. In males the last two tergites (A5, A6) are fully dark, a trait controlled by Abd-B and bab.'],
  [/claw/, 'Tarsal claws and pulvilli', 'Paired claws grip rough surfaces; the pad-like pulvilli beneath secrete fluid to stick to smooth ones.'],
  [/tarsus_T1/, 'Basitarsus (foreleg)', 'First of five tarsomeres. In males it carries the sex comb, a row of about ten thick dark bristles used to grasp the female. Tarsi are dense with taste bristles.'],
  [/tarsus/, 'Tarsus', 'Five tarsomeres covered in setae, including gustatory sensilla: flies taste with their feet.'],
  [/tibia/, 'Tibia', 'Long segment with rows of setae and, on the mid leg, an apical spur.'],
  [/femur/, 'Femur', 'Largest leg segment; houses the muscles that move the tibia and the femoral chordotonal organ that senses joint angle.'],
  [/coxa/, 'Coxa', 'Base of the leg, articulating with the thorax.'],
];
const describe = name => ANATOMY.find(([re]) => re.test(name));

// ---------------- renderer, scene ----------------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const resolution = new RenderResolution(() => resize(), { targetFps: 120 });
renderer.setPixelRatio(resolution.ratio);
renderer.info.autoReset = false;
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = Math.pow(2, -.2);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 60);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.minDistance = 0.08; controls.maxDistance = 4; controls.zoomSpeed = 0.8;
const pmrem = new THREE.PMREMGenerator(renderer);
const world = new THREE.Scene(); world.background = new THREE.Color().setRGB(.55, .68, .58);
scene.environment = pmrem.fromScene(world).texture;
pmrem.dispose();
scene.environmentIntensity = 0.12;

// backdrop: vertical gradient on a far sphere, and a floor that only receives shadow
const backdropMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
  uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'uniform vec3 top, bottom; varying vec3 vP; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-.35, .7, vP.z)) * 1.5, 1.); }' });
const backdrop = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), backdropMat); scene.add(backdrop);
const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.ShadowMaterial({ opacity: 0.28 }));
floor.material.depthWrite = false;
floor.material.polygonOffset = true; floor.material.polygonOffsetFactor = -1; floor.material.polygonOffsetUnits = -4;
floor.material.onBeforeCompile = shader => {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vContact;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvContact=(modelMatrix*vec4(position,1.)).xyz;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vContact;')
    .replace('#include <tonemapping_fragment>', 'gl_FragColor.a *= 1.-smoothstep(.25,.5,length(vContact.xy));\n#include <tonemapping_fragment>');
};
floor.receiveShadow = true; floor.position.z = .00003; scene.add(floor);
const stageMaterial = new THREE.MeshStandardMaterial({ roughness: .83 });
stageMaterial.onBeforeCompile = shader => {
  shader.uniforms.stageTop = backdropMat.uniforms.top; shader.uniforms.stageBottom = backdropMat.uniforms.bottom;
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vStage;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStage = (modelMatrix * vec4(position, 1.)).xyz;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vStage; uniform vec3 stageTop, stageBottom;')
    .replace('#include <color_fragment>', `#include <color_fragment>
      float gradient = clamp(((vStage.x + vStage.y + .6) / 1.2 - .18) / .64, 0., 1.);
      vec3 stageColor = mix(vec3(.36,.29,.12), vec3(.14,.31,.21), gradient);
      diffuseColor.rgb *= stageColor;`)
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += stageColor * .22;')
    .replace('#include <opaque_fragment>', `
      // A diffuse studio sweep stays smooth at grazing angles. The specimen carries
      // the Cycles transport; the floor receives its separately filtered live shadow.
      outgoingLight = stageColor * (.34 + 1.1 * exp(-4. * dot(vStage.xy,vStage.xy)));
      vec3 background = mix(stageBottom, stageTop, smoothstep(-.35,.7,normalize(vStage-cameraPosition).z))*1.5;
      outgoingLight = mix(outgoingLight, background, smoothstep(1.,3.,length(vStage.xy)));
      #include <opaque_fragment>`);
};
const stage = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), stageMaterial); scene.add(stage);

const key = new THREE.DirectionalLight('#fff1dc', 2.7); key.position.set(0.6, 0.9, 1.6); key.castShadow = true;
Object.assign(key.shadow.camera, { left: -0.3, right: 0.3, top: 0.3, bottom: -0.3, near: 0.5, far: 4 });
key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.00002; key.shadow.normalBias = 0.0004; key.shadow.radius = 10;
const rim = new THREE.DirectionalLight('#fff0d5', 0.65); rim.position.set(-1.4, -0.6, 0.7);   // backlight: makes setae glow
const fill = new THREE.HemisphereLight('#fff8ee', '#5f4830', 0.18);
scene.add(key, key.target, rim, fill);

// ---------------- load ----------------
const detailPromise = loadCuticleDetail(`${BASE}body/cuticle_detail.png`);
const blenderPromise = loadBlenderFly(BASE, status);
const outputPromise = blenderOutput(BASE);
const blenderAsset = await blenderPromise;
performance.mark('fly:decoded');
status('applying Cycles lighting');
const appearance = createBlenderFly(blenderAsset, await detailPromise);
performance.mark('fly:assembled');
const { root, bodies, localPose, meshes, tergites, hairGroups, sexComb } = appearance;
scene.add(root);
const _X = new THREE.Vector3(), _Y = new THREE.Vector3(), _Z = new THREE.Vector3();

// flying: the wing sweeps its whole stroke every 4.6 ms, so it is drawn as faint copies across the stroke
const ghostMat = createWingBlurMaterial();
const wingGhosts = ['left', 'right'].map(sd => {
  const film = meshes.find(m => m.name === `wing_${sd}_membrane`);
  const mesh = new THREE.InstancedMesh(film.geometry, ghostMat, 16);
  mesh.visible = false; mesh.renderOrder = 2; bodies.thorax.add(mesh); return mesh;
});
let lastFlightPose = -1;
const ghostMatrix = new THREE.Matrix4(), ghostScale = new THREE.Vector3(1, 1, 1), ghostQ = new THREE.Quaternion();
// wing mesh axes: span along −y (left) / +y (right, the mirror image), chord along ±x
const wingFrames = ['wing_left', 'wing_right'].map((w, wi) => { const sgn = wi ? -1 : 1;
  const span = new THREE.Vector3(0, -sgn, 0), chord = new THREE.Vector3(sgn, 0, 0);
  const chordBack = chord.clone().applyQuaternion(localPose.spread[w].q).x < 0;   // does +chord run to the trailing edge?
  return { sgn, chordBack, inv: new THREE.Matrix4().makeBasis(span, chord, span.clone().cross(chord)).transpose() }; });
const _S = new THREE.Vector3(), _C = new THREE.Vector3(), _M = new THREE.Matrix4(), _tilt = new THREE.Quaternion();

// ---------------- stage ----------------
root.updateMatrixWorld(true);
const box = new THREE.Box3(); for (const m of meshes) box.expandByObject(m);
let footZ = Infinity; for (const n of Object.keys(bodies).filter(n => /claw/.test(n))) footZ = Math.min(footZ, new THREE.Box3().setFromObject(bodies[n]).min.z);
const center = box.getCenter(new THREE.Vector3());
root.position.set(-center.x, -center.y, -footZ);
const target = new THREE.Vector3(0, 0, center.z - footZ);
controls.target.copy(target);
camera.position.set(0.55, -0.62, 0.36).add(target);
key.target.position.copy(target);
const areaLights = blenderLights(scene, blenderAsset.meta, root.position);
lightWingBlur(ghostMat, areaLights);
// Cycles supplies diffuse transport. The area sources supply moving lens highlights;
// a subdued shadow light anchors the live hairs and the fly's contact with the floor.
key.position.copy(areaLights[0].position.clone().sub(target).normalize().multiplyScalar(1.8).add(target));
let framing = 'body';
controls.addEventListener('start', () => { framing = null; });
function fullBody() {
  framing = 'body';
  const source = blenderAsset.meta.camera;
  controls.target.fromArray(source.target).add(root.position);
  camera.position.fromArray(source.position).add(root.position);
  const aspect = innerWidth / innerHeight;
  if (aspect < .8) camera.position.sub(controls.target).multiplyScalar(.78).add(controls.target);
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(source.horizontalFov / 2)) / Math.min(aspect, 1.5)));
  camera.updateProjectionMatrix(); controls.update();
}
function headDetail() {
  framing = 'head';
  bodies.head.getWorldPosition(controls.target);
  controls.target.x += .012; controls.target.z -= .002;
  camera.fov = 22; camera.position.copy(controls.target).add(new THREE.Vector3(.4, -.008, -.07));
  camera.updateProjectionMatrix(); controls.update();
}
$('#fullBody').onclick = fullBody; $('#headDetail').onclick = headDetail;
if (matchMedia('(max-width:700px)').matches) $('#controls').open = false;
fullBody();

// ---------------- post ----------------
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4,
  depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType) });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new MacroFocusPass(camera, { focus: 0.8, aperture: 0.006, maxblur: 0.006 });
composer.addPass(bokeh);
const output = await outputPromise;
bokeh.connect(output); composer.addPass(output);
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setPixelRatio(resolution.ratio); renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (framing === 'body') fullBody();
}
addEventListener('resize', () => { resolution.reset(); resize(); }); resize();

// ---------------- UI state ----------------
const state = { sex: 'm', wings: 'rest', wingBlend: 0, flight: 0, labels: false };
const setSeg = (attr, v) => document.querySelectorAll(`[data-${attr}]`).forEach(b => b.classList.toggle('on', b.dataset[attr] === v));
function applySex(sex) {
  state.sex = sex; setSeg('sex', sex); $('#sexLabel').textContent = sex === 'm' ? 'male' : 'female';
  for (const im of sexComb) im.visible = sex === 'm';
  appearance.pigment(sex);
  const s = sex === 'f' ? 1.1 : 1; root.scale.setScalar(s);
  for (const n of ['abdomen', 'abdomen_2', 'abdomen_3', 'abdomen_4', 'abdomen_5', 'abdomen_6']) bodies[n].scale.set(sex === 'f' ? 1.1 : 1, 1, sex === 'f' ? 1.08 : 1);
  root.position.z = -footZ * s;
}
function applyBg(bg) {
  setSeg('bg', bg); document.body.classList.toggle('dark', bg === 'dark');
  if (bg === 'dark') { backdropMat.uniforms.top.value.set('#171d16'); backdropMat.uniforms.bottom.value.set('#030504'); floor.material.opacity = 0.5; }
  else { backdropMat.uniforms.top.value.set('#89ab8d'); backdropMat.uniforms.bottom.value.set('#b7a56b'); floor.material.opacity = 0.25; }
  scene.environmentIntensity = .12; rim.intensity = 0; key.intensity = .12; fill.intensity = 0;
  stage.visible = bg !== 'dark';
}
document.querySelectorAll('[data-sex]').forEach(b => b.onclick = () => applySex(b.dataset.sex));
document.querySelectorAll('[data-wings]').forEach(b => b.onclick = () => { state.wings = b.dataset.wings; setSeg('wings', state.wings); });
document.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => applyBg(b.dataset.bg));
$('#hairs').onchange = e => { for (const h of hairGroups) h.visible = e.target.checked; };
$('#dof').onchange = e => { bokeh.enabled = e.target.checked; };
$('#labels').onchange = e => { state.labels = e.target.checked; if (!state.labels) $('#tip').hidden = true; };
const qs = new URLSearchParams(location.search);
applySex(qs.get('sex') === 'f' ? 'f' : 'm'); applyBg(qs.get('bg') === 'dark' ? 'dark' : 'light');
if (qs.get('wings')) { state.wings = qs.get('wings'); setSeg('wings', state.wings); state.wingBlend = state.wings === 'rest' ? 0 : 1; state.flight = state.wings === 'flight' ? 1 : 0; }

// hover anatomy + double-click focus
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(ev) { ndc.set(ev.clientX / innerWidth * 2 - 1, -ev.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(meshes, false).find(h => h.object.visible && h.object.parent.visible); }
let hoverQueued = null;
canvas.addEventListener('pointermove', ev => { if (!state.labels) return; hoverQueued = ev; });
canvas.addEventListener('dblclick', ev => { const h = pick(ev); if (h) focusTo.copy(h.point), focusing = 1; });
const focusTo = new THREE.Vector3(); let focusing = 0;
function updateHover() {
  if (!hoverQueued) return; const ev = hoverQueued; hoverQueued = null; const h = pick(ev), tip = $('#tip');
  const d = h && describe(h.object.name); if (!d) { tip.hidden = true; return; }
  tip.hidden = false; tip.querySelector('b').textContent = d[1]; tip.querySelector('span').textContent = d[2];
  tip.style.left = `${Math.min(ev.clientX + 16, innerWidth - 300)}px`; tip.style.top = `${Math.min(ev.clientY + 16, innerHeight - 140)}px`;
}

// ---------------- animation ----------------
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3();
const WINGS = ['wing_left', 'wing_right'];
const clock = new THREE.Timer(); let lastShadowCheck = -Infinity;
const bodyNames = Object.keys(bodies);
const metrics = { calls: 0, triangles: 0, renderMs: 0, shadowUpdates: 0 };
// The studio light is fixed. Reuse its map until a caster moves by half a shadow texel;
// that is far smaller than the existing 10-texel soft-shadow filter. Keep the 30 Hz upper limit.
const shadowTolerance = (key.shadow.camera.right-key.shadow.camera.left) / key.shadow.mapSize.x * .5;
const shadowCasters = [...meshes, ...hairGroups, ...sexComb].filter(m=>m.castShadow).map(mesh=>({
  mesh, matrix:new THREE.Matrix4(), visible:null, bounds:mesh.boundingSphere || mesh.geometry.boundingSphere,
}));
function refreshShadow(t) {
  if(t-lastShadowCheck<1/30) return;
  lastShadowCheck=t; root.updateMatrixWorld(true);
  let changed=false;
  for(const entry of shadowCasters) {
    const {mesh,matrix,bounds}=entry;let visible=true;
    for(let p=mesh;p;p=p.parent) if(!p.visible){visible=false;break;}
    entry.nextVisible=visible;
    if(visible!==entry.visible) changed=true;
    if(!visible || changed) continue;
    const a=mesh.matrixWorld.elements,b=matrix.elements,c=bounds.center;
    let displacement=0,linear=0;
    for(let k=0;k<3;k++) {
      const x=a[k]-b[k],y=a[k+4]-b[k+4],z=a[k+8]-b[k+8];
      displacement+=(x*c.x+y*c.y+z*c.z+a[k+12]-b[k+12])**2;
      linear+=x*x+y*y+z*z;
    }
    // A conservative bound on movement of every point inside the caster's sphere.
    if(Math.sqrt(displacement)+bounds.radius*Math.sqrt(linear)>shadowTolerance) changed=true;
  }
  if(!changed) return;
  for(const e of shadowCasters){e.matrix.copy(e.mesh.matrixWorld);e.visible=e.nextVisible;}
  renderer.shadowMap.needsUpdate=true;metrics.shadowUpdates++;
}
function tick() {
  requestAnimationFrame(tick);
  clock.update();
  if (document.hidden) return; const dt = Math.min(clock.getDelta(), 0.05), t = clock.getElapsed();
  state.wingBlend += ((state.wings === 'rest' ? 0 : 1) - state.wingBlend) * (1 - Math.exp(-dt * 5));
  state.flight += ((state.wings === 'flight' ? 1 : 0) - state.flight) * (1 - Math.exp(-dt * 4));
  const wb = state.wingBlend * state.wingBlend * (3 - 2 * state.wingBlend);
  for (const name of bodyNames) {
    const r = localPose.rest[name], s = localPose.spread[name], g = bodies[name];
    if (WINGS.includes(name) || /abdomen|haltere/.test(name)) g.quaternion.slerpQuaternions(r.q, s.q, name.startsWith('wing') ? wb : 0); else g.quaternion.copy(r.q);
  }
  // idle life: breathing abdomen, antennae twitching in the air current, small head movements, grooming-still legs
  const breathe = Math.sin(t * 2 * Math.PI * 0.35);
  for (let i = 2; i <= 7; i++) bodies[`abdomen_${i}`].quaternion.multiply(_q.setFromAxisAngle(_X.set(1, 0, 0), 0.006 * breathe));
  for (const [sd, ph] of [['left', 0], ['right', 1.7]]) {
    const tw = Math.sin(t * 3.1 + ph) * 0.5 + Math.sin(t * 7.3 + ph * 2) * 0.25 + Math.sin(t * 0.7 + ph) * 0.6;
    bodies[`antenna_${sd}`].quaternion.multiply(_q.setFromEuler(_e.set(0.05 * tw, 0, 0.04 * Math.sin(t * 1.3 + ph))));
    // halteres beat with the wings in flight
    bodies[`haltere_${sd}`].quaternion.multiply(_q.setFromAxisAngle(_X.set(1, 0, 0), state.flight * 0.5 * Math.sin(t * 173 + ph)));
  }
  bodies.head.quaternion.multiply(_q.setFromEuler(_e.set(0.02 * Math.sin(t * 0.9), 0.015 * Math.sin(t * 0.53 + 1), 0.03 * Math.sin(t * 0.41))));
  // flight: lift off, blur the wings across the stroke (±65° about the dorsal axis, pitching over at reversal)
  const fl = state.flight, flying = fl > 0.02;
  root.position.z = -footZ * root.scale.z + fl * 0.1 + fl * 0.004 * Math.sin(t * 2.2);
  root.rotation.y = -0.5 * fl;   // hovering flies hold the body ~45° nose-up, stroke plane near horizontal
  WINGS.forEach((w, wi) => { bodies[w].visible = !flying || fl < 0.5;
    const { sgn, chordBack, inv } = wingFrames[wi];
    // one cycle sampled evenly in time: stroke angle φ (positive = back) sinusoidal over ~145°, the wing
    // feathering at each reversal; stroke plane tilted to stay horizontal while the body pitches up
    _tilt.setFromAxisAngle(_Y.set(0, 1, 0), 0.5 * fl);
    const ghost = wingGhosts[wi]; ghost.visible = flying && fl >= 0.5;
    if (!ghost.visible || Math.abs(fl - lastFlightPose) < 0.0001) return;
    for (let k = 0; k < 16; k++) {
      const phase = k / 16 * Math.PI * 2;
      const phi = 0.25 + 1.27 * Math.cos(phase), beta = 0.75 * Math.sin(phase);
      _S.set(-Math.sin(phi), sgn * Math.cos(phi), 0);
      _C.set(-Math.cos(phi), -sgn * Math.sin(phi), 0).multiplyScalar(Math.cos(beta)).addScaledVector(_Z.set(0, 0, 1), Math.sin(beta));
      if (!chordBack) _C.negate();
      _S.applyQuaternion(_tilt); _C.applyQuaternion(_tilt);
      _M.makeBasis(_S, _C, _Z.crossVectors(_S, _C)).multiply(inv); ghostQ.setFromRotationMatrix(_M);
      ghost.setMatrixAt(k, ghostMatrix.compose(localPose.spread[w].p, ghostQ, ghostScale));
    }
    ghost.instanceMatrix.needsUpdate = true; ghost.computeBoundingSphere();
  });
  if (fl >= 0.5 && Math.abs(fl - lastFlightPose) >= 0.0001) lastFlightPose = fl;
  if (focusing > 0) { controls.target.lerp(focusTo, 1-Math.pow(.88,dt*60)); focusing = controls.target.distanceTo(focusTo) > 1e-4 ? 1 : 0; }
  controls.dampingFactor=1-Math.pow(.95,dt*60);
  controls.update(dt);
  bokeh.uniforms.focus.value = camera.position.distanceTo(controls.target);
  const dist = camera.position.distanceTo(controls.target);
  bokeh.uniforms.aperture.value = 0.0045 / Math.max(dist, 0.15); bokeh.uniforms.maxblur.value = 0.008;
  updateHover();
  resolution.update(performance.now(), bokeh.enabled);
  refreshShadow(t);
  renderer.info.reset(); const start = performance.now(); composer.render();
  metrics.renderMs = performance.now() - start; metrics.calls = renderer.info.render.calls; metrics.triangles = renderer.info.render.triangles;
}
// Compile body materials in parallel before the first interactive frame, where supported.
status('preparing lighting');
await renderer.compileAsync(scene, camera);
performance.mark('fly:compiled');
window.__fly = { camera, controls, state, bodies, bokeh, key, renderer, composer, scene, appearance, metrics, resolution, areaLights, fullBody, headDetail };   // for scripted screenshots
tick();
$('#loading').classList.add('done');
