export type ThemeId = 'botanical' | 'brutalist';
export type ModeId = 'light' | 'dark';
export type DensityId = 'comfortable' | 'compact';

export type Appearance = {
  theme: ThemeId;
  mode: ModeId;
  density: DensityId;
  reduceMotion: boolean;
  reduceTransparency: boolean;
};

export const DEFAULT_APPEARANCE: Appearance = {
  theme: 'botanical',
  mode: 'light',
  density: 'comfortable',
  reduceMotion: false,
  reduceTransparency: false
};

export const THEME_VARIANTS: ReadonlyArray<`${ThemeId}-${ModeId}`> = [
  'botanical-light',
  'botanical-dark',
  'brutalist-light',
  'brutalist-dark'
];

export function parseAppearance(value: unknown): Appearance {
  if (!value || typeof value !== 'object') return { ...DEFAULT_APPEARANCE };
  const record = value as Record<string, unknown>;
  return {
    theme: record.theme === 'brutalist' ? 'brutalist' : 'botanical',
    mode: record.mode === 'dark' ? 'dark' : 'light',
    density: record.density === 'compact' ? 'compact' : 'comfortable',
    reduceMotion: record.reduceMotion === true,
    reduceTransparency: record.reduceTransparency === true
  };
}
