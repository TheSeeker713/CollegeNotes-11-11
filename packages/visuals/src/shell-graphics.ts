import type { Appearance } from '@collegenotes/domain';

export type ShellGraphicsMode = 'webgl' | 'css-2d';

/** Decide whether the atmospheric WebGL shell may run. Interactive UI stays HTML either way. */
export function shellGraphicsMode(input: {
  appearance: Pick<Appearance, 'reduceMotion' | 'reduceTransparency'>;
  webgl2?: boolean;
  preferReducedMotion?: boolean;
}): ShellGraphicsMode {
  if (input.appearance.reduceTransparency || input.appearance.reduceMotion) return 'css-2d';
  if (input.preferReducedMotion) return 'css-2d';
  if (input.webgl2 === true) return 'webgl';
  if (input.webgl2 === false) return 'css-2d';
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      if (!canvas.getContext('webgl2')) return 'css-2d';
    } catch {
      return 'css-2d';
    }
  }
  return 'webgl';
}
