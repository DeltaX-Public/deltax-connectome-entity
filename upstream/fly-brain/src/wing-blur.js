import * as THREE from 'three';

// A moving membrane spans sixteen faint stroke samples. Evaluate its smooth lighting at
// the vertices, avoiding four area-light BRDFs for every overlapping translucent pixel.
// Resting wings retain their full physical, iridescent material.
export function createWingBlurMaterial() {
  const material = new THREE.ShaderMaterial({
    transparent:true, opacity:.026, depthWrite:false, side:THREE.DoubleSide,
    uniforms:{
      albedo:{value:new THREE.Color('#aab2ba')}, opacity:{value:.026},
      sourcePosition:{value:Array.from({length:4},()=>new THREE.Vector3())},
      sourceNormal:{value:Array.from({length:4},()=>new THREE.Vector3())},
      sourceRadiance:{value:Array.from({length:4},()=>new THREE.Color())},
      sourceRadius2:{value:new Float32Array(4)},
    },
    vertexShader:`
      uniform vec3 albedo, sourcePosition[4], sourceNormal[4], sourceRadiance[4];
      uniform float sourceRadius2[4];
      varying vec3 vLight;
      void main() {
        mat4 world = modelMatrix * instanceMatrix;
        vec4 p = world * vec4(position, 1.);
        vec3 view = normalize(cameraPosition-p.xyz);
        vec3 n = normalize(mat3(world)*normal);
        n *= dot(n,view) < 0. ? -1. : 1.;
        vLight = albedo * .06;
        for(int i=0;i<4;i++) {
          vec3 delta = sourcePosition[i]-p.xyz;
          float d2 = dot(delta,delta);
          vec3 l = delta * inversesqrt(max(d2,1e-8));
          float emitter = max(dot(sourceNormal[i],-l),0.);
          float solidAngle = 3.14159265 * sourceRadius2[i] / (d2+sourceRadius2[i]);
          vec3 irradiance = sourceRadiance[i] * emitter * solidAngle;
          float ndl = max(dot(n,l),0.);
          float spec = .035 * pow(max(dot(n,normalize(view+l)),0.),32.);
          vLight += irradiance * (albedo * (ndl/3.14159265) + vec3(spec*ndl));
        }
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader:'uniform float opacity; varying vec3 vLight; void main(){gl_FragColor=vec4(vLight,opacity);}',
  });
  material.forceSinglePass=true;
  return material;
}

export function lightWingBlur(material, lights) {
  const u=material.uniforms;
  lights.forEach((light,i)=>{
    u.sourcePosition.value[i].copy(light.position);
    u.sourceNormal.value[i].set(0,0,-1).applyQuaternion(light.quaternion);
    u.sourceRadiance.value[i].copy(light.color).multiplyScalar(light.intensity);
    u.sourceRadius2.value[i]=light.width*light.height/Math.PI;
  });
}
