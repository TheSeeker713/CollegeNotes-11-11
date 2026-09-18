import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Atmosphere compositor: scroll/trackpad warp + cursor spotlight.
 * No panel-center lens pinch (that read as a misaligned “cursor light”).
 * HTML cards carry frosted solidarity; this pass drives the living backdrop.
 */
const fragmentShader = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uMouse;
uniform float uTime;
uniform float uScroll;
uniform float uLightMode;
uniform float uBrutalist;
uniform float uReduceMotion;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float motion = 1.0 - uReduceMotion;

  // Trackpad / wheel morph — whole field warps with scroll energy
  float scroll = uScroll * motion;
  vec2 warp = vec2(
    sin((uv.y + scroll * 0.15) * 6.2831 + uTime * 0.2) * 0.012,
    cos((uv.x - scroll * 0.12) * 5.0265 - uTime * 0.15) * 0.01
  ) * abs(scroll) * 0.08;
  warp += vec2(scroll * 0.004, -scroll * 0.006) * motion;
  // Soft organic drift independent of scroll
  warp += vec2(
    sin(uv.y * 10.0 + uTime * 0.25),
    cos(uv.x * 9.0 - uTime * 0.2)
  ) * 0.0025 * motion;

  vec2 sampleUv = clamp(uv + warp, 0.0, 1.0);
  vec3 color = texture2D(tScene, sampleUv).rgb;

  // Mild chromatic fringe only on scroll energy (not a static lens)
  float fringe = clamp(abs(scroll) * 0.015, 0.0, 0.006) * motion;
  if (fringe > 0.0001) {
    color.r = texture2D(tScene, clamp(sampleUv + vec2(fringe, 0.0), 0.0, 1.0)).r;
    color.b = texture2D(tScene, clamp(sampleUv - vec2(fringe, 0.0), 0.0, 1.0)).b;
  }

  // Cursor spotlight — soft glow centered on pointer (UV: origin bottom-left)
  vec2 mouse = uMouse;
  float dist = distance(uv, mouse);
  float glow = smoothstep(0.55, 0.0, dist);
  float glowTight = smoothstep(0.22, 0.0, dist);
  vec3 glowColor = uBrutalist > 0.5
    ? (uLightMode > 0.5 ? vec3(1.0, 1.0, 0.98) : vec3(0.75, 0.82, 1.0))
    : (uLightMode > 0.5 ? vec3(1.0, 0.98, 0.88) : vec3(0.55, 0.85, 0.62));
  color += glowColor * (glow * 0.14 + glowTight * 0.1) * motion;

  // Top-down key light for brutalist concrete reads
  if (uBrutalist > 0.5) {
    float top = smoothstep(1.0, 0.35, uv.y);
    color *= mix(0.72, 1.08, top);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

export function createLiquidGlassMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uLightMode: { value: 1 },
      uBrutalist: { value: 0 },
      uReduceMotion: { value: 0 }
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false
  });
}
