import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, type CSSProperties } from 'react';
import type { Mesh } from 'three';
import type { LegibilityInspectorState } from '@collegenotes/domain';

function detectGraphicsLocal(gl?: { getContext?: (name: string) => unknown } | null) {
  const webgl2 = Boolean(gl && typeof gl.getContext === 'function' && gl.getContext('webgl2'));
  return { webgl2, fallback: 'text-2d' as const };
}

function textEquivalentLocal(label: string): string {
  return `Text equivalent: ${label}`;
}

type Props = {
  state: LegibilityInspectorState;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  /** Theme/mode may change without remounting — pass as style only. */
  surfaceStyle?: CSSProperties;
};

function SlidePlane({
  textSizePt,
  contrastRatio,
  cameraYaw,
  active,
  reducedMotion
}: {
  textSizePt: number;
  contrastRatio: number;
  cameraYaw: number;
  active: boolean;
  reducedMotion: boolean;
}) {
  const mesh = useRef<Mesh>(null);
  const lightness = Math.max(0.05, Math.min(0.95, 1 / contrastRatio));
  useFrame((_, delta) => {
    if (!mesh.current || !active || reducedMotion) return;
    mesh.current.rotation.y = (cameraYaw * Math.PI) / 180 + Math.sin(performance.now() / 4000) * 0.02 * Math.min(1, delta * 60);
  });
  const scale = Math.max(0.4, Math.min(2.5, textSizePt / 24));
  return (
    <mesh ref={mesh} position={[0, 0.2, 0]} scale={[scale, scale * 0.65, 1]} rotation={[0, (cameraYaw * Math.PI) / 180, 0]}>
      <planeGeometry args={[2.4, 1.5]} />
      <meshStandardMaterial color={`rgb(${Math.round(255 * lightness)},${Math.round(255 * lightness)},${Math.round(255 * lightness)})`} />
    </mesh>
  );
}

/**
 * Instructional R3F aid — distinct from decorative GlassAtmosphere shell.
 * Renders only when active && webgl2; otherwise shows text alternative.
 */
export function LegibilityAidView({ state, onContextLost, onContextRestored, surfaceStyle }: Props) {
  const support = detectGraphicsLocal(typeof document !== 'undefined' ? document.createElement('canvas') : null);
  const useGpu = state.webgl2Available && support.webgl2 && !state.contextLost && state.active;

  useEffect(() => {
    if (!useGpu) return;
    const canvas = document.querySelector('[data-visual-aid="legibility"] canvas');
    if (!canvas) return;
    const lost = () => onContextLost?.();
    const restored = () => onContextRestored?.();
    canvas.addEventListener('webglcontextlost', lost as EventListener);
    canvas.addEventListener('webglcontextrestored', restored as EventListener);
    return () => {
      canvas.removeEventListener('webglcontextlost', lost as EventListener);
      canvas.removeEventListener('webglcontextrestored', restored as EventListener);
    };
  }, [useGpu, onContextLost, onContextRestored]);

  return (
    <div data-visual-aid="legibility" data-instructional="true" style={surfaceStyle}>
      <p>{textEquivalentLocal(state.explanation.title)}</p>
      <p>{state.textAlternative}</p>
      {!useGpu ? (
        <div role="region" aria-label="No-GPU legibility explanation">
          <p>{state.explanation.body}</p>
          <p>
            Distance {state.audienceDistanceM.toFixed(1)} m · Size {state.textSizePt.toFixed(0)} pt · Contrast{' '}
            {state.contrastRatio.toFixed(1)}:1
          </p>
        </div>
      ) : (
        <div style={{ height: 220 }} aria-hidden={state.reducedMotion}>
          <Canvas
            frameloop={state.active ? 'always' : 'never'}
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: 'default' }}
            camera={{ position: [0, 0.4, 4], fov: 42 }}
          >
            <ambientLight intensity={0.65} />
            <directionalLight position={[2, 3, 2]} intensity={0.85} />
            <SlidePlane
              textSizePt={state.textSizePt}
              contrastRatio={state.contrastRatio}
              cameraYaw={state.cameraYaw}
              active={state.active}
              reducedMotion={state.reducedMotion}
            />
          </Canvas>
        </div>
      )}
    </div>
  );
}

export function shouldRenderInstructionalLoop(state: Pick<LegibilityInspectorState, 'active' | 'contextLost'>): boolean {
  return state.active && !state.contextLost;
}
