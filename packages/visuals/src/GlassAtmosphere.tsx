import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
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

function palette(appearance: Appearance) {
  if (appearance.theme === 'botanical' && appearance.mode === 'light') {
    return { bg: '#D9E4C8', a: '#4F7340', b: '#7FA86A', c: '#C4B48A', light: '#FFF9E8', accent: '#2F5A28', glass: '#FFFFFF' };
  }
  if (appearance.theme === 'botanical' && appearance.mode === 'dark') {
    return { bg: '#07110C', a: '#1A3A28', b: '#2F5A3A', c: '#0C1C14', light: '#BBD5AB', accent: '#7CBB86', glass: '#1A2B22' };
  }
  if (appearance.theme === 'brutalist' && appearance.mode === 'light') {
    return { bg: '#D2D1CB', a: '#A8A9A2', b: '#C4C5BE', c: '#8E8E86', light: '#FFFFFF', accent: '#15191C', glass: '#FFFFFF' };
  }
  return { bg: '#0A0C10', a: '#2A2E35', b: '#1A1D22', c: '#3A4048', light: '#E8ECF2', accent: '#B9CEFF', glass: '#202328' };
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

function PointerLight({ reduceMotion }: { reduceMotion: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (!light.current || reduceMotion) return;
    const x = (state.pointer.x) * 3.2;
    const y = (state.pointer.y) * 2.2;
    light.current.position.lerp(new THREE.Vector3(x, y, 2.4), 0.12);
  });
  return <pointLight ref={light} intensity={0.85} distance={8} decay={2} color="#ffffff" />;
}

function World({ appearance, colors }: { appearance: Appearance; colors: Colors }) {
  const botanical = appearance.theme === 'botanical';
  return (
    <group>
      <color attach="background" args={[colors.bg]} />
      <EnvironmentMap />
      <ambientLight intensity={botanical ? (appearance.mode === 'light' ? 0.55 : 0.45) : 0.35} />
      <directionalLight position={[5, 8, 4]} intensity={appearance.mode === 'light' ? 1.55 : 1.15} color={colors.light} />
      <directionalLight position={[-5, 2, 1]} intensity={0.45} color={colors.accent} />
      <PointerLight reduceMotion={appearance.reduceMotion} />
      {botanical ? <BotanicalWorld colors={colors} mode={appearance.mode} /> : <BrutalistWorld colors={colors} mode={appearance.mode} />}
      <RefractiveSlabs colors={colors} reduceMotion={appearance.reduceMotion} lightMode={appearance.mode === 'light'} />
    </group>
  );
}

function BotanicalWorld({ colors, mode }: { colors: Colors; mode: 'light' | 'dark' }) {
  const foliage = useMemo(() => makeFoliageTexture(mode), [mode]);
  const shadows = useMemo(() => (mode === 'light' ? makeLeafShadowTexture() : null), [mode]);
  const silhouette = useMemo(() => makeBotanicalSilhouette(mode === 'light' ? '#4F7340' : '#3A6B48'), [mode]);
  useEffect(() => () => {
    foliage.dispose();
    shadows?.dispose();
    silhouette.dispose();
  }, [foliage, shadows, silhouette]);
  return (
    <>
      <mesh position={[0, 0, -3.2]} scale={[1.2, 1.2, 1]}>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial map={foliage} roughness={0.92} metalness={0} color={mode === 'dark' ? '#c8d4c0' : '#eef5e4'} />
      </mesh>
      {shadows ? (
        <mesh position={[0.3, 0.5, -3.0]} scale={[1.25, 1.25, 1]}>
          <planeGeometry args={[16, 11]} />
          <meshBasicMaterial map={shadows} transparent opacity={0.7} depthWrite={false} />
        </mesh>
      ) : null}
      {(
        [
          [-5.2, -2.4, -2.4, 1.2],
          [5.1, -2.2, -2.5, 1.1],
          [-4.8, 2.6, -2.6, 0.9],
          [4.6, 2.4, -2.55, 0.95]
        ] as const
      ).map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={[s * (i % 2 ? -1 : 1), s, 1]}>
          <planeGeometry args={[3.4, 3.4]} />
          <meshBasicMaterial map={silhouette} transparent opacity={mode === 'light' ? 0.62 : 0.4} depthWrite={false} />
        </mesh>
      ))}
      {[[-2.6, 0.3, -2.0], [2.8, -0.5, -2.1], [0.1, 1.35, -2.25], [-1.2, -1.4, -1.9]].map((p, i) => (
        <mesh key={`orb-${i}`} position={p as [number, number, number]} scale={0.65 + i * 0.1}>
          <icosahedronGeometry args={[1.05, 1]} />
          <meshPhysicalMaterial
            color={i % 2 ? colors.a : colors.b}
            roughness={0.35}
            transmission={mode === 'light' ? 0.55 : 0.25}
            thickness={1.1}
            transparent
            opacity={mode === 'light' ? 0.7 : 0.6}
            clearcoat={0.8}
            ior={1.4}
          />
        </mesh>
      ))}
    </>
  );
}

function BrutalistWorld({ colors, mode }: { colors: Colors; mode: 'light' | 'dark' }) {
  const concrete = useMemo(() => makeConcreteTexture(mode), [mode]);
  useEffect(() => () => concrete.dispose(), [concrete]);
  return (
    <>
      <mesh position={[0, 0, -3.1]}>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial map={concrete} roughness={0.98} metalness={0.05} />
      </mesh>
      {[[-2.4, 0.8, -2.15], [2.5, -0.7, -2.3], [0.1, 0.15, -2.45]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0.04 * i, 0.1, 0]}>
          <boxGeometry args={[3.8, 2.5, 0.16]} />
          <meshStandardMaterial color={colors.a} roughness={0.9} metalness={0.1} />
        </mesh>
      ))}
    </>
  );
}

function RefractiveSlabs({
  colors,
  reduceMotion,
  lightMode
}: {
  colors: Colors;
  reduceMotion: boolean;
  lightMode: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current || reduceMotion) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.12) * 0.04;
    group.current.position.y = Math.sin(t * 0.2) * 0.04;
  });
  const props = {
    color: new THREE.Color(lightMode ? '#ffffff' : colors.glass),
    roughness: lightMode ? 0.05 : 0.12,
    metalness: 0,
    transmission: lightMode ? 0.98 : 0.88,
    thickness: lightMode ? 1.6 : 1.3,
    transparent: true,
    opacity: lightMode ? 0.22 : 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    ior: 1.45,
    envMapIntensity: lightMode ? 1.4 : 1.0
  } as const;
  return (
    <group ref={group}>
      <mesh position={[-2.0, 0.2, -0.35]} rotation={[0.05, 0.4, -0.03]}>
        <boxGeometry args={[2.0, 2.8, 0.14]} />
        <meshPhysicalMaterial {...props} />
      </mesh>
      <mesh position={[2.1, -0.35, -0.5]} rotation={[-0.04, -0.3, 0.05]}>
        <boxGeometry args={[2.5, 1.8, 0.14]} />
        <meshPhysicalMaterial {...props} opacity={lightMode ? 0.18 : 0.32} />
      </mesh>
    </group>
  );
}

function LiquidGlassCompositor({ appearance }: Props) {
  const { gl, size } = useThree();
  const colors = useMemo(() => palette(appearance), [appearance.theme, appearance.mode]);
  const [scene] = useState(() => new THREE.Scene());
  const mouse = useRef(new THREE.Vector2(0.72, 0.28));
  const target = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.SRGBColorSpace
    });
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
      mouse.current.set(event.clientX / Math.max(1, window.innerWidth), 1 - event.clientY / Math.max(1, window.innerHeight));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
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
      material.uniforms.uResolution!.value.set(w, h);
    }

    const wide = size.width > 900;
    material.uniforms.uPanelA!.value.set(wide ? 0.135 : 0.5, 0.5, wide ? 0.115 : 0.42, wide ? 0.4 : 0.08);
    material.uniforms.uPanelB!.value.set(wide ? 0.62 : 0.5, 0.9, wide ? 0.3 : 0.42, 0.04);
    material.uniforms.uPanelC!.value.set(wide ? 0.62 : 0.5, 0.48, wide ? 0.32 : 0.42, wide ? 0.34 : 0.36);
    material.uniforms.uRadius!.value = wide ? 0.032 : 0.04;
    material.uniforms.uLightMode!.value = appearance.mode === 'light' ? 1 : 0;
    material.uniforms.uReduceMotion!.value = appearance.reduceMotion ? 1 : 0;
    material.uniforms.uTime!.value = state.clock.elapsedTime;
    material.uniforms.uMouse!.value.copy(mouse.current);

    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    material.uniforms.tScene!.value = target.texture;
    if (quad.current) {
      (quad.current.material as ShaderMaterial).uniformsNeedUpdate = true;
    }
  });

  return (
    <>
      {createPortal(<World appearance={appearance} colors={colors} />, scene)}
      <mesh ref={quad} frustumCulled={false} renderOrder={10}>
        <planeGeometry args={[2, 2]} />
        <primitive object={material} attach="material" />
      </mesh>
      <FullscreenQuadBinder meshRef={quad} />
    </>
  );
}

function FullscreenQuadBinder({ meshRef }: { meshRef: RefObject<Mesh | null> }) {
  const { camera } = useThree();
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !(camera instanceof THREE.PerspectiveCamera)) return;
    mesh.position.copy(camera.position);
    mesh.quaternion.copy(camera.quaternion);
    mesh.translateZ(-0.5);
    const dist = 0.5;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const width = height * camera.aspect;
    mesh.scale.set(width, height, 1);
  });
  return null;
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
        camera={{ position: [0, 0, 4.6], fov: 40 }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <LiquidGlassCompositor appearance={appearance} />
      </Canvas>
    </div>
  );
}
