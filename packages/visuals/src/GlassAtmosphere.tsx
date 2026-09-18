import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { Appearance } from '@collegenotes/domain';
import type { Group, Mesh, ShaderMaterial } from 'three';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { shellGraphicsMode } from './shell-graphics.js';
import { createLiquidGlassMaterial } from './liquid-glass-shader.js';
import {
  makeBotanicalSilhouette,
  makeConcreteTexture,
  makeFoliageTexture,
  makeLeafShadowTexture
} from './procedural-textures.js';

type Props = { appearance: Appearance };
type Colors = ReturnType<typeof palette>;
type MotionState = { mouse: THREE.Vector2; scroll: number; scrollTarget: number };

function palette(appearance: Appearance) {
  if (appearance.theme === 'botanical' && appearance.mode === 'light') {
    return { bg: '#E8E4D6', a: '#6B705C', b: '#8FA876', c: '#C9B896', light: '#FFF8EC', accent: '#3D5A3C', glass: '#F7F4EC' };
  }
  if (appearance.theme === 'botanical' && appearance.mode === 'dark') {
    return { bg: '#0A1410', a: '#1A3A28', b: '#2F5A3A', c: '#0C1C14', light: '#BBD5AB', accent: '#7CBB86', glass: '#1A2B22' };
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

function PointerLight({ motion, reduceMotion }: { motion: MutableRefObject<MotionState>; reduceMotion: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (!light.current || reduceMotion) return;
    const x = (motion.current.mouse.x - 0.5) * 6.5;
    const y = (motion.current.mouse.y - 0.5) * 4.2;
    light.current.position.lerp(new THREE.Vector3(x, y, 2.6), 0.18);
  });
  return <pointLight ref={light} intensity={1.1} distance={10} decay={2} color="#ffffff" />;
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
      <ambientLight intensity={botanical ? (appearance.mode === 'light' ? 0.6 : 0.4) : appearance.mode === 'light' ? 0.5 : 0.28} />
      <directionalLight
        position={botanical ? [5, 8, 4] : [0, 10, 3]}
        intensity={appearance.mode === 'light' ? 1.4 : botanical ? 1.1 : 1.6}
        color={colors.light}
      />
      {!botanical ? <directionalLight position={[-2, 4, 2]} intensity={0.25} color="#888888" /> : (
        <directionalLight position={[-5, 2, 1]} intensity={0.4} color={colors.accent} />
      )}
      <PointerLight motion={motion} reduceMotion={appearance.reduceMotion} />
      {botanical ? <BotanicalWorld colors={colors} mode={appearance.mode} /> : <BrutalistWorld colors={colors} mode={appearance.mode} />}
      {botanical ? <BotanicalGlass accents={colors} reduceMotion={appearance.reduceMotion} lightMode={appearance.mode === 'light'} /> : null}
    </group>
  );
}

function BotanicalWorld({ mode }: { colors: Colors; mode: 'light' | 'dark' }) {
  const foliage = useMemo(() => makeFoliageTexture(mode), [mode]);
  const shadows = useMemo(() => (mode === 'light' ? makeLeafShadowTexture() : null), [mode]);
  const silhouette = useMemo(() => makeBotanicalSilhouette(mode === 'light' ? '#6B705C' : '#3A6B48'), [mode]);
  useEffect(() => () => {
    foliage.dispose();
    shadows?.dispose();
    silhouette.dispose();
  }, [foliage, shadows, silhouette]);
  return (
    <>
      <mesh position={[0, 0, -3.2]} scale={[1.2, 1.2, 1]}>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial map={foliage} roughness={0.92} metalness={0} color={mode === 'dark' ? '#c8d4c0' : '#ffffff'} />
      </mesh>
      {shadows ? (
        <mesh position={[0.3, 0.5, -3.0]} scale={[1.25, 1.25, 1]}>
          <planeGeometry args={[16, 11]} />
          <meshBasicMaterial map={shadows} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ) : null}
      {(
        [
          [-5.2, -2.4, -2.4, 1.15],
          [5.1, -2.2, -2.5, 1.05],
          [-4.8, 2.6, -2.6, 0.85],
          [4.6, 2.4, -2.55, 0.9]
        ] as const
      ).map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={[s * (i % 2 ? -1 : 1), s, 1]}>
          <planeGeometry args={[3.2, 3.2]} />
          <meshBasicMaterial map={silhouette} transparent opacity={mode === 'light' ? 0.5 : 0.38} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function BotanicalGlass({
  accents,
  reduceMotion,
  lightMode
}: {
  accents: Colors;
  reduceMotion: boolean;
  lightMode: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current || reduceMotion) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = Math.sin(t * 0.18) * 0.03;
  });
  return (
    <group ref={group}>
      {[[-2.4, 0.2, -1.9], [2.5, -0.4, -2.0]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} scale={0.7 + i * 0.08}>
          <icosahedronGeometry args={[0.95, 1]} />
          <meshPhysicalMaterial
            color={i % 2 ? accents.a : accents.b}
            roughness={0.45}
            transmission={lightMode ? 0.4 : 0.2}
            thickness={0.9}
            transparent
            opacity={0.45}
            clearcoat={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

function BrutalistWorld({ colors, mode }: { colors: Colors; mode: 'light' | 'dark' }) {
  const concrete = useMemo(() => makeConcreteTexture(mode), [mode]);
  useEffect(() => () => concrete.dispose(), [concrete]);
  return (
    <>
      <mesh position={[0, 0, -3.15]}>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial map={concrete} roughness={1} metalness={0.02} color={mode === 'dark' ? '#c8c8c8' : '#ffffff'} />
      </mesh>
      <mesh position={[0, 0.4, -3.05]}>
        <planeGeometry args={[10, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={mode === 'dark' ? 0.07 : 0.12}
          depthWrite={false}
        />
      </mesh>
      {[[-3.2, 1.1, -2.3], [3.0, -0.9, -2.4]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0.02, 0.08 * (i ? -1 : 1), 0]}>
          <boxGeometry args={[2.8, 2.0, 0.12]} />
          <meshStandardMaterial color={colors.a} roughness={0.95} metalness={0.06} />
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
    scroll: 0,
    scrollTarget: 0
  });
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
      // UV origin bottom-left to match shader vUv / FBO with flipY=false
      motion.current.mouse.set(
        event.clientX / Math.max(1, window.innerWidth),
        1 - event.clientY / Math.max(1, window.innerHeight)
      );
    };
    const onWheel = (event: WheelEvent) => {
      // Mouse wheel and two-finger trackpad both fire wheel
      motion.current.scrollTarget += event.deltaY * 0.004;
      motion.current.scrollTarget = THREE.MathUtils.clamp(motion.current.scrollTarget, -8, 8);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('wheel', onWheel);
    };
  }, []);

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

    motion.current.scroll = THREE.MathUtils.damp(
      motion.current.scroll,
      motion.current.scrollTarget,
      4,
      state.clock.getDelta()
    );
    // Settle scroll target slowly so warp eases out
    motion.current.scrollTarget = THREE.MathUtils.damp(motion.current.scrollTarget, 0, 0.6, state.clock.getDelta());

    material.uniforms.uLightMode!.value = appearance.mode === 'light' ? 1 : 0;
    material.uniforms.uBrutalist!.value = appearance.theme === 'brutalist' ? 1 : 0;
    material.uniforms.uReduceMotion!.value = appearance.reduceMotion ? 1 : 0;
    material.uniforms.uTime!.value = state.clock.elapsedTime;
    material.uniforms.uMouse!.value.copy(motion.current.mouse);
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
        {/* Fullscreen NDC quad ignores default camera; compositor owns FBO camera */}
        <AtmosphereCompositor appearance={appearance} />
      </Canvas>
    </div>
  );
}
