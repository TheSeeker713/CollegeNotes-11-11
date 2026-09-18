import type { Appearance } from '@collegenotes/domain';

/** Public shell backdrop textures (WebP under apps/web/public/assets/shell). */
export const SHELL_TEXTURES = {
  'botanical-light': '/assets/shell/botanical-light.webp',
  'botanical-dark': '/assets/shell/botanical-dark.webp',
  'brutalist-light': '/assets/shell/brutalist-light.webp',
  'brutalist-dark': '/assets/shell/brutalist-dark.webp'
} as const;

export type ShellTextureKey = keyof typeof SHELL_TEXTURES;

export function shellTextureKey(appearance: Pick<Appearance, 'theme' | 'mode'>): ShellTextureKey {
  return `${appearance.theme}-${appearance.mode}` as ShellTextureKey;
}

export function shellTextureUrl(appearance: Pick<Appearance, 'theme' | 'mode'>): string {
  return SHELL_TEXTURES[shellTextureKey(appearance)];
}
