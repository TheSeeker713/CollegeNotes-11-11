export type GraphicsSupport = {
  webgl2: boolean;
  fallback: 'text-2d';
};

export function detectGraphics(gl?: { getContext?: (name: string) => unknown } | null): GraphicsSupport {
  const webgl2 = Boolean(gl && typeof gl.getContext === 'function' && gl.getContext('webgl2'));
  return { webgl2, fallback: 'text-2d' };
}

export function textEquivalent(label: string): string {
  return `Text equivalent: ${label}`;
}

export { shellGraphicsMode, type ShellGraphicsMode } from './shell-graphics.js';
export { SHELL_TEXTURES, shellTextureKey, shellTextureUrl, type ShellTextureKey } from './shell-textures.js';
export { sequenceNodeLabels, sequenceEdges, explorationSyncSnapshot } from './aid-models.js';
export { LegibilityAidView, shouldRenderInstructionalLoop } from './LegibilityAid.js';
