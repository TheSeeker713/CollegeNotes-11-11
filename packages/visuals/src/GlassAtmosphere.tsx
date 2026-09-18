import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Appearance } from '@collegenotes/domain';
import type { Group, Mesh } from 'three';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { shellGraphicsMode } from './shell-graphics.js';
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
    return { bg: '#F5F2E9', a: '#6B705C', b: '#8FA876', c: '#C9B896', light: '#FFF8EC', accent: '#325739', glass: '#F7F4EC' };
  }
  if (appearance.theme === 'botanical' && appearance.mode === 'dark') {
    return { bg: '#0A1410', a: '#1F4630', b: '#2F5A3A', c: '#0E2218', light: '#BBD5AB', accent: '#BBD5AB', glass: '#1A2B22' };
  }
  if (appearance.theme === 'brutalist' && appearance.mode === 'light') {
    return { bg: '#E6E5DF', a: '#B8B9B2', b: '#D0D1CB', c: '#9A9A92', light: '#FFFFFF', accent: '#15191C', glass: '#FFFFFF' };
  }
  return { bg: '#111316', a: '#2A2E35', b: '#1A1D22', c: '#3A4048', light: '#E8ECF2', accent: '#B9CEFF', glass: '#202328' };
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

function Atmosphere({ appearance }: Props) {
  const group = useRef<Group>(null);
  const colors = useMemo(() => palette(appearance), [appearance.theme, appearance.mode]);
  const botanical = appearance.theme === 'botanical';
  useFrame((state) => {
    if (!group.current || appearance.reduceMotion) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.z = Math.sin(t * 0.04) * 0.015;
    group.current.position.y = Math.sin(t * 0.1) * 0.03;
  });
  return (
    <group ref={group}>
      <color attach="background" args={[colors.bg]} />
      <EnvironmentMap />
      <ambientLight intensity={botanical ? 0.65 : 0.4} />
      <directionalLight position={[5, 8, 4]} intensity={botanical ? 1.35 : 1.05} color={colors.light} castShadow={false} />
      <directionalLight position={[-4, 3, 2]} intensity={0.35} color={colors.accent} />
      <pointLight position={[0, 2, 3]} intensity={0.25} color={colors.light} />
      {botanical ? <BotanicalWorld colors={colors} mode={appearance.mode} /> : <BrutalistWorld colors={colors} mode={appearance.mode} />}
      <GlassSlabs colors={colors} reduceMotion={appearance.reduceMotion} botanical={botanical} />
    </group>
  );
}

function BotanicalWorld({ colors, mode }: { colors: Colors; mode: 'light' | 'dark' }) {
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
      <mesh position={[0, 0, -3.2]} scale={[1.15, 1.15, 1]}>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial map={foliage} roughness={0.95} metalness={0} color={mode === 'dark' ? '#c8d4c0' : '#ffffff'} />
      </mesh>
      {shadows ? (
        <mesh position={[0.4, 0.6, -3.05]} scale={[1.2, 1.2, 1]}>
          <planeGeometry args={[16, 11]} />
          <meshBasicMaterial map={shadows} transparent opacity={0.85} depthWrite={false} />
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
          <meshBasicMaterial map={silhouette} transparent opacity={mode === 'light' ? 0.55 : 0.4} depthWrite={false} />
        </mesh>
      ))}
      {[[-2.4, 0.2, -2.1], [2.6, -0.4, -2.2], [0.2, 1.2, -2.35]].map((p, i) => (
        <mesh key={`orb-${i}`} position={p as [number, number, number]} scale={0.7 + i * 0.12}>
          <sphereGeometry args={[1.1, 32, 24]} />
          <meshPhysicalMaterial
            color={i % 2 ? colors.a : colors.b}
            roughness={0.72}
            transmission={0.15}
            thickness={0.8}
            transparent
            opacity={0.55}
            clearcoat={0.2}
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
        <meshStandardMaterial map={concrete} roughness={0.98} metalness={0.04} />
      </mesh>
      {[[-2.4, 0.8, -2.2], [2.5, -0.7, -2.35], [0.1, 0.1, -2.5]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0.05 * i, 0.12, 0]}>
          <boxGeometry args={[3.6, 2.4, 0.14]} />
          <meshStandardMaterial color={colors.a} roughness={0.92} metalness={0.08} />
        </mesh>
      ))}
      <mesh position={[0, -3.2, -1.5]} rotation={[-Math.PI / 2.4, 0, 0]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color={mode === 'dark' ? '#0A0C0F' : '#D8D7D1'} roughness={1} />
      </mesh>
    </>
  );
}

function GlassSlabs({
  colors,
  reduceMotion,
  botanical
}: {
  colors: Colors;
  reduceMotion: boolean;
  botanical: boolean;
}) {
  const a = useRef<Mesh>(null);
  const b = useRef<Mesh>(null);
  const c = useRef<Mesh>(null);
  useFrame((state) => {
    if (reduceMotion) return;
    const t = state.clock.elapsedTime;
    if (a.current) a.current.position.y = 0.25 + Math.sin(t * 0.28) * 0.05;
    if (b.current) b.current.position.y = -0.45 + Math.cos(t * 0.22) * 0.04;
    if (c.current) c.current.rotation.z = 0.08 + Math.sin(t * 0.15) * 0.02;
  });
  const glassProps = {
    color: new THREE.Color(colors.glass),
    roughness: botanical ? 0.18 : 0.12,
    metalness: 0.02,
    transmission: 0.92,
    thickness: botanical ? 1.4 : 1.8,
    transparent: true,
    opacity: 0.42,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    ior: 1.42,
    envMapIntensity: 1.1
  } as const;
  return (
    <>
      <mesh ref={a} position={[-2.1, 0.25, -0.55]} rotation={[0.06, 0.38, -0.04]}>
        <boxGeometry args={[1.9, 2.6, 0.16]} />
        <meshPhysicalMaterial {...glassProps} />
      </mesh>
      <mesh ref={b} position={[2.0, -0.45, -0.7]} rotation={[-0.05, -0.28, 0.05]}>
        <boxGeometry args={[2.4, 1.7, 0.16]} />
        <meshPhysicalMaterial {...glassProps} color={colors.light} opacity={0.35} />
      </mesh>
      <mesh ref={c} position={[0.2, 1.35, -1.1]} rotation={[0.2, 0.1, 0.08]}>
        <boxGeometry args={[2.8, 0.9, 0.12]} />
        <meshPhysicalMaterial {...glassProps} opacity={0.28} />
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
        dpr={[1, 1.35]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 4.6], fov: 40 }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Atmosphere appearance={appearance} />
      </Canvas>
    </div>
  );
}
