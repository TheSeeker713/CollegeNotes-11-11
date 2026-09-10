export const SCHEMA_VERSION = 1 as const;

export type ThemeId = 'botanical' | 'brutalist';
export type ModeId = 'light' | 'dark';
export type Appearance = { theme: ThemeId; mode: ModeId };

export const DEFAULT_APPEARANCE: Appearance = { theme: 'botanical', mode: 'light' };

export const THEME_VARIANTS: ReadonlyArray<`${ThemeId}-${ModeId}`> = [
  'botanical-light',
  'botanical-dark',
  'brutalist-light',
  'brutalist-dark'
];

export function parseAppearance(value: unknown): Appearance {
  if (!value || typeof value !== 'object') return { ...DEFAULT_APPEARANCE };
  const record = value as { theme?: unknown; mode?: unknown };
  const theme = record.theme === 'brutalist' ? 'brutalist' : 'botanical';
  const mode = record.mode === 'dark' ? 'dark' : 'light';
  return { theme, mode };
}

export type Health = {
  ok: true;
  service: 'collegenotes-local';
  sqlite: 'ok' | 'unavailable';
  fts5: boolean;
};
