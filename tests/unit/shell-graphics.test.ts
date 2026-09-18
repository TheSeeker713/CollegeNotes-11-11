import { describe, expect, it } from 'vitest';
import { shellGraphicsMode } from '../../packages/visuals/src/shell-graphics.ts';
import { SHELL_TEXTURES, shellTextureKey, shellTextureUrl } from '../../packages/visuals/src/shell-textures.ts';

const base = { reduceMotion: false, reduceTransparency: false };

describe('shellGraphicsMode', () => {
  it('uses WebGL when accessibility prefs allow it and WebGL2 is present', () => {
    expect(shellGraphicsMode({ appearance: base, webgl2: true, preferReducedMotion: false })).toBe('webgl');
  });

  it('falls back to CSS when reduce-transparency is on', () => {
    expect(shellGraphicsMode({ appearance: { ...base, reduceTransparency: true }, webgl2: true })).toBe('css-2d');
  });

  it('falls back to CSS when reduce-motion is on', () => {
    expect(shellGraphicsMode({ appearance: { ...base, reduceMotion: true }, webgl2: true })).toBe('css-2d');
  });

  it('falls back to CSS when the OS prefers reduced motion', () => {
    expect(shellGraphicsMode({ appearance: base, webgl2: true, preferReducedMotion: true })).toBe('css-2d');
  });

  it('falls back to CSS when WebGL2 is unavailable', () => {
    expect(shellGraphicsMode({ appearance: base, webgl2: false })).toBe('css-2d');
  });
});

describe('shellTextureUrl', () => {
  it('maps each theme/mode pair to a public WebP asset path', () => {
    expect(shellTextureKey({ theme: 'botanical', mode: 'light' })).toBe('botanical-light');
    expect(shellTextureUrl({ theme: 'botanical', mode: 'light' })).toBe('/assets/shell/botanical-light.webp');
    expect(shellTextureUrl({ theme: 'botanical', mode: 'dark' })).toBe('/assets/shell/botanical-dark.webp');
    expect(shellTextureUrl({ theme: 'brutalist', mode: 'light' })).toBe('/assets/shell/brutalist-light.webp');
    expect(shellTextureUrl({ theme: 'brutalist', mode: 'dark' })).toBe('/assets/shell/brutalist-dark.webp');
  });

  it('exposes all four shell texture URLs', () => {
    expect(Object.keys(SHELL_TEXTURES).sort()).toEqual([
      'botanical-dark',
      'botanical-light',
      'brutalist-dark',
      'brutalist-light'
    ]);
  });
});
