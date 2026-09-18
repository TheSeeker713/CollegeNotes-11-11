import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { Appearance } from '@collegenotes/domain';
import type { Group, Mesh, ShaderMaterial, Texture } from 'three';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { shellGraphicsMode } from './shell-graphics.js';
import { createLiquidGlassMaterial } from './liquid-glass-shader.js';
import { shellTextureUrl } from './shell-textures.js';
import { makeLeafShadowTexture } from './procedural-textures.js';
import {
  createBotanicalWindMaterial,
  createBrutalistCrumbleMaterial,
  syncBackdropEffect
} from './backdrop-effects.js';

type Props = { appearance: Appearance };
type Colors = ReturnType<typeof palette>;
type MotionState = {
  mouse: THREE.Vector2;
  velocity: THREE.Vector2;
  scroll: number;
  scrollTarget: number;
  overGlass: boolean;
  windEnergy: number;
};

function palette(appearance: Appearance) {
  if (appearance.theme === 'botanical' && appearance.mode === 'light') {
    return { bg: '#B5AF9A', a: '#5A604E', b: '#6F8560', c: '#A89870', light: '#E6DFC8', accent: '#2A4228', glass: '#E8E4D6' };
  }
  if (appearance.theme === 'botanical' && appearance.mode === 'dark') {
    return { bg: '#0F1C14', a: '#1A3A28', b: '#2F5A3A', c: '#0C1C14', light: '#D0E8C0', accent: '#7CBB86', glass: '#1A2B22' };
  }
  if (appearance.theme === 'brutalist' && appearance.mode === 'light') {
    return { bg: '#D8D7D1', a: '#B0B0A8', b: '#C8C8C0', c: '#9A9A92', light: '#FFFFFF', accent: '#1A1A1A', glass: '#FFFFFF' };
  }
  return { bg: '#121212', a: '#2A2A2A', b: '#1A1A1A', c: '#3A3A3A', light: '#F0F0F0', accent: '#FFFFFF', glass: '#2A2A2A' };
}

function EnvironmentMap() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function PointerLight({
  motion,
  reduceMotion,
  botanicalLight,
  botanicalDark
}: {
  motion: MutableRefObject<MotionState>;
  reduceMotion: boolean;
  botanicalLight: boolean;
  botanicalDark: boolean;
}) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (!light.current || reduceMotion) return;
    const x = (motion.current.mouse.x - 0.5) * 6.5;
    const y = (motion.current.mouse.y - 0.5) * 4.2;
    light.current.position.lerp(new THREE.Vector3(x, y, 2.6), 0.18);
    const base = botanicalDark ? 1.85 : botanicalLight ? 0.35 : 1.0;
    // Over botanical glass: keep some light so bottle refraction stays readable
    const overMul = motion.current.overGlass ? (botanicalDark ? 0.75 : botanicalLight ? 0.2 : 0.2) : 1;
    const target = base * overMul;
    light.current.intensity = THREE.MathUtils.lerp(light.current.intensity, target, 0.12);
  });
  return (
    <pointLight
      ref={light}
      intensity={botanicalDark ? 1.85 : botanicalLight ? 0.35 : 1.0}
      distance={botanicalDark ? 14 : 10}
      decay={2}
      color={botanicalDark ? '#b8e0b0' : '#ffffff'}
    />
  );
}

function useShellTexture(appearance: Appearance): Texture | null {
  const url = shellTextureUrl(appearance);
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        setTexture((prev) => {
          prev?.dispose();
          return tex;
        });
      },
      undefined,
      () => {
        if (!cancelled) setTexture(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [url]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function clearGlassLit(el: HTMLElement | null) {
  if (!el) return;
  el.removeAttribute('data-glass-lit');
  el.style.removeProperty('--glass-mx');
  el.style.removeProperty('--glass-my');
}

function lightGlassCard(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  const lx = (clientX - rect.left) / w;
  const ly = (clientY - rect.top) / h;
  // Real glass catches specular at the nearest rim/corner, not as a face bloom
  const cornerX = lx < 0.5 ? 0 : 1;
  const cornerY = ly < 0.5 ? 0 : 1;
  const rimX = THREE.MathUtils.lerp(cornerX, lx, 0.22);
  const rimY = THREE.MathUtils.lerp(cornerY, ly, 0.22);
  el.style.setProperty('--glass-mx', `${rimX * 100}%`);
  el.style.setProperty('--glass-my', `${rimY * 100}%`);
  el.setAttribute('data-glass-lit', 'true');
}

function World({
  appearance,
  colors,
  motion
}: {
  appearance: Appearance;
  colors: Colors;
  motion: MutableRefObject<MotionState>;
}) {
  const botanical = appearance.theme === 'botanical';
  const backdrop = useShellTexture(appearance);
  const root = useRef<Group>(null);
  useFrame(() => {
    if (!root.current || appearance.reduceMotion) return;
    const s = motion.current.scroll;
    root.current.position.x = THREE.MathUtils.lerp(root.current.position.x, s * 0.015, 0.08);
    root.current.position.y = THREE.MathUtils.lerp(root.current.position.y, -s * 0.02, 0.08);
    root.current.rotation.z = THREE.MathUtils.lerp(root.current.rotation.z, s * 0.002, 0.08);
  });
  return (
    <group ref={root}>
      <color attach="background" args={[colors.bg]} />
      <EnvironmentMap />
      <ambientLight intensity={botanical ? (appearance.mode === 'light' ? 0.38 : 0.55) : appearance.mode === 'light' ? 0.55 : 0.3} />
      <directionalLight
        position={botanical ? [5, 8, 4] : [0, 10, 3]}
        intensity={appearance.mode === 'light' ? (botanical ? 0.65 : 1.25) : botanical ? 1.35 : 1.5}
        color={colors.light}
      />
      {!botanical ? <directionalLight position={[-2, 4, 2]} intensity={0.25} color="#888888" /> : (
        <directionalLight position={[-5, 2, 1]} intensity={appearance.mode === 'light' ? 0.12 : 0.45} color={colors.accent} />
      )}
      <PointerLight
        motion={motion}
        reduceMotion={appearance.reduceMotion}
        botanicalLight={botanical && appearance.mode === 'light'}
        botanicalDark={botanical && appearance.mode === 'dark'}
      />
      {botanical
        ? <BotanicalWorld mode={appearance.mode} map={backdrop} motion={motion} reduceMotion={appearance.reduceMotion} />
        : <BrutalistWorld colors={colors} mode={appearance.mode} map={backdrop} motion={motion} reduceMotion={appearance.reduceMotion} />}
    </group>
  );
}

function BotanicalWorld({
  mode,
  map,
  motion,
  reduceMotion
}: {
  mode: 'light' | 'dark';
  map: Texture | null;
  motion: MutableRefObject<MotionState>;
  reduceMotion: boolean;
}) {
  const shadows = useMemo(() => (mode === 'light' ? makeLeafShadowTexture() : null), [mode]);
  const material = useMemo(() => createBotanicalWindMaterial(mode), [mode]);
  useEffect(() => () => {
    shadows?.dispose();
    material.dispose();
  }, [shadows, material]);

  useFrame((state) => {
    syncBackdropEffect(material, {
      map,
      mouse: motion.current.mouse,
      velocity: motion.current.velocity,
      time: state.clock.elapsedTime,
      // Wind keeps running under glass; bottle refraction is compositor-side
      active: !reduceMotion,
      lightMode: mode === 'light',
      windEnergy: motion.current.windEnergy
    });
  });

  return (
    <>
      <mesh position={[0, 0, -3.2]}>
        <planeGeometry args={[16, 11]} />
        <primitive object={material} attach="material" />
      </mesh>
      {map ? (
        <mesh position={[0.4, -0.2, -3.35]} scale={[1.15, 1.15, 1]}>
          <planeGeometry args={[16, 11]} />
          <meshBasicMaterial
            map={map}
            transparent
            opacity={mode === 'dark' ? 0.55 : 0.35}
            depthWrite={false}
            color={mode === 'dark' ? '#c8e0c0' : '#ffffff'}
          />
        </mesh>
      ) : null}
      {shadows ? (
        <mesh position={[0.2, 0.35, -3.05]} scale={[1.2, 1.2, 1]}>
          <planeGeometry args={[15, 10]} />
          <meshBasicMaterial map={shadows} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ) : null}
    </>
  );
}

function BrutalistWorld({
  colors,
  mode,
  map,
  motion,
  reduceMotion
}: {
  colors: Colors;
  mode: 'light' | 'dark';
  map: Texture | null;
  motion: MutableRefObject<MotionState>;
  reduceMotion: boolean;
}) {
  const material = useMemo(() => createBrutalistCrumbleMaterial(mode), [mode]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    syncBackdropEffect(material, {
      map,
      mouse: motion.current.mouse,
      velocity: motion.current.velocity,
      time: state.clock.elapsedTime,
      active: !reduceMotion && !motion.current.overGlass,
      lightMode: mode === 'light'
    });
  });

  return (
    <>
      <mesh position={[0, 0, -3.15]}>
        <planeGeometry args={[18, 12]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[0, 0.5, -3.05]}>
        <planeGeometry args={[11, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={mode === 'dark' ? 0.06 : 0.1} depthWrite={false} />
      </mesh>
      {[[-3.2, 1.1, -2.35], [3.0, -0.9, -2.45]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0.02, 0.08 * (i ? -1 : 1), 0]}>
          <boxGeometry args={[2.6, 1.8, 0.1]} />
          <meshStandardMaterial color={colors.a} roughness={0.96} metalness={0.04} />
        </mesh>
      ))}
    </>
  );
}

function AtmosphereCompositor({ appearance }: Props) {
  const { gl, size } = useThree();
  const colors = useMemo(() => palette(appearance), [appearance.theme, appearance.mode]);
  const [scene] = useState(() => new THREE.Scene());
  const motion = useRef<MotionState>({
    mouse: new THREE.Vector2(0.5, 0.5),
    velocity: new THREE.Vector2(0, 0),
    scroll: 0,
    scrollTarget: 0,
    overGlass: false,
    windEnergy: 0
  });
  const litGlass = useRef<HTMLElement | null>(null);
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null);
  const target = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.SRGBColorSpace
    });
    rt.texture.flipY = false;
    return rt;
  }, []);
  const material = useMemo(() => createLiquidGlassMaterial(), []);
  const camera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
    cam.position.set(0, 0, 4.6);
    return cam;
  }, []);
  const quad = useRef<Mesh>(null);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const nx = event.clientX / Math.max(1, window.innerWidth);
      const ny = 1 - event.clientY / Math.max(1, window.innerHeight);
      const now = performance.now();
      if (lastPointer.current) {
        const dt = Math.max(0.008, (now - lastPointer.current.t) / 1000);
        const vx = (nx - lastPointer.current.x) / dt;
        const vy = (ny - lastPointer.current.y) / dt;
        motion.current.velocity.x = THREE.MathUtils.clamp(vx * 0.04, -1.5, 1.5);
        motion.current.velocity.y = THREE.MathUtils.clamp(vy * 0.04, -1.5, 1.5);
      }
      lastPointer.current = { x: nx, y: ny, t: now };

      motion.current.mouse.set(nx, ny);

      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const glass = hit instanceof Element ? (hit.closest('.glass') as HTMLElement | null) : null;
      motion.current.overGlass = Boolean(glass);

      if (litGlass.current && litGlass.current !== glass) clearGlassLit(litGlass.current);
      if (glass && !appearance.reduceMotion) {
        lightGlassCard(glass, event.clientX, event.clientY);
        litGlass.current = glass;
      } else {
        clearGlassLit(litGlass.current);
        litGlass.current = null;
      }
    };
    const onLeave = () => {
      motion.current.overGlass = false;
      motion.current.velocity.set(0, 0);
      clearGlassLit(litGlass.current);
      litGlass.current = null;
    };
    const onWheel = (event: WheelEvent) => {
      motion.current.scrollTarget += event.deltaY * 0.004;
      motion.current.scrollTarget = THREE.MathUtils.clamp(motion.current.scrollTarget, -8, 8);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('wheel', onWheel);
      clearGlassLit(litGlass.current);
    };
  }, [appearance.reduceMotion]);

  useEffect(() => () => {
    target.dispose();
    material.dispose();
  }, [target, material]);

  useFrame((state) => {
    const w = Math.max(1, Math.floor(size.width * state.viewport.dpr));
    const h = Math.max(1, Math.floor(size.height * state.viewport.dpr));
    if (target.width !== w || target.height !== h) {
      target.setSize(w, h);
      camera.aspect = size.width / Math.max(1, size.height);
      camera.updateProjectionMatrix();
    }

    const dt = state.clock.getDelta();
    motion.current.scroll = THREE.MathUtils.damp(motion.current.scroll, motion.current.scrollTarget, 4, dt);
    motion.current.scrollTarget = THREE.MathUtils.damp(motion.current.scrollTarget, 0, 0.6, dt);
    motion.current.velocity.multiplyScalar(Math.exp(-dt * 3.2));

    // Wind energy from mouse speed: slow ≈ 0, flick ≈ 1; decays when still
    const speed = motion.current.velocity.length();
    const targetEnergy = THREE.MathUtils.clamp(Math.pow(speed * 2.4, 1.15), 0, 1);
    motion.current.windEnergy = THREE.MathUtils.damp(
      motion.current.windEnergy,
      targetEnergy,
      targetEnergy > motion.current.windEnergy ? 8 : 2.2,
      dt
    );

    material.uniforms.uLightMode!.value = appearance.mode === 'light' ? 1 : 0;
    material.uniforms.uBrutalist!.value = appearance.theme === 'brutalist' ? 1 : 0;
    material.uniforms.uReduceMotion!.value = appearance.reduceMotion ? 1 : 0;
    material.uniforms.uOverGlass!.value = motion.current.overGlass ? 1 : 0;
    material.uniforms.uTime!.value = state.clock.elapsedTime;
    material.uniforms.uMouse!.value.copy(motion.current.mouse);
    material.uniforms.uVelocity!.value.copy(motion.current.velocity);
    material.uniforms.uScroll!.value = motion.current.scroll;

    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    material.uniforms.tScene!.value = target.texture;
    if (quad.current) (quad.current.material as ShaderMaterial).uniformsNeedUpdate = true;
  });

  return (
    <>
      {createPortal(<World appearance={appearance} colors={colors} motion={motion} />, scene)}
      <mesh ref={quad} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <primitive object={material} attach="material" />
      </mesh>
    </>
  );
}

export function GlassAtmosphere({ appearance }: Props) {
  const preferReducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  const mode = shellGraphicsMode({ appearance, preferReducedMotion });
  if (mode !== 'webgl') {
    return (
      <div
        className="glass-atmosphere glass-atmosphere-fallback"
        aria-hidden="true"
        data-theme={appearance.theme}
        data-mode={appearance.mode}
      />
    );
  }
  return (
    <div className="glass-atmosphere" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 1], fov: 50 }}
        orthographic={false}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <AtmosphereCompositor appearance={appearance} />
      </Canvas>
    </div>
  );
}
