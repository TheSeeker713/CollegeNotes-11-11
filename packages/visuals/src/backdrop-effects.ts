import * as THREE from 'three';

const botanicalVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Foliar wind: idle looping breeze + speed-scaled gust.
 * Slow mouse → barely a shiver; fast mouse → full-screen shake.
 * Direction follows velocity; coverage widens with speed.
 */
const botanicalFragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uMouse;
uniform vec2 uVelocity;
uniform float uTime;
uniform float uActive;
uniform float uHasMap;
uniform vec3 uFallback;
uniform float uLightMode;
uniform float uWindEnergy;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  float motion = uActive;
  float energy = clamp(uWindEnergy, 0.0, 1.0) * motion;
  float raw = length(uVelocity);

  vec2 windDir = raw > 0.003
    ? normalize(uVelocity)
    : vec2(0.82 + sin(uTime * 0.21) * 0.08, 0.18 + cos(uTime * 0.17) * 0.1);

  // Idle looping breeze (always on when motion allowed) — very light
  float idle = 0.14 * motion;
  // Driven power: nonlinear so slow barely shows, fast hits hard
  float driven = pow(energy, 1.25) * motion;
  float power = idle + driven * 2.4;

  // Coverage: idle = gentle full field; slow = local; fast = whole screen
  float dist = distance(uv, uMouse);
  float local = smoothstep(0.9, 0.02, dist);
  float coverage = mix(mix(0.55, local, 0.65), 1.0, pow(energy, 0.55));
  float gust = power * coverage;

  // Primary bend along wind
  float phase = dot(uv, windDir) * mix(7.0, 14.0, energy) + uTime * mix(0.85, 2.4, energy);
  float bend = sin(phase) * 0.55 + sin(phase * 0.47 + 1.3) * 0.35;
  float amp = mix(0.0045, 0.028, pow(energy, 0.9));
  vec2 sway = windDir * bend * gust * amp;

  // Desynced leaf flutter
  float leafId = hash(floor(uv * mix(22.0, 36.0, energy)));
  float flutter = sin(uTime * mix(3.2, 7.5, energy) + leafId * 6.2831 + uv.x * 12.0)
                * cos(uTime * mix(2.6, 5.8, energy) + leafId * 3.7 + uv.y * 10.0);
  vec2 perp = vec2(-windDir.y, windDir.x);
  float flutterAmp = mix(0.0016, 0.012, energy);
  sway += perp * flutter * gust * flutterAmp;
  sway += windDir * flutter * gust * flutterAmp * 0.35;

  // Ambient loop so stationary cursor still breathes
  sway += windDir * sin(uTime * 0.65 + uv.y * 5.5) * 0.0014 * motion;
  sway += perp * cos(uTime * 0.48 + uv.x * 4.5) * 0.0009 * motion;

  vec2 sampleUv = clamp(uv + sway, 0.0, 1.0);
  vec3 color = uHasMap > 0.5 ? texture2D(uMap, sampleUv).rgb : uFallback;

  if (uLightMode > 0.5) {
    color *= vec3(0.78, 0.80, 0.72);
    color = mix(color, vec3(0.36, 0.40, 0.30), 0.14);
  } else {
    // Dark mode: lift foliage so leaves read through the glass
    color = color * 1.55 + vec3(0.03, 0.05, 0.035);
    color = mix(color, color * vec3(0.95, 1.18, 1.02), 0.35);
    color = min(color, vec3(0.85));
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

const brutalistVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Concrete grind: mouse as a heavy boulder — crumble, dust, and pits. */
const brutalistFragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uMouse;
uniform vec2 uVelocity;
uniform float uTime;
uniform float uActive;
uniform float uHasMap;
uniform vec3 uFallback;
uniform float uLightMode;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = vUv;
  float motion = uActive;
  float speed = clamp(length(uVelocity) * 16.0, 0.0, 1.8);
  vec2 toMouse = uv - uMouse;
  float dist = length(toMouse);
  float grind = smoothstep(0.42, 0.0, dist) * speed * motion;

  float n = noise(uv * 38.0 + uTime * 1.6);
  float n2 = noise(uv * 72.0 - uTime * 2.4 + uMouse * 4.0);
  float crack = step(0.72, noise(uv * 55.0 + floor(uMouse * 20.0)));

  vec2 dir = length(uVelocity) > 0.0001 ? normalize(uVelocity) : vec2(0.0, 1.0);
  vec2 crumble = (vec2(n, n2) - 0.5) * grind * 0.055;
  crumble += dir * (n - 0.5) * grind * 0.03;
  crumble += toMouse * crack * grind * 0.02;

  vec2 sampleUv = clamp(uv + crumble, 0.0, 1.0);
  vec3 color = uHasMap > 0.5 ? texture2D(uMap, sampleUv).rgb : uFallback;

  float pit = grind * n2;
  color *= 1.0 - pit * 0.45;
  vec3 dust = uLightMode > 0.5 ? vec3(0.92, 0.9, 0.86) : vec3(0.35, 0.35, 0.36);
  color = mix(color, dust, grind * (1.0 - n) * 0.35);
  color -= vec3(crack * grind * 0.22);

  gl_FragColor = vec4(color, 1.0);
}
`;

export type BackdropEffectUniforms = {
  uMap: { value: THREE.Texture | null };
  uMouse: { value: THREE.Vector2 };
  uVelocity: { value: THREE.Vector2 };
  uTime: { value: number };
  uActive: { value: number };
  uHasMap: { value: number };
  uFallback: { value: THREE.Color };
  uLightMode: { value: number };
  uWindEnergy: { value: number };
};

function baseUniforms(fallback: string, lightMode: boolean): BackdropEffectUniforms {
  return {
    uMap: { value: null },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uVelocity: { value: new THREE.Vector2(0, 0) },
    uTime: { value: 0 },
    uActive: { value: 0 },
    uHasMap: { value: 0 },
    uFallback: { value: new THREE.Color(fallback) },
    uLightMode: { value: lightMode ? 1 : 0 },
    uWindEnergy: { value: 0 }
  };
}

export function createBotanicalWindMaterial(mode: 'light' | 'dark'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: baseUniforms(mode === 'dark' ? '#0F1C14' : '#D4CFBE', mode === 'light'),
    vertexShader: botanicalVertex,
    fragmentShader: botanicalFragment
  });
}

export function createBrutalistCrumbleMaterial(mode: 'light' | 'dark'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: baseUniforms(mode === 'dark' ? '#121212' : '#D8D7D1', mode === 'light'),
    vertexShader: brutalistVertex,
    fragmentShader: brutalistFragment
  });
}

export function syncBackdropEffect(
  material: THREE.ShaderMaterial,
  opts: {
    map: THREE.Texture | null;
    mouse: THREE.Vector2;
    velocity: THREE.Vector2;
    time: number;
    active: boolean;
    lightMode: boolean;
    windEnergy?: number;
  }
): void {
  const u = material.uniforms as BackdropEffectUniforms;
  u.uMap.value = opts.map;
  u.uHasMap.value = opts.map ? 1 : 0;
  u.uMouse.value.copy(opts.mouse);
  u.uVelocity.value.copy(opts.velocity);
  u.uTime.value = opts.time;
  u.uActive.value = opts.active ? 1 : 0;
  u.uLightMode.value = opts.lightMode ? 1 : 0;
  u.uWindEnergy.value = opts.windEnergy ?? 0;
}
