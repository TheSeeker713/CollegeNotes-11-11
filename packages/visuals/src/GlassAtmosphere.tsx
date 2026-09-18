import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Appearance } from '@collegenotes/domain';
import type { Group, Mesh } from 'three';
import * as THREE from 'three';
import { shellGraphicsMode } from './shell-graphics.js';

type Props = { appearance: Appearance };

function palette(appearance: Appearance) {
  if (appearance.theme === 'botanical' && appearance.mode === 'light') {
    return { bg: '#E8E0D0', a: '#6F8F5C', b: '#A8C090', c: '#C9B896', light: '#FFF6E0', accent: '#325739' };
  }
  if (appearance.theme === 'botanical' && appearance.mode === 'dark') {
    return { bg: '#0B1511', a: '#1F3A28', b: '#2F5A3A', c: '#0E2218', light: '#BBD5AB', accent: '#BBD5AB' };
  }
  if (appearance.theme === 'brutalist' && appearance.mode === 'light') {
    return { bg: '#D8D9D4', a: '#AEB2AB', b: '#C8CBC4', c: '#9A9E98', light: '#FFFFFF', accent: '#153FBA' };
  }
  return { bg: '#0C0E11', a: '#2A2E35', b: '#1A1D22', c: '#3A4048', light: '#B9CEFF', accent: '#B9CEFF' };
}

function Atmosphere({ appearance }: Props) {
  const group = useRef<Group>(null);
  const colors = useMemo(() => palette(appearance), [appearance.theme, appearance.mode]);
  const botanical = appearance.theme === 'botanical';
  useFrame((state) => {
    if (!group.current || appearance.reduceMotion) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.z = Math.sin(t * 0.05) * 0.02;
    group.current.position.y = Math.sin(t * 0.12) * 0.05;
  });
  return (
    <group ref={group}>
      <color attach="background" args={[colors.bg]} />
      <ambientLight intensity={botanical ? 0.55 : 0.35} />
      <directionalLight position={[4, 6, 3]} intensity={botanical ? 1.1 : 0.85} color={colors.light} />
      <pointLight position={[-3, 2, 2]} intensity={0.45} color={colors.accent} />
      {botanical ? <BotanicalLayers colors={colors} /> : <BrutalistLayers colors={colors} />}
      <GlassSlabs colors={colors} reduceMotion={appearance.reduceMotion} />
    </group>
  );
}

function BotanicalLayers({ colors }: { colors: ReturnType<typeof palette> }) {
  return (
    <>
      <mesh position={[0, -1.2, -2]} rotation={[-0.4, 0.2, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color={colors.c} roughness={0.92} metalness={0.05} />
      </mesh>
      {[[-2.2, 0.4, -1.2], [2.4, -0.2, -1.4], [-0.4, 1.1, -1.6], [1.6, 0.8, -1.1], [-2.8, -0.8, -1.5]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0.2, 0.4 * i, 0.5]} scale={0.55 + (i % 3) * 0.18}>
          <sphereGeometry args={[0.9, 16, 12]} />
          <meshPhysicalMaterial
            color={i % 2 ? colors.a : colors.b}
            roughness={0.55}
            transmission={0.35}
            thickness={0.6}
            transparent
            opacity={0.85}
            clearcoat={0.4}
          />
        </mesh>
      ))}
    </>
  );
}

function BrutalistLayers({ colors }: { colors: ReturnType<typeof palette> }) {
  return (
    <>
      <mesh position={[0, 0, -2.2]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color={colors.bg} roughness={0.98} metalness={0.08} />
      </mesh>
      {[[-2, 1, -1.3], [2.2, -0.6, -1.5], [0.2, 0.3, -1.8]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0.1 * i, 0.15, 0]}>
          <boxGeometry args={[3.2, 2.2, 0.18]} />
          <meshStandardMaterial color={colors.a} roughness={0.9} metalness={0.12} />
        </mesh>
      ))}
    </>
  );
}

function GlassSlabs({ colors, reduceMotion }: { colors: ReturnType<typeof palette>; reduceMotion: boolean }) {
  const a = useRef<Mesh>(null);
  const b = useRef<Mesh>(null);
  useFrame((state) => {
    if (reduceMotion) return;
    const t = state.clock.elapsedTime;
    if (a.current) a.current.position.y = 0.15 + Math.sin(t * 0.35) * 0.04;
    if (b.current) b.current.position.y = -0.35 + Math.cos(t * 0.28) * 0.03;
  });
  const glass = {
    color: new THREE.Color(colors.light),
    roughness: 0.12,
    metalness: 0.05,
    transmission: 0.82,
    thickness: 1.2,
    transparent: true,
    opacity: 0.55,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    ior: 1.45
  } as const;
  return (
    <>
      <mesh ref={a} position={[-1.6, 0.15, -0.4]} rotation={[0.08, 0.35, -0.05]}>
        <boxGeometry args={[1.8, 2.4, 0.12]} />
        <meshPhysicalMaterial {...glass} />
      </mesh>
      <mesh ref={b} position={[1.5, -0.35, -0.55]} rotation={[-0.05, -0.25, 0.04]}>
        <boxGeometry args={[2.2, 1.5, 0.12]} />
        <meshPhysicalMaterial {...glass} color={colors.accent} opacity={0.4} />
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
    return <div className="glass-atmosphere glass-atmosphere-fallback" aria-hidden="true" data-theme={appearance.theme} data-mode={appearance.mode} />;
  }
  return (
    <div className="glass-atmosphere" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Atmosphere appearance={appearance} />
      </Canvas>
    </div>
  );
}
