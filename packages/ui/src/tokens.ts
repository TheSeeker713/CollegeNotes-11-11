import { DEFAULT_APPEARANCE, type Appearance, type ThemeId, type ModeId } from '@collegenotes/domain';

export type VariantKey = `${ThemeId}-${ModeId}`;

export type SemanticTokens = {
  canvas: string;
  surface: string;
  notes: string;
  study: string;
  listen: string;
  text: string;
  secondary: string;
  border: string;
  accent: string;
  onAccent: string;
  error: string;
  warning: string;
  titleSurface: string;
  titleText: string;
  focus: string;
  fontUi: string;
  fontReading: string;
  fontHeading: string;
  cardRadiusPx: number;
};

export const VARIANTS: Record<VariantKey, SemanticTokens> = {
  'botanical-light': {
    canvas: '#B5AF9A', surface: '#E8E4D6', notes: '#E6EDD9', study: '#F1E1D3', listen: '#DEEAF0',
    text: '#161E14', secondary: '#3A4234', border: '#596352', accent: '#2A4228', onAccent: '#FFFFFF',
    error: '#A02628', warning: '#704500', titleSurface: '#E6EDD9', titleText: '#161E14', focus: '#2A4228',
    fontUi: 'system-ui, sans-serif', fontReading: 'system-ui, sans-serif', fontHeading: 'Georgia, serif', cardRadiusPx: 28
  },
  'botanical-dark': {
    canvas: '#0A1410', surface: '#14241B', notes: '#24362A', study: '#352A25', listen: '#1E3039',
    text: '#F2F5EE', secondary: '#B7C6B4', border: '#819C89', accent: '#7CBB86', onAccent: '#0C1811',
    error: '#FFB4A6', warning: '#F6D58A', titleSurface: '#24362A', titleText: '#F2F5EE', focus: '#7CBB86',
    fontUi: 'system-ui, sans-serif', fontReading: 'system-ui, sans-serif', fontHeading: 'Georgia, serif', cardRadiusPx: 28
  },
  'brutalist-light': {
    canvas: '#D8D7D1', surface: '#FFFFFF', notes: '#F1F3F7', study: '#E4EBFC', listen: '#E8EBEF',
    text: '#15191C', secondary: '#4A5056', border: '#626971', accent: '#1A1A1A', onAccent: '#FFFFFF',
    error: '#9F2027', warning: '#704300', titleSurface: '#15191C', titleText: '#FFFFFF', focus: '#1A1A1A',
    fontUi: 'system-ui, sans-serif', fontReading: 'system-ui, sans-serif', fontHeading: 'Impact, Haettenschweiler, Arial Narrow, sans-serif', cardRadiusPx: 22
  },
  'brutalist-dark': {
    canvas: '#121212', surface: '#1C1C1E', notes: '#242831', study: '#202C40', listen: '#1C2730',
    text: '#F5F5F5', secondary: '#B0B0B0', border: '#8E9BAC', accent: '#FFFFFF', onAccent: '#111111',
    error: '#FFB4BA', warning: '#F3D29A', titleSurface: '#090B0D', titleText: '#F5F5F5', focus: '#FFFFFF',
    fontUi: 'system-ui, sans-serif', fontReading: 'system-ui, sans-serif', fontHeading: 'Impact, Haettenschweiler, Arial Narrow, sans-serif', cardRadiusPx: 22
  }
};

export function variantKey(appearance: Appearance = DEFAULT_APPEARANCE): VariantKey {
  return `${appearance.theme}-${appearance.mode}`;
}

export function tokensFor(appearance: Appearance = DEFAULT_APPEARANCE): SemanticTokens {
  return VARIANTS[variantKey(appearance)];
}

export const LOCAL_FONTS = ['system-ui', 'sans-serif', 'Georgia', 'serif', 'Impact', 'Haettenschweiler', 'Arial Narrow'] as const;
