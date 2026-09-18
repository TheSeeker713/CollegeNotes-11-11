import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Atmosphere compositor: scroll warp, botanical dark spotlight,
 * and water-bottle refraction when the pointer is over botanical glass.
 */
const fragmentShader = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uMouse;
uniform vec2 uVelocity;
uniform float uTime;
uniform float uScroll;
uniform float uLightMode;
uniform float uBrutalist;
uniform float uReduceMotion;
uniform float uOverGlass;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float motion = 1.0 - uReduceMotion;

  float scroll = uScroll * motion;
  vec2 warp = vec2(
    sin((uv.y + scroll * 0.15) * 6.2831 + uTime * 0.2) * 0.012,
    cos((uv.x - scroll * 0.12) * 5.0265 - uTime * 0.15) * 0.01
  ) * abs(scroll) * 0.08;
  warp += vec2(scroll * 0.004, -scroll * 0.006) * motion;
  warp += vec2(
    sin(uv.y * 8.0 + uTime * 0.18),
    cos(uv.x * 7.0 - uTime * 0.14)
  ) * 0.0012 * motion;

  if (uBrutalist > 0.5) {
    float backdrop = (1.0 - uOverGlass) * motion;
    float speed = clamp(length(uVelocity) * 14.0, 0.0, 1.5);
    float dist = distance(uv, uMouse);
    float grind = smoothstep(0.4, 0.0, dist) * speed * backdrop;
    float n = fract(sin(dot(floor(uv * 80.0), vec2(12.9898, 78.233))) * 43758.5453);
    warp += (vec2(n, fract(n * 17.13)) - 0.5) * grind * 0.012;
  }

  // Botanical + over glass: water-bottle refraction (thick curved glass + fluid)
  float bottle = 0.0;
  if (uBrutalist < 0.5 && uOverGlass > 0.5 && motion > 0.5) {
    vec2 d = uv - uMouse;
    float r = length(d);
    bottle = smoothstep(0.48, 0.0, r);
    float lens = bottle * bottle;
    // Magnify / barrel like a filled bottle
    warp -= d * lens * 0.085;
    // Caustic ripples along the lens
    float ripple = sin(r * 42.0 - uTime * 3.2) * cos(atan(d.y, d.x) * 3.0 + uTime);
    warp += normalize(d + 0.0001) * ripple * lens * 0.012;
    // Slight vertical stretch (cylindrical bottle)
    warp.y += d.y * lens * 0.03;
  }

  vec2 sampleUv = clamp(uv + warp, 0.0, 1.0);
  vec3 color = texture2D(tScene, sampleUv).rgb;

  float fringe = clamp(abs(scroll) * 0.015, 0.0, 0.006) * motion;
  fringe = max(fringe, bottle * 0.004);
  if (fringe > 0.0001) {
    color.r = texture2D(tScene, clamp(sampleUv + vec2(fringe, 0.0), 0.0, 1.0)).r;
    color.b = texture2D(tScene, clamp(sampleUv - vec2(fringe, 0.0), 0.0, 1.0)).b;
  }

  // Specular sheen through the bottle
  if (bottle > 0.001) {
    float sheen = pow(bottle, 1.6) * (0.55 + 0.45 * sin(uTime * 2.0 + uv.x * 8.0));
    vec3 sheenColor = uLightMode > 0.5
      ? vec3(0.95, 0.98, 0.9)
      : vec3(0.55, 0.9, 0.7);
    color += sheenColor * sheen * 0.14;
    color = mix(color, color * vec3(1.05, 1.12, 1.08), bottle * 0.25);
  }

  // Cursor spotlight — stronger in botanical dark; quieter on light / over glass
  float glow = smoothstep(0.55, 0.0, distance(uv, uMouse));
  float glowTight = smoothstep(0.2, 0.0, distance(uv, uMouse));
  float glowGain = motion;
  if (uBrutalist < 0.5 && uLightMode < 0.5) {
    glowGain *= mix(2.6, 1.4, uOverGlass);
    glow = smoothstep(0.62, 0.0, distance(uv, uMouse));
    glowTight = smoothstep(0.24, 0.0, distance(uv, uMouse));
  } else if (uBrutalist < 0.5 && uLightMode > 0.5) {
    glowGain *= mix(0.25, 0.1, uOverGlass);
  } else {
    glowGain *= mix(1.0, 0.12, uOverGlass);
  }
  vec3 glowColor = uBrutalist > 0.5
    ? (uLightMode > 0.5 ? vec3(1.0, 1.0, 0.98) : vec3(0.75, 0.82, 1.0))
    : (uLightMode > 0.5 ? vec3(0.92, 0.94, 0.88) : vec3(0.5, 0.85, 0.62));
  float glowAmt = uBrutalist < 0.5 && uLightMode < 0.5 ? 0.16 : 0.06;
  float tightAmt = uBrutalist < 0.5 && uLightMode < 0.5 ? 0.14 : 0.04;
  color += glowColor * (glow * glowAmt + glowTight * tightAmt) * glowGain;

  if (uBrutalist > 0.5) {
    float top = smoothstep(1.0, 0.35, uv.y);
    color *= mix(0.72, 1.08, top);
  } else if (uLightMode > 0.5) {
    float vig = smoothstep(0.95, 0.3, distance(uv, vec2(0.5)));
    color *= mix(0.78, 0.94, vig);
  } else {
    // Botanical dark: keep leaves from crushing to black at edges
    float vig = smoothstep(1.05, 0.25, distance(uv, vec2(0.5)));
    color *= mix(0.92, 1.08, vig);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

export function createLiquidGlassMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uVelocity: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uLightMode: { value: 1 },
      uBrutalist: { value: 0 },
      uReduceMotion: { value: 0 },
      uOverGlass: { value: 0 }
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false
  });
}
