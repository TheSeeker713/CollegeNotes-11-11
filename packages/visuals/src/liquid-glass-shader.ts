import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Apple Liquid Glass–style optics: refraction, chromatic fringe, Fresnel rim, pointer specular. */
const fragmentShader = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;
uniform float uLightMode;
uniform float uReduceMotion;
uniform vec4 uPanelA; // xy = center NDC-ish 0-1, zw = half size
uniform vec4 uPanelB;
uniform vec4 uPanelC;
uniform float uRadius;

varying vec2 vUv;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float glassMask(vec2 uv) {
  float a = sdRoundBox(uv - uPanelA.xy, uPanelA.zw, uRadius);
  float b = sdRoundBox(uv - uPanelB.xy, uPanelB.zw, uRadius * 0.85);
  float c = sdRoundBox(uv - uPanelC.xy, uPanelC.zw, uRadius * 0.7);
  float d = min(a, min(b, c));
  return 1.0 - smoothstep(0.0, 0.004, d);
}

float edgeMask(vec2 uv) {
  float a = abs(sdRoundBox(uv - uPanelA.xy, uPanelA.zw, uRadius));
  float b = abs(sdRoundBox(uv - uPanelB.xy, uPanelB.zw, uRadius * 0.85));
  float c = abs(sdRoundBox(uv - uPanelC.xy, uPanelC.zw, uRadius * 0.7));
  float d = min(a, min(b, c));
  return smoothstep(0.012, 0.0, d);
}

void main() {
  vec2 uv = vUv;
  float mask = glassMask(uv);
  float edge = edgeMask(uv);

  // Organic liquid micro-warp (subtle; disabled when reduce-motion)
  float motion = 1.0 - uReduceMotion;
  float n1 = sin(uv.x * 18.0 + uTime * 0.55) * cos(uv.y * 14.0 - uTime * 0.4);
  float n2 = sin(uv.y * 22.0 - uTime * 0.35) * cos(uv.x * 16.0 + uTime * 0.48);
  vec2 organic = vec2(n1, n2) * 0.0045 * mask * motion;

  // Convex lens refraction toward panel centers
  vec2 center = mix(uPanelA.xy, mix(uPanelB.xy, uPanelC.xy, 0.5), 0.35);
  vec2 fromC = uv - center;
  float lens = mask * (0.018 + edge * 0.028);
  vec2 refractOffset = -fromC * lens + organic;

  // Chromatic aberration at glass edges
  float aberr = (0.0025 + edge * 0.006) * mask;
  vec2 dir = length(fromC) > 0.0001 ? normalize(fromC) : vec2(0.0);
  vec2 uvR = clamp(uv + refractOffset * 1.08 + dir * aberr, 0.0, 1.0);
  vec2 uvG = clamp(uv + refractOffset, 0.0, 1.0);
  vec2 uvB = clamp(uv + refractOffset * 0.92 - dir * aberr, 0.0, 1.0);

  vec3 scene = vec3(
    texture2D(tScene, uvR).r,
    texture2D(tScene, uvG).g,
    texture2D(tScene, uvB).b
  );
  vec3 clear = texture2D(tScene, uv).rgb;
  vec3 color = mix(clear, scene, mask);

  // Pointer specular dome (macOS liquid glass reacts to movement)
  vec2 mouse = uMouse;
  float dist = distance(uv, mouse);
  float dome = smoothstep(0.42, 0.04, dist) * mask;
  vec2 mdir = normalize(uv - mouse + 1e-5);
  vec2 lightDir = normalize(vec2(0.62, -0.42));
  float spec = pow(max(dot(mdir, lightDir), 0.0), 26.0) * dome * 0.55;
  float spec2 = pow(max(dot(mdir, normalize(vec2(-0.3, -0.8))), 0.0), 40.0) * dome * 0.18;

  // Fresnel-ish rim + thin bright ring
  float fresnel = edge * (uLightMode > 0.5 ? 0.42 : 0.28);
  float ring = edge * (uLightMode > 0.5 ? 0.55 : 0.35);

  // Clear cool tint (Apple-inspired) vs botanical dark green cast
  vec3 tint = mix(vec3(0.88, 0.96, 0.92), vec3(0.94, 0.97, 1.05), uLightMode);
  color = mix(color, color * tint, mask * 0.22);

  // Light mode: keep glass clear, not milky — boost transmitted color saturation
  if (uLightMode > 0.5) {
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, 1.0 + mask * 0.35);
    color += mask * 0.04; // slight lift so clear glass reads on pale backdrops
  } else {
    color = mix(color, color * 0.92, mask * 0.15);
  }

  color += (spec + spec2 + fresnel * 0.65 + ring * 0.35) * motion
         + fresnel * 0.25 * (1.0 - motion);

  // Soft blur mix at glass body (approximation of thick frost without milking light mode)
  vec3 blurSample = (
    texture2D(tScene, clamp(uv + refractOffset + vec2(0.002, 0.0), 0.0, 1.0)).rgb +
    texture2D(tScene, clamp(uv + refractOffset - vec2(0.002, 0.0), 0.0, 1.0)).rgb +
    texture2D(tScene, clamp(uv + refractOffset + vec2(0.0, 0.002), 0.0, 1.0)).rgb +
    texture2D(tScene, clamp(uv + refractOffset - vec2(0.0, 0.002), 0.0, 1.0)).rgb
  ) * 0.25;
  color = mix(color, mix(color, blurSample, uLightMode > 0.5 ? 0.25 : 0.45), mask);

  gl_FragColor = vec4(color, 1.0);
}
`;

export function createLiquidGlassMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.72, 0.28) },
      uTime: { value: 0 },
      uLightMode: { value: 1 },
      uReduceMotion: { value: 0 },
      // Layout in UV space (origin bottom-left): sidebar, topbar, main card
      uPanelA: { value: new THREE.Vector4(0.14, 0.48, 0.11, 0.38) },
      uPanelB: { value: new THREE.Vector4(0.62, 0.88, 0.28, 0.045) },
      uPanelC: { value: new THREE.Vector4(0.62, 0.48, 0.3, 0.32) },
      uRadius: { value: 0.035 }
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false
  });
}
