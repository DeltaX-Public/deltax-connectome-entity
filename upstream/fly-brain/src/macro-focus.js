import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// Reuse the main MSAA render's resolved depth. Only the blurred image is half resolution;
// the final display pass composites it with the untouched full-resolution colour.
export class MacroFocusPass extends Pass {
  constructor(camera, { focus, aperture, maxblur }) {
    super();
    this.camera = camera;
    this.needsSwap = false;
    this.blurTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.uniforms = {
      tColor: { value: null }, tDepth: { value: null }, focus: { value: focus },
      aperture: { value: aperture }, maxblur: { value: maxblur }, aspect: { value: 1 },
      nearClip: { value: camera.near }, farClip: { value: camera.far }, width: { value: 1 },
    };
    const taps = Array.from({ length: 12 }, (_, i) => {
      const angle = i * 2.39996323, r = Math.sqrt((i + .5) / 12) * .4;
      return `col += texture2D(tColor, vUv + vec2(${(Math.cos(angle)*r).toFixed(7)}, ${(Math.sin(angle)*r).toFixed(7)}) * blur).rgb;`;
    }).join('\n');
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `#include <packing>
        varying vec2 vUv;
        uniform sampler2D tColor, tDepth;
        uniform float focus, aperture, maxblur, aspect, nearClip, farClip;
        void main() {
          float z = perspectiveDepthToViewZ(texture2D(tDepth, vUv).x, nearClip, farClip);
          vec2 blur = vec2(1., aspect) * clamp((focus + z) * aperture, -maxblur, maxblur);
          vec3 col = texture2D(tColor, vUv).rgb;
          ${taps}
          gl_FragColor = vec4(col / 13., 1.);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  setSize(width, height) {
    this.blurTarget.setSize(Math.ceil(width / 2), Math.ceil(height / 2));
    this.uniforms.aspect.value = width / height;
    this.uniforms.width.value = width;
  }

  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tColor.value = readBuffer.texture;
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    this.uniforms.nearClip.value = this.camera.near;
    this.uniforms.farClip.value = this.camera.far;
    renderer.setRenderTarget(this.blurTarget);
    this.quad.render(renderer);
  }

  // Shared uniform objects keep focus and resize changes in sync with the output pass.
  connect(output) {
    Object.assign(output.uniforms, {
      tBlur: { value: this.blurTarget.texture }, focusEnabled: { value: false },
      ...Object.fromEntries(['tDepth', 'focus', 'aperture', 'maxblur', 'nearClip', 'farClip', 'width'].map(k => [k, this.uniforms[k]])),
    });
    const render = output.render;
    output.render = (...args) => {
      output.uniforms.focusEnabled.value = this.enabled;
      return render.apply(output, args);
    };
    // The final pass renders to the screen, so no ping-pong swap is needed.
    output.needsSwap = false;
  }

  dispose() { this.blurTarget.dispose(); this.material.dispose(); this.quad.dispose(); }
}
